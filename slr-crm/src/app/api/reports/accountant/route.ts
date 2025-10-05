import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { requireAdmin } from '../../../../lib/api-auth';
import { getInvoiceDetails } from '../../../../lib/quickfile';

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
  const withQuickFile = url.searchParams.get('quickfile') !== '0'; // default on

  const start = startStr ? new Date(startStr) : new Date(2000,0,1);
  const end = endStr ? new Date(endStr) : new Date(2100,0,1);

  const payments = await prisma.payment.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: 'asc' }
  });

  // Preload quotes + customers
  const quoteIds = Array.from(new Set(payments.map(p => p.quoteId).filter(Boolean))) as string[];
  const quotes = await prisma.quote.findMany({
    where: { id: { in: quoteIds } },
    include: { customer: true }
  });
  const quoteMap = new Map(quotes.map(q => [q.id, q]));

  const rows = [['Date','Provider','Kind','Amount(GBP)','QuoteId','Customer','Email','QuickFileInvoiceId','QuickFileInvoiceNumber','QuickFileInvoiceDate']];

  for (const p of payments) {
    let invNum = '';
    let invDate = '';
    if (withQuickFile && p.invoiceId) {
      const det = await getInvoiceDetails(p.invoiceId).catch(() => null);
      if (det) { invNum = det.number || ''; invDate = det.issueDate || ''; }
    }
    const q = p.quoteId ? quoteMap.get(p.quoteId) : null;
    rows.push([
      p.createdAt.toISOString(),
      p.provider,
      p.kind,
      (p.amountPence/100).toFixed(2),
      p.quoteId || '',
      q ? `${q.customer.firstName} ${q.customer.lastName}` : '',
      q?.customer.email || '',
      String(p.invoiceId || ''),
      invNum,
      invDate
    ]);
  }

  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="accountant_export.csv"'
    }
  });
}
