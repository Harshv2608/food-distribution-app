import { Router } from 'express';
import { getSystemStats, getAllNGOs, verifyNGO, getAllUsers, updateUser, getAllDonations, getAllRatings, deleteRating } from './admin.controller';
import { authenticate, authorize } from '../shared/middleware/auth';

const router = Router();

// Protect all admin routes
router.use(authenticate);
router.use(authorize(['ADMIN']));

// Existing
router.get('/stats', getSystemStats);
router.get('/ngos', getAllNGOs);
router.put('/ngos/:id/verify', verifyNGO);

// New Super-Controls
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);

router.get('/donations', getAllDonations);

router.get('/ratings', getAllRatings);
router.delete('/ratings/:id', deleteRating);

export default router;
