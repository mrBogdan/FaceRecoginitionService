import {initDatabase} from './init.js';
import {sleep} from '../sleep.js';
import {TIME_IN_MS} from '../constants.js';

const migrationRun = async () => {
    const delay = TIME_IN_MS.SEC * 15
    console.log(`[INFO] Migration started in ${delay} ms`);
    await sleep(delay);
    console.log('[INFO] Migration started');
    await initDatabase();
};

migrationRun();


