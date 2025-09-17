import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler.js';

// Stub CRUD handlers for Resources
export const getResources = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const getResourceById = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const getResourcesByLocation = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const createResource = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const updateResource = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const deleteResource = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});
