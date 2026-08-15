const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
          rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          rated_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          review TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT no_self_rating CHECK (rater_id != rated_user_id),
          CONSTRAINT one_rating_per_user_per_donation UNIQUE (donation_id, rater_id)
      );
    `);
    console.log("Ratings table created successfully.");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}
run();
