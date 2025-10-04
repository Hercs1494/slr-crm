import { Resend } from 'resend';
import twilio from 'twilio';

const resend = new Resend(process.env.RESEND_API_KEY || '');
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID || '', process.env.TWILIO_AUTH_TOKEN || '');

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return { skipped: true };
  const r = await resend.emails.send({
    from: 'Supreme Leather <noreply@slrcrm.local>',
    to, subject, html
  });
  return r;
}

export async function sendSMS(to: string, body: string) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return { skipped: true };
  const r = await twilioClient.messages.create({ from: process.env.TWILIO_FROM_NUMBER!, to, body });
  return r;
}
