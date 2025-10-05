'use client';

import React, { useEffect, useState } from 'react';
import AdminNav from '../../../components/AdminNav';

type StatusResponse = {
  checks: Record<string, { ok: boolean; message?: string }>;
};

function Badge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs ${
        ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {ok ? 'OK' : 'ISSUE'}
    </span>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      const json = (await res.json()) as StatusResponse;
      setData(json);
    } catch (e) {
      console.error('Error fetching /api/status', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); // initial load
    const id = setInterval(load, 10000); // refresh every 10s
    return () => clearInterval(id);
  }, []);

  const checks = data?.checks ?? {};
  const keys = Object.keys(checks);

  return (
    <div>
      <AdminNav />
      <h1 className="text-xl font-bold mb-3">System Status</h1>

      {loading && <div>Loading...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {keys.map((k) => (
          <div key={k} className="rounded-xl border p-3 bg-white">
            <div className="flex items-center justify-between">
              <div className="font-mono">{k}</div>
              <Badge ok={!!checks[k]?.ok} />
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {checks[k]?.message ?? ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
