import {afterAll, beforeAll, beforeEach, describe, expect, it} from '@jest/globals';

import {getPostgresContainer} from '../../containers';
import {createDbClient, getConnectionOptions, truncateTable} from '../../dbUtils';
import {createAnalyticsTables} from '../../../sql/init';
import {AnalyticsTables, writeDevicesDimension} from '../../../analytics';

describe('#writeDevicesDimension', () => {
    let container;
    let client;

    const device = {
        deviceName: 'iPhone',
        deviceType: 'mobile',
        osName: 'iOS',
        osVersion: '15.0.2',
    };

    const _verifyDevicesDimension = (result, expected) => {
        expect(result.device_name).toBe(expected.deviceName);
        expect(result.device_type).toBe(expected.deviceType);
        expect(result.os_name).toBe(expected.osName);
        expect(result.os_version).toBe(expected.osVersion);
        expect(typeof result.hash).toBe('string');
    }

    beforeAll(async () => {
        container = await getPostgresContainer().start();
        client = createDbClient(getConnectionOptions(container));

        await client.connect();

        await createAnalyticsTables(client);
    });

    beforeEach(async () => {
        await truncateTable(client, AnalyticsTables.DEVICES_DIMENSION);
    });

    afterAll(async () => {
        await Promise.all([
            client.end(),
            container.stop()
        ]);
    });

    it('should write a devices dimension', async () => {
        const id = await writeDevicesDimension(client, device);
        const outcome = await client.query(`SELECT * FROM ${AnalyticsTables.DEVICES_DIMENSION} WHERE id = $1`, [id]);
        expect(id).toBe(1);
        _verifyDevicesDimension(outcome.rows[0], device);
    });

    it('should not allow to insert two the same devices', async () => {
        await writeDevicesDimension(client, device);
        await expect(writeDevicesDimension(client, device)).rejects.toThrow();

        const outcome = await client.query(`SELECT * FROM ${AnalyticsTables.DEVICES_DIMENSION}`);
        expect(outcome.rowCount).toBe(1);
    });
});
