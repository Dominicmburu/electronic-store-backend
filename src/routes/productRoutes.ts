// src/routes/productRoutes.ts

import express from 'express';
import {
  getFeaturedPrinters,
  getLatestPrinters,
  listProducts,
  getProductDetails,
  createProduct,
  updateProduct,
  updateProductFeaturedStatus,
  deleteProduct,
} from '../controllers/productController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { authorizeAdmin } from '../middlewares/adminMiddleware'; // Optional: If you have an admin middleware
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Public Routes

// GET /api/products/featured - Retrieve featured printers
router.get('/featured', asyncHandler(getFeaturedPrinters));

// GET /api/products/latest - Retrieve latest printers
router.get('/latest', asyncHandler(getLatestPrinters));

// GET /api/products - List all products with pagination
router.get('/', asyncHandler(listProducts));

// GET /api/products/:id - Retrieve detailed information about a specific product
router.get('/:id', asyncHandler(getProductDetails));

// Protected Admin Routes
router.use(authenticateToken);
router.use(authorizeAdmin); // Ensure only admins can access the following routes

// POST /api/products - Create a new product
router.post('/', asyncHandler(createProduct));

// PUT /api/products/:id - Update an existing product
router.put('/:id', asyncHandler(updateProduct));

// PUT /api/products/:id/featured - Update the isFeatured status of a product
router.put('/:id/featured', asyncHandler(updateProductFeaturedStatus));

// DELETE /api/products/:id - Delete a product
router.delete('/:id', asyncHandler(deleteProduct));

export default router;
