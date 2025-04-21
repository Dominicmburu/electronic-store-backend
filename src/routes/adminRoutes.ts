import express from 'express';
import {
    adminCreateUser,
    getAllUsers,
    adminUpdateUser,
    adminDeactivateUser,
    getUserDetails,
    registerAdmin,
    adminLogin,
    adminUpdateAdmin,
    adminDeactivateAdmin,
    getAdminDetails,
    adminUpdateUserActiveStatus,
    adminUpdateAdminActiveStatus,
} from '../controllers/adminController';

import { authenticateToken } from '../middlewares/authMiddleware';
import { authorizeAdmin } from '../middlewares/adminMiddleware';
import validate from '../middlewares/validationMiddleware';
import { adminCreateUserSchema, updateUserSchema } from '../validations/adminValidation';
import { asyncHandler } from '../utils/asyncHandler';


const router = express.Router();

router.post('/login', adminLogin);

router.use(authenticateToken);
router.use(authorizeAdmin);

router.post('/register', validate(adminCreateUserSchema), asyncHandler(registerAdmin));

router.post('/users', validate(adminCreateUserSchema), asyncHandler(adminCreateUser));

router.get('/users', asyncHandler(getAllUsers));

router.put('/users/:id', validate(updateUserSchema), asyncHandler(adminUpdateUser));

router.delete('/users/:id', asyncHandler(adminDeactivateUser));

router.patch('/users/:id/active', asyncHandler(adminUpdateUserActiveStatus));

router.patch('/admins/:id/active', asyncHandler(adminUpdateAdminActiveStatus));

router.get('/users/:id', getUserDetails);

router.put('/:id', validate(updateUserSchema), asyncHandler(adminUpdateAdmin));

router.delete('/:id', asyncHandler(adminDeactivateAdmin));

router.get('/:id', asyncHandler(getAdminDetails));


export default router;
