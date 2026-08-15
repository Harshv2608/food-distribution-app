import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import pool, { query } from '../src/shared/database';

describe('Donations Module (Phase 2B)', () => {
  let donorToken: string;
  let ngoToken: string;
  
  const validBasePayload = {
    food_category: 'Prepared Meals',
    description: 'Tray of lasagna',
    quantity_kg: 5.5,
    storage_condition: 'Fridge (4C)',
    lat: 34.0522,
    lng: -118.2437
  };

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
    
    // Ensure Donor Profile Exists
    await request(app).put('/api/v1/profiles/donor').set('Authorization', `Bearer ${donorToken}`).send({ lat: 10, lng: 20 });

    // Register & Login NGO
    await request(app).post('/api/v1/auth/register').send({ email: 'ngo@test.com', password: 'password123', role: 'NGO' });
    const resNgo = await request(app).post('/api/v1/auth/login').send({ email: 'ngo@test.com', password: 'password123' });
    ngoToken = resNgo.body.data.token;
  });

  const getTimestamps = (opts: {
    prepOffsetH?: number;
    usableOffsetH?: number;
    availFromOffsetH?: number;
    availUntilOffsetH?: number;
  }) => {
    const now = Date.now();
    const hour = 1000 * 60 * 60;
    return {
      prepared_at: new Date(now + (opts.prepOffsetH || -1) * hour).toISOString(),
      usable_until: new Date(now + (opts.usableOffsetH || 5) * hour).toISOString(),
      available_from: new Date(now + (opts.availFromOffsetH || 0) * hour).toISOString(),
      available_until: new Date(now + (opts.availUntilOffsetH || 3) * hour).toISOString()
    };
  };

  describe('Authorization', () => {
    it('should allow DONOR to create donation', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, ...getTimestamps({}) });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should prevent NGO from creating donation', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ ...validBasePayload, ...getTimestamps({}) });
      
      expect(res.status).toBe(403);
    });

    it('should prevent unauthenticated users', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .send({ ...validBasePayload, ...getTimestamps({}) });
      
      expect(res.status).toBe(401);
    });
  });

  describe('Validation (Hard Rejections)', () => {
    it('should reject quantity = 0', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, quantity_kg: 0, ...getTimestamps({}) });
      expect(res.status).toBe(400);
    });

    it('should reject negative quantity', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, quantity_kg: -5, ...getTimestamps({}) });
      expect(res.status).toBe(400);
    });

    it('should reject malformed timestamps', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, prepared_at: 'not-a-date' });
      expect(res.status).toBe(400);
    });

    it('should reject usable_until <= prepared_at', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, ...getTimestamps({ prepOffsetH: 2, usableOffsetH: 1 }) });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/after prepared at/i);
    });

    it('should reject usable_until in past', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, ...getTimestamps({ usableOffsetH: -2 }) });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/past/i);
    });

    it('should reject available_until > usable_until', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, ...getTimestamps({ usableOffsetH: 2, availUntilOffsetH: 4 }) });
      expect(res.status).toBe(400);
    });

    it('should reject invalid location', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, lat: 100, ...getTimestamps({}) }); // 100 > 90
      expect(res.status).toBe(400);
    });
  });

  describe('Risk Assessment & Database Integration', () => {
    it('should assign LOW risk to a valid donation with storage info', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, ...getTimestamps({}) });
      
      expect(res.status).toBe(201);
      expect(res.body.data.risk_level).toBe('LOW');
      expect(res.body.data.risk_reasons).toContain('Platform baseline passed');
    });

    it('should assign MEDIUM risk if storage info is missing', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, storage_condition: '', ...getTimestamps({}) });
      
      expect(res.status).toBe(201);
      expect(res.body.data.risk_level).toBe('MEDIUM');
      expect(res.body.data.risk_reasons.join('')).toMatch(/Storage condition/i);
    });

    it('should assign HIGH risk if usable window >24h without fridge/freezer', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, storage_condition: 'Room Temp Box', ...getTimestamps({ usableOffsetH: 30 }) });
      
      expect(res.status).toBe(201);
      expect(res.body.data.risk_level).toBe('HIGH');
      expect(res.body.data.risk_reasons.join('')).toMatch(/Extended usable window/i);
    });

    it('should strictly NOT create a database record if risk assessment fails (REJECTED)', async () => {
      // Get DB count before
      const dbCountBefore = await query('SELECT COUNT(*) FROM donations');
      const countBefore = parseInt(dbCountBefore.rows[0].count, 10);

      // Submit rejected donation (time paradox)
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, ...getTimestamps({ usableOffsetH: -5 }) });
      
      expect(res.status).toBe(400);
      
      // Get DB count after
      const dbCountAfter = await query('SELECT COUNT(*) FROM donations');
      const countAfter = parseInt(dbCountAfter.rows[0].count, 10);
      
      expect(countAfter).toBe(countBefore); // Assert no partial insert happened
    });

    it('should assign the donation to the correct donor and store PostGIS location', async () => {
      const res = await request(app)
        .post('/api/v1/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ ...validBasePayload, ...getTimestamps({}) });
      
      const donationId = res.body.data.id;
      
      const dbRes = await query(`
        SELECT d.status, u.email, ST_X(d.location::geometry) as lng, ST_Y(d.location::geometry) as lat
        FROM donations d 
        JOIN donor_profiles dp ON d.donor_id = dp.user_id
        JOIN users u ON dp.user_id = u.id
        WHERE d.id = $1
      `, [donationId]);

      expect(dbRes.rows[0].email).toBe('donor@test.com');
      expect(dbRes.rows[0].status).toBe('AVAILABLE');
      expect(dbRes.rows[0].lat).toBeCloseTo(34.0522);
      expect(dbRes.rows[0].lng).toBeCloseTo(-118.2437);
    });
  });
});
