import { Request, Response } from 'express';
import prisma from '../config/database';
import { paymentMethodSchema } from '../validations/paymentValidation';
import { Role, PaymentMethodType } from '@prisma/client';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    role: Role;
  };
}

// Add a new payment method
export const addPaymentMethod = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { type, details } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Validate request body
  const { error } = paymentMethodSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  // Ensure `type` is a valid enum value
  if (!['CASH', 'MPESA', 'CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER', 'UPI'].includes(type)) {
    res.status(400).json({ message: 'Invalid payment method type' });
    return;
  }

  try {
    // Create new payment method
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId,
        type: type as PaymentMethodType,
        details,
      },
    });

    res.status(201).json({ message: 'Payment method added', paymentMethod });
  } catch (err) {
    console.error('Add Payment Method Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all payment methods for the user
export const getPaymentMethods = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        details: true,
      },
    });

    res.status(200).json({ paymentMethods });
  } catch (err) {
    console.error('Get Payment Methods Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove a payment method
export const removePaymentMethod = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { paymentMethodId } = req.body;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (!paymentMethodId) {
    res.status(400).json({ message: 'Payment method ID is required' });
    return;
  }

  try {
    // Find the payment method
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod || paymentMethod.userId !== userId) {
      res.status(404).json({ message: 'Payment method not found' });
      return;
    }

    // Delete the payment method
    await prisma.paymentMethod.delete({ where: { id: paymentMethodId } });

    res.status(200).json({ message: 'Payment method removed' });
  } catch (err) {
    console.error('Remove Payment Method Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
