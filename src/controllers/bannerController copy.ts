import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BannerTemplateType, IBanner } from '@/types/index.js';
import { validateBannerData } from '../utils/bannerValidation.js';
import Banner from '@/models/bannerModel.js';
import { deleteFile } from '../middleware/uploadMiddleware.js';
import { IMediaAsset } from '@/types/IMediaAssetSchema.js';
import { Types } from 'mongoose';

// Helper function to extract all file URLs from a banner
function extractFileUrls(banner: any): string[] {
  const urls: string[] = [];
  
  // Main media assets
  if (banner.Logo?.Url) urls.push(banner.Logo.Url);
  if (banner.BackgroundImage?.Url) urls.push(banner.BackgroundImage.Url);
  if (banner.SplitImage?.Url) urls.push(banner.SplitImage.Url);
  
  // Partner logos for partnership charter banners
  if (banner.PartnerLogos && Array.isArray(banner.PartnerLogos)) {
    banner.PartnerLogos.forEach((logo: any) => {
      if (logo.Url) urls.push(logo.Url);
    });
  }
  
  // Resource files for resource project banners
  if (banner.ResourceFile && banner.ResourceFile.FileUrl) {
    urls.push(banner.ResourceFile.FileUrl);
  }
  
  return urls;
}

// Helper function to transform form data to IBanner type with proper nested object parsing
function transformToBannerData(data: any): { data: IBanner; errors: string[] } {
  // Start with a copy of the data and transform it step by step
  const transformed: any = { ...data };
  const errors: string[] = [];

  // Parse JSON string fields
  const jsonFields = ['Background', 'CtaButtons', 'DonationGoal', 'ResourceFile', 'AccentGraphic'];
  for (const field of jsonFields) {
    if (typeof data[field] === 'string') {
      try {
        transformed[field] = JSON.parse(data[field]);
      } catch (e) {
        console.warn(`Failed to parse ${field}:`, e);
        errors.push(`Failed to parse ${field} as JSON`);
        // Keep original value for transparency; we will fail fast on errors
        transformed[field] = data[field];
      }
    }
  }

  // Convert boolean strings to booleans
  if (data.IsActive === 'true') transformed.IsActive = true;
  if (data.IsActive === 'false') transformed.IsActive = false;
  if (data.ShowDates === 'true') transformed.ShowDates = true;
  if (data.ShowDates === 'false') transformed.ShowDates = false;

  // Convert numeric strings to numbers
  if (data.Priority && typeof data.Priority === 'string') {
    const parsed = parseInt(data.Priority, 10);
    if (Number.isNaN(parsed)) {
      errors.push('Priority must be a number');
    } else {
      transformed.Priority = parsed;
    }
  }
  if (data.SignatoriesCount && typeof data.SignatoriesCount === 'string') {
    const parsed = parseInt(data.SignatoriesCount, 10);
    if (Number.isNaN(parsed)) {
      errors.push('SignatoriesCount must be a number');
    } else {
      transformed.SignatoriesCount = parsed;
    }
  }

  // Convert date strings to Date objects
  if (data.StartDate && typeof data.StartDate === 'string') {
    try {
      const dateStr = data.StartDate.replace(/^"|"$/g, '');
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        errors.push('StartDate must be a valid date');
      } else {
        transformed.StartDate = d;
      }
    } catch (e) {
      console.warn('Failed to parse StartDate:', e);
      errors.push('Failed to parse StartDate');
    }
  }
  if (data.EndDate && typeof data.EndDate === 'string') {
    try {
      const dateStr = data.EndDate.replace(/^"|"$/g, '');
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        errors.push('EndDate must be a valid date');
      } else {
        transformed.EndDate = d;
      }
    } catch (e) {
      console.warn('Failed to parse EndDate:', e);
      errors.push('Failed to parse EndDate');
    }
  }
  if (data.CampaignEndDate && typeof data.CampaignEndDate === 'string') {
    try {
      const dateStr = data.CampaignEndDate.replace(/^"|"$/g, '');
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        errors.push('CampaignEndDate must be a valid date');
      } else {
        transformed.CampaignEndDate = d;
      }
    } catch (e) {
      console.warn('Failed to parse CampaignEndDate:', e);
      errors.push('Failed to parse CampaignEndDate');
    }
  }

  // Transform nested objects if they exist
  if (transformed.DonationGoal && typeof transformed.DonationGoal === 'object') {
    const goal = transformed.DonationGoal;
    if (typeof goal.Target === 'string') {
      const n = parseFloat(goal.Target);
      if (Number.isNaN(n)) {
        errors.push('DonationGoal.Target must be a number');
      } else {
        goal.Target = n;
      }
    }
    if (typeof goal.Current === 'string') {
      const n = parseFloat(goal.Current);
      if (Number.isNaN(n)) {
        errors.push('DonationGoal.Current must be a number');
      } else {
        goal.Current = n;
      }
    }
  }

  if (transformed.Background && typeof transformed.Background === 'object') {
    const bg = transformed.Background;
    if (bg.Overlay && typeof bg.Overlay === 'object') {
      if (typeof bg.Overlay.Opacity === 'string') {
        const n = parseFloat(bg.Overlay.Opacity);
        if (Number.isNaN(n)) {
          errors.push('Background.Overlay.Opacity must be a number');
        } else {
          bg.Overlay.Opacity = n;
        }
      }
    }
  }

  // Transform CTA buttons array
  if (transformed.CtaButtons && Array.isArray(transformed.CtaButtons)) {
    transformed.CtaButtons = transformed.CtaButtons.map((button: any) => {
      if (typeof button.External === 'string') {
        button.External = button.External === 'true';
      }
      return button;
    });
  }

  // Transform resource file if it exists
  if (transformed.ResourceFile && typeof transformed.ResourceFile === 'object') {
    const resource = transformed.ResourceFile;
    if (typeof resource.DownloadCount === 'string') {
      const parsed = parseInt(resource.DownloadCount, 10);
      if (Number.isNaN(parsed)) {
        errors.push('ResourceFile.DownloadCount must be a number');
      } else {
        resource.DownloadCount = parsed;
      }
    }
    if (resource.LastUpdated && typeof resource.LastUpdated === 'string') {
      try {
        const d = new Date(resource.LastUpdated);
        if (isNaN(d.getTime())) {
          errors.push('ResourceFile.LastUpdated must be a valid date');
        } else {
          resource.LastUpdated = d;
        }
      } catch (e) {
        console.warn('Failed to parse ResourceFile.LastUpdated:', e);
        errors.push('Failed to parse ResourceFile.LastUpdated');
      }
    }
  }

  // Ensure required fields have default values if missing
  if (!transformed.CtaButtons) transformed.CtaButtons = [];
  if (!transformed.IsActive && transformed.IsActive !== false) transformed.IsActive = true;
  if (!transformed.Priority && transformed.Priority !== 0) transformed.Priority = 1;

  // Return as IBanner type (TypeScript will enforce the interface at compile time)
  transformed._id = new Types.ObjectId();
  delete transformed['DocumentCreationDate'];
  delete transformed['DocumentModifiedDate'];
  return { data: transformed as IBanner, errors };
}

