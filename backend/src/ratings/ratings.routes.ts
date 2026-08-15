import { Router } from 'express';
import { createRating, getDonationRatings, getProfileRatings } from './ratings.controller';
import { authenticate } from '../shared/middleware/auth';

const router = Router();

// Notice: We map /api/v1/ratings logic differently. 
// Actually, POST and GET for a donation make more sense under donations.routes.ts or mapped here with full paths.
// But following REST:
// GET /api/v1/ratings/profiles/:id -> getProfileRatings
// POST /api/v1/ratings/donations/:id -> createRating
// GET /api/v1/ratings/donations/:id -> getDonationRatings

router.post('/donations/:id', authenticate, createRating);
router.get('/donations/:id', authenticate, getDonationRatings);
router.get('/profiles/:id', authenticate, getProfileRatings);

export default router;
