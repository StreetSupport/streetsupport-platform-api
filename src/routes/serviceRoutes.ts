import { Router } from 'express';
import { 
    getServices, 
    getServiceById, 
    getServicesByProvider,
    createService, 
    updateService, 
    deleteService 
} from '@/controllers/serviceController.js';
import { servicesAuth, servicesByProviderAuth } from '@/middleware/authMiddleware.js';

const router = Router();

router.get('/', servicesAuth, getServices);
router.get('/:id', servicesAuth, getServiceById);
router.get('/provider/:providerId', servicesByProviderAuth, getServicesByProvider);
router.post('/', servicesAuth, createService);
router.put('/:id', servicesAuth, updateService);
router.delete('/:id', servicesAuth, deleteService);

export default router;
