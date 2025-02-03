// src/validations/settingsValidation.ts

import Joi from 'joi';

// Define the settings schema
export const settingsSchema = Joi.object({
  newsSubscription: Joi.boolean(),
  notificationEmail: Joi.boolean(),
  notificationSMS: Joi.boolean(),
});
