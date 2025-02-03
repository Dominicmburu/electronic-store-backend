import Joi from 'joi';

export const paymentMethodSchema = Joi.object({
  type: Joi.string()
    .valid('CASH', 'MPESA', 'CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER', 'UPI')
    .required(),
  details: Joi.string().required(),
});
