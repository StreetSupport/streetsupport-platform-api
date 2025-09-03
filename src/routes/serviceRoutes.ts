import { Router } from 'express';
import { 
    getServices, 
    getServiceById, 
    getServicesByProvider,
    createService, 
    updateService, 
    deleteService 
} from '../controllers/serviceController.js';

const router = Router();

router.get('/', getServices);
router.get('/:id', getServiceById);
router.get('/provider/:providerId', getServicesByProvider);
router.post('/', createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

export default router;
