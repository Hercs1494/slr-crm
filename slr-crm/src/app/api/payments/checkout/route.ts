import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitOrFallback } from '@/lib/rate-limit-redis';
import { createSquareLink } from '@/lib/square';
import { createSumUpCheckout } from '@/lib/sumup';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req as any);
  if (!(await rateLimitOrFallback(ip, '/api/payments/checkout', 30))) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  const { provider, items, redirectUrl, ownerType, ownerId } = await req.json();
  if (!provider || !items || !Array.isArray(items)) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  // Normalise items
  const mapped = items.map((i: any) => ({ title: String(i.title), qty: Number(i.qty || 1), unitPence: Number(i.unitPence || 0) }));

  // We use a reference string to tie the payment back. For quotes, use the Quote ID.
  const reference = ownerType === 'quote' && typeof ownerId === 'string' ? ownerId : undefined;

  if (ownerType === 'quote' && reference) {
    await prisma.quote.update({ where: { id: ownerId }, data: { paymentReference: reference } }).catch(() => {});
  }

  if (provider === 'square') {
    const url = await createSquareLink(mapped, redirectUrl, reference);
    return NextResponse.json({ url });
  }
  if (provider === 'sumup') {
    const url = await createSumUpCheckout(mapped, redirectUrl, reference);
    return NextResponse.json({ url });
  }
  return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
}
