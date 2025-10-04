import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';

function ok(v: boolean, msg: string) { return { ok: v, message: msg }; }

export async function GET(req: NextRequest) {
  const out: any = { ok: true, checks: {} };

  // DB
  try {
    await prisma.$queryRaw`SELECT 1`;
    out.checks.database = ok(true, 'Connected');
  } catch (e: any) {
    out.checks.database = ok(false, e.message || 'DB error'); out.ok = false;
  }

  // Redis (optional)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
      await redis.ping();
      out.checks.redis = ok(true, 'Ping ok');
    } catch (e: any) {
      out.checks.redis = ok(false, e.message || 'Redis error'); out.ok = false;
    }
  } else {
    out.checks.redis = ok(true, 'Not configured');
  }

  // Supabase Storage (optional)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY && process.env.SUPABASE_BUCKET) {
    try {
      const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
      const { data, error } = await s.storage.from(process.env.SUPABASE_BUCKET!).list('', { limit: 1 });
      if (error) throw error;
      out.checks.supabase = ok(true, 'Bucket accessible');
    } catch (e: any) {
      out.checks.supabase = ok(false, e.message || 'Supabase error'); out.ok = false;
    }
  } else {
    out.checks.supabase = ok(false, 'Missing env');
    out.ok = false;
  }

  // Square creds present?
  out.checks.square = ok(!!process.env.SQUARE_TOKEN && !!process.env.SQUARE_LOCATION_ID, (!!process.env.SQUARE_TOKEN ? 'Token set' : 'Token missing'));

  // SumUp creds present?
  out.checks.sumup = ok(!!process.env.SUMUP_CLIENT_ID && !!process.env.SUMUP_CLIENT_SECRET && !!process.env.SUMUP_MERCHANT_CODE, (!!process.env.SUMUP_CLIENT_ID ? 'Client set' : 'Client missing'));

  // QuickFile creds present?
  out.checks.quickfile = ok(!!process.env.QUICKFILE_ACCOUNT_NUMBER && !!process.env.QUICKFILE_API_KEY && !!process.env.QUICKFILE_APPLICATION_ID, (!!process.env.QUICKFILE_API_KEY ? 'API key set' : 'Missing creds'));

  // Webhook secrets present?
  out.checks.webhooks = ok(!!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY && !!process.env.SUMUP_WEBHOOK_SECRET, (!!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ? 'Secrets set' : 'Missing secrets'));

  // Cron last run
  try {
    const s = await prisma.settings.findUnique({ where: { id: 1 } });
    out.checks.cron = ok(!!s?.lastCronRunAt, s?.lastCronRunAt ? `Last run: ${s.lastCronRunAt.toISOString()}` : 'No runs yet');
  } catch (e: any) {
    out.checks.cron = ok(false, e.message || 'Cron check error'); out.ok = false;
  }

  return NextResponse.json(out);
}
