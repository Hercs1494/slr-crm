const QF_APP_ID = process.env.QUICKFILE_APPLICATION_ID!;
const QF_KEY = process.env.QUICKFILE_API_KEY!;
const QF_ACC_NO = process.env.QUICKFILE_ACCOUNT_NUMBER!;

function buildAuth() {
  return {
    AccountNumber: QF_ACC_NO,
    ApplicationID: QF_APP_ID,
    APIKey: QF_KEY,
  };
}

async function qfCall(endpoint: string, body: any) {
  const payload = {
    Header: { MessageType: 'Request', Authentication: buildAuth() },
    Body: body,
  };
  const res = await fetch(`https://api.quickfile.co.uk/1_2/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await res.json();
  if (!res.ok || j?.Header?.MessageType === 'Error') throw new Error(JSON.stringify(j));
  return j;
}

export type QFLineItem = { Description: string; Quantity: number; UnitCost: number; VatRate?: number };

export async function ensureClient({ companyName, contactName, email }: { companyName: string; contactName?: string; email?: string; }) {
  const body = {
    Client_Create: {
      Client: {
        CompanyName: companyName,
        ContactName: contactName,
        EmailAddress: email,
      },
    },
  };
  const j = await qfCall('client/create', body);
  const id = j?.Body?.Client_Create?.ClientID || j?.Body?.Client_Create?.Client_Id;
  return id;
}

export async function createInvoice(clientId: number, lineItems: QFLineItem[], notes?: string) {
  const body = {
    Invoice_Create: {
      InvoiceData: {
        ClientID: clientId,
        InvoiceLines: lineItems.map(li => ({
          Description: li.Description,
          Qty: li.Quantity,
          UnitCost: li.UnitCost,
          VatRate: li.VatRate ?? 20,
        })),
        Terms: notes || 'Thank you for your business.',
      },
    },
  };
  const j = await qfCall('invoice/create', body);
  const invId = j?.Body?.Invoice_Create?.InvoiceID;
  return invId;
}

export async function logPayment(invoiceId: number, amount: number, method: string, ref?: string) {
  const body = {
    Payment_Create: {
      Payment: {
        Amount: amount,
        Currency: 'GBP',
        PaidInFull: true,
        From: 'Client',
        Method: method,
        InvoiceID: invoiceId,
        Reference: ref || 'Card',
      },
    },
  };
  const j = await qfCall('payment/create', body);
  return j;
}


export async function createBalanceInvoice(clientId: number, quote: any, bookingPercent: number = 20) {
  // Compute remaining percentage
  const subtotalPence = quote.items.reduce((acc: number, i: any) => acc + (i.unitPence * i.qty), 0);
  const remainingPct = 100 - bookingPercent;
  const balancePence = Math.round(subtotalPence * (remainingPct / 100));

  const bodyLine = {
    Description: `Balance (${remainingPct}%) for Quote ${quote.id}`,
    Quantity: 1,
    UnitCost: balancePence / 100,
    VatRate: 20
  };
  const j = await createInvoice(clientId, [bodyLine], 'Balance invoice due upon completion.');
  return j;
}


/** Fetch a QuickFile invoice by id; returns { number, issueDate } when available. */
export async function getInvoiceDetails(invoiceId: number): Promise<{ number?: string; issueDate?: string } | null> {
  const key = process.env.QUICKFILE_API_KEY!;
  const appId = process.env.QUICKFILE_APPLICATION_ID!;
  const accNo = process.env.QUICKFILE_ACCOUNT_NUMBER!;
  if (!key || !appId || !accNo) return null;

  const body = {
    payload: {
      Header: { MessageType: 'Request', SubmissionNumber: Date.now() },
      Body: {
        getInvoice: {
          AccountNumber: accNo,
          InvoiceID: invoiceId
        }
      }
    },
    apiKey: key,
    applicationId: appId
  };

  try {
    const r = await fetch('https://api.quickfile.co.uk/1_2/invoices/get', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    // Normalise (schema varies); try to extract number and date if present
    const inv = j?.payload?.Body?.getInvoice?.InvoiceData || j?.payload?.Body?.Invoice || j?.Invoice || null;
    if (!inv) return null;
    return {
      number: inv.InvoiceNumber || inv.InvoiceNo || inv.Number || undefined,
      issueDate: inv.IssueDate || inv.Date || undefined
    };
  } catch {
    return null;
  }
}
