import express from 'express';

// ALL OF THESE NOT YET DEFINED
import { authenticateJWT } from '../middleware/authMiddleware.js';
import { isProjectHead } from '../middleware/projectMiddleware.js';
import { getAllTasks, getTask, createTask, updateTask, updateTaskStatus, deleteTask } from '../controllers/tasksController.js';
//

const router = express.Router();


router.get('/', authenticateJWT, getAllTasks);
router.get('/:taskId', authenticateJWT, getTask);
router.post('/', authenticateJWT, createTask);
router.put('/:taskId', authenticateJWT, updateTask);
router.patch('/:taskId/status', authenticateJWT, updateTaskStatus); 
router.delete('/:taskId', authenticateJWT, isProjectHead, deleteTask); // project head only


export default router;