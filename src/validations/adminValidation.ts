import Joi from 'joi';

export const adminCreateUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().optional(),
  password: Joi.string().min(6).required(),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().optional(),
  role: Joi.string().valid('USER', 'ADMIN').optional(),
  password: Joi.string().min(6).optional(),
});
