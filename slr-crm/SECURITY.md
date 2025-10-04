# Security Notes

- **Rate limiting**: public endpoints (`/api/enquiry`, `/api/payments/checkout`, `/api/quotes/[id]/pdf`) use an in-memory sliding window limiter.
  - Adjust per-route limits in `src/lib/rate-limit.ts` or replace with Redis for production.
- **Webhook signatures**:
  - **Square**: set `SQUARE_WEBHOOK_SIGNATURE_KEY`; handler verifies `x-square-signature` against the raw request body (scaffold).
  - **SumUp**: set `SUMUP_WEBHOOK_SECRET`; handler verifies `x-sumup-signature` or `x-hub-signature-256` HMAC-SHA256 with the raw body (scaffold).


## Production rate limiting (Redis / Upstash)
Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. The app will use a sliding window limiter from `@upstash/ratelimit`. If not set, it falls back to an in-memory limiter (single-instance only).

## Square signature canonical string
We verify `x-square-signature` as `HMAC-SHA1(secret, notification_url + body)`. If your deployment sits behind a proxy that rewrites URLs, set `SQUARE_WEBHOOK_URL` to the public webhook endpoint URL in the Square dashboard.
