import { prisma } from '@/lib/db';
import AdminNav from '@/components/AdminNav';
import { startOfflineReplay } from '@/lib/offline';
import RealtimeRefresher from '@/components/RealtimeRefresher';

export default async function EnquiriesPage() {
  const enquiries = await prisma.enquiry.findMany({ include: { customer: true }, orderBy: { createdAt: 'desc' } });
  return (
    <div>
      <script dangerouslySetInnerHTML={{__html:`(function(){try{window.__slr_offline||((window.__slr_offline=1),(${startOfflineReplay.name}&&0));}catch(e){}})();`}} />
      <RealtimeRefresher tables={ ["enquiry", "customer"] } />
      <AdminNav />
      <h2 className="text-xl font-semibold">Enquiries</h2>
      <ul className="mt-4 space-y-2">
        {enquiries.map(e => (
          <li key={e.id} className="rounded-xl border p-3 bg-white">
            <div className="font-medium">{e.customer.firstName} {e.customer.lastName}</div>
            <div className="text-sm text-gray-600">{e.description}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
