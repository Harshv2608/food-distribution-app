import { Response } from 'express';
import { query } from '../shared/database';
import { AuthRequest } from '../shared/middleware/auth';

export const createRating = async (req: AuthRequest, res: Response) => {
  try {
    const { id: donationId } = req.params;
    const { rating, review } = req.body;
    const raterId = req.user!.userId;
    
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Rating must be between 1 and 5' } });
    }

    // 1. Check if the donation exists and is COMPLETED or PICKED_UP
    const donRes = await query('SELECT donor_id, status FROM donations WHERE id = $1', [donationId]);
    if (donRes.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Donation not found' } });
    }
    const donation = donRes.rows[0];
    if (donation.status !== 'PICKED_UP' && donation.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Cannot rate a donation until it is picked up or completed' } });
    }

    // 2. Determine who the rater is and who is being rated
    let ratedUserId: string;
    
    if (raterId === donation.donor_id) {
      // Donor is rating the NGO
      // We need to find the NGO who claimed it
      const claimRes = await query('SELECT ngo_id FROM claims WHERE donation_id = $1 AND status = $2', [donationId, 'APPROVED']);
      if (claimRes.rowCount === 0) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'No approved claim found for this donation' } });
      }
      ratedUserId = claimRes.rows[0].ngo_id;
    } else {
      // Check if rater is the NGO who claimed it
      const claimRes = await query('SELECT ngo_id FROM claims WHERE donation_id = $1 AND status = $2 AND ngo_id = $3', [donationId, 'APPROVED', raterId]);
      if (claimRes.rowCount && claimRes.rowCount > 0) {
        // NGO is rating the donor
        ratedUserId = donation.donor_id;
      } else {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You are not a participant in this donation' } });
      }
    }

    if (raterId === ratedUserId) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Cannot rate yourself' } });
    }

    // 3. Insert rating
    const result = await query(`
      INSERT INTO ratings (donation_id, rater_id, rated_user_id, rating, review)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, rating, review, created_at
    `, [donationId, raterId, ratedUserId, rating, review || null]);

    return res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ success: false, error: { code: 'ALREADY_RATED', message: 'You have already rated this donation' } });
    }
    console.error('createRating error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit rating' } });
  }
};

export const getDonationRatings = async (req: AuthRequest, res: Response) => {
  try {
    const { id: donationId } = req.params;
    const result = await query(`
      SELECT r.id, r.rating, r.review, r.created_at, 
             u1.role as rater_role, u2.role as rated_role
      FROM ratings r
      JOIN users u1 ON r.rater_id = u1.id
      JOIN users u2 ON r.rated_user_id = u2.id
      WHERE r.donation_id = $1
    `, [donationId]);
    
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getDonationRatings error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch ratings' } });
  }
};

export const getProfileRatings = async (req: AuthRequest, res: Response) => {
  try {
    const { id: profileId } = req.params;
    const result = await query(`
      SELECT r.id, r.rating, r.review, r.created_at, u.role as rater_role
      FROM ratings r
      JOIN users u ON r.rater_id = u.id
      WHERE r.rated_user_id = $1
      ORDER BY r.created_at DESC
    `, [profileId]);
    
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('getProfileRatings error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch profile ratings' } });
  }
};
