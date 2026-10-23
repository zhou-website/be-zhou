import { resend, FROM_EMAIL, REPLY_TO_EMAIL } from '../config/resend.js';

export const sendAdminCredentialsEmail = async (
  recipientEmail: string,
  adminName: string,
  initialPassword: string
): Promise<{ success: boolean; message: string }> => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;

  if (!resend) {
    console.log(`[Resend Mock] Mengirim kredensial staf admin ke: ${recipientEmail}`);
    console.log(`[Resend Mock] Password Awal: ${initialPassword}`);
    console.log(`[Resend Mock] Tautan Login: ${loginUrl}`);
    return { success: true, message: 'Email kredensial disimulasikan (development mock)' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      replyTo: REPLY_TO_EMAIL,
      subject: 'Kredensial Akun Staf Admin — Zhou Consulting',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #0A2540; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="color: #0A2540; margin: 0; font-size: 24px; font-weight: 700;">Zhou Consulting</h1>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Platform Manajemen Konsultasi Pajak, Akuntansi & Hukum</p>
          </div>

          <h2 style="color: #0A2540; font-size: 20px; margin-top: 0;">Selamat Datang, ${adminName}!</h2>
          <p>Akun staf operasional Anda telah berhasil didaftarkan oleh Superadmin. Anda dapat menggunakan kredensial di bawah ini untuk mengakses dashboard internal Zhou Consulting:</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Alamat Email:</strong> <span style="color: #0f172a; font-family: monospace; font-size: 15px;">${recipientEmail}</span></p>
            <p style="margin: 0; font-size: 15px;"><strong>Kata Sandi Sementara:</strong> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-size: 15px; font-weight: bold; color: #0A2540;">${initialPassword}</code></p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #0A2540; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">Masuk ke Portal Staf</a>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
            Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut di peramban web Anda:<br/>
            <a href="${loginUrl}" style="color: #0284c7; word-break: break-all;">${loginUrl}</a>
          </p>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-top: 24px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">
              <strong>Penting:</strong> Demi keamanan data perusahaan dan klien, Anda disarankan untuk segera memperbarui kata sandi Anda setelah berhasil login pertama kali.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            Email ini dikirim secara otomatis oleh sistem Zhou Consulting. Jangan membalas email ini.
          </p>
        </div>
      `,
    });

    if (error) {
      console.warn('⚠️ Resend email delivery warning:', error.message);
      return { success: false, message: error.message };
    }

    console.log(`✅ Email kredensial staf berhasil dikirim ke: ${recipientEmail} (ID: ${data?.id})`);
    return { success: true, message: 'Email kredensial berhasil dikirim' };
  } catch (error) {
    console.error('❌ Gagal mengirim email kredensial staf:', (error as Error).message);
    return { success: false, message: (error as Error).message };
  }
};

export const sendPasswordResetEmail = async (
  recipientEmail: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  if (!resend) {
    console.log(`[Resend Mock] Mengirim tautan reset password ke: ${recipientEmail}`);
    console.log(`[Resend Mock] Tautan: ${resetUrl}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      replyTo: REPLY_TO_EMAIL,
      subject: 'Permintaan Reset Kata Sandi — Zhou Consulting',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #0A2540;">Reset Kata Sandi Akun</h2>
          <p>Kami menerima permintaan untuk mereset kata sandi akun Zhou Consulting Anda.</p>
          <p>Klik tombol di bawah ini untuk mengatur ulang kata sandi Anda. Tautan ini hanya berlaku selama 1 jam:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #0A2540; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Kata Sandi</a>
          </div>
          <p style="font-size: 13px; color: #666;">Jika Anda tidak meminta pengaturan ulang ini, Anda dapat mengabaikan email ini dengan aman.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Gagal mengirim email reset password:', error);
  }
};

export const sendApplicationConfirmationEmail = async (
  applicantEmail: string,
  applicantName: string,
  positionTitle: string
): Promise<void> => {
  if (!resend) {
    console.log(`[Resend Mock] Konfirmasi lamaran kerja untuk ${applicantName} (${positionTitle})`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: applicantEmail,
      replyTo: REPLY_TO_EMAIL,
      subject: `Konfirmasi Penerimaan Lamaran — ${positionTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px;">
          <h3>Terima Kasih Telah Melamar di Zhou Consulting</h3>
          <p>Halo <strong>${applicantName}</strong>,</p>
          <p>Kami telah menerima berkas lamaran dan CV Anda untuk posisi <strong>${positionTitle}</strong>. Tim HR kami akan meninjau kualifikasi Anda dan menghubungi Anda jika memenuhi syarat untuk tahap selanjutnya.</p>
          <p>Salam hangat,<br><strong>Tim Rekrutmen Zhou Consulting</strong></p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Gagal mengirim email konfirmasi lamaran:', error);
  }
};
