import { Request, Response } from 'express';
import prisma from '../config/database';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { TransactionType, TransactionStatus, PaymentMethodType, OrderStatusEnum, Role, RefundStatus } from '@prisma/client';
import * as crypto from 'crypto';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    role: Role;
  };
}

import * as path from 'path';
import { generateSecurityCredential } from '../utils/mpesaSecurityHandler';

// Environment variables
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || '';
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || '';
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '';

// callback URL for M-Pesa
const STK_CALLBACK_URL = process.env.STK_CALLBACK_URL || 'https://your-domain.com/api/mpesa/callback/stk';
const WALLET_CALLBACK_URL = process.env.WALLET_CALLBACK_URL || 'https://your-domain.com/api/mpesa/callback/wallet';
// const STK_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/api/mpesa/callback';


const MPESA_INITIATOR_NAME = process.env.MPESA_INITIATOR_NAME || '';
// const MPESA_INITIATOR_PASSWORD = process.env.MPESA_INITIATOR_PASSWORD || '';
const MPESA_CERT_PATH = process.env.MPESA_CERT_PATH || path.join(__dirname, '../utils/cert/ProductionCertificate.cer');

// API endpoints
const MPESA_STK_PUSH_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
const MPESA_OAUTH_URL = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const MPESA_B2C_URL = 'https://api.safaricom.co.ke/mpesa/b2c/v3/paymentrequest';
const MPESA_ACCOUNT_BALANCE_URL = 'https://api.safaricom.co.ke/mpesa/accountbalance/v1/query';
const MPESA_TRANSACTION_STATUS_URL = 'https://api.safaricom.co.ke/mpesa/transactionstatus/v1/query';
const MPESA_REVERSAL_URL = 'https://api.safaricom.co.ke/mpesa/reversal/v1/request';
const MPESA_C2B_REGISTER_URL = 'https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl';

// Helper: Get M-Pesa OAuth Token
const getMpesaToken = async (): Promise<string> => {
  try {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const response = await axios.get(MPESA_OAUTH_URL, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting M-Pesa token:', error);
    throw new Error('Failed to get M-Pesa token');
  }
};

const generatePassword = (timestamp: string): string => {
  const password = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(password).toString('base64');
};

const getTimestamp = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Helper: Format phone number to required format (254XXXXXXXXX)
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any non-digit characters
  let digits = phoneNumber.replace(/\D/g, '');

  // If it starts with '0', replace with '254'
  if (digits.startsWith('0')) {
    digits = '254' + digits.substring(1);
  }

  // If it doesn't start with '254', add it
  if (!digits.startsWith('254')) {
    digits = '254' + digits;
  }

  return digits;
};

// Initialize M-Pesa C2B URLs (should be called on app startup)
export const initializeMpesaC2B = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = await getMpesaToken();

    const response = await axios.post(
      MPESA_C2B_REGISTER_URL,
      {
        ShortCode: MPESA_SHORTCODE,
        ResponseType: 'Completed',
        ConfirmationURL: `${process.env.API_BASE_URL}/api/mpesa/c2b/confirmation`,
        ValidationURL: `${process.env.API_BASE_URL}/api/mpesa/c2b/validation`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({
      message: 'M-Pesa C2B URLs registered successfully',
      data: response.data,
    });
  } catch (error) {
    console.error('Error initializing M-Pesa C2B:', error);
    res.status(500).json({ message: 'Error initializing M-Pesa C2B' });
  }
};

// User Functions

// Initiate STK Push for direct payment
export const initiateSTKPush = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { orderId, phoneNumber } = req.body;

  if (!orderId || !phoneNumber) {
    res.status(400).json({ message: 'Order ID and phone number are required' });
    return;
  }

  try {
    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { orderItems: true },
    });

    if (!order || order.userId !== userId) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Calculate total amount
    const amount = order.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Format timestamp for M-Pesa
    const timestamp = getTimestamp();
    const password = generatePassword(timestamp);

    // Get M-Pesa access token
    const token = await getMpesaToken();

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Create a unique reference
    const reference = `ORDER-${order.id}-${timestamp}`;

    // Make STK push request
    const response = await axios.post(
      MPESA_STK_PUSH_URL,
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: `${STK_CALLBACK_URL}`,
        AccountReference: reference,
        TransactionDesc: `Payment for Order #${order.orderNumber}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Store transaction in database
    const transaction = await prisma.transaction.create({
      data: {
        transactionType: TransactionType.PAYMENT,
        amount,
        paymentMethod: PaymentMethodType.MPESA,
        userId,
        orderId: order.id,
        status: TransactionStatus.PENDING,
        reference,
        metaData: {
          checkoutRequestID: response.data.CheckoutRequestID,
          merchantRequestID: response.data.MerchantRequestID,
        },
      },
    });

    res.status(200).json({
      message: 'STK push initiated successfully. Please complete the payment on your phone.',
      data: {
        checkoutRequestID: response.data.CheckoutRequestID,
        merchantRequestID: response.data.MerchantRequestID,
        transactionId: transaction.id,
      },
    });
  } catch (error) {
    console.error('STK Push Error:', error);
    res.status(500).json({ message: 'Failed to initiate M-Pesa payment' });
  }
};

// Initiate STK Push for wallet top-up
export const topUpWallet = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { amount, phoneNumber } = req.body;

  if (!amount || !phoneNumber || amount <= 0) {
    res.status(400).json({ message: 'Valid amount and phone number are required' });
    return;
  }

  try {
    // Find or create wallet
    let wallet = await prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    // Format timestamp for M-Pesa
    const timestamp = getTimestamp();
    const password = generatePassword(timestamp);

    // Get M-Pesa access token
    const token = await getMpesaToken();

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Create a unique reference
    const reference = `TOPUP-${userId}-${timestamp}`;

    // Make STK push request
    const response = await axios.post(
      MPESA_STK_PUSH_URL,
      {
        BusinessShortCode: MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: `${WALLET_CALLBACK_URL}`,
        AccountReference: reference,
        TransactionDesc: `Wallet Top-up for User #${userId}`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Store transaction in database
    const transaction = await prisma.transaction.create({
      data: {
        transactionType: TransactionType.WALLET_TOPUP,
        amount: Number(amount),
        paymentMethod: PaymentMethodType.MPESA,
        userId,
        walletId: wallet.id,
        status: TransactionStatus.PENDING,
        reference,
        metaData: {
          checkoutRequestID: response.data.CheckoutRequestID,
          merchantRequestID: response.data.MerchantRequestID,
        },
      },
    });

    res.status(200).json({
      message: 'Wallet top-up initiated. Please complete the payment on your phone.',
      data: {
        checkoutRequestID: response.data.CheckoutRequestID,
        merchantRequestID: response.data.MerchantRequestID,
        transactionId: transaction.id,
      },
    });
  } catch (error) {
    console.error('Wallet Top-up Error:', error);
    res.status(500).json({ message: 'Failed to initiate wallet top-up' });
  }
};

