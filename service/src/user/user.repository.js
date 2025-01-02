const TABLE = 'users';

export class UserRepository {
    static TABLE_NAME = TABLE;

    constructor(source) {
        this.source = source;
    }

    async getByEmail(email) {
        const response = await this.source.query(
            `SELECT * FROM ${TABLE} WHERE email = $1`,
            [email]
        );
        return response.rows.pop();
    }

    async createUser({
         email,
         password,
         firstName,
         lastName,
    }) {
        const query = `INSERT INTO ${TABLE} (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING *`;
        const values = [email, password, firstName, lastName];
        const response = await this.source.query(query, values);
        return response.rows.pop();
    }

    async getUserList(limit = 10) {
        const response = await this.source.query(
            `SELECT * FROM ${TABLE} LIMIT ${limit}`
        );
        return response.rows;
    }

    async getUser(id) {
        const response = await this.source.query(
            `SELECT * FROM ${TABLE} WHERE id = $1`,
            [id]
        );
        return response.rows.pop();
    }
}

export const createUserRepository = (postgres) => {
    return new UserRepository(postgres);
}
