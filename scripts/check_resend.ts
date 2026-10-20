import 'dotenv/config';
import { resend, FROM_EMAIL } from '../src/config/resend.js';

async function verifyResend() {
  const targetEmail = process.argv[2] || 'tasyaanggraenif@gmail.com';

  console.log('=== PENGUJIAN PENGIRIMAN EMAIL RESEND ===');
  console.log('1. RESEND_API_KEY Configured:', process.env.RESEND_API_KEY ? `✅ Ya (${process.env.RESEND_API_KEY.slice(0, 7)}...)` : '❌ Tidak');
  console.log('2. FROM_EMAIL:', FROM_EMAIL);
  console.log('3. TARGET RECIPIENT:', targetEmail);

  if (!resend) {
    console.error('❌ Resend client tidak terinisialisasi!');
    process.exit(1);
  }

  console.log(`\n4. Mengirim email HTML resmi Zhou Consulting ke: ${targetEmail}...`);
  try {
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: targetEmail,
      subject: 'Kredensial Akun Staf Admin — Zhou Consulting (Uji Coba)',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #0A2540; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="color: #0A2540; margin: 0; font-size: 24px; font-weight: 700;">Zhou Consulting</h1>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Platform Manajemen Konsultasi Pajak, Akuntansi & Hukum</p>
          </div>

          <h2 style="color: #0A2540; font-size: 20px; margin-top: 0;">Selamat Datang di Zhou Consulting!</h2>
          <p>Ini adalah pengujian pengiriman email otomatis transaksional dari backend sistem Zhou Consulting melalui layanan Resend.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Alamat Email Penerima:</strong> <span style="color: #0f172a; font-family: monospace; font-size: 15px;">${targetEmail}</span></p>
            <p style="margin: 0; font-size: 15px;"><strong>Kata Sandi Sementara:</strong> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-size: 15px; font-weight: bold; color: #0A2540;">ZhouAdmin#2026!</code></p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="http://139.190.103.80/docs" style="background-color: #0A2540; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">Buka Portal Zhou Consulting</a>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-top: 24px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">
              <strong>Info Verifikasi:</strong> Pengujian pengiriman email ini dieksekusi pada <strong>${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</strong>.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            Email ini dikirim secara otomatis oleh sistem Zhou Consulting via Resend.
          </p>
        </div>
      `,
    });

    if (response.error) {
      console.error('\n❌ Resend mengembalikan error:');
      console.error(response.error);
      process.exit(1);
    }

    console.log('\n🎉 BERHASIL!');
    console.log(`✅ Email berhasil dikirim ke: ${targetEmail}`);
    console.log('   ID Email:', response.data?.id);
    console.log('========================================');
  } catch (err) {
    console.error('❌ Exception saat kirim email:', err);
    process.exit(1);
  }
}

verifyResend();
