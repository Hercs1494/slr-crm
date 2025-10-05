'use client';
import { useState } from 'react';
import { offlineFetch } from '../../../lib/offline';

export default function EnquirePage() {
  const [status, setStatus] = useState<string>('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await offlineFetch('/api/enquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      queueOnFail: true
    });
    if (res.status === 202) setStatus('Saved offline — will send when back online.');
    else if (res.ok) setStatus('Sent!');
    else setStatus('Failed.');
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl p-4 shadow">
      <h1 className="text-xl font-bold mb-3">Request a Quote</h1>
      <form onSubmit={submit} className="space-y-3">
        <input name="first_name" placeholder="First name" className="border rounded p-2 w-full" required />
        <input name="last_name" placeholder="Last name" className="border rounded p-2 w-full" required />
        <input name="email" type="email" placeholder="Email" className="border rounded p-2 w-full" required />
        <input name="phone" placeholder="Phone" className="border rounded p-2 w-full" required />
        <input name="postcode" placeholder="Postcode" className="border rounded p-2 w-full" required />
        <textarea name="description" placeholder="Describe the issue" className="border rounded p-2 w-full" rows={4} />
        <button type="submit" className="px-4 py-2 rounded bg-black text-white">Submit</button>
      </form>
      {status && <p className="text-sm mt-3">{status}</p>}
    </div>
  );
}
