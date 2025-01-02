import {TIME_IN_MS} from '../../../constants';

const date = new Date('1991-08-24T00:00:00.000Z');
const userId = 1;

export const successfulLoginEvent = () => ({
    device: {
        deviceName: 'iPhone',
        deviceType: 'mobile',
        osName: 'iOS',
        osVersion: '15.0.2',
    },
    location: {
        country: 'USA',
        city: 'New York',
        region: 'NY',
        latitude: 40.7128,
        longitude: -74.0060,
    },
    session: {
        userId,
        createdAt: date,
        expiredAt: new Date(date.getTime() + TIME_IN_MS.MIN * 15),
    },
    userInfo: {
        id: userId,
        name: 'John Doe',
        email: 'john.doe@test.com',
        created_at: new Date(),
    },
    success: true,
})
