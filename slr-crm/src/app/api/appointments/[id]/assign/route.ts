import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let tech = '';
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const j = await req.json(); tech = String(j.tech || '');
    } else {
      const form = await req.formData(); tech = String(form.get('tech') || '');
    }
  } catch {}
  await prisma.appointment.update({ where: { id: params.id }, data: { technician: tech || null } });
  return NextResponse.redirect(new URL('/appointments', req.url));
}
