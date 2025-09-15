import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

// Stub CRUD handlers for Banners
export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const getBannerById = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const getBannersByLocation = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});
