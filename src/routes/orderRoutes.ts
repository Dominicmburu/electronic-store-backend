// src/routes/orderRoutes.ts

import express from 'express';
import { placeOrder, getOrderDetails, updateOrderStatus, trackOrder, cancelOrder, getUserOrders } from '../controllers/orderController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { authorizeAdmin } from '../middlewares/adminMiddleware'; // Optional: If you have an admin middleware
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Apply authentication middleware to all order routes
router.use(authenticateToken);

router.get('/user', asyncHandler(getUserOrders));

// POST /api/orders - Place a new order
router.post('/', asyncHandler(placeOrder));

// GET /api/orders/:orderNumber - Retrieve order details
router.get('/:orderNumber', asyncHandler(getOrderDetails));

// PUT /api/orders/:orderNumber/status - Update order status (Admin only)
router.put('/:orderNumber/status', authorizeAdmin, asyncHandler(updateOrderStatus));

// GET /api/orders/:orderNumber/track - Track order status
router.get('/:orderNumber/track', asyncHandler(trackOrder));

// DELETE /api/orders/:orderNumber - Cancel an order
router.delete('/:orderNumber', asyncHandler(cancelOrder));

export default router;
