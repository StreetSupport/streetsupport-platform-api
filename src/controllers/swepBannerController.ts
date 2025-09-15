import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

// Stub CRUD handlers for SWEP Banners
export const getSwepBanners = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const getSwepBannerById = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const getSwepBannersByLocation = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const createSwepBanner = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const updateSwepBanner = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});

export const deleteSwepBanner = asyncHandler(async (req: Request, res: Response) => {
  res.status(501).json({ success: false, message: 'Not implemented' });
});
