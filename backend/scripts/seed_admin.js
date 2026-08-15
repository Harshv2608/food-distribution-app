const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be defined in .env");
    process.exit(1);
  }

  const client = new Client({
    user: process.env.DB_USER || 'food_admin',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'food_rescue_db',
    password: process.env.DB_PASSWORD || 'food_password',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });

  try {
    await client.connect();
    
    // Check if admin already exists
    const checkRes = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (checkRes.rowCount > 0) {
      console.log(`Admin user ${email} already exists.`);
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    await client.query(
      'INSERT INTO users (email, password_hash, role, is_active) VALUES ($1, $2, $3, $4)',
      [email, hash, 'ADMIN', true]
    );
    console.log(`Successfully seeded admin user: ${email}`);
  } catch (error) {
    console.error("Failed to seed admin:", error);
  } finally {
    await client.end();
  }
}

seedAdmin();
