// src/routes/paymentRoutes.ts

import express from 'express';
import { addPaymentMethod, getPaymentMethods, removePaymentMethod } from '../controllers/paymentController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Apply authentication middleware to all payment routes
router.use(authenticateToken);

// POST /api/payments - Add a new payment method
router.post('/', asyncHandler(addPaymentMethod));

// GET /api/payments - Retrieve all payment methods for the user
router.get('/', asyncHandler(getPaymentMethods));

// DELETE /api/payments - Remove a payment method
router.delete('/', asyncHandler(removePaymentMethod));

export default router;
