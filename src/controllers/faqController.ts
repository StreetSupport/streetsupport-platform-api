import { Request, Response } from 'express';
import Faq from '../models/faqsModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get all FAQs
// @route   GET /api/faqs
// @access  Private
export const getFaqs = asyncHandler(async (req: Request, res: Response) => {
    const faqs = await Faq.find().sort('SortPosition');
    res.status(200).json({ success: true, data: faqs });
});

// @desc    Get single FAQ by ID
// @route   GET /api/faqs/:id
// @access  Private
export const getFaqById = asyncHandler(async (req: Request, res: Response) => {
    const faq = await Faq.findById(req.params.id);
    if (!faq) {
        res.status(404);
        throw new Error('FAQ not found');
    }
    res.status(200).json({ success: true, data: faq });
});

// @desc    Create new FAQ
// @route   POST /api/faqs
// @access  Private
export const createFaq = asyncHandler(async (req: Request, res: Response) => {
    const faq = await Faq.create(req.body);
    res.status(201).json({ success: true, data: faq });
});

// @desc    Update FAQ
// @route   PUT /api/faqs/:id
// @access  Private
export const updateFaq = asyncHandler(async (req: Request, res: Response) => {
    const faq = await Faq.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
    );
    if (!faq) {
        res.status(404);
        throw new Error('FAQ not found');
    }
    res.status(200).json({ success: true, data: faq });
});

// @desc    Delete FAQ
// @route   DELETE /api/faqs/:id
// @access  Private
export const deleteFaq = asyncHandler(async (req: Request, res: Response) => {
    const faq = await Faq.findByIdAndDelete(req.params.id);
    if (!faq) {
        res.status(404);
        throw new Error('FAQ not found');
    }
    res.status(200).json({ success: true, data: {} });
});
