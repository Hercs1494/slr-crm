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
  const startStr = url.searchParams.get('start');
  const endStr = url.searchParams.get('end');
  const mode = url.searchParams.get('mode') || 'transactions'; // 'transactions' | 'summary'

  const start = startStr ? new Date(startStr) : new Date(2000,0,1);
  const end = endStr ? new Date(endStr) : new Date(2100,0,1);

  const rowsTx = [['Date','Provider','Kind','Amount(GBP)','QuoteId','InvoiceId','ExternalId']];

  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: 'asc' }
  });

  if (mode === 'transactions') {
    for (const p of payments) {
      rowsTx.push([
        p.createdAt.toISOString(),
        p.provider,
        p.kind,
        (p.amountPence/100).toFixed(2),
        p.quoteId || '',
        String(p.invoiceId),
        p.externalId
      ]);
    }
    const csv = rowsTx.map(r => r.map(csvEscape).join(',')).join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="payments_transactions.csv"'
      }
    });
  } else {
    // Monthly summary by kind
    const agg = new Map<string, { booking: number; balance: number; other: number }>();
    for (const p of payments) {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth()+1).padStart(2,'0')}`;
      if (!agg.has(key)) agg.set(key, { booking: 0, balance: 0, other: 0 });
      const bucket = agg.get(key)!;
      bucket[p.kind as 'booking'|'balance'|'other'] += p.amountPence;
    }
    const rows = [['Month','Booking GBP','Balance GBP','Other GBP','Total GBP']];
    const months = Array.from(agg.keys()).sort();
    for (const m of months) {
      const b = agg.get(m)!;
      const total = b.booking + b.balance + b.other;
      rows.push([m, (b.booking/100).toFixed(2), (b.balance/100).toFixed(2), (b.other/100).toFixed(2), (total/100).toFixed(2)]);
    }
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="payments_summary.csv"'
      }
    });
  }
}
