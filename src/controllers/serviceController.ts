import { Request, Response } from 'express';
import Service from '@/models/serviceModel.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNotFound } from '@/utils/apiResponses.js';

// @desc    Get all services
// @route   GET /api/services
// @access  Private
export const getServices = asyncHandler(async (req: Request, res: Response) => {
  const services = await Service.find({ IsPublished: true });
  return sendSuccess(res, services);
});

// @desc    Get single service by ID
// @route   GET /api/services/:id
// @access  Private
export const getServiceById = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    return sendNotFound(res, 'Service not found');
  }
  return sendSuccess(res, service);
});

// @desc    Get services by provider
// @route   GET /api/services/provider/:providerId
// @access  Private
export const getServicesByProvider = asyncHandler(async (req: Request, res: Response) => {
  const services = await Service.find({ 
    ServiceProviderKey: req.params.providerId,
    IsPublished: true 
  });
  return sendSuccess(res, services);
});

// @desc    Create new service
// @route   POST /api/services
// @access  Private
export const createService = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.create(req.body);
  return sendCreated(res, service);
});

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private
export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    { new: true, runValidators: true }
  );
  if (!service) {
    return sendNotFound(res, 'Service not found');
  }
  return sendSuccess(res, service);
});

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private
export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findByIdAndDelete(req.params.id).lean();
  if (!service) {
    return sendNotFound(res, 'Service not found');
  }
  return sendSuccess(res, {}, 'Service deleted');
});
