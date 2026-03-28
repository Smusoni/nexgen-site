import { stripe } from '../lib/stripe';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import type { Booking, Service } from '@prisma/client';

export async function createCheckoutSession(
  booking: Booking & { service: Service },
) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: booking.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: booking.service.priceCents,
          product_data: {
            name: booking.service.name,
            description: `Booking for ${booking.playerName} — ${booking.seats} seat(s)`,
          },
        },
        quantity: booking.seats,
      },
    ],
    metadata: {
      bookingId: booking.id,
    },
    success_url: `${config.frontendUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontendUrl}/book.html?cancelled=true`,
    expires_at: Math.floor(Date.now() / 1000) + config.bookingExpirationMinutes * 60,
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return session;
}
