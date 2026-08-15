import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { createDonation, claimDonation, cancelDonation, assignPickup, pickupDonation, completeDonation, getDonations, getDonationMatches, getDonationById, getPrefillPrediction, uploadDonationImages } from './donations.controller';
import { authenticate, authorize } from '../shared/middleware/auth';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'donation-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

router.get('/', authenticate, getDonations);
router.get('/matches', authenticate, authorize(['NGO']), getDonationMatches);
router.get('/prefill', authenticate, authorize(['DONOR']), getPrefillPrediction);
router.get('/:id', authenticate, getDonationById);

// Only DONOR can create donations and upload images
router.post('/', authenticate, authorize(['DONOR']), createDonation);
router.post('/:id/images', authenticate, authorize(['DONOR']), upload.array('images', 3), uploadDonationImages);

// Lifecycle actions
router.post('/:id/claim', authenticate, authorize(['NGO']), claimDonation);
router.post('/:id/cancel', authenticate, authorize(['DONOR']), cancelDonation);
router.post('/:id/pickup-assigned', authenticate, authorize(['DONOR', 'NGO']), assignPickup);
router.post('/:id/picked-up', authenticate, authorize(['NGO']), pickupDonation);
router.post('/:id/complete', authenticate, authorize(['NGO']), completeDonation);

export default router;
