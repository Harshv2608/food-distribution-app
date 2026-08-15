import { Request, Response } from 'express';
import { query } from '../shared/database';
import { AuthRequest } from '../shared/middleware/auth';

export const getSystemStats = async (req: AuthRequest, res: Response) => {
  try {
    const donorsCount = await query(`SELECT count(*) FROM users WHERE role = 'DONOR'`);
    const ngosCount = await query(`SELECT count(*) FROM users WHERE role = 'NGO'`);
    
    const donationsActive = await query(`SELECT count(*) FROM donations WHERE status IN ('AVAILABLE', 'CLAIMED', 'PICKUP_ASSIGNED')`);
    const donationsCompleted = await query(`SELECT count(*) FROM donations WHERE status IN ('PICKED_UP', 'COMPLETED')`);
    
    // Total food rescued (kg)
    const foodRescued = await query(`SELECT COALESCE(SUM(quantity_kg), 0) as total FROM donations WHERE status IN ('PICKED_UP', 'COMPLETED')`);

    return res.status(200).json({
      success: true,
      data: {
        total_donors: parseInt(donorsCount.rows[0].count),
        total_ngos: parseInt(ngosCount.rows[0].count),
        active_donations: parseInt(donationsActive.rows[0].count),
        completed_donations: parseInt(donationsCompleted.rows[0].count),
        food_rescued_kg: parseFloat(foodRescued.rows[0].total)
      }
    });
  } catch (error) {
    console.error('getSystemStats error', error);
    return res.status(500).json({ success: false, error: { message: 'Internal error' } });
  }
};

export const getAllNGOs = async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        u.id as user_id, u.email, u.is_active, u.created_at,
        n.is_verified, n.capacity_kg, n.food_categories, n.needs_description
      FROM users u
      LEFT JOIN ngo_profiles n ON u.id = n.user_id
      WHERE u.role = 'NGO'
      ORDER BY u.created_at DESC
    `);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: 'Internal error' } });
  }
};

export const verifyNGO = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;
    
    await query(`UPDATE ngo_profiles SET is_verified = $1 WHERE user_id = $2`, [is_verified, id]);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: 'Internal error' } });
  }
};

import bcrypt from 'bcrypt';

// Helper to check admin
const isAdmin = (req: AuthRequest): boolean => {
  return req.user?.role === 'ADMIN';
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    
    const result = await query(`
      SELECT u.id as user_id, u.email, u.role, u.is_active, u.created_at,
             n.is_verified as ngo_verified
      FROM users u
      LEFT JOIN ngo_profiles n ON u.id = n.user_id
      ORDER BY u.created_at DESC
    `);
    
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    
    const { id } = req.params;
    const { role, is_active, ngo_verified, new_password } = req.body;
    
    if (role || is_active !== undefined || new_password) {
      const updates = [];
      const params: any[] = [id];
      let idx = 2;
      if (role) { updates.push(`role = $${idx++}`); params.push(role); }
      if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(is_active); }
      
      if (new_password) {
        const hash = await bcrypt.hash(new_password, 10);
        updates.push(`password_hash = $${idx++}`);
        params.push(hash);
      }

      if (updates.length > 0) {
        await query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1`, params);
      }
    }
    
    if (ngo_verified !== undefined) {
      await query(`UPDATE ngo_profiles SET is_verified = $2 WHERE user_id = $1`, [ngo_verified, id]);
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('updateUser error', error);
    return res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
};

export const getAllDonations = async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    
    const result = await query(`
      SELECT d.id, d.food_category, d.quantity_kg, d.status, d.risk_level, d.created_at,
             u.email as donor_email
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      ORDER BY d.created_at DESC
    `);
    
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
};

export const getAllRatings = async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    
    const result = await query(`
      SELECT r.id, r.rating, r.review, r.created_at,
             d.food_category, d.quantity_kg,
             u1.email as rater_email,
             u2.email as rated_email
      FROM ratings r
      JOIN donations d ON r.donation_id = d.id
      JOIN users u1 ON r.rater_id = u1.id
      JOIN users u2 ON r.rated_user_id = u2.id
      ORDER BY r.created_at DESC
    `);
    
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
};

export const deleteRating = async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    
    const { id } = req.params;
    await query(`DELETE FROM ratings WHERE id = $1`, [id]);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: 'Server Error' } });
  }
};
