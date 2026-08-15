import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pool, { query, transaction } from '../src/shared/database';

describe('Database Integration Tests & Constraints', () => {
  beforeAll(async () => {
    // Ensure DB is alive
    await query('SELECT 1');
  });

  afterAll(async () => {
    await pool.end();
  });

  // Clear tables before each test to ensure isolation
  beforeEach(async () => {
    await query('TRUNCATE TABLE claims, donations, volunteer_profiles, ngo_profiles, donor_profiles, users CASCADE;');
  });

  describe('Core Data Constraints', () => {
    it('should reject a donation with zero or negative quantity', async () => {
      const user = await query(`INSERT INTO users (email, password_hash, role) VALUES ('donor1@test.com', 'hash', 'DONOR') RETURNING id`);
      const donorId = user.rows[0].id;
      await query(`INSERT INTO donor_profiles (user_id, location) VALUES ($1, ST_SetSRID(ST_MakePoint(80.2, 13.0), 4326))`, [donorId]);

      await expect(
        query(`
          INSERT INTO donations (donor_id, food_category, quantity_kg, prepared_at, usable_until, available_from, available_until)
          VALUES ($1, 'Rice', -5, NOW(), NOW() + interval '2 hours', NOW(), NOW() + interval '1 hour')
        `, [donorId])
      ).rejects.toThrow(/quantity_positive/);
    });

    it('should reject a donation where usable_until is before prepared_at', async () => {
      const user = await query(`INSERT INTO users (email, password_hash, role) VALUES ('donor2@test.com', 'hash', 'DONOR') RETURNING id`);
      const donorId = user.rows[0].id;
      await query(`INSERT INTO donor_profiles (user_id, location) VALUES ($1, ST_SetSRID(ST_MakePoint(80.2, 13.0), 4326))`, [donorId]);

      await expect(
        query(`
          INSERT INTO donations (donor_id, food_category, quantity_kg, prepared_at, usable_until, available_from, available_until)
          VALUES ($1, 'Rice', 10, NOW() + interval '2 hours', NOW(), NOW(), NOW() + interval '1 hour')
        `, [donorId])
      ).rejects.toThrow(/time_usable_after_prep/);
    });
  });

  describe('Claim Transactions and Concurrency', () => {
    it('should only allow ONE NGO to claim a donation when two claim concurrently', async () => {
      // 1. Setup Donor and Donation
      const donorResult = await query(`INSERT INTO users (email, password_hash, role) VALUES ('donor@test.com', 'hash', 'DONOR') RETURNING id`);
      const donorId = donorResult.rows[0].id;
      await query(`INSERT INTO donor_profiles (user_id, location) VALUES ($1, ST_SetSRID(ST_MakePoint(80.2, 13.0), 4326))`, [donorId]);

      const donationResult = await query(`
        INSERT INTO donations (donor_id, status, food_category, quantity_kg, prepared_at, usable_until, available_from, available_until)
        VALUES ($1, 'AVAILABLE', 'Rice', 10, NOW(), NOW() + interval '5 hours', NOW(), NOW() + interval '4 hours')
        RETURNING id
      `, [donorId]);
      const donationId = donationResult.rows[0].id;

      // 2. Setup NGO A and NGO B
      const ngoAResult = await query(`INSERT INTO users (email, password_hash, role) VALUES ('ngoa@test.com', 'hash', 'NGO') RETURNING id`);
      const ngoAId = ngoAResult.rows[0].id;
      await query(`INSERT INTO ngo_profiles (user_id, location, is_verified) VALUES ($1, ST_SetSRID(ST_MakePoint(80.25, 13.05), 4326), true)`, [ngoAId]);

      const ngoBResult = await query(`INSERT INTO users (email, password_hash, role) VALUES ('ngob@test.com', 'hash', 'NGO') RETURNING id`);
      const ngoBId = ngoBResult.rows[0].id;
      await query(`INSERT INTO ngo_profiles (user_id, location, is_verified) VALUES ($1, ST_SetSRID(ST_MakePoint(80.22, 13.02), 4326), true)`, [ngoBId]);

      // 3. Define the atomic claim function using our transaction wrapper
      const claimDonation = async (ngoId: string) => {
        return transaction(async (client) => {
          // Verify donation is available and lock it
          const don = await client.query(`SELECT status FROM donations WHERE id = $1 FOR UPDATE`, [donationId]);
          if (don.rows[0].status !== 'AVAILABLE') throw new Error('Not available');

          // Insert claim (relies on DB unique constraint as secondary safeguard)
          await client.query(`INSERT INTO claims (donation_id, ngo_id, status) VALUES ($1, $2, 'PENDING')`, [donationId, ngoId]);
          
          // Update donation status
          await client.query(`UPDATE donations SET status = 'CLAIMED' WHERE id = $1`, [donationId]);
          return true;
        });
      };

      // 4. Execute CONCURRENTLY
      const results = await Promise.allSettled([
        claimDonation(ngoAId),
        claimDonation(ngoBId)
      ]);

      // 5. Verify exactly one succeeded and one failed
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      // Verify DB state
      const claimsCount = await query(`SELECT COUNT(*) FROM claims WHERE donation_id = $1`, [donationId]);
      expect(parseInt(claimsCount.rows[0].count, 10)).toBe(1);

      const updatedDonation = await query(`SELECT status FROM donations WHERE id = $1`, [donationId]);
      expect(updatedDonation.rows[0].status).toBe('CLAIMED');
    });
  });
});
