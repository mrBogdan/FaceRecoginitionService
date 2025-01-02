import pg from 'pg';
import {faker} from '@faker-js/faker';

const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = process.env.POSTGRES_PORT || 5432;
const POSTGRES_USER = process.env.POSTGRES_USER || 'admin';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || '1U8f)-W33T-I';
const ANALYTICS_DB = process.env.ANALYTICS_DB || 'analytics';

const client = new pg.Client({
    host: POSTGRES_HOST,
    port: POSTGRES_PORT,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: ANALYTICS_DB
});

async function generateTimeDim(numRecords) {
    let values = '';
    for (let i = 0; i < numRecords; i++) {
        const date = faker.date.recent();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const quarter = Math.floor((month - 1) / 3) + 1;
        const dayOfWeek = date.getDay();
        const hash = faker.string.alphanumeric(50);

        values += `('${date.toISOString()}', ${month}, ${year}, ${quarter}, ${dayOfWeek}, '${hash}')`;

        if (i < numRecords - 1) {
            values += ', ';
        }
    }

    const query = `INSERT INTO time_dim (date, month, year, quarter, day_of_week, hash) VALUES ${values};`;
    return query;
}


async function generateLocationsDim(numRecords) {
    let values = '';
    for (let i = 0; i < numRecords; i++) {
        const country = faker.location.country();
        const region = faker.location.state();
        const city = faker.location.city();
        const latitude = faker.location.latitude();
        const longitude = faker.location.longitude();
        const hash = faker.string.alphanumeric(50);;

        values += `('${country}', '${region}', '${city}', ${latitude}, ${longitude}, '${hash}')`;

        if (i < numRecords - 1) {
            values += ', ';
        }
    }

    const query = `INSERT INTO locations_dim (country, region, city, latitude, longitude, hash) VALUES ${values};`;
    return query;
}


async function generateDevicesDim(numRecords) {
    console.log({faker})
    let values = '';
    for (let i = 0; i < numRecords; i++) {
        const deviceName = faker.commerce.productName();
        const deviceType = faker.helpers.arrayElement(['Phone', 'Tablet', 'Laptop']);
        const osName = faker.helpers.arrayElement(['Windows', 'macOS', 'Linux', 'Android', 'iOS']);
        const osVersion = faker.system.semver();
        const hash = faker.string.alphanumeric(50);;

        values += `('${deviceName}', '${deviceType}', '${osName}', '${osVersion}', '${hash}')`;

        if (i < numRecords - 1) {
            values += ', ';
        }
    }

    const query = `INSERT INTO devices_dim (device_name, device_type, os_name, os_version, hash) VALUES ${values};`;
    return query;
}


async function generateSessionsDim(numRecords) {
    let values = '';
    for (let i = 0; i < numRecords; i++) {
        const userId = faker.number.int({ min: 1, max: 1000 });
        const createdAt = faker.date.past().toISOString();
        const expiredAt = faker.date.future().toISOString();

        values += `(${userId}, '${createdAt}', '${expiredAt}')`;

        if (i < numRecords - 1) {
            values += ', ';
        }
    }

    const query = `INSERT INTO sessions_dim (user_id, created_at, expired_at) VALUES ${values};`;
    return query;
}


async function generateLoginFact(numRecords) {
    let values = '';
    for (let i = 0; i < numRecords; i++) {
        const userId = faker.number.int({ min: 1, max: 1000 });
        const successfulLogin = faker.datatype.boolean();
        const sessionId = faker.number.int({ min: 1, max: 1000 })
        const timeId = faker.number.int({ min: 1, max: 100 });
        const deviceId = faker.number.int({ min: 1, max: 100 });
        const locationId = faker.number.int({ min: 1, max: 100 });

        values += `(${userId}, ${successfulLogin}, ${sessionId}, ${timeId}, ${deviceId}, ${locationId})`;

        if (i < numRecords - 1) {
            values += ', ';
        }
    }

    const query = `INSERT INTO login_fact (user_id, successful_login, session_id, time_id, device_id, location_id) VALUES ${values};`;
    return query;
}

async function insertData() {
    const numRecords = 100;

    await client.connect();

    const timeDimQuery = await generateTimeDim(numRecords);
    const locationsDimQuery = await generateLocationsDim(numRecords);
    const devicesDimQuery = await generateDevicesDim(numRecords);
    const sessionsDimQuery = await generateSessionsDim(numRecords);
    const loginFactQuery = await generateLoginFact(numRecords);

    try {
        console.log('Inserting data...');
        await client.query(timeDimQuery);
        await client.query(locationsDimQuery);
        await client.query(devicesDimQuery);
        await client.query(sessionsDimQuery);
        await client.query(loginFactQuery);

        console.log(`Successfully inserted ${numRecords} records for each table.`);
    } catch (err) {
        console.error('Error inserting data:', err);
    } finally {
        await client.end();
    }
}

insertData();
