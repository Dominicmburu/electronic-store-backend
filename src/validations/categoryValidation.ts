import Joi from 'joi';

export const categorySchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(10).max(500).required(),
    images: Joi.array().items(Joi.string()).required(),
    printerTypeId: Joi.number().integer().positive().required(),
  });