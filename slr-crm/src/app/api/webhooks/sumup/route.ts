import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../lib/db';
import { logPayment, ensureClient, createBalanceInvoice } from '../../../lib/quickfile';

function verifySumUpSignature(req: NextRequest, rawBody: string) {
  const sig = req.headers.get('x-sumup-signature') || req.headers.get('x-hub-signature-256') || '';
  const secret = process.env.SUMUP_WEBHOOK_SECRET || '';
  if (!sig || !secret) return false;
  try {
    const mac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const presented = sig.replace(/^sha256=/, '');
    return crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(mac));
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySumUpSignature(req, raw)) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  }
  const evt = JSON.parse(raw);
  if (evt?.status === 'PAID') {
    const reference = evt?.checkout_reference || evt?.external_reference;
    const amount = typeof evt?.amount === 'number' ? evt.amount : undefined;
    if (reference && amount) {
      const quote = await prisma.quote.findFirst({ where: { paymentReference: reference }, include: { customer: true } });
      if (quote) {
        const targetInvoice = quote.bookingInvoiceId ?? quote.finalInvoiceId ?? quote.quickfileInvoiceId;
        if (targetInvoice) {
          await logPayment(targetInvoice, amount, 'Card', evt?.id);
          const kind = (quote.bookingInvoiceId && targetInvoice === quote.bookingInvoiceId) ? 'booking' : ((quote.finalInvoiceId && targetInvoice === quote.finalInvoiceId) ? 'balance' : 'other');
          await prisma.payment.create({ data: { provider: 'sumup', externalId: String(evt?.id || ''), amountPence: Math.round(amount*100), kind, invoiceId: Number(targetInvoice), quoteId: quote.id } });
          if (quote.bookingInvoiceId && targetInvoice === quote.bookingInvoiceId && !quote.finalInvoiceId) {
            const clientId = await ensureClient({
              companyName: `${quote.customer.firstName} ${quote.customer.lastName}`,
              contactName: `${quote.customer.firstName} ${quote.customer.lastName}`,
              email: quote.customer.email || undefined
            });
            const invId = await createBalanceInvoice(clientId, quote, 20);
            if (invId) {
              await prisma.quote.update({ where: { id: quote.id }, data: { finalInvoiceId: Number(invId) } });
            }
          }
        }
      }
    }
  }
  return NextResponse.json({ ok: true });
}
