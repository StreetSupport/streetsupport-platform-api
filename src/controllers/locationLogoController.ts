import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendBadRequest, sendNotFound, sendPaginatedSuccess } from '../utils/apiResponses.js';
import { validateLocationLogo } from '../schemas/locationLogoSchema.js';
import LocationLogo from '../models/locationLogosModel.js';
import { deleteFile } from '../middleware/uploadMiddleware.js';

// @desc    Get all location logos with optional filtering
// @route   GET /api/location-logos
// @access  Private
export const getLocationLogos = asyncHandler(async (req: Request, res: Response) => {
  const {
    location,
    locations, // Comma-separated list for location filtering
    search,
    page = 1,
    limit = 9,
    sortBy = 'DocumentModifiedDate',
    sortOrder = 'desc'
  } = req.query;

  const query: any = {};
  const conditions: any[] = [];

  // Apply search filter
  if (search && typeof search === 'string') {
    conditions.push({
      $or: [
        { DisplayName: { $regex: search.trim(), $options: 'i' } }
      ]
    });
  }

  // Apply location filter
  if (locations && typeof locations === 'string') {
    const locationArray = locations.split(',').map(loc => loc.trim()).filter(Boolean);
    if (locationArray.length > 0) {
      conditions.push({ LocationSlug: { $in: locationArray } });
    }
  } else if (location && typeof location === 'string') {
    conditions.push({ LocationSlug: location });
  }

  // Combine all conditions with AND logic
  if (conditions.length > 0) {
    query.$and = conditions;
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Sort options
  const sortOptions: any = {};
  sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

  const logos = await LocationLogo.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Get total count using the same query
  const total = await LocationLogo.countDocuments(query);

  return sendPaginatedSuccess(res, logos, {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit))
  });
});

// @desc    Get single location logo by ID
// @route   GET /api/location-logos/:id
// @access  Private
export const getLocationLogoById = asyncHandler(async (req: Request, res: Response) => {
  const logo = await LocationLogo.findById(req.params.id);
  
  if (!logo) {
    return sendNotFound(res, 'Location logo not found');
  }
  
  return sendSuccess(res, logo);
});


// @desc    Create location logo
// @route   POST /api/location-logos
// @access  Private
export const createLocationLogo = asyncHandler(async (req: Request, res: Response) => {
  // Extract uploaded file URL from req
  let logoPath = '';
  if (req.body.LogoPath) {
    logoPath = req.body.LogoPath;
  }

  const logoData = {
    ...req.body,
    LogoPath: logoPath,
    CreatedBy: req.user?.id || 'system'
  };

  // Validate logo data
  const validation = validateLocationLogo(logoData);
  if (!validation.success) {
    return sendBadRequest(res, 'Validation failed');
  }

  // Create location logo
  const logo = await LocationLogo.create(logoData);
  
  return sendSuccess(res, logo, 'Location logo created successfully');
});

// @desc    Update location logo
// @route   PUT /api/location-logos/:id
// @access  Private
export const updateLocationLogo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Get existing location logo
  const existingLogo = await LocationLogo.findById(id);
  
  if (!existingLogo) {
    return sendNotFound(res, 'Location logo not found');
  }

  // Store old logo path for cleanup
  const oldLogoPath = existingLogo.LogoPath;

  // Extract uploaded file URL from req
  let logoPath = existingLogo.LogoPath;
  if (req.body.LogoPath && req.body.LogoPath !== existingLogo.LogoPath) {
    logoPath = req.body.LogoPath;
  }

  const logoData = {
    ...req.body,
    LogoPath: logoPath,
    DocumentModifiedDate: new Date()
  };

  // Validate logo data
  const validation = validateLocationLogo(logoData);
  if (!validation.success) {
    return sendBadRequest(res, 'Validation failed');
  }

  // Update location logo
  const updatedLogo = await LocationLogo.findByIdAndUpdate(
    id,
    logoData,
    { new: true, runValidators: true }
  );

  // Cleanup old logo file if it was replaced
  if (logoPath !== oldLogoPath && oldLogoPath) {
    try {
      await deleteFile(oldLogoPath);
      console.log(`Deleted old logo file: ${oldLogoPath}`);
    } catch (error) {
      console.error(`Failed to delete old logo file: ${oldLogoPath}`, error);
    }
  }
  
  return sendSuccess(res, updatedLogo, 'Location logo updated successfully');
});

// @desc    Delete location logo
// @route   DELETE /api/location-logos/:id
// @access  Private
export const deleteLocationLogo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const logo = await LocationLogo.findById(id);
  
  if (!logo) {
    return sendNotFound(res, 'Location logo not found');
  }

  // Store logo path for cleanup
  const logoPath = logo.LogoPath;
  
  // Delete from database
  await LocationLogo.findByIdAndDelete(id);

  // Delete logo file from storage
  if (logoPath) {
    try {
      await deleteFile(logoPath);
      console.log(`Deleted logo file: ${logoPath}`);
    } catch (error) {
      console.error(`Failed to delete logo file: ${logoPath}`, error);
    }
  }
  
  return sendSuccess(res, null, 'Location logo deleted successfully');
});