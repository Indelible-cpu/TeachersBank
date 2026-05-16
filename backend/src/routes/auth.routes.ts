import { Router } from 'express';
import { login, register, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/change-password', authenticate, changePassword);

export default router;
