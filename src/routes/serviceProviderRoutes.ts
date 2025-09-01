import { Router } from 'express';
import { 
    getServiceProviders, 
    getServiceProviderById, 
    getServiceProvidersByLocation,
    createServiceProvider, 
    updateServiceProvider, 
    deleteServiceProvider 
} from '../controllers/serviceProviderController.js';

const router = Router();

router.get('/', getServiceProviders);
router.get('/:id', getServiceProviderById);
router.get('/location/:locationId', getServiceProvidersByLocation);
router.post('/', createServiceProvider);
router.put('/:id', updateServiceProvider);
router.delete('/:id', deleteServiceProvider);

export default router;
