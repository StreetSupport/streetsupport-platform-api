import { Request, Response } from 'express';
import ServiceProvider from '@/models/serviceProviderModel.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNotFound } from '@/utils/apiResponses.js';

// @desc    Get all service providers
// @route   GET /api/providers
// @access  Private
export const getServiceProviders = asyncHandler(async (req: Request, res: Response) => {
  const providers = await ServiceProvider.find().lean();
  return sendSuccess(res, providers);
});

// @desc    Get single service provider by ID
// @route   GET /api/providers/:id
// @access  Private
export const getServiceProviderById = asyncHandler(async (req: Request, res: Response) => {
  const provider = await ServiceProvider.findById(req.params.id);
  if (!provider) {
    return sendNotFound(res, 'Service provider not found');
  }
  return sendSuccess(res, provider);
});

// @desc    Create new service provider
// @route   POST /api/providers
// @access  Private
export const createServiceProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = await ServiceProvider.create(req.body);
  return sendCreated(res, provider);
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
    return sendNotFound(res, 'Service provider not found');
  }
  return sendSuccess(res, provider);
});

// @desc    Delete service provider
// @route   DELETE /api/providers/:id
// @access  Private
export const deleteServiceProvider = asyncHandler(async (req: Request, res: Response) => {
  const provider = await ServiceProvider.findByIdAndDelete(req.params.id).lean();
  if (!provider) {
    return sendNotFound(res, 'Service provider not found');
  }
  return sendSuccess(res, {}, 'Service provider deleted');
});
