import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'food_admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'food_rescue_db',
  password: process.env.DB_PASSWORD || 'food_password',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') ? { rejectUnauthorized: false } : undefined,
});

/**
 * Execute a query with the connection pool
 */
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

/**
 * Execute a transactional block of queries
 * Provides a client that must be used for the transaction, 
 * and handles BEGIN, COMMIT, and ROLLBACK automatically.
 */
export const transaction = async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export default pool;
