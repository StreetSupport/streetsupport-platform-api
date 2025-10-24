import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest } from '../utils/apiResponses.js';
import GroupedService from 'models/groupedServiceModel.js';
import Service from 'models/serviceModel.js';
import { processAddressesWithCoordinates, updateLocationIfPostcodeChanged } from 'utils/postcodeValidation.js';
import { validateGroupedService } from '../schemas/groupedServiceSchema.js';
import { IGroupedService } from '../types/index.js';

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
    ProviderId: req.params.providerId
  });
  return sendSuccess(res, services);
});

/**
 * Helper function to create individual ProvidedServices from a GroupedProvidedService
 * Each subcategory becomes a separate service document
 */
async function createIndividualServices(groupedService: IGroupedService): Promise<void> {
  // Delete any existing individual services for this grouped service
  await Service.deleteMany({ ParentId: groupedService._id });
  
  // Create new individual services for each subcategory
  const servicesToCreate = groupedService.SubCategories.map(subCategory => ({
    CreatedBy: groupedService.CreatedBy,
    DocumentCreationDate: new Date(),
    DocumentModifiedDate: new Date(),
    ParentId: groupedService._id,
    IsPublished: groupedService.IsPublished,
    IsVerified: groupedService.IsVerified,
    ServiceProviderKey: groupedService.ProviderId,
    ServiceProviderName: groupedService.ProviderName || '',
    ParentCategoryKey: groupedService.CategoryId,
    SubCategoryKey: subCategory._id,
    SubCategoryName: subCategory.Name,
    Info: groupedService.Info || '',
    OpeningTimes: groupedService.OpeningTimes || [],
    Address: {
      Street: groupedService.Location.StreetLine1 || '',
      Street1: groupedService.Location.StreetLine2 || '',
      Street2: groupedService.Location.StreetLine3 || '',
      Street3: groupedService.Location.StreetLine4 || '',
      City: groupedService.Location.City || '',
      Postcode: groupedService.Location.Postcode || '',
      Location: groupedService.Location.Location,
      Telephone: groupedService.Telephone || '',
      IsOpen247: groupedService.IsOpen247
    },
    LocationDescription: groupedService.Location.Description || '',
    IsTelephoneService: groupedService.IsTelephoneService || false,
    IsAppointmentOnly: groupedService.IsAppointmentOnly || false
  }));
  
  await Service.insertMany(servicesToCreate);
}

/**
 * Helper function to determine which individual services need to be updated
 * Compares old and new grouped service to identify changes
 */
async function updateIndividualServices(oldGroupedService: IGroupedService, newGroupedService: IGroupedService): Promise<void> {
  // Common properties that would trigger full update if changed
  const commonPropertiesChanged = 
    oldGroupedService.ProviderId !== newGroupedService.ProviderId ||
    oldGroupedService.ProviderName !== newGroupedService.ProviderName ||
    oldGroupedService.CategoryId !== newGroupedService.CategoryId ||
    oldGroupedService.Info !== newGroupedService.Info ||
    oldGroupedService.IsPublished !== newGroupedService.IsPublished ||
    oldGroupedService.IsVerified !== newGroupedService.IsVerified ||
    oldGroupedService.Location.StreetLine1 !== newGroupedService.Location.StreetLine1 ||
    oldGroupedService.Location.StreetLine2 !== newGroupedService.Location.StreetLine2 ||
    oldGroupedService.Location.StreetLine3 !== newGroupedService.Location.StreetLine3 ||
    oldGroupedService.Location.StreetLine4 !== newGroupedService.Location.StreetLine4 ||
    oldGroupedService.Location.City !== newGroupedService.Location.City ||
    oldGroupedService.Location.Postcode !== newGroupedService.Location.Postcode ||
    oldGroupedService.Location.Description !== newGroupedService.Location.Description ||
    oldGroupedService.IsOpen247 !== newGroupedService.IsOpen247 ||
    oldGroupedService.IsAppointmentOnly !== newGroupedService.IsAppointmentOnly ||
    oldGroupedService.IsTelephoneService !== newGroupedService.IsTelephoneService ||
    oldGroupedService.Telephone !== newGroupedService.Telephone ||
    JSON.stringify(oldGroupedService.OpeningTimes) !== JSON.stringify(newGroupedService.OpeningTimes);
  
  // Get old and new subcategory IDs
  const oldSubCategoryIds = new Set(oldGroupedService.SubCategories.map(sc => sc._id));
  const newSubCategoryIds = new Set(newGroupedService.SubCategories.map(sc => sc._id));
  
  // Find removed subcategories
  const removedSubCategoryIds = [...oldSubCategoryIds].filter(id => !newSubCategoryIds.has(id));
  
  // Find added subcategories
  const addedSubCategoryIds = [...newSubCategoryIds].filter(id => !oldSubCategoryIds.has(id));
  
  // If common properties changed OR subcategories changed, recreate all services
  if (commonPropertiesChanged || removedSubCategoryIds.length > 0 || addedSubCategoryIds.length > 0) {
    await createIndividualServices(newGroupedService);
  }
}

