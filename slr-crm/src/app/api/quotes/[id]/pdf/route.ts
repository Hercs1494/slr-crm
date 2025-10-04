import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitOrFallback } from '@/lib/rate-limit-redis';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/sign';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function gbp(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((pence||0)/100);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = getClientIp(req as any);
  if (!(await rateLimitOrFallback(ip, '/api/quotes/pdf', 60))) return new NextResponse('Too Many Requests', { status: 429 });
  const { searchParams } = new URL(req.url);
  const t = searchParams.get('t') || '';
  if (!verifyToken(t, params.id)) return new NextResponse('Forbidden', { status: 403 });

  const q = await prisma.quote.findUnique({ where: { id: params.id }, include: { items: true, customer: true } });
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!q) return new NextResponse('Not Found', { status: 404 });

  const pdf = await PDFDocument.create();

  const brand = (settings?.brandName || process.env.BRAND_NAME) || 'Supreme Leather Restorations';
  const site = (settings?.brandWebsite || process.env.BRAND_WEBSITE) || '';
  const primary = (settings?.brandPrimaryColor || process.env.BRAND_PRIMARY_COLOR) || '#111827';
  const logoUrl = (settings?.brandLogoUrl || process.env.BRAND_LOGO_URL) || '';

  function hexToRgb(hex: string) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)!;
    return { r: parseInt(m[1],16)/255, g: parseInt(m[2],16)/255, b: parseInt(m[3],16)/255 };
  }

  const page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const brand = (settings?.brandName || process.env.BRAND_NAME) || 'Supreme Leather Restorations';
  const site = (settings?.brandWebsite || process.env.BRAND_WEBSITE) || '';

  let y = 800;
  // Header bar
  const c = hexToRgb(primary);
  page.drawRectangle({ x: 0, y: 780, width: 595.28, height: 40, color: rgb(c.r, c.g, c.b) });
  page.drawText(brand, { x: 50, y: 792, size: 16, font: bold, color: rgb(1,1,1) });
  if (site) page.drawText(site, { x: 50, y: 778, size: 9, font, color: rgb(1,1,1) });
  // Optional logo
  try {
    if (logoUrl) {
      const res = await fetch(logoUrl);
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        const img = await pdf.embedPng(buf).catch(async () => await pdf.embedJpg(buf));
        const iw = img.width, ih = img.height;
        const targetH = 28; const scale = targetH / ih; const targetW = iw * scale;
        page.drawImage(img, { x: 595.28 - targetW - 20, y: 786, width: targetW, height: targetH });
      }
    }
  } catch {}

  
  

  y -= 80;
  page.drawText(`Quote #${q.id.slice(0,8)}`, { x: 50, y, size: 14, font: bold });
  y -= 18;
  page.drawText(`Customer: ${q.customer.firstName} ${q.customer.lastName}`, { x: 50, y, size: 10, font });

  y -= 24;
  page.drawText('Items', { x: 50, y, size: 12, font: bold });
  y -= 14;

  const colX = [50, 360, 430, 500];
  page.drawText('Description', { x: colX[0], y, size: 10, font: bold });
  page.drawText('Qty', { x: colX[1], y, size: 10, font: bold });
  page.drawText('Unit', { x: colX[2], y, size: 10, font: bold });
  page.drawText('Line', { x: colX[3], y, size: 10, font: bold });
  y -= 12;

  let total = 0;
  for (const i of q.items) {
    const line = i.unitPence * i.qty;
    total += line;
    page.drawText(i.title, { x: colX[0], y, size: 10, font });
    page.drawText(String(i.qty), { x: colX[1], y, size: 10, font });
    page.drawText(gbp(i.unitPence), { x: colX[2], y, size: 10, font });
    page.drawText(gbp(line), { x: colX[3], y, size: 10, font });
    y -= 12;
    if (y < 80) break; // simple one-page
  }

  y -= 10;
  page.drawText('Total:', { x: 430, y, size: 12, font: bold });
  page.drawText(gbp(total), { x: 500, y, size: 12, font: bold });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="quote_${q.id.slice(0,8)}.pdf"`
    }
  });
}
