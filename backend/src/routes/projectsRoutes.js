import express from 'express';

// ALL OF THESE NOT YET DEFINED
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { isProjectHead } from '../middleware/projectMiddleware.js';
import { getAllProjects, getProject, getAllProjectTasks, createProject, addProjectMember, updateProject, deleteProject, removeProjectMember } from '../controllers/projectsController.js';
//

const router = express.Router();


router.get('/', authenticateJWT, getAllProjects);
router.get('/:projectId', authenticateJWT, getProject);
router.get('/:projectId/tasks', authenticateJWT, getAllProjectTasks);
router.post('/', authenticateJWT, createProject); // project head only
router.post('/:projectId/members', authenticateJWT, isProjectHead, addProjectMember); // project head only
router.put('/:projectId', authenticateJWT, isProjectHead, updateProject); // project head only
router.delete('/:projectId', authenticateJWT, isProjectHead, deleteProject); // project head only
router.delete('/:projectId/members/:userId', authenticateJWT, isProjectHead, removeProjectMember); // project head only


export default router;