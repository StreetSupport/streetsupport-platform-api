import { Router } from 'express';
import { 
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  getResourcesByLocation
} from '../controllers/resourceController.js';
import { resourcesAuth, resourcesByLocationAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', resourcesAuth, getResources);
router.get('/:id', resourcesAuth, getResourceById);
router.get('/location/:locationId', resourcesByLocationAuth, getResourcesByLocation);
router.post('/', resourcesAuth, createResource);
router.put('/:id', resourcesAuth, updateResource);
router.delete('/:id', resourcesAuth, deleteResource);

export default router;
