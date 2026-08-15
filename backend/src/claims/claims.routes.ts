import { Router } from 'express';
import { cancelClaim } from './claims.controller';
import { authenticate, authorize } from '../shared/middleware/auth';

const router = Router();

router.post('/:id/cancel', authenticate, authorize(['NGO']), cancelClaim);

export default router;
