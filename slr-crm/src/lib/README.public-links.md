// To create a public link for a quote id in any admin UI or server action:
// import { signToken } from '@/lib/sign';
// const token = signToken(quoteId, 60*60*24*14); // 14 days TTL
// const publicUrl = `${process.env.SITE_URL}/quotes/public/${quoteId}?t=${encodeURIComponent(token)}`;
