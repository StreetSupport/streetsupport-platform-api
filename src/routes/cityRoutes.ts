import { Router } from 'express';
import { getCities, getCityById, createCity, updateCity, deleteCity } from '@/controllers/cityController.js';
import { citiesAuth } from '@/middleware/authMiddleware.js';

const router = Router();

router.get('/', citiesAuth, getCities);
router.get('/:id', citiesAuth, getCityById);
router.post('/', citiesAuth, createCity);
router.put('/:id', citiesAuth, updateCity);
router.delete('/:id', citiesAuth, deleteCity);

export default router;
