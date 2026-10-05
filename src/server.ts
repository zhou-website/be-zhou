import 'dotenv/config';
import { app } from './app.js';
import { prisma, pool } from './config/database.js';
import { redis } from './config/redis.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Zhou Consulting Backend API running on port ${PORT}`);
  console.log(`📚 Scalar API Documentation available at http://localhost:${PORT}/docs`);
  console.log(`🩺 Health check endpoint at http://localhost:${PORT}/api/health`);
});

let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 ${signal} diterima. Memulai proses graceful shutdown...`);

  // Hentikan penerimaan request HTTP baru
  server.close(async () => {
    console.log('🔌 Server HTTP Express ditutup.');

    try {
      // 1. Putus koneksi Prisma & PostgreSQL Pool
      await prisma.$disconnect();
      await pool.end();
      console.log('🗄️ Koneksi database PostgreSQL & Prisma berhasil diputus secara bersih.');

      // 2. Putus koneksi Redis
      redis.disconnect();
      console.log('📦 Koneksi Redis berhasil diputus secara bersih.');
    } catch (error) {
      console.error('❌ Terjadi kesalahan saat proses graceful shutdown:', error);
    } finally {
      console.log('👋 Proses backend selesai.');
      process.exit(0);
    }
  });

  // Timeout paksa jika shutdown terhambat lebih dari 10 detik
  setTimeout(() => {
    console.error('⚠️ Graceful shutdown melebihi batas waktu 10s. Memaksa proses berhenti.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

