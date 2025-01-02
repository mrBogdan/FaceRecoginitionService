import {generatePasswordHash} from '../hash.js';
import {UserAlreadyExistsError, UserNotFoundError} from './user.errors.js';

export class UserService {
    constructor(repository) {
        this.repository = repository;
    }

    async getByEmail(email) {
        return this.repository.getByEmail(email);
    }

    async createUser(candidate) {
        const userInfo = {
            ...candidate,
            password: generatePasswordHash(candidate.password, 'sha256'),
        };
        try {
            return await this.repository.createUser(userInfo);
        } catch (error) {
            if (error.code === '23505') {
                throw new UserAlreadyExistsError(candidate.email);
            }

            throw error;
        }

    }

    async findAndVerifyUser(credentials) {
        const {email, password} = credentials;
        const user = await this.repository.getByEmail(email);

        if (!user) {
            throw new UserNotFoundError(email);
        }

        if (user.password_hash !== generatePasswordHash(password, 'sha256')) {
            throw new UserNotFoundError(email);
        }

        return user;
    }
}

export const createUserService = (repository) => {
    return new UserService(repository);
};
