import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { generateToken } from '../utils/tokenUtils';
import { registerSchema, loginSchema } from '../validations/authValidation';
import { CustomError } from '../utils/CustomError';


const handleError = (error: any, res: Response) => {
  if (error instanceof CustomError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  console.error(error); // Log the error details for debugging
  return res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
};

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error } = registerSchema.validate(req.body);
    if (error) {
      throw new CustomError(error.details[0].message, 400);
    }

    const { name, email, phoneNumber, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new CustomError('Email already in use', 400);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with default settings and default role ('USER')
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        settings: {
          create: {},
        },
        // role: 'ADMIN',
        // Role is automatically set to 'USER' due to the default in the schema
      },
    });

    // Generate JWT token
    const token = generateToken(user.id);

    // Set token in HTTP-only cookie
    // res.cookie('token', token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    //   sameSite: 'strict',
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // });

    // Respond with user data including the role
    res.status(201).json({
      message: 'User registered successfully',
      // user: {
      //   id: user.id,
      //   name: user.name,
      //   email: user.email,
      //   role: user.role,
      // },
    });
  } catch (err) {
    handleError(err, res);
  }
};

// Login an existing user
export const login = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error } = loginSchema.validate(req.body);
    if (error) {
      throw new CustomError(error.details[0].message, 400);
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new CustomError('Invalid credentials', 400);
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new CustomError('Invalid credentials', 400);
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Set token in HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Respond with user data including the role
    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    handleError(err, res);
  }
};

// Logout a user
export const logout = (req: Request, res: Response) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout Error:', err);
    res.status(500).json({ message: 'Server error during logout' });
  }
};