// @desc    Create new service
// @route   POST /api/services
// @access  Private
export const createService = asyncHandler(async (req: Request, res: Response) => {
  // Validate the request data
  const validation = validateGroupedService(req.body);
  if (!validation.success) {
    const errorMessages = validation.errors?.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }
  
  // Initialize location coordinates from postcode for service location
  const serviceData = {
    ...validation.data,
    CreatedBy: req.user?._id || req.body?.CreatedBy,
    DocumentCreationDate: new Date(),
    DocumentModifiedDate: new Date()
  };
  
  // Process location to initialize Location coordinates from postcode
  if (serviceData.Location && serviceData.Location.Postcode && !serviceData.Location.Location) {
    await processAddressesWithCoordinates([serviceData.Location]);
  }

  // Create the grouped service
  const groupedService = await GroupedService.create(serviceData);
  
  // Create individual ProvidedServices for each subcategory
  await createIndividualServices(groupedService);
  
  return sendCreated(res, groupedService);
});

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private
export const updateService = asyncHandler(async (req: Request, res: Response) => {
  // Validate the request data
  const validation = validateGroupedService(req.body);
  if (!validation.success) {
    const errorMessages = validation.errors?.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }
  
  // Get existing service to compare postcodes and subcategories
  const existingService = await GroupedService.findById(req.params.id);
  if (!existingService) {
    return sendNotFound(res, 'Service not found');
  }

  // Prepare update data
  const updateData = {
    ...validation.data,
    CreatedBy: existingService.CreatedBy,
    DocumentModifiedDate: new Date()
  };


  // Check if location postcode has changed and update coordinates accordingly
  if (updateData.Location && updateData.Location.Postcode) {
    const oldLocation = existingService.Location;
    
    if (oldLocation && oldLocation.Postcode) {
      // Update location if postcode changed
      await updateLocationIfPostcodeChanged(
        oldLocation.Postcode, 
        updateData.Location.Postcode, 
        updateData.Location
      );
    } else if (!updateData.Location.Location) {
      // Initialize location for new postcode
      await processAddressesWithCoordinates([updateData.Location]);
    }
  }

  // Update the grouped service
  const updatedService = await GroupedService.findByIdAndUpdate(
    req.params.id, 
    updateData, 
    { new: true, runValidators: true }
  );
  
  if (!updatedService) {
    return sendNotFound(res, 'Service not found');
  }
  
  // Update individual ProvidedServices
  await updateIndividualServices(existingService, updatedService);
  
  return sendSuccess(res, updatedService);
});

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private
export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const service = await GroupedService.findByIdAndDelete(req.params.id).lean();
  if (!service) {
    return sendNotFound(res, 'Service not found');
  }
  
  // Delete all individual ProvidedServices associated with this grouped service
  await Service.deleteMany({ ParentId: req.params.id });
  
  return sendSuccess(res, {}, 'Service deleted');
});
