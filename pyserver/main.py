from fastapi import FastAPI, Request
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

app = FastAPI(title="Async FastAPI Server Example")
templates = Jinja2Templates(directory="templates")

app.mount("/static", StaticFiles(directory="static"), name="static")

class User(BaseModel):
    username: str
    password: str

users = []

@app.get("/health", status_code=200)
def health_check():
    return {"status": "ok"}

@app.get("/login", response_class=HTMLResponse)
async def login(request: Request, name: str = "World"):
    return templates.TemplateResponse("login.html", {"request": request, "name": name})

@app.post("/submit")
async def submit(request: Request):
    request_form = await request.form()
    return f"Submitted! (name={request_form['name']}, email={request_form['email']}, password={request_form['password']})"

@app.get("/users")
async def get_users():
    return users

@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

