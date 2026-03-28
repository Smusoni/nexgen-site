import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { createPendingBooking } from '../../services/bookingService';
import { createCheckoutSession } from '../../services/stripeService';
import { validate } from '../../middleware/validate';
import rateLimit from 'express-rate-limit';

const router = Router();

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many booking attempts. Please wait a moment.' },
});

router.post(
  '/checkout',
  checkoutLimiter,
  validate([
    { field: 'slotId', required: true, type: 'string' },
    { field: 'serviceId', required: true, type: 'string' },
    { field: 'playerName', required: true, type: 'string', minLength: 2 },
    { field: 'email', required: true, type: 'email' },
  ]),
  async (req: Request, res: Response) => {
    let pendingId: string | null = null;
    try {
      const { slotId, serviceId, playerName, email, phone, notes, seats } = req.body;

      const booking = await createPendingBooking({
        slotId,
        serviceId,
        playerName,
        email,
        phone,
        notes,
        seats: seats || 1,
      });
      pendingId = booking.id;

      const bookingWithService = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: { service: true },
      });

      const session = await createCheckoutSession(bookingWithService!);

      res.json({
        bookingId: booking.id,
        checkoutUrl: session.url,
      });
    } catch (err: any) {
      if (pendingId) {
        await prisma.booking.updateMany({
          where: { id: pendingId, status: 'pending_payment' },
          data: { status: 'cancelled', expiresAt: null },
        });
      }
      const status = err.status || 500;
      res.status(status).json({ error: err.message });
    }
  },
);

router.get('/session/:sessionId', async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const booking = await prisma.booking.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    include: {
      service: { select: { name: true, code: true } },
      slot: { select: { startAt: true, endAt: true } },
    },
  });

  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  res.json({
    id: booking.id,
    playerName: booking.playerName,
    email: booking.email,
    seats: booking.seats,
    status: booking.status,
    service: booking.service,
    slot: booking.slot,
    createdAt: booking.createdAt,
  });
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      service: { select: { name: true, code: true } },
      slot: { select: { startAt: true, endAt: true } },
    },
  });

  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  res.json({
    id: booking.id,
    playerName: booking.playerName,
    email: booking.email,
    seats: booking.seats,
    status: booking.status,
    service: booking.service,
    slot: booking.slot,
    createdAt: booking.createdAt,
  });
});

export { router as bookingsRouter };
