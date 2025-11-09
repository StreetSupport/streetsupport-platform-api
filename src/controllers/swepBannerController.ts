import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendBadRequest, sendNotFound, sendPaginatedSuccess } from '../utils/apiResponses.js';
import { validateSwepBanner } from '../schemas/swepBannerSchema.js';
import SwepBanner from '../models/swepModel.js';
import { deleteFile } from '../middleware/uploadMiddleware.js';

// @desc    Get all SWEP banners with optional filtering
// @route   GET /api/swep-banners
// @access  Private
export const getSwepBanners = asyncHandler(async (req: Request, res: Response) => {
  const {
    location,
    locations, // Comma-separated list for CityAdmin or SwepAdmin filtering
    isActive,
    search,
    page = 1,
    limit = 10,
    sortBy = 'DocumentModifiedDate',
    sortOrder = 'desc'
  } = req.query;

  const query: any = {};
  const conditions: any[] = [];

  // Apply search filter
  if (search && typeof search === 'string') {
    conditions.push({
      $or: [
        { Title: { $regex: search.trim(), $options: 'i' } },
        { ShortMessage: { $regex: search.trim(), $options: 'i' } },
        { Body: { $regex: search.trim(), $options: 'i' } }
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

  // Apply isActive filter
  if (isActive !== undefined && isActive !== 'undefined') {
    conditions.push({ IsActive: isActive === 'true' });
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

  const swepBanners = await SwepBanner.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Get total count using the same query
  const total = await SwepBanner.countDocuments(query);

  return sendPaginatedSuccess(res, swepBanners, {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit))
  });
});

// @desc    Get single SWEP banner by location slug
// @route   GET /api/swep-banners/:location
// @access  Private
export const getSwepBannerByLocation = asyncHandler(async (req: Request, res: Response) => {
  const swepBanner = await SwepBanner.findOne({ LocationSlug: req.params.location });
  
  if (!swepBanner) {
    return sendNotFound(res, 'SWEP banner not found for this location');
  }
  
  return sendSuccess(res, swepBanner);
});

// @desc    Update SWEP banner
// @route   PUT /api/swep-banners/:location
// @access  Private
export const updateSwepBanner = asyncHandler(async (req: Request, res: Response) => {
  const { location } = req.params;
  
  // Get existing SWEP banner
  const existingSwep = await SwepBanner.findOne({ LocationSlug: location }).lean();
  if (!existingSwep) {
    return sendNotFound(res, 'SWEP banner not found for this location');
  }

  // Process media fields (existing assets + new uploads) using Banner approach
  const processedData = processSwepMediaFields(req);
  
  // Preserve existing date fields and IsActive (not editable in edit form)
  processedData.SwepActiveFrom = existingSwep.SwepActiveFrom;
  processedData.SwepActiveUntil = existingSwep.SwepActiveUntil;
  processedData.IsActive = existingSwep.IsActive;

  // Validate the processed data
  const validation = validateSwepBanner(processedData);

  if (!validation.success) {
    // Clean up any newly uploaded files since validation failed
    await cleanupSwepUploadedFiles(processedData);
    const errorMessages = validation.errors.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  // Store old banner data for file cleanup
  const oldImage = existingSwep.Image;

  // Update SWEP banner
  const updatedSwep = await SwepBanner.findOneAndUpdate(
    { LocationSlug: location },
    {
      ...validation.data,
      Image: validation.data?.Image || null,
      DocumentModifiedDate: new Date()
    },
    { new: true, runValidators: true }
  );

  // Clean up old image if it was replaced or removed (empty Image property indicates removal)
  if (oldImage) {
    if (!updatedSwep?.Image || updatedSwep.Image === null || oldImage !== updatedSwep.Image) {
      // Image was removed (empty) or replaced with a new one - delete old image
      await cleanupSwepUnusedFiles(oldImage);
      console.log(`Cleaned up old SWEP image: ${oldImage}`);
    }
  }

  return sendSuccess(res, updatedSwep);
});

// @desc    Update SWEP banner activation status with optional date range
// @route   PATCH /api/swep-banners/:location/toggle-active
// @access  Private
export const toggleSwepBannerActive = asyncHandler(async (req: Request, res: Response) => {
  const { location } = req.params;
  const { IsActive, SwepActiveFrom, SwepActiveUntil } = req.body;

  // Get existing SWEP banner
  const existingSwep = await SwepBanner.findOne({ LocationSlug: location });
  if (!existingSwep) {
    return sendNotFound(res, 'SWEP banner not found for this location');
  }
  
  // Prepare update data
  let shouldActivateNow = IsActive !== undefined ? IsActive : !existingSwep.IsActive;
  
  // Check if scheduled start date equals today - if so, activate immediately
  if (SwepActiveFrom !== undefined && SwepActiveFrom !== null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeFromDate = new Date(SwepActiveFrom);
    activeFromDate.setHours(0, 0, 0, 0);
    
    // If start date is today, activate immediately
    if (activeFromDate.getTime() === today.getTime()) {
      shouldActivateNow = true;
    }
  }
  
  const updateData: any = {
    IsActive: shouldActivateNow,
    DocumentModifiedDate: new Date()
  };

  // Handle date range for scheduled activation
  if (SwepActiveFrom !== undefined && SwepActiveFrom !== null) {
    updateData.SwepActiveFrom = new Date(SwepActiveFrom);
  } else if (updateData.IsActive && !existingSwep.SwepActiveFrom) {
    // If activating immediately without dates, set SwepActiveFrom to now
    updateData.SwepActiveFrom = new Date();
  }

  if (SwepActiveUntil !== undefined && SwepActiveUntil !== null) {
    updateData.SwepActiveUntil = new Date(SwepActiveUntil);
  } else if (!updateData.IsActive && !SwepActiveUntil) {
    // If deactivating without explicit date, set SwepActiveUntil to now
    updateData.SwepActiveUntil = new Date();
  }

  // Update SWEP banner
  const updatedSwep = await SwepBanner.findOneAndUpdate(
    { LocationSlug: location },
    updateData,
    { new: true, runValidators: true }
  );

  return sendSuccess(res, updatedSwep);
});

// ============================================
// HELPER FUNCTIONS (Banner approach)
// ============================================

// Helper function to process SWEP media fields (existing assets + new files)
function processSwepMediaFields(req: Request): any {
  const processedData = { ...req.body, ...req.preValidatedData };
  
  // Process image field
  const newFileData = processedData.newfile_image;
  const existingData = processedData.existing_image 
    ? JSON.parse(processedData.existing_image) 
    : null;
  const explicitImageValue = processedData.Image; // Check for explicit Image field

  if (newFileData) {
    // New file uploaded - uploadMiddleware attaches asset with Url property
    processedData.Image = newFileData.Url || newFileData.url;
  } else if (existingData) {
    // No new file, preserve existing image URL
    processedData.Image = existingData.url || existingData.Url;
  } else if (explicitImageValue === '') {
    // User explicitly removed the image by sending empty string
    processedData.Image = '';
  } else {
    // Image removed by user (no explicit value, no new file, no existing data)
    processedData.Image = '';
  }

  // Clean up temporary form data keys
  delete processedData.newfile_image;
  delete processedData.existing_image;

  return processedData;
}

// Helper function to clean up uploaded files when validation fails
async function cleanupSwepUploadedFiles(processedData: any): Promise<void> {
  if (processedData.Image && processedData.Image !== '') {
    try {
      await deleteFile(processedData.Image);
      console.log(`Cleaned up uploaded SWEP image after validation failure: ${processedData.Image}`);
    } catch (error) {
      console.error(`Failed to delete uploaded SWEP image ${processedData.Image}:`, error);
      // Don't throw - file cleanup failure shouldn't break the response
    }
  }
}

// Helper function to clean up unused SWEP image files
async function cleanupSwepUnusedFiles(imageUrl: string): Promise<void> {
  try {
    // We initialised all banners with common file SWEP.jpg. We should skip removing it till this file will not be used.
    if (imageUrl.endsWith('SWEP.jpg')) {
      return;
    }
    await deleteFile(imageUrl);
    console.log(`Cleaned up unused SWEP image: ${imageUrl}`);
  } catch (error) {
    console.error(`Failed to delete SWEP image ${imageUrl}:`, error);
    // Don't throw - file cleanup failure shouldn't break the update
  }
}
