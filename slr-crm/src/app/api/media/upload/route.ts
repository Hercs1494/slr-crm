import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/api-auth';

import { getSignedUploadUrls } from '../../../../lib/storage';

\1
  if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await req.formData();
  const files = form.getAll('photos') as File[];
  const jobId = String(form.get('jobId') || '');
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  if (!files || files.length === 0) return NextResponse.json({ error: 'No files' }, { status: 400 });
  if (files.length > 12) return NextResponse.json({ error: 'Max 12 photos' }, { status: 400 });

  const mimeList = files.map(f => f.type || 'image/jpeg');
  const { targets } = await getSignedUploadUrls(jobId, mimeList);
  return NextResponse.json({ ok: true, targets });
}
