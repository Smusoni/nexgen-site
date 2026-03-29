import Stripe from 'stripe';
import { stripe, stripeSecretConfigured } from '../lib/stripe';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import type { Booking, Service } from '@prisma/client';

function toUserMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'type' in err) {
    const se = err as Stripe.errors.StripeError;
    if (se.type === 'StripeAuthenticationError') {
      return 'Stripe rejected the API key. In Render set STRIPE_SECRET_KEY to your Secret key (sk_test_... or sk_live_...) from Dashboard → Developers → API keys, then redeploy.';
    }
    if (se.type === 'StripeConnectionError' || se.code === 'api_connection_error') {
      return 'Could not reach Stripe (network). Check https://status.stripe.com and try again in a minute.';
    }
    if (se.message) return se.message;
  }
  if (err instanceof Error) return err.message;
  return 'Payment service error';
}

export async function createCheckoutSession(
  booking: Booking & { service: Service },
) {
  if (!stripeSecretConfigured) {
    const e = new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY on your host (e.g. Render) to your Stripe Secret key and redeploy.',
    );
    (e as any).status = 503;
    throw e;
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
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
  } catch (err) {
    console.error('[stripe] checkout.sessions.create failed', err);
    const e = new Error(toUserMessage(err));
    (e as any).status = 502;
    throw e;
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return session;
}
