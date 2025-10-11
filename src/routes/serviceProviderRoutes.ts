import { Router } from 'express';
import { 
  getServiceProviders, 
  getServiceProviderById, 
  createServiceProvider, 
  updateServiceProvider, 
  deleteServiceProvider 
} from '@/controllers/serviceProviderController.js';
import { serviceProvidersAuth, serviceProvidersByLocationAuth } from '@/middleware/authMiddleware.js';

const router = Router();

router.get('/', serviceProvidersByLocationAuth, getServiceProviders);
router.get('/:id', serviceProvidersAuth, getServiceProviderById);
router.post('/', serviceProvidersAuth, createServiceProvider);
router.put('/:id', serviceProvidersAuth, updateServiceProvider);
router.delete('/:id', serviceProvidersAuth, deleteServiceProvider);

export default router;
