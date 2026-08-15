import { Response, Request } from 'express';
import { query, transaction } from '../shared/database';
import { AuthRequest } from '../shared/middleware/auth';

const validateLocation = (lat: any, lng: any): boolean => {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
};

export const createDonation = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = req.user!.userId;
    const { 
      food_category, 
      description, 
      quantity_kg, 
      storage_condition, 
      lat, 
      lng, 
      prepared_at, 
      usable_until, 
      available_from, 
      available_until 
    } = req.body;

    // Basic Validation
    if (!food_category || typeof quantity_kg !== 'number' || quantity_kg <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Category and positive quantity required' } });
    }

    if (!validateLocation(lat, lng)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION', message: 'Valid latitude and longitude required' } });
    }

    if (!prepared_at || !usable_until || !available_from || !available_until) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'All timestamp fields are required' } });
    }

    const tPreparedAt = new Date(prepared_at);
    const tUsableUntil = new Date(usable_until);
    const tAvailableFrom = new Date(available_from);
    const tAvailableUntil = new Date(available_until);
    const now = new Date();

    if (isNaN(tPreparedAt.getTime()) || isNaN(tUsableUntil.getTime()) || isNaN(tAvailableFrom.getTime()) || isNaN(tAvailableUntil.getTime())) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Malformed timestamps provided' } });
    }

    // Deterministic Food Risk Assessment - HARD REJECTIONS
    if (tUsableUntil <= now) {
      return res.status(400).json({ success: false, error: { code: 'RISK_REJECTED', message: 'Food is already past usable limit' } });
    }
    if (tUsableUntil <= tPreparedAt) {
      return res.status(400).json({ success: false, error: { code: 'RISK_REJECTED', message: 'Usable until must be after prepared at' } });
    }
    if (tAvailableUntil > tUsableUntil) {
      return res.status(400).json({ success: false, error: { code: 'RISK_REJECTED', message: 'Cannot be available after it expires' } });
    }
    if (tAvailableUntil <= tAvailableFrom) {
      return res.status(400).json({ success: false, error: { code: 'RISK_REJECTED', message: 'Available until must be after available from' } });
    }

    // Risk Classification
    let risk_level = 'LOW';
    const risk_reasons: string[] = [];

    const hoursSincePrepToUse = (tUsableUntil.getTime() - tPreparedAt.getTime()) / (1000 * 60 * 60);

    if (!storage_condition || storage_condition.trim() === '') {
      risk_level = 'MEDIUM';
      risk_reasons.push("Storage condition was not provided");
    }

    if (hoursSincePrepToUse > 24) {
      const storageStr = (storage_condition || '').toLowerCase();
      if (!storageStr.includes('fridge') && !storageStr.includes('freeze') && !storageStr.includes('refrigerat')) {
        risk_level = 'HIGH';
        risk_reasons.push("Extended usable window (>24h) without refrigerated storage declared");
      }
    }

    if (risk_reasons.length === 0) {
      risk_reasons.push("Platform baseline passed");
    }

    // Insert into database ONLY if assessment passed (which it has by reaching here)
    const result = await query(`
      INSERT INTO donations (
        donor_id, status, food_category, description, quantity_kg, storage_condition, 
        location, risk_level, risk_reasons, prepared_at, usable_until, available_from, available_until
      ) VALUES (
        $1, 'AVAILABLE', $2, $3, $4, $5, 
        ST_SetSRID(ST_MakePoint($6, $7), 4326), $8, $9, $10, $11, $12, $13
      ) RETURNING id, status, risk_level, risk_reasons
    `, [
      donorId, food_category, description || null, quantity_kg, storage_condition || null,
      lng, lat, risk_level, JSON.stringify(risk_reasons), 
      tPreparedAt, tUsableUntil, tAvailableFrom, tAvailableUntil
    ]);

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('createDonation error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create donation' } });
  }
};

export const claimDonation = async (req: AuthRequest, res: Response) => {
  try {
    const ngoId = req.user!.userId;
    const donationId = req.params.id;

    await transaction(async (client) => {
      // 1. Lock/check donation
      const donRes = await client.query('SELECT status, available_until, donor_id FROM donations WHERE id = $1 FOR UPDATE', [donationId]);
      if (donRes.rowCount === 0) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Donation not found' };
      }
      
      const donation = donRes.rows[0];
      
      // 2. Verify AVAILABLE
      if (donation.status !== 'AVAILABLE') {
        throw { status: 400, code: 'INVALID_STATE', message: 'Donation is not available' };
      }
      
      // 3. Verify not expired
      if (new Date(donation.available_until) <= new Date()) {
        throw { status: 400, code: 'EXPIRED', message: 'Donation availability window has expired' };
      }
      
      // 4. Create claim
      await client.query(`
        INSERT INTO claims (donation_id, ngo_id, status) VALUES ($1, $2, 'APPROVED')
      `, [donationId, ngoId]);
      
      // 5. Update donation
      await client.query(`
        UPDATE donations SET status = 'CLAIMED', updated_at = NOW() WHERE id = $1
      `, [donationId]);
      
      // 6. Notify Donor
      await client.query(`
        INSERT INTO notifications (user_id, title, message) 
        VALUES ($1, 'Donation Claimed', 'Your donation has been successfully claimed by an NGO.')
      `, [donation.donor_id]);
    });

    return res.status(200).json({ success: true, data: { status: 'CLAIMED' } });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } });
    }
    // Unique constraint violation (concurrency safety net)
    if (error.code === '23505') {
       return res.status(400).json({ success: false, error: { code: 'ALREADY_CLAIMED', message: 'Donation was claimed by another NGO' } });
    }
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal error' } });
  }
};

