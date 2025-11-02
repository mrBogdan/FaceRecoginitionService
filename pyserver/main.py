from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
import numpy as np
import cv2

app = FastAPI(title="Async FastAPI Server Example")
templates = Jinja2Templates(directory="templates")

app.mount("/static", StaticFiles(directory="static"), name="static")


users = []

@app.get("/health", status_code=200)
def health_check():
    return {"status": "ok"}

@app.get("/login", response_class=HTMLResponse)
async def login(request: Request, name: str = "World"):
    return templates.TemplateResponse("login.html", {"request": request, "name": name})

@app.post("/login")
async def login(
    image: UploadFile = File(...),
    type: str = Form(...)
):
    if type == "biometric":
        try:
            image_data = await image.read()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read image file: {e}")

        try:
            np_arr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is None:
                raise HTTPException(status_code=400, detail="Could not decode image from file data.")

            print(
                f"Received biometric image. Filename: {image.filename}, Content-Type: {image.content_type}, Shape: {img.shape}, Type: {img.dtype}")

            return JSONResponse(content={"status": "success", "name": "Recognized User (Placeholder)"})

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing image: {e}")

    else:
        return JSONResponse(content={"status": "login", "message": "Unknown login type"})


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
