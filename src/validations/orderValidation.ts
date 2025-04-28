import { OrderStatusEnum } from '@prisma/client';
import Joi from 'joi';

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(OrderStatusEnum))
    .required(),
});