import { ErrorRequestHandler } from 'express';
import { UnauthorizedError } from 'express-oauth2-jwt-bearer';

/**
 * Centralized error handler middleware
 * Catches all errors passed via next(error) and formats consistent error responses
 * 
 * Usage: Automatically catches errors from asyncHandler-wrapped route handlers
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- next is required by Express error handler signature even if not used
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error Handler Caught:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle Auth0 JWT errors
  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      success: false,
      error: process.env.NODE_ENV !== 'production' ? 'Unauthorized - Invalid or missing token' : err.message,
      status: 401,
      code: 'unauthorized'
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
      status: 400,
      code: 'validation_error'
    });
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: process.env.NODE_ENV !== 'production' ? 'Duplicate entry' : err.message,
      status: 409,
      code: 'duplicate_error'
    });
  }

  // Handle configuration errors (like AUTH0_DOMAIN missing)
  if (err.message.includes('not configured')) {
    console.log('✅ Configuration error handler matched - sending 500 response');
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV !== 'production' ? 'Server configuration error' : err.message,
      status: 500,
      code: 'configuration_error'
    });
  }
  
  // Default error response (only reached if no specific handler matched)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV !== 'production' ? 'Internal Server Error' : err.message,
    status: statusCode,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

export const notFound = (req: any, res: any, next: any) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
