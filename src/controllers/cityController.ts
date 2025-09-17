import { Request, Response } from 'express';
import Cities from '@/models/cityModel.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import mongoose from 'mongoose';

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

/**
 * @desc Get single city by id
 * @route GET /api/cities/:id
 * @access Private
 */
export const getCityById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const city = await Cities.findById(id).lean();

    if (!city) {
        return res.status(404).json({ success: false, message: 'City not found' });
    }

    res.status(200).json({ success: true, data: city });
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

    res.status(201).json({ success: true, data: created });
});

/**
 * @desc Update a city
 * @route PUT /api/cities/:id
 * @access Private
 */
export const updateCity = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = { ...req.body, DocumentModifiedDate: new Date() };

    const updated = await Cities.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
    if (!updated) {
        return res.status(404).json({ success: false, message: 'City not found' });
    }

    res.status(200).json({ success: true, data: updated });
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
        return res.status(404).json({ success: false, message: 'City not found' });
    }

    res.status(200).json({ success: true, message: 'City deleted', data: deleted });
});
