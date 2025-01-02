import {afterAll, beforeAll, beforeEach, describe, expect, it} from '@jest/globals';

import {getPostgresContainer} from '../../containers';
import {createDbClient, getConnectionOptions, truncateTable} from '../../dbUtils';
import {createAnalyticsTables} from '../../../sql/init';
import {AnalyticsTables, writeTimeDimension} from '../../../analytics';
import {mockTime} from '../../../time';

describe('#writeTimeDimenstion', () => {
    const date = new Date('2022-02-24T00:00:00.000Z');
    let container;
    let client;

    const _verifyTimeDimension = (result, expected) => {
        expect(new Date(result.date).getTime()).toBe(expected.date.getTime());
        expect(result.month).toBe(expected.month);
        expect(result.year).toBe(expected.year);
        expect(result.quarter).toBe(expected.quarter);
        expect(result.day_of_week).toBe(expected.dayOfWeek);
        expect(typeof result.hash).toBe('string');
    }

    beforeAll(async () => {
        container = await getPostgresContainer().start();
        client = createDbClient(getConnectionOptions(container));

        await client.connect();

        await createAnalyticsTables(client);

        mockTime(date);
    });

    beforeEach(async () => {
        await truncateTable(client, AnalyticsTables.TIME_DIMENSION);
    });

    afterAll(async () => {
        await Promise.all([
            client.end(),
            container.stop()
        ]);
        mockTime();
    });

    it('should write a time dimension', async () => {
        const id = await writeTimeDimension(client);
        expect(id).toBe(1);
    });

    it('should form hash', async () => {
        const id = await writeTimeDimension(client);
        const outcome = await client.query(`SELECT * FROM ${AnalyticsTables.TIME_DIMENSION} WHERE id = $1`, [id]);
        const {hash} = outcome.rows[0];
        expect(hash).toBeDefined();
        expect(typeof hash).toBe('string');
    });

    it('should write a time dimension with correct values', async () => {
        const id = await writeTimeDimension(client);
        const outcome = await client.query(`SELECT * FROM ${AnalyticsTables.TIME_DIMENSION} WHERE id = $1`, [id]);
        const result = outcome.rows[0];
        const expected = {
            date,
            month: 2,
            day: 24,
            year: 2022,
            quarter: Math.ceil(2 / 3),
            dayOfWeek: date.getDay(),
        };
        _verifyTimeDimension(result, expected);
    });

});
