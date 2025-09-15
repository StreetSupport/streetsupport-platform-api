import { Router } from 'express';
import { 
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  getBannersByLocation
} from '../controllers/bannerController.js';
import { bannersAuth, bannersByLocationAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', bannersAuth, getBanners);
router.get('/:id', bannersAuth, getBannerById);
router.get('/location/:locationId', bannersByLocationAuth, getBannersByLocation);
router.post('/', bannersAuth, createBanner);
router.put('/:id', bannersAuth, updateBanner);
router.delete('/:id', bannersAuth, deleteBanner);

export default router;
