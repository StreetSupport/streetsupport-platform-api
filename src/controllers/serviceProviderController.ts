import { Request, Response } from 'express';
import ServiceProvider from '@/models/serviceProviderModel.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

// @desc    Get all service providers
// @route   GET /api/providers
// @access  Private
export const getServiceProviders = asyncHandler(async (req: Request, res: Response) => {
  const providers = await ServiceProvider.find({ IsPublished: true });
  res.status(200).json({ success: true, data: providers });
});

// @desc    Get single service provider by ID
// @route   GET /api/providers/:id
// @access  Private
export const getServiceProviderById = asyncHandler(async (req: Request, res: Response) => {
  const provider = await ServiceProvider.findById(req.params.id);
  if (!provider) {
    res.status(404);
    throw new Error('Service provider not found');
  }
  res.status(200).json({ success: true, data: provider });
});

// @desc    Get service providers by location
// @route   GET /api/providers/location/:locationId
// @access  Private
export const getServiceProvidersByLocation = asyncHandler(async (req: Request, res: Response) => {
  const providers = await ServiceProvider.find({ 
    AssociatedLocationIds: req.params.locationId,
    IsPublished: true 
  });
  res.status(200).json({ success: true, data: providers });
});

// @desc    Create new service provider
// @route   POST /api/providers
// @access  Private
export const createServiceProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = await ServiceProvider.create(req.body);
  res.status(201).json({ success: true, data: provider });
});

// @desc    Update service provider
// @route   PUT /api/providers/:id
// @access  Private
export const updateServiceProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = await ServiceProvider.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    { new: true, runValidators: true }
  );
  if (!provider) {
    res.status(404);
    throw new Error('Service provider not found');
  }
  res.status(200).json({ success: true, data: provider });
});

// @desc    Delete service provider
// @route   DELETE /api/providers/:id
// @access  Private
export const deleteServiceProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = await ServiceProvider.findByIdAndDelete(req.params.id);
  if (!provider) {
    res.status(404);
    throw new Error('Service provider not found');
  }
  res.status(200).json({ success: true, data: {} });
});
