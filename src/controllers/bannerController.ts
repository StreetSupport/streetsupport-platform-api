import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import Banner, { IBanner, BannerTemplateType } from '../models/bannerModel.js';
import { validateBannerData } from '../utils/bannerValidation.js';

// Get all banners with optional filtering
export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  const { 
    location, 
    templateType, 
    isActive, 
    page = 1, 
    limit = 10,
    sortBy = 'priority',
    sortOrder = 'desc'
  } = req.query;

  const query: any = {};
  
  // Apply filters
  if (location) {
    query.$or = [
      { locationSlug: location },
      { locationSlug: { $exists: false } },
      { locationSlug: null }
    ];
  }
  
  if (templateType) {
    query.templateType = templateType;
  }
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);
  
  // Sort options
  const sortOptions: any = {};
  sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
  
  const banners = await Banner.find(query)
    .populate('createdBy', 'UserName Email')
    .populate('updatedBy', 'UserName Email')
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
  const { location, maxDisplay = 3 } = req.query;
  
  const banners = await Banner.findActive(location as string)
    .limit(Number(maxDisplay));

  res.status(200).json({
    success: true,
    data: banners.map(banner => banner.toPublicJSON())
  });
});

// Get banner by ID
export const getBannerById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const banner = await Banner.findById(id)
    .populate('createdBy', 'UserName Email')
    .populate('updatedBy', 'UserName Email');

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
  const { locationSlug } = req.params;
  const { isActive = true } = req.query;
  
  const query: any = {
    $or: [
      { locationSlug },
      { locationSlug: { $exists: false } },
      { locationSlug: null }
    ]
  };
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const banners = await Banner.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .populate('createdBy', 'UserName Email');

  res.status(200).json({
    success: true,
    data: banners.map(banner => banner.toPublicJSON())
  });
});

// Create new banner
export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  // Validate banner data
  const validation = validateBannerData(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  // Add creator information
  const bannerData = {
    ...req.body,
    createdBy: req.user?.id || req.body.createdBy
  };

  const banner = await Banner.create(bannerData);
  
  await banner.populate('createdBy', 'UserName Email');

  res.status(201).json({
    success: true,
    data: banner,
    message: 'Banner created successfully'
  });
});

// Update banner
export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const banner = await Banner.findById(id);
  
  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found'
    });
  }

  // Validate updated data
  const validation = validateBannerData(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  // Update banner
  const updatedBanner = await Banner.findByIdAndUpdate(
    id,
    {
      ...req.body,
      updatedBy: req.user?.id || req.body.updatedBy,
      updatedAt: new Date()
    },
    { new: true, runValidators: true }
  ).populate('createdBy updatedBy', 'UserName Email');

  res.status(200).json({
    success: true,
    data: updatedBanner,
    message: 'Banner updated successfully'
  });
});

// Delete banner
export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const banner = await Banner.findById(id);
  
  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found'
    });
  }

  await Banner.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Banner deleted successfully'
  });
});

// Toggle banner active status
export const toggleBannerStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const banner = await Banner.findById(id);
  
  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found'
    });
  }

  banner.isActive = !banner.isActive;
  banner.updatedBy = req.user?.id;
  await banner.save();

  res.status(200).json({
    success: true,
    data: banner,
    message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`
  });
});

// Increment download count for resource banners
export const incrementDownloadCount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const banner = await Banner.findById(id);
  
  if (!banner) {
    return res.status(404).json({
      success: false,
      message: 'Banner not found'
    });
  }

  if (banner.templateType !== BannerTemplateType.RESOURCE_PROJECT) {
    return res.status(400).json({
      success: false,
      message: 'Download count can only be incremented for resource project banners'
    });
  }

  await banner.incrementDownloadCount();

  res.status(200).json({
    success: true,
    data: { downloadCount: banner.downloadCount },
    message: 'Download count incremented'
  });
});

// Get banner statistics
export const getBannerStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await Banner.aggregate([
    {
      $group: {
        _id: null,
        totalBanners: { $sum: 1 },
        activeBanners: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        inactiveBanners: {
          $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
        }
      }
    }
  ]);

  const templateStats = await Banner.aggregate([
    {
      $group: {
        _id: '$templateType',
        count: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: stats[0] || { totalBanners: 0, activeBanners: 0, inactiveBanners: 0 },
      byTemplate: templateStats
    }
  });
});
