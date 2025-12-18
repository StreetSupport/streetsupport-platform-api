import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Organisation from '../models/organisationModel.js';
import GroupedService from '../models/groupedServiceModel.js';
import Service from '../models/serviceModel.js';
import Accommodation from '../models/accommodationModel.js';
import User from '../models/userModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendPaginatedSuccess, sendInternalError } from '../utils/apiResponses.js';
import { ROLES, ROLE_PREFIXES } from '../constants/roles.js';
import { validateOrganisation } from '../schemas/organisationSchema.js';
import { processAddressesWithCoordinates, updateLocationIfPostcodeChanged } from '../utils/postcodeValidation.js';
import { decryptEmail } from '../utils/encryption.js';
import { INote } from '../types/index.js';

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
  const isSuperAdmin = requestingUserAuthClaims.includes(ROLES.SUPER_ADMIN) || requestingUserAuthClaims.includes(ROLES.SUPER_ADMIN_PLUS);
  const isVolunteerAdmin = requestingUserAuthClaims.includes(ROLES.VOLUNTEER_ADMIN);
  const isCityAdmin = requestingUserAuthClaims.includes(ROLES.CITY_ADMIN);

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

// @desc    Get single organisation by Key
// @route   GET /api/organisations/:key
// @access  Private
export const getOrganisationByKey = asyncHandler(async (req: Request, res: Response) => {
  const provider = await Organisation.findOne({ Key: req.params.key });
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

  // Get creator's email to add to Administrators
  let creatorEmail: string | null = null;
  if (req.user?._id) {
    const creator = await User.findById(req.user._id);
    if (creator && creator.Email) {
      creatorEmail = decryptEmail(creator.Email);
    }
  }

  // Initialize location coordinates from postcodes for all addresses
  const organisationData = {
    ...validation.data,
    CreatedBy: req.user?._id || req.body?.CreatedBy,
    DocumentCreationDate: new Date(),
    DocumentModifiedDate: new Date(),
    IsVerified: false,
    IsPublished: false,
    // Add creator as selected administrator
    Administrators: creatorEmail ? [{ Email: creatorEmail, IsSelected: true }] : [],
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Key is intentionally destructured to omit it from the update payload
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

  // Auto-verify if last modification was 100 days or more ago
  const daysSinceLastUpdate = Math.floor(
    (new Date().getTime() - existingProvider.DocumentModifiedDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceLastUpdate >= 100 && !updateData.IsVerified) {
    updateData.IsVerified = true;
  }

  // Check if IsVerified status is being changed
  const verificationChanged = updateData.IsVerified !== undefined && 
                              updateData.IsVerified !== existingProvider.IsVerified;
  
  // Check if Name is being changed
  const nameChanged = updateData.Name !== undefined && 
                      updateData.Name !== existingProvider.Name;
  
  const provider = await Organisation.findByIdAndUpdate(
    req.params.id, 
    updateData,
    { new: true, runValidators: true }
  );
  
  if (!provider) {
    return sendNotFound(res, 'Organisation not found');
  }
  
  // Cascade changes to related services
  let message = 'Organisation updated successfully';
  let totalUpdated = 0;
  
  if (provider.Key) {
    const updates: { IsVerified?: boolean; ServiceProviderName?: string } = {};
    
    // Add IsVerified if it changed
    if (verificationChanged) {
      updates.IsVerified = provider.IsVerified;
    }
    
    // Add ServiceProviderName if Name changed
    if (nameChanged) {
      updates.ServiceProviderName = provider.Name;
    }
    
    // Update related services if there are any changes
    if (Object.keys(updates).length > 0) {
      totalUpdated = await updateRelatedServices(provider.Key, updates);
      message = `Organisation updated successfully. ${totalUpdated} related services also updated.`;
    }
  }
  
  return sendSuccess(res, provider, message);
});

// @desc    Toggle service provider verified status and cascade to related services
// @route   PATCH /api/service-providers/:id/toggle-verified
// @access  Private
export const toggleVerified = asyncHandler(async (req: Request, res: Response) => {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  
  try {
    // Start transaction
    await session.startTransaction();
    
    const provider = await Organisation.findById(req.params.id).session(session);
    
    if (!provider) {
      await session.abortTransaction();
      return sendNotFound(res, 'Organisation not found');
    }
    
    // Toggle the IsVerified status
    const currentStatus = provider.IsVerified ?? true;
    const newStatus = !currentStatus;
    
    // Update the organisation
    const updatedProvider = await Organisation.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          IsVerified: newStatus,
          DocumentModifiedDate: new Date()
        }
      },
      { new: true, session }
    );
    
    if (!updatedProvider) {
      await session.abortTransaction();
      return sendNotFound(res, 'Organisation not found');
    }
    
    // Update related services using the helper function
    const totalUpdated = await updateRelatedServices(
      updatedProvider.Key,
      { IsVerified: updatedProvider.IsVerified },
      session
    );
    
    // Commit the transaction
    await session.commitTransaction();
    
    return sendSuccess(res, updatedProvider, `Organisation ${updatedProvider.IsVerified ? 'verified' : 'unverified'} successfully. ${totalUpdated} related services also updated.`);
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    throw error;
  } finally {
    // End session
    session.endSession();
  }
});

