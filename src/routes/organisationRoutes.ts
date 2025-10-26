import { Router } from 'express';
import { 
  getOrganisations, 
  //getOrganisationById, 
  createOrganisation, 
  updateOrganisation, 
  deleteOrganisation,
  toggleVerified,
  togglePublished,
  clearNotes,
  addNote,
  getOrganisationByKey,
  confirmOrganisationInfo,
  updateAdministrator
} from '../controllers/organisationController.js';
import { organisationsAuth, organisationsByKeyAuth, organisationsByLocationAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', organisationsByLocationAuth, getOrganisations);
// router.get('/:id', organisationsAuth, getOrganisationById);
router.get('/:id', organisationsByKeyAuth, getOrganisationByKey);
router.post('/', organisationsAuth, createOrganisation);
router.put('/:id', organisationsAuth, updateOrganisation);
router.delete('/:id', organisationsAuth, deleteOrganisation);
router.patch('/:id/toggle-verified', organisationsAuth, toggleVerified);
router.patch('/:id/toggle-published', organisationsAuth, togglePublished);
router.delete('/:id/notes', organisationsAuth, clearNotes);
router.post('/:id/notes', organisationsAuth, addNote);
router.post('/:id/confirm-info', organisationsAuth, confirmOrganisationInfo);
router.put('/:id/administrator', organisationsAuth, updateAdministrator);

export default router;
