import express from 'express';
import { getServiceCategories } from '../controllers/serviceCategoryController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/service-categories
 * @desc    Get all service categories with subcategories
 * @access  Private
 */
router.get('/', authenticate, getServiceCategories);

export default router;
