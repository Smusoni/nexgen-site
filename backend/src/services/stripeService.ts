import Stripe from 'stripe';
import { stripe, stripeSecretConfigured } from '../lib/stripe';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import type { Booking, Service } from '@prisma/client';

const ANALYSIS_PACKS = {
  single: {
    amount: 12500,
    title: 'Game video analysis — single match',
    description:
      'Video clips, tactical feedback, development points, and written breakdown of key moments.',
  },
  pack3: {
    amount: 40000,
    title: 'Game video analysis — 3-match pack',
    description: 'Three full analyses (same deliverables as single game).',
  },
  pack5: {
    amount: 60000,
    title: 'Game video analysis — 5-match pack',
    description: 'Five full analyses (same deliverables as single game).',
  },
} as const;

const MEMBERSHIP_PLANS = {
  weekly: {
    amount: 30000,
    title: 'Monthly: Weekly Training + Film',
    description:
      '1 private session/week, 1 group session/week, 1 game analysis/month. Group pricing per published rates.',
  },
  intensive: {
    amount: 45000,
    title: 'Monthly: Intensive Training + Film',
    description:
      '2 private sessions/week, 1 group session/week, 2 game analyses/month. Group pricing per published rates.',
  },
} as const;

export type AnalysisPack = keyof typeof ANALYSIS_PACKS;
export type MembershipPlan = keyof typeof MEMBERSHIP_PLANS;

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
      // Stripe: expires_at must be at least 30 minutes from now (API error if shorter).
      expires_at:
        Math.floor(Date.now() / 1000) + Math.max(30, config.bookingExpirationMinutes) * 60,
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

export async function createAnalysisCheckoutSession(input: {
  pack: AnalysisPack;
  email: string;
  name: string;
}): Promise<Stripe.Checkout.Session> {
  if (!stripeSecretConfigured) {
    const e = new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY on your host and redeploy.',
    );
    (e as any).status = 503;
    throw e;
  }
  const packDef = ANALYSIS_PACKS[input.pack];
  if (!packDef) {
    const e = new Error('Invalid analysis pack');
    (e as any).status = 400;
    throw e;
  }
  const nameTrim = input.name.trim().slice(0, 200);
  const expires =
    Math.floor(Date.now() / 1000) + Math.max(30, config.bookingExpirationMinutes) * 60;

  try {
    return await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: input.email.trim(),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: packDef.amount,
            product_data: {
              name: packDef.title,
              description: packDef.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        checkoutKind: 'analysis',
        pack: input.pack,
        customerName: nameTrim,
      },
      success_url: `${config.frontendUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&kind=analysis`,
      cancel_url: `${config.frontendUrl}/pay.html?kind=analysis&pack=${encodeURIComponent(input.pack)}&cancelled=1`,
      expires_at: expires,
    });
  } catch (err) {
    console.error('[stripe] analysis checkout failed', err);
    const e = new Error(toUserMessage(err));
    (e as any).status = 502;
    throw e;
  }
}

export async function createMembershipCheckoutSession(input: {
  plan: MembershipPlan;
  email: string;
  name: string;
}): Promise<Stripe.Checkout.Session> {
  if (!stripeSecretConfigured) {
    const e = new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY on your host and redeploy.',
    );
    (e as any).status = 503;
    throw e;
  }
  const planDef = MEMBERSHIP_PLANS[input.plan];
  if (!planDef) {
    const e = new Error('Invalid membership plan');
    (e as any).status = 400;
    throw e;
  }
  const nameTrim = input.name.trim().slice(0, 200);
  const expires =
    Math.floor(Date.now() / 1000) + Math.max(30, config.bookingExpirationMinutes) * 60;

  try {
    return await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: input.email.trim(),
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: planDef.amount,
            recurring: { interval: 'month' },
            product_data: {
              name: planDef.title,
              description: planDef.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        checkoutKind: 'membership',
        plan: input.plan,
        customerName: nameTrim,
      },
      subscription_data: {
        metadata: {
          checkoutKind: 'membership',
          plan: input.plan,
        },
      },
      success_url: `${config.frontendUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&kind=membership`,
      cancel_url: `${config.frontendUrl}/pay.html?kind=membership&plan=${encodeURIComponent(input.plan)}&cancelled=1`,
      expires_at: expires,
    });
  } catch (err) {
    console.error('[stripe] membership checkout failed', err);
    const e = new Error(toUserMessage(err));
    (e as any).status = 502;
    throw e;
  }
}
