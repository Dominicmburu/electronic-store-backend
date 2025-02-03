// src/routes/cartRoutes.ts

import express from 'express';
import { getCart, addToCart, updateCartItem, removeFromCart } from '../controllers/cartController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Apply authentication middleware to all cart routes
router.use(authenticateToken);

// GET /api/cart - Retrieve the user's cart
router.get('/', asyncHandler(getCart));

// POST /api/cart - Add an item to the cart
router.post('/', asyncHandler(addToCart));

// PUT /api/cart/item - Update the quantity of a cart item
router.put('/item', asyncHandler(updateCartItem));

// DELETE /api/cart/item - Remove an item from the cart
router.delete('/item', asyncHandler(removeFromCart));

export default router;
