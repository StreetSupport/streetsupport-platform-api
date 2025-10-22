import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/apiResponses.js';
import GroupedService from 'models/groupedServiceModel.js';
import { processAddressesWithCoordinates, updateLocationIfPostcodeChanged } from 'utils/postcodeValidation.js';

// @desc    Get all services
// @route   GET /api/services
// @access  Private
export const getServices = asyncHandler(async (req: Request, res: Response) => {
  const services = await GroupedService.find({ IsPublished: true });
  return sendSuccess(res, services);
});

// @desc    Get single service by ID
// @route   GET /api/services/:id
// @access  Private
export const getServiceById = asyncHandler(async (req: Request, res: Response) => {
  const service = await GroupedService.findById(req.params.id);
  if (!service) {
    return sendNotFound(res, 'Service not found');
  }
  return sendSuccess(res, service);
});

// @desc    Get services by provider
// @route   GET /api/services/provider/:providerId
// @access  Private
export const getServicesByProvider = asyncHandler(async (req: Request, res: Response) => {
  const services = await GroupedService.find({ 
    ProviderId: req.params.providerId,
    IsPublished: true 
  });
  return sendSuccess(res, services);
});

// @desc    Create new service
// @route   POST /api/services
// @access  Private
export const createService = asyncHandler(async (req: Request, res: Response) => {
  // Initialize location coordinates from postcodes for service locations
  const serviceData = { ...req.body };
  
  // Process locations to initialize Location coordinates from postcodes
  if (serviceData.Locations && serviceData.Locations.length > 0) {
    await processAddressesWithCoordinates(serviceData.Locations);
  }
  
  const service = await GroupedService.create(serviceData);
  return sendCreated(res, service);
});

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private
export const updateService = asyncHandler(async (req: Request, res: Response) => {
  // Get existing service to compare postcodes
  const existingService = await GroupedService.findById(req.params.id);
  if (!existingService) {
    return sendNotFound(res, 'Service not found');
  }

  // Prepare update data
  const updateData = { ...req.body };

  // Check if any location postcodes have changed and update coordinates accordingly
  if (updateData.Locations && updateData.Locations.length > 0) {
    for (let i = 0; i < updateData.Locations.length; i++) {
      const newLocation = updateData.Locations[i];
      const oldLocation = existingService.Location;
      
      if (oldLocation && newLocation.Postcode) {
        // Update location if postcode changed
        await updateLocationIfPostcodeChanged(
          oldLocation.Postcode, 
          newLocation.Postcode, 
          newLocation
        );
      } else if (newLocation.Postcode && !newLocation.Location) {
        // Initialize location for new locations
        await processAddressesWithCoordinates([newLocation]);
      }
    }
  }

  const service = await GroupedService.findByIdAndUpdate(
    req.params.id, 
    updateData, 
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
  const service = await GroupedService.findByIdAndDelete(req.params.id).lean();
  if (!service) {
    return sendNotFound(res, 'Service not found');
  }
  return sendSuccess(res, {}, 'Service deleted');
});