// Pay for order using wallet balance
export const payWithWallet = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { orderId } = req.body;

  if (!orderId) {
    res.status(400).json({ message: 'Order ID is required' });
    return;
  }

  const existingTransaction = await prisma.transaction.findFirst({
    where: {
      orderId: orderId,
      status: TransactionStatus.COMPLETED,
    },
  });

  if (existingTransaction) {
    res.status(400).json({ message: 'This order has already been paid for' });
    return;
  }

  // if (order.status !== OrderStatusEnum.PENDING) {
  //   res.status(400).json({ message: 'This order is not in a payable state' });
  //   return;
  // }

  try {
    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { orderItems: true },
    });

    if (!order || order.userId !== userId) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Calculate total amount
    const amount = order.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Check wallet balance
    const wallet = await prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) {
      res.status(400).json({ message: 'Wallet not found. Please top up first.' });
      return;
    }

    if (wallet.balance < amount) {
      res.status(400).json({
        message: 'Insufficient wallet balance',
        data: {
          required: amount,
          available: wallet.balance,
          shortfall: amount - wallet.balance
        }
      });
      return;
    }

    // Generate reference
    const reference = `WALLET-${order.id}-${Date.now()}`;

    // Create transaction and update wallet in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          transactionType: TransactionType.WALLET_PAYMENT,
          amount,
          paymentMethod: PaymentMethodType.MPESA, // or we could use a WALLET type
          userId,
          orderId: order.id,
          walletId: wallet.id,
          status: TransactionStatus.COMPLETED,
          reference,
          description: `Wallet payment for Order #${order.orderNumber}`,
        },
      });

      // Update wallet balance
      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance - amount },
      });

      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatusEnum.PROCESSING,
          statusHistory: {
            create: { status: OrderStatusEnum.PROCESSING },
          },
        },
      });

      return { transaction, wallet: updatedWallet, order: updatedOrder };
    });

    res.status(200).json({
      message: 'Payment successful using wallet balance',
      data: {
        transaction: result.transaction,
        remainingBalance: result.wallet.balance,
        order: {
          id: result.order.id,
          status: result.order.status,
        },
      },
    });
  } catch (error) {
    console.error('Wallet Payment Error:', error);
    res.status(500).json({ message: 'Failed to process wallet payment' });
  }
};

// Get wallet balance
export const getWalletBalance = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    // Find wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await prisma.wallet.create({
        data: { userId, balance: 0 },
        include: { transactions: true },
      });
    }

    res.status(200).json({
      wallet: {
        balance: wallet.balance,
        lastTransactions: wallet.transactions,
      },
    });
  } catch (error) {
    console.error('Get Wallet Error:', error);
    res.status(500).json({ message: 'Failed to retrieve wallet information' });
  }
};

