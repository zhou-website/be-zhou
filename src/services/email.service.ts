import { resend, FROM_EMAIL } from '../config/resend.js';

export const sendAdminCredentialsEmail = async (
  recipientEmail: string,
  adminName: string,
  initialPassword: string
): Promise<void> => {
  if (!resend) {
    console.log(`[Resend Mock] Mengirim kredensial staf admin ke: ${recipientEmail}`);
    console.log(`[Resend Mock] Password Awal: ${initialPassword}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: 'Kredensial Akun Staf Admin — Zhou Consulting',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #0A2540;">Selamat Datang di Zhou Consulting</h2>
          <p>Halo <strong>${adminName}</strong>,</p>
          <p>Akun staf operasional Anda telah berhasil dibuat oleh Superadmin. Berikut adalah kredensial login awal Anda:</p>
          <div style="background-color: #f4f6f8; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${recipientEmail}</p>
            <p style="margin: 5px 0;"><strong>Password Sementara:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${initialPassword}</code></p>
          </div>
          <p>Harap segera masuk ke portal dan lakukan perubahan kata sandi pada menu pengaturan profil demi keamanan.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Email ini dikirim otomatis oleh sistem Zhou Consulting. Jangan membalas email ini.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Gagal mengirim email kredensial staf:', error);
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
