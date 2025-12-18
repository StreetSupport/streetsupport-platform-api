import { Router } from 'express';
import { 
  getOrganisations,  
  createOrganisation, 
  updateOrganisation, 
  toggleVerified,
  togglePublished,
  clearNotes,
  getOrganisationByKey,
  confirmOrganisationInfo,
  updateAdministrator,
  deleteOrganisation
} from '../controllers/organisationController.js';
import { organisationsAuth, organisationsByKeyAuth, organisationsByLocationAuth, verifyOrganisationsAuth, organisationDeleteAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', organisationsByLocationAuth, getOrganisations);
router.get('/:key', organisationsByKeyAuth, getOrganisationByKey);
router.post('/', organisationsAuth, createOrganisation);
router.put('/:id', organisationsAuth, updateOrganisation);
router.patch('/:id/toggle-verified', verifyOrganisationsAuth, toggleVerified);
router.patch('/:id/toggle-published', organisationsAuth, togglePublished);
router.delete('/:id/notes', organisationsAuth, clearNotes);
router.delete('/:id', organisationDeleteAuth, deleteOrganisation);
router.post('/:id/confirm-info', organisationsAuth, confirmOrganisationInfo);
router.put('/:id/administrator', organisationsAuth, updateAdministrator);

export default router;
