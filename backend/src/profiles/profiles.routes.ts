import { Router } from 'express';
import { upsertDonorProfile, upsertNgoProfile, getMyProfile } from './profiles.controller';
import { authenticate, authorize } from '../shared/middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/me', getMyProfile);
router.put('/donor', authorize(['DONOR']), upsertDonorProfile);
router.put('/ngo', authorize(['NGO']), upsertNgoProfile);

export default router;
