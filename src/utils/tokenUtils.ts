// src/utils/tokenUtils.ts

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generates a JWT for a given user ID.
 * @param userId - The ID of the user.
 * @returns A signed JWT.
 */
export const generateToken = (userId: number): string => {
  const payload = { userId };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifies a JWT and returns the decoded payload.
 * @param token - The JWT to verify.
 * @returns The decoded payload if valid.
 * @throws An error if the token is invalid or expired.
 */
export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};
