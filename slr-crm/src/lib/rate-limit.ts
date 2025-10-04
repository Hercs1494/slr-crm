const buckets = new Map<string, number[]>();
const WINDOW_MS = 60 * 1000;

function key(ip: string, route: string) {
  return `${ip}::${route}`;
}

export function rateLimit(ip: string, route: string, limit: number = 30) {
  const now = Date.now();
  const k = key(ip, route);
  const arr = (buckets.get(k) || []).filter(ts => now - ts < WINDOW_MS);
  if (arr.length >= limit) return false;
  arr.push(now);
  buckets.set(k, arr);
  return true;
}

export function getClientIp(req: Request): string {
  const xf = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  return xf || '0.0.0.0';
}
