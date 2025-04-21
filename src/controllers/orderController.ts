import { Request, Response } from 'express';
import prisma from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { PaymentMethodType, Role, OrderStatusEnum } from '@prisma/client';
import { updateOrderStatusSchema } from '../validations/orderValidation';
import { format, subDays, subMonths, subYears, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    role: Role;
  };
}


// Get user orders
export const getUserOrders = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id; 

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }  

  try {
    const orders = await prisma.order.findMany({
      where: { userId },  
      include: {
        orderItems: { include: { product: true } },  
        statusHistory: true, 
      },
    });    

    if (orders.length === 0) {
      return res.status(200).json({ message: 'No orders found for this user' });
    }

    res.status(200).json({ orders }); 
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

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

export const getAllOrders = async (req: RequestWithUser, res: Response) => {
  const userId = req.user?.id;
  
  // Check if the user is an admin
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const orders = await prisma.order.findMany({
      include: {
        orderItems: { include: { product: true } },
        statusHistory: true, 
      },
    });

    if (orders.length === 0) {
      return res.status(404).json({ message: 'No orders found' });
    }

    res.status(200).json({ orders }); 
  } catch (err) {
    console.error('Error fetching orders:', err);
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


export const getRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = 'monthly' } = req.query;

    // Get date range based on period
    const { startDate, endDate } = getDateRange(period as 'daily' | 'weekly' | 'monthly' | 'yearly');

    // Get all orders within the date range
    const orders = await prisma.order.findMany({
      where: {
        orderDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        orderItems: true
      }
    });

    // Initialize result data structure
    let items: any[] = [];
    let totalRevenue = 0;
    let previousPeriodRevenue = 0;
    let periodLabel = '';

    // Process data based on period
    switch (period) {
      case 'daily': {
        // Group by hour
        periodLabel = 'Today';
        const hours = Array.from({ length: 24 }, (_, i) => i);
        
        items = hours.map(hour => {
          const hourOrders = orders.filter(order => {
            const orderHour = new Date(order.orderDate).getHours();
            return orderHour === hour;
          });

          const revenue = hourOrders.reduce((sum, order) => {
            return sum + order.orderItems.reduce((orderSum, item) => 
              orderSum + (item.price * item.quantity), 0);
          }, 0);

          const ordersCount = hourOrders.length;

          return {
            date: `${hour.toString().padStart(2, '0')}:00`,
            revenue,
            orders: ordersCount
          };
        });

        totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
        break;
      }

      case 'weekly': {
        // Group by day
        periodLabel = 'This Week';
        const days = eachDayOfInterval({
          start: startDate,
          end: endDate
        });

        items = days.map(day => {
          const dayStr = format(day, 'EEE');
          const dayOrders = orders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate.getDate() === day.getDate() && 
                   orderDate.getMonth() === day.getMonth();
          });

          const revenue = dayOrders.reduce((sum, order) => {
            return sum + order.orderItems.reduce((orderSum, item) => 
              orderSum + (item.price * item.quantity), 0);
          }, 0);

          const ordersCount = dayOrders.length;

          return {
            date: dayStr,
            revenue,
            orders: ordersCount
          };
        });

        totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
        break;
      }

      case 'monthly': {
        // Group by day
        periodLabel = 'This Month';
        const days = eachDayOfInterval({
          start: startDate,
          end: endDate
        });

        items = days.map(day => {
          const dayStr = format(day, 'dd');
          const dayOrders = orders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate.getDate() === day.getDate() && 
                   orderDate.getMonth() === day.getMonth();
          });

          const revenue = dayOrders.reduce((sum, order) => {
            return sum + order.orderItems.reduce((orderSum, item) => 
              orderSum + (item.price * item.quantity), 0);
          }, 0);

          const ordersCount = dayOrders.length;

          return {
            date: dayStr,
            revenue,
            orders: ordersCount
          };
        });

        totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
        break;
      }

      case 'yearly': {
        // Group by month
        periodLabel = 'This Year';
        const months = eachMonthOfInterval({
          start: startDate,
          end: endDate
        });

        items = months.map(month => {
          const monthStr = format(month, 'MMM');
          const monthOrders = orders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate.getMonth() === month.getMonth() && 
                   orderDate.getFullYear() === month.getFullYear();
          });

          const revenue = monthOrders.reduce((sum, order) => {
            return sum + order.orderItems.reduce((orderSum, item) => 
              orderSum + (item.price * item.quantity), 0);
          }, 0);

          const ordersCount = monthOrders.length;

          return {
            date: monthStr,
            revenue,
            orders: ordersCount
          };
        });

        totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
        break;
      }
    }

    // Calculate trend by comparing with previous period
    const previousPeriod = getDateRange(period as 'daily' | 'weekly' | 'monthly' | 'yearly');
    previousPeriod.endDate = previousPeriod.startDate;
    previousPeriod.startDate = new Date(previousPeriod.startDate.getTime() - (endDate.getTime() - startDate.getTime()));

    const previousOrders = await prisma.order.findMany({
      where: {
        orderDate: {
          gte: previousPeriod.startDate,
          lte: previousPeriod.endDate
        },
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        orderItems: true
      }
    });

    previousPeriodRevenue = previousOrders.reduce((sum, order) => {
      return sum + order.orderItems.reduce((orderSum, item) => 
        orderSum + (item.price * item.quantity), 0);
    }, 0);

    const trend = previousPeriodRevenue > 0 
      ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
      : totalRevenue > 0 ? 100 : 0;

    res.json({
      items,
      totalRevenue,
      trend: parseFloat(trend.toFixed(1)),
      periodLabel
    });

  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
};

// Helper function to generate date ranges
function getDateRange(period: 'daily' | 'weekly' | 'monthly' | 'yearly') {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (period) {
    case 'daily':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'weekly':
      startDate = subDays(now, 7);
      break;
    case 'monthly':
      startDate = subMonths(now, 1);
      break;
    case 'yearly':
      startDate = subYears(now, 1);
      break;
    default:
      startDate = subMonths(now, 1);
  }

  return { startDate, endDate };
}









