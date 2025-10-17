import { Request, Response } from 'express';
import User from '../models/userModel.js';
import ArchivedUser from '../models/archivedUserModel.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { decryptUserEmail, encryptEmail } from '../utils/encryption.js';
import { validateCreateUser, validateUpdateUser } from '../schemas/userSchema.js';
import { createAuth0User, deleteAuth0User, blockAuth0User, unblockAuth0User, updateAuth0UserRoles } from '../services/auth0Service.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendInternalError, sendPaginatedSuccess, sendForbidden } from '../utils/apiResponses.js';
import { ROLE_PREFIXES, ROLES } from '../constants/roles.js';

// @desc    Get all users with optional filtering and search
// @route   GET /api/users
// @access  Private
const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { 
    search,
    role,
    location,
    locations, // New: comma-separated list of locations for CityAdmin filtering
    page = 1, 
    limit = 10,
    sortBy = 'DocumentModifiedDate',
    sortOrder = 'desc'
  } = req.query;

  const query: any = {};
  const conditions: any[] = [];
  
  // Apply email search filter (encrypt email before searching in database)
  if (search && typeof search === 'string') {
    const encryptedSearch = encryptEmail(search.trim());
    conditions.push({ Email: encryptedSearch });
  }
  
  // Apply role filter (AuthClaims is an array field, MongoDB automatically checks if array contains the value)
  if (role && typeof role === 'string') {
    // Search for exact role match in the AuthClaims array
    // Supports both simple roles (SuperAdmin, CityAdmin) and location-specific roles (CityAdminFor:manchester)
    conditions.push({ AuthClaims: role });
  }

  // Exclude SuperAdmin users from results if requesting user is not a SuperAdmin
  const requestingUserAuthClaims = req.user?.AuthClaims || [];
  if (!requestingUserAuthClaims.includes(ROLES.SUPER_ADMIN)) {
    conditions.push({ AuthClaims: { $ne: ROLES.SUPER_ADMIN } });
  }

  // Exclude VolunteerAdmin users from results if requesting user is not a SuperAdmin or VolunteerAdmin
  if (!requestingUserAuthClaims.includes(ROLES.SUPER_ADMIN)) {
    conditions.push({ AuthClaims: { $ne: ROLES.VOLUNTEER_ADMIN } });
  }

  // Apply location filter - checks BOTH AssociatedProviderLocationIds AND AuthClaims
  // Priority: 'locations' (for CityAdmin bulk filtering) over 'location' (for single filter)
  if (locations && typeof locations === 'string') {
    // Multiple locations passed from admin side for CityAdmin users
    const locationArray = locations.split(',').map(loc => loc.trim()).filter(Boolean);
    if (locationArray.length > 0) {
      // flatMap creates conditions for each location (CityAdminFor + SwepAdminFor) and flattens into single array
      const authClaimsConditions = locationArray.flatMap(loc => [
        { AuthClaims: `${ROLE_PREFIXES.CITY_ADMIN_FOR}${loc}` },
        { AuthClaims: `${ROLE_PREFIXES.SWEP_ADMIN_FOR}${loc}` }
      ]);
      
      // Match users who have EITHER:
      // 1. Location in AssociatedProviderLocationIds, OR
      // 2. Location-specific admin role in AuthClaims (CityAdminFor:location or SwepAdminFor:location)
      conditions.push({
        $or: [
          { AssociatedProviderLocationIds: { $in: locationArray } },
          ...authClaimsConditions
        ]
      });
    }
  } else if (location && typeof location === 'string') {
    // Single location filter from UI
    // Match users who have EITHER:
    // 1. Location in AssociatedProviderLocationIds, OR
    // 2. Location-specific admin role in AuthClaims (checks if array contains the value)
    conditions.push({
      $or: [
        { AssociatedProviderLocationIds: location },
        { AuthClaims: `${ROLE_PREFIXES.CITY_ADMIN_FOR}${location}` },
        { AuthClaims: `${ROLE_PREFIXES.SWEP_ADMIN_FOR}${location}` }
      ]
    });
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
  
  const dbUsers = await User.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Decrypt emails for all users
  const users = dbUsers.map(user => ({
    ...user,
    Email: decryptUserEmail(user.Email as any) || ''
  }));

  // Get total count using the same query
  const total = await User.countDocuments(query);

  return sendPaginatedSuccess(res, users, {
    page: Number(page),
    limit: Number(limit),
    total,
    pages: Math.ceil(total / Number(limit))
  });
});

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return sendNotFound(res, 'User not found');
  }

  // Exclude SuperAdmin users from results if requesting user is not a SuperAdmin
  const requestingUserAuthClaims = req.user?.AuthClaims || [];
  if (!requestingUserAuthClaims.includes(ROLES.SUPER_ADMIN)) {
    if(user.AuthClaims.some((claim: string) => claim === ROLES.SUPER_ADMIN)){
      return sendForbidden(res);
    };
  }
  
  // Decrypt email before sending
  const userWithDecryptedEmail = {
    ...user,
    Email: decryptUserEmail(user.Email as any) || ''
  };
  
  return sendSuccess(res, userWithDecryptedEmail);
});

// @desc    Get user by Auth0 ID
// @route   GET /api/users/auth0/:auth0Id
// @access  Private
const getUserByAuth0Id = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ Auth0Id: req.params.auth0Id }).lean();
  if (!user) {
    return sendNotFound(res, 'User not found');
  }
  
  // Decrypt email before sending
  const userWithDecryptedEmail = {
    ...user,
    Email: decryptUserEmail(user.Email as any) || ''
  };
  
  return sendSuccess(res, userWithDecryptedEmail);
});

