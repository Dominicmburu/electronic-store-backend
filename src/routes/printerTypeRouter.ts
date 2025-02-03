import express from 'express';
import {
  createPrinterType,
  updatePrinterType,
  deletePrinterType,
  getPrinterTypeDetails,
  listPrinterTypes,
} from '../controllers/printerTypeController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { authorizeAdmin } from '../middlewares/adminMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Public Routes
router.get('/', asyncHandler(listPrinterTypes)); // List all printer types
router.get('/:id', asyncHandler(getPrinterTypeDetails)); // Get specific printer type details

// Protected Admin Routes
router.use(authenticateToken);
router.use(authorizeAdmin);

router.post('/', asyncHandler(createPrinterType)); // Create a new printer type
router.put('/:id', asyncHandler(updatePrinterType)); // Update an existing printer type
router.delete('/:id', asyncHandler(deletePrinterType)); // Delete a printer type

export default router;
