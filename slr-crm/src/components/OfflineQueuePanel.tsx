'use client';
import { useEffect, useState } from 'react';
import { getQueue } from '@/lib/offline';

export default function OfflineQueuePanel() {
  const [items, setItems] = useState<any[]>([]);

  function refresh() {
    try { setItems(getQueue()); } catch { setItems([]); }
  }

  async function retryNow() {
    // Trigger the global replay by toggling online event
    window.dispatchEvent(new Event('online'));
    setTimeout(refresh, 1000);
  }

  function clearQueue() {
    localStorage.setItem('slr_offline_queue_v1', '[]');
    refresh();
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, []);

  const count = items.length;
  if (count === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-xl shadow-lg p-3 w-80">
      <div className="flex items-center justify-between">
        <div className="font-medium">Queued actions ({count})</div>
        <div className="flex gap-2">
          <button onClick={retryNow} className="text-xs px-2 py-1 border rounded">Retry</button>
          <button onClick={clearQueue} className="text-xs px-2 py-1 border rounded">Clear</button>
        </div>
      </div>
      <ul className="mt-2 max-h-40 overflow-auto text-xs text-gray-700 space-y-1">
        {items.map((it, idx) => (
          <li key={idx} className="border rounded p-1">{it.method} {it.url}</li>
        ))}
      </ul>
    </div>
  );
}
