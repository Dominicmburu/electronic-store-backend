// src/validations/reviewValidation.ts

import Joi from 'joi';

// Define the review schema
export const reviewSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  content: Joi.string().min(10).max(1000).required(),
});

