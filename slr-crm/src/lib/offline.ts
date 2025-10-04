'use client';

type Req = { url: string; method: string; body?: any; headers?: Record<string,string> };
const KEY = 'slr_offline_queue_v1';

export function getQueue(): Req[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function setQueue(q: Req[]) { localStorage.setItem(KEY, JSON.stringify(q)); }

export async function offlineFetch(input: RequestInfo | URL, init?: RequestInit & { queueOnFail?: boolean }) {
  const opts = init || {};
  const method = (opts.method || 'GET').toUpperCase();
  const queueable = ['POST','PUT','PATCH','DELETE'].includes(method);
  try {
    const res = await fetch(input, init);
    if (!res.ok && queueable && opts.queueOnFail) throw new Error('queueable failure');
    return res;
  } catch (e) {
    if (queueable && opts.queueOnFail) {
      const headers: Record<string,string> = {};
      (opts.headers && typeof opts.headers === 'object') && Object.entries(opts.headers).forEach(([k,v]) => headers[k]=String(v));
      const body = typeof opts.body === 'string' ? opts.body : (opts.body instanceof FormData ? Object.fromEntries(opts.body as any) : opts.body);
      const q = getQueue(); q.push({ url: String(input), method, body, headers }); setQueue(q);
      return new Response(JSON.stringify({ queued: true }), { status: 202, headers: { 'content-type': 'application/json' } });
    }
    throw e;
  }
}

export function startOfflineReplay(intervalMs = 5000) {
  async function tick() {
    const q = getQueue();
    if (q.length === 0) return;
    const next = q[0];
    try {
      const res = await fetch(next.url, {
        method: next.method,
        headers: next.headers,
        body: next.body && typeof next.body !== 'string' ? JSON.stringify(next.body) : next.body
      });
      if (res.ok) {
        const rest = q.slice(1);
        setQueue(rest);
      }
    } catch {}
  }
  setInterval(tick, intervalMs);
  window.addEventListener('online', tick);
}
