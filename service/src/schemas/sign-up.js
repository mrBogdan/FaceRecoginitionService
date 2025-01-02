import Joi from 'joi';

export const signUpSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.empty': 'Email cannot be empty.',
            'string.email': 'Email must be a valid email address.',
            'any.required': 'Email is required.',
        }),

    password: Joi.string()
        .min(6)
        .max(128)
        .required()
        .messages({
            'string.empty': 'Password cannot be empty.',
            'string.min': 'Password must be at least 6 characters long.',
            'string.max': 'Password cannot exceed 128 characters.',
            'any.required': 'Password is required.',
        }),

    firstName: Joi.string()
        .regex(/^[A-Za-z]+$/)
        .min(1)
        .max(50)
        .required()
        .messages({
            'string.empty': 'First name cannot be empty.',
            'string.pattern.base': 'First name can only contain alphabetic characters.',
            'string.min': 'First name must be at least 1 character long.',
            'string.max': 'First name cannot exceed 50 characters.',
            'any.required': 'First name is required.',
        }),

    lastName: Joi.string()
        .regex(/^[A-Za-z]+$/)
        .min(1)
        .max(50)
        .required()
        .messages({
            'string.empty': 'Last name cannot be empty.',
            'string.pattern.base': 'Last name can only contain alphabetic characters.',
            'string.min': 'Last name must be at least 1 character long.',
            'string.max': 'Last name cannot exceed 50 characters.',
            'any.required': 'Last name is required.',
        }),
});

