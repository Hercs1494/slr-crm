import { Client, type CreatePaymentLinkResponse } from 'square';

type Item = { title: string; qty: number; unitPence: number; taxRate?: number };

export async function createSquareLink(items: Item[], redirectUrl?: string, reference?: string) {
  const client = new Client({ accessToken: process.env.SQUARE_TOKEN!, environment: 'production' });
  const locationId = process.env.SQUARE_LOCATION_ID!;

  const lineItems = items.map((it) => ({
    name: it.title,
    quantity: String(it.qty || 1),
    basePriceMoney: { amount: BigInt(it.unitPence), currency: 'GBP' },
  }));

  const order: any = {
    locationId,
    lineItems,
    referenceId: reference || undefined
  };

  const res: CreatePaymentLinkResponse = await client.checkoutApi.createPaymentLink({
    idempotencyKey: crypto.randomUUID(),
    order,
    checkoutOptions: { redirectUrl: redirectUrl || process.env.SITE_URL },
  } as any);

  if ((res as any).errors) throw new Error(JSON.stringify((res as any).errors));
  return (res as any).paymentLink?.url as string;
}
