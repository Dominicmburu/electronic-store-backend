// src/middlewares/validationMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { CustomError } from '../utils/CustomError';

/**
 * Middleware to validate request bodies using Joi schemas.
 * @param schema - Joi schema to validate against.
 * @returns Express middleware function.
 */
const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const options = {
      abortEarly: false, // Include all errors
      allowUnknown: false, // Disallow unknown keys
      stripUnknown: true, // Remove unknown keys
    };

    const { error, value } = schema.validate(req.body, options);

    if (error) {
      // Extract detailed error messages
      const errorMessages = error.details.map((detail) => detail.message).join(', ');
      // Pass a custom error to the centralized error handler
      next(new CustomError(`Validation Error: ${errorMessages}`, 400));
    } else {
      // Replace req.body with the validated and sanitized value
      req.body = value;
      next();
    }
  };
};

export default validate;
