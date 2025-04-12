import express from 'express';
import { addReview, getReviews, deleteReview } from '../controllers/reviewController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { authorizeAdmin } from '../middlewares/adminMiddleware'; // Optional: If you have an admin middleware
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.get('/:productId', asyncHandler(getReviews));

router.use(authenticateToken);

router.post('/', asyncHandler(addReview));

router.delete('/:reviewId', authorizeAdmin,  asyncHandler(deleteReview));

export default router;
