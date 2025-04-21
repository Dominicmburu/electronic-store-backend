import * as mpesaController from '../controllers/mpesaController';
import { processRefundSchema } from '../validations/mpesaValidation';
import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import { authorizeAdmin } from '../middlewares/adminMiddleware';
import validate from '../middlewares/validationMiddleware';
import { refundRequestSchema, stkPushSchema, walletPaymentSchema, walletTopUpSchema } from '../validations/mpesaValidation';


const router = express.Router();

// Callback Routes (no authentication required)
router.post('/callback/stk', mpesaController.handleSTKCallback);
router.post('/callback/wallet', mpesaController.handleSTKCallback);
router.post('/c2b/validation', mpesaController.c2bValidation);
router.post('/c2b/confirmation', mpesaController.c2bConfirmation);
router.post('/b2c/result', mpesaController.b2cResultCallback);


router.use(authenticateToken);

// Admin Routes
router.post('/initialize', authorizeAdmin, mpesaController.initializeMpesaC2B);
router.post('/refund/process', authorizeAdmin, validate(processRefundSchema), mpesaController.processRefundRequest);
router.get('/refund/requests', authorizeAdmin, mpesaController.getRefundRequests);
router.get('/merchant/balance', authorizeAdmin, mpesaController.checkMerchantBalance);
router.get('/stats', authorizeAdmin, mpesaController.getTransactionStats);
router.get('/transactions', authorizeAdmin, mpesaController.getTransactions);


//user
router.post('/stk-push', validate(stkPushSchema), mpesaController.initiateSTKPush);
router.post('/wallet/topup', validate(walletTopUpSchema), mpesaController.topUpWallet);
router.post('/wallet/pay', validate(walletPaymentSchema), mpesaController.payWithWallet);
router.get('/wallet/balance', mpesaController.getWalletBalance);
router.post('/refund/request', validate(refundRequestSchema), mpesaController.requestRefund);
router.get('/transaction/:transactionId', mpesaController.checkTransactionStatus);


export default router;

