import { Router } from 'express';
import { 
  getOrganisations, 
  getOrganisationById, 
  createOrganisation, 
  updateOrganisation, 
  deleteOrganisation,
  toggleVerified,
  togglePublished,
  clearNotes,
  addNote
} from '../controllers/organisationController.js';
import { organisationsAuth, organisationsByLocationAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', organisationsByLocationAuth, getOrganisations);
router.get('/:id', organisationsAuth, getOrganisationById);
router.post('/', organisationsAuth, createOrganisation);
router.put('/:id', organisationsAuth, updateOrganisation);
router.delete('/:id', organisationsAuth, deleteOrganisation);
router.patch('/:id/toggle-verified', organisationsAuth, toggleVerified);
router.patch('/:id/toggle-published', organisationsAuth, togglePublished);
router.delete('/:id/notes', organisationsAuth, clearNotes);
router.post('/:id/notes', organisationsAuth, addNote);

export default router;
