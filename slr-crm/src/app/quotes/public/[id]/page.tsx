import { prisma } from '../../../lib/db';
import { verifyToken } from '../../../lib/sign';

function gbp(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((pence||0)/100);
}

export default async function PublicQuote({ params, searchParams }: { params: { id: string }, searchParams: { t?: string } }) {
  const t = searchParams?.t || '';
  const ok = verifyToken(t, params.id);
  if (!ok) return <div>Link expired or invalid.</div>;

  const q = await prisma.quote.findUnique({ where: { id: params.id }, include: { items: true, customer: true } });
  if (!q) return <div>Quote not found.</div>;

  const total = q.items.reduce((a, i) => a + i.unitPence * i.qty, 0);

  const pdfUrl = `/api/quotes/${q.id}/pdf?t=${encodeURIComponent(t)}`;
  const acceptUrl = `/quotes/${q.id}/accept`;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl p-4 shadow">
      <h1 className="text-xl font-bold">Quote #{q.id.slice(0,8)}</h1>
      <p className="text-sm text-gray-600">For: {q.customer.firstName} {q.customer.lastName}</p>

      <div className="mt-4 border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr><th className="text-left p-2">Item</th><th className="text-right p-2">Qty</th><th className="text-right p-2">Unit</th><th className="text-right p-2">Line</th></tr>
          </thead>
          <tbody>
            {q.items.map(i => (
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
              <td className="p-2 text-right font-medium">{gbp(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex gap-3">
        <a href={pdfUrl} className="px-3 py-2 rounded border">Download PDF</a>
        <a href={acceptUrl} className="px-3 py-2 rounded bg-black text-white">Accept & Pay</a>
      </div>
    </div>
  );
}
