import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    role: Role;
  };
}

export const authorizeAdmin = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }, // Assuming you have a 'role' field in the User model
    });

    if (!user || user.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden: Admins only' });
      return;
    }

    next();

  } catch (error) {
    console.error('Admin Authorization Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
