import { Router } from 'express';
import { 
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  getBannersByLocation,
  getActiveBanners,
  toggleBannerStatus,
  incrementDownloadCount,
  getBannerStats
} from '../controllers/bannerController.js';
import { bannersAuth, bannersByLocationAuth } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = Router();

// Public routes
router.get('/active', getActiveBanners);
router.get('/location/:locationSlug', getBannersByLocation);
router.post('/:id/download', incrementDownloadCount);

// Protected routes
router.get('/', bannersAuth, getBanners);
router.get('/stats', bannersAuth, getBannerStats);
router.get('/:id', bannersAuth, getBannerById);
router.post('/', bannersAuth, uploadMiddleware, createBanner);
router.put('/:id', bannersAuth, uploadMiddleware, updateBanner);
router.patch('/:id/toggle', bannersByLocationAuth, toggleBannerStatus);
router.delete('/:id', bannersAuth, deleteBanner);

export default router;
