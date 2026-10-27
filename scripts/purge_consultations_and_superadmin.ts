import 'dotenv/config';
import { prisma, pool } from '../src/config/database.js';
import { supabase, BUCKET_NAME } from '../src/config/supabase.js';

async function main() {
  console.log('🚀 [START] Memulai eksekusi pembersihan data perikatan konsultasi dan akun superadmin non-resmi...\n');

  // 1. Ekstraksi dan Hapus Berkas Dokumen Fisik di Supabase Storage
  console.log('📦 1. Memeriksa berkas dokumen perikatan di Supabase Storage...');
  const docs = await prisma.projectDocument.findMany({
    select: { id: true, file_name: true, file_path: true },
  });

  if (docs.length > 0) {
    const rawPaths = docs.map((d) => d.file_path).filter(Boolean);
    const cleanPaths = rawPaths.map((p) => {
      let clean = p;
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        const bucketPrefix = `/${BUCKET_NAME}/`;
        const idx = clean.indexOf(bucketPrefix);
        if (idx !== -1) {
          clean = clean.substring(idx + bucketPrefix.length).split('?')[0];
        }
      }
      return clean;
    });

    console.log(`Menghapus ${cleanPaths.length} berkas fisik dari bucket [${BUCKET_NAME}]...`);
    const { data: storageDelData, error: storageDelErr } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(cleanPaths);

    if (storageDelErr) {
      console.warn('⚠️ Peringatan Supabase Storage removal:', storageDelErr.message);
    } else {
      console.log(`✅ Berhasil menghapus ${storageDelData?.length || cleanPaths.length} berkas fisik dari Supabase Storage.`);
    }
  } else {
    console.log('ℹ️ Tidak ada berkas dokumen yang perlu dihapus dari Supabase Storage.');
  }

  // 2. Hapus Log Audit yang Mereferensikan Tiket Konsultasi
  console.log('\n📜 2. Membersihkan audit log perikatan konsultasi...');
  const deletedProjectAuditLogs = await prisma.auditLog.deleteMany({
    where: { project_id: { not: null } },
  });
  console.log(`✅ Berhasil menghapus ${deletedProjectAuditLogs.count} rekaman audit log terkait tiket perikatan.`);

  // 3. Hapus Seluruh Entitas Konsultasi (Obrolan, Dokumen DB, Tugas, Proyek)
  console.log('\n🗑️ 3. Menghapus seluruh tabel perikatan konsultasi...');
  const deletedMessages = await prisma.consultationMessage.deleteMany();
  console.log(`✅ ${deletedMessages.count} pesan korespondensi konsultasi dihapus.`);

  const deletedDocs = await prisma.projectDocument.deleteMany();
  console.log(`✅ ${deletedDocs.count} metadata dokumen perikatan dihapus.`);

  const deletedTasks = await prisma.projectTask.deleteMany();
  console.log(`✅ ${deletedTasks.count} checklist tugas perikatan dihapus.`);

  const deletedProjects = await prisma.consultationProject.deleteMany();
  console.log(`✅ ${deletedProjects.count} tiket perikatan konsultasi berhasil dihapus permanen.`);

  // 4. Hapus Log Audit Milik Superadmin yang Akan Dihapus (Mencegah FK Constraint)
  console.log('\n👤 4. Menyelaraskan dependensi relasi akun Superadmin...');
  const targetSuperadminsToDelete = await prisma.user.findMany({
    where: {
      role: 'SUPERADMIN',
      email: {
        notIn: ['ewi@zhou-consulting.com', 'superadmin@zhouconsulting.com'],
      },
    },
    select: { id: true, name: true, email: true },
  });

  const deleteIds = targetSuperadminsToDelete.map((u) => u.id);

  if (deleteIds.length > 0) {
    const deletedSuperadminLogs = await prisma.auditLog.deleteMany({
      where: { admin_id: { in: deleteIds } },
    });
    console.log(`✅ Berhasil membersihkan ${deletedSuperadminLogs.count} log audit milik superadmin non-resmi.`);

    // 5. Hapus Akun Superadmin Non-Resmi
    const deletedSuperadmins = await prisma.user.deleteMany({
      where: { id: { in: deleteIds } },
    });
    console.log(
      `✅ Berhasil menghapus ${deletedSuperadmins.count} akun superadmin:`,
      targetSuperadminsToDelete.map((u) => `${u.name} (${u.email})`).join(', ')
    );
  } else {
    console.log('ℹ️ Tidak ditemukan akun superadmin non-resmi yang perlu dihapus.');
  }

  // 6. Verifikasi Akhir Integritas Data
  console.log('\n🔍 5. Memverifikasi status akhir basis data...');
  const remainingSuperadmins = await prisma.user.findMany({
    where: { role: 'SUPERADMIN' },
    select: { id: true, name: true, email: true, role: true },
  });

  const remainingProjects = await prisma.consultationProject.count();
  const remainingDocs = await prisma.projectDocument.count();
  const remainingTasks = await prisma.projectTask.count();
  const remainingMessages = await prisma.consultationMessage.count();

  console.log('\n📊 Ringkasan Data Akhir:');
  console.log('• Sisa Superadmin di Database (Harus Tepat 2):');
  console.table(remainingSuperadmins);
  console.log('• Jumlah Tiket Konsultasi:', remainingProjects);
  console.log('• Jumlah Dokumen Konsultasi:', remainingDocs);
  console.log('• Jumlah Checklist Tugas:', remainingTasks);
  console.log('• Jumlah Pesan Korespondensi:', remainingMessages);

  console.log('\n🎉 [FINISH] Seluruh proses pembersihan data selesai 100% dengan sukses!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan selama eksekusi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
    await prisma.$disconnect();
  });
