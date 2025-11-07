import { Router } from 'express';
import { 
  getSwepBanners,
  getSwepBannerByLocation,
  updateSwepBanner,
  toggleSwepBannerActive
} from '../controllers/swepBannerController.js';
import { swepBannersAuth, swepBannersGetAuth } from '../middleware/authMiddleware.js';
import { uploadSwepImage } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', swepBannersGetAuth, getSwepBanners);
router.get('/:location', swepBannersAuth, getSwepBannerByLocation);
// Use SWEP-specific upload middleware - handles single file to swep-banners container
router.put('/:location', swepBannersAuth, uploadSwepImage, updateSwepBanner);
router.patch('/:location/toggle-active', swepBannersAuth, toggleSwepBannerActive);

export default router;
