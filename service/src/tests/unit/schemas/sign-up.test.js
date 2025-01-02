import {describe, expect, it} from '@jest/globals';
import {signUpSchema} from '../../../schemas/index.js';

describe('#sign-up', () => {
    it('should validate input data', () => {
        const data = {
            email: '',
            password: '',
            firstName: '',
            lastName: '',
        };
        const result = signUpSchema.validate(data);
        expect(result.error).not.toBeNull();
    });
});
