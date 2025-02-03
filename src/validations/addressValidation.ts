// src/validations/addressValidation.ts

import Joi from 'joi';

export const addressSchema = Joi.object({
  address: Joi.string().min(5).max(100).required(),
  city: Joi.string().min(2).max(50).required(),
  state: Joi.string().min(2).max(50).required(),
  zip: Joi.string().pattern(/^[0-9]{5,10}$/).required(),
  country: Joi.string().min(2).max(50).required(),
});
