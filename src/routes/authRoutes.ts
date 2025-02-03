// src/routes/authRoutes.ts

import express from 'express';
import { register, login, logout } from '../controllers/authController';
import validate from '../middlewares/validationMiddleware';
import { registerSchema, loginSchema } from '../validations/authValidation';

const router = express.Router();

// POST /api/auth/register - Register a new user
router.post('/register', validate(registerSchema), register);

// POST /api/auth/login - Login an existing user
router.post('/login', validate(loginSchema), login);

// POST /api/auth/logout - Logout a user
router.post('/logout', logout);

export default router;
