import { Response } from 'express';

export interface BaseResponse {
  success: boolean;
}

/**
 * Standard success response structure
 */
interface SuccessResponse<T = unknown> extends BaseResponse {
  success: true;
  data: T;  
  message?: string;
}

/**
 * Standard error response structure
 */
interface ErrorResponse extends BaseResponse {
  success: false;
  error: string;
  errors: Array<{ path: string; message: string; code: string }>
}


/**
 * Send a 401 Unauthorized response
 */
export const sendUnauthorized = (res: Response, error: string = 'Authentication required'): Response => {
  return res.status(401).json({
    success: false,
    error: error
  } as ErrorResponse);
};

/**
 * Send a 403 Forbidden response
 */
export const sendForbidden = (res: Response, error: string = 'Access denied - insufficient permissions'): Response => {
  return res.status(403).json({
    success: false,
    error: error
  } as ErrorResponse);
};

/**
 * Send a 404 Not Found response
 */
export const sendNotFound = (res: Response, error: string = 'Resource not found'): Response => {
  return res.status(404).json({
    success: false,
    error: error
  } as ErrorResponse);
};

/**
 * Send a 400 Bad Request response
 */
export const sendBadRequest = (res: Response, error: string = 'Bad request'): Response => {
  return res.status(400).json({
    success: false,
    error: error
  } as ErrorResponse);
};

/**
 * Send a 500 Internal Server Error response
 */
export const sendInternalError = (res: Response, error: string = 'Internal server error'): Response => {
  return res.status(500).json({
    success: false,
    error: error
  } as ErrorResponse);
};

/**
 * Send a generic error response with custom status code
 */
export const sendError = (res: Response, statusCode: number, error: string): Response => {
  return res.status(statusCode).json({
    success: false,
    error: error
  } as ErrorResponse);
};

/**
 * Pagination metadata structure
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Send a 200 OK success response with data
 */
export const sendSuccess = <T = unknown>(res: Response, data: T, message?: string): Response => {
  return res.status(200).json({
    success: true,
    data: data,
    ...(message && { message })
  } as SuccessResponse<T>);
};

/**
 * Send a 200 OK success response with data and pagination metadata
 */
export const sendPaginatedSuccess = <T = unknown>(
  res: Response, 
  data: T, 
  pagination: PaginationMeta,
  message?: string
): Response => {
  return res.status(200).json({
    success: true,
    data: data,
    pagination: pagination,
    ...(message && { message })
  });
};

/**
 * Send a 201 Created success response with data
 */
export const sendCreated = <T = unknown>(res: Response, data: T, message?: string): Response => {
  return res.status(201).json({
    success: true,
    data: data,
    ...(message && { message })
  } as SuccessResponse<T>);
};
