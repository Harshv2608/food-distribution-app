import { query } from './src/shared/database';

async function check() {
  try {
    const res = await query('SELECT user_id, max_pickup_radius_km, capacity_kg, food_categories, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat FROM ngo_profiles');
    console.log(res.rows);
  } catch(e) { console.error(e); }
  process.exit();
}
check();