// @desc    Toggle organisation published status and cascade to related services
// @route   PATCH /api/organisations/:id/toggle-published
// @access  Private
export const togglePublished = asyncHandler(async (req: Request, res: Response) => {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  
  try {
    // Start transaction
    await session.startTransaction();
    
    const provider = await Organisation.findById(req.params.id).session(session);
    
    if (!provider) {
      await session.abortTransaction();
      return sendNotFound(res, 'Organisation not found');
    }
    
    // Toggle the IsPublished status
    const currentStatus = provider.IsPublished ?? true;
    const newStatus = !currentStatus;
    
    // Check if disabling date is provided and if it's today
    let shouldDisableNow = newStatus === false; // Default: disable if toggling to false
    let disablingDate = new Date(); // Default to today
    disablingDate.setUTCHours(0, 0, 0, 0); // Set to UTC midnight
    
    if (!newStatus && req.body.note && req.body.note.Date) {
      // Parse the disabling date from the request and set to UTC midnight
      // This ensures the date matches what the user selected, regardless of timezone
      const inputDate = new Date(req.body.note.Date);
      disablingDate = new Date(Date.UTC(
        inputDate.getFullYear(),
        inputDate.getMonth(),
        inputDate.getDate(),
        0, 0, 0, 0
      ));
      
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Compare at UTC midnight
      
      // Only disable now if the disabling date is today
      shouldDisableNow = disablingDate.getTime() === today.getTime();
    }
    
    // Prepare update fields
    const updateFields: any = {
      $set: {
        IsPublished: newStatus === true ? true : (shouldDisableNow ? false : currentStatus), // Publish immediately or disable based on date
        DocumentModifiedDate: new Date()
      }
    };
    
    // Add note if disabling (always add note, regardless of when disabling happens)
    if (!newStatus && req.body.note) {
      const note: INote = {
        CreationDate: new Date(),
        Date: disablingDate, // Use the selected disabling date
        StaffName: req.body.note.StaffName || req.user?.UserName || 'System',
        Reason: req.body.note.Reason || 'Organisation disabled'
      };
      updateFields.$push = { Notes: note };
    }
    
    // Update the organisation
    const updatedProvider = await Organisation.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, session }
    );
    
    if (!updatedProvider) {
      await session.abortTransaction();
      return sendNotFound(res, 'Organisation not found');
    }
    
    let totalUpdated = 0;
    
    // Only update services if we're actually changing the published status
    if (shouldDisableNow || newStatus === true) {
      // Update related services using the helper function
      totalUpdated = await updateRelatedServices(
        updatedProvider.Key,
        { IsPublished: updatedProvider.IsPublished },
        session
      );
    }
    
    // Commit the transaction
    await session.commitTransaction();
    
    // Customize message based on action
    let message = '';
    if (shouldDisableNow) {
      message = `Organisation disabled successfully. ${totalUpdated} related services also updated.`;
    } else if (!newStatus && !shouldDisableNow) {
      message = `Organisation disabling scheduled for ${disablingDate.toLocaleDateString()}. Note added successfully.`;
    } else {
      message = `Organisation ${updatedProvider.IsPublished ? 'published' : 'unpublished'} successfully. ${totalUpdated} related services also updated.`;
    }
    
    return sendSuccess(res, updatedProvider, message);
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    throw error;
  } finally {
    // End session
    session.endSession();
  }
});

