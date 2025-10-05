'use client';
import { useState } from 'react';
import { offlineFetch } from '../../../lib/offline';

export default function NewAppointmentPage() {
  const [status, setStatus] = useState<string>('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      jobId: String(fd.get('jobId') || ''),
      startAt: String(fd.get('startAt') || ''),
      endAt: String(fd.get('endAt') || ''),
      location: String(fd.get('location') || '')
    };
    const res = await offlineFetch('/api/appointments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      queueOnFail: true
    });
    if (res.status === 202) setStatus('Saved offline — will send when back online.');
    else if (res.ok) setStatus('Created!');
    else setStatus('Failed.');
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl p-4 shadow">
      <h1 className="text-xl font-bold mb-3">New Appointment</h1>
      <form onSubmit={submit} className="space-y-3">
        <input name="jobId" placeholder="Job ID" className="border rounded p-2 w-full" required />
        <input name="startAt" type="datetime-local" className="border rounded p-2 w-full" required />
        <input name="endAt" type="datetime-local" className="border rounded p-2 w-full" required />
        <input name="location" placeholder="Location" className="border rounded p-2 w-full" />
        <button type="submit" className="px-4 py-2 rounded bg-black text-white">Create</button>
      </form>
      {status && <p className="text-sm mt-3">{status}</p>}
    </div>
  );
}
