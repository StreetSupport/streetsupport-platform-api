import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BannerTemplateType } from '@/types/index.js';
import { validateBanner } from '../schemas/bannerSchema.js';
import Banner from '@/models/bannerModel.js';
import { deleteFile } from '../middleware/uploadMiddleware.js';
import { Types } from 'mongoose';

// Create new banner
export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  // Process media fields (existing assets + new uploads)
  const processedData = processMediaFields(req);

  // Validate and transform banner data using Zod (final validation after upload)
  const validation = validateBanner(processedData);
  
  if (!validation.success) {
    // Clean up any uploaded files since validation failed
    await cleanupUploadedFiles(processedData);
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  // Handle resource project specific logic
  const finalBannerData = _handleResourceProjectBannerLogic({ ...validation.data });

  // Add creator information and system fields
  const bannerData = {
    ...finalBannerData,
    CreatedBy: req.user?.id || finalBannerData?.CreatedBy,
    DocumentCreationDate: new Date(),
    DocumentModifiedDate: new Date(),
    _id: new Types.ObjectId()
  };

  const banner = await Banner.create(bannerData);

  res.status(201).json({
    success: true,
    data: banner,
    message: 'Banner created successfully'
  });
});

// Helper function to extract all file URLs from a banner
function extractFileUrls(banner: any): string[] {
  const urls: string[] = [];
  
  // Main media assets
  if (banner.Logo?.Url) urls.push(banner.Logo.Url);
  if (banner.BackgroundImage?.Url) urls.push(banner.BackgroundImage.Url);
  if (banner.MainImage?.Url) urls.push(banner.MainImage.Url);
  // TODO: Uncomment if AccentGraphic is needed. In the other case, remove.
  // if (banner.AccentGraphic?.Url) urls.push(banner.AccentGraphic.Url);
  
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
  
  // TODO: Uncomment if AccentGraphic is needed. In the other case, remove.
  // Process single media assets: Logo, BackgroundImage, MainImage, AccentGraphic
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

// Get all banners with optional filtering
export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  const { 
    location, 
    templateType, 
    isActive, 
    search,
    page = 1, 
    limit = 10,
    sortBy = 'Priority',
    sortOrder = 'desc'
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
  
  // Apply filters
  if (location) {
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

  res.status(200).json({
    success: true,
    data: banners,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit))
    }
  });
});

// Get active banners for public display
export const getActiveBanners = asyncHandler(async (req: Request, res: Response) => {
  debugger
  const { location, maxDisplay = 3 } = req.query;
  
  const banners = await Banner.findActive(location as string)
    .limit(Number(maxDisplay));

  res.status(200).json({
    success: true,
    data: banners
  });
});

// Get banner by ID
export const getBannerById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const banner = await Banner.findById(id);

  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found'
    });
  }

  res.status(200).json({
    success: true,
    data: banner
  });
});

// Get banners by location
export const getBannersByLocation = asyncHandler(async (req: Request, res: Response) => {
  debugger
  const { locationSlug } = req.params;
  const { isActive = true } = req.query;
  
  const query: any = {
    $or: [
      { LocationSlug: locationSlug },
      { LocationSlug: { $exists: false } },
      { LocationSlug: null }
    ]
  };
  
  if (isActive !== undefined) {
    query.IsActive = isActive === 'true';
  }

  const banners = await Banner.find(query)
    .sort({ Priority: -1, DocumentCreationDate: -1 })
    .populate('CreatedBy', 'UserName Email');

  res.status(200).json({
    success: true,
    data: banners
  });
});

// Update banner
export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  debugger
  const { id } = req.params;
  
  const banner = await Banner.findById(id);
  
  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found'
    });
  }

  // Process media fields (existing assets + new uploads)
  const processedData = processMediaFields(req);

  // Validate and transform banner data using Zod (final validation after upload)
  const validation = validateBanner(processedData);
  
  if (!validation.success) {
    // Clean up any newly uploaded files since validation failed
    await cleanupUploadedFiles(processedData);
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed after file upload',
      errors: validation.errors
    });
  }

  // Store old banner data for file cleanup
  const oldBannerData = banner.toObject();

  // Handle resource project specific logic
  const finalBannerData = _handleResourceProjectBannerLogic({ ...validation.data });

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

  res.status(200).json({
    success: true,
    data: updatedBanner,
    message: 'Banner updated successfully'
  });
});

