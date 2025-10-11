import { Router } from 'express';
import { 
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource
} from '../controllers/resourceController.js';
import { resourcesAuth, resourcesByLocationAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', resourcesByLocationAuth, getResources);
router.get('/:id', resourcesAuth, getResourceById);
router.post('/', resourcesAuth, createResource);
router.put('/:id', resourcesAuth, updateResource);
router.delete('/:id', resourcesAuth, deleteResource);

export default router;
