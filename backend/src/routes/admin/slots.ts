import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { serviceId, date, status } = req.query;
  const where: any = {};

  if (serviceId) where.serviceId = serviceId;
  if (status) where.status = status;

  if (date) {
    const dayStart = new Date((date as string) + 'T00:00:00Z');
    const dayEnd = new Date((date as string) + 'T23:59:59.999Z');
    where.startAt = { gte: dayStart, lte: dayEnd };
  }

  const slots = await prisma.slot.findMany({
    where,
    include: {
      service: { select: { name: true, code: true, defaultCapacity: true } },
      bookings: {
        where: { status: { in: ['pending_payment', 'confirmed'] } },
        select: { id: true, playerName: true, email: true, seats: true, status: true },
      },
    },
    orderBy: { startAt: 'asc' },
  });

  const result = slots.map((slot) => {
    const capacity = slot.capacityOverride ?? slot.service.defaultCapacity;
    const takenSeats = slot.bookings.reduce((sum, b) => sum + b.seats, 0);
    return { ...slot, capacity, takenSeats, remainingSeats: capacity - takenSeats };
  });

  res.json(result);
});

router.post('/', async (req: Request, res: Response) => {
  const { serviceId, startAt, endAt, capacityOverride } = req.body;
  if (!serviceId || !startAt || !endAt) {
    res.status(400).json({ error: 'serviceId, startAt, and endAt are required' });
    return;
  }

  const slot = await prisma.slot.create({
    data: {
      serviceId,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      capacityOverride: capacityOverride ?? null,
    },
  });
  res.status(201).json(slot);
});

router.post('/bulk', async (req: Request, res: Response) => {
  const { serviceId, slots: slotDefs } = req.body;
  if (!serviceId || !Array.isArray(slotDefs) || slotDefs.length === 0) {
    res.status(400).json({ error: 'serviceId and slots array are required' });
    return;
  }

  const created = await prisma.slot.createMany({
    data: slotDefs.map((s: any) => ({
      serviceId,
      startAt: new Date(s.startAt),
      endAt: new Date(s.endAt),
      capacityOverride: s.capacityOverride ?? null,
    })),
  });
  res.status(201).json({ count: created.count });
});

router.put('/:id', async (req: Request, res: Response) => {
  const { startAt, endAt, capacityOverride, status } = req.body;

  const slot = await prisma.slot.update({
    where: { id: String(req.params.id) },
    data: {
      ...(startAt && { startAt: new Date(startAt) }),
      ...(endAt && { endAt: new Date(endAt) }),
      ...(capacityOverride !== undefined && { capacityOverride }),
      ...(status && { status }),
    },
  });
  res.json(slot);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.slot.update({
    where: { id: String(req.params.id) },
    data: { status: 'cancelled' },
  });
  res.json({ ok: true });
});

export { router as adminSlotsRouter };
