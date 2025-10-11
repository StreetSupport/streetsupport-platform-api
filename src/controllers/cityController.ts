import { Request, Response } from 'express';
import Cities from '@/models/cityModel.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNotFound } from '@/utils/apiResponses.js';
import mongoose from 'mongoose';

/**
 * @desc Get all cities with optional role-based filtering
 * @route GET /api/cities
 * @access Private
 */
export const getCities = asyncHandler(async (req: Request, res: Response) => {
  const { locations } = req.query; // Optional: comma-separated list of location slugs for filtering
  
  // Build query based on location filter
  const query: any = {};
  
  if (locations && typeof locations === 'string') {
    // Filter by specific locations (used for CityAdmin users)
    const locationArray = locations.split(',').map(loc => loc.trim()).filter(Boolean);
    if (locationArray.length > 0) {
      query.Key = { $in: locationArray };
    }
  }
  
  const cities = await Cities.find(query).lean();
  return sendSuccess(res, cities);
});

/**
 * @desc Get single city by id
 * @route GET /api/cities/:id
 * @access Private
 */
export const getCityById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const city = await Cities.findById(id);

  if (!city) {
    return sendNotFound(res, 'City not found');
  }

  return sendSuccess(res, city);
});

/**
 * @desc Create a city
 * @route POST /api/cities
 * @access Private
 */
export const createCity = asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body || {};

  // Ensure an ObjectId exists if not provided
  if (!payload._id) {
    payload._id = new mongoose.Types.ObjectId();
  }

  // Maintain audit fields
  payload.DocumentCreationDate = payload.DocumentCreationDate || new Date();
  payload.DocumentModifiedDate = new Date();

  const created = await Cities.create(payload);
  return sendCreated(res, created);
});

/**
 * @desc Update a city
 * @route PUT /api/cities/:id
 * @access Private
 */
export const updateCity = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = { ...req.body, DocumentModifiedDate: new Date() };

  const updated = await Cities.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!updated) {
    return sendNotFound(res, 'City not found');
  }

  return sendSuccess(res, updated);
});

/**
 * @desc Delete a city
 * @route DELETE /api/cities/:id
 * @access Private
 */
export const deleteCity = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await Cities.findByIdAndDelete(id).lean();

  if (!deleted) {
    return sendNotFound(res, 'City not found');
  }

  return sendSuccess(res, deleted, 'City deleted');
});
