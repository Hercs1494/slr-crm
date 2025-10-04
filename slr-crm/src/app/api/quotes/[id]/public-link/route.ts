import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';

import { signToken } from '@/lib/sign';

\1
  if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = signToken(params.id, 60*60*24*14); // 14 days
  const url = `${process.env.SITE_URL}/quotes/public/${params.id}?t=${encodeURIComponent(token)}`;
  return NextResponse.json({ url });
}
