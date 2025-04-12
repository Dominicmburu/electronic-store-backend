import Joi from 'joi';

export const settingsSchema = Joi.object({
  newsSubscription: Joi.boolean(),
  notificationEmail: Joi.boolean(),
  notificationSMS: Joi.boolean(),
});
