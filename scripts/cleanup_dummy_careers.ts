import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Memulai pembersihan lowongan karir dummy/seed (BE-05)...');

  const dummyCodes = ['JOB-TAX-SR-01', 'JOB-ACC-JR-01'];

  for (const code of dummyCodes) {
    const job = await prisma.careerJob.findUnique({
      where: { position_code: code },
      include: { applications: true },
    });

    if (job) {
      if (job.applications.length > 0) {
        await prisma.jobApplication.deleteMany({
          where: { job_id: job.id },
        });
        console.log(`🗑️ Berhasil menghapus ${job.applications.length} pelamar uji coba untuk [${code}]`);
      }

      await prisma.careerJob.delete({
        where: { id: job.id },
      });
      console.log(`✅ Lowongan dummy [${code} - ${job.position_title}] berhasil dihapus permanen dari basis data.`);
    } else {
      console.log(`ℹ️ Lowongan dummy [${code}] tidak ditemukan atau sudah dibersihkan.`);
    }
  }

  console.log('🎉 Pembersihan lowongan karir dummy selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat pembersihan:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
