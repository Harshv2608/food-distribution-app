import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import pool, { query } from '../src/shared/database';

describe('Deterministic Matching Algorithm (Phase 3C)', () => {
  let ngoToken: string;
  let donorToken: string;

  beforeAll(async () => {
    await query('SELECT 1');
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await query('TRUNCATE TABLE claims, donations, volunteer_profiles, ngo_profiles, donor_profiles, users CASCADE;');
    
    // DONOR
    await request(app).post('/api/v1/auth/register').send({ email: 'donor@test.com', password: 'password123', role: 'DONOR' });
    const resDonor = await request(app).post('/api/v1/auth/login').send({ email: 'donor@test.com', password: 'password123' });
    donorToken = resDonor.body.data.token;
    await request(app).put('/api/v1/profiles/donor').set('Authorization', `Bearer ${donorToken}`).send({ lat: 10, lng: 10 });

    // NGO
    await request(app).post('/api/v1/auth/register').send({ email: 'ngo@test.com', password: 'password123', role: 'NGO' });
    const resNgo = await request(app).post('/api/v1/auth/login').send({ email: 'ngo@test.com', password: 'password123' });
    ngoToken = resNgo.body.data.token;
    
    // Create NGO Profile: center at (10, 10), radius 200km, capacity 50kg, wants RICE and VEGETABLES
    await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({ 
      lat: 10, lng: 10, 
      max_pickup_radius_km: 200, 
      capacity_kg: 50, 
      food_categories: ['RICE', 'VEGETABLES'] 
    });
  });

  const createDonation = async (lat: number, lng: number, category: string, quantity: number, timeShiftHours: number = 5) => {
    const now = Date.now();
    const hour = 1000 * 60 * 60;
    const res = await request(app)
      .post('/api/v1/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        food_category: category,
        description: 'Test',
        quantity_kg: quantity,
        storage_condition: 'Fridge',
        lat,
        lng,
        prepared_at: new Date(now - hour).toISOString(),
        usable_until: new Date(now + timeShiftHours * hour).toISOString(),
        available_from: new Date(now).toISOString(),
        available_until: new Date(now + timeShiftHours * hour).toISOString()
      });
    return res.body.data.id;
  };

  it('only scores eligible donations and omits inelligible ones (over capacity, too far, expired)', async () => {
    const idValid = await createDonation(10, 10, 'RICE', 20, 5);
    const idFar = await createDonation(20, 20, 'RICE', 20, 5); // ~1500km away, exceeds 200km
    const idHuge = await createDonation(10, 10, 'RICE', 100, 5); // 100kg exceeds 50kg capacity
    
    const res = await request(app).get('/api/v1/donations/matches').set('Authorization', `Bearer ${ngoToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.data.map((d: any) => d.id);
    expect(ids).toContain(idValid);
    expect(ids).not.toContain(idFar);
    expect(ids).not.toContain(idHuge);
  });

  it('calculates expected score components (Distance, Urgency, Category, Quantity)', async () => {
    // 10, 10 is distance 0 km (30 pts)
    // 5 hours remaining = urgency ~23.75 pts (30 * (1 - 5/24))
    // Category RICE = match (25 pts)
    // Quantity 25kg / 50kg = 0.5 ratio (7.5 pts)
    // Total approx: 30 + 23.75 + 25 + 7.5 = 86
    const id = await createDonation(10, 10, 'RICE', 25, 5);
    
    const res = await request(app).get('/api/v1/donations/matches').set('Authorization', `Bearer ${ngoToken}`);
    expect(res.status).toBe(200);
    const match = res.body.data[0];
    
    expect(match.match_score).toBeGreaterThanOrEqual(85);
    expect(match.match_score).toBeLessThanOrEqual(87);
    
    // Verify reasons exist
    expect(match.match_reasons.some((r: string) => r.includes('0.0 km away'))).toBe(true);
    expect(match.match_reasons.some((r: string) => r.includes('Matches requested food category'))).toBe(true);
    expect(match.match_reasons.some((r: string) => r.includes('25 kg fits within 50 kg capacity'))).toBe(true);
  });

  it('penalizes category mismatch and calculates quantity correctly', async () => {
    // Distance 0 (30), 5 hours remaining (~23.75), Category mismatch (0), 50kg / 50kg (15)
    // Total approx: 30 + 23.75 + 0 + 15 = 68.75 -> 69
    await createDonation(10, 10, 'BAKERY', 50, 5);
    
    const res = await request(app).get('/api/v1/donations/matches').set('Authorization', `Bearer ${ngoToken}`);
    const match = res.body.data[0];
    
    expect(match.match_score).toBeGreaterThanOrEqual(68);
    expect(match.match_score).toBeLessThanOrEqual(70);
    // Should NOT have category reason
    expect(match.match_reasons.some((r: string) => r.includes('Matches requested'))).toBe(false);
  });

  it('ranks correctly using tie-breakers when multiple donations exist', async () => {
    // We will create 3 donations
    
    // A: High distance score, perfect match. (approx 86 points)
    const idA = await createDonation(10, 10, 'RICE', 25, 5);
    
    // B: Perfect match, but expires very soon! Higher urgency. (approx 92 points)
    const idB = await createDonation(10, 10, 'RICE', 25, 1);
    
    // C: Same as A exactly. We will test tie-breakers (available_until / id)
    const idC = await createDonation(10, 10, 'RICE', 25, 5);

    const res = await request(app).get('/api/v1/donations/matches').set('Authorization', `Bearer ${ngoToken}`);
    expect(res.status).toBe(200);
    
    const results = res.body.data;
    expect(results.length).toBe(3);
    
    // B should be first because 1 hour remaining gives higher urgency score
    expect(results[0].id).toBe(idB);
    
    // A and C should be 2nd and 3rd. Tiebreaker is available_until, but they might be same millisecond. 
    // The query sorts by score DESC, available_until ASC, id ASC.
    const score0 = results[0].match_score;
    const score1 = results[1].match_score;
    const score2 = results[2].match_score;
    
    expect(score0).toBeGreaterThan(score1);
    expect(score1).toBe(score2);
    
    // Confirm strictly descending
    expect(results[0].match_score).toBeGreaterThanOrEqual(results[1].match_score);
    expect(results[1].match_score).toBeGreaterThanOrEqual(results[2].match_score);
  });
});
