import crypto from 'crypto';

const secret = process.env.SIGNING_SECRET || 'change-me';

export function signToken(id: string, ttlSeconds: number = 60*60*24*30) {
  const now = Math.floor(Date.now()/1000);
  const exp = now + ttlSeconds;
  const payload = `${id}.${exp}`;
  const h = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${h}`;
}

export function verifyToken(token: string, id: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tid, expStr, sig] = parts;
  if (tid !== id) return false;
  const exp = parseInt(expStr, 10);
  if (!exp || exp < Math.floor(Date.now()/1000)) return false;
  const payload = `${tid}.${exp}`;
  const h = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig));
}
