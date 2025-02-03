import express from 'express';
import { getShops, addShop, updateShop, deleteShop } from '../controllers/shopController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { authorizeAdmin } from '../middlewares/adminMiddleware'; // Optional: If you have an admin middleware
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();


router.get('/', asyncHandler(getShops));

router.use(authenticateToken);
router.use(authorizeAdmin);

router.post('/', asyncHandler(addShop));

router.put('/:id', asyncHandler(updateShop));

router.delete('/:id', asyncHandler(deleteShop));

export default router;
