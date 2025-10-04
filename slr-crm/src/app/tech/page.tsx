'use client';
import useSWR from 'swr';
import React from 'react';
import { useMemo } from 'react';
import { offlineFetch } from '@/lib/offline';
import dynamic from 'next/dynamic';
const MapThumb = dynamic(() => import('@/components/MapThumb'), { ssr: false });

const fetcher = (url:string) => fetch(url).then(r => r.json());

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border p-3 bg-white"><div className="font-medium mb-2">{title}</div>{children}</div>;
}

export default function TechDashboard() {
  const [techFilter, setTechFilter] = React.useState<string>('');
  const [start, setStart] = React.useState<string>('');
  const [end, setEnd] = React.useState<string>('');
  const qs = new URLSearchParams({ ...(techFilter?{tech:techFilter}:{}), ...(start?{start}:{}) , ...(end?{end}:{}) }).toString();
  const { data, mutate } = useSWR(`/api/tech/overview${qs?`?${qs}`:''}`, fetcher, { refreshInterval: 10000 });

  async function act(apptId: string, kind: 'checkin'|'checkout') {
    let pos: any = null;
    try {
      pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
      });
    } catch {}
    const res = await offlineFetch(`/api/appointments/${apptId}/${kind}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pos || {}),
      queueOnFail: true
    });
    if (res.ok || res.status === 202) mutate();
  }

  const todays = data?.todays || [];
  const outstanding = data?.outstanding || [];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Tech Dashboard</h1>

      <div className="rounded-xl border p-3 bg-white flex flex-wrap gap-3 items-end">
        <div>
          <div className="text-xs text-gray-600">Technician</div>
          <input value={techFilter} onChange={e=>setTechFilter(e.target.value)} placeholder="e.g. Alex" className="border rounded p-1"/>
        </div>
        <div>
          <div className="text-xs text-gray-600">Start</div>
          <input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} className="border rounded p-1"/>
        </div>
        <div>
          <div className="text-xs text-gray-600">End</div>
          <input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} className="border rounded p-1"/>
        </div>
        <div className="ml-auto">
          <div className="flex gap-2">
            <a href={`/api/reports/checkins${qs?`?${qs}`:''}`} className="px-3 py-1.5 border rounded inline-block">Check-ins CSV</a>
            <a href={`/api/reports/payments${qs?`?${qs}`:''}`} className="px-3 py-1.5 border rounded inline-block">Payments CSV</a>
            <a href={`/api/reports/accountant${qs?`?${qs}`:''}`} className="px-3 py-1.5 border rounded inline-block">Accountant CSV</a>
            <a href={`/api/reports/payments${qs?`?${qs}`:''}&mode=summary`} className="px-3 py-1.5 border rounded inline-block">Payments Monthly</a>
          </div>
        </div>
      </div>

      <Section title="Today's Appointments">
        <table className="w-full text-sm">
          <thead><tr><th className="p-2 text-left">Customer</th><th className="p-2">Start</th><th className="p-2">End</th><th className="p-2">Status</th><th className="p-2">Map</th><th className="p-2">Actions</th></tr></thead>
          <tbody>
            {todays.map((a:any) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.job.customer.firstName} {a.job.customer.lastName}</td>
                <td className="p-2">{new Date(a.startAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="p-2">{new Date(a.endAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="p-2">{a.checkedInAt ? (a.checkedOutAt ? 'Completed' : 'On site') : 'Scheduled'}</td>
                <td className="p-2 text-xs">{a.checkinLat && a.checkinLng ? <MapThumb lat={a.checkinLat} lng={a.checkinLng} label={`Check-in ${new Date(a.checkedInAt).toLocaleString('en-GB')}`} kind="in" /> : (a.checkoutLat && a.checkoutLng ? <MapThumb lat={a.checkoutLat} lng={a.checkoutLng} label={`Check-out ${new Date(a.checkedOutAt).toLocaleString('en-GB')}`} kind="out" /> : '-')}</td>
                <td className="p-2">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => act(a.id,'checkin')} disabled={!!a.checkedInAt} className="px-2 py-1 border rounded disabled:opacity-50">Check in</button>
                    <button onClick={() => act(a.id,'checkout')} disabled={!a.checkedInAt || !!a.checkedOutAt} className="px-2 py-1 border rounded disabled:opacity-50">Check out</button>
                  </div>
                </td>
              </tr>
            ))}
            {todays.length===0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No appointments today.</td></tr>}
          </tbody>
        </table>
      </Section>

      <Section title="Awaiting Booking Fee (issued, balance not yet created)">
        <ul className="text-sm list-disc pl-5">
          {outstanding.map((q:any) => (
            <li key={q.id}>Quote {q.id.slice(0,8)} — {q.customer.firstName} {q.customer.lastName}</li>
          ))}
          {outstanding.length===0 && <li className="text-gray-500 list-none">All clear.</li>}
        </ul>
      </Section>
    </div>
  );
}
