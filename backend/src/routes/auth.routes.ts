import { Router } from 'express';
import { login, register, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  generateRegistrationOptionsHandler,
  verifyRegistrationResponseHandler,
  generateAuthenticationOptionsHandler,
  verifyAuthenticationResponseHandler
} from '../controllers/webauthn.controller';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/change-password', authenticate, changePassword);

// WebAuthn Biometrics Routes
router.get('/webauthn/register/options', authenticate, generateRegistrationOptionsHandler);
router.post('/webauthn/register/verify', authenticate, verifyRegistrationResponseHandler);
router.post('/webauthn/login/options', generateAuthenticationOptionsHandler);
router.post('/webauthn/login/verify', verifyAuthenticationResponseHandler);

export default router;
