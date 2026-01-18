import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendNotFound, sendInternalError } from '../utils/apiResponses.js';
import ClientGroup from '../models/clientGroupModel.js';

/**
 * @desc    Get all client groups
 * @route   GET /api/client-groups
 * @access  Private
 */
export const getClientGroups = asyncHandler(async (req: Request, res: Response) => {
  try {
    const clientGroups = await ClientGroup.find({})
      .sort({ SortPosition: -1 })
      .lean();

    if (!clientGroups || clientGroups.length === 0) {
      return sendNotFound(res, 'No client groups found');
    }

    return sendSuccess(res, clientGroups);
  } catch (error) {
    console.error('Error fetching client groups:', error);
    return sendInternalError(res, 'Failed to fetch client groups');
  }
});
