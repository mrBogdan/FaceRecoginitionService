import http from 'node:http';
import pg from 'pg';
import assert from 'node:assert';

import {getRoute} from './router.js';
import {TIME_IN_MS} from './constants.js';
import {routes} from './routes.js';
import {sleep} from './sleep.js';
import {HEADERS} from './headers.js';

const HTTP_PORT = process.env.PORT || 8080;
const HTTP_HOST = process.env.HOST || '127.0.0.1';
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'postgres';
const POSTGRES_PORT = process.env.POSTGRES_PORT || 5432;
const POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'password';
const PRESTO_HOST = process.env.PRESTO_HOST || 'presto';
const PRESTO_PORT = process.env.PRESTO_PORT || 8080;
const PRESTO_USER = process.env.PRESTO_USER || 'user';

const FRODO_DB = 'frodo';
const ANALYTICS_DB = 'analytics';

const logRequest = (req) => {
  console.log(`[INCOME-REQUEST][HTTP][${req.method}] ${req.url}`);
};

const infoLogger = (message) => console.log(`[INFO] ${message}`);

const getHttpServer = (host, port) => {
  const requestHandler = async (req, res) => {
      const handler = getRoute(req.method.toUpperCase(), req.url);
      logRequest(req);

      if (!handler) {
          res.writeHead(404, HEADERS.ContentType);
          res.end(JSON.stringify({ message: 'Not found' }));
          return;
      }

      try {
         await handler(req, res);
      } catch (error) {
        console.error(error);
        res.writeHead(500, HEADERS.ContentType);
        res.end(JSON.stringify({ message: 'Internal server error' }));
      }
  };

  const server = http.createServer(requestHandler);

  server.listen(port, () => infoLogger(`Server running at http://${host}:${port}/`));
  return server;
};

const getPostgresClient = async (connectionParams) => {
    const client = new pg.Client(connectionParams);
    await client.connect();
    infoLogger('Connected to Postgres');
    return client;
};

async function queryPresto(host, port, query) {
    const url = `http://${host}:${port}/v1/statement`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...HEADERS.ContentType,
                'X-Trino-User': PRESTO_USER,
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            console.error(`[Presto][ERROR] ${response.statusText} - ${await response.text()}`);
            return;
        }

        return response.json();
    } catch (error) {
        console.error(`[Presto][ERROR]`);
        console.error(error);
    }
}

const testPostgres = async (postgresClient) => {
    await sleep(TIME_IN_MS.SEC * 5);
    const {rows} = await postgresClient.query('SELECT NOW()');
    assert.notEqual(rows, null);
    assert.notEqual(rows, undefined);

    infoLogger('Postgres tests passed!');
};

const testHttp = async () => {
  const response = await fetch(`http://${HTTP_HOST}:${HTTP_PORT}/health`);
  const result = await response.json();
  assert.equal(result.message, 'Healthy');

    infoLogger('HTTP tests passed!');
};

const testPresto = async () => {
    await sleep(TIME_IN_MS.SEC * 5);
    const result = await queryPresto(PRESTO_HOST, PRESTO_PORT, 'SELECT * FROM system.runtime.nodes');

    assert.notEqual(result, null);
    assert.notEqual(result, undefined);

    infoLogger('Presto tests passed!');
}

const run = async () => {
    try {
        const server = getHttpServer(HTTP_HOST, HTTP_PORT);
        const postgresClient = await getPostgresClient({
            host: POSTGRES_HOST,
            port: POSTGRES_PORT,
            user: POSTGRES_USER,
            password: POSTGRES_PASSWORD,
            database: FRODO_DB
        });
        const analyticsClient = await getPostgresClient({
            host: POSTGRES_HOST,
            port: POSTGRES_PORT,
            user: POSTGRES_USER,
            password: POSTGRES_PASSWORD,
            database: ANALYTICS_DB
        });
        routes({postgres: postgresClient, analytics: analyticsClient});

        await Promise.all([
            testPostgres(postgresClient),
            testPostgres(analyticsClient),
            testHttp(),
            testPresto(),
        ]);

        return async () => {
                await postgresClient.end();
                server.close(() => {
                    infoLogger('Server closed');
                    process.exit(0);
                });
        };
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

const gracefulShutdownPromise = run();

const gracefulShutdown = async () => {
  const shutdown = await gracefulShutdownPromise;
  await shutdown();
};

process.on('uncaughtException', async (error, origin) => {
  console.error(error);
  console.error(origin);

  await gracefulShutdown();
});

process.on('unhandledRejection', async (error, promise) => {
  console.error(error);
  console.error(promise);
  await gracefulShutdown();
});

process.on('SIGTERM', async () => {
    await gracefulShutdown();
});

process.on('SIGINT', async () => {
    await gracefulShutdown();
});
