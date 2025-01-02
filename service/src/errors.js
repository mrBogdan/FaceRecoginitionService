export class RouteAlreadyExistsError extends Error {
    constructor(path) {
        super(`Route ${path} already exists`);
    }
}