// Request refund
export const requestRefund = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { orderId, reason } = req.body;

  if (!orderId || !reason) {
    res.status(400).json({ message: 'Order ID and reason are required' });
    return;
  }

  try {
    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { orderItems: true },
    });

    if (!order || order.userId !== userId) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Check if order is eligible for refund
    if (order.status === OrderStatusEnum.CANCELLED) {
      res.status(400).json({ message: 'This order is already cancelled' });
      return;
    }

    if (order.status === OrderStatusEnum.DELIVERED) {
      // Calculate the number of days since delivery
      const deliveryStatusUpdate = await prisma.orderStatus.findFirst({
        where: {
          orderId: order.id,
          status: OrderStatusEnum.DELIVERED,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      if (!deliveryStatusUpdate) {
        res.status(400).json({ message: 'Delivery date information not found' });
        return;
      }

      const daysSinceDelivery = Math.floor(
        (new Date().getTime() - deliveryStatusUpdate.updatedAt.getTime()) / (1000 * 3600 * 24)
      );

      // Only allow refunds within 14 days of delivery
      const REFUND_WINDOW_DAYS = 14;
      if (daysSinceDelivery > REFUND_WINDOW_DAYS) {
        res.status(400).json({
          message: `Refund not available. The ${REFUND_WINDOW_DAYS}-day refund window has expired.`,
          data: {
            deliveredOn: deliveryStatusUpdate.updatedAt,
            daysSinceDelivery,
            maxAllowedDays: REFUND_WINDOW_DAYS
          }
        });
        return;
      }

      if (!req.body.evidenceDescription) {
        res.status(400).json({
          message: 'For delivered orders, please provide a description of the issue',
          requiredFields: ['evidenceDescription']
        });
        return;
      }
    }

    // Check if a refund request already exists
    const existingRequest = await prisma.refundRequest.findFirst({
      where: {
        orderId: order.id,
        status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
      },
    });

    if (existingRequest) {
      res.status(400).json({
        message: 'A refund request already exists for this order',
        data: { requestId: existingRequest.id, status: existingRequest.status }
      });
      return;
    }

    // Calculate refund amount
    const amount = order.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create refund request
    const refundRequest = await prisma.refundRequest.create({
      data: {
        orderId: order.id,
        userId,
        amount,
        reason,
        status: RefundStatus.PENDING,
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        statusHistory: {
          create: { status: 'REFUND_REQUESTED' },
        },
      },
    });

    res.status(201).json({
      message: 'Refund request submitted successfully',
      data: { refundRequest },
    });
  } catch (error) {
    console.error('Refund Request Error:', error);
    res.status(500).json({ message: 'Failed to submit refund request' });
  }
};

// Check transaction status
// export const checkTransactionStatus = async (req: RequestWithUser, res: Response): Promise<void> => {
//   const userId = req.user?.id;
//   if (!userId) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return;
//   }

//   const { transactionId } = req.params;

//   if (!transactionId) {
//     res.status(400).json({ message: 'Transaction ID is required' });
//     return;
//   }

//   try {
//     const transaction = await prisma.transaction.findUnique({
//       where: { id: Number(transactionId) },
//     });

//     if (!transaction || transaction.userId !== userId) {
//       res.status(404).json({ message: 'Transaction not found' });
//       return;
//     }

//     // If transaction is still pending and it's an M-Pesa transaction, check with M-Pesa
//     if (
//       transaction.status === TransactionStatus.PENDING &&
//       transaction.paymentMethod === PaymentMethodType.MPESA &&
//       transaction.metaData
//     ) {
//       const metaData = transaction.metaData as any;

//       if (metaData.checkoutRequestID) {
//         // Query STK push status
//         const token = await getMpesaToken();
//         const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
//         const password = Buffer.from(MPESA_SHORTCODE + MPESA_PASSKEY + timestamp).toString('base64');

//         try {
//           const response = await axios.post(
//             'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
//             {
//               BusinessShortCode: MPESA_SHORTCODE,
//               Password: password,
//               Timestamp: timestamp,
//               CheckoutRequestID: metaData.checkoutRequestID,
//             },
//             {
//               headers: {
//                 Authorization: `Bearer ${token}`,
//                 'Content-Type': 'application/json',
//               },
//             }
//           );

//           // Process response
//           const result = response.data;

//           if (result.ResultCode === '0') {
//             // Transaction successful
//             await prisma.transaction.update({
//               where: { id: transaction.id },
//               data: {
//                 status: TransactionStatus.COMPLETED,
//                 metaData: { ...metaData, stkQueryResponse: result }
//               },
//             });

//             // If this was a wallet top-up, update wallet balance
//             if (transaction.transactionType === TransactionType.WALLET_TOPUP && transaction.walletId) {
//               await prisma.wallet.update({
//                 where: { id: transaction.walletId },
//                 data: { balance: { increment: transaction.amount } },
//               });
//             }

//             // If this was an order payment, update order status
//             if (transaction.transactionType === TransactionType.PAYMENT && transaction.orderId) {
//               await prisma.order.update({
//                 where: { id: transaction.orderId },
//                 data: {
//                   status: OrderStatusEnum.PROCESSING,
//                   statusHistory: {
//                     create: { status: OrderStatusEnum.PROCESSING },
//                   },
//                 },
//               });
//             }

//             res.status(200).json({
//               message: 'Payment completed successfully',
//               data: {
//                 transactionId: transaction.id,
//                 status: TransactionStatus.COMPLETED,
//                 mpesaResult: result
//               },
//             });

//             return;

//           } else {
//             // Transaction failed or pending
//             const newStatus = result.ResultCode === '1032' ? TransactionStatus.PENDING : TransactionStatus.FAILED;

//             await prisma.transaction.update({
//               where: { id: transaction.id },
//               data: {
//                 status: newStatus,
//                 metaData: { ...metaData, stkQueryResponse: result }
//               },
//             });

//             res.status(200).json({
//               message: result.ResultDesc || 'Transaction status checked',
//               data: {
//                 transactionId: transaction.id,
//                 status: newStatus,
//                 mpesaResult: result
//               },
//             });

//             return;
//           }
//         } catch (error) {
//           console.error('STK Query Error:', error);
//           // Keep original transaction status if query fails
//           res.status(200).json({
//             message: 'Unable to get latest transaction status from M-Pesa',
//             data: { transactionId: transaction.id, status: transaction.status },
//           });
//           return;
//         }
//       }
//     }

//     // Return current transaction status from database
//     res.status(200).json({
//       message: 'Transaction status retrieved',
//       data: { transaction },
//     });
//   } catch (error) {
//     console.error('Check Transaction Error:', error);
//     res.status(500).json({ message: 'Failed to check transaction status' });
//   }
// };

// Check transaction status with duplicate payment handling
export const checkTransactionStatus = async (req: RequestWithUser, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { transactionId } = req.params;

  if (!transactionId) {
    res.status(400).json({ message: 'Transaction ID is required' });
    return;
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: Number(transactionId) },
    });

    if (!transaction || transaction.userId !== userId) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    // If transaction is still pending and it's an M-Pesa transaction, check with M-Pesa
    if (
      transaction.status === TransactionStatus.PENDING &&
      transaction.paymentMethod === PaymentMethodType.MPESA &&
      transaction.metaData
    ) {
      const metaData = transaction.metaData as any;

      if (metaData.checkoutRequestID) {
        // Query STK push status
        const token = await getMpesaToken();
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(MPESA_SHORTCODE + MPESA_PASSKEY + timestamp).toString('base64');

        try {
          const response = await axios.post(
            'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
            {
              BusinessShortCode: MPESA_SHORTCODE,
              Password: password,
              Timestamp: timestamp,
              CheckoutRequestID: metaData.checkoutRequestID,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          // Process response
          const result = response.data;

          if (result.ResultCode === '0') {
            // Transaction successful
            
            // For order payments, check if the order has already been paid
            if (transaction.transactionType === TransactionType.PAYMENT && transaction.orderId) {
              // Check if this order already has a completed payment
              const existingPayment = await prisma.transaction.findFirst({
                where: {
                  orderId: transaction.orderId,
                  transactionType: TransactionType.PAYMENT,
                  status: TransactionStatus.COMPLETED,
                  id: { not: transaction.id } // Exclude the current transaction
                },
              });

              if (existingPayment) {
                // This is a duplicate payment, redirect to wallet instead
                console.log(`Duplicate payment detected for order ID ${transaction.orderId}. Redirecting to wallet.`);
                
                // Find or create user wallet
                let wallet = await prisma.wallet.findUnique({ 
                  where: { userId: transaction.userId } 
                });

                if (!wallet) {
                  wallet = await prisma.wallet.create({
                    data: { userId: transaction.userId, balance: 0 },
                  });
                }

                // Update the transaction type to wallet top-up instead of order payment
                await prisma.transaction.update({
                  where: { id: transaction.id },
                  data: {
                    transactionType: TransactionType.WALLET_TOPUP,
                    status: TransactionStatus.COMPLETED,
                    walletId: wallet.id,
                    description: `Duplicate payment for Order #${transaction.orderId} - Added to wallet`,
                    metaData: {
                      ...metaData,
                      stkQueryResponse: result,
                      duplicatePayment: true,
                      originalOrderId: transaction.orderId
                    },
                  },
                });

                // Update wallet balance
                await prisma.wallet.update({
                  where: { id: wallet.id },
                  data: { balance: { increment: transaction.amount } },
                });

                res.status(200).json({
                  message: 'Duplicate payment detected and added to your wallet',
                  data: {
                    transactionId: transaction.id,
                    status: TransactionStatus.COMPLETED,
                    transactionType: TransactionType.WALLET_TOPUP,
                    amount: transaction.amount,
                    walletId: wallet.id,
                    mpesaResult: result,
                    isDuplicatePayment: true
                  },
                });
                return;
              }
            }

            // Normal flow (not a duplicate)
            await prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                status: TransactionStatus.COMPLETED,
                metaData: { ...metaData, stkQueryResponse: result }
              },
            });

            // If this was a wallet top-up, update wallet balance
            if (transaction.transactionType === TransactionType.WALLET_TOPUP && transaction.walletId) {
              await prisma.wallet.update({
                where: { id: transaction.walletId },
                data: { balance: { increment: transaction.amount } },
              });
            }

            // If this was an order payment, update order status
            if (transaction.transactionType === TransactionType.PAYMENT && transaction.orderId) {
              await prisma.order.update({
                where: { id: transaction.orderId },
                data: {
                  status: OrderStatusEnum.PROCESSING,
                  statusHistory: {
                    create: { status: OrderStatusEnum.PROCESSING },
                  },
                },
              });
            }

            res.status(200).json({
              message: 'Payment completed successfully',
              data: {
                transactionId: transaction.id,
                status: TransactionStatus.COMPLETED,
                mpesaResult: result
              },
            });

            return;

          } else {
            // Transaction failed or pending
            const newStatus = result.ResultCode === '1032' ? TransactionStatus.PENDING : TransactionStatus.FAILED;

            await prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                status: newStatus,
                metaData: { ...metaData, stkQueryResponse: result }
              },
            });

            res.status(200).json({
              message: result.ResultDesc || 'Transaction status checked',
              data: {
                transactionId: transaction.id,
                status: newStatus,
                mpesaResult: result
              },
            });

            return;
          }
        } catch (error) {
          console.error('STK Query Error:', error);
          // Keep original transaction status if query fails
          res.status(200).json({
            message: 'Unable to get latest transaction status from M-Pesa',
            data: { transactionId: transaction.id, status: transaction.status },
          });
          return;
        }
      }
    }

    // Return current transaction status from database
    res.status(200).json({
      message: 'Transaction status retrieved',
      data: { transaction },
    });
  } catch (error) {
    console.error('Check Transaction Error:', error);
    res.status(500).json({ message: 'Failed to check transaction status' });
  }
};

