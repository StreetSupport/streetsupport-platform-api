import { Request, Response } from 'express';
import Cities from '../models/cityModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc Get all cities
 * @route GET /api/cities
 * @access Private
 */
export const getCities = asyncHandler(async (req: Request, res: Response) => {
    const cities = await Cities.find().lean();

    res.status(200).json({
        success: true,
        data: cities,
    });
});
