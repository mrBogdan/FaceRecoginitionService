import {writeTimeDimension} from './writeTimeDimension.js';
import {writeLocationsDimension} from './writeLocationsDimension.js';
import {writeDevicesDimension} from './writeDevicesDimension.js';
import {writeSessionsDimension} from './writeSessionsDimension.js';
import {writeLoginFact} from './writeLoginFact.js';

export const sendLoginEvent = async (source, {userId, location, device, session, success}) => {
    const [
        timeId,
        locationId,
        deviceId,
        sessionId,
    ] = await Promise.all([
        writeTimeDimension(source),
        writeLocationsDimension(source, location),
        writeDevicesDimension(source, device),
        writeSessionsDimension(source, session),
    ]);

    return writeLoginFact(source, {
        userId,
        sessionId,
        locationId,
        deviceId,
        timeId,
        success,
    });
};
