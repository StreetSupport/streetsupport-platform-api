import { Router } from 'express';
import { 
  getFaqs, 
  getFaqById, 
  createFaq, 
  updateFaq, 
  deleteFaq 
} from '../controllers/faqController.js';
import { faqsAuth, faqsByLocationAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', faqsByLocationAuth, getFaqs);
router.get('/:id', faqsAuth, getFaqById);
router.post('/', faqsAuth, createFaq);
router.put('/:id', faqsAuth, updateFaq);
router.delete('/:id', faqsAuth, deleteFaq);

export default router;
