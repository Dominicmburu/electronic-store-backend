import express from 'express';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryDetails,
  listCategories,
} from '../controllers/categoryController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { authorizeAdmin } from '../middlewares/adminMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Public Routes
router.get('/', listCategories); // List all categories with pagination
router.get('/:id', asyncHandler(getCategoryDetails)); // Get details of a specific category

// Admin-only Routes
router.use(authenticateToken);
router.use(authorizeAdmin);

router.post('/', asyncHandler(createCategory)); // Create a new category
router.put('/:id', asyncHandler(updateCategory)); // Update an existing category
router.delete('/:id', asyncHandler(deleteCategory)); // Delete a category

export default router;
