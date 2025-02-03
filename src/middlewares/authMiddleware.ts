// src/middlewares/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { JWT_SECRET } from '../config/jwt';
import { Role } from '@prisma/client';

// Define the payload structure expected in the JWT
interface JwtPayload {
  userId: number;
}

interface RequestWithUser extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    role: Role;
  };
}

/**
 * Middleware to authenticate users based on JWT tokens.
 * It expects the token to be present in the cookies under the key 'token'.
 * If valid, it attaches the user information to the request object.
 */
export const authenticateToken = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  const token = req.cookies.token;

  // If no token is provided, deny access
  if (!token) {
    res.status(401).json({ message: 'Access Denied: No token provided' });
    return;
  }

  try {
    // Verify the token using the JWT_SECRET
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Fetch the user from the database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {    
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
      },
    });

    // If user doesn't exist, deny access
    if (!user) {
      res.status(401).json({ message: 'Invalid token: User does not exist' });
      return;
    }

    // Attach user information to the request object
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    res.status(400).json({ message: 'Invalid token' });
  }
};
