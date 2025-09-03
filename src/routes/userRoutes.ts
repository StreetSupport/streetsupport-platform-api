import { Router } from 'express';
import {
    getUsers,
    getUserById,
    getUserByAuth0Id,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/userController.js';

const router = Router();

router.get('/', getUsers)
router.post('/', createUser)
router.get('/:id', getUserById)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)

// Route for getting user by Auth0 ID
router.get('/auth0/:auth0Id', getUserByAuth0Id);

export default router;
