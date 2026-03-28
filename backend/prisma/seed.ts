import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@nexgen.com';
  const password = process.env.ADMIN_PASSWORD || 'changeme123';

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (!existing) {
    const hash = await bcrypt.hash(password, 12);
    await prisma.admin.create({
      data: { email, passwordHash: hash, role: 'admin' },
    });
    console.log(`Admin created: ${email}`);
  } else {
    console.log(`Admin already exists: ${email}`);
  }

  const services = [
    { code: '1on1', name: '1-on-1 Session', priceCents: 11000, isGroup: false, defaultCapacity: 1 },
    { code: 'group2', name: 'Group Session (2 players)', priceCents: 6500, isGroup: true, defaultCapacity: 2 },
    { code: 'group34', name: 'Group Session (3–4 players)', priceCents: 5000, isGroup: true, defaultCapacity: 4 },
    { code: 'group56', name: 'Group Session (5–6 players)', priceCents: 4000, isGroup: true, defaultCapacity: 6 },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { code: svc.code },
      update: {
        name: svc.name,
        priceCents: svc.priceCents,
        isGroup: svc.isGroup,
        defaultCapacity: svc.defaultCapacity,
        active: true,
      },
      create: svc,
    });
    console.log(`Service upserted: ${svc.code}`);
  }

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
