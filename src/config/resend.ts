import { Resend } from 'resend';
import 'dotenv/config';

const apiKey = process.env.RESEND_API_KEY;

// Jika API key belum diset (misal di local dev), gunakan dummy handler agar tidak throw crash
export const resend = apiKey ? new Resend(apiKey) : null;
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Zhou Consulting <noreply@zhouconsulting.com>';