// Callback Handlers

// STK push callback
// export const handleSTKCallback = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { Body } = req.body;
//     console.log('STK Callback received:', JSON.stringify(req.body));

//     // Store callback data
//     await prisma.mpesaCallback.create({
//       data: {
//         transactionType: 'STK',
//         merchantRequestId: Body.stkCallback.MerchantRequestID,
//         checkoutRequestId: Body.stkCallback.CheckoutRequestID,
//         resultCode: Body.stkCallback.ResultCode,
//         resultDesc: Body.stkCallback.ResultDesc,
//         callbackMetadata: Body.stkCallback.CallbackMetadata || {},
//       },
//     });

//     // If successful payment
//     if (Body.stkCallback.ResultCode === 0) {
//       // Extract metadata
//       const callbackMetadata = Body.stkCallback.CallbackMetadata.Item;
//       const mpesaReceiptId = callbackMetadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
//       const phoneNumber = callbackMetadata.find((item: any) => item.Name === 'PhoneNumber')?.Value;
//       const amount = callbackMetadata.find((item: any) => item.Name === 'Amount')?.Value;

//       // Find related transaction
//       const transaction = await prisma.transaction.findFirst({
//         where: {
//           metaData: {
//             path: ['checkoutRequestID'],
//             equals: Body.stkCallback.CheckoutRequestID,
//           },
//         },
//       });

