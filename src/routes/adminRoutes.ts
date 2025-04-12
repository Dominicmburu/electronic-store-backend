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


const router = express.Router();

router.post('/login', adminLogin);

router.use(authenticateToken);
router.use(authorizeAdmin);

router.post('/register', validate(adminCreateUserSchema), registerAdmin);

router.post('/users', validate(adminCreateUserSchema), adminCreateUser);

router.get('/users', getAllUsers);

router.put('/users/:id', validate(updateUserSchema), adminUpdateUser);

router.delete('/users/:id', adminDeactivateUser);

router.patch('/users/:id/active', adminUpdateUserActiveStatus);

router.patch('/admins/:id/active', adminUpdateAdminActiveStatus);

router.get('/users/:id', getUserDetails);

router.put('/:id', validate(updateUserSchema), adminUpdateAdmin);

router.delete('/:id', adminDeactivateAdmin);

router.get('/:id', getAdminDetails);


export default router;
