import { Router } from 'express';
import { syncData, masterReset } from '../controllers/sync.controller';
import { authenticate } from '../middleware/auth.middleware';
import { trackActivity } from '../middleware/audit.middleware';

const router = Router();

router.post('/', authenticate, trackActivity('DATABASE_SYNC'), syncData);
router.post('/master-reset', authenticate, trackActivity('DATABASE_SYNC'), masterReset);

export default router;
