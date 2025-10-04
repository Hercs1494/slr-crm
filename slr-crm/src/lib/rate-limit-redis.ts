import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { rateLimit as localRateLimit, getClientIp } from './rate-limit';

let ratelimiter: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
  ratelimiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m') });
}

export async function rateLimitOrFallback(ip: string, route: string, limit: number) {
  if (ratelimiter) {
    const { success } = await ratelimiter.limit(`${route}:${ip}`);
    return success;
  }
  return localRateLimit(ip, route, limit);
}
