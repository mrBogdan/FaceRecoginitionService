from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx
import asyncio

app = FastAPI(title="Async FastAPI Server Example")

class Item(BaseModel):
    name: str
    price: float

@app.post("/items/")
async def create_item(item: Item):
    return {"message": f"Item '{item.name}' with price {item.price} created."}

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.get("/fetch")
async def fetch_example():
    url = "https://jsonplaceholder.typicode.com/todos/1"
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch data")
        return r.json()

@app.get("/parallel")
async def parallel_tasks():
    async def task(n):
        await asyncio.sleep(n)
        return f"Task {n} done"

    results = await asyncio.gather(task(1), task(2), task(3))
    return {"results": results}
