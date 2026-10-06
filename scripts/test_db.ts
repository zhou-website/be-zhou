import { pool, prisma } from '../src/config/database.js';

async function test() {
  try {
    console.log('1. Testing raw pool query...');
    const poolRes = await pool.query('SELECT NOW() as current_time, current_database() as db_name;');
    console.log('✅ Pool Connected! Result:', poolRes.rows[0]);

    console.log('2. Testing Prisma client query...');
    const userCount = await prisma.user.count();
    console.log('✅ Prisma Client Connected! Total users:', userCount);

    await pool.end();
    await prisma.$disconnect();
    console.log('🎉 Supabase Database Connection 100% Operational!');
  } catch (err: any) {
    console.error('❌ Database Test Failed:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

test();
