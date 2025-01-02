import {afterAll, beforeAll, beforeEach, describe, expect, it} from '@jest/globals';

import {getPostgresContainer} from '../../containers';
import {createDbClient, getConnectionOptions, truncateTable} from '../../dbUtils';
import {createAnalyticsTables} from '../../../sql/init';
import {mockTime} from '../../../time';
import {AnalyticsTables, writeSessionsDimension} from '../../../analytics';
import {TIME_IN_MS} from '../../../constants';

describe('#writeSessionsDimension', () => {
    const date = new Date('2022-02-24T00:00:00.000Z');
    let container;
    let client;

    const _verifySessionsDimension = (result, expected) => {
        expect(result.user_id).toBe(expected.userId);
        expect(new Date(result.created_at).getTime()).toBe(expected.createdAt.getTime());
        expect(new Date(result.expired_at).getTime()).toBe(expected.expiredAt.getTime());
    }

    const session = {
        userId: 1,
        createdAt: date,
        expiredAt: new Date(date.getTime() + TIME_IN_MS.MIN * 15),
    };

    beforeAll(async () => {
        container = await getPostgresContainer().start();
        client = createDbClient(getConnectionOptions(container));

        await client.connect();

        await createAnalyticsTables(client);

        mockTime(date);
    });

    beforeEach(async () => {
        await truncateTable(client, AnalyticsTables.SESSIONS_DIMENSION);
    });

    afterAll(async () => {
        await Promise.all([
            client.end(),
            container.stop()
        ]);
        mockTime();
    });

    it('should write a sessions dimension', async () => {
        const id = await writeSessionsDimension(client, session);
        const outcome = await client.query(`SELECT * FROM ${AnalyticsTables.SESSIONS_DIMENSION} WHERE id = $1`, [id]);
        expect(id).toBe(1);
        _verifySessionsDimension(outcome.rows[0], session);
    });

    it('should autogenerate id', async () => {
        const id1 = await writeSessionsDimension(client, session);
        const outcome = await client.query(`SELECT * FROM ${AnalyticsTables.SESSIONS_DIMENSION} WHERE id = $1`, [id1]);
        expect(id1).toBe(1);
        _verifySessionsDimension(outcome.rows[0], session);

        const id2 = await writeSessionsDimension(client, session);
        const outcome2 = await client.query(`SELECT * FROM ${AnalyticsTables.SESSIONS_DIMENSION} WHERE id = $1`, [id2]);
        expect(id2).toBe(2);
        _verifySessionsDimension(outcome2.rows[0], session);
    });
});
