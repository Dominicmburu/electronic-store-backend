import { Request, Response } from 'express';
import prisma from '../config/database';
import { addressSchema } from '../validations/addressValidation';
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

// Save a New Address
export const saveAddress = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { address, city, state, zip, country } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const { error } = addressSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  try {
    const newAddress = await prisma.address.create({
      data: { userId, address, city, state, zip, country },
    });

    res.status(201).json({ message: 'Address saved successfully', address: newAddress });
  } catch (err) {
    console.error('Save Address Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get User Addresses
export const getUserAddresses = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const addresses = await prisma.address.findMany({ where: { userId } });
    res.status(200).json({ addresses });
  } catch (err) {
    console.error('Get User Addresses Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update an Address
export const updateAddress = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { address, city, state, zip, country } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const updatedAddress = await prisma.address.update({
      where: { id: Number(id) },
      data: { address, city, state, zip, country },
    });

    res.status(200).json({ message: 'Address updated successfully', address: updatedAddress });
  } catch (err) {
    console.error('Update Address Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete an Address
export const deleteAddress = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    await prisma.address.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (err) {
    console.error('Delete Address Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
