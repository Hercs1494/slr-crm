'use client';
import useSWR from 'swr';
import AdminNav from '@/components/AdminNav';

const fetcher = (url:string) => fetch(url).then(r => r.json());

function Badge({ ok }: { ok: boolean }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs ${ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{ok ? 'OK' : 'ISSUE'}</span>;
}

export default function StatusPage() {
  const { data } = useSWR('/api/status', fetcher, { refreshInterval: 10000 });
  const checks = data?.checks || {};
  const keys = Object.keys(checks);

  return (
    <div>
      <AdminNav />
      <h1 className="text-xl font-bold mb-3">System Status</h1>
      {!data && <div>Loading…</div>}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {keys.map(k => (
            <div key={k} className="rounded-xl border p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="font-medium">{k}</div>
                <Badge ok={checks[k].ok} />
              </div>
              <div className="text-sm text-gray-600 mt-1">{checks[k].message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
