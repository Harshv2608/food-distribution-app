import { Response } from 'express';
import { transaction } from '../shared/database';
import { AuthRequest } from '../shared/middleware/auth';

export const cancelClaim = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = req.user!.userId;
    const claimId = req.params.id;

    await transaction(async (client) => {
      // 1. Lock claim
      const claimRes = await client.query('SELECT donation_id, status FROM claims WHERE id = $1 AND ngo_id = $2 FOR UPDATE', [claimId, ngoId]);
      if (claimRes.rowCount === 0) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Claim not found or you lack permission' };
      }
      
      const claim = claimRes.rows[0];
      if (claim.status === 'CANCELLED') {
        throw { status: 400, code: 'ALREADY_CANCELLED', message: 'Claim is already cancelled' };
      }

      // 2. Lock donation
      const donRes = await client.query('SELECT available_until, status FROM donations WHERE id = $1 FOR UPDATE', [claim.donation_id]);
      const donation = donRes.rows[0];

      if (donation.status !== 'CLAIMED') {
        throw { status: 400, code: 'INVALID_TRANSITION', message: 'Donation must be CLAIMED to cancel the claim' };
      }

      const available_until = new Date(donation.available_until);
      
      // Deterministically decide next state: AVAILABLE if time remains, EXPIRED otherwise
      const nextDonationStatus = available_until > new Date() ? 'AVAILABLE' : 'EXPIRED';

      // 3. Update both atomically
      await client.query(`UPDATE claims SET status = 'CANCELLED' WHERE id = $1`, [claimId]);
      await client.query(`UPDATE donations SET status = $1, updated_at = NOW() WHERE id = $2`, [nextDonationStatus, claim.donation_id]);
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } });
    }
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal error' } });
  }
};
