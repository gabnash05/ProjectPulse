import express from 'express';

import { registerUser, loginUser } from '../controllers/authController.js';
import { loginRateLimiter, registrationRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', registrationRateLimiter(5, 600), registerUser);
router.post('/login', loginRateLimiter(5, 300), loginUser);

export default router;