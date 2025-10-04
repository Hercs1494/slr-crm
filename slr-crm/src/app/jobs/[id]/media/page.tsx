'use client';
import { useState } from 'react';
import { offlineFetch } from '@/lib/offline';

type Target = { path: string; url: string };

export default function JobMediaPage({ params }: { params: { id: string } }) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<string>('');

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!files || files.length === 0) return;

    // Step 1: ask server for signed URLs (must be online for this step)
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('photos', f));
    fd.append('jobId', params.id);

    const prep = await fetch('/api/media/upload', { method: 'POST', body: fd });
    if (!prep.ok) { setStatus('Failed to prepare upload'); return; }
    const { targets } = await prep.json() as { targets: Target[] };

    // Step 2: upload each file directly to storage
    for (let i=0; i<targets.length; i++) {
      await fetch(targets[i].url, { method: 'PUT', body: files[i], headers: { 'content-type': files[i].type } });
    }

    // Step 3: queue-able commit
    const paths = targets.map(t => t.path);
    const commit = await offlineFetch('/api/media/commit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jobId: params.id, paths, kind: 'photo' }),
      queueOnFail: true
    });

    if (commit.status === 202) setStatus('Uploaded. Commit saved offline — will finish when back online.');
    else if (commit.ok) setStatus('Uploaded & committed!');
    else setStatus('Commit failed.');
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl p-4 shadow">
      <h1 className="text-xl font-bold mb-3">Job Media Upload</h1>
      <form onSubmit={handleUpload} className="space-y-3">
        <input type="file" accept="image/*" multiple onChange={e => setFiles(e.target.files)} />
        <button type="submit" className="px-4 py-2 rounded bg-black text-white">Upload</button>
      </form>
      {status && <p className="text-sm mt-3">{status}</p>}
      <p className="text-xs text-gray-500 mt-2">Tip: The upload (Step 2) needs connectivity. If you go offline afterwards, the final commit is queued and will retry.</p>
    </div>
  );
}
