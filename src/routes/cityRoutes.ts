import { Router } from 'express';
import { getCities, getCityById } from '../controllers/cityController.js';
import { citiesAuth } from '../middleware/authMiddleware.js';
const router = Router();

router.get('/', citiesAuth, getCities);
router.get('/:id', citiesAuth, getCityById);

export default router;
