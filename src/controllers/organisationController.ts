import { Request, Response } from 'express';
import Organisation from '../models/organisationModel.js';
import GroupedService from '../models/groupedServiceModel.js';
import Service from '../models/serviceModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendPaginatedSuccess } from '../utils/apiResponses.js';
import { ROLES, ROLE_PREFIXES } from '../constants/roles.js';
import { validateOrganisation } from 'schemas/organisationSchema.js';
import { processAddressesWithCoordinates, updateLocationIfPostcodeChanged } from '../utils/postcodeValidation.js';

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
  // Initialize location coordinates from postcodes for all addresses
  const organisationData = {
    ...validation.data,
    CreatedBy: req.user?._id || req.body?.CreatedBy,
    DocumentCreationDate: new Date(),
    DocumentModifiedDate: new Date(),
    IsVerified: false,
    IsPublished: false,
  };

  // Process addresses to initialize Location coordinates from postcodes
  if (organisationData.Addresses && organisationData.Addresses.length > 0) {
    await processAddressesWithCoordinates(organisationData.Addresses);
  }

  const provider = await Organisation.create(organisationData);
  return sendCreated(res, provider);
});

// @desc    Update organisation
// @route   PUT /api/organisations/:id
// @access  Private
export const updateOrganisation = asyncHandler(async (req: Request, res: Response) => {
  // Get existing organisation to compare postcodes
  const existingProvider = await Organisation.findById(req.params.id);
  if (!existingProvider) {
    return sendNotFound(res, 'Organisation not found');
  }

  // Validate the request data first
  const { validateOrganisation } = await import('../schemas/organisationSchema.js');
  const validation = validateOrganisation(req.body);
  
  if (!validation.success) {
    const errorMessages = validation.errors.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  if (!validation.data) {
    return sendBadRequest(res, 'Validation data is missing');
  }

  // Prepare update data using validated data
  // Exclude Key field - it should never be updated after creation
  const { Key, ...validatedDataWithoutKey } = validation.data;
  const updateData = {
    ...validatedDataWithoutKey,
    DocumentModifiedDate: new Date()
  };

  // Check if any address postcodes have changed and update coordinates accordingly
  if (updateData.Addresses && updateData.Addresses.length > 0) {
    for (let i = 0; i < updateData.Addresses.length; i++) {
      const newAddress = updateData.Addresses[i];
      const oldAddress = existingProvider.Addresses?.[i];
      
      if (oldAddress && newAddress.Postcode) {
        // Update location if postcode changed
        await updateLocationIfPostcodeChanged(
          oldAddress.Postcode, 
          newAddress.Postcode, 
          newAddress
        );
      } else if (newAddress.Postcode && !newAddress.Location) {
        // Initialize location for new addresses
        await processAddressesWithCoordinates([newAddress]);
      }
    }
  }

  const provider = await Organisation.findByIdAndUpdate(
    req.params.id, 
    updateData,
    { new: true, runValidators: true }
  );
  
  if (!provider) {
    return sendNotFound(res, 'Organisation not found');
  }
  
  return sendSuccess(res, provider);
});

// @desc    Delete organisation and all related services
// @route   DELETE /api/organisations/:id
// @access  Private
export const deleteOrganisation = asyncHandler(async (req: Request, res: Response) => {
  const provider = await Organisation.findByIdAndDelete(req.params.id).lean();
  if (!provider) {
    return sendNotFound(res, 'Service provider not found');
  }
  
  // Delete all grouped services associated with this organisation (using Key, not _id)
  const groupedServices = await GroupedService.find({ ProviderId: provider.Key }).lean();
  const groupedServiceIds = groupedServices.map(gs => gs._id);
  
  // Delete all individual services (ProvidedServices) for these grouped services
  if (groupedServiceIds.length > 0) {
    await Service.deleteMany({ ServiceProviderKey: provider.Key },);
  }
  
  // Delete all grouped services
  await GroupedService.deleteMany({ ProviderId: provider.Key });
  
  return sendSuccess(res, {}, 'Organisation and all related services deleted successfully');
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

// @desc    Toggle organisation published status and cascade to related services
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
  
  // Cascade IsPublished status to all related grouped services
  const groupedServices = await GroupedService.find({ ProviderId: provider.Key });
  
  // Update all grouped services
  await GroupedService.updateMany(
    { ProviderId: provider.Key },
    { 
      $set: { 
        IsPublished: provider.IsPublished,
        DocumentModifiedDate: new Date()
      } 
    }
  );
  
  // Update all individual services (ProvidedServices) using ServiceProviderKey
  await Service.updateMany(
    { ServiceProviderKey: provider.Key },
    { 
      $set: { 
        IsPublished: provider.IsPublished,
        DocumentModifiedDate: new Date()
      } 
    }
  );
  
  return sendSuccess(res, provider, `Organisation ${provider.IsPublished ? 'published' : 'disabled'} successfully. ${groupedServices.length} related services also updated.`);
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
