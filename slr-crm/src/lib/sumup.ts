async function getSumUpToken() {
  const params = new URLSearchParams();
  params.set('grant_type', 'client_credentials');
  params.set('client_id', process.env.SUMUP_CLIENT_ID!);
  params.set('client_secret', process.env.SUMUP_CLIENT_SECRET!);
  const r = await fetch('https://api.sumup.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: params });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.access_token as string;
}

type Item = { title: string; qty: number; unitPence: number };

export async function createSumUpCheckout(items: Item[], redirectUrl?: string, reference?: string) {
  const token = await getSumUpToken();
  const amount = items.reduce((acc, it) => acc + it.unitPence * it.qty, 0) / 100;
  const payload: any = {
    amount: Number(amount.toFixed(2)),
    currency: 'GBP',
    merchant_code: process.env.SUMUP_MERCHANT_CODE!,
    redirect_url: redirectUrl || process.env.SITE_URL,
    description: 'Supreme Leather Restorations payment'
  };
  if (reference) payload.checkout_reference = reference;

  const r = await fetch('https://api.sumup.com/v0.1/checkouts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j));
  return j.checkout_url as string;
}