// Delete banner
export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  debugger
  const { id } = req.params;
  
  const banner = await Banner.findById(id);
  
  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found'
    });
  }

  // Extract all file URLs from the banner before deletion
  const fileUrls = extractFileUrls(banner.toObject());
  
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

  res.status(200).json({
    success: true,
    message: 'Banner and associated files deleted successfully'
  });
});

// Toggle banner active status
export const toggleBannerStatus = asyncHandler(async (req: Request, res: Response) => {
  debugger
  const { id } = req.params;
  
  const banner = await Banner.findById(id);
  
  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found'
    });
  }

  banner.IsActive = !banner.IsActive;
  await banner.save();

  res.status(200).json({
    success: true,
    data: banner,
    message: `Banner ${banner.IsActive ? 'activated' : 'deactivated'} successfully`
  });
});

// Increment download count for resource banners
export const incrementDownloadCount = asyncHandler(async (req: Request, res: Response) => {
  debugger
  const { id } = req.params;
  
  const banner = await Banner.findById(id);
  
  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found'
    });
  }

  if (banner.TemplateType !== BannerTemplateType.RESOURCE_PROJECT) {
    return res.status(400).json({
      success: false,
      message: 'Download count can only be incremented for resource project banners'
    });
  }

  await banner.IncrementDownloadCount();

  res.status(200).json({
    success: true,
    data: { DownloadCount: banner.ResourceProject?.ResourceFile?.DownloadCount || 0 },
    message: 'Download count incremented'
  });
});

// Private helper to handle resource project specific logic
function _handleResourceProjectBannerLogic(bannerData: any): any {
  if (bannerData.TemplateType === BannerTemplateType.RESOURCE_PROJECT && bannerData.ResourceProject?.ResourceFile) {
    const resourceFile = bannerData.ResourceProject.ResourceFile;

    // If a new file was uploaded, its URL is in `Url`. We make this the permanent `FileUrl`.
    if (resourceFile.Url && !resourceFile.FileUrl) {
      bannerData.ResourceProject.ResourceFile.FileUrl = resourceFile.Url;
    }
    // Add foreach to populate Url depending on AutomaticallyPopulatedUrl
    // Update the 'Download' CTA button URL to use the file URL
    const fileUrl = bannerData.ResourceProject.ResourceFile.FileUrl;
    if (bannerData.CtaButtons && bannerData.CtaButtons.length > 0 && fileUrl) {
      const downloadButtonIndex = 0;

      const button = bannerData.CtaButtons[downloadButtonIndex];
        if (button && button.AutomaticallyPopulatedUrl) {
          button.Url = fileUrl;
        }
    }
  }
  return bannerData;
}

// Get banner statistics
export const getBannerStats = asyncHandler(async (req: Request, res: Response) => {
  debugger
  const stats = await Banner.aggregate([
    {
      $group: {
        _id: null,
        TotalBanners: { $sum: 1 },
        ActiveBanners: {
          $sum: { $cond: [{ $eq: ['$IsActive', true] }, 1, 0] }
        },
        InactiveBanners: {
          $sum: { $cond: [{ $eq: ['$IsActive', false] }, 1, 0] }
        }
      }
    }
  ]);

  const templateStats = await Banner.aggregate([
    {
      $group: {
        _id: '$TemplateType',
        Count: { $sum: 1 },
        Active: {
          $sum: { $cond: [{ $eq: ['$IsActive', true] }, 1, 0] }
        }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      Overview: stats[0] || { TotalBanners: 0, ActiveBanners: 0, InactiveBanners: 0 },
      ByTemplate: templateStats
    }
  });
});
