import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

function csvEscape(s: any) {
  if (s === null || s === undefined) return '';
  const str = String(s);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

export async function GET(req: NextRequest) {
  if (!requireAdmin()) return new NextResponse('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const tech = url.searchParams.get('tech') || undefined;
  const startStr = url.searchParams.get('start');
  const endStr = url.searchParams.get('end');
  const now = new Date();
  const start = startStr ? new Date(startStr) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
  const end = endStr ? new Date(endStr) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);

  const appts = await prisma.appointment.findMany({
    where: { startAt: { gte: start, lte: end }, ...(tech ? { technician: tech } : {}) },
    include: { job: { include: { customer: true } } },
    orderBy: { startAt: 'asc' }
  });

  const rows = [
    ['AppointmentID','Customer','Technician','Start','End','CheckedInAt','InLat','InLng','InAcc(m)','CheckedOutAt','OutLat','OutLng','OutAcc(m)','Location']
  ];
  for (const a of appts) {
    rows.push([
      a.id,
      `${a.job.customer.firstName} ${a.job.customer.lastName}`,
      a.technician || '',
      a.startAt?.toISOString() || '',
      a.endAt?.toISOString() || '',
      a.checkedInAt?.toISOString() || '',
      a.checkinLat ?? '',
      a.checkinLng ?? '',
      a.checkinAcc ?? '',
      a.checkedOutAt?.toISOString() || '',
      a.checkoutLat ?? '',
      a.checkoutLng ?? '',
      a.checkoutAcc ?? '',
      a.location || ''
    ]);
  }

  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="checkins.csv"'
    }
  });
}
