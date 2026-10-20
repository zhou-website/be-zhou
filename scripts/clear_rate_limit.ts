import 'dotenv/config';
import { redis } from '../src/config/redis.js';

async function clearLimits() {
  const keys = await redis.keys('rl:*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log('Cleared redis rate limit keys:', keys);
  } else {
    console.log('No rate limit keys found.');
  }
  process.exit(0);
}

clearLimits();
