import { query } from './src/shared/database';
import bcrypt from 'bcrypt';

async function run() {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Seed Admin
    await query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
      ['admin@food.com', passwordHash, 'ADMIN']
    );

    // Seed Donor
    const donorRes = await query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id',
      ['donor@food.com', passwordHash, 'DONOR']
    );
    if (donorRes.rowCount && donorRes.rowCount > 0) {
      await query('INSERT INTO donor_profiles (user_id, location) VALUES ($1, ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326))', [donorRes.rows[0].id]);
    }

    // Seed NGO
    const ngoRes = await query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id',
      ['ngo@food.com', passwordHash, 'NGO']
    );
    if (ngoRes.rowCount && ngoRes.rowCount > 0) {
      await query('INSERT INTO ngo_profiles (user_id, location, is_verified) VALUES ($1, ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), true)', [ngoRes.rows[0].id]);
    }

    console.log("Seeded default users:");
    console.log("admin@food.com / password123 (ADMIN)");
    console.log("donor@food.com / password123 (DONOR)");
    console.log("ngo@food.com / password123 (NGO)");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