//       if (transaction) {
//         // Update transaction
//         await prisma.transaction.update({
//           where: { id: transaction.id },
//           data: {
//             status: TransactionStatus.COMPLETED,
//             mpesaReceiptId,
//             metaData: {
//               ...transaction.metaData as any,
//               callbackReceived: true,
//               callbackData: Body.stkCallback,
//             },
//           },
//         });

//         // Handle wallet top-up
//         if (transaction.transactionType === TransactionType.WALLET_TOPUP && transaction.walletId) {
//           await prisma.wallet.update({
//             where: { id: transaction.walletId },
//             data: { balance: { increment: transaction.amount } },
//           });
//         }

//         // Handle order payment
//         if (transaction.transactionType === TransactionType.PAYMENT && transaction.orderId) {
//           await prisma.order.update({
//             where: { id: transaction.orderId },
//             data: {
//               status: OrderStatusEnum.PROCESSING,
//               statusHistory: {
//                 create: { status: OrderStatusEnum.PROCESSING },
//               },
//             },
//           });
//         }
//       }
//     }

//     // Respond to M-Pesa
//     res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback received successfully' });
//   } catch (error) {
//     console.error('STK Callback Error:', error);
//     res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback processed' });
//   }
// };

// STK push callback with duplicate payment handling
export const handleSTKCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Body } = req.body;
    console.log('STK Callback received:', JSON.stringify(req.body));

    // Store callback data
    await prisma.mpesaCallback.create({
      data: {
        transactionType: 'STK',
        merchantRequestId: Body.stkCallback.MerchantRequestID,
        checkoutRequestId: Body.stkCallback.CheckoutRequestID,
        resultCode: Body.stkCallback.ResultCode,
        resultDesc: Body.stkCallback.ResultDesc,
        callbackMetadata: Body.stkCallback.CallbackMetadata || {},
      },
    });

    // If successful payment
    if (Body.stkCallback.ResultCode === 0) {
      // Extract metadata
      const callbackMetadata = Body.stkCallback.CallbackMetadata.Item;
      const mpesaReceiptId = callbackMetadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
      const phoneNumber = callbackMetadata.find((item: any) => item.Name === 'PhoneNumber')?.Value;
      const amount = callbackMetadata.find((item: any) => item.Name === 'Amount')?.Value;

      // Find related transaction
      const transaction = await prisma.transaction.findFirst({
        where: {
          metaData: {
            path: ['checkoutRequestID'],
            equals: Body.stkCallback.CheckoutRequestID,
          },
        },
      });

      if (transaction) {
        // For order payments, check if the order has already been paid
        if (transaction.transactionType === TransactionType.PAYMENT && transaction.orderId) {
          // Check if this order already has a completed payment
          const existingPayment = await prisma.transaction.findFirst({
            where: {
              orderId: transaction.orderId,
              transactionType: TransactionType.PAYMENT,
              status: TransactionStatus.COMPLETED,
              id: { not: transaction.id } // Exclude the current transaction
            },
          });

          if (existingPayment) {
            // This is a duplicate payment, redirect to wallet instead
            console.log(`Duplicate payment detected for order ID ${transaction.orderId}. Redirecting to wallet.`);
            
            // Find or create user wallet
            let wallet = await prisma.wallet.findUnique({ 
              where: { userId: transaction.userId } 
            });

            if (!wallet) {
              wallet = await prisma.wallet.create({
                data: { userId: transaction.userId, balance: 0 },
              });
            }

            // Update the transaction type to wallet top-up instead of order payment
            await prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                transactionType: TransactionType.WALLET_TOPUP,
                status: TransactionStatus.COMPLETED,
                walletId: wallet.id,
                mpesaReceiptId,
                description: `Duplicate payment for Order #${transaction.orderId} - Added to wallet`,
                metaData: {
                  ...transaction.metaData as any,
                  callbackReceived: true,
                  callbackData: Body.stkCallback,
                  duplicatePayment: true,
                  originalOrderId: transaction.orderId
                },
              },
            });

            // Update wallet balance
            await prisma.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: transaction.amount } },
            });

            // Send notification to user about duplicate payment (you can add this later)
            // await notifyUserAboutDuplicatePayment(transaction.userId, transaction.orderId, transaction.amount);

            // Respond to M-Pesa
            res.status(200).json({ ResultCode: 0, ResultDesc: 'Duplicate payment processed successfully' });
            return;
          }
        }

        // Normal payment processing flow (not a duplicate)
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.COMPLETED,
            mpesaReceiptId,
            metaData: {
              ...transaction.metaData as any,
              callbackReceived: true,
              callbackData: Body.stkCallback,
            },
          },
        });

        // Handle wallet top-up
        if (transaction.transactionType === TransactionType.WALLET_TOPUP && transaction.walletId) {
          await prisma.wallet.update({
            where: { id: transaction.walletId },
            data: { balance: { increment: transaction.amount } },
          });
        }

        // Handle order payment
        if (transaction.transactionType === TransactionType.PAYMENT && transaction.orderId) {
          await prisma.order.update({
            where: { id: transaction.orderId },
            data: {
              status: OrderStatusEnum.PROCESSING,
              statusHistory: {
                create: { status: OrderStatusEnum.PROCESSING },
              },
            },
          });
        }
      }
    }

    // Respond to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback received successfully' });
  } catch (error) {
    console.error('STK Callback Error:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback processed' });
  }
};


export const c2bValidation = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('C2B Validation received:', JSON.stringify(req.body));

    // Always respond with success (you can implement validation logic as needed)
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    });
  } catch (error) {
    console.error('C2B Validation Error:', error);
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted', // Always return success to M-Pesa
    });
  }
};