export const cancelDonation = async (req: AuthRequest, res: Response) => {
  try {
    const donorId = req.user!.userId;
    const donationId = req.params.id;
    const result = await query(`
      UPDATE donations SET status = 'CANCELLED', updated_at = NOW()
      WHERE id = $1 AND donor_id = $2 AND status = 'AVAILABLE'
      RETURNING id
    `, [donationId, donorId]);
    
    if (result.rowCount === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'Cannot cancel. Either it is not your donation or it is not AVAILABLE.' } });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal error' } });
  }
};

export const assignPickup = async (req: AuthRequest, res: Response) => {
  try {
    const donationId = req.params.id;
    const result = await query(`
      UPDATE donations SET status = 'PICKUP_ASSIGNED', updated_at = NOW()
      WHERE id = $1 AND status = 'CLAIMED'
      RETURNING id
    `, [donationId]);
    
    if (result.rowCount === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'Cannot transition to PICKUP_ASSIGNED' } });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

export const pickupDonation = async (req: AuthRequest, res: Response) => {
  try {
    const donationId = req.params.id;
    const result = await query(`
      UPDATE donations SET status = 'PICKED_UP', updated_at = NOW()
      WHERE id = $1 AND status = 'PICKUP_ASSIGNED'
      RETURNING id
    `, [donationId]);
    
    if (result.rowCount === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'Cannot transition to PICKED_UP' } });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

export const completeDonation = async (req: AuthRequest, res: Response) => {
  try {
    const donationId = req.params.id;
    const result = await query(`
      UPDATE donations SET status = 'COMPLETED', updated_at = NOW()
      WHERE id = $1 AND status = 'PICKED_UP'
      RETURNING id
    `, [donationId]);
    
    if (result.rowCount === 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'Cannot transition to COMPLETED' } });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};

export const getDonations = async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, radius_km, food_category, min_quantity, claims_only } = req.query;
    const userId = req.user!.userId;
    const role = req.user!.role;

    let baseQuery = `
      SELECT id, donor_id, status, food_category, description, quantity_kg, storage_condition,
             ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat,
             risk_level, risk_reasons, prepared_at, usable_until, available_from, available_until, created_at
      FROM donations
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (role === 'DONOR') {
      baseQuery += ` AND donor_id = $${paramIndex++}`;
      params.push(userId);
    } else if (role === 'NGO' && claims_only === 'true') {
      // NGO fetching their claimed/assigned/picked_up donations
      baseQuery += ` AND id IN (SELECT donation_id FROM claims WHERE ngo_id = $${paramIndex++}) AND status IN ('CLAIMED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'COMPLETED')`;
      params.push(userId);
    } else {
      // General Discovery (Available only)
      baseQuery += ` AND status = 'AVAILABLE' AND available_until > NOW()`;
      
      if (lat && lng && radius_km) {
        baseQuery += ` AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($${paramIndex++}, $${paramIndex++}), 4326)::geography, $${paramIndex++} * 1000)`;
        params.push(parseFloat(lng as string), parseFloat(lat as string), parseFloat(radius_km as string));
      }
    }

    if (food_category) {
      baseQuery += ` AND food_category = $${paramIndex++}`;
      params.push(food_category);
    }

    if (min_quantity) {
      baseQuery += ` AND quantity_kg >= $${paramIndex++}`;
      params.push(parseFloat(min_quantity as string));
    }

    baseQuery += ` ORDER BY created_at DESC`;

    const result = await query(baseQuery, params);

    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getDonations error:', err);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch donations' } });
  }
};

