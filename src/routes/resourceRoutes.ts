import { Router } from 'express';
import { 
  getResources,
  getResourceByKey,
  updateResource
} from '../controllers/resourceController.js';
import { resourcesAuth } from '../middleware/authMiddleware.js';
import { uploadResourceFiles } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', resourcesAuth, getResources);
router.get('/:key', resourcesAuth, getResourceByKey);
router.put('/:key', resourcesAuth, uploadResourceFiles, updateResource);

export default router;
