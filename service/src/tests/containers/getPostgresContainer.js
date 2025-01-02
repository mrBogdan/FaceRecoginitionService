import {GenericContainer} from 'testcontainers';
import {env} from '../dbUtils.js';

export const getPostgresContainer = () => {
    return new GenericContainer('postgres')
        .withEnvironment({POSTGRES_USER: env.POSTGRES_USER})
        .withEnvironment({POSTGRES_PASSWORD: env.POSTGRES_PASSWORD})
        .withEnvironment({POSTGRES_DB: env.POSTGRES_DB})
        .withEnvironment({POSTGRES_PORT: env.POSTGRES_PORT.toString()})
        .withEnvironment({POSTGRES_HOST: env.POSTGRES_HOST})
        .withEnvironment({TZ: 'UTC'})
        .withExposedPorts(...[env.POSTGRES_PORT]);
}
