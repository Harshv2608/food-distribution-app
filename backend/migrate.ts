import { query } from './src/shared/database';
import fs from 'fs';
import path from 'path';

async function run() {
  try {
    const schemaPath = path.join(__dirname, 'src', 'shared', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log("Executing schema.sql...");
    await query(schemaSql);
    console.log("Database schema created successfully.");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    process.exit(0);
  }
}

run();
