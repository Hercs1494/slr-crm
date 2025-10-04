import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

function pence(gbp: number) { return Math.round(gbp * 100); }

async function main() {
  console.log('Seeding demo data...');

  // Brand settings
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      brandName: process.env.BRAND_NAME || 'Supreme Leather Restorations',
      brandWebsite: process.env.BRAND_WEBSITE || 'https://example.com',
      brandPrimaryColor: process.env.BRAND_PRIMARY_COLOR || '#111827',
      brandLogoUrl: process.env.BRAND_LOGO_URL || 'https://via.placeholder.com/200x60?text=Logo',
      bookingsEmail: process.env.BOOKINGS_EMAIL || 'bookings@example.com'
    },
    create: {
      id: 1,
      brandName: process.env.BRAND_NAME || 'Supreme Leather Restorations',
      brandWebsite: process.env.BRAND_WEBSITE || 'https://example.com',
      brandPrimaryColor: process.env.BRAND_PRIMARY_COLOR || '#111827',
      brandLogoUrl: process.env.BRAND_LOGO_URL || 'https://via.placeholder.com/200x60?text=Logo',
      bookingsEmail: process.env.BOOKINGS_EMAIL || 'bookings@example.com'
    }
  });

  // Customers
  const customers = await prisma.$transaction([
    prisma.customer.create({ data: { firstName: 'Alice', lastName: 'Barker', email: 'alice@example.com', phone: '+447700900001', postcode: 'SW1A 1AA' } }),
    prisma.customer.create({ data: { firstName: 'Ben', lastName: 'Cole', email: 'ben@example.com', phone: '+447700900002', postcode: 'M1 1AE' } }),
    prisma.customer.create({ data: { firstName: 'Chloe', lastName: 'Davies', email: 'chloe@example.com', phone: '+447700900003', postcode: 'BS1 4ST' } }),
  ]);

  // Quotes + items
  const q1 = await prisma.quote.create({
    data: {
      customerId: customers[0].id,
      status: 'sent',
      items: {
        create: [
          { title: 'Clean & Re-dye Small Sofa', qty: 1, unitPence: pence(180), type: 'task', taxRate: 2000 },
          { title: 'Parking Fee Estimate', qty: 1, unitPence: pence(12), type: 'fee', taxRate: 2000 },
          { title: 'Call-out Fee', qty: 1, unitPence: pence(25), type: 'fee', taxRate: 2000 },
        ]
      }
    },
    include: { items: true }
  });

  const q2 = await prisma.quote.create({
    data: {
      customerId: customers[1].id,
      status: 'draft',
      items: {
        create: [
          { title: 'Leather Chair Repair', qty: 2, unitPence: pence(85), type: 'task', taxRate: 2000 },
        ]
      }
    },
    include: { items: true }
  });

  // Jobs + appointments
  const job1 = await prisma.job.create({
    data: {
      customerId: customers[0].id,
      quoteId: q1.id,
      status: 'scheduled',
      appointments: {
        create: [{
          startAt: new Date(Date.now() + 8 * 24 * 3600 * 1000), // 8 days from now
          endAt: new Date(Date.now() + 8 * 24 * 3600 * 1000 + 2 * 3600 * 1000),
          location: 'Customer address'
        }]
      }
    }
  });

  const job2 = await prisma.job.create({
    data: {
      customerId: customers[2].id,
      status: 'scheduled',
      appointments: {
        create: [{
          startAt: new Date(Date.now() + 25 * 3600 * 1000), // ~25 hours from now
          endAt: new Date(Date.now() + 27 * 3600 * 1000),
          location: 'Workshop'
        }]
      }
    }
  });

  console.log('Seed complete.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
