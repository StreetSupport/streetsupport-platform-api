import { Request, Response } from 'express';
import Accommodation from '../models/accommodationModel.js';
import Organisation from '../models/organisationModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest } from '../utils/apiResponses.js';
import { validateAccommodation } from '../schemas/accommodationSchema.js';
import { processAddressesWithCoordinates } from '../utils/postcodeValidation.js';

// @desc    Get all accommodations for a service provider
// @route   GET /api/accommodation/provider/:providerId
// @access  Private
export const getAccommodationByProvider = asyncHandler(async (req: Request, res: Response) => {
  const accommodations = await Accommodation.find({ 
    'GeneralInfo.ServiceProviderId': req.params.providerId 
  }).lean();
  
  return sendSuccess(res, accommodations);
});

// @desc    Get accommodation by ID
// @route   GET /api/accommodation/:id
// @access  Private
export const getAccommodationById = asyncHandler(async (req: Request, res: Response) => {
  const accommodation = await Accommodation.findById(req.params.id).lean();
  
  if (!accommodation) {
    return sendNotFound(res, 'Accommodation not found');
  }
  
  return sendSuccess(res, accommodation);
});

// @desc    Create new accommodation
// @route   POST /api/accommodation
// @access  Private
export const createAccommodation = asyncHandler(async (req: Request, res: Response) => {
  // Validate the request data
  const validation = validateAccommodation(req.body);
  
  if (!validation.success) {
    const errorMessages = validation.errors.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  if (!validation.data) {
    return sendBadRequest(res, 'Validation data is missing');
  }

  // Get organisation to inherit IsPublished status
  const organisation = await Organisation.findOne({ 
    Key: validation.data.GeneralInfo.ServiceProviderId 
  }).lean();
  
  if (!organisation) {
    return sendBadRequest(res, 'Organisation not found');
  }

  // Process address with coordinates if postcode is provided
  let addressData = validation.data.Address;
  if (addressData.Postcode) {
    await processAddressesWithCoordinates(addressData);
  }

  // Create accommodation with organisation's IsPublished status
  const accommodationData = {
    ...validation.data,
    GeneralInfo: {
      ...validation.data.GeneralInfo,
      IsPublished: organisation.IsPublished
    },
    Address: addressData
  };

  const accommodation = await Accommodation.create(accommodationData);
  return sendCreated(res, accommodation);
});

// @desc    Update accommodation
// @route   PUT /api/accommodation/:id
// @access  Private
export const updateAccommodation = asyncHandler(async (req: Request, res: Response) => {
  const accommodation = await Accommodation.findById(req.params.id);
  
  if (!accommodation) {
    return sendNotFound(res, 'Accommodation not found');
  }

  // Validate the request data
  const validation = validateAccommodation(req.body);
  
  if (!validation.success) {
    const errorMessages = validation.errors.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  if (!validation.data) {
    return sendBadRequest(res, 'Validation data is missing');
  }

  // Process address with coordinates if postcode changed
  let addressData = validation.data.Address;
  if (addressData.Postcode && addressData.Postcode !== accommodation.Address.Postcode) {
    await processAddressesWithCoordinates(addressData);
  }

  // Update accommodation
  Object.assign(accommodation, {
    ...validation.data,
    Address: addressData
  });

  await accommodation.save();
  return sendSuccess(res, accommodation, 'Accommodation updated successfully');
});

// @desc    Delete accommodation
// @route   DELETE /api/accommodation/:id
// @access  Private
export const deleteAccommodation = asyncHandler(async (req: Request, res: Response) => {
  const accommodation = await Accommodation.findById(req.params.id);
  
  if (!accommodation) {
    return sendNotFound(res, 'Accommodation not found');
  }

  await accommodation.deleteOne();
  return sendSuccess(res, {}, 'Accommodation deleted successfully');
});

// @desc    Get all accommodations with filtering
// @route   GET /api/accommodation
// @access  Private
export const getAccommodations = asyncHandler(async (req: Request, res: Response) => {
  const {
    providerId,
    location,
    accommodationType,
    isPublished
  } = req.query;

  const query: any = {};

  if (providerId) {
    query['GeneralInfo.ServiceProviderId'] = providerId;
  }

  if (location) {
    query['Address.AssociatedCityId'] = location;
  }

  if (accommodationType) {
    query['GeneralInfo.AccommodationType'] = accommodationType;
  }

  if (isPublished !== undefined) {
    query['GeneralInfo.IsPublished'] = isPublished === 'true';
  }

  const accommodations = await Accommodation.find(query).lean();
  return sendSuccess(res, accommodations);
});
