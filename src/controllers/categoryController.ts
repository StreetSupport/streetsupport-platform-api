import { Request, Response } from 'express';
import Category from '../models/categoryModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await Category.find().sort('SortOrder');
    res.status(200).json({ success: true, data: categories });
});

// @desc    Get single category by ID
// @route   GET /api/categories/:id
// @access  Private
export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }
    res.status(200).json({ success: true, data: category });
});

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
    );
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }
    res.status(200).json({ success: true, data: category });
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }
    res.status(200).json({ success: true, data: {} });
});
