import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import pool, { query } from '../src/shared/database';

describe('NGO Needs Profile (Phase 3B)', () => {
  let ngoToken: string;
  let ngoUserId: string;
  let donorToken: string;

  beforeAll(async () => {
    await query('SELECT 1');
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await query('TRUNCATE TABLE claims, donations, volunteer_profiles, ngo_profiles, donor_profiles, users CASCADE;');
    
    // Register & Login NGO
    await request(app).post('/api/v1/auth/register').send({ email: 'ngo@test.com', password: 'password123', role: 'NGO' });
    const resNgo = await request(app).post('/api/v1/auth/login').send({ email: 'ngo@test.com', password: 'password123' });
    ngoToken = resNgo.body.data.token;
    const userDb = await query('SELECT id FROM users WHERE email = $1', ['ngo@test.com']);
    ngoUserId = userDb.rows[0].id;

    // Register & Login DONOR
    await request(app).post('/api/v1/auth/register').send({ email: 'donor@test.com', password: 'password123', role: 'DONOR' });
    const resDonor = await request(app).post('/api/v1/auth/login').send({ email: 'donor@test.com', password: 'password123' });
    donorToken = resDonor.body.data.token;
  });

  it('allows NGO to set capacity, food categories, and needs description', async () => {
    const res = await request(app)
      .put('/api/v1/profiles/ngo')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({
        lat: 10, lng: 20,
        capacity_kg: 50,
        food_categories: ['RICE', 'vegetables '], // Test normalization
        needs_description: 'We need rice for 50 people'
      });
      
    expect(res.status).toBe(200);
    expect(res.body.data.capacity_kg).toBe('50'); // pg DECIMAL returns as string
    expect(res.body.data.food_categories).toEqual(['RICE', 'VEGETABLES']);
    expect(res.body.data.needs_description).toBe('We need rice for 50 people');
  });

  it('allows NGO to update capacity and food categories sequentially', async () => {
    await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({
      lat: 10, lng: 20, capacity_kg: 50, food_categories: ['RICE']
    });

    const res = await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({
      lat: 10, lng: 20, capacity_kg: 100, food_categories: ['BAKERY']
    });
      
    expect(res.status).toBe(200);
    expect(res.body.data.capacity_kg).toBe('100');
    expect(res.body.data.food_categories).toEqual(['BAKERY']);
  });

  it('rejects invalid or negative capacity', async () => {
    // 0 capacity
    const res1 = await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({
      lat: 10, lng: 20, capacity_kg: 0
    });
    expect(res1.status).toBe(400);
    expect(res1.body.error.code).toBe('INVALID_CAPACITY');

    // Negative capacity
    const res2 = await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({
      lat: 10, lng: 20, capacity_kg: -10
    });
    expect(res2.status).toBe(400);

    // Invalid type
    const res3 = await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({
      lat: 10, lng: 20, capacity_kg: 'fifty'
    });
    expect(res3.status).toBe(400);
  });

  it('rejects invalid food categories', async () => {
    const res = await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({
      lat: 10, lng: 20, food_categories: ['RICE', 'PIZZA'] // PIZZA is not in enum
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CATEGORY');
  });

  it('prevents Donor from modifying NGO needs', async () => {
    const res = await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${donorToken}`).send({
      lat: 10, lng: 20, capacity_kg: 50
    });
    expect(res.status).toBe(403);
  });

  it('existing location remains intact when updating needs without sending lat/lng', async () => {
    // 1. Create with location
    await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({ lat: 34.05, lng: -118.25 });
    
    // 2. Update without location
    const res = await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({
      capacity_kg: 150,
      needs_description: 'Updated needs'
    });
    
    expect(res.status).toBe(200);
    expect(res.body.data.capacity_kg).toBe('150');
    expect(res.body.data.lat).toBeCloseTo(34.05);
    expect(res.body.data.lng).toBeCloseTo(-118.25);
  });

  it('profile remains a single row after repeated PUT operations (upsert integrity)', async () => {
    await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({ lat: 10, lng: 20, capacity_kg: 10 });
    await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({ lat: 10, lng: 20, capacity_kg: 20 });
    await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoToken}`).send({ capacity_kg: 30 });
    
    const countRes = await query('SELECT COUNT(*) FROM ngo_profiles WHERE user_id = $1', [ngoUserId]);
    expect(parseInt(countRes.rows[0].count, 10)).toBe(1);
  });
});
