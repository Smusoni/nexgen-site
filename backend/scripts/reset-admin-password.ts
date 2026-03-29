/**
 * Reset admin password in production (Render Shell).
 *
 *   npx tsx scripts/reset-admin-password.ts you@email.com YourNewPassword
 *
 * Or set ADMIN_EMAIL + ADMIN_PASSWORD in env and run with no args.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function main() {
  const email =
    process.argv[2]?.trim() || process.env.ADMIN_EMAIL?.trim() || 'admin@nexgen.com';
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;

  if (!password || password.length < 6) {
    console.error(
      'Usage: npx tsx scripts/reset-admin-password.ts <email> <new-password>\n' +
        'Password must be at least 6 characters. Example:\n' +
        '  npx tsx scripts/reset-admin-password.ts admin@nexgen.com MyNewPass123',
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.admin.findUnique({ where: { email } });

  if (existing) {
    await prisma.admin.update({
      where: { email },
      data: { passwordHash },
    });
    console.log(`Updated password for ${email}`);
  } else {
    await prisma.admin.create({
      data: { email, passwordHash, role: 'admin' },
    });
    console.log(`Created admin ${email}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
