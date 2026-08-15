import { query } from './src/shared/database';

async function check() {
  try {
    const res = await query('SELECT id, status, available_until, NOW() as current_time FROM donations WHERE status = \'AVAILABLE\'');
    console.log(res.rows);
  } catch(e) { console.error(e); }
  process.exit();
}
check();
