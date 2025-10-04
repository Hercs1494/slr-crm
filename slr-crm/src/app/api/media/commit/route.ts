import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';

import { prisma } from '@/lib/db';
import { publicFileUrl } from '@/lib/storage';

\1
  if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { jobId, paths, kind } = await req.json();
  if (!jobId || !Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: 'Missing jobId or paths' }, { status: 400 });
  }
  // Enforce 12 photos per job (server-side)
  const existingPhotos = await prisma.mediaAsset.count({ where: { jobId, kind: 'photo' } });
  const newPhotos = (kind === 'video') ? 0 : paths.length;
  if (existingPhotos + newPhotos > 12) {
    return NextResponse.json({ error: 'Max 12 photos per job' }, { status: 400 });
  }

  const rows = await prisma.$transaction(paths.map((p: string) => prisma.mediaAsset.create({
    data: { jobId, kind: kind || 'photo', url: publicFileUrl(p) }
  })));

  return NextResponse.json({ ok: true, assets: rows });
}
