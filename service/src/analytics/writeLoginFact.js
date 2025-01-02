import {AnalyticsTables} from './AnalyticsTables.js';

export const writeLoginFact = async (postgres, {
    userId,
    sessionId,
    locationId,
    deviceId,
    timeId,
    success,
}) => {
    const query = `INSERT INTO ${AnalyticsTables.LOGIN_FACT} (user_id, session_id, location_id, device_id, time_id, successful_login)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id`;
    const values = [userId, sessionId, locationId, deviceId, timeId, success];

    const result = await postgres.query(query, values);
    return result.rows[0].id;
};
