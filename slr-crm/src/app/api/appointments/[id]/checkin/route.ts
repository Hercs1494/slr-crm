import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { requireAdmin } from '../../../lib/api-auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const appt = await prisma.appointment.update({ where: { id: params.id }, data: { checkedInAt: new Date(), checkinLat: body?.lat ?? null, checkinLng: body?.lng ?? null, checkinAcc: body?.acc ?? null } });
  return NextResponse.json({ ok: true, appointment: appt });
}
