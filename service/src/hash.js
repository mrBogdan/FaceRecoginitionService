import crypto from 'node:crypto';

export const generateHash = (fields, algorithm = 'md5') => {
    const inputString = fields.join('|');
    return crypto.createHash(algorithm).update(inputString).digest('hex');
};

export const generatePasswordHash = (string, algorithm = 'md5') => {
    return crypto.createHash(algorithm).update(string).digest('hex');
};
