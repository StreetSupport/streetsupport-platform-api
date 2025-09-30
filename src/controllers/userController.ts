import { Request, Response } from 'express';
import User from '@/models/userModel.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private
const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await User.find({});
  res.status(200).json({ success: true, data: users });
});

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ success: true, data: user });
});

// @desc    Get user by Auth0 ID
// @route   GET /api/users/auth0/:auth0Id
// @access  Private
const getUserByAuth0Id = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ Auth0Id: req.params.auth0Id });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ success: true, data: user });
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private
const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.create({
    ...req.body,
    DocumentCreationDate: new Date(),
    DocumentModifiedDate: new Date()
  });
  res.status(201).json({ success: true, data: user });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { 
      ...req.body,
      DocumentModifiedDate: new Date() 
    },
    { new: true, runValidators: true }
  );
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ success: true, data: user });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.status(200).json({ success: true, data: {} });
});

export {
  getUsers,
  getUserById,
  getUserByAuth0Id,
  createUser,
  updateUser,
  deleteUser
};
