// src/routes/userRoutes.ts

import express from 'express';
import { getProfile, updateProfile } from '../controllers/userController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Apply authentication middleware to all user routes
router.use(authenticateToken);

// GET /api/users/profile - Retrieve user profile
router.get('/profile', asyncHandler(getProfile));

// PUT /api/users/profile - Update user profile
router.put('/profile', asyncHandler(updateProfile));

export default router;
