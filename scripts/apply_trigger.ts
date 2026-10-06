import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyTrigger() {
  try {
    console.log('1. Reading audit_log_trigger.sql...');
    const sqlPath = path.join(__dirname, '../prisma/triggers/audit_log_trigger.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('2. Applying trigger to Supabase PostgreSQL...');
    await pool.query(sql);
    console.log('✅ Trigger applied successfully!');

    console.log('3. Verifying Append-Only protection...');
    // Clean any previous test logs
    // First temporarily drop trigger or insert
    const insertRes = await pool.query(
      "INSERT INTO audit_logs (admin_id, action, description) VALUES (1, 'MIGRATION_TEST', 'Testing trigger protection on Supabase') RETURNING id;"
    ).catch(() => null);

    console.log('   (Note: Real test will be executed after seed creates admin with id 1)');

    await pool.end();
  } catch (err: any) {
    console.error('❌ Failed to apply trigger:', err.message);
    process.exit(1);
  }
}

applyTrigger();
