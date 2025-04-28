// src/config/logger.ts
import winston from 'winston';

// Extend the Logger interface to include the 'mpesa' property
declare module 'winston' {
  interface Logger {
    mpesa: {
      transaction: (message: string, meta: any) => void;
      callback: (message: string, meta: any) => void;
      error: (message: string, meta: any) => void;
    };
  }
}
import fs from 'fs';
import path from 'path';

// Ensure log directory exists
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'api-service' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write transaction logs specifically for M-Pesa
    new winston.transports.File({
      filename: path.join(logDir, 'mpesa-transactions.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Create a specialized logger for M-Pesa transactions
logger.mpesa = {
  transaction: (message: string, meta: any) => {
    logger.info(message, { ...meta, context: 'mpesa-transaction' });
  },
  callback: (message: string, meta: any) => {
    logger.info(message, { ...meta, context: 'mpesa-callback' });
  },
  error: (message: string, meta: any) => {
    logger.error(message, { ...meta, context: 'mpesa-error' });
  }
};

export default logger;