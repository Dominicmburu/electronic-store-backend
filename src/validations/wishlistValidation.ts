// src/validations/wishlistValidation.ts

import Joi from 'joi';

// Define the wishlist schema
export const wishlistSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
});
