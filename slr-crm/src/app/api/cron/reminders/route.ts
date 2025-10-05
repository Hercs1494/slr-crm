import { prisma } from '../../../lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, sendSMS } from '../../../lib/notifications';

function inWindow(startAt: Date, hoursAhead: number) {
  const now = new Date();
  const lower = new Date(now.getTime() + hoursAhead*60*60*1000);
  const upper = new Date(lower.getTime() + 60*60*1000);
  return startAt >= lower && startAt < upper;
}

// This should be hit by a scheduler (e.g., Vercel Cron) every hour.
export async function GET(_req: NextRequest) {
  const now = new Date();
  const in7dLower = new Date(now.getTime() + 7*24*3600*1000);
  const in7dUpper = new Date(in7dLower.getTime() + 3600*1000);
  const in24hLower = new Date(now.getTime() + 24*3600*1000);
  const in24hUpper = new Date(in24hLower.getTime() + 3600*1000);

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  const appts = await prisma.appointment.findMany({
    where: {
      OR: [
        { startAt: { gte: in7dLower, lt: in7dUpper } },
        { startAt: { gte: in24hLower, lt: in24hUpper } },
      ]
    },
    include: { job: { include: { customer: true } } }
  });

  let sent = 0;

  for (const a of appts) {
    const window = (a.startAt >= in7dLower && a.startAt < in7dUpper) ? 'T-7d' : 'T-24h';
    const exists = await prisma.notification.findUnique({ where: { appointmentId_channel_window: { appointmentId: a.id, channel: 'email', window } } });
    if (exists) continue;

    const cust = a.job.customer;
    const dateStr = a.startAt.toLocaleString('en-GB', { timeZone: process.env.TIMEZONE || 'Europe/London' });
    const manageEmail = (settings?.bookingsEmail || process.env.BOOKINGS_EMAIL) || "bookings@example.com";

    // Email
    if (cust.email) {
      await sendEmail(cust.email, 'Appointment Reminder', `<p>Reminder: your appointment is on <strong>${dateStr}</strong>.</p><p>To reschedule or cancel, please email <a href="mailto:${manageEmail}">${manageEmail}</a>.</p>`);
      await prisma.notification.create({ data: { appointmentId: a.id, channel: 'email', window } });
      sent++;
    }
    // SMS
    if (cust.phone) {
      await sendSMS(cust.phone, `Supreme Leather: reminder of your appointment on ${dateStr}. To reschedule or cancel, email us at ${manageEmail}`);
      await prisma.notification.create({ data: { appointmentId: a.id, channel: 'sms', window } });
      sent++;
    }
  }

  await prisma.settings.upsert({ where: { id: 1 }, update: { lastCronRunAt: new Date() }, create: { id: 1, lastCronRunAt: new Date() } });
  return NextResponse.json({ ok: true, candidates: appts.length, sent });
}
