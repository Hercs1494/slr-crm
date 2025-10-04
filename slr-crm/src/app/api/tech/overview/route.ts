import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const tech = url.searchParams.get('tech') || undefined;
  const startStr = url.searchParams.get('start');
  const endStr = url.searchParams.get('end');
  const now = new Date();
  const start = startStr ? new Date(startStr) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0,0);
  const end = endStr ? new Date(endStr) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59,999);

  const todays = await prisma.appointment.findMany({
    where: { startAt: { gte: start, lte: end }, ...(tech ? { technician: tech } : {}) },
    include: { job: { include: { customer: true } } },
    orderBy: { startAt: 'asc' }
  });

  // Outstanding booking fee heuristic: booking invoice exists, final invoice not created yet
  const outstanding = await prisma.quote.findMany({
    where: { bookingInvoiceId: { not: null }, finalInvoiceId: null },
    include: { customer: true },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ todays, outstanding });
}
