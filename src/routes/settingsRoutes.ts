import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authenticateToken);

router.get('/', asyncHandler(getSettings));

router.put('/', asyncHandler(updateSettings));

export default router;
