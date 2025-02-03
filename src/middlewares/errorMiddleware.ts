import { Request, Response, NextFunction } from 'express';

/**
 * Centralized error handling middleware.
 * Captures errors from all routes and middleware, logs them, and sends a standardized response.
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error details for debugging purposes
  console.error('Unhandled Error:', err);

  // Determine if the error has a specific status code
  const statusCode = err.statusCode || 500;

  // Determine the error message
  const message = err.message || 'Internal Server Error';

  // If in development, include the stack trace
  const response = {
    message,
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Uncomment if you want to include stack trace in development
  };

  // Send the error response
  res.status(statusCode).json(response);
};
