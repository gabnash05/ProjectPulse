import express from 'express';

// ALL OF THESE NOT YET DEFINED
import { registerUser, loginUser } from '../controllers/authController.js';
//

const router = express.Router();


router.post('/register', registerUser);
router.post('/login', loginUser);


export default router;