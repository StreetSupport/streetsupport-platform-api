import { Router } from 'express';
import {
  getAccommodations,
  getAccommodationById,
  getAccommodationByProvider,
  createAccommodation,
  updateAccommodation,
  deleteAccommodation
} from '../controllers/accommodationController.js';

const router = Router();

router.get('/', getAccommodations);
router.get('/provider/:providerId', getAccommodationByProvider);
router.get('/:id', getAccommodationById);
router.post('/', createAccommodation);
router.put('/:id', updateAccommodation);
router.delete('/:id', deleteAccommodation);

export default router;
