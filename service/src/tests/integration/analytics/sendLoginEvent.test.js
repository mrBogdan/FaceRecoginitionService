import {afterAll, beforeAll, describe, expect, it} from '@jest/globals';
import {getPostgresContainer} from '../../containers';
import {createDbClient, getConnectionOptions} from '../../dbUtils';
import {createAnalyticsTables} from '../../../sql/init';
import {AnalyticsTables, sendLoginEvent} from '../../../analytics';
import {successfulLoginEvent} from './data';

describe('#sendLoginEvent', () => {
    let container;
    let client;

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

    afterAll(async () => {
        await Promise.all([
            client.end(),
            container.stop()
        ]);
    });

    it('should send a login event', async () => {
        const factId = await sendLoginEvent(client, successfulLoginEvent());
        expect(factId).toBe(1);

        const outcome = await client.query(`SELECT * FROM ${AnalyticsTables.LOGIN_FACT} WHERE id = $1`, [factId]);
        _verifyLoginFact(outcome.rows[0], {
            userId: 1,
            deviceId: 1,
            locationId: 1,
            sessionId: 1,
            timeId: 1,
            success: true,
        });
    });
});
