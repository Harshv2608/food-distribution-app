import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import pool, { query } from '../src/shared/database';
import jwt from 'jsonwebtoken';

describe('Ratings Module (Phase 7D-2)', () => {
  let donorToken: string;
  let ngoToken: string;
  let donorId: string;
  let ngoId: string;
  let donationId: string;
  
  beforeAll(async () => {
    await query('SELECT 1');
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await query('TRUNCATE TABLE ratings, claims, donations, volunteer_profiles, ngo_profiles, donor_profiles, users CASCADE;');
    
    // Create Donor
    const donorEmail = `donor_${Date.now()}@test.com`;
    const donorRes = await request(app).post('/api/v1/auth/register').send({ email: donorEmail, password: 'password', role: 'DONOR' });
    donorId = donorRes.body.data.id;
    const donorLogin = await request(app).post('/api/v1/auth/login').send({ email: donorEmail, password: 'password' });
    donorToken = donorLogin.body.data.token;
    await query('INSERT INTO donor_profiles (user_id, location) VALUES ($1, ST_SetSRID(ST_MakePoint(0,0), 4326))', [donorId]);

    // Create NGO
    const ngoEmail = `ngo_${Date.now()}@test.com`;
    const ngoRes = await request(app).post('/api/v1/auth/register').send({ email: ngoEmail, password: 'password', role: 'NGO' });
    ngoId = ngoRes.body.data.id;
    const ngoLogin = await request(app).post('/api/v1/auth/login').send({ email: ngoEmail, password: 'password' });
    ngoToken = ngoLogin.body.data.token;
    await query('INSERT INTO ngo_profiles (user_id, location) VALUES ($1, ST_SetSRID(ST_MakePoint(0,0), 4326))', [ngoId]);

    // Create COMPLETED donation
    const donInsert = await query(`
      INSERT INTO donations (donor_id, status, food_category, quantity_kg, prepared_at, usable_until, available_from, available_until, location)
      VALUES ($1, 'COMPLETED', 'COOKED_MEALS', 10, NOW(), NOW() + interval '1 day', NOW(), NOW() + interval '1 day', ST_SetSRID(ST_MakePoint(0,0), 4326))
      RETURNING id
    `, [donorId]);
    donationId = donInsert.rows[0].id;

    // Create Approved claim
    await query('INSERT INTO claims (donation_id, ngo_id, status) VALUES ($1, $2, $3)', [donationId, ngoId, 'APPROVED']);
  });

  it('NGO can rate Donor after completed donation', async () => {
    const res = await request(app)
      .post(`/api/v1/ratings/donations/${donationId}`)
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ rating: 5, review: 'Great donor!' });
      
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(5);
  });

  it('Donor can rate NGO after completed donation', async () => {
    const res = await request(app)
      .post(`/api/v1/ratings/donations/${donationId}`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ rating: 4, review: 'Good NGO' });
      
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(4);
  });

  it('Rating before completion is rejected', async () => {
    await query('UPDATE donations SET status = $1 WHERE id = $2', ['CLAIMED', donationId]);
    const res = await request(app)
      .post(`/api/v1/ratings/donations/${donationId}`)
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ rating: 5 });
      
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });

  it('Unrelated user cannot rate', async () => {
    const strangerRes = await request(app).post('/api/v1/auth/register').send({ email: 'stranger@test.com', password: 'password', role: 'NGO' });
    const strangerLogin = await request(app).post('/api/v1/auth/login').send({ email: 'stranger@test.com', password: 'password' });
    
    const res = await request(app)
      .post(`/api/v1/ratings/donations/${donationId}`)
      .set('Authorization', `Bearer ${strangerLogin.body.data.token}`)
      .send({ rating: 5 });
      
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Self-rating is rejected', async () => {
    // Modify logic temporarily or rely on constraints. 
    // Wait, the API routes it so donor rates NGO, NGO rates donor. 
    // The DB constraint catches it if the API was bypassed, but the API naturally sets rated_user_id to the OTHER party.
    // However, if there was a bug and it tried to insert rater_id = rated_user_id, it should fail.
    // We can test this by manually trying to insert into DB.
    try {
        await query('INSERT INTO ratings (donation_id, rater_id, rated_user_id, rating) VALUES ($1, $2, $2, 5)', [donationId, donorId]);
        expect(true).toBe(false); // Should not reach here
    } catch (err: any) {
        expect(err.code).toBe('23514'); // check_violation
    }
  });

  it('Rating outside 1-5 is rejected', async () => {
    const res = await request(app)
      .post(`/api/v1/ratings/donations/${donationId}`)
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ rating: 6 });
      
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('Duplicate rating is rejected', async () => {
    await request(app)
      .post(`/api/v1/ratings/donations/${donationId}`)
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ rating: 5 });
      
    const res = await request(app)
      .post(`/api/v1/ratings/donations/${donationId}`)
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({ rating: 4 });
      
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ALREADY_RATED');
  });

  it('Rating/review is persisted and can be retrieved for a donation', async () => {
    await request(app)
      .post(`/api/v1/ratings/donations/${donationId}`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ rating: 4, review: 'Loved it' });
      
    const res = await request(app)
      .get(`/api/v1/ratings/donations/${donationId}`)
      .set('Authorization', `Bearer ${donorToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].rating).toBe(4);
    expect(res.body.data[0].review).toBe('Loved it');
  });
  
  it('Ratings can be retrieved for a user profile', async () => {
    await request(app)
      .post(`/api/v1/ratings/donations/${donationId}`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ rating: 5, review: 'Superb NGO' });
      
    const res = await request(app)
      .get(`/api/v1/ratings/profiles/${ngoId}`)
      .set('Authorization', `Bearer ${ngoToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].rating).toBe(5);
  });
});
