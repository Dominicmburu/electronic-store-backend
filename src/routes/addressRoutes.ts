import express from 'express';
import {
  saveAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
} from '../controllers/addressController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// Address routes
router.post('/', asyncHandler(saveAddress));
router.get('/', asyncHandler(getUserAddresses));
router.put('/:id', asyncHandler(updateAddress));
router.delete('/:id', asyncHandler(deleteAddress));

export default router;
