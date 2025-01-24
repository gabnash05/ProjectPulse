import express from 'express';

// ALL OF THESE NOT YET DEFINED
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { isProjectHead } from '../middleware/projectMiddleware.js';
import { getTask, createTask, updateTask, updateTaskStatus, deleteTask } from '../controllers/tasksController.js';
//

const router = express.Router();

router.get('/:taskId', authenticateJWT, getTask);
router.post('/:projectId', authenticateJWT, createTask);
router.patch('/:taskId', authenticateJWT, updateTask); // project head only for deadline and assignee
router.patch('/:taskId/status', authenticateJWT, updateTaskStatus); 
router.delete('/:projectId/:taskId', authenticateJWT, isProjectHead, deleteTask); // project head only

export default router;