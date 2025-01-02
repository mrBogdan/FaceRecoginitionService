import {afterAll, beforeAll, beforeEach, describe, expect, it, jest} from '@jest/globals';

import {
    createMainTables,
} from '../../../sql/init.js';
import {createDbClient, getConnectionOptions, truncateTable} from '../../dbUtils.js';
import {getPostgresContainer} from '../../containers';
import {createUserRepository, UserRepository} from '../../../user';

jest.setTimeout(30000);

describe('UserRepository', () => {
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
    let client;

    const _verifyUser = (expected, result) => {
        expect(result.email).toEqual(expected.email);
        expect(result.first_name).toEqual(expected.firstName);
        expect(result.last_name).toEqual(expected.lastName);
        expect(result.password_hash).toEqual(expected.password);
    };

    beforeAll(async () => {
        container = await getPostgresContainer().start();
        client = createDbClient(getConnectionOptions(container));

        await client.connect();

        await createMainTables(client);
        repository = createUserRepository(client);
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

    it('should create a user', async () => {
        const result = await repository.createUser(user1);
        const insertedUser = await repository.getUser(1);
        _verifyUser(user1, result);
        expect(result).toEqual(insertedUser);
    });

    it('should return user', async () => {
        const outcome = await Promise.all([
            repository.createUser(user1),
            repository.createUser(user2),
        ]);
        const userList = await repository.getUserList(10);

        expect(userList).toHaveLength(2);

        const insertedUser1 = outcome.find(({email}) => user1.email === email);
        const insertedUser2 = outcome.find(({email}) => user2.email === email);

        _verifyUser(user1, insertedUser1);
        _verifyUser(user2, insertedUser2);

        const listedUser1 = userList.find(({email}) => user1.email === email);
        const listedUser2 = userList.find(({email}) => user2.email === email);

        _verifyUser(user1, listedUser1);
        _verifyUser(user2, listedUser2);
    });

    it('should return user by id', async () => {
        const user = await repository.createUser(user1);
        const outcome = await repository.getUser(user.id);

        expect(outcome).toEqual(user);
        _verifyUser(user1, user);
        _verifyUser(user1, outcome);
    });
});
