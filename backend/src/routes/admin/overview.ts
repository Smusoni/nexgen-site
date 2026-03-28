import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const todayStart = new Date(todayStr + 'T00:00:00Z');
  const todayEnd = new Date(todayStr + 'T23:59:59.999Z');

  const [todayBookings, totalRevenue, totalBookings, recentBookings] = await Promise.all([
    prisma.booking.count({
      where: {
        status: 'confirmed',
        slot: { startAt: { gte: todayStart, lte: todayEnd } },
      },
    }),
    prisma.payment.aggregate({
      where: { status: 'succeeded' },
      _sum: { amountCents: true },
    }),
    prisma.booking.count({ where: { status: 'confirmed' } }),
    prisma.booking.findMany({
      where: { status: 'confirmed' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        service: { select: { name: true, code: true } },
        slot: { select: { startAt: true, endAt: true } },
      },
    }),
  ]);

  res.json({
    todayBookings,
    totalRevenue: totalRevenue._sum.amountCents || 0,
    totalBookings,
    recentBookings,
  });
});

export { router as overviewRouter };