// @desc    Clear all notes from organisation
// @route   DELETE /api/organisations/:id/notes
// @access  Private
export const clearNotes = asyncHandler(async (req: Request, res: Response) => {
  const provider = await Organisation.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        Notes: [],
        DocumentModifiedDate: new Date()
      }
    },
    { new: true }
  );
  
  if (!provider) {
    return sendNotFound(res, 'Organisation not found');
  }
  
  return sendSuccess(res, provider, 'All notes cleared successfully');
});

// @desc    Confirm organisation information is up to date and set as verified
// @route   POST /api/organisations/:id/confirm-info
// @access  Private
export const confirmOrganisationInfo = asyncHandler(async (req: Request, res: Response) => {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  
  try {
    // Start transaction
    await session.startTransaction();
    
    const provider = await Organisation.findById(req.params.id).session(session);
    
    if (!provider) {
      await session.abortTransaction();
      return sendNotFound(res, 'Organisation not found');
    }
    
    // Check if last modification was less than 100 days ago
    const daysSinceLastUpdate = Math.floor(
      (new Date().getTime() - provider.DocumentModifiedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Update organisation: set IsVerified to true only if 100+ days old, otherwise just update DocumentModifiedDate
    const updateFields: any = { DocumentModifiedDate: new Date() };
    if (daysSinceLastUpdate >= 100) {
      updateFields.IsVerified = true;
    }
    
    const updatedProvider = await Organisation.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, session }
    );
    
    if (!updatedProvider) {
      await session.abortTransaction();
      return sendNotFound(res, 'Organisation not found');
    }
    
    // Update related services using the helper function only if IsVerified was set to true
    let totalUpdated = 0;
    let message = 'Organisation information confirmed as up to date';
    
    if (daysSinceLastUpdate >= 100 && updatedProvider.IsVerified) {
      totalUpdated = await updateRelatedServices(
        updatedProvider.Key,
        { IsVerified: true },
        session
      );
      message = `Organisation verified successfully. ${totalUpdated} related services also updated.`;
    }
    
    // Commit the transaction
    await session.commitTransaction();
    
    return sendSuccess(res, updatedProvider, message);
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    throw error;
  } finally {
    // End session
    session.endSession();
  }
});

// @desc    Update selected administrator for organisation
// @route   PUT /api/organisations/:id/administrator
// @access  Private
export const updateAdministrator = asyncHandler(async (req: Request, res: Response) => {
  const { selectedEmail } = req.body;
  
  if (!selectedEmail || !selectedEmail.trim()) {
    return sendBadRequest(res, 'Administrator email is required');
  }
  
  // First, check if the organisation exists and email is in administrators list
  const existingProvider = await Organisation.findById(req.params.id).lean();
  
  if (!existingProvider) {
    return sendNotFound(res, 'Organisation not found');
  }
  
  // Check if email exists in Administrators array
  const adminExists = existingProvider.Administrators.some(admin => admin.Email === selectedEmail);
  
  if (!adminExists) {
    return sendBadRequest(res, 'Email not found in administrators list');
  }
  
  // Update IsSelected for all administrators
  const updatedAdministrators = existingProvider.Administrators.map(admin => ({
    ...admin,
    IsSelected: admin.Email === selectedEmail
  }));
  
  const provider = await Organisation.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        Administrators: updatedAdministrators,
        DocumentModifiedDate: new Date()
      }
    },
    { new: true }
  );
  
  if (!provider) {
    return sendNotFound(res, 'Organisation not found');
  }
  
  return sendSuccess(res, provider, 'Administrator updated successfully');
});

/**
 * Helper function to update related services when organisation status or name changes
 * @param organisationKey - The organisation's Key field
 * @param updates - Object containing IsVerified, IsPublished, and/or ServiceProviderName values to update
 * @param session - Optional MongoDB session for transactions
 * @returns Total count of updated documents
 */