// C2B Confirmation
export const c2bConfirmation = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    console.log('C2B Confirmation received:', JSON.stringify(data));

    // Store callback data
    await prisma.mpesaCallback.create({
      data: {
        transactionType: 'C2B',
        resultCode: 0,
        resultDesc: 'Success',
        phoneNumber: data.MSISDN,
        transactionId: data.TransID,
        callbackMetadata: data,
      },
    });

    // Find user by phone number (stripped to last 9 digits for comparison)
    const phoneToMatch = data.MSISDN.toString().slice(-9);
    const users = await prisma.user.findMany({
      where: {},
      select: { id: true, phoneNumber: true },
    });

    // Find matching user by comparing last 9 digits of phone number
    const matchedUser = users.find(user => {
      const userPhone = user.phoneNumber.replace(/\D/g, '');
      return userPhone.slice(-9) === phoneToMatch;
    });

    if (matchedUser) {
      const userId = matchedUser.id;
      const amount = parseFloat(data.TransAmount);
      const reference = data.BillRefNumber || `TOPUP-${userId}`;

      // Check if reference is an order number
      if (reference.startsWith('ORDER-')) {
        const orderNumber = reference.split('-')[1];
        const order = await prisma.order.findUnique({
          where: { orderNumber },
        });

        if (order) {
          // Create transaction for order payment
          await prisma.transaction.create({
            data: {
              transactionType: TransactionType.PAYMENT,
              amount,
              paymentMethod: PaymentMethodType.MPESA,
              userId,
              orderId: order.id,
              status: TransactionStatus.COMPLETED,
              reference: data.TransID,
              mpesaReceiptId: data.TransID,
              description: `M-Pesa payment for Order #${orderNumber}`,
            },
          });

          // Update order status
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatusEnum.PROCESSING,
              statusHistory: {
                create: { status: OrderStatusEnum.PROCESSING },
              },
            },
          });
        }
      } else {
        // Assume it's a wallet top-up
        // Find or create wallet
        let wallet = await prisma.wallet.findUnique({ where: { userId } });

        if (!wallet) {
          wallet = await prisma.wallet.create({
            data: { userId, balance: 0 },
          });
        }

        // Create transaction
        await prisma.transaction.create({
          data: {
            transactionType: TransactionType.WALLET_TOPUP,
            amount,
            paymentMethod: PaymentMethodType.MPESA,
            userId,
            walletId: wallet.id,
            status: TransactionStatus.COMPLETED,
            reference: data.TransID,
            mpesaReceiptId: data.TransID,
            description: `M-Pesa wallet top-up`,
          },
        });

        // Update wallet balance
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amount } },
        });
      }
    }

    // Always respond with success
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Confirmation received successfully' });
  } catch (error) {
    console.error('C2B Confirmation Error:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Confirmation processed' });
  }
};

// Admin Functions

