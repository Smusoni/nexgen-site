import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { serviceCode, date } = req.query;

  const where: any = { status: 'open' };

  if (serviceCode) {
    const service = await prisma.service.findUnique({
      where: { code: serviceCode as string },
    });
    if (!service) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }
    where.serviceId = service.id;
  }

  if (date) {
    const dayStart = new Date((date as string) + 'T00:00:00Z');
    const dayEnd = new Date((date as string) + 'T23:59:59.999Z');
    where.startAt = { gte: dayStart, lte: dayEnd };
  } else {
    where.startAt = { gte: new Date() };
  }

  const slots = await prisma.slot.findMany({
    where,
    include: {
      service: { select: { id: true, code: true, name: true, priceCents: true, isGroup: true, defaultCapacity: true } },
      bookings: {
        where: { status: { in: ['pending_payment', 'confirmed'] } },
        select: { seats: true },
      },
    },
    orderBy: { startAt: 'asc' },
  });

  const result = slots.map((slot) => {
    const capacity = slot.capacityOverride ?? slot.service.defaultCapacity;
    const takenSeats = slot.bookings.reduce((sum, b) => sum + b.seats, 0);
    return {
      id: slot.id,
      serviceId: slot.serviceId,
      service: slot.service,
      startAt: slot.startAt,
      endAt: slot.endAt,
      capacity,
      remainingSeats: capacity - takenSeats,
    };
  }).filter((s) => s.remainingSeats > 0);

  res.json(result);
});

export { router as slotsRouter };
