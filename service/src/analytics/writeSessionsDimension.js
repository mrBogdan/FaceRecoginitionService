import {AnalyticsTables} from './AnalyticsTables.js';

export const writeSessionsDimension = async (postgres, {
    userId, createdAt, expiredAt,
}) => {
    const query = `INSERT INTO ${AnalyticsTables.SESSIONS_DIMENSION} (user_id, created_at, expired_at) VALUES ($1, $2, $3) RETURNING id`;
    const result = await postgres.query(query, [userId, createdAt, expiredAt]);
    return result.rows[0].id;
};
