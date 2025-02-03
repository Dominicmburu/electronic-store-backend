import { Request, Response } from 'express';
import prisma from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { PaymentMethodType, Role, OrderStatusEnum } from '@prisma/client';
import { updateOrderStatusSchema } from '../validations/orderValidation';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    role: Role;
  };
}

// Place a new order
export const placeOrder = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { shippingAddressId, paymentMethodId } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  if (!shippingAddressId || !paymentMethodId)
    return res.status(400).json({ message: 'Shipping address and payment method are required' });

  try {

    const shippingAddress = await prisma.address.findUnique({
      where: { id: Number(shippingAddressId) },
    });

    if (!shippingAddress || shippingAddress.userId !== userId) {
      return res.status(400).json({ message: 'Go to settings and add your shipping address' });
    }

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: Number(paymentMethodId),
      },
    });

    if (!paymentMethod || paymentMethod.userId !== userId) {
      return res
        .status(400)
        .json({ message: 'Please choose a valid payment method. Go to settings and add Payment method' });
    }

    // Retrieve user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: 'Cart is empty' });

    // Generate unique order number
    const orderNumber = uuidv4();

    // Create the order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: req.user?.name || 'Unknown',
        shippingAddress: `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.zip}, ${shippingAddress.country}`,
        paymentMethod: paymentMethod.type as PaymentMethodType,
        status: OrderStatusEnum.PENDING,
        userId,
        orderItems: {
          create: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.currentPrice,
          })),
        },
        statusHistory: {
          create: {
            status: OrderStatusEnum.PENDING,
          },
        },
      },
      include: {
        orderItems: { include: { product: true } },
        statusHistory: true,
      },
    });

    // Clear the user's cart
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({
      where: { id: cart.id },
      data: { totalAmount: 0 },
    });

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (err) {
    console.error('Place Order Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get order details by order number
export const getOrderDetails = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { orderNumber } = req.params;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // Find the order
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        orderItems: { include: { product: true } },
        statusHistory: true,
      },
    });

    if (!order || order.userId !== userId)
      return res.status(404).json({ message: 'Order not found' });

    res.status(200).json({ order });
  } catch (err) {
    console.error('Get Order Details Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order status (Admin functionality)
export const updateOrderStatus = async (req: RequestWithUser, res: Response) => {
  // Assuming you have admin middleware to protect this route
  const { orderNumber } = req.params;
  const { status } = req.body;

  const { error } = updateOrderStatusSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    // Find the order
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Update the order status
    const updatedOrder = await prisma.order.update({
      where: { orderNumber },
      data: {
        status: status as OrderStatusEnum,
        statusHistory: {
          create: { status: status as OrderStatusEnum },
        },
      },
      include: {
        orderItems: { include: { product: true } },
        statusHistory: true,
      },
    });

    res.status(200).json({ message: 'Order status updated', order: updatedOrder });
  } catch (err) {
    console.error('Update Order Status Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Track order status
export const trackOrder = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { orderNumber } = req.params;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // Find the order
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        statusHistory: true,
      },
    });

    if (!order || order.userId !== userId)
      return res.status(404).json({ message: 'Order not found' });

    res.status(200).json({ orderNumber: order.orderNumber, statusHistory: order.statusHistory });
  } catch (err) {
    console.error('Track Order Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Delete/Cancel an order
export const cancelOrder = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  const { orderNumber } = req.params;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // Find the order
    const order = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (!order || order.userId !== userId) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === OrderStatusEnum.CANCELLED) {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    // Update the order status to "Cancelled"
    const updatedOrder = await prisma.order.update({
      where: { orderNumber },
      data: {
        status: OrderStatusEnum.CANCELLED,
        statusHistory: {
          create: { status: OrderStatusEnum.CANCELLED },
        },
      },
      include: {
        orderItems: { include: { product: true } },
        statusHistory: true,
      },
    });

    res.status(200).json({ message: 'Order cancelled successfully', order: updatedOrder });
  } catch (err) {
    console.error('Cancel Order Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};






