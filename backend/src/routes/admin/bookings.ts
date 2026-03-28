import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { status, serviceId, date, page = '1', limit = '20' } = req.query;
  const where: any = {};

  if (status) where.status = status;
  if (serviceId) where.serviceId = serviceId;

  if (date) {
    const dayStart = new Date((date as string) + 'T00:00:00Z');
    const dayEnd = new Date((date as string) + 'T23:59:59.999Z');
    where.slot = { startAt: { gte: dayStart, lte: dayEnd } };
  }

  const take = Math.min(parseInt(limit as string, 10) || 20, 100);
  const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        service: { select: { name: true, code: true } },
        slot: { select: { startAt: true, endAt: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({ bookings, total, page: skip / take + 1, pages: Math.ceil(total / take) });
});

router.get('/:id', async (req: Request, res: Response) => {
  const booking = await prisma.booking.findUnique({
    where: { id: String(req.params.id) },
    include: {
      service: true,
      slot: true,
      payments: true,
    },
  });
  if (!booking) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(booking);
});

router.patch('/:id/cancel', async (req: Request, res: Response) => {
  const booking = await prisma.booking.findUnique({ where: { id: String(req.params.id) } });
  if (!booking) { res.status(404).json({ error: 'Not found' }); return; }

  if (booking.status === 'cancelled') {
    res.status(400).json({ error: 'Already cancelled' });
    return;
  }

  const updated = await prisma.booking.update({
    where: { id: String(req.params.id) },
    data: { status: 'cancelled', expiresAt: null },
  });
  res.json(updated);
});

export { router as adminBookingsRouter };
