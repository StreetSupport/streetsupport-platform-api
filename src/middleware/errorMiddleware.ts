import { ErrorRequestHandler } from 'express';
import { UnauthorizedError } from 'express-oauth2-jwt-bearer';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err);
  debugger
  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Invalid or missing token',
      status: 401,
      code: 'unauthorized'
    });
  }
  
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

export const notFound = (req: any, res: any, next: any) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
