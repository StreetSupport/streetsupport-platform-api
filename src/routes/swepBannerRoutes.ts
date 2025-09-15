import { Router } from 'express';
import { 
  getSwepBanners,
  getSwepBannerById,
  createSwepBanner,
  updateSwepBanner,
  deleteSwepBanner,
  getSwepBannersByLocation
} from '../controllers/swepBannerController.js';
import { swepBannersAuth, swepBannersByLocationAuth, swepBannersActivationAuth, authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', swepBannersAuth, getSwepBanners);
router.get('/:id', swepBannersAuth, getSwepBannerById);
router.get('/location/:locationId', swepBannersByLocationAuth, getSwepBannersByLocation);
router.post('/', swepBannersAuth, createSwepBanner);
router.put('/:id', swepBannersActivationAuth, updateSwepBanner);
router.delete('/:id', swepBannersAuth, deleteSwepBanner);

export default router;
