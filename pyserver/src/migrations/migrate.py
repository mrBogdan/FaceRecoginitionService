import asyncpg
import asyncio

async def create_migrations_table(conn):
    migrations_table = """
    CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );"""

    return await conn.execute(migrations_table)

async def check_if_table_exists(conn, table_name):
    return await conn.fetchval(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
        table_name
    )

async def main():
    conn = await asyncpg.connect(
        user='admin',
        password='1U8f)-W33T-I',
        database='frodo',
        host='localhost'
    )

    try:
        is_migration_inited = await check_if_table_exists(conn, 'migrations')

        if not is_migration_inited:
            await create_migrations_table(conn)
            print('Migrations table created')
        else:
            print('Migrations table already exists')

    finally:
        await conn.close()


asyncio.run(main())
