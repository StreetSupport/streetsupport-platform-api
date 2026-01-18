import express from 'express';
import { getClientGroups } from '../controllers/clientGroupController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/client-groups
 * @desc    Get all client groups
 * @access  Private
 */
router.get('/', authenticate, getClientGroups);

export default router;
