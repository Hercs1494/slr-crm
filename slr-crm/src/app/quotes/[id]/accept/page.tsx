import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { createSquareLink } from '@/lib/square';
import { createSumUpCheckout } from '@/lib/sumup';
import { ensureClient, createInvoice } from '@/lib/quickfile';

function gbp(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((pence||0)/100);
}

export default async function QuoteAcceptPage({ params }: { params: { id: string } }) {
  const quote = await prisma.quote.findUnique({ where: { id: params.id }, include: { customer: true, items: true } });
  if (!quote) return <div>Quote not found.</div>;

  async function accept(formData: FormData) {
    'use server';
    const provider = String(formData.get('provider') || 'square');
    const payMode = String(formData.get('payMode') || 'full'); // 'full' | 'bookingFee'
    const const bookingFeeDefault = 20;
    const bookingFeePct = payMode === 'bookingFee' ? bookingFeeDefault : 0;

    // Ensure QuickFile client & create appropriate QuickFile invoice
    const clientId = await ensureClient({
      companyName: `${quote.customer.firstName} ${quote.customer.lastName}`,
      contactName: `${quote.customer.firstName} ${quote.customer.lastName}`,
      email: quote.customer.email || undefined
    });

    const subtotalPence = quote.items.reduce((acc, i) => acc + (i.unitPence * i.qty), 0);

    if (payMode === 'bookingFee') {
      const bookingPence = Math.round(subtotalPence * (depositDefault / 100));
      // Create a dedicated Booking Fee invoice with a single line
      const invId = await createInvoice(clientId, [{
        Description: `Booking Fee (${depositDefault}%) for Quote ${quote.id}`,
        Quantity: 1,
        UnitCost: bookingPence / 100,
        VatRate: 20
      }], 'Booking fee payable to secure appointment.');
      if (invId) {
        await prisma.quote.update({ where: { id: quote.id }, data: { bookingInvoiceId: Number(invId) } });
      }
    } else {
      // Full invoice for all line items
      if (!quote.finalInvoiceId && !quote.quickfileInvoiceId) {
        const lines = quote.items.map(i => ({
          Description: i.title,
          Quantity: i.qty,
          UnitCost: i.unitPence / 100,
          VatRate: (i.taxRate ?? 2000) / 100
        }));
        const invId = await createInvoice(clientId, lines, undefined);
        if (invId) {
          await prisma.quote.update({ where: { id: quote.id }, data: { finalInvoiceId: Number(invId), quickfileInvoiceId: Number(invId) } });
        }
      }
    }

    // Build items for payment. If bookingFee, scale the grand total into a single line called 'Booking Fee'.
    const totalPence = quote.items.reduce((acc, i) => acc + (i.unitPence * i.qty), 0);
    const taxFactor = (quote.tax || 0); // already embedded in unitPence based on schema; keeping simple
    let items: { title: string; qty: number; unitPence: number }[];

    if (bookingFeePct > 0) {
      const bookingFeePence = Math.round(totalPence * (bookingFeePct / 100));
      items = [{ title: `Booking Fee ${bookingFeePct}% for Quote ${quote.id}`, qty: 1, unitPence: bookingFeePence }];
    } else {
      items = quote.items.map(i => ({ title: i.title, qty: i.qty, unitPence: i.unitPence }));
    }

    // Create payment link with ownerType=quote to set paymentReference
    const redirectUrl = process.env.SITE_URL;
    let url: string;
    if (provider === 'sumup') {
      url = await createSumUpCheckout(items, redirectUrl, quote.id);
    } else {
      url = await createSquareLink(items, redirectUrl, quote.id);
    }

    // Save reference immediately
    await prisma.quote.update({ where: { id: quote.id }, data: { paymentReference: quote.id } });

    redirect(url);
  }

  const subtotal = quote.items.reduce((acc, i) => acc + i.unitPence * i.qty, 0);
  const const bookingFeeDefault = 20;
  const bookingFeeAmount = Math.round(subtotal * (bookingFeeDefault / 100));

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl p-4 shadow">
      <h1 className="text-xl font-bold">Accept Quote</h1>\n      <p className="text-sm"><a className="underline" href={`/api/quotes/${'{'}params.id{'}'}/pdf`}>Download PDF</a></p>
      <p className="text-sm text-gray-600">Quote ID: {quote.id}</p>

      <div className="mt-4 border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr><th className="text-left p-2">Item</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit</th><th className="text-right p-2">Line</th></tr>
          </thead>
          <tbody>
            {quote.items.map(i => (
              <tr key={i.id} className="border-t">
                <td className="p-2">{i.title}</td>
                <td className="p-2 text-right">{i.qty}</td>
                <td className="p-2 text-right">{gbp(i.unitPence)}</td>
                <td className="p-2 text-right">{gbp(i.unitPence * i.qty)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t">
              <td className="p-2 font-medium" colSpan={3}>Total</td>
              <td className="p-2 text-right font-medium">{gbp(subtotal)}</td>
            </tr>
            {bookingFeeDefault > 0 && (
              <tr>
                <td className="p-2 text-sm text-gray-600" colSpan={3}>Booking Fee ({bookingFeeDefault}%)</td>
                <td className="p-2 text-right text-gray-600">{gbp(bookingFeeAmount)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      <form action={accept} className="mt-6 space-y-3">
        <fieldset className="border rounded p-3">
          <legend className="text-sm font-medium">Payment amount</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="payMode" value="full" defaultChecked /> <span>Pay full amount ({gbp(subtotal)})</span>
          </label>
          {bookingFeeDefault > 0 && (
            <label className="flex items-center gap-2">
              <input type="radio" name="payMode" value="bookingFee" /> <span>Pay booking fee ({bookingFeeDefault}% — {gbp(bookingFeeAmount)})</span>
            </label>
          )}
        </fieldset>

        <fieldset className="border rounded p-3">
          <legend className="text-sm font-medium">Payment provider</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="provider" value="square" defaultChecked /> <span>Square</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="provider" value="sumup" /> <span>SumUp</span>
          </label>
        </fieldset>

        <button type="submit" className="px-4 py-2 rounded bg-black text-white">Accept & Continue to Payment</button>
      </form>
    </div>
  );
}
