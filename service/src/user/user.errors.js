export class UserAlreadyExistsError extends Error {
    constructor(userEmail) {
        super(`User with email ${userEmail} already exists`);
    }
}

export class UserNotFoundError extends Error {
    constructor(userEmail) {
        super(`User with email ${userEmail} not found`);
    }
}
