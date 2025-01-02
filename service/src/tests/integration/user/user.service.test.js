import {afterAll, beforeAll, beforeEach, describe, expect, it, jest} from '@jest/globals';

import {
    createMainTables,
} from '../../../sql/init.js';
import {createDbClient, getConnectionOptions, truncateTable} from '../../dbUtils.js';
import {getPostgresContainer} from '../../containers';
import {generatePasswordHash} from '../../../hash.js';
import {createUserRepository, createUserService, UserRepository} from '../../../user';

jest.setTimeout(30000);

describe('SignUpService', () => {
    const user1 = {
        email: 'test1@example.com',
        password: 'test',
        firstName: 'Sergey',
        lastName: 'Grygorovich',
    };
    const user2 = {
        email: 'test2@example.com',
        password: 'test',
        firstName: 'Sava',
        lastName: 'Grygorovich',
    };

    let container;
    let repository;
    let service;
    let client;

    const _verifyUser = (result, expected) => {
        expect(result.email).toEqual(expected.email);
        expect(result.first_name).toEqual(expected.firstName);
        expect(result.last_name).toEqual(expected.lastName);
        expect(result.password_hash).toEqual(generatePasswordHash(expected.password, 'sha256'));
    };

    beforeAll(async () => {
        container = await getPostgresContainer().start();
        client = createDbClient(getConnectionOptions(container));

        await client.connect();

        await createMainTables(client);
        repository = createUserRepository(client);
        service = createUserService(repository);
    });

    beforeEach(async () => {
        await truncateTable(client, UserRepository.TABLE_NAME);
    })

    afterAll(async () => {
        await Promise.all([
            client.end(),
            container.stop()
        ]);
    });

    it('should sign up a user', async () => {
        const result = await service.createUser(user1);
        const insertedUser = await repository.getUser(1);
        _verifyUser(result, user1);
        expect(result).toEqual(insertedUser);
    });
});
