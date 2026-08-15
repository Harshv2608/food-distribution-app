import { Request, Response } from 'express';
import { query } from '../shared/database';
import { AuthRequest } from '../shared/middleware/auth';

const validateLocation = (lat: any, lng: any): boolean => {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
};

export const upsertDonorProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { lat, lng, default_prep_time, default_storage, preferred_pickup } = req.body;
    
    if (!validateLocation(lat, lng)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION', message: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required' } });
    }

    if (preferred_pickup && !['NGO_PICKUP', 'DONOR_DELIVERY', 'VOLUNTEER_PICKUP'].includes(preferred_pickup)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_PICKUP', message: 'Invalid pickup type' } });
    }

    const result = await query(`
      INSERT INTO donor_profiles (user_id, location, default_prep_time, default_storage, preferred_pickup)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        location = ST_SetSRID(ST_MakePoint($2, $3), 4326),
        default_prep_time = EXCLUDED.default_prep_time,
        default_storage = EXCLUDED.default_storage,
        preferred_pickup = EXCLUDED.preferred_pickup
      RETURNING user_id, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat, default_prep_time, default_storage, preferred_pickup
    `, [userId, lng, lat, default_prep_time || null, default_storage || null, preferred_pickup || null]);

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('upsertDonorProfile error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update donor profile' } });
  }
};

export const upsertNgoProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { lat, lng, max_pickup_radius_km, capacity_kg, food_categories, needs_description } = req.body;
    
    let dbLat = lat;
    let dbLng = lng;
    
    if (lat === undefined || lng === undefined) {
      const existing = await query('SELECT ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng FROM ngo_profiles WHERE user_id = $1', [userId]);
      if (existing.rowCount === 0) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION', message: 'Location is required for initial profile creation' } });
      }
      dbLat = existing.rows[0].lat;
      dbLng = existing.rows[0].lng;
    } else if (!validateLocation(lat, lng)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION', message: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required' } });
    }

    if (capacity_kg !== undefined && capacity_kg !== null) {
      if (typeof capacity_kg !== 'number' || capacity_kg <= 0) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_CAPACITY', message: 'Capacity must be a positive number' } });
      }
    }

    const VALID_CATEGORIES = ['COOKED_MEALS', 'RICE', 'VEGETABLES', 'FRUITS', 'BAKERY', 'PACKAGED_FOOD', 'DAIRY', 'OTHER'];
    let cleanCategories = null;
    if (food_categories && Array.isArray(food_categories)) {
      cleanCategories = food_categories.map(c => typeof c === 'string' ? c.trim().toUpperCase() : '');
      const invalid = cleanCategories.filter(c => !VALID_CATEGORIES.includes(c));
      if (invalid.length > 0) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_CATEGORY', message: 'Invalid food category provided' } });
      }
    }

    const radius = max_pickup_radius_km ? parseInt(max_pickup_radius_km, 10) : 10;

    const result = await query(`
      INSERT INTO ngo_profiles (user_id, location, max_pickup_radius_km, capacity_kg, food_categories, needs_description)
      VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        location = ST_SetSRID(ST_MakePoint($2, $3), 4326),
        max_pickup_radius_km = EXCLUDED.max_pickup_radius_km,
        capacity_kg = EXCLUDED.capacity_kg,
        food_categories = EXCLUDED.food_categories,
        needs_description = EXCLUDED.needs_description
      RETURNING user_id, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat, is_verified, max_pickup_radius_km, capacity_kg, food_categories, needs_description
    `, [userId, dbLng, dbLat, radius, capacity_kg || null, cleanCategories, needs_description || null]);

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('upsertNgoProfile error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update NGO profile' } });
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    
    let profileData: any = {};
    let impactScore = 0;
    
    // Fetch average rating
    const ratingRes = await query('SELECT COALESCE(AVG(rating), 0) as avg_rating FROM ratings WHERE rated_user_id = $1', [userId]);
    const avgRating = parseFloat(ratingRes.rows[0].avg_rating) || 0;

    const determineBadge = (score: number) => {
      if (score >= 1500) return 'GOLD';
      if (score >= 500) return 'SILVER';
      return 'BRONZE';
    };

    if (role === 'DONOR') {
      const p = await query('SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat, default_prep_time, default_storage, preferred_pickup FROM donor_profiles WHERE user_id = $1', [userId]);
      if (p.rowCount !== null && p.rowCount > 0) profileData = p.rows[0];
      
      const stats = await query(`
        SELECT 
          COUNT(CASE WHEN status IN ('PICKED_UP', 'COMPLETED') THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_count,
          COALESCE(SUM(CASE WHEN status IN ('PICKED_UP', 'COMPLETED') THEN quantity_kg ELSE 0 END), 0) as food_rescued 
        FROM donations 
        WHERE donor_id = $1
      `, [userId]);
      
      const completedCount = parseInt(stats.rows[0].completed_count) || 0;
      const cancelledCount = parseInt(stats.rows[0].cancelled_count) || 0;
      const foodRescued = parseFloat(stats.rows[0].food_rescued) || 0;
      
      // Impact Score rules: 10 points per completion, 2 points per kg, -15 per cancellation, +10 * avg_rating
      impactScore = (completedCount * 10) + (foodRescued * 2) - (cancelledCount * 15) + (avgRating * 10);
      impactScore = Math.max(0, Math.round(impactScore)); // Prevent negative total score
      const badgeTier = determineBadge(impactScore);

      profileData = { ...profileData, stats: { completedCount, cancelledCount, foodRescued, avgRating, impactScore, badgeTier } };

    } else if (role === 'NGO') {
      const p = await query('SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat, max_pickup_radius_km, capacity_kg, food_categories, needs_description, is_verified FROM ngo_profiles WHERE user_id = $1', [userId]);
      if (p.rowCount !== null && p.rowCount > 0) profileData = p.rows[0];

      const stats = await query(`
        SELECT 
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as claimed_count,
          COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_count
        FROM claims 
        WHERE ngo_id = $1
      `, [userId]);
      
      const claimedCount = parseInt(stats.rows[0].claimed_count) || 0;
      const cancelledCount = parseInt(stats.rows[0].cancelled_count) || 0;
      
      // Impact Score rules: 25 points per successful claim, -20 per cancellation, +10 * avgRating
      impactScore = (claimedCount * 25) - (cancelledCount * 20) + (avgRating * 10);
      impactScore = Math.max(0, Math.round(impactScore));
      const badgeTier = determineBadge(impactScore);

      profileData = { ...profileData, stats: { claimedCount, cancelledCount, avgRating, impactScore, badgeTier } };
    }

    return res.status(200).json({ success: true, data: profileData });
  } catch (error) {
    console.error('getMyProfile error:', error);
    return res.status(500).json({ success: false, error: { message: 'Internal error' } });
  }
};
