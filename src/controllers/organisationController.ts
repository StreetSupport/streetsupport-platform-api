import { Request, Response } from 'express';
import Organisation from '../models/organisationModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendPaginatedSuccess, sendForbidden } from '../utils/apiResponses.js';
import { ROLES, ROLE_PREFIXES } from '../constants/roles.js';
import { validateOrganisation } from 'schemas/organisationSchema.js';

// @desc    Get all organisations with optional filtering and search
// @route   GET /api/organisations
// @access  Private
export const getOrganisations = asyncHandler(async (req: Request, res: Response) => {
  const { 
    search,  // Name search
    location,
    locations, // Comma-separated list for CityAdmin filtering
    isVerified, // 'true', 'false', or undefined (Either)
    isPublished, // 'true', 'false', or undefined (Either)
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
  // const isOrgAdmin = requestingUserAuthClaims.includes(ROLES.ORG_ADMIN);
  
  // OrgAdmin: only see their own organisations (based on Administrators field)
  // if (isOrgAdmin && !isSuperAdmin && !isVolunteerAdmin && !isCityAdmin) {
  //   conditions.push({ Administrators: userId });
  // }
  
  // CityAdmin: only see organisations from their cities
  if (isCityAdmin && !isSuperAdmin && !isVolunteerAdmin) {
    const cityAdminLocations = requestingUserAuthClaims
      .filter(claim => claim.startsWith(ROLE_PREFIXES.CITY_ADMIN_FOR))
      .map(claim => claim.replace(ROLE_PREFIXES.CITY_ADMIN_FOR, ''));
    
    if (cityAdminLocations.length > 0) {
      conditions.push({ AssociatedLocationIds: { $in: cityAdminLocations } });
    }
  }
  
  // Apply name search filter
  if (search && typeof search === 'string') {
    conditions.push({ Name: { $regex: search.trim(), $options: 'i' } });
  }
  
  // Apply location filter
  if (locations && typeof locations === 'string') {
    const locationArray = locations.split(',').map(loc => loc.trim()).filter(Boolean);
    if (locationArray.length > 0) {
      conditions.push({ AssociatedLocationIds: { $in: locationArray } });
    }
  } else if (location && typeof location === 'string') {
    conditions.push({ AssociatedLocationIds: location });
  }
  
  // Apply IsVerified filter
  if (isVerified !== undefined && isVerified !== 'undefined') {
    conditions.push({ IsVerified: isVerified === 'true' });
  }
  
  // Apply IsPublished filter
  if (isPublished !== undefined && isPublished !== 'undefined') {
    conditions.push({ IsPublished: isPublished === 'true' });
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
  
  const providers = await Organisation.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Get total count using the same query
  const total = await Organisation.countDocuments(query);

  return sendPaginatedSuccess(res, providers, {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit))
  });
});

// @desc    Get single organisation by ID
// @route   GET /api/organisations/:id
// @access  Private
export const getOrganisationById = asyncHandler(async (req: Request, res: Response) => {
  const provider = await Organisation.findById(req.params.id);
  if (!provider) {
    return sendNotFound(res, 'Organisation not found');
  }
  return sendSuccess(res, provider);
});

// @desc    Create new organisation
// @route   POST /api/organisations
// @access  Private
export const createOrganisation = asyncHandler(async (req: Request, res: Response) => {
  // Validate the request data first
  const validation = validateOrganisation(req.body);
  
  if (!validation.success) {
    const errorMessages = validation.errors.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  if (!validation.data) {
    return sendBadRequest(res, 'Validation data is missing');
  }

  // Add system fields
  const organisationData = {
    ...validation.data,
    CreatedBy: req.user?._id || req.body?.CreatedBy,
    DocumentCreationDate: new Date(),
    DocumentModifiedDate: new Date(),
    IsVerified: false,
    IsPublished: false,
  };

  const provider = await Organisation.create(organisationData);
  return sendCreated(res, provider);
});

// @desc    Update organisation
// @route   PUT /api/organisations/:id
// @access  Private
export const updateOrganisation = asyncHandler(async (req: Request, res: Response) => {
  const provider = await Organisation.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    { new: true, runValidators: true }
  );
  if (!provider) {
    return sendNotFound(res, 'Service provider not found');
  }
  return sendSuccess(res, provider);
});

