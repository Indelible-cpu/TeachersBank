import { Router } from 'express';
import { syncData } from '../controllers/sync.controller';

const router = Router();

router.post('/', syncData);

export default router;
