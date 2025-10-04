import { prisma } from '@/lib/db';
import CopyPublicLinkButton from '@/components/CopyPublicLinkButton';

import AdminNav from '@/components/AdminNav';
import { startOfflineReplay } from '@/lib/offline';
import RealtimeRefresher from '@/components/RealtimeRefresher';

export default async function QuotesAdminPage() {
  const quotes = await prisma.quote.findMany({ include: { customer: true }, orderBy: { createdAt: 'desc' }, take: 50 });
  return (
    <div>
      <script dangerouslySetInnerHTML={{__html:`(function(){try{window.__slr_offline||((window.__slr_offline=1),(${startOfflineReplay.name}&&0));}catch(e){}})();`}} />
      <RealtimeRefresher tables={ ["quote", "quoteitem", "customer"] } />
      <AdminNav />
      <h2 className="text-xl font-semibold">Quotes</h2>
      <table className="mt-4 w-full text-sm">
        <thead><tr><th className="text-left p-2">Customer</th><th className="text-left p-2">Quote ID</th><th className="p-2">Actions</th></tr></thead>
        <tbody>
          {quotes.map(q => (
            <tr key={q.id} className="border-t">
              <td className="p-2">{q.customer.firstName} {q.customer.lastName}</td>
              <td className="p-2">{q.id.slice(0,8)}</td>
              <td className="p-2"><CopyPublicLinkButton quoteId={q.id} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
