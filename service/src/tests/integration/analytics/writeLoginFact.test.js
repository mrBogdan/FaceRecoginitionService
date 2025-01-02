import {afterAll, beforeAll, beforeEach, describe, expect, it} from '@jest/globals';

import {getPostgresContainer} from '../../containers';
import {createDbClient, getConnectionOptions, truncateTable} from '../../dbUtils';
import {createAnalyticsTables} from '../../../sql/init';
import {AnalyticsTables, writeLoginFact} from '../../../analytics';

describe('#writeLoginFact', () => {
    let container;
    let client;

    const loginFact = {
        userId: 1,
        deviceId: 1,
        locationId: 1,
        sessionId: 1,
        timeId: 1,
        success: true,
    };

    const _verifyLoginFact = (result, expected) => {
        expect(result.user_id).toBe(expected.userId);
        expect(result.device_id).toBe(expected.deviceId);
        expect(result.location_id).toBe(expected.locationId);
        expect(result.session_id).toBe(expected.sessionId);
        expect(result.time_id).toBe(expected.timeId);
        expect(result.successful_login).toBe(expected.success);
    };

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

    it('should write a login fact', async () => {
        const id = await writeLoginFact(client, loginFact);
        const outcome = await client.query(`SELECT * FROM ${AnalyticsTables.LOGIN_FACT} WHERE id = $1`, [id]);
        expect(id).toBe(1);
        _verifyLoginFact(outcome.rows[0], loginFact);
    });

    it
});