// @desc    Create new user
const createUser = asyncHandler(async (req: Request, res: Response) => {
  // Validate the request data first
  const validation = validateCreateUser(req.body);
  if (!validation.success) {
    const errorMessages = validation.errors.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  if (!validation.data) {
    return sendBadRequest(res, 'Validation data is missing');
  }
  
  const userData = validation.data;

  // Check if user with this email already exists (after validation)
  const encryptedEmail = encryptEmail(userData.Email);
  const existingUser = await User.findOne({ Email: encryptedEmail }).lean();
  if (existingUser) {
    return sendBadRequest(res, 'User with this email already exists');
  }

  // Create user in Auth0 first to get auto-generated Auth0 ID
  let auth0User;

  auth0User = await createAuth0User(
    userData.Email,
    userData.AuthClaims
  );

  // Extract Auth0 ID (remove 'auth0|' prefix if present)
  const auth0Id = auth0User.user_id.replace('auth0|', '');

  // Create user in MongoDB with Auth0 ID
  let user;
  try {
    user = await User.create({
      ...userData,
      Email: encryptedEmail,
      Auth0Id: auth0Id,
      CreatedBy: req.user?._id || req.body?.CreatedBy,
      DocumentCreationDate: new Date(),
      DocumentModifiedDate: new Date()
    });
  } catch (error) {
    // If MongoDB creation fails, delete the Auth0 user to maintain consistency
    console.error('Failed to create MongoDB user:', error);
    try {
      await deleteAuth0User(auth0Id);
    } catch (error) {
      console.error('Failed to cleanup Auth0 user after MongoDB error:', error);
      return sendInternalError(res, 'Failed to create user');
    }
    
    return sendInternalError(res, 'Failed to create user in database');
  }

  // Return user with decrypted email
  const userResponse = {
    ...user.toObject(),
    Email: decryptUserEmail(user.Email as any) || ''
  };

  return sendCreated(res, userResponse);
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = asyncHandler(async (req: Request, res: Response) => {
  // Validate the request data first
  // Request body contains only AuthClaims because we don't need to update other fields
  const validation = validateUpdateUser(req.body);
  if (!validation.success) {
    const errorMessages = validation.errors.map(err => err.message).join(', ');
    return sendBadRequest(res, `Validation failed: ${errorMessages}`);
  }

  if (!validation.data) {
    return sendBadRequest(res, 'Validation data is missing');
  }

  const userData = { ...validation.data };

  // Encrypt email if it's provided as a string
  const encryptedEmail = userData.Email && typeof userData.Email === 'string' ? encryptEmail(userData.Email) : undefined;

  // Get existing user to check for Auth0 sync needs
  const existingUser = await User.findById(req.params.id);
  if (!existingUser) {
    return sendNotFound(res, 'User not found');
  }
  
  // Check if AuthClaims are being updated
  const rolesChanged = userData.AuthClaims && 
    JSON.stringify(existingUser.AuthClaims) !== JSON.stringify(userData.AuthClaims);
  
  // Update user in MongoDB
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { 
      ...userData,
      Email: encryptedEmail || existingUser.Email,
      DocumentModifiedDate: new Date() 
    },
    { new: true, runValidators: true }
  );
  
  if (!user) {
    return sendNotFound(res, 'User not found');
  }
  
  // Sync roles to Auth0 if they changed
  if (rolesChanged && user.Auth0Id && userData.AuthClaims) {
    await updateAuth0UserRoles(user.Auth0Id, userData.AuthClaims);
  }
  
  // Return user with decrypted email
  const userResponse = {
    ...user.toObject(),
    Email: decryptUserEmail(user.Email as any) || ''
  };
  
  return sendSuccess(res, userResponse);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  // Get user from MongoDB
  const user = await User.findById(req.params.id).lean();;
  if (!user) {
    return sendNotFound(res, 'User not found');
  }

  // Delete user from Auth0 if Auth0Id exists
  if (user.Auth0Id) {
    await deleteAuth0User(user.Auth0Id);
  }

  // Archive user to ArchivedUsers collection
  try {
    await ArchivedUser.create({
      ...user.toObject(),
      _id: user._id, // Preserve original _id
      DocumentModifiedDate: new Date() // Update modified date for archival
    });
  } catch (error) {
    console.error('Failed to archive user:', error);
  }

  // Delete user from MongoDB Users collection
  try {
    await User.findByIdAndDelete(req.params.id);
  } catch (error) {
    console.error('Failed to delete user from MongoDB:', error);
    return sendInternalError(res, 'Failed to delete user from database');
  }

  return sendSuccess(res, {}, 'User deleted successfully');
});

// @desc    Toggle user active status
// @route   PATCH /api/users/:id/toggle-active
// @access  Private
const toggleUserActive = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return sendNotFound(res, 'User not found');
  }
  
  // Determine current status (default to true if undefined)
  const currentStatus = user.IsActive ?? true;
  const newStatus = !currentStatus;
  
  // Update Auth0 user status first (block/unblock)
  if (user.Auth0Id) {
    if (newStatus) {
      // Activating user - unblock in Auth0
      await unblockAuth0User(user.Auth0Id);
    } else {
      // Deactivating user - block in Auth0
      await blockAuth0User(user.Auth0Id);
    }
  }
  
  // Toggle the IsActive status in database
  user.IsActive = newStatus;
  user.DocumentModifiedDate = new Date();
  
  await user.save();
  
  // Return user with decrypted email
  const userResponse = {
    ...user.toObject(),
    Email: decryptUserEmail(user.Email as any) || ''
  };
  
  return sendSuccess(res, userResponse, `User ${user.IsActive ? 'activated' : 'deactivated'} successfully`);
});

export {
  getUsers,
  getUserById,
  getUserByAuth0Id,
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive
};
