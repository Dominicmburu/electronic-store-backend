import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { adminCreateUserSchema, updateUserSchema } from '../validations/adminValidation';
import { CustomError } from '../utils/CustomError';
import { Role } from '@prisma/client';
import { generateToken } from '../utils/tokenUtils';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    role: Role;
  };
}

// Register a new admin
export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { error } = adminCreateUserSchema.validate(req.body);
    if (error) throw new CustomError(error.details[0].message, 400);

    const { name, email, phoneNumber, password } = req.body;

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new CustomError('Email already in use', 400);

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user with role 'ADMIN'
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        role: Role.ADMIN,
        settings: { create: {} },
      },
    });

    res.status(201).json({
      message: 'Admin registered successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Admin Registration Error:', err);
    if (err instanceof CustomError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) { // Check if err is an instance of Error
      res.status(500).json({ message: err.message || 'Server error' });
    } else {
      res.status(500).json({ message: 'An unexpected error occurred' });
    }
  }
};

// Admin login
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== Role.ADMIN) throw new CustomError('Invalid credentials or not an admin', 400);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new CustomError('Invalid credentials', 400);

    const token = generateToken(user.id, user.role);

    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
    res.status(200).json({
      message: 'Admin logged in successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Admin Login Error:', err);
    if (err instanceof CustomError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) { // Check if err is an instance of Error
      res.status(500).json({ message: err.message || 'Server error' });
    } else {
      res.status(500).json({ message: 'An unexpected error occurred' });
    }
  }
};

// Update admin details
export const adminUpdateAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phoneNumber, password } = req.body;

    const { error } = updateUserSchema.validate({ name, email, phoneNumber, password });
    if (error) throw new CustomError(error.details[0].message, 400);

    const updateData: any = { name, email, phoneNumber };
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const adminUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.status(200).json({ message: 'Admin updated successfully', user: adminUser });
  } catch (err) {
    console.error('Admin Update Error:', err);
    if (err instanceof CustomError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) { // Check if err is an instance of Error
      res.status(500).json({ message: err.message || 'Server error' });
    } else {
      res.status(500).json({ message: 'An unexpected error occurred' });
    }
  }
};

// Deactivate admin
export const adminDeactivateAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });

    res.status(200).json({ message: 'Admin deactivated successfully' });
  } catch (err) {
    console.error('Admin Deactivate Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin fetches details of another admin
export const getAdminDetails = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;

    const userId = req.user?.id;

    // Check if the user is an admin
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const adminUser = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { id: true, name: true, email: true, phoneNumber: true, role: true, isActive: true },
    });

    if (!adminUser || adminUser.role !== Role.ADMIN) {
      throw new CustomError('Admin not found', 404);
    }

    res.status(200).json({ user: adminUser });
  } catch (err) {
    console.error('Get Admin Details Error:', err);
    if (err instanceof CustomError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) { // Check if err is an instance of Error
      res.status(500).json({ message: err.message || 'Server error' });
    } else {
      res.status(500).json({ message: 'An unexpected error occurred' });
    }
  }
};

// Admin creates a new user with a specific role
export const adminCreateUser = async (req: Request, res: Response) => {
  try {
    const { error } = adminCreateUserSchema.validate(req.body);
    if (error) throw new CustomError(error.details[0].message, 400);

    const { name, email, phoneNumber, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new CustomError('Email already in use', 400);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        role: Role.USER,
        settings: { create: {} },
      },
    });

    res.status(201).json({
      message: 'User created successfully by admin',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Admin Create User Error:', err);
    if (err instanceof CustomError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) {
      res.status(500).json({ message: err.message || 'Server error' });
    } else {
      res.status(500).json({ message: 'An unexpected error occurred' });
    }
  }
};

// Admin updates user details
export const adminUpdateUser = async (req: Request, res: Response) => {
  try {
    const { error } = updateUserSchema.validate(req.body);
    if (error) throw new CustomError(error.details[0].message, 400);

    const { id } = req.params;
    const { name, email, phoneNumber, role } = req.body;

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { name, email, phoneNumber, role },
    });

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (err) {
    console.error('Admin Update User Error:', err);
    if (err instanceof CustomError) {
      res.status(err.statusCode).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// Admin deactivates (soft deletes) a user
export const adminDeactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive: false }, // Assuming 'isActive' is used for soft deletes
    });

    res.status(200).json({ message: 'User deactivated successfully' });
  } catch (err) {
    console.error('Admin Deactivate User Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin deletes (deactivates) a user
export const adminDeleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive: false }, // Assuming 'isActive' is used for soft deletes
    });

    res.status(200).json({ message: 'User deactivated successfully' });
  } catch (err) {
    console.error('Admin Delete User Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin fetches a paginated list of users
export const getAllUsers = async (req: Request, res: Response) => {
  const { page = 1, limit = 10, role } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const users = await prisma.user.findMany({
      where: role ? { role: role as Role } : {},
      skip: offset,
      take: Number(limit),
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    const totalUsers = await prisma.user.count({ where: role ? { role: role as Role } : {} });
    res.status(200).json({
      page: Number(page),
      totalPages: Math.ceil(totalUsers / Number(limit)),
      users,
    });
  } catch (err) {
    console.error('Get All Users Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin retrieves details for a specific user
export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { id: true, name: true, email: true, phoneNumber: true, role: true, isActive: true },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error('Get User Details Error:', err);
    if (err instanceof CustomError) {
      res.status(err.statusCode).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// Admin updates the active status of a user
export const adminUpdateUserActiveStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Check if isActive is provided and is a boolean
    if (typeof isActive !== 'boolean') {
      throw new CustomError('Invalid data: isActive must be a boolean', 400);
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.status(200).json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user,
    });
  } catch (err) {
    console.error('Admin Update User Active Status Error:', err);
    if (err instanceof CustomError) {
      res.status(err.statusCode).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// Admin updates the active status of another admin
export const adminUpdateAdminActiveStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Check if isActive is provided and is a boolean
    if (typeof isActive !== 'boolean') {
      throw new CustomError('Invalid data: isActive must be a boolean', 400);
    }

    const adminUser = await prisma.user.update({
      where: { id: Number(id), role: Role.ADMIN }, // Ensure the user is an admin
      data: { isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.status(200).json({
      message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      admin: adminUser,
    });
  } catch (err) {
    console.error('Admin Update Admin Active Status Error:', err);
    if (err instanceof CustomError) {
      res.status(err.statusCode).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
};

