import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../lib/db';
import { logPayment, ensureClient, createBalanceInvoice } from '../../../../lib/quickfile';

/** Square signature verification: HMAC-SHA1(secret, url + body) */
function verifySquareSignature(req: NextRequest, rawBody: string) {
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '';
  const provided = req.headers.get('x-square-signature') || '';
  if (!secret || !provided) return false;

  // Build canonical URL: prefer env override, else req.url
  const urlFromEnv = process.env.SQUARE_WEBHOOK_URL;
  const canonicalUrl = urlFromEnv && urlFromEnv.length > 0 ? urlFromEnv : req.url;

  const computed = crypto.createHmac('sha1', secret).update(canonicalUrl + rawBody).digest('base64');

  try { return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(computed)); }
  catch { return false; }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySquareSignature(req, raw)) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  }
  const evt = JSON.parse(raw);
  const payment = evt?.data?.object?.payment;
  if (evt?.type === 'payment.updated' && payment?.status === 'COMPLETED') {
    const reference = payment?.referenceId || payment?.orderId || null;
    const amount = payment?.amountMoney?.amount ? Number(payment.amountMoney.amount) / 100 : undefined;
    if (reference && amount) {
      const quote = await prisma.quote.findFirst({ where: { paymentReference: reference }, include: { customer: true } });
      if (quote) {
        const targetInvoice = quote.bookingInvoiceId ?? quote.finalInvoiceId ?? quote.quickfileInvoiceId;
        if (targetInvoice) {
          await logPayment(targetInvoice, amount, 'Card', payment.id);
          const kind = (quote.bookingInvoiceId && targetInvoice === quote.bookingInvoiceId) ? 'booking' : ((quote.finalInvoiceId && targetInvoice === quote.finalInvoiceId) ? 'balance' : 'other');
          await prisma.payment.create({ data: { provider: 'square', externalId: payment.id, amountPence: Math.round(amount*100), kind, invoiceId: Number(targetInvoice), quoteId: quote.id } });
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
