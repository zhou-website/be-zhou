import 'dotenv/config';
import { uploadFileToStorage, getSignedDownloadUrl } from '../src/services/storage.service.js';

async function testStorage() {
  try {
    const dummyBuffer = Buffer.from('Laporan Keuangan & Pajak Zhou Consulting Test File 2026', 'utf-8');
    console.log('1. Mengunggah file pengujian ke Supabase Storage...');
    const uploadResult = await uploadFileToStorage('test_report.txt', dummyBuffer, 'text/plain');
    console.log('✅ Upload Berhasil! Path:', uploadResult.filePath);

    console.log('2. Meminta Signed URL bertenggat waktu (15 menit)...');
    const signedUrl = await getSignedDownloadUrl(uploadResult.filePath, 900);
    console.log('✅ Signed URL berhasil diterbitkan!');
    console.log('🔗 URL:', signedUrl);
  } catch (err) {
    console.error('❌ Error saat pengujian storage:', err);
  }
}

testStorage();