// Process refund request
export const processRefundRequest = async (req: RequestWithUser, res: Response): Promise<void> => {
  const adminId = req.user?.id;
  if (!adminId || req.user?.role !== Role.ADMIN) {
    res.status(401).json({ message: 'Unauthorized. Admin access required.' });
    return;
  }

  const { refundRequestId, action, remarks } = req.body;

  if (!refundRequestId || !action || !['approve', 'reject'].includes(action)) {
    res.status(400).json({ message: 'Refund request ID and valid action are required' });
    return;
  }

  try {
    // Get refund request details
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: Number(refundRequestId) },
      include: { order: true },
    });

    if (!refundRequest) {
      res.status(404).json({ message: 'Refund request not found' });
      return;
    }

    if (refundRequest.status !== RefundStatus.PENDING) {
      res.status(400).json({ message: `Refund request has already been ${refundRequest.status.toLowerCase()}` });
      return;
    }

    if (action === 'reject') {
      // Reject the refund request
      const updatedRequest = await prisma.refundRequest.update({
        where: { id: refundRequest.id },
        data: {
          status: RefundStatus.REJECTED,
          processedBy: adminId,
          processedAt: new Date(),
        },
      });

      // Update order status history
      await prisma.order.update({
        where: { id: refundRequest.orderId },
        data: {
          statusHistory: {
            create: { status: 'REFUND_REJECTED' },
          },
        },
      });

      res.status(200).json({
        message: 'Refund request rejected',
        data: { refundRequest: updatedRequest },
      });
    }

    // Approve the refund
    const order = refundRequest.order;

    // Find the original payment transaction
    const paymentTransaction = await prisma.transaction.findFirst({
      where: {
        orderId: order.id,
        transactionType: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
      },
    });

    if (!paymentTransaction) {
      res.status(400).json({ message: 'No completed payment found for this order' });
      return;
    }

    // Update refund request status
    const updatedRequest = await prisma.refundRequest.update({
      where: { id: refundRequest.id },
      data: {
        status: RefundStatus.APPROVED,
        processedBy: adminId,
        processedAt: new Date(),
      },
    });

    // Create refund transaction record
    const refundTransaction = await prisma.transaction.create({
      data: {
        transactionType: TransactionType.REFUND,
        amount: refundRequest.amount,
        paymentMethod: paymentTransaction.paymentMethod,
        userId: refundRequest.userId,
        orderId: order.id,
        status: TransactionStatus.PENDING, // Start as pending
        reference: `REFUND-${order.orderNumber}`,
        description: `Refund for Order #${order.orderNumber}`,
      },
    });

    // If original payment was from wallet, refund to wallet
    if (paymentTransaction.transactionType === TransactionType.WALLET_PAYMENT) {
      // Find user's wallet
      const wallet = await prisma.wallet.findUnique({
        where: { userId: refundRequest.userId },
      });

      if (wallet) {
        // Update wallet balance
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: refundRequest.amount } },
        });

        // Update refund transaction
        await prisma.transaction.update({
          where: { id: refundTransaction.id },
          data: {
            walletId: wallet.id,
            status: TransactionStatus.COMPLETED,
          },
        });

        // Update refund request status
        await prisma.refundRequest.update({
          where: { id: refundRequest.id },
          data: { status: RefundStatus.PROCESSED },
        });

        // Update order status
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatusEnum.CANCELLED,
            statusHistory: {
              create: { status: OrderStatusEnum.CANCELLED },
            },
          },
        });

        res.status(200).json({
          message: 'Refund processed successfully to user wallet',
          data: {
            refundRequest: updatedRequest,
            transaction: refundTransaction
          },
        });
      }
    }

    // For M-Pesa refunds, initiate M-Pesa B2C transaction
    if (paymentTransaction.paymentMethod === PaymentMethodType.MPESA && paymentTransaction.mpesaReceiptId) {
      try {
        // Get user's phone number
        const user = await prisma.user.findUnique({
          where: { id: refundRequest.userId },
          select: { phoneNumber: true },
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Get M-Pesa token
        const token = await getMpesaToken();

        // Format phone number
        const formattedPhone = formatPhoneNumber(user.phoneNumber);

        const timestamp = getTimestamp();
        const password = generatePassword(timestamp);


        // Generate security credential from certificate
        const securityCredential = generateSecurityCredential(
          password,
          MPESA_CERT_PATH
        );

        // Initiate B2C transaction
        const response = await axios.post(
          MPESA_B2C_URL,
          {
            InitiatorName: MPESA_INITIATOR_NAME,
            SecurityCredential: securityCredential,
            CommandID: 'BusinessPayment',
            Amount: refundRequest.amount,
            PartyA: MPESA_SHORTCODE,
            PartyB: formattedPhone,
            Remarks: `Refund for Order #${order.orderNumber}`,
            QueueTimeOutURL: `${process.env.API_BASE_URL}/api/mpesa/b2c/timeout`,
            ResultURL: `${process.env.API_BASE_URL}/api/mpesa/b2c/result`,
            Occasion: `OrderRefund-${refundRequest.id}`,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        // Update refund transaction with B2C request details
        await prisma.transaction.update({
          where: { id: refundTransaction.id },
          data: {
            metaData: {
              b2cRequestId: response.data.ConversationID,
              b2cOriginalTransactionId: paymentTransaction.mpesaReceiptId,
            },
          },
        });

        // Update order status
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatusEnum.CANCELLED,
            statusHistory: {
              create: { status: OrderStatusEnum.CANCELLED },
            },
          },
        });

        res.status(200).json({
          message: 'Refund initiated via M-Pesa B2C. User will receive funds shortly.',
          data: {
            refundRequest: updatedRequest,
            conversationId: response.data.ConversationID,
          },
        });
      } catch (error) {
        console.error('Mpesa B2C Refund Error:', error);

        // Mark refund as pending since M-Pesa request failed
        await prisma.refundRequest.update({
          where: { id: refundRequest.id },
          data: { status: RefundStatus.APPROVED }, // Keep as approved, not processed
        });

        res.status(500).json({
          message: 'Failed to process M-Pesa refund. Please try again later.',
          error: 'M-Pesa B2C request failed',
        });
      }
    }

    // Default response if payment method is not handled
    res.status(200).json({
      message: 'Refund request approved. Manual processing required.',
      data: { refundRequest: updatedRequest },
    });
  } catch (error) {
    console.error('Process Refund Error:', error);
    res.status(500).json({ message: 'Failed to process refund request' });
  }
};

// B2C result callback
export const b2cResultCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    console.log('B2C Result Callback received:', JSON.stringify(data));

    // Store callback in database
    await prisma.mpesaCallback.create({
      data: {
        transactionType: 'B2C',
        resultCode: data.Result.ResultCode,
        resultDesc: data.Result.ResultDesc,
        transactionId: data.Result.TransactionID,
        callbackMetadata: data,
      },
    });

    // If successful
    if (data.Result.ResultCode === 0) {
      // Find related transaction
      const transaction = await prisma.transaction.findFirst({
        where: {
          metaData: {
            path: ['b2cRequestId'],
            equals: data.Result.ConversationID,
          },
        },
      });

      if (transaction) {
        // Update transaction status
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.COMPLETED,
            mpesaReceiptId: data.Result.TransactionID,
            metaData: {
              ...transaction.metaData as any,
              b2cResult: data.Result,
            },
          },
        });

        // Find and update related refund request
        if (transaction.transactionType === TransactionType.REFUND && transaction.orderId) {
          const refundRequest = await prisma.refundRequest.findFirst({
            where: { orderId: transaction.orderId },
          });

          if (refundRequest) {
            await prisma.refundRequest.update({
              where: { id: refundRequest.id },
              data: { status: RefundStatus.PROCESSED },
            });
          }
        }
      }
    }

    // Respond to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Result received successfully' });
  } catch (error) {
    console.error('B2C Result Callback Error:', error);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Result processed' });
  }
};

