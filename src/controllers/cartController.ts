import { Request, Response } from 'express';
import prisma from '../config/database';
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

// Get the user's cart
export const getCart = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart) {
      res.status(200).json({ cart: null, message: 'Cart is empty' });
      return;
    }

    res.status(200).json({ cart });
  } catch (err) {
    console.error('Get Cart Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add an item to the cart
export const addToCart = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { productId, quantity } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  if (!productId || !quantity || quantity < 1)
    return res.status(400).json({ message: 'Invalid product or quantity' });

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Find or create cart
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
          items: {
            create: {
              productId,
              quantity,
              subtotal: product.currentPrice * quantity,
            },
          },
          totalAmount: product.currentPrice * quantity,
        },
        include: { items: true },
      });
      return res.status(201).json({ message: 'Cart created and item added', cart });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    if (existingItem) {
      // Update quantity and subtotal
      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          subtotal: (existingItem.quantity + quantity) * product.currentPrice,
        },
      });
      // Update cart total
      const updatedTotal = cart.totalAmount + product.currentPrice * quantity;
      await prisma.cart.update({
        where: { id: cart.id },
        data: { totalAmount: updatedTotal },
      });
      return res.status(200).json({ message: 'Item quantity updated', cart: { ...cart, totalAmount: updatedTotal } });
    } else {
      // Add new item to cart
      const newItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          subtotal: product.currentPrice * quantity,
        },
      });
      // Update cart total
      const updatedTotal = cart.totalAmount + product.currentPrice * quantity;
      await prisma.cart.update({
        where: { id: cart.id },
        data: { totalAmount: updatedTotal },
      });
      return res.status(200).json({ message: 'Item added to cart', cart: { ...cart, totalAmount: updatedTotal } });
    }
  } catch (err) {
    console.error('Add to Cart Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { cartItemId, quantity } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  if (!cartItemId || !quantity || quantity < 1)
    return res.status(400).json({ message: 'Invalid cart item or quantity' });

  try {
    // Find the cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: true, cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId)
      return res.status(404).json({ message: 'Cart item not found' });

    // Calculate new subtotal and update
    const newSubtotal = cartItem.product.currentPrice * quantity;
    const updatedItem = await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity, subtotal: newSubtotal },
    });

    // Recalculate cart total
    const cartItems = await prisma.cartItem.findMany({
      where: { cartId: cartItem.cartId },
      select: { subtotal: true },
    });

    const newTotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);

    await prisma.cart.update({
      where: { id: cartItem.cartId },
      data: { totalAmount: newTotal },
    });

    return res.status(200).json({ message: 'Cart item updated', cart: { id: cartItem.cartId, totalAmount: newTotal } });
  
  } catch (err) {
    console.error('Update Cart Item Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


// Remove an item from the cart
export const removeFromCart = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { cartItemId } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  if (!cartItemId) return res.status(400).json({ message: 'Invalid cart item' });

  try {
    // Find the cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true, product: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId)
      return res.status(404).json({ message: 'Cart item not found' });

    // Remove the item
    await prisma.cartItem.delete({ where: { id: cartItemId } });

    // Recalculate cart total
    const cartItems = await prisma.cartItem.findMany({
      where: { cartId: cartItem.cartId },
      select: { subtotal: true },
    });

    const newTotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);

    // Update cart total
    await prisma.cart.update({
      where: { id: cartItem.cartId },
      data: { totalAmount: newTotal },
    });

    return res.status(200).json({ message: 'Item removed from cart', cart: { id: cartItem.cartId, totalAmount: newTotal } });
  } catch (err) {
    console.error('Remove from Cart Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