export const getDonationMatches = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    // 1. Fetch NGO Profile
    const ngoRes = await query('SELECT max_pickup_radius_km, capacity_kg, food_categories, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat FROM ngo_profiles WHERE user_id = $1', [userId]);
    if (ngoRes.rowCount === 0) {
      return res.status(400).json({ success: false, error: { code: 'NGO_PROFILE_REQUIRED', message: 'NGO Profile required for matching' }});
    }
    const ngo = ngoRes.rows[0];
    const capacity = ngo.capacity_kg ? parseFloat(ngo.capacity_kg) : null;
    const radius = ngo.max_pickup_radius_km;
    const categories: string[] = ngo.food_categories || [];

    // 2. Fetch Eligible Donations (Eligibility Filter)
    let baseQuery = `
      SELECT id, status, food_category, quantity_kg, available_until,
             ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000 as distance_km
      FROM donations
      WHERE status = 'AVAILABLE' 
        AND available_until > NOW()
        AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3 * 1000)
    `;
    const params: any[] = [ngo.lng, ngo.lat, radius];
    
    if (capacity !== null) {
      baseQuery += ` AND quantity_kg <= $4`;
      params.push(capacity);
    }
    
    const donationsRes = await query(baseQuery, params);
    
    // 3. Score Each Eligible Donation
    const nowMs = Date.now();
    const scoredDonations = donationsRes.rows.map(d => {
      let score = 0;
      const reasons: string[] = [];
      const distance = parseFloat(d.distance_km);
      const qty = parseFloat(d.quantity_kg);
      const availableUntil = new Date(d.available_until).getTime();

      // Distance (30 pts): continuous linear decay
      const distScore = 30 * (1 - (distance / radius));
      score += distScore;
      reasons.push(`${distance.toFixed(1)} km away`);

      // Urgency (30 pts): 24h decay window (if > 24h left, 0 pts. if 0h left, 30 pts)
      const remainingHours = (availableUntil - nowMs) / (1000 * 60 * 60);
      const urgencyScore = remainingHours <= 0 ? 30 : Math.max(0, 30 * (1 - (remainingHours / 24)));
      score += urgencyScore;
      const remainingMins = Math.floor((availableUntil - nowMs) / (1000 * 60));
      const hoursStr = remainingMins >= 60 ? `${Math.floor(remainingMins/60)}h ` : '';
      reasons.push(`Expires in ${hoursStr}${remainingMins % 60}m`);

      // Food Match (25 pts)
      if (categories.includes(d.food_category)) {
        score += 25;
        reasons.push(`Matches requested food category: ${d.food_category}`);
      }

      // Quantity (15 pts): efficient use of capacity
      if (capacity !== null) {
        const qtyScore = 15 * (qty / capacity);
        score += qtyScore;
        reasons.push(`${qty} kg fits within ${capacity} kg capacity`);
      } else {
        score += 15; // default if no capacity set
      }

      return {
        id: d.id,
        food_category: d.food_category,
        quantity_kg: d.quantity_kg,
        available_until: d.available_until,
        distance_km: distance,
        match_score: Math.round(score),
        match_reasons: reasons
      };
    });

    // 4. Sort
    scoredDonations.sort((a, b) => {
      if (b.match_score !== a.match_score) return b.match_score - a.match_score;
      const tA = new Date(a.available_until).getTime();
      const tB = new Date(b.available_until).getTime();
      if (tA !== tB) return tA - tB; // ASC for tie
      return a.id.localeCompare(b.id); // ASC for tie
    });

    return res.status(200).json({ success: true, data: scoredDonations });
  } catch (error) {
    console.error('getDonationMatches error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal error during matching' }});
  }
};

export const getDonationById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT 
        id, 
        donor_id, 
        food_category, 
        description, 
        quantity_kg, 
        status, 
        storage_condition,
        risk_level, 
        risk_reasons, 
        prepared_at, 
        available_from, 
        available_until, 
        usable_until,
        ST_X(location::geometry) as lng, 
        ST_Y(location::geometry) as lat,
        created_at, 
        updated_at
      FROM donations 
      WHERE id = $1
    `, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Donation not found' }});
    }
    
    const donation = result.rows[0];
    
    // Fetch associated images
    const imagesRes = await query('SELECT image_url FROM donation_images WHERE donation_id = $1', [id]);
    donation.images = imagesRes.rows.map(r => r.image_url);

    return res.status(200).json({ success: true, data: donation });
  } catch (error) {
    console.error('getDonationById error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch donation' }});
  }
};

export const getPrefillPrediction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    // Get the current day of the week in PostgreSQL (0 = Sunday, 6 = Saturday).
    // In JS, getDay() is also 0-6.
    const currentDay = new Date().getDay();

    const result = await query(`
      SELECT AVG(quantity_kg) as expected_kg
      FROM donations
      WHERE donor_id = $1 
        AND EXTRACT(DOW FROM created_at) = $2
    `, [userId, currentDay]);

    let predicted_kg = 5; // Default fallback if no history

    if (result.rowCount !== null && result.rowCount > 0 && result.rows[0].expected_kg) {
      predicted_kg = Math.round(parseFloat(result.rows[0].expected_kg) * 10) / 10;
    }

    return res.status(200).json({ success: true, data: { predicted_kg } });
  } catch (error) {
    console.error('getPrefillPrediction error:', error);
    return res.status(500).json({ success: false });
  }
};

export const uploadDonationImages = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const donorId = req.user!.userId;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILES', message: 'No images provided' } });
    }

    // Verify ownership
    const donRes = await query('SELECT donor_id FROM donations WHERE id = $1', [id]);
    if (donRes.rowCount === 0 || donRes.rows[0].donor_id !== donorId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot upload images for this donation' } });
    }

    const insertPromises = files.map(file => {
      const url = `/uploads/${file.filename}`;
      return query('INSERT INTO donation_images (donation_id, image_url) VALUES ($1, $2)', [id, url]);
    });

    await Promise.all(insertPromises);

    return res.status(200).json({ success: true, message: 'Images uploaded successfully' });
  } catch (error) {
    console.error('uploadDonationImages error:', error);
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to upload images' } });
  }
};
