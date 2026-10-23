import { resend, FROM_EMAIL, REPLY_TO_EMAIL } from '../config/resend.js';
import { prisma } from '../config/database.js';

/**
 * Mengambil base URL frontend utama yang bersih untuk tautan email.
 * Mencegah penggabungan banyak origin (koma) dari konfigurasi CORS FRONTEND_URL.
 */
const getFrontendBaseUrl = (): string => {
  if (process.env.FRONTEND_PUBLIC_URL) {
    return process.env.FRONTEND_PUBLIC_URL.trim().replace(/\/+$/, '');
  }
  const raw = process.env.FRONTEND_URL || 'https://zhouconsulting.id';
  const urls = raw.split(',').map((u) => u.trim()).filter(Boolean);
  const primary = urls.find((u) => !u.includes('localhost')) || urls[0] || 'https://zhouconsulting.id';
  return primary.replace(/\/+$/, '');
};

export const sendAdminCredentialsEmail = async (
  recipientEmail: string,
  adminName: string,
  initialPassword: string
): Promise<{ success: boolean; message: string }> => {
  const loginUrl = `${getFrontendBaseUrl()}/login`;

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
  const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${resetToken}`;

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

export interface NewConsultationNotificationParams {
  ticketCode: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  companyName?: string | null;
  title: string;
  category?: string | null;
  urgency?: string | null;
  description?: string | null;
  isPublic?: boolean;
}

export const sendNewConsultationNotificationEmail = async (
  params: NewConsultationNotificationParams
): Promise<{ success: boolean; message: string }> => {
  const {
    ticketCode,
    clientName,
    clientEmail,
    clientPhone,
    companyName,
    title,
    category,
    urgency,
    description,
    isPublic,
  } = params;

  // URL langsung menuju halaman penugasan perikatan untuk Superadmin & Admin
  const baseUrl = getFrontendBaseUrl();
  const assignmentUrl = `${baseUrl}/dashboard/superadmin/perikatan?search=${encodeURIComponent(ticketCode)}`;

  // Kumpulkan daftar email penerima: dari konfigurasi .env (Kak Ewi & Superadmin)
  const envRecipients = (process.env.CONSULTATION_ALERT_EMAILS || 'consultingzhou@gmail.com,superadmin@zhouconsulting.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));

  // Tambahkan juga email seluruh Superadmin aktif dari database
  try {
    const superadmins = await prisma.user.findMany({
      where: { role: 'SUPERADMIN', is_active: true },
      select: { email: true },
    });
    for (const sa of superadmins) {
      if (sa.email && !envRecipients.includes(sa.email.toLowerCase())) {
        envRecipients.push(sa.email.toLowerCase());
      }
    }
  } catch {
    // Abaikan jika database query gagal, tetap gunakan envRecipients
  }

  if (envRecipients.length === 0) {
    envRecipients.push('consultingzhou@gmail.com');
  }

  if (!resend) {
    console.log(`[Resend Mock] Notifikasi Konsultasi Baru [${ticketCode}] diteruskan ke:`, envRecipients);
    console.log(`[Resend Mock] Tautan Penugasan: ${assignmentUrl}`);
    return { success: true, message: 'Email notifikasi konsultasi disimulasikan (development mock)' };
  }

  try {
    const urgencyText = urgency || 'Normal';
    const isUrgent = urgencyText.toLowerCase().includes('urgent') || urgencyText.toLowerCase().includes('tinggi');
    const urgencyBadgeColor = isUrgent ? '#dc2626' : '#0284c7';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: envRecipients,
      replyTo: clientEmail, // Jika Kak Ewi / Superadmin membalas email, langsung mengarah ke klien
      subject: `[TIKET KONSULTASI BARU] #${ticketCode} — ${clientName} (${companyName || 'Perusahaan Klien'})`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 650px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #0A2540; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="color: #0A2540; margin: 0; font-size: 22px; font-weight: 700;">Zhou Consulting</h1>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Notifikasi Internal Masuk Tiket Konsultasi Baru</p>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #166534; font-weight: 600;">
              Permohonan konsultasi baru telah diterima melalui ${isPublic ? 'Formulir Publik Landing Page' : 'Portal Klien Terdaftar'}.
            </p>
          </div>

          <h2 style="color: #0A2540; font-size: 18px; margin: 0 0 16px 0;">Rincian Permohonan:</h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; width: 35%;">Kode Tiket</td>
              <td style="padding: 10px 0; font-weight: 700; color: #0A2540; font-family: monospace;">${ticketCode}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Nama Pemohon</td>
              <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${clientName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Perusahaan / Instansi</td>
              <td style="padding: 10px 0; color: #0f172a;">${companyName || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Email Kontak</td>
              <td style="padding: 10px 0; color: #0284c7;"><a href="mailto:${clientEmail}" style="color: #0284c7; text-decoration: none;">${clientEmail}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Nomor Telepon / WA</td>
              <td style="padding: 10px 0; color: #0f172a;">${clientPhone || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Kategori Layanan</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${category || 'Tax Service Core'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Tingkat Urgensi</td>
              <td style="padding: 10px 0;">
                <span style="background-color: ${urgencyBadgeColor}15; color: ${urgencyBadgeColor}; padding: 3px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; border: 1px solid ${urgencyBadgeColor}40;">
                  ${urgencyText}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; vertical-align: top;">Kebutuhan / Judul</td>
              <td style="padding: 10px 0; font-weight: 600; color: #0f172a;">${title}</td>
            </tr>
          </table>

          ${description ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 28px;">
              <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Deskripsi / Rincian Masalah:</h4>
              <p style="margin: 0; font-size: 14px; color: #1e293b; white-space: pre-line; line-height: 1.5;">${description}</p>
            </div>
          ` : ''}

          <!-- Tombol Aksi Cepat Buka Tiket & Tentukan PIC -->
          <div style="text-align: center; margin: 32px 0 24px 0;">
            <a href="${assignmentUrl}" style="background-color: #0A2540; color: #ffffff; padding: 15px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              👉 Buka Tiket & Tentukan Konsultan PIC
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 24px;">
            Tautan langsung ke dashboard: <br/>
            <a href="${assignmentUrl}" style="color: #0284c7; word-break: break-all;">${assignmentUrl}</a>
          </p>

          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-top: 20px;">
            <p style="margin: 0; font-size: 12px; color: #1e40af;">
              <strong>Tips Respon Cepat:</strong> Anda dapat langsung membalas (*Reply*) email ini untuk mengirimkan tanggapan awal langsung ke klien (${clientEmail}).
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
            Notifikasi internal otomatis Zhou Consulting Platform.
          </p>
        </div>
      `,
    });

    if (error) {
      console.warn('⚠️ Resend email delivery warning (consultation alert):', error.message);
      return { success: false, message: error.message };
    }

    console.log(`✅ Email notifikasi tiket baru [${ticketCode}] terkirim ke: ${envRecipients.join(', ')} (ID: ${data?.id})`);
    return { success: true, message: 'Email notifikasi tiket baru berhasil dikirim' };
  } catch (error) {
    console.error('❌ Error kirim notifikasi email tiket konsultasi:', (error as Error).message);
    return { success: false, message: (error as Error).message };
  }
};
