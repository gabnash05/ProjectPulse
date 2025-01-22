import express from 'express';

// ALL OF THESE NOT YET DEFINED
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { getUserProfile, getUserProjects, getUserTasks } from '../controllers/usersController.js';
//

const router = express.Router();


router.get('/profile', authenticateJWT, getUserProfile);
router.get('/projects', authenticateJWT, getUserProjects);
router.get('/tasks', authenticateJWT, getUserTasks);


export default router;