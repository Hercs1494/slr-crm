import { cookies } from 'next/headers';
import crypto from 'crypto';

const SECRET = process.env.SIGNING_SECRET || 'change-me';

function verify(token: string) {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch { return false; }
}

export function requireAdmin() {
  const c = cookies().get('slr_admin');
  if (!c?.value) return false;
  return verify(c.value);
}
