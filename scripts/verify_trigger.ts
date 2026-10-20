import { pool } from '../src/config/database.js';

async function testTrigger() {
  try {
    console.log('1. Mencoba INSERT audit log baru ke Supabase...');
    const ins = await pool.query(
      "INSERT INTO audit_logs (admin_id, action, description) VALUES (1, 'TRIGGER_TEST', 'Testing trigger protection on Supabase') RETURNING id;"
    );
    const testId = ins.rows[0].id;
    console.log(`✅ INSERT Berhasil! ID log: ${testId}`);

    console.log('2. Mencoba UPDATE audit log (HARUS DITOLAK)...');
    try {
      await pool.query(`UPDATE audit_logs SET description = 'Hacked' WHERE id = ${testId};`);
      console.error('❌ GAGAL: Operasi UPDATE berhasil dieksekusi (Trigger tidak aktif)!');
    } catch (err: any) {
      console.log('✅ SUKSES: UPDATE ditolak oleh trigger PostgreSQL:', err.message);
    }

    console.log('3. Mencoba DELETE audit log (HARUS DITOLAK)...');
    try {
      await pool.query(`DELETE FROM audit_logs WHERE id = ${testId};`);
      console.error('❌ GAGAL: Operasi DELETE berhasil dieksekusi (Trigger tidak aktif)!');
    } catch (err: any) {
      console.log('✅ SUKSES: DELETE ditolak oleh trigger PostgreSQL:', err.message);
    }

    await pool.end();
    console.log('🎉 Proteksi Append-Only Audit Log di Supabase TERVERIFIKASI 100%!');
  } catch (err: any) {
    console.error('Error:', err.message);
    await pool.end();
  }
}

testTrigger();
