import Joi from 'joi';

export const productSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  lastPrice: Joi.number().positive().required(),
  currentPrice: Joi.number().positive().required(),
  stockQuantity: Joi.number().integer().min(0).required(),
  specifications: Joi.object().required(), // Expecting JSON
  images: Joi.array().items(Joi.string()).required(), // Array of valid URLs
  isFeatured: Joi.boolean(),
  categoryId: Joi.number().integer().positive().required(),
});

export const updateFeaturedSchema = Joi.object({
  isFeatured: Joi.boolean().required(),
});
