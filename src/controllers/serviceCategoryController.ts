import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendNotFound, sendInternalError } from '../utils/apiResponses.js';
import ServiceCategory from '../models/serviceCategoryModel.js';

/**
 * @desc    Get all service categories with subcategories
 * @route   GET /api/service-categories
 * @access  Private
 */
export const getServiceCategories = asyncHandler(async (req: Request, res: Response) => {
  try {
    const categories = await ServiceCategory.find({}).lean();
    
    if (!categories || categories.length === 0) {
      return sendNotFound(res, 'No service categories found');
    }

    return sendSuccess(res, categories);
  } catch (error) {
    console.error('Error fetching service categories:', error);
    return sendInternalError(res, 'Failed to fetch service categories');
  }
});
