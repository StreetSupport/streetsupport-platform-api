import { Router } from 'express';
import { 
  getSwepBanners,
  getSwepBannerById,
  createSwepBanner,
  updateSwepBanner,
  deleteSwepBanner
} from '@/controllers/swepBannerController.js';
import { swepBannersAuth, swepBannersByLocationAuth } from '@/middleware/authMiddleware.js';

const router = Router();

router.get('/', swepBannersByLocationAuth, getSwepBanners);
router.get('/:id', swepBannersAuth, getSwepBannerById);
router.post('/', swepBannersAuth, createSwepBanner);
router.put('/:id', swepBannersAuth, updateSwepBanner);
router.delete('/:id', swepBannersAuth, deleteSwepBanner);

export default router;
