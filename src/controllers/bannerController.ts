import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BackgroundType, BannerTemplateType } from '../types/index.js';
import { validateBanner } from '../schemas/bannerSchema.js';
import Banner from '../models/bannerModel.js';
import { deleteFile } from '../middleware/uploadMiddleware.js';
import { Types } from 'mongoose';
import { sendSuccess, sendCreated, sendBadRequest, sendNotFound, sendPaginatedSuccess } from '../utils/apiResponses.js';

// Get all banners with optional filtering
export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  const { 
    location,
    locations, // New: comma-separated list of locations for CityAdmin filtering
    templateType, 
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
    const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
    query.$or = [
      { Title: searchRegex },
      { Description: searchRegex },
      { Subtitle: searchRegex }
    ];
  }

  // Apply location filters
  // Priority: 'locations' (for CityAdmin bulk filtering) over 'location' (for single filter)
  if (locations && typeof locations === 'string') {
    // Multiple locations passed from admin side for CityAdmin users
    const locationArray = locations.split(',').map(loc => loc.trim()).filter(Boolean);
    if (locationArray.length > 0) {
      const locationQuery = {
        $or: [
          { LocationSlug: { $in: locationArray } },
          { LocationSlug: { $exists: false } },
          { LocationSlug: null }
        ]
      };
      
      // Combine with search query if it exists
      if (query.$or) {
        query.$and = [
          { $or: query.$or }, // Search conditions
          locationQuery       // Location conditions
        ];
        delete query.$or;
      } else {
        query.$or = locationQuery.$or;
      }
    }
  } else if (location && typeof location === 'string') {
    // Single location filter from UI
    const locationQuery = {
      $or: [
        { LocationSlug: location },
        { LocationSlug: { $exists: false } },
        { LocationSlug: null }
      ]
    };
    
    // Combine with search query if it exists
    if (query.$or) {
      query.$and = [
        { $or: query.$or }, // Search conditions
        locationQuery       // Location conditions
      ];
      delete query.$or;
    } else {
      query.$or = locationQuery.$or;
    }
  }
  
  if (templateType) {
    query.TemplateType = templateType;
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

  // Handle resource project specific logic
  let finalBannerData = _handleResourceProjectBannerLogic({ ...validation.data });
  
  // Handle background image specific logic
  finalBannerData = handleBackgroundImageLogic(finalBannerData);

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

  // Handle template type change from RESOURCE_PROJECT to another type
  if (oldBannerData.TemplateType === BannerTemplateType.RESOURCE_PROJECT && 
      validation?.data?.TemplateType !== BannerTemplateType.RESOURCE_PROJECT) {
    await handleResourceProjectTemplateChange(oldBannerData);
  }

  // Handle resource project specific logic
  let finalBannerData = _handleResourceProjectBannerLogic({ ...validation.data });
  
  // Handle background image specific logic
  finalBannerData = handleBackgroundImageLogic(finalBannerData);

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

// TODO: Remove it if we are going to get "Downloads" from GA4
// Increment download count for resource banners
export const incrementDownloadCount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const banner = await Banner.findById(id);
  
  if (!banner) {
    return sendNotFound(res, 'Banner not found');
  }

  if (banner.TemplateType !== BannerTemplateType.RESOURCE_PROJECT) {
    return sendBadRequest(res, 'Download count can only be incremented for resource project banners');
  }

  await banner.IncrementDownloadCount();

  return sendSuccess(res, { DownloadCount: banner.ResourceProject?.ResourceFile?.DownloadCount || 0 }, 'Download count incremented');
});

// Private helper to handle resource project specific logic
function _handleResourceProjectBannerLogic(bannerData: any): any {
  if (bannerData.TemplateType === BannerTemplateType.RESOURCE_PROJECT && bannerData.ResourceProject?.ResourceFile) {
    const resourceFile = bannerData.ResourceProject.ResourceFile;

    // If a new file was uploaded, its URL is in `Url`. We make this the permanent `FileUrl`.
    if (resourceFile.Url && !resourceFile.FileUrl) {
      bannerData.ResourceProject.ResourceFile.FileUrl = resourceFile.Url;
    }

    // Update the 'Download' CTA button URL to use the file URL
    const fileUrl = bannerData.ResourceProject.ResourceFile.FileUrl;
    if (bannerData.CtaButtons && bannerData.CtaButtons.length > 0 && fileUrl) {
      const downloadButtonIndex = 0;
      const button = bannerData.CtaButtons[downloadButtonIndex];
      if (button) {
        button.Url = fileUrl;
      }
    }
  }
  return bannerData;
}

