import express from 'express';
import { addToWishlist, getWishlist, removeFromWishlist } from '../controllers/wishlistController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authenticateToken);

router.post('/', asyncHandler(addToWishlist));

router.get('/', asyncHandler(getWishlist));

router.delete('/', asyncHandler(removeFromWishlist));


export default router;

