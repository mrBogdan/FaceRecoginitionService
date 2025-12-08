import os
import numpy as np
import cv2
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from dotenv import load_dotenv
import asyncpg
from deepface import DeepFace
import json
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Async FastAPI Server Example")
templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

DB_POOL = None
MODEL_NAME = "ArcFace"
ARCFACE_THRESHOLD = 0.68

class DeleteAccountRequest(BaseModel):
    email: str

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
            raise HTTPException(status_code=400, detail="Could not decode image.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading or processing image: {e}")

    try:
        embedding_obj = DeepFace.represent(img_path=img, model_name=MODEL_NAME, enforce_detection=True)
        embedding = embedding_obj[0]['embedding']
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Could not find a face in the image: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating face embedding: {e}")

    async with DB_POOL.acquire() as connection:
        existing_user = await connection.fetchrow("SELECT email FROM users WHERE email = $1", email)
        if existing_user:
            raise HTTPException(status_code=409, detail="User with this email already exists.")
        
        await connection.execute(
            "INSERT INTO users (email, password_hash, face_embedding) VALUES ($1, $2, $3)",
            email,
            password,
            embedding
        )

    return JSONResponse(content={"status": "success", "message": f"User {email} registered successfully."}, status_code=201)

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
async def login(
    image: UploadFile = File(...),
    type: str = Form(...)
):
    if type != "biometric":
        return JSONResponse(content={"status": "login", "message": "Unknown login type"})

    try:
        image_data = await image.read()
        np_arr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image from file data.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read image file: {e}")

    try:
        embedding_obj = DeepFace.represent(img_path=img, model_name=MODEL_NAME, enforce_detection=True)
        login_embedding = embedding_obj[0]['embedding']
    except ValueError:
        raise HTTPException(status_code=400, detail="Could not find a face in the login image.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {e}")

    async with DB_POOL.acquire() as connection:
        query = """
            SELECT email, face_embedding <=> $1 AS distance
            FROM users
            ORDER BY distance
            LIMIT 1;
        """
        closest_match = await connection.fetchrow(query, login_embedding)

        if closest_match:
            best_match_email = closest_match['email']
            min_distance = closest_match['distance']

            if min_distance <= ARCFACE_THRESHOLD:
                return JSONResponse(content={"status": "success", "redirect_url": f"/cabinet?email={best_match_email}"})

    return JSONResponse(content={"status": "failure", "message": "User not recognized."}, status_code=401)

@app.get("/cabinet", response_class=HTMLResponse)
async def cabinet(request: Request, email: str):
    return templates.TemplateResponse("cabinet.html", {"request": request, "email": email})

@app.post("/delete_account")
async def delete_account(data: DeleteAccountRequest):
    email = data.email
    async with DB_POOL.acquire() as connection:
        result = await connection.execute("DELETE FROM users WHERE email = $1", email)
        if result == "DELETE 1":
            return JSONResponse(content={"status": "success", "message": "Акаунт успішно видалено."})
        else:
            raise HTTPException(status_code=404, detail="Користувача не знайдено.")

@app.get("/users")
async def get_users():
    async with DB_POOL.acquire() as connection:
        rows = await connection.fetch("SELECT id, email FROM users")
        return [{"id": row['id'], "email": row['email']} for row in rows]

@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
