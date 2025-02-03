import { Request, Response } from 'express';
import prisma from '../config/database';
import { wishlistSchema } from '../validations/wishlistValidation';
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

export const addToWishlist = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { productId } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { error } = wishlistSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const existingWishlist = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existingWishlist)
      return res.status(400).json({ message: 'Product already in wishlist' });

    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
      include: { product: true },
    });

    res.status(201).json({ message: 'Product added to wishlist', wishlistItem });
  } catch (err) {
    console.error('Add to Wishlist Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getWishlist = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      include: { product: true },
    });

    res.status(200).json({ wishlist });
  } catch (err) {
    console.error('Get Wishlist Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const removeFromWishlist = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { productId } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  if (!productId) return res.status(400).json({ message: 'Product ID is required' });

  try {
    const wishlistItem = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!wishlistItem) return res.status(404).json({ message: 'Wishlist item not found' });

    await prisma.wishlist.delete({
      where: { userId_productId: { userId, productId } },
    });

    res.status(200).json({ message: 'Product removed from wishlist' });
  } catch (err) {
    console.error('Remove from Wishlist Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
