import Joi from 'joi';
import { TransactionType, PaymentMethodType, RefundStatus } from '@prisma/client';

// Validation schema for STK Push request
export const stkPushSchema = Joi.object({
  orderId: Joi.number().required().messages({
    'number.base': 'Order ID must be a number',
    'any.required': 'Order ID is required',
  }),
  phoneNumber: Joi.string().required().min(10).messages({
    'string.base': 'Phone number must be a string',
    'string.min': 'Phone number must be at least 10 characters',
    'any.required': 'Phone number is required',
  }),
});

// Validation schema for wallet top-up
export const walletTopUpSchema = Joi.object({
  amount: Joi.number().required().min(1).messages({
    'number.base': 'Amount must be a number',
    'number.min': 'Amount must be at least 10',
    'any.required': 'Amount is required',
  }),
  phoneNumber: Joi.string().required().min(10).messages({
    'string.base': 'Phone number must be a string',
    'string.min': 'Phone number must be at least 10 characters',
    'any.required': 'Phone number is required',
  }),
});

// Validation schema for wallet payment
export const walletPaymentSchema = Joi.object({
  orderId: Joi.number().required().messages({
    'number.base': 'Order ID must be a number',
    'any.required': 'Order ID is required',
  }),
});

// Validation schema for refund request
export const refundRequestSchema = Joi.object({
  orderId: Joi.number().required().messages({
    'number.base': 'Order ID must be a number',
    'any.required': 'Order ID is required',
  }),
  reason: Joi.string().required().min(10).max(500).messages({
    'string.base': 'Reason must be a string',
    'string.min': 'Reason must be at least 10 characters',
    'string.max': 'Reason must be at most 500 characters',
    'any.required': 'Reason is required',
  }),
});

// Validation schema for processing refund
export const processRefundSchema = Joi.object({
  refundRequestId: Joi.number().required().messages({
    'number.base': 'Refund request ID must be a number',
    'any.required': 'Refund request ID is required',
  }),
  action: Joi.string().required().valid('approve', 'reject').messages({
    'string.base': 'Action must be a string',
    'any.only': 'Action must be either "approve" or "reject"',
    'any.required': 'Action is required',
  }),
  remarks: Joi.string().allow('').max(500).messages({
    'string.base': 'Remarks must be a string',
    'string.max': 'Remarks must be at most 500 characters',
  }),
});