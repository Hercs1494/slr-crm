import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';


\1
  if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { jobId, startAt, endAt, location, travelMin, bufferMin } = await req.json();
  if (!jobId || !startAt || !endAt) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const appt = await prisma.appointment.create({ data: { jobId, startAt: new Date(startAt), endAt: new Date(endAt), location, travelMin: travelMin||0, bufferMin: bufferMin||0 } });

  // No immediate send; cron endpoint will pick it up.
  return NextResponse.json({ appointment: appt, ics: null });
}
