import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Konfigurasi Connection Pool & Keepalive untuk menjaga stabilitas koneksi PostgreSQL
export const pool = new pg.Pool({
  connectionString,
  max: 10, // Maksimal 10 koneksi pool untuk VPS 2 vCPU / 2GB RAM
  keepAlive: true, // Mencegah idle timeout disconnect
  idleTimeoutMillis: 30000, // Tutup koneksi idle setelah 30 detik
  connectionTimeoutMillis: 5000, // Timeout koneksi gagal dalam 5 detik
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected error on idle PostgreSQL client pool:', err.message);
});

const adapter = new PrismaPg(pool, { disposeExternalPool: false });
export const prisma = new PrismaClient({ adapter });

