import { query } from './src/shared/database';

async function run() {
  try {
    const res = await query('SELECT id, email, role FROM users');
    console.log("Users in DB:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