// Private helper to handle template type change from RESOURCE_PROJECT
// Cleans up resource file and CTA button with blob URL when template type changes
async function handleResourceProjectTemplateChange(oldBannerData: any): Promise<void> {
  // Check if old banner had a resource file with a blob URL
  if (oldBannerData.ResourceProject?.ResourceFile?.FileUrl) {
    const fileUrl = oldBannerData.ResourceProject.ResourceFile.FileUrl;
    
    // Delete the resource file from blob storage if it's a blob URL
    if (fileUrl.includes('blob.core.windows.net')) {
      try {
        await deleteFile(fileUrl);
        console.log(`Cleaned up resource file during template type change: ${fileUrl}`);
      } catch (error) {
        console.error(`Failed to delete resource file ${fileUrl} during template type change:`, error);
        // Don't throw error - file cleanup failure shouldn't break the update
      }
    }
  }
}

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
  
  // Partner logos for partnership charter banners (nested structure)
  if (banner.PartnershipCharter?.PartnerLogos && Array.isArray(banner.PartnershipCharter.PartnerLogos)) {
    banner.PartnershipCharter.PartnerLogos.forEach((logo: any) => {
      if (logo.Url) urls.push(logo.Url);
    });
  }
  
  // Resource files for resource project banners (nested structure)
  if (banner.ResourceProject?.ResourceFile && banner.ResourceProject.ResourceFile.FileUrl) {
    urls.push(banner.ResourceProject.ResourceFile.FileUrl);
  }
  
  return urls;
}

// Helper function to process mixed media fields (existing assets + new files)
function processMediaFields(req: Request): any {
  // Start with the clean, pre-validated data and merge the raw body to get file info
  // Note: I still not sure if it makes sense to use this merging instead of req.body
  const processedData = { ...req.body, ...req.preValidatedData };
  
  ['Logo', 'BackgroundImage', 'MainImage' /*, 'AccentGraphic'*/].forEach(field => {
    const newFileData = processedData[`newfile_${field}`];
    const newMetadata = processedData[`newmetadata_${field}`] 
      ? JSON.parse(processedData[`newmetadata_${field}`]) 
      : null;
    const existingMetadata = processedData[`existing_${field}`] 
      ? JSON.parse(processedData[`existing_${field}`]) 
      : null;

    let finalAsset = null;
    if (newFileData) {
      // New file uploaded, merge with its metadata
      finalAsset = {
        ...(newMetadata || {}), // Contains Position, Opacity, etc.
        ...newFileData // Contains Url, Filename, Size from upload
      };
    } else if (existingMetadata) {
      // No new file, use existing metadata
      finalAsset = existingMetadata;
    }

    // If finalAsset is null (removed by user), set to undefined to satisfy Zod's optional schema
    // Otherwise, assign the processed asset object.
    processedData[field] = finalAsset;// === null ? undefined : finalAsset;
  });



  // Process PartnerLogos array field
  const existingPartnerLogos = processedData.existing_PartnerLogos
    ? JSON.parse(processedData.existing_PartnerLogos)
    : [];
  const newPartnerLogos = processedData.newfile_PartnerLogos || [];
  const combinedPartnerLogos = [
    ...existingPartnerLogos,
    ...(Array.isArray(newPartnerLogos) ? newPartnerLogos : [newPartnerLogos])
  ].filter(Boolean);

  if (processedData.PartnershipCharter) {
    const partnershipCharter = typeof processedData.PartnershipCharter === 'string'
      ? JSON.parse(processedData.PartnershipCharter)
      : processedData.PartnershipCharter;

    partnershipCharter.PartnerLogos = combinedPartnerLogos;
    processedData.PartnershipCharter = partnershipCharter;
  } else if (combinedPartnerLogos.length > 0) {
    processedData.PartnershipCharter = { PartnerLogos: combinedPartnerLogos };
  }



  // Process ResourceFile
  const newResourceFileData = processedData.newfile_ResourceFile;
  const newResourceFileMetadata = processedData.newmetadata_ResourceFile
    ? JSON.parse(processedData.newmetadata_ResourceFile)
    : null;
  const existingResourceFile = processedData.existing_ResourceFile
    ? JSON.parse(processedData.existing_ResourceFile)
    : null;

  let finalResourceFile = null;
  if (newResourceFileData) {
    finalResourceFile = {
      ...(newResourceFileMetadata || {}),
      ...newResourceFileData
    };
  } else if (existingResourceFile) {
    finalResourceFile = existingResourceFile;
  }

  if (processedData.ResourceProject) {
    const resourceProject = typeof processedData.ResourceProject === 'string'
      ? JSON.parse(processedData.ResourceProject)
      : processedData.ResourceProject;

    resourceProject.ResourceFile = finalResourceFile;
    processedData.ResourceProject = resourceProject;
  } else if (finalResourceFile) {
    processedData.ResourceProject = { ResourceFile: finalResourceFile };
  }

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
