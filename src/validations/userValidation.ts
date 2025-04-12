import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional()
    .messages({
      'string.base': '"name" should be a type of text',
      'string.empty': '"name" cannot be empty',
      'string.min': '"name" should have a minimum length of {#limit}',
      'string.max': '"name" should have a maximum length of {#limit}',
    }),

  email: Joi.string().email().optional()
    .messages({
      'string.base': '"email" should be a type of text',
      'string.email': '"email" must be a valid email',
      'string.empty': '"email" cannot be empty',
    }),

  phoneNumber: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .optional()
    .messages({
      'string.base': '"phoneNumber" should be a type of text',
      'string.empty': '"phoneNumber" cannot be empty',
      'string.pattern.base': '"phoneNumber" must contain only digits and be between 10 to 15 characters long',
    }),

  password: Joi.string().min(8).max(100).optional()
    .messages({
      'string.base': '"password" should be a type of text',
      'string.empty': '"password" cannot be empty',
      'string.min': '"password" should have a minimum length of {#limit}',
      'string.max': '"password" should have a maximum length of {#limit}',
    }),

  currentPassword: Joi.string()
    .when('password', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.base': '"currentPassword" should be a type of text',
      'string.empty': '"currentPassword" cannot be empty',
      'any.required': '"currentPassword" is required when updating password',
    }),

}).min(1)
  .messages({
    'object.min': 'At least one field (name, email, phoneNumber, password) must be provided',
  });
