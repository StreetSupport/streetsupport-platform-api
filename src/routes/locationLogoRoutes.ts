import { Router } from 'express';
import {
  getLocationLogos,
  createLocationLogo,
  updateLocationLogo,
  deleteLocationLogo,
  getLocationLogoById
} from '../controllers/locationLogoController.jsx';
import { locationLogosAuth, locationLogosGetAuth } from '../middleware/authMiddleware.js';
import { uploadLocationLogo } from '../middleware/uploadMiddleware.js';

const router = Router();

// Routes
router.get('/', locationLogosGetAuth, getLocationLogos);
router.get('/:id', locationLogosAuth, getLocationLogoById);
router.post('/', locationLogosAuth, uploadLocationLogo, createLocationLogo);
router.put('/:id', locationLogosAuth, uploadLocationLogo, updateLocationLogo);
router.delete('/:id', locationLogosAuth, deleteLocationLogo);

export default router;
