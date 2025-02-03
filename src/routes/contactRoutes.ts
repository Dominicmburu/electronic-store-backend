// src/routes/contactRoutes.ts

import express from 'express';
import { contactUs } from '../controllers/contactController';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// POST /api/contact - Send a contact message
router.post('/', asyncHandler(contactUs));

export default router;
