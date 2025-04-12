import { Request, Response } from 'express';
import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { updateProfileSchema } from '../validations/userValidation';
import { Prisma, Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    role: Role;
  };
}

export const getProfile = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        addresses: true,
        paymentMethods: true,
        wishlist: true,
        orders: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ user });
  } catch (err) {
    console.error('Get Profile Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { name, email, phoneNumber, password, currentPassword } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  // Validate request body
  const { error } = updateProfileSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    // Fetch the user's current data
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    const isUpdatingSensitiveFields = password || email || phoneNumber;
    if (isUpdatingSensitiveFields && !currentPassword) {
      return res.status(400).json({ message: 'Current password is required to update sensitive fields.' });
    }

    if (isUpdatingSensitiveFields) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Incorrect current password.' });
      }
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        addresses: true,
        paymentMethods: true,
        wishlist: true,
        orders: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Update Profile Error:', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(400).json({ message: 'Email already in use.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