export const updateRelatedServices = async (
  organisationKey: string,
  updates: { IsVerified?: boolean; IsPublished?: boolean; ServiceProviderName?: string },
  session?: mongoose.ClientSession
): Promise<number> => {
  const options = session ? { session } : {};
  const updateFields: any = { DocumentModifiedDate: new Date() };
  
  // Build update object based on provided fields
  if (updates.IsVerified !== undefined) {
    updateFields.IsVerified = updates.IsVerified;
  }
  if (updates.IsPublished !== undefined) {
    updateFields.IsPublished = updates.IsPublished;
  }
  if (updates.ServiceProviderName !== undefined) {
    updateFields.ProviderName = updates.ServiceProviderName; // For GroupedService
  }
  
  // Update all grouped services
  const groupedServicesResult = await GroupedService.updateMany(
    { ProviderId: organisationKey },
    { $set: updateFields },
    options
  );
  
  // For individual services and accommodations, ServiceProviderName is a direct field
  const serviceUpdateFields: any = { DocumentModifiedDate: new Date() };
  if (updates.IsVerified !== undefined) {
    serviceUpdateFields.IsVerified = updates.IsVerified;
  }
  if (updates.IsPublished !== undefined) {
    serviceUpdateFields.IsPublished = updates.IsPublished;
  }
  if (updates.ServiceProviderName !== undefined) {
    serviceUpdateFields.ServiceProviderName = updates.ServiceProviderName;
  }
  
  // Update all individual services using ServiceProviderKey
  const servicesResult = await Service.updateMany(
    { ServiceProviderKey: organisationKey },
    { $set: serviceUpdateFields },
    options
  );

  // Update all accommodations using ServiceProviderId
  const accommodationUpdateFields: any = { DocumentModifiedDate: new Date() };
  if (updates.IsVerified !== undefined) {
    accommodationUpdateFields['GeneralInfo.IsVerified'] = updates.IsVerified;
  }
  if (updates.IsPublished !== undefined) {
    accommodationUpdateFields['GeneralInfo.IsPublished'] = updates.IsPublished;
  }
  if (updates.ServiceProviderName !== undefined) {
    accommodationUpdateFields['GeneralInfo.ServiceProviderName'] = updates.ServiceProviderName;
  }
  
  const accommodationsResult = await Accommodation.updateMany(
    { 'GeneralInfo.ServiceProviderId': organisationKey },
    { $set: accommodationUpdateFields },
    options
  );
  
  return groupedServicesResult.modifiedCount + 
         servicesResult.modifiedCount + 
         accommodationsResult.modifiedCount;
};

// @desc    Delete organisation and all related data
// @route   DELETE /api/organisations/:id
// @access  Private (SuperAdminPlus only)
export const deleteOrganisation = asyncHandler(async (req: Request, res: Response) => {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  
  try {
    // Start transaction
    await session.startTransaction();
    
    // Find the organisation first
    const organisation = await Organisation.findById(req.params.id).session(session);
    
    if (!organisation) {
      await session.abortTransaction();
      return sendNotFound(res, 'Organisation not found');
    }
    
    const organisationKey = organisation.Key;
    const organisationName = organisation.Name;
    
    // Delete all related grouped services
    const groupedServicesResult = await GroupedService.deleteMany(
      { ProviderId: organisationKey },
      { session }
    );
    
    // Delete all related individual services
    const servicesResult = await Service.deleteMany(
      { ServiceProviderKey: organisationKey },
      { session }
    );
    
    // Delete all related accommodations
    const accommodationsResult = await Accommodation.deleteMany(
      { 'GeneralInfo.ServiceProviderId': organisationKey },
      { session }
    );
    
    // Delete the organisation itself
    await Organisation.findByIdAndDelete(req.params.id, { session });
    
    // Commit the transaction
    await session.commitTransaction();
    
    const deletionSummary = {
      organisationName,
      organisationKey,
      deletedGroupedServices: groupedServicesResult.deletedCount,
      deletedIndividualServices: servicesResult.deletedCount,
      deletedAccommodations: accommodationsResult.deletedCount
    };
    
    return sendSuccess(
      res, 
      deletionSummary, 
      `Organisation "${organisationName}" and all related data deleted successfully. ` +
      `Deleted: ${groupedServicesResult.deletedCount} grouped services, ` +
      `${servicesResult.deletedCount} individual services, ` +
      `${accommodationsResult.deletedCount} accommodations.`
    );
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    console.error('Error deleting organisation:', error);
    return sendInternalError(res, 'Failed to delete organisation');
  } finally {
    // End session
    session.endSession();
  }
});