import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import pool, { query } from '../src/shared/database';

describe('Donation Lifecycle (Phase 2C)', () => {
  let donorToken: string;
  let ngoAToken: string;
  let ngoBToken: string;
  
  const validBasePayload = {
    food_category: 'Prepared Meals',
    description: 'Tray of lasagna',
    quantity_kg: 5.5,
    storage_condition: 'Fridge',
    lat: 34.0522,
    lng: -118.2437
  };

  const getTimestamps = (opts: { usableOffsetH?: number; availUntilOffsetH?: number }) => {
    const now = Date.now();
    const hour = 1000 * 60 * 60;
    return {
      prepared_at: new Date(now - hour).toISOString(),
      usable_until: new Date(now + (opts.usableOffsetH || 5) * hour).toISOString(),
      available_from: new Date(now).toISOString(),
      available_until: new Date(now + (opts.availUntilOffsetH || 3) * hour).toISOString()
    };
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
    await request(app).put('/api/v1/profiles/donor').set('Authorization', `Bearer ${donorToken}`).send({ lat: 10, lng: 20 });

    // Register & Login NGO A
    await request(app).post('/api/v1/auth/register').send({ email: 'ngoa@test.com', password: 'password123', role: 'NGO' });
    const resNgoA = await request(app).post('/api/v1/auth/login').send({ email: 'ngoa@test.com', password: 'password123' });
    ngoAToken = resNgoA.body.data.token;
    await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoAToken}`).send({ lat: 11, lng: 21 });

    // Register & Login NGO B
    await request(app).post('/api/v1/auth/register').send({ email: 'ngob@test.com', password: 'password123', role: 'NGO' });
    const resNgoB = await request(app).post('/api/v1/auth/login').send({ email: 'ngob@test.com', password: 'password123' });
    ngoBToken = resNgoB.body.data.token;
    await request(app).put('/api/v1/profiles/ngo').set('Authorization', `Bearer ${ngoBToken}`).send({ lat: 12, lng: 22 });
  });

  const createAvailableDonation = async (timeOpts = {}) => {
    const res = await request(app)
      .post('/api/v1/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ ...validBasePayload, ...getTimestamps(timeOpts) });
    return res.body.data.id;
  };

  describe('Claiming', () => {
    it('should allow NGO to claim AVAILABLE donation, creating a claim and updating donation status', async () => {
      const donationId = await createAvailableDonation();
      
      const res = await request(app)
        .post(`/api/v1/donations/${donationId}/claim`)
        .set('Authorization', `Bearer ${ngoAToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CLAIMED');

      // Check DB directly
      const dbDon = await query('SELECT status FROM donations WHERE id = $1', [donationId]);
      expect(dbDon.rows[0].status).toBe('CLAIMED');

      const dbClaim = await query('SELECT * FROM claims WHERE donation_id = $1', [donationId]);
      expect(dbClaim.rowCount).toBe(1);
      expect(dbClaim.rows[0].status).toBe('APPROVED');
    });

    it('should prevent DONOR from claiming', async () => {
      const donationId = await createAvailableDonation();
      const res = await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(403);
    });

    it('should prevent unauthenticated claim', async () => {
      const donationId = await createAvailableDonation();
      const res = await request(app).post(`/api/v1/donations/${donationId}/claim`);
      expect(res.status).toBe(401);
    });

    it('should reject claim on CANCELLED donation', async () => {
      const donationId = await createAvailableDonation();
      await request(app).post(`/api/v1/donations/${donationId}/cancel`).set('Authorization', `Bearer ${donorToken}`);
      
      const res = await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoAToken}`);
      expect(res.status).toBe(400); // INVALID_STATE
    });

    it('should reject claim on EXPIRED donation', async () => {
      const donationId = await createAvailableDonation();
      // Manually expire it in DB to bypass creation validation
      await query('UPDATE donations SET available_from = NOW() - interval \'2 hours\', available_until = NOW() - interval \'1 hour\' WHERE id = $1', [donationId]);
      
      const res = await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoAToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXPIRED');
    });

    it('should prevent already claimed donation from being claimed', async () => {
      const donationId = await createAvailableDonation();
      await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoAToken}`);
      
      const res = await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoBToken}`);
      expect(res.status).toBe(400); // INVALID_STATE
    });
  });

  describe('Concurrency', () => {
    it('NGO A + NGO B simultaneously claim -> exactly one succeeds, one claim exists, donation = CLAIMED', async () => {
      const donationId = await createAvailableDonation();
      
      // Fire requests concurrently
      const [resA, resB] = await Promise.all([
        request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoAToken}`),
        request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoBToken}`)
      ]);
      
      // Exactly one should succeed with 200, one should fail with 400
      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([200, 400]);

      // DB should have exactly 1 claim
      const claims = await query('SELECT * FROM claims WHERE donation_id = $1', [donationId]);
      expect(claims.rowCount).toBe(1);

      // DB should say CLAIMED
      const don = await query('SELECT status FROM donations WHERE id = $1', [donationId]);
      expect(don.rows[0].status).toBe('CLAIMED');
    });
  });

  describe('Cancellation', () => {
    it('donor can cancel AVAILABLE donation', async () => {
      const donationId = await createAvailableDonation();
      const res = await request(app).post(`/api/v1/donations/${donationId}/cancel`).set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(200);
    });

    it('NGO cancellation with time remaining -> AVAILABLE', async () => {
      const donationId = await createAvailableDonation();
      await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoAToken}`);
      
      const claim = await query('SELECT id FROM claims WHERE donation_id = $1', [donationId]);
      const res = await request(app).post(`/api/v1/claims/${claim.rows[0].id}/cancel`).set('Authorization', `Bearer ${ngoAToken}`);
      
      expect(res.status).toBe(200);
      const don = await query('SELECT status FROM donations WHERE id = $1', [donationId]);
      expect(don.rows[0].status).toBe('AVAILABLE');
    });

    it('NGO cancellation after expiry -> EXPIRED', async () => {
      const donationId = await createAvailableDonation();
      await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoAToken}`);
      
      // Fast-forward available_until in DB to force expiry
      await query('UPDATE donations SET available_from = NOW() - interval \'2 hours\', available_until = NOW() - interval \'1 hour\' WHERE id = $1', [donationId]);

      const claim = await query('SELECT id FROM claims WHERE donation_id = $1', [donationId]);
      const res = await request(app).post(`/api/v1/claims/${claim.rows[0].id}/cancel`).set('Authorization', `Bearer ${ngoAToken}`);
      
      expect(res.status).toBe(200);
      const don = await query('SELECT status FROM donations WHERE id = $1', [donationId]);
      expect(don.rows[0].status).toBe('EXPIRED');
    });

    it('unauthorized NGO cannot cancel another NGOs claim', async () => {
      const donationId = await createAvailableDonation();
      await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoAToken}`);
      
      const claim = await query('SELECT id FROM claims WHERE donation_id = $1', [donationId]);
      // NGO B tries to cancel NGO A's claim
      const res = await request(app).post(`/api/v1/claims/${claim.rows[0].id}/cancel`).set('Authorization', `Bearer ${ngoBToken}`);
      
      expect(res.status).toBe(404);
    });
  });

  describe('State Transitions & Illegal Moves', () => {
    it('allows valid chain: CLAIMED -> PICKUP_ASSIGNED -> PICKED_UP -> COMPLETED', async () => {
      const donationId = await createAvailableDonation();
      await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoAToken}`);
      
      const r1 = await request(app).post(`/api/v1/donations/${donationId}/pickup-assigned`).set('Authorization', `Bearer ${ngoAToken}`);
      expect(r1.status).toBe(200);

      const r2 = await request(app).post(`/api/v1/donations/${donationId}/picked-up`).set('Authorization', `Bearer ${ngoAToken}`);
      expect(r2.status).toBe(200);

      const r3 = await request(app).post(`/api/v1/donations/${donationId}/complete`).set('Authorization', `Bearer ${ngoAToken}`);
      expect(r3.status).toBe(200);

      const don = await query('SELECT status FROM donations WHERE id = $1', [donationId]);
      expect(don.rows[0].status).toBe('COMPLETED');
    });

    it('rejects AVAILABLE -> PICKED_UP', async () => {
      const donationId = await createAvailableDonation();
      const res = await request(app).post(`/api/v1/donations/${donationId}/picked-up`).set('Authorization', `Bearer ${ngoAToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects AVAILABLE -> COMPLETED', async () => {
      const donationId = await createAvailableDonation();
      const res = await request(app).post(`/api/v1/donations/${donationId}/complete`).set('Authorization', `Bearer ${ngoAToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects CLAIMED -> COMPLETED', async () => {
      const donationId = await createAvailableDonation();
      await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoAToken}`);
      const res = await request(app).post(`/api/v1/donations/${donationId}/complete`).set('Authorization', `Bearer ${ngoAToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects COMPLETED -> PICKUP_ASSIGNED', async () => {
      const donationId = await createAvailableDonation();
      await query('UPDATE donations SET status = \'COMPLETED\' WHERE id = $1', [donationId]);
      const res = await request(app).post(`/api/v1/donations/${donationId}/pickup-assigned`).set('Authorization', `Bearer ${ngoAToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects COMPLETED -> CANCELLED', async () => {
      const donationId = await createAvailableDonation();
      await query('UPDATE donations SET status = \'COMPLETED\' WHERE id = $1', [donationId]);
      const res = await request(app).post(`/api/v1/donations/${donationId}/cancel`).set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects EXPIRED -> CLAIMED', async () => {
      const donationId = await createAvailableDonation();
      await query('UPDATE donations SET status = \'EXPIRED\' WHERE id = $1', [donationId]);
      const res = await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoAToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects CANCELLED -> CLAIMED', async () => {
      const donationId = await createAvailableDonation();
      await query('UPDATE donations SET status = \'CANCELLED\' WHERE id = $1', [donationId]);
      const res = await request(app).post(`/api/v1/donations/${donationId}/claim`).set('Authorization', `Bearer ${ngoAToken}`);
      expect(res.status).toBe(400);
    });
  });
});
