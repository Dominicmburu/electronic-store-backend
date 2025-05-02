// import Joi from 'joi';

// export const productSchema = Joi.object({
//   name: Joi.string().min(3).max(100).required(),
//   description: Joi.string().min(10).max(1000).required(),
//   lastPrice: Joi.number().positive().required(),
//   currentPrice: Joi.number().positive().required(),
//   stockQuantity: Joi.number().integer().min(0).required(),
//   specifications: Joi.object().required(), // Expecting JSON
//   images: Joi.array().items(Joi.string()).optional(),
//   isFeatured: Joi.boolean(),
//   categoryId: Joi.number().integer().positive().required(),
// });

// export const updateFeaturedSchema = Joi.object({
//   isFeatured: Joi.boolean().required(),
// });

import Joi from 'joi';

export const productSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(1000).required(),
  lastPrice: Joi.number().positive().required().messages({
    'number.base': 'Original price must be a number',
    'number.positive': 'Original price must be positive'
  }),
  currentPrice: Joi.number().positive().required().messages({
    'number.base': 'Current price must be a number',
    'number.positive': 'Current price must be positive'
  }),
  stockQuantity: Joi.number().integer().min(0).required().messages({
    'number.base': 'Stock quantity must be a number',
    'number.integer': 'Stock quantity must be a whole number',
    'number.min': 'Stock quantity cannot be negative'
  }),
  specifications: Joi.alternatives().try(
    Joi.object().required(),
    Joi.string().custom((value, helpers) => {
      try {
        JSON.parse(value);
        return value;
      } catch (err) {
        return helpers.error('string.invalid');
      }
    }, 'validate JSON string')
  ).messages({
    'alternatives.types': 'Specifications must be either a valid JSON object or a valid JSON string'
  }),
  images: Joi.array().items(Joi.string()).optional(),
  existingImages: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string().custom((value, helpers) => {
      try {
        JSON.parse(value);
        return value;
      } catch (err) {
        return helpers.error('string.invalid');
      }
    }, 'validate JSON string')
  ).optional(),
  isFeatured: Joi.boolean().optional(),
  categoryId: Joi.number().integer().positive().required().messages({
    'number.base': 'Category ID must be a number',
    'number.integer': 'Category ID must be a whole number',
    'number.positive': 'Category ID must be positive',
    'any.required': 'Category is required'
  }),
});

export const updateFeaturedSchema = Joi.object({
  isFeatured: Joi.boolean().required(),
});