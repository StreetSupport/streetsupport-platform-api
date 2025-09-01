import { Router } from 'express';
import { getCities } from '../controllers/cityController.js';
import checkJwt from '../middleware/checkJwt.js';

const router = Router();

router.get('/', getCities);

export default router;
