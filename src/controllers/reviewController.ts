// src/controllers/reviewController.ts

import { Request, Response } from 'express';
import prisma from '../config/database';
import { reviewSchema } from '../validations/reviewValidation';
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

// Add a new review for a product
export const addReview = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { productId, rating, content } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  // Validate request body
  const { error } = reviewSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Create the review
    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        content,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    res.status(201).json({ message: 'Review added successfully', review });
  } catch (err) {
    console.error('Add Review Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all reviews for a specific product
export const getReviews = async (req: RequestWithUser, res: Response) => {
  const { productId } = req.params;

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Retrieve reviews
    const reviews = await prisma.review.findMany({
      where: { productId: Number(productId) },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ reviews });
  } catch (err) {
    console.error('Get Reviews Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// (Optional) Delete a review (Admin or Owner)
export const deleteReview = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { reviewId } = req.params;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // Find the review
    const review = await prisma.review.findUnique({ where: { id: Number(reviewId) } });
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Check if the user is the owner of the review or an admin
    // Assuming you have a role field or similar in the User model
    // For simplicity, only owners can delete their reviews
    if (review.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Delete the review
    await prisma.review.delete({ where: { id: Number(reviewId) } });

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Delete Review Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
