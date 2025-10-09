import { Request, Response } from 'express';
import User from '@/models/userModel.js';
import ArchivedUser from '@/models/archivedUserModel.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { decryptUserEmail, encryptEmail } from '@/utils/encryption.js';
import { validateCreateUser } from '@/schemas/userSchema.js';
import { createAuth0User, deleteAuth0User } from '@/services/auth0Service.js';
import { sendSuccess, sendCreated, sendNotFound, sendBadRequest, sendInternalError, sendPaginatedSuccess } from '@/utils/apiResponses.js';

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
  
  // Apply role filter
  if (role && typeof role === 'string') {
    // Support both exact role match and location-specific roles
    if (role.includes('AdminFor:')) {
      query.AuthClaims = role;
    } else {
      query.AuthClaims = role;
    }
  }

  // Apply location filter (AssociatedProviderLocationIds)
  // Priority: 'locations' (for CityAdmin bulk filtering) over 'location' (for single filter)
  if (locations && typeof locations === 'string') {
    // Multiple locations passed from admin side for CityAdmin users
    const locationArray = locations.split(',').map(loc => loc.trim()).filter(Boolean);
    if (locationArray.length > 0) {
      query.AssociatedProviderLocationIds = { $in: locationArray };
    }
  } else if (location && typeof location === 'string') {
    // Single location filter from UI
    query.AssociatedProviderLocationIds = location;
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
  const usersWithDecryptedEmails = dbUsers.map(user => ({
    ...user,
    Email: decryptUserEmail(user.Email as any) || ''
  }));

  // Apply email search filter after decryption
  let users = usersWithDecryptedEmails;
  if (search && typeof search === 'string') {
    const searchLower = search.toLowerCase();
    users = usersWithDecryptedEmails.filter(user => {
      const email = user.Email.toLowerCase();
      const userName = user.UserName?.toLowerCase() || '';
      return email.includes(searchLower) || userName.includes(searchLower);
    });
  }

  const total = await User.countDocuments(query);
  
  // Adjust total if email search filter was applied
  const filteredTotal = search ? users.length : total;

  return sendPaginatedSuccess(res, users, {
    page: Number(page),
    limit: Number(limit),
    total: filteredTotal,
    pages: Math.ceil(filteredTotal / Number(limit))
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
    return sendBadRequest(res, 'Validation failed');
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
  try {
    auth0User = await createAuth0User(
      userData.Email,
      userData.AuthClaims
    );
  } catch (error) {
    console.error('Failed to create Auth0 user:', error);
    return sendInternalError(res, 'Failed to create user in Auth0');
  }

  // Extract Auth0 ID (remove 'auth0|' prefix if present)
  const auth0Id = auth0User.user_id.replace('auth0|', '');

  // Create user in MongoDB with Auth0 ID
  let user;
  try {
    user = await User.create({
      ...userData,
      Email: encryptedEmail,
      Auth0Id: auth0Id,
      CreatedBy: req.user?.Auth0Id,
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
  const userData = { ...req.body };
  
  // Encrypt email if it's provided as a string
  if (userData.Email && typeof userData.Email === 'string') {
    userData.Email = encryptEmail(userData.Email);
  }
  
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { 
      ...userData,
      DocumentModifiedDate: new Date() 
    },
    { new: true, runValidators: true }
  );
  
  if (!user) {
    return sendNotFound(res, 'User not found');
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

  // Archive user to ArchivedUsers collection
  try {
    await ArchivedUser.create({
      ...user.toObject(),
      _id: user._id, // Preserve original _id
      DocumentModifiedDate: new Date() // Update modified date for archival
    });
  } catch (error) {
    console.error('Failed to archive user:', error);
    return sendInternalError(res, 'Failed to archive user before deletion');
  }

  // Delete user from Auth0 if Auth0Id exists
  if (user.Auth0Id) {
    try {
      await deleteAuth0User(user.Auth0Id);
    } catch (error) {
      console.error('Failed to delete Auth0 user:', error);
      // Don't fail the entire operation, but log the error
      // The user is already archived, so we can proceed with MongoDB deletion
    }
  }

  // Delete user from MongoDB Users collection
  await User.findByIdAndDelete(req.params.id);

  return sendSuccess(res, {}, 'User deleted successfully and archived');
});

export {
  getUsers,
  getUserById,
  getUserByAuth0Id,
  createUser,
  updateUser,
  deleteUser
};
