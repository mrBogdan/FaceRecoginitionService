import {RouteAlreadyExistsError} from './errors.js';
import {HTTP_METHODS} from './constants.js';

const routes = {};

Object.values(HTTP_METHODS).forEach((method) => routes[method] = {});

export const addRoute = (method, path, handler) => {
    if (routes[method][path]) {
        throw new RouteAlreadyExistsError(path);
    }

    routes[method][path] = handler;
};

export const getRoute = (method, path) => {
    return routes[method][path];
};
