import os
import numpy as np
import cv2
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from dotenv import load_dotenv
import asyncpg
from deepface import DeepFace
import json
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
import secrets
from datetime import datetime, timedelta
from jose import JWTError, jwt
from enum import Enum

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRole(str, Enum):
    user = "user"
    admin = "admin"

class UpdateRoleRequest(BaseModel):
    role: UserRole

app = FastAPI(title="Async FastAPI Server Example")
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

DB_POOL = None
MODEL_NAME = "ArcFace"
ARCFACE_THRESHOLD = 0.68

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: int | None = None
    role: UserRole | None = None

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def setup_db_connection(conn):
    await conn.set_type_codec(
        'vector',
        encoder=lambda v: str(list(v)),
        decoder=lambda s: np.array(json.loads(s)),
        schema='public'
    )

@app.on_event("startup")
async def startup_handler():
    global DB_POOL
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")
    DB_POOL = await asyncpg.create_pool(dsn=database_url, init=setup_db_connection)
    
    print("Loading face recognition model...")
    DeepFace.build_model(MODEL_NAME)
    print("Model loaded successfully.")

@app.on_event("shutdown")
async def shutdown_db_client():
    if DB_POOL:
        await DB_POOL.close()

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = int(payload.get("sub"))
        role: str = payload.get("role")
        if user_id is None or role is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id, role=UserRole(role))
    except (JWTError, ValueError, TypeError):
        raise credentials_exception
    
    async with DB_POOL.acquire() as connection:
        user = await connection.fetchrow("SELECT id, email, role FROM users WHERE id = $1", token_data.user_id)
        if user is None:
            raise credentials_exception
    return dict(user)

def get_current_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != UserRole.admin:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")
    return current_user

@app.get("/health", status_code=200)
def health_check():
    return {"status": "ok"}

@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.post("/register")
async def register(
    email: str = Form(...),
    password: str = Form(...),
    face_image: UploadFile = File(...)
):
    try:
        image_data = await face_image.read()
        np_arr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Не вдалося обробити зображення.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Помилка читання або обробки зображення: {e}")

    try:
        embedding_obj = DeepFace.represent(img_path=img, model_name=MODEL_NAME, enforce_detection=True)
        embedding = embedding_obj[0]['embedding']
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Не вдалося знайти обличчя на зображенні: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка генерації векторного представлення обличчя: {e}")

    password_hash = get_password_hash(password)

    async with DB_POOL.acquire() as connection:
        existing_user_by_email = await connection.fetchrow("SELECT email FROM users WHERE email = $1", email)
        if existing_user_by_email:
            raise HTTPException(status_code=409, detail="Користувач з такою електронною поштою вже існує.")
        
        closest_match = await connection.fetchrow("SELECT face_embedding <=> $1 AS distance FROM users ORDER BY distance LIMIT 1;", embedding)
        if closest_match and closest_match['distance'] <= ARCFACE_THRESHOLD:
            raise HTTPException(status_code=409, detail="Користувач з таким обличчям вже існує.")

        user_count = await connection.fetchval("SELECT COUNT(*) FROM users")
        role = UserRole.admin if user_count == 0 else UserRole.user
        
        await connection.execute(
            "INSERT INTO users (email, password_hash, face_embedding, role) VALUES ($1, $2, $3, $4)",
            email,
            password_hash,
            embedding,
            role
        )

    return JSONResponse(content={"status": "success", "message": f"Користувач {email} успішно зареєстрований з роллю {role}."}, status_code=201)

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/token", response_model=Token)
async def login_for_access_token(
    type: str = Form(...),
    email: str = Form(None),
    password: str = Form(None),
    image: UploadFile = File(None)
):
    user = None
    if type == "biometric":
        if not image:
            raise HTTPException(status_code=400, detail="Для біометричного входу потрібне зображення.")
        try:
            image_data = await image.read()
            np_arr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if img is None:
                raise HTTPException(status_code=400, detail="Не вдалося обробити зображення з файлу.")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Не вдалося прочитати файл зображення: {e}")

        try:
            embedding_obj = DeepFace.represent(img_path=img, model_name=MODEL_NAME, enforce_detection=True)
            login_embedding = embedding_obj[0]['embedding']
        except ValueError:
            raise HTTPException(status_code=400, detail="Не вдалося знайти обличчя на зображенні для входу.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Помилка обробки зображення: {e}")

        async with DB_POOL.acquire() as connection:
            query = "SELECT id, email, role, face_embedding <=> $1 AS distance FROM users ORDER BY distance LIMIT 1;"
            closest_match = await connection.fetchrow(query, login_embedding)

            if closest_match and closest_match['distance'] <= ARCFACE_THRESHOLD:
                user = closest_match

    elif type == "password":
        if not email or not password:
            raise HTTPException(status_code=400, detail="Для входу за паролем потрібні email та пароль.")
        
        async with DB_POOL.acquire() as connection:
            db_user = await connection.fetchrow("SELECT id, email, role, password_hash FROM users WHERE email = $1", email)
            if db_user and verify_password(password, db_user['password_hash']):
                user = db_user

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неправильний email, пароль або обличчя.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user['id']), "role": user['role']}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/cabinet", response_class=HTMLResponse)
async def cabinet(request: Request):
    return templates.TemplateResponse("cabinet.html", {"request": request})

@app.get("/users/me", response_model=dict)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.post("/delete_account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    user_id_to_delete = current_user['id']
    async with DB_POOL.acquire() as connection:
        result = await connection.execute("DELETE FROM users WHERE id = $1", user_id_to_delete)
        if result == "DELETE 1":
            return JSONResponse(content={"status": "success", "message": "Акаунт успішно видалено."})
        else:
            raise HTTPException(status_code=404, detail="Користувача не знайдено.")

@app.get("/users", response_model=list[dict])
async def get_users(current_user: dict = Depends(get_current_admin_user)):
    async with DB_POOL.acquire() as connection:
        rows = await connection.fetch("SELECT id, email, role FROM users")
        return [{"id": row['id'], "email": row['email'], "role": row['role']} for row in rows]

@app.put("/users/{user_id}/role", status_code=200)
async def update_user_role(user_id: int, data: UpdateRoleRequest, current_admin: dict = Depends(get_current_admin_user)):
    if user_id == current_admin['id']:
        raise HTTPException(status_code=400, detail="Адміністратор не може змінити власну роль.")
    
    async with DB_POOL.acquire() as connection:
        result = await connection.execute("UPDATE users SET role = $1 WHERE id = $2", data.role, user_id)
        if result == "UPDATE 1":
            return {"status": "success", "message": f"Роль користувача оновлено на {data.role}."}
        else:
            raise HTTPException(status_code=404, detail="Користувача не знайдено.")

@app.delete("/users/{user_id}", status_code=200)
async def delete_user_by_id(user_id: int, current_admin: dict = Depends(get_current_admin_user)):
    if user_id == current_admin['id']:
        raise HTTPException(status_code=400, detail="Адміністратор не може видалити самого себе.")
        
    async with DB_POOL.acquire() as connection:
        result = await connection.execute("DELETE FROM users WHERE id = $1", user_id)
        if result == "DELETE 1":
            return {"status": "success", "message": "Користувача успішно видалено."}
        else:
            raise HTTPException(status_code=404, detail="Користувача не знайдено.")

@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
