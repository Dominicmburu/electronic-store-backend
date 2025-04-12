import express from 'express';
import { getProfile, updateProfile } from '../controllers/userController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', asyncHandler(getProfile));

router.put('/profile', asyncHandler(updateProfile));

export default router;
