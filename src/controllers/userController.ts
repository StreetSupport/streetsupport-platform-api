import { Request, Response } from 'express';
import User from '@/models/userModel.js';
import ArchivedUser from '@/models/archivedUserModel.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { decryptUserEmail, encryptEmail } from '@/utils/encryption.js';
import { validateCreateUser, validateUpdateUser } from '@/schemas/userSchema.js';
import { createAuth0User, deleteAuth0User } from '@/services/auth0Service.js';

// @desc    Get all users with optional filtering and search
// @route   GET /api/users
// @access  Private
const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { 
    search,
    role,
    location,
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
  if (location && typeof location === 'string') {
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

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: filteredTotal,
      pages: Math.ceil(filteredTotal / Number(limit))
    }
  });
});

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Decrypt email before sending
  const userWithDecryptedEmail = {
    ...user,
    Email: decryptUserEmail(user.Email as any) || ''
  };
  
  res.status(200).json({ success: true, data: userWithDecryptedEmail });
});

// @desc    Get user by Auth0 ID
// @route   GET /api/users/auth0/:auth0Id
// @access  Private
const getUserByAuth0Id = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ Auth0Id: req.params.auth0Id }).lean();
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  
  // Decrypt email before sending
  const userWithDecryptedEmail = {
    ...user,
    Email: decryptUserEmail(user.Email as any) || ''
  };
  
  res.status(200).json({ success: true, data: userWithDecryptedEmail });
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private
const createUser = asyncHandler(async (req: Request, res: Response) => {
  // Validate the request data first
  const validation = validateCreateUser(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: validation.errors?.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  if (!validation.data) {
    return res.status(400).json({
      success: false,
      error: 'Validation data is missing'
    });
  }

  const userData = validation.data;

  // Check if user with this email already exists (after validation)
  const encryptedEmail = encryptEmail(userData.Email);
  const existingUser = await User.findOne({ Email: encryptedEmail });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'User with this email already exists'
    });
  }

  // Create user in Auth0 first to get auto-generated Auth0 ID
  let auth0User;
  try {
    auth0User = await createAuth0User(
      userData.Email,
      userData.AuthClaims
    );
  } catch (auth0Error) {
    console.error('Failed to create Auth0 user:', auth0Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create user in Auth0',
      details: auth0Error instanceof Error ? auth0Error.message : 'Unknown error'
    });
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
  } catch (mongoError) {
    // If MongoDB creation fails, delete the Auth0 user to maintain consistency
    console.error('Failed to create MongoDB user:', mongoError);
    try {
      await deleteAuth0User(auth0Id);
    } catch (cleanupError) {
      console.error('Failed to cleanup Auth0 user after MongoDB error:', cleanupError);
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create user in database',
      details: mongoError instanceof Error ? mongoError.message : 'Unknown error'
    });
  }

  // Return user with decrypted email
  const userResponse = {
    ...user.toObject(),
    Email: decryptUserEmail(user.Email as any) || ''
  };

  res.status(201).json({ success: true, data: userResponse });
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
    res.status(404);
    throw new Error('User not found');
  }
  
  // Return user with decrypted email
  const userResponse = {
    ...user.toObject(),
    Email: decryptUserEmail(user.Email as any) || ''
  };
  
  res.status(200).json({ success: true, data: userResponse });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  // Get user from MongoDB
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Archive user to ArchivedUsers collection
  try {
    await ArchivedUser.create({
      ...user.toObject(),
      _id: user._id, // Preserve original _id
      DocumentModifiedDate: new Date() // Update modified date for archival
    });
  } catch (archiveError) {
    console.error('Failed to archive user:', archiveError);
    return res.status(500).json({
      success: false,
      error: 'Failed to archive user before deletion',
      details: archiveError instanceof Error ? archiveError.message : 'Unknown error'
    });
  }

  // Delete user from Auth0 if Auth0Id exists
  if (user.Auth0Id) {
    try {
      await deleteAuth0User(user.Auth0Id);
    } catch (auth0Error) {
      console.error('Failed to delete Auth0 user:', auth0Error);
      // Don't fail the entire operation, but log the error
      // The user is already archived, so we can proceed with MongoDB deletion
    }
  }

  // Delete user from MongoDB Users collection
  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({ 
    success: true, 
    message: 'User deleted successfully and archived',
    data: {} 
  });
});

export {
  getUsers,
  getUserById,
  getUserByAuth0Id,
  createUser,
  updateUser,
  deleteUser
};
