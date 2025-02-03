import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'; 
