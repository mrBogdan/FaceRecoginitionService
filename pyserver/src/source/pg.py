import asyncpg
import asyncio

async def main():
    conn = await asyncpg.connect(
        user='admin',
        password='1U8f)-W33T-I',
        database='frodo',
        host='localhost'
    )
    rows = await conn.fetch("SELECT * FROM users")
    for row in rows:
        print(row)
    await conn.close()

asyncio.run(main())
