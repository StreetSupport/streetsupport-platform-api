import { Router } from 'express';
import { 
    getServiceProviders, 
    getServiceProviderById, 
    getServiceProvidersByLocation,
    createServiceProvider, 
    updateServiceProvider, 
    deleteServiceProvider 
} from '../controllers/serviceProviderController.js';
import { serviceProvidersAuth, serviceProvidersByLocationAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', serviceProvidersAuth, getServiceProviders);
router.get('/:id', serviceProvidersAuth, getServiceProviderById);
router.get('/location/:locationId', serviceProvidersByLocationAuth, getServiceProvidersByLocation);
router.post('/', serviceProvidersAuth, createServiceProvider);
router.put('/:id', serviceProvidersAuth, updateServiceProvider);
router.delete('/:id', serviceProvidersAuth, deleteServiceProvider);

export default router;
