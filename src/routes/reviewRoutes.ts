// src/routes/reviewRoutes.ts

import express from 'express';
import { addReview, getReviews, deleteReview } from '../controllers/reviewController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { authorizeAdmin } from '../middlewares/adminMiddleware'; // Optional: If you have an admin middleware
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Public Route

// GET /api/reviews/:productId - Retrieve all reviews for a specific product
router.get('/:productId', asyncHandler(getReviews));

// Protected Routes
router.use(authenticateToken);

// POST /api/reviews - Add a new review
router.post('/', asyncHandler(addReview));

// DELETE /api/reviews/:reviewId - Remove a review (Owner or Admin)
router.delete('/:reviewId', authorizeAdmin,  asyncHandler(deleteReview));

export default router;
