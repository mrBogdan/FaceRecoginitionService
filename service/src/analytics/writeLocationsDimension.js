import {AnalyticsTables} from './AnalyticsTables.js';
import {generateHash} from '../hash.js';
import {getByHash} from './getByHash.js';

export const writeLocationsDimension = async (postgres, {
    latitude,
    longitude,
    city,
    country,
    region,
}) => {
    const hash = generateHash([latitude, longitude, city, country, region]);

    const id = await getByHash(postgres, AnalyticsTables.LOCATIONS_DIMENSION, hash);
    if (id) {
        return id;
    }

    const query = `INSERT INTO ${AnalyticsTables.LOCATIONS_DIMENSION} (
                    country,
                    region,
                    city,
                    latitude,
                    longitude,
                    hash
                    ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
    const result = await postgres.query(query, [country, region, city, latitude, longitude, hash]);
    return result.rows[0].id;
}
