import { Router } from 'express';
import {
  getAccommodations,
  getAccommodationById,
  getAccommodationByProvider,
  createAccommodation,
  updateAccommodation,
  deleteAccommodation
} from '../controllers/accommodationController.js';
import { accommodationsAuth } from 'middleware/authMiddleware.js';

const router = Router();

router.get('/', accommodationsAuth, getAccommodations);
router.get('/provider/:providerId', getAccommodationByProvider, getAccommodationByProvider);
router.get('/:id', accommodationsAuth, getAccommodationById);
router.post('/', accommodationsAuth, createAccommodation);
router.put('/:id', accommodationsAuth, updateAccommodation);
router.delete('/:id', accommodationsAuth, deleteAccommodation);

export default router;
