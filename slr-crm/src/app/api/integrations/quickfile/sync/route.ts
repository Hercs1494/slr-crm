import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/api-auth';

import { ensureClient, createInvoice } from '../../../../../lib/quickfile';
import { prisma } from '../../../../../lib/db';

\1
  if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { customer, items, notes, quoteId } = await req.json();
  const clientId = await ensureClient({ companyName: `${customer.firstName} ${customer.lastName}`, contactName: `${customer.firstName} ${customer.lastName}`, email: customer.email });
  const lineItems = items.map((i: any) => ({ Description: i.title, Quantity: i.qty || 1, UnitCost: (i.unitPence || 0) / 100, VatRate: (i.taxRate ?? 2000) / 100 }));
  const invoiceId = await createInvoice(clientId, lineItems, notes);

  if (quoteId && invoiceId) {
    await prisma.quote.update({ where: { id: quoteId }, data: { quickfileInvoiceId: Number(invoiceId) } });
  }
  return NextResponse.json({ invoiceId });
}
