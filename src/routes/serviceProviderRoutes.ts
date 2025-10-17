import { Router } from 'express';
import { 
  getServiceProviders, 
  getServiceProviderById, 
  createServiceProvider, 
  updateServiceProvider, 
  deleteServiceProvider,
  toggleVerified,
  togglePublished,
  clearNotes,
  addNote
} from '../controllers/serviceProviderController.js';
import { serviceProvidersAuth, serviceProvidersByLocationAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', serviceProvidersByLocationAuth, getServiceProviders);
router.get('/:id', serviceProvidersAuth, getServiceProviderById);
router.post('/', serviceProvidersAuth, createServiceProvider);
router.put('/:id', serviceProvidersAuth, updateServiceProvider);
router.delete('/:id', serviceProvidersAuth, deleteServiceProvider);
router.patch('/:id/toggle-verified', serviceProvidersAuth, toggleVerified);
router.patch('/:id/toggle-published', serviceProvidersAuth, togglePublished);
router.delete('/:id/notes', serviceProvidersAuth, clearNotes);
router.post('/:id/notes', serviceProvidersAuth, addNote);

export default router;
