import {AnalyticsTables} from './AnalyticsTables.js';
import {generateHash} from '../hash.js';
import {getByHash} from './getByHash.js';

export const writeDevicesDimension = async (postgres, {deviceName, deviceType, osName, osVersion}) => {
    const query = `INSERT INTO ${AnalyticsTables.DEVICES_DIMENSION} (device_name, device_type, os_name, os_version, hash)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id`;
    const hashValues = [deviceName, deviceType, osName, osVersion];
    const hash = generateHash(hashValues);

    const id = await getByHash(postgres, AnalyticsTables.DEVICES_DIMENSION, hash);
    if (id) {
        return id;
    }

    const values = [...hashValues, hash];

    const result = await postgres.query(query, values);
    return result.rows[0].id;
}
