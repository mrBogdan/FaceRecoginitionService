import jwt from 'jsonwebtoken';

import {TIME_IN_MS} from '../constants.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || TIME_IN_MS.MIN * 15 / TIME_IN_MS.SEC;

const createToken = (userId) => {
    const payload = { userId };
    const options = { expiresIn: JWT_EXPIRATION };

    return jwt.sign(payload, JWT_SECRET, options);
};

export class UserController {
    constructor(userService) {
        this.service = userService;
    }

    async createUser(candidate) {
        return this.service.createUser(candidate);
    }

    async signIn({credentials}) {
        const user = await this.service.findAndVerifyUser(credentials);
        const accessToken = createToken(user.id);

        return {
            accessToken,
            user,
        }
    }
}

export const createUserController = (service) => {
    return new UserController(service);
}
