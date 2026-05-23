import { Router } from 'express';
import { login, register, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { generateRegOptions, verifyRegResponse, generateAuthOptions, verifyAuthResponse } from '../controllers/webauthn.controller';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/change-password', authenticate, changePassword);

// WebAuthn Biometric routes
router.post('/webauthn/register/options', authenticate, generateRegOptions);
router.post('/webauthn/register/verify', authenticate, verifyRegResponse);
router.post('/webauthn/login/options', generateAuthOptions);
router.post('/webauthn/login/verify', verifyAuthResponse);

export default router;