// Get all refund requests (admin)
export const getRefundRequests = async (req: RequestWithUser, res: Response): Promise<void> => {
  const adminId = req.user?.id;
  if (!adminId || req.user?.role !== Role.ADMIN) {
    res.status(401).json({ message: 'Unauthorized. Admin access required.' });
    return;
  }

  const { status, page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const refundRequests = await prisma.refundRequest.findMany({
      where: whereClause,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, phoneNumber: true },
        },
        order: {
          select: { id: true, orderNumber: true, orderDate: true, status: true },
        },
      },
    });

    const totalRequests = await prisma.refundRequest.count({ where: whereClause });

    res.status(200).json({
      refundRequests,
      pagination: {
        total: totalRequests,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalRequests / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get Refund Requests Error:', error);
    res.status(500).json({ message: 'Failed to retrieve refund requests' });
  }
};

// Check merchant balance (admin)
export const checkMerchantBalance = async (req: RequestWithUser, res: Response): Promise<void> => {
  const adminId = req.user?.id;
  if (!adminId || req.user?.role !== Role.ADMIN) {
    res.status(401).json({ message: 'Unauthorized. Admin access required.' });
    return;
  }

  try {
    // Get M-Pesa token
    const token = await getMpesaToken();

    // Generate timestamp
    const timestamp = getTimestamp();
    const password = generatePassword(timestamp);

    // Generate security credential from certificate
    const securityCredential = generateSecurityCredential(
      password,
      MPESA_CERT_PATH
    );

    // Make account balance request
    const response = await axios.post(
      MPESA_ACCOUNT_BALANCE_URL,
      {
        Initiator: MPESA_INITIATOR_NAME,
        SecurityCredential: securityCredential,
        CommandID: 'AccountBalance',
        PartyA: MPESA_SHORTCODE,
        IdentifierType: '4', // Shortcode
        Remarks: 'Account balance query',
        QueueTimeOutURL: `${process.env.API_BASE_URL}/api/mpesa/accountbalance/timeout`,
        ResultURL: `${process.env.API_BASE_URL}/api/mpesa/accountbalance/result`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({
      message: 'Account balance query initiated',
      data: {
        conversationId: response.data.ConversationID,
        originatorConversationId: response.data.OriginatorConversationID,
        responseDescription: response.data.ResponseDescription,
      },
    });
  } catch (error) {
    console.error('Merchant Balance Check Error:', error);
    res.status(500).json({ message: 'Failed to check merchant balance' });
  }
};

// Get transaction statistics (admin)
export const getTransactionStats = async (req: RequestWithUser, res: Response): Promise<void> => {
  const adminId = req.user?.id;
  if (!adminId || req.user?.role !== Role.ADMIN) {
    res.status(401).json({ message: 'Unauthorized. Admin access required.' });
    return;
  }

  const { startDate, endDate } = req.query;

  let dateFilter: any = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate as string);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate as string);
  }

  const whereClause: any = {};
  if (Object.keys(dateFilter).length > 0) {
    whereClause.createdAt = dateFilter;
  }

  try {
    // Get summary of all transactions
    const transactionSummary = await prisma.$transaction([
      // Total payments received
      prisma.transaction.aggregate({
        where: {
          ...whereClause,
          transactionType: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Total refunds processed
      prisma.transaction.aggregate({
        where: {
          ...whereClause,
          transactionType: TransactionType.REFUND,
          status: TransactionStatus.COMPLETED,
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Total wallet top-ups
      prisma.transaction.aggregate({
        where: {
          ...whereClause,
          transactionType: TransactionType.WALLET_TOPUP,
          status: TransactionStatus.COMPLETED,
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Total wallet payments
      prisma.transaction.aggregate({
        where: {
          ...whereClause,
          transactionType: TransactionType.WALLET_PAYMENT,
          status: TransactionStatus.COMPLETED,
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Transactions by payment method
      prisma.transaction.groupBy({
        by: ['paymentMethod'],
        where: {
          ...whereClause,
          status: TransactionStatus.COMPLETED,
        },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { paymentMethod: 'asc' },
      }),

      // Daily transaction summary (for chart)
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          transaction_type as type,
          SUM(amount) as total_amount,
          COUNT(*) as count
        FROM "Transaction"
        WHERE status = 'COMPLETED'
        ${Object.keys(dateFilter).length > 0 ?
          `AND created_at >= '${new Date(startDate as string).toISOString()}' 
           AND created_at <= '${new Date(endDate as string).toISOString()}'` : ''}
        GROUP BY DATE(created_at), transaction_type
        ORDER BY DATE(created_at)
      `,
    ]);

    const [payments, refunds, topUps, walletPayments, paymentMethods, dailyStats] = transactionSummary;

    // Calculate net revenue
    const netRevenue = (payments._sum.amount || 0) - (refunds._sum.amount || 0);

    res.status(200).json({
      summary: {
        totalPayments: {
          count: payments._count,
          amount: payments._sum.amount || 0,
        },
        totalRefunds: {
          count: refunds._count,
          amount: refunds._sum.amount || 0,
        },
        totalTopUps: {
          count: topUps._count,
          amount: topUps._sum.amount || 0,
        },
        totalWalletPayments: {
          count: walletPayments._count,
          amount: walletPayments._sum.amount || 0,
        },
        netRevenue,
      },
      paymentMethods,
      dailyStats,
    });
  } catch (error) {
    console.error('Transaction Stats Error:', error);
    res.status(500).json({ message: 'Failed to retrieve transaction statistics' });
  }
};

// Admin: Get all transactions
export const getTransactions = async (req: RequestWithUser, res: Response): Promise<void> => {
  const adminId = req.user?.id;

  // Ensure that the user is an admin
  if (!adminId || req.user?.role !== Role.ADMIN) {
    res.status(401).json({ message: 'Unauthorized. Admin access required.' });
    return;
  }

  const { status, page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
    // Construct where clause based on filters (status and pagination)
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    // Fetch the transactions with user, order, and payment method details
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            email: true, 
            phoneNumber: true,
            paymentMethods: { // Nested paymentMethods under the user
              select: {
                type: true, // Include the type of payment method (e.g., MPESA, Credit Card)
                details: true, // Include the payment method details
              },
            },
          },
        },
        order: {
          select: { id: true, orderNumber: true, orderDate: true, status: true },
        },
        wallet: {
          select: { id: true, balance: true },
        },
      },
    });

    // Count the total transactions matching the filter
    const totalTransactions = await prisma.transaction.count({ where: whereClause });

    res.status(200).json({
      transactions,
      pagination: {
        total: totalTransactions,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalTransactions / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({ message: 'Failed to retrieve transactions' });
  }
};


