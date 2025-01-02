import Joi from 'joi';

export const signInSchema = Joi.object({
    credentials: Joi.object({
        email: Joi.string()
            .email()
            .max(100)
            .required(),
        password: Joi.string()
            .min(8)
            .max(100)
            .required(),
    }).required(),
    locations: Joi.object({
        country: Joi.string().max(50),
        region: Joi.string().max(50),
        city: Joi.string().max(50),
        latitude: Joi.number().precision(6).min(-90).max(90).required(),
        longitude: Joi.number().precision(6).min(-180).max(180).required(),
    }).required()
});
