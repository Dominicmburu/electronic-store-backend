import Joi from 'joi';

// Validation Schema for PrinterType
export const printerTypeSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
});