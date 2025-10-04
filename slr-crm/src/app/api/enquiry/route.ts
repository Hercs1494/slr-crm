import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitOrFallback } from '@/lib/rate-limit-redis';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req as any);
  if (!(await rateLimitOrFallback(ip, '/api/enquiry', 20))) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  const form = await req.formData().catch(() => null);
  const body:any = form ? Object.fromEntries(form.entries()) : await req.json();

  const { first_name, last_name, email, phone, postcode, description } = body;
  if (!first_name || !last_name || !email || !phone || !postcode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      firstName: String(first_name),
      lastName: String(last_name),
      email: String(email),
      phone: String(phone),
      postcode: String(postcode)
    }
  });

  const enquiry = await prisma.enquiry.create({
    data: { customerId: customer.id, description: String(description || '') }
  });

  return NextResponse.json({ customer, enquiry, draft_quote_id: null });
}
