import { Request, Response } from 'express';
import Faq from '@/models/faqsModel.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNotFound } from '@/utils/apiResponses.js';

// @desc    Get all FAQs
// @route   GET /api/faqs
// @access  Private
export const getFaqs = asyncHandler(async (req: Request, res: Response) => {
  const faqs = await Faq.find().sort('SortPosition').lean();
  return sendSuccess(res, faqs);
});

// @desc    Get single FAQ by ID
// @route   GET /api/faqs/:id
// @access  Private
export const getFaqById = asyncHandler(async (req: Request, res: Response) => {
  const faq = await Faq.findById(req.params.id);
  if (!faq) {
    return sendNotFound(res, 'FAQ not found');
  }
  return sendSuccess(res, faq);
});


// @desc    Create new FAQ
// @route   POST /api/faqs
// @access  Private
export const createFaq = asyncHandler(async (req: Request, res: Response) => {
  const faq = await Faq.create(req.body);
  return sendCreated(res, faq);
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
    return sendNotFound(res, 'FAQ not found');
  }
  return sendSuccess(res, faq);
});

// @desc    Delete FAQ
// @route   DELETE /api/faqs/:id
// @access  Private
export const deleteFaq = asyncHandler(async (req: Request, res: Response) => {
  const faq = await Faq.findByIdAndDelete(req.params.id).lean();
  if (!faq) {
    return sendNotFound(res, 'FAQ not found');
  }
  return sendSuccess(res, {}, 'FAQ deleted');
});
