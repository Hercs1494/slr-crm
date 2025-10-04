import crypto from 'crypto';
import { cookies } from 'next/headers';

const SECRET = process.env.SIGNING_SECRET || 'change-me';

function sign(payload: string) {
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verify(token: string) {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function setSession(email: string) {
  const val = sign(`${email}`);
  cookies().set('slr_admin', val, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60*60*24*7 });
}

export function getSession(): string | null {
  const c = cookies().get('slr_admin');
  if (!c?.value) return null;
  const ok = verify(c.value);
  if (!ok) return null;
  return c.value.split('.')[0];
}

export function clearSession() {
  cookies().set('slr_admin', '', { path: '/', maxAge: 0 });
}
