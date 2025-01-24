import express from 'express';

import { authenticateJWT } from '../middleware/authMiddleware.js';
import { isProjectHead } from '../middleware/projectMiddleware.js';
import { getProject, getAllProjectTasks, getAllProjectMembers, createProject, addProjectMember, updateProject, deleteProject, removeProjectMember } from '../controllers/projectsController.js';

const router = express.Router();

router.get('/:projectId', authenticateJWT, getProject);
router.get('/:projectId/tasks', authenticateJWT, getAllProjectTasks);
router.get('/:projectId/members', authenticateJWT, getAllProjectMembers);
router.post('/', authenticateJWT, createProject); // project head only
router.post('/:projectId/members', authenticateJWT, isProjectHead, addProjectMember); // project head only
router.patch('/:projectId', authenticateJWT, isProjectHead, updateProject); // project head only
router.delete('/:projectId', authenticateJWT, isProjectHead, deleteProject); // project head only
router.delete('/:projectId/members/:memberId', authenticateJWT, isProjectHead, removeProjectMember); // project head only

export default router;