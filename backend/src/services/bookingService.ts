import { prisma } from '../lib/prisma';
import { config } from '../config';
import { Prisma } from '@prisma/client';
import { sendAdminBookingConfirmedEmail } from './emailService';

export async function getRemainingCapacity(slotId: string): Promise<number> {
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { service: true },
  });

  if (!slot) throw new Error('Slot not found');

  const capacity = slot.capacityOverride ?? slot.service.defaultCapacity;

  const takenSeats = await prisma.booking.aggregate({
    where: {
      slotId,
      status: { in: ['pending_payment', 'confirmed'] },
    },
    _sum: { seats: true },
  });

  return capacity - (takenSeats._sum.seats || 0);
}

export interface CreateBookingInput {
  slotId: string;
  serviceId: string;
  playerName: string;
  email: string;
  phone?: string;
  notes?: string;
  seats?: number;
}

/**
 * Race-safe booking creation using a serializable transaction.
 * Reserves seats atomically, returns the pending booking.
 */
export async function createPendingBooking(input: CreateBookingInput) {
  const seats = input.seats || 1;

  return prisma.$transaction(async (tx) => {
    const slot = await tx.slot.findUnique({
      where: { id: input.slotId },
      include: { service: true },
    });

    if (!slot || slot.status !== 'open') {
      throw Object.assign(new Error('Slot is not available'), { status: 400 });
    }

    if (slot.serviceId !== input.serviceId) {
      throw Object.assign(new Error('Slot does not belong to this service'), { status: 400 });
    }

    const capacity = slot.capacityOverride ?? slot.service.defaultCapacity;

    const takenSeats = await tx.booking.aggregate({
      where: {
        slotId: input.slotId,
        status: { in: ['pending_payment', 'confirmed'] },
      },
      _sum: { seats: true },
    });

    const remaining = capacity - (takenSeats._sum.seats || 0);

    if (seats > remaining) {
      throw Object.assign(
        new Error(`Not enough capacity. ${remaining} seat(s) remaining.`),
        { status: 409 },
      );
    }

    const expiresAt = new Date(Date.now() + config.bookingExpirationMinutes * 60 * 1000);

    return tx.booking.create({
      data: {
        slotId: input.slotId,
        serviceId: input.serviceId,
        playerName: input.playerName,
        email: input.email,
        phone: input.phone || '',
        notes: input.notes || '',
        seats,
        status: 'pending_payment',
        expiresAt,
      },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function confirmBooking(stripeSessionId: string, paymentIntentId: string | { id?: string } | null) {
  const booking = await prisma.booking.findUnique({
    where: { stripeCheckoutSessionId: stripeSessionId },
    include: { service: true },
  });

  if (!booking) {
    console.warn(`No booking found for session ${stripeSessionId}`);
    return null;
  }

  if (booking.status === 'confirmed') {
    return booking;
  }

  const piId =
    typeof paymentIntentId === 'string'
      ? paymentIntentId
      : paymentIntentId && typeof paymentIntentId === 'object' && 'id' in paymentIntentId
        ? String((paymentIntentId as { id: string }).id)
        : '';

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'confirmed',
      stripePaymentIntentId: piId || booking.stripePaymentIntentId,
      expiresAt: null,
    },
  });

  const existingPay = await prisma.payment.findFirst({
    where: { bookingId: booking.id, status: 'succeeded' },
  });
  if (!existingPay) {
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amountCents: booking.service.priceCents * booking.seats,
        currency: 'usd',
        provider: 'stripe',
        providerRef: piId || undefined,
        status: 'succeeded',
        paidAt: new Date(),
      },
    });

    const details = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { service: true, slot: true },
    });
    if (details) {
      void sendAdminBookingConfirmedEmail(details).catch((err) =>
        console.error('Admin booking email failed:', err),
      );
    }
  }

  return updated;
}

export async function cancelBookingBySession(stripeSessionId: string) {
  const booking = await prisma.booking.findUnique({
    where: { stripeCheckoutSessionId: stripeSessionId },
  });

  if (!booking || booking.status !== 'pending_payment') return null;

  return prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'cancelled', expiresAt: null },
  });
}

export async function expirePendingBookings() {
  const result = await prisma.booking.updateMany({
    where: {
      status: 'pending_payment',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  });

  if (result.count > 0) {
    console.log(`Expired ${result.count} pending booking(s)`);
  }

  return result.count;
}
