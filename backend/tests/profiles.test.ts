import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import pool, { query } from '../src/shared/database';

describe('Profiles Module (Phase 2A)', () => {
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

    // Register & Login NGO
    await request(app).post('/api/v1/auth/register').send({ email: 'ngo@test.com', password: 'password123', role: 'NGO' });
    const resNgo = await request(app).post('/api/v1/auth/login').send({ email: 'ngo@test.com', password: 'password123' });
    ngoToken = resNgo.body.data.token;
  });

  describe('Donor Profile', () => {
    it('should allow DONOR to create (upsert) a profile with valid location', async () => {
      const res = await request(app)
        .put('/api/v1/profiles/donor')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ lat: 34.0522, lng: -118.2437, default_prep_time: '2 hours', preferred_pickup: 'NGO_PICKUP' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lat).toBeCloseTo(34.0522);
      expect(res.body.data.lng).toBeCloseTo(-118.2437);
      expect(res.body.data.default_prep_time).toBe('2 hours');
    });

    it('should update existing profile on second PUT instead of throwing unique violation', async () => {
      await request(app).put('/api/v1/profiles/donor').set('Authorization', `Bearer ${donorToken}`).send({ lat: 10, lng: 20 });
      
      // Update
      const res = await request(app)
        .put('/api/v1/profiles/donor')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ lat: 15, lng: 25, default_storage: 'Fridge' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.lat).toBeCloseTo(15);
      
      // Verify DB has only 1 row for this donor
      const dbCount = await query('SELECT COUNT(*) FROM donor_profiles');
      expect(parseInt(dbCount.rows[0].count, 10)).toBe(1);
    });

    it('should reject invalid coordinates', async () => {
      const res = await request(app)
        .put('/api/v1/profiles/donor')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ lat: 95, lng: 0 }); // lat > 90 is invalid
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_LOCATION');
    });
  });

  describe('NGO Profile', () => {
    it('should allow NGO to create (upsert) a profile', async () => {
      const res = await request(app)
        .put('/api/v1/profiles/ngo')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ lat: 40.7128, lng: -74.0060, max_pickup_radius_km: 15 });
      
      expect(res.status).toBe(200);
      expect(res.body.data.max_pickup_radius_km).toBe(15);
      expect(res.body.data.is_verified).toBe(false); // default
    });
  });

  describe('RBAC Cross-Access Restrictions', () => {
    it('should prevent NGO from accessing Donor profile endpoint', async () => {
      const res = await request(app)
        .put('/api/v1/profiles/donor')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ lat: 0, lng: 0 });
      
      expect(res.status).toBe(403);
    });

    it('should prevent Donor from accessing NGO profile endpoint', async () => {
      const res = await request(app)
        .put('/api/v1/profiles/ngo')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ lat: 0, lng: 0 });
      
      expect(res.status).toBe(403);
    });
  });
});
