import { Redis } from 'ioredis';
import 'dotenv/config';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let lastErrorLogTime = 0;

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    if (times > 10) {
      console.warn('⚠️ Redis unreachable after 10 attempts, stopping automatic reconnect.');
      return null;
    }
    return Math.min(times * 100, 2000);
  },
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

redis.on('error', (err: Error) => {
  const now = Date.now();
  // Throttle error logging to once every 5 seconds to prevent console flooding
  if (now - lastErrorLogTime > 5000) {
    lastErrorLogTime = now;
    console.error('❌ Redis error:', err.message);
  }
});

