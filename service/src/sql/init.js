import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const POSTGRES_HOST = process.env.POSTGRES_HOST || 'postgres';
const POSTGRES_PORT = process.env.POSTGRES_PORT || 5432;
const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'password';
const POSTGRES_DB = process.env.POSTGRES_DB;

const FRODO_DB = 'frodo';
const ANALYTICS_DB = 'analytics';

export const createDbClient = (connectionOptions) => {
    return new Client(connectionOptions);
}

const ifDatabaseExists = async (client, database) => {
    const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${database}'`);
    return result.rows.length > 0;
}

export const createAnalyticsDatabase = async (connectedClient) => {
    if (await ifDatabaseExists(connectedClient, ANALYTICS_DB)) {
        return;
    }

    const sqlFilePath = path.join(__dirname, `${ANALYTICS_DB}.sql`);
    const sqlQueries = fs.readFileSync(sqlFilePath, 'utf8');

    await connectedClient.query(sqlQueries);
};

export const createAnalyticsTables = async (connectedClient) => {
    const sqlFilePath = path.join(__dirname, 'olap.sql');
    const sqlQueries = fs.readFileSync(sqlFilePath, 'utf8');

    await connectedClient.query(sqlQueries);
}

export const createMainDatabase = async (connectedClient) => {
    if (await ifDatabaseExists(connectedClient, FRODO_DB)) {
        return;
    }

    const sqlFilePath = path.join(__dirname, `${FRODO_DB}.sql`);
    const sqlQueries = fs.readFileSync(sqlFilePath, 'utf8');

    await connectedClient.query(sqlQueries);
}

export const createMainTables = async (connectedClient) => {
    const sqlFilePath = path.join(__dirname, 'oltp.sql');
    const sqlQueries = fs.readFileSync(sqlFilePath, 'utf8');

    await connectedClient.query(sqlQueries);
};

export async function initDatabase() {
    try {
        let client = createDbClient({
            database: POSTGRES_DB,
            user: POSTGRES_USER,
            host: POSTGRES_HOST,
            password: POSTGRES_PASSWORD,
            port: POSTGRES_PORT,
        });
        await client.connect();
        await createAnalyticsDatabase(client);
        await createMainDatabase(client);
        client.end();

        client = createDbClient({
            database: ANALYTICS_DB,
            user: POSTGRES_USER,
            host: POSTGRES_HOST,
            password: POSTGRES_PASSWORD,
            port: POSTGRES_PORT,
        });
        await client.connect();
        await createAnalyticsTables(client);
        client.end();

        client = createDbClient({
            database: FRODO_DB,
            user: POSTGRES_USER,
            host: POSTGRES_HOST,
            password: POSTGRES_PASSWORD,
            port: POSTGRES_PORT,
        });
        await client.connect();
        await createMainTables(client);
        client.end();
        console.log('Migration completed successfully.');

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
