import {afterAll, beforeAll, beforeEach, describe, expect, it} from '@jest/globals';
import {getPostgresContainer} from '../../containers';
import {createDbClient, getConnectionOptions, truncateTable} from '../../dbUtils';
import {createAnalyticsTables} from '../../../sql/init';
import {mockTime} from '../../../time';
import {AnalyticsTables, writeLocationsDimension} from '../../../analytics';
import {adjustPgTypes} from '../../../adjustPgTypes';

describe('#writeLocationsDimension', () => {
    const date = new Date('2022-02-24T00:00:00.000Z');
    let container;
    let client;

    const location = {
        country: 'USA',
        city: 'New York',
        region: 'NY',
        latitude: 40.7128,
        longitude: -74.0060,
    }

    const _verifyLocationsDimension = (result, expected) => {
        expect(result.country).toBe(expected.country);
        expect(result.city).toBe(expected.city);
        expect(result.region).toBe(expected.region);
        expect(result.latitude).toEqual(expected.latitude);
        expect(result.longitude).toEqual(expected.longitude);
        expect(typeof result.hash).toBe('string');
    }

    beforeAll(async () => {
        adjustPgTypes();
        container = await getPostgresContainer().start();
        client = createDbClient(getConnectionOptions(container));

        await client.connect();

        await createAnalyticsTables(client);

        mockTime(date);
    });

    beforeEach(async () => {
        await truncateTable(client, AnalyticsTables.LOCATIONS_DIMENSION);
    });

    afterAll(async () => {
        await Promise.all([
            client.end(),
            container.stop()
        ]);
        mockTime();
    });

    it('should write a locations dimension', async () => {
        const id = await writeLocationsDimension(client, location);
        const outcome = await client.query(`SELECT * FROM ${AnalyticsTables.LOCATIONS_DIMENSION} WHERE id = $1`, [id]);
        expect(id).toBe(1);
        _verifyLocationsDimension(outcome.rows[0], location);
    });
});
