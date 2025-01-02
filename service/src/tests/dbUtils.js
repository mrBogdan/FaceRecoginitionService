import pkg from 'pg';

const { Client } = pkg;

export const connectionOptionsToEnv = (connectionOptions) => ({
    POSTGRES_DB: connectionOptions.database,
    POSTGRES_USER: connectionOptions.user,
    POSTGRES_HOST: connectionOptions.host,
    POSTGRES_PASSWORD: connectionOptions.password,
    POSTGRES_PORT: connectionOptions.port,
});

export const truncateTable = (client, tableName) => client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY`);

export const env = {
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: 'postgres',
    POSTGRES_DB: 'postgres',
    POSTGRES_PORT: 5432,
    POSTGRES_HOST: 'postgres'
};

export const createDbClient = (connectionOptions) => {
    return new Client(connectionOptions);
};

export const getConnectionOptions = (container) => ({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
});