// Helper function to process mixed media fields (existing assets + new files)
function processMediaFields(req: Request): any {
  const processedData = { ...req.body };
  
  // Process single media fields
  const singleMediaFields = ['Logo', 'BackgroundImage', 'SplitImage'];
  
  for (const fieldName of singleMediaFields) {
    const existingKey = `existing_${fieldName}`;
    const newKey = `new_${fieldName}`;
    
    if (req.body[existingKey]) {
      // Keep existing asset
      processedData[fieldName] = JSON.parse(req.body[existingKey]);
    } else if (req.body[newKey]) {
      // New file was uploaded and processed by middleware
      processedData[fieldName] = req.body[newKey];
    }
    
    // Clean up form data keys
    delete processedData[existingKey];
    delete processedData[newKey];
  }
  
  // Process PartnerLogos array field
  const existingPartnerLogos = req.body.existing_PartnerLogos 
    ? JSON.parse(req.body.existing_PartnerLogos) 
    : [];
  
  const newPartnerLogos = req.body.new_PartnerLogos || [];
  
  // Combine existing and new partner logos
  processedData.PartnerLogos = [
    ...existingPartnerLogos, 
    ...(Array.isArray(newPartnerLogos) ? newPartnerLogos : [newPartnerLogos])
  ].filter(Boolean);
  
  // Clean up form data keys
  delete processedData.existing_PartnerLogos;
  delete processedData.new_PartnerLogos;
  
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

// Get all banners with optional filtering
export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  const { 
    location, 
    templateType, 
    isActive, 
    page = 1, 
    limit = 10,
    sortBy = 'Priority',
    sortOrder = 'desc'
  } = req.query;

  const query: any = {};
  
  // Apply filters
  if (location) {
    query.$or = [
      { LocationSlug: location },
      { LocationSlug: { $exists: false } },
      { LocationSlug: null }
    ];
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

// Create new banner
export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  debugger
  
  // Process media fields (existing assets + new uploads)
  const processedData = processMediaFields(req);

  // Convert to IBanner with proper type transformation
  const { data: transformedBannerData, errors: transformErrors } = transformToBannerData(processedData);

  // Fail fast if transformation produced errors
  if (transformErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data format', 
      errors: transformErrors
    });
  }

  // Validate banner data
  const validation = validateBannerData(transformedBannerData);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  // Add creator information
  const bannerData = {
    ...transformedBannerData,
    CreatedBy: req.user?.id || transformedBannerData.CreatedBy
  };

  const banner = await Banner.create(bannerData);

  res.status(201).json({
    success: true,
    data: banner,
    message: 'Banner created successfully'
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

  // Transform and validate updated data
  const { data: transformedBannerData, errors: transformErrors } = transformToBannerData(processedData);

  // Fail fast if transformation produced errors
  if (transformErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data format',
      errors: transformErrors
    });
  }

  const validation = validateBannerData(transformedBannerData);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  // Store old banner data for file cleanup
  const oldBannerData = banner.toObject();

  // Update banner
  const updatedBanner = await Banner.findByIdAndUpdate(
    id,
    {
      ...transformedBannerData,
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
    data: { DownloadCount: banner.ResourceFile?.DownloadCount || 0 },
    message: 'Download count incremented'
  });
});

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
