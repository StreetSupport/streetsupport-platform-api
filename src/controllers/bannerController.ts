import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BackgroundType } from '../types/index.js';
import { validateBanner } from '../schemas/bannerSchema.js';
import Banner from '../models/bannerModel.js';
import { deleteFile } from '../middleware/uploadMiddleware.js';
import { Types } from 'mongoose';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendPaginatedSuccess } from '../utils/apiResponses.js';

// Get all banners with optional filtering
export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  const {
    location,
    locations,
    isActive,
    search,
    page = 1,
    limit = 9,
    sortBy = 'Priority',
    sortOrder = 'asc'
  } = req.query;

  const query: any = {};

  // Apply search filter
  if (search && typeof search === 'string') {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { Title: searchRegex },
      { Description: searchRegex },
      { Subtitle: searchRegex }
    ];
  }

  // Apply location filters
  if (locations && typeof locations === 'string') {
    const locationArray = locations.split(',').map(loc => loc.trim()).filter(Boolean);
    if (locationArray.length > 0) {
      const locationQuery = {
        $or: [
          { LocationSlug: { $in: locationArray } },
          { LocationSlug: { $exists: false } },
          { LocationSlug: null }
        ]
      };

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          locationQuery
        ];
        delete query.$or;
      } else {
        query.$or = locationQuery.$or;
      }
    }
  } else if (location && typeof location === 'string') {
    const locationQuery = {
      $or: [
        { LocationSlug: location },
        { LocationSlug: { $exists: false } },
        { LocationSlug: null }
      ]
    };

    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        locationQuery
      ];
      delete query.$or;
    } else {
      query.$or = locationQuery.$or;
    }
  }

  if (isActive !== undefined) {
    query.IsActive = isActive === 'true';
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  
  // Sort options
  const sortOptions: any = {};
  sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
  
  const banners = await Banner.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number(limit));

  const total = await Banner.countDocuments(query);

  return sendPaginatedSuccess(res, banners, {
    page: Number(page),
    limit: Number(limit),
    total: total,
    pages: Math.ceil(total / Number(limit))
  });
});

// Get banner by ID
export const getBannerById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const banner = await Banner.findById(id);

  if (!banner) {
    return sendNotFound(res, 'Banner not found');
  }

  return sendSuccess(res, banner);
});

// Create new banner
export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  // Process media fields (existing assets + new uploads)
  const processedData = processMediaFields(req);

  // Validate and transform banner data using Zod (final validation after upload)
  const validation = validateBanner(processedData);

  if (!validation.success) {
    // Clean up any uploaded files since validation failed
    await cleanupUploadedFiles(processedData);
    const errorMessages = validation.errors.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  // Handle background image specific logic
  const finalBannerData = handleBackgroundImageLogic({ ...validation.data });

  // Add creator information and system fields
  const bannerData = {
    ...finalBannerData,
    CreatedBy: req.user?._id || finalBannerData?.CreatedBy,
    DocumentCreationDate: new Date(),
    DocumentModifiedDate: new Date(),
    _id: new Types.ObjectId()
  };

  const banner = await Banner.create(bannerData);

  return sendCreated(res, banner, 'Banner created successfully');
});

// Update banner
export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const banner = await Banner.findById(id);

  if (!banner) {
    return sendNotFound(res, 'Banner not found');
  }

  // Process media fields (existing assets + new uploads)
  const processedData = processMediaFields(req);

  // Validate and transform banner data using Zod (final validation after upload)
  const validation = validateBanner(processedData);

  if (!validation.success) {
    // Clean up any newly uploaded files since validation failed
    await cleanupUploadedFiles(processedData);
    const errorMessages = validation.errors.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  // Store old banner data for file cleanup
  const oldBannerData = banner.toObject();

  // Handle background image specific logic
  const finalBannerData = handleBackgroundImageLogic({ ...validation.data });

  // Preserve existing activation date fields and IsActive (not editable in edit form)
  finalBannerData.StartDate = banner.StartDate;
  finalBannerData.EndDate = banner.EndDate;
  finalBannerData.IsActive = banner.IsActive;

  // Update banner
  const updatedBanner = await Banner.findByIdAndUpdate(
    id,
    {
      ...finalBannerData,
      DocumentModifiedDate: new Date()
    },
    { new: true, runValidators: true }
  );

  // Clean up files that are no longer used after update
  if (updatedBanner) {
    await cleanupUnusedFiles(oldBannerData, updatedBanner.toObject());
  }

  return sendSuccess(res, updatedBanner, 'Banner updated successfully');
});

// Delete banner
export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const banner = await Banner.findById(id).lean();
  
  if (!banner) {
    return sendNotFound(res, 'Banner not found');
  }

  // Extract all file URLs from the banner before deletion
  // banner is already a plain object from .lean(), no need for .toObject()
  const fileUrls = extractFileUrls(banner);
  
  // Delete the banner from database first
  await Banner.findByIdAndDelete(id);

  // Clean up all associated files
  for (const url of fileUrls) {
    try {
      await deleteFile(url);
      console.log(`Cleaned up file during banner deletion: ${url}`);
    } catch (error) {
      console.error(`Failed to delete file ${url} during banner deletion:`, error);
      // Don't throw error - file cleanup failure shouldn't break the deletion response
    }
  }

  return sendSuccess(res, {}, 'Banner and associated files deleted successfully');
});

