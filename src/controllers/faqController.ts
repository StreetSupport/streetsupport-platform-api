import { Request, Response } from 'express';
import Faq from '../models/faqsModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendPaginatedSuccess } from '../utils/apiResponses.js';
import { validateFaq } from '../schemas/faqSchema.js';
import { ROLE_PREFIXES, ROLES } from '../constants/roles.js';

// @desc    Get all FAQs with optional filtering and pagination
// @route   GET /api/faqs
// @access  Private
export const getFaqs = asyncHandler(async (req: Request, res: Response) => {
  const {
    location,
    search,
    page = 1,
    limit = 9,
    sortBy = 'DocumentModifiedDate',
    sortOrder = 'desc'
  } = req.query;

  const query: any = {};
  const conditions: any[] = [];

  // Get user auth claims for role-based filtering
  const requestingUserAuthClaims = req.user?.AuthClaims || [];
  // const userId = req.user?._id;
  
  // Role-based filtering
  const isSuperAdmin = requestingUserAuthClaims.includes(ROLES.SUPER_ADMIN);
  const isVolunteerAdmin = requestingUserAuthClaims.includes(ROLES.VOLUNTEER_ADMIN);
  const isCityAdmin = requestingUserAuthClaims.includes(ROLES.CITY_ADMIN);

  // CityAdmin: only see organisations from their cities
  if (isCityAdmin && !isSuperAdmin && !isVolunteerAdmin) {
    const cityAdminLocations = requestingUserAuthClaims
      .filter(claim => claim.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR))
      .map(claim => claim.replace(ROLE_PREFIXES.CITY_ADMIN_FOR, ''));
    
    if (cityAdminLocations.length > 0) {
      conditions.push({ LocationKey: { $in: cityAdminLocations } });
    }
  }

  // Apply search filter - search by Title or Body
  if (search && typeof search === 'string') {
    const searchTerm = search.trim();
    conditions.push({
      $or: [
        { Title: { $regex: searchTerm, $options: 'i' } },
        { Body: { $regex: searchTerm, $options: 'i' } }
      ]
    });
  }

  // Apply location filter
  if (location && typeof location === 'string') {
    conditions.push({ LocationKey: location });
  }

  // Combine all conditions with AND logic
  if (conditions.length > 0) {
    query.$and = conditions;
  }

  // Pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Sort options
  const sortOptions: any = {};
  sortOptions[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

  const faqs = await Faq.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Get total count using the same query
  const total = await Faq.countDocuments(query);

  return sendPaginatedSuccess(res, faqs, {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit))
  });
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
  // Validate the request data
  const validation = validateFaq(req.body);
  
  if (!validation.success) {
    const errorMessages = validation.errors.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  if (!validation.data) {
    return sendBadRequest(res, 'Validation data is missing');
  }

  // Add system fields
  const faqData = {
    ...validation.data,
    CreatedBy: req.user?._id || req.body?.CreatedBy,
    DocumentCreationDate: new Date(),
    DocumentModifiedDate: new Date(),
  };

  const faq = await Faq.create(faqData);
  return sendCreated(res, faq);
});

// @desc    Update FAQ
// @route   PUT /api/faqs/:id
// @access  Private
export const updateFaq = asyncHandler(async (req: Request, res: Response) => {
  // Check if FAQ exists
  const existingFaq = await Faq.findById(req.params.id);
  if (!existingFaq) {
    return sendNotFound(res, 'FAQ not found');
  }

  // Validate the request data
  const validation = validateFaq(req.body);
  
  if (!validation.success) {
    const errorMessages = validation.errors.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  if (!validation.data) {
    return sendBadRequest(res, 'Validation data is missing');
  }

  // Update FAQ with validated data
  const faq = await Faq.findByIdAndUpdate(
    req.params.id,
    {
      ...validation.data,
      DocumentModifiedDate: new Date()
    },
    { new: true, runValidators: true }
  );

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
