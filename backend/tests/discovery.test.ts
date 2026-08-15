import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import pool, { query } from '../src/shared/database';

describe('Donation Discovery (Phase 3A)', () => {
  let donorToken: string;
  let ngoToken: string;

  beforeAll(async () => {
    await query('SELECT 1');
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await query('TRUNCATE TABLE claims, donations, volunteer_profiles, ngo_profiles, donor_profiles, users CASCADE;');
    
    // Register & Login DONOR
    await request(app).post('/api/v1/auth/register').send({ email: 'donor@test.com', password: 'password123', role: 'DONOR' });
    const resDonor = await request(app).post('/api/v1/auth/login').send({ email: 'donor@test.com', password: 'password123' });
    donorToken = resDonor.body.data.token;
    await request(app).put('/api/v1/profiles/donor').set('Authorization', `Bearer ${donorToken}`).send({ lat: 10, lng: 20 });

    // Register & Login NGO
    await request(app).post('/api/v1/auth/register').send({ email: 'ngo@test.com', password: 'password123', role: 'NGO' });
    const resNgo = await request(app).post('/api/v1/auth/login').send({ email: 'ngo@test.com', password: 'password123' });
    ngoToken = resNgo.body.data.token;
    await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({ lat: 10, lng: 10 });
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

  it('returns available donations and excludes expired/claimed/cancelled ones', async () => {
    const idAvailable = await createDonation(34.0, -118.0, 'RICE', 10);
    const idClaimed = await createDonation(34.0, -118.0, 'RICE', 10);
    const idCancelled = await createDonation(34.0, -118.0, 'RICE', 10);
    const idExpired = await createDonation(34.0, -118.0, 'RICE', 10);

    // Modify states
    const claimRes = await request(app).post(`/api/v1/donations/${idClaimed}/claim`).set('Authorization', `Bearer ${ngoToken}`);
    if (claimRes.status !== 200) console.error('Claim failed:', claimRes.body);

    const cancelRes = await request(app).post(`/api/v1/donations/${idCancelled}/cancel`).set('Authorization', `Bearer ${donorToken}`);
    if (cancelRes.status !== 200) console.error('Cancel failed:', cancelRes.body);
    
    await query('UPDATE donations SET available_from = NOW() - interval \'2 hours\', available_until = NOW() - interval \'1 hour\' WHERE id = $1', [idExpired]);

    const res = await request(app).get('/api/v1/donations').set('Authorization', `Bearer ${ngoToken}`);
    if (res.body.data.length !== 1) {
      console.error('Leaked donations:', res.body.data.map((d: any) => ({ id: d.id, status: d.status, available_until: d.available_until })));
    }
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(idAvailable);
  });

  it('filters by PostGIS radius successfully (includes inside, exactly on boundary, excludes outside)', async () => {
    // Center point: (10, 10). 
    // 1 degree latitude ~ 111 km. 
    // We will query with lat: 10, lng: 10, radius: 150km.
    
    // Inside: distance = 0km
    const idInside = await createDonation(10, 10, 'VEGETABLES', 5);
    
    // Boundary: distance ~ 111km (lat + 1)
    const idBoundary = await createDonation(11, 10, 'VEGETABLES', 5);
    
    // Outside: distance ~ 222km (lat + 2)
    const idOutside = await createDonation(12, 10, 'VEGETABLES', 5);

    const res = await request(app)
      .get('/api/v1/donations?lat=10&lng=10&radius_km=150')
      .set('Authorization', `Bearer ${ngoToken}`);
      
    expect(res.status).toBe(200);
    const ids = res.body.data.map((d: any) => d.id);
    expect(ids).toContain(idInside);
    expect(ids).toContain(idBoundary);
    expect(ids).not.toContain(idOutside);
  });

  it('filters by category successfully', async () => {
    const idVeg = await createDonation(10, 10, 'VEGETABLES', 5);
    const idRice = await createDonation(10, 10, 'RICE', 5);

    const res = await request(app).get('/api/v1/donations?food_category=VEGETABLES').set('Authorization', `Bearer ${ngoToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(idVeg);
  });

  it('filters by min_quantity successfully', async () => {
    const idSmall = await createDonation(10, 10, 'VEGETABLES', 5);
    const idLarge = await createDonation(10, 10, 'VEGETABLES', 50);

    const res = await request(app).get('/api/v1/donations?min_quantity=20').set('Authorization', `Bearer ${ngoToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(idLarge);
  });
});