// @desc    Update banner activation status with optional date range
// @route   PATCH /api/banners/:id/toggle
// @access  Private
export const toggleBannerStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { IsActive, StartDate, EndDate } = req.body;

  // Get existing banner
  const existingBanner = await Banner.findById(id);
  if (!existingBanner) {
    return sendNotFound(res, 'Banner not found');
  }
  
  // Prepare update data
  let shouldActivateNow = IsActive !== undefined ? IsActive : !existingBanner.IsActive;
  
  // Check if scheduled start date equals today - if so, activate immediately
  if (StartDate !== undefined && StartDate !== null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeFromDate = new Date(StartDate);
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
  if (StartDate !== undefined && StartDate !== null) {
    updateData.StartDate = new Date(StartDate);
  } else if (updateData.IsActive && !StartDate) {
    // If activating immediately without dates, set StartDate to now
    updateData.StartDate = new Date();
    updateData.EndDate = null;
  }

  if (EndDate !== undefined && EndDate !== null) {
    updateData.EndDate = new Date(EndDate);
  } else if (!updateData.IsActive && !EndDate) {
    // If deactivating without explicit date, set EndDate to now
    updateData.StartDate = null;
    updateData.EndDate = new Date();
  }

  // Update banner
  const updatedBanner = await Banner.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  return sendSuccess(res, updatedBanner, `Banner ${updatedBanner?.IsActive ? 'activated' : 'deactivated'} successfully`);
});

// Private helper to handle background image logic
// Automatically populates Background.Value with BackgroundImage URL when Background.Type is 'image'
function handleBackgroundImageLogic(bannerData: any): any {
  // Ensure Background object exists
  if (!bannerData.Background) {
    return bannerData;
  }

  // If Background.Type is 'image', handle the BackgroundImage URL
  if (bannerData.Background.Type === BackgroundType.IMAGE) {
    // Case 1: BackgroundImage exists - populate Background.Value with its URL
    if (bannerData.BackgroundImage && bannerData.BackgroundImage.Url) {
      bannerData.Background.Value = bannerData.BackgroundImage.Url;
    } 
    // Case 2: BackgroundImage was removed - clear Background.Value
    else {
      bannerData.Background.Value = '';
    }
  }

  return bannerData;
}

// Helper function to extract all file URLs from a banner
function extractFileUrls(banner: any): string[] {
  const urls: string[] = [];

  // Main media assets
  if (banner.Logo?.Url) urls.push(banner.Logo.Url);
  if (banner.BackgroundImage?.Url) urls.push(banner.BackgroundImage.Url);
  if (banner.MainImage?.Url) urls.push(banner.MainImage.Url);

  // Uploaded file (PDFs, images, etc.)
  if (banner.UploadedFile?.FileUrl) urls.push(banner.UploadedFile.FileUrl);

  return urls;
}

// Helper function to process mixed media fields (existing assets + new files)
function processMediaFields(req: Request): any {
  const processedData = { ...req.body, ...req.preValidatedData };

  // Process standard media asset fields (Logo, BackgroundImage, MainImage)
  ['Logo', 'BackgroundImage', 'MainImage'].forEach(field => {
    const newFileData = processedData[`newfile_${field}`];
    const newMetadata = processedData[`newmetadata_${field}`]
      ? JSON.parse(processedData[`newmetadata_${field}`])
      : null;
    const existingMetadata = processedData[`existing_${field}`]
      ? JSON.parse(processedData[`existing_${field}`])
      : null;

    let finalAsset = null;
    if (newFileData) {
      finalAsset = {
        ...(newMetadata || {}),
        ...newFileData
      };
    } else if (existingMetadata) {
      finalAsset = existingMetadata;
    }

    processedData[field] = finalAsset;
  });

  // Process UploadedFile (general file upload - PDFs, images, etc.)
  const newUploadedFileData = processedData.newfile_UploadedFile;
  const newUploadedFileMetadata = processedData.newmetadata_UploadedFile
    ? JSON.parse(processedData.newmetadata_UploadedFile)
    : null;
  const existingUploadedFile = processedData.existing_UploadedFile
    ? JSON.parse(processedData.existing_UploadedFile)
    : null;

  let finalUploadedFile = null;
  if (newUploadedFileData) {
    finalUploadedFile = {
      ...(newUploadedFileMetadata || {}),
      ...newUploadedFileData
    };
  } else if (existingUploadedFile) {
    finalUploadedFile = existingUploadedFile;
  }

  processedData.UploadedFile = finalUploadedFile;

  // Clean up all temporary form data keys before validation
  Object.keys(processedData).forEach(key => {
    if (key.startsWith('newfile_') || key.startsWith('newmetadata_') || key.startsWith('existing_')) {
      delete processedData[key];
    }
  });

  return processedData;
}

// Helper function to clean up files that are no longer used
async function cleanupUnusedFiles(oldBanner: any, newBanner: any): Promise<void> {
  const oldUrls = extractFileUrls(oldBanner);
  const newUrls = extractFileUrls(newBanner);
  
  // Find URLs that are in old banner but not in new banner
  const urlsToDelete = oldUrls.filter(url => !newUrls.includes(url));
  
  // Delete unused files
  for (const url of urlsToDelete) {
    try {
      await deleteFile(url);
      console.log(`Cleaned up unused file: ${url}`);
    } catch (error) {
      console.error(`Failed to delete file ${url}:`, error);
      // Don't throw error - file cleanup failure shouldn't break the update
    }
  }
}

// Helper function to clean up uploaded files when validation fails
async function cleanupUploadedFiles(processedData: any): Promise<void> {
  const urls = extractFileUrls(processedData);

  // Delete all uploaded files since validation failed
  for (const url of urls) {
    try {
      await deleteFile(url);
      console.log(`Cleaned up uploaded file after validation failure: ${url}`);
    } catch (error) {
      console.error(`Failed to delete uploaded file ${url}:`, error);
      // Don't throw error - file cleanup failure shouldn't break the response
    }
  }
}
