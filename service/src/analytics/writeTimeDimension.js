import {AnalyticsTables} from './AnalyticsTables.js';
import {getTime} from '../time.js';
import {generateHash} from '../hash.js';
import {getByHash} from './getByHash.js';

export const writeTimeDimension = async (postgres) => {
    const date = getTime();
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const dayOfWeek = date.getUTCDay();
    const quarter = Math.ceil((month) / 3);
    const hash = generateHash([year, month, dayOfWeek, quarter]);


    const id = await getByHash(postgres, AnalyticsTables.TIME_DIMENSION, hash);
    if (id) {
        return id;
    }

    const query = `INSERT INTO ${AnalyticsTables.TIME_DIMENSION} (date, month, year, quarter, day_of_week, hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
    const result = await postgres.query(query, [date, month, year, quarter, dayOfWeek, hash]);
    return result.rows[0].id;

};
