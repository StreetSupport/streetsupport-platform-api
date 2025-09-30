import { Router } from 'express';
import { 
  getFaqs, 
  getFaqById, 
  getFaqsByLocation,
  createFaq, 
  updateFaq, 
  deleteFaq 
} from '@/controllers/faqController.js';
import { faqsAuth } from '@/middleware/authMiddleware.js';

const router = Router();

router.get('/', faqsAuth, getFaqs);
router.get('/:id', faqsAuth, getFaqById);
router.get('/location/:locationId', faqsAuth, getFaqsByLocation);
router.post('/', faqsAuth, createFaq);
router.put('/:id', faqsAuth, updateFaq);
router.delete('/:id', faqsAuth, deleteFaq);

export default router;
