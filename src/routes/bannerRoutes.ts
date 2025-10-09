import { Router } from 'express';
import { 
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  incrementDownloadCount
} from '../controllers/bannerController.js';
import { bannersAuth, bannersByLocationAuth } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = Router();

// Public routes
router.post('/:id/download', incrementDownloadCount);

// Protected routes
router.get('/', bannersByLocationAuth, getBanners);
router.get('/:id', bannersAuth, getBannerById);
router.post('/', bannersAuth, uploadMiddleware, createBanner);
router.put('/:id', bannersAuth, uploadMiddleware, updateBanner);
router.patch('/:id/toggle', bannersAuth, toggleBannerStatus);
router.delete('/:id', bannersAuth, deleteBanner);

export default router;
