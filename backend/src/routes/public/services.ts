import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

function isDatabaseUnreachable(err: unknown): boolean {
  const e = err as { code?: string; message?: string; cause?: { code?: string } };
  const code = e?.code ?? e?.cause?.code;
  const msg = (e?.message || '').toLowerCase();
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') return true;
  // Prisma: P1001 = can't reach DB, P1017 = server closed connection
  if (code === 'P1001' || code === 'P1017') return true;
  if (msg.includes("can't reach database") || msg.includes("connection refused")) return true;
  return false;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { priceCents: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        priceCents: true,
        isGroup: true,
        defaultCapacity: true,
      },
    });
    res.json(services);
  } catch (err) {
    if (isDatabaseUnreachable(err)) {
      res.status(503).json({
        code: 'DATABASE_UNAVAILABLE',
        error:
          'PostgreSQL is not running or DATABASE_URL is wrong. From the repo root try: docker compose up -d, then in backend: npx prisma migrate deploy && npm run db:seed. See README.',
      });
      return;
    }
    console.error('[public/services]', err);
    res.status(500).json({ code: 'INTERNAL', error: 'Could not load services.' });
  }
});

export { router as servicesRouter };
