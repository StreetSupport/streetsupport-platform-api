import { Request, Response } from 'express';
import Service from '../models/serviceModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get all services
// @route   GET /api/services
// @access  Private
export const getServices = asyncHandler(async (req: Request, res: Response) => {
    const services = await Service.find({ IsPublished: true });
    res.status(200).json({ success: true, data: services });
});

// @desc    Get single service by ID
// @route   GET /api/services/:id
// @access  Private
export const getServiceById = asyncHandler(async (req: Request, res: Response) => {
    const service = await Service.findById(req.params.id);
    if (!service) {
        res.status(404);
        throw new Error('Service not found');
    }
    res.status(200).json({ success: true, data: service });
});

// @desc    Get services by provider
// @route   GET /api/services/provider/:providerId
// @access  Private
export const getServicesByProvider = asyncHandler(async (req: Request, res: Response) => {
    const services = await Service.find({ 
        ServiceProviderKey: req.params.providerId,
        IsPublished: true 
    });
    res.status(200).json({ success: true, data: services });
});

// @desc    Create new service
// @route   POST /api/services
// @access  Private
export const createService = asyncHandler(async (req: Request, res: Response) => {
    const service = await Service.create(req.body);
    res.status(201).json({ success: true, data: service });
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
        res.status(404);
        throw new Error('Service not found');
    }
    res.status(200).json({ success: true, data: service });
});

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private
export const deleteService = asyncHandler(async (req: Request, res: Response) => {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
        res.status(404);
        throw new Error('Service not found');
    }
    res.status(200).json({ success: true, data: {} });
});
