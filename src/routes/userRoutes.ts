import { Router } from 'express';
import {
    getUsers,
    getUserById,
    getUserByAuth0Id,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/userController.js';
import { usersAuth, userCreationAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', usersAuth, getUsers)
router.post('/', userCreationAuth, createUser)
router.get('/:id', usersAuth, getUserById)
router.put('/:id', usersAuth, updateUser)
router.delete('/:id', usersAuth, deleteUser)

// Route for getting user by Auth0 ID
router.get('/auth0/:auth0Id', getUserByAuth0Id);

export default router;
