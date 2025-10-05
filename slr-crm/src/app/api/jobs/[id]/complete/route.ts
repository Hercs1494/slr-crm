import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/api-auth';

import { prisma } from '../../../../../lib/db';
import { sendEmail } from '../../../../../lib/notifications';

\1
  if (!requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const jobId = params.id;
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { customer: true, quote: true } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  await prisma.job.update({ where: { id: jobId }, data: { status: 'completed' } });

  const quote = job.quote;
  const finalInvoiceId = quote?.finalInvoiceId || quote?.quickfileInvoiceId;
  const to = job.customer.email;

  if (to && finalInvoiceId) {
    const html = `<p>Hi ${job.customer.firstName},</p>
<p>Your leather repair job has been completed. Your final invoice reference is <strong>#${finalInvoiceId}</strong>.</p>
<p>Please keep this reference for your records.</p>
<p>Thank you,<br/>Supreme Leather Restorations</p>`;
    await sendEmail(to, 'Final Invoice & Job Completion', html);
  }

  return NextResponse.json({ ok: true, finalInvoiceId });
}