// @desc    Delete organisation
// @route   DELETE /api/organisations/:id
// @access  Private
export const deleteOrganisation = asyncHandler(async (req: Request, res: Response) => {
  const provider = await Organisation.findByIdAndDelete(req.params.id).lean();
  if (!provider) {
    return sendNotFound(res, 'Service provider not found');
  }
  return sendSuccess(res, {}, 'Service provider deleted');
});

// @desc    Toggle service provider verified status
// @route   PATCH /api/service-providers/:id/toggle-verified
// @access  Private
export const toggleVerified = asyncHandler(async (req: Request, res: Response) => {
  const provider = await Organisation.findById(req.params.id);
  
  if (!provider) {
    return sendNotFound(res, 'Organisation not found');
  }
  
  // Toggle the IsVerified status
  provider.IsVerified = !provider.IsVerified;
  provider.DocumentModifiedDate = new Date();
  
  await provider.save();
  
  return sendSuccess(res, provider, `Organisation ${provider.IsVerified ? 'verified' : 'unverified'} successfully`);
});

// @desc    Toggle organisation published status
// @route   PATCH /api/organisations/:id/toggle-published
// @access  Private
export const togglePublished = asyncHandler(async (req: Request, res: Response) => {
  const provider = await Organisation.findById(req.params.id);
  
  if (!provider) {
    return sendNotFound(res, 'Organisation not found');
  }
  
  // Toggle the IsPublished status
  provider.IsPublished = !provider.IsPublished;
  provider.DocumentModifiedDate = new Date();
  
  // If disabling, optionally add a note from the request body
  if (!provider.IsPublished && req.body.note) {
    const note = {
      CreationDate: new Date(),
      Date: new Date(),
      StaffName: req.body.note.StaffName || req.user?.UserName || 'System',
      Reason: req.body.note.Reason || 'Organisation disabled'
    };
    provider.Notes.push(note);
  }
  
  await provider.save();
  
  return sendSuccess(res, provider, `Organisation ${provider.IsPublished ? 'published' : 'disabled'} successfully`);
});

// @desc    Clear all notes from organisation
// @route   DELETE /api/organisations/:id/notes
// @access  Private
export const clearNotes = asyncHandler(async (req: Request, res: Response) => {
  const provider = await Organisation.findById(req.params.id);
  
  if (!provider) {
    return sendNotFound(res, 'Organisation not found');
  }
  
  provider.Notes = [];
  provider.DocumentModifiedDate = new Date();
  
  await provider.save();
  
  return sendSuccess(res, provider, 'All notes cleared successfully');
});

// @desc    Add note to organisation
// @route   POST /api/organisations/:id/notes
// @access  Private
export const addNote = asyncHandler(async (req: Request, res: Response) => {
  const provider = await Organisation.findById(req.params.id);
  
  if (!provider) {
    return sendNotFound(res, 'Organisation not found');
  }
  
  const { StaffName, Reason } = req.body;
  
  if (!StaffName || !StaffName.trim()) {
    return sendBadRequest(res, 'Staff name is required');
  }

  if (!Reason || !Reason.trim()) {
    return sendBadRequest(res, 'Reason is required');
  }
  
  const note = {
    CreationDate: new Date(),
    Date: new Date(),
    StaffName: StaffName,
    Reason: Reason.trim()
  };
  
  provider.Notes.push(note);
  provider.DocumentModifiedDate = new Date();
  
  await provider.save();
  
  return sendSuccess(res, provider, 'Note added successfully');
});
