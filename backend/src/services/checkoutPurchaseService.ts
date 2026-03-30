import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { stripe } from '../lib/stripe';
import {
  sendAdminAnalysisPurchaseEmail,
  sendAdminMembershipStartedEmail,
} from './emailService';

function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const end = sub.items?.data?.[0]?.current_period_end;
  if (typeof end === 'number') {
    return new Date(end * 1000);
  }
  return null;
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (typeof pi === 'string') return pi;
  if (pi && typeof pi === 'object' && 'id' in pi) return (pi as { id: string }).id;
  return null;
}

export async function handleAnalysisCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') {
    console.warn('[checkout] analysis session not paid', session.id, session.payment_status);
    return;
  }
  const meta = session.metadata || {};
  const pack = meta.pack || 'single';
  const email =
    session.customer_details?.email || session.customer_email || '';
  const name = meta.customerName || '';
  const amount = session.amount_total ?? 0;

  await prisma.analysisPurchase.upsert({
    where: { stripeCheckoutSessionId: session.id },
    create: {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId(session),
      customerEmail: email,
      customerName: name,
      pack,
      amountCents: amount,
    },
    update: {
      stripePaymentIntentId: paymentIntentId(session),
    },
  });

  const row = await prisma.analysisPurchase.findUnique({
    where: { stripeCheckoutSessionId: session.id },
  });
  if (row) {
    void sendAdminAnalysisPurchaseEmail(row).catch((err) =>
      console.error('Admin analysis email failed:', err),
    );
  }
}

export async function handleMembershipCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.status !== 'complete') {
    console.warn('[checkout] membership session not complete', session.id, session.status);
    return;
  }
  const subId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription && typeof session.subscription === 'object'
        ? (session.subscription as { id: string }).id
        : null;
  if (!subId) {
    console.error('[checkout] membership session missing subscription', session.id);
    return;
  }

  const sub = await stripe.subscriptions.retrieve(subId, {
    expand: ['items.data'],
  });
  const meta = session.metadata || {};
  const plan = meta.plan || 'weekly';
  const email =
    session.customer_details?.email || session.customer_email || '';
  const name = meta.customerName || '';
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  const periodEnd = subscriptionPeriodEnd(sub);

  await prisma.membershipSubscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      customerEmail: email,
      customerName: name,
      plan,
      status: sub.status,
      currentPeriodEnd: periodEnd,
    },
    update: {
      status: sub.status,
      currentPeriodEnd: periodEnd,
      customerEmail: email,
    },
  });

  const row = await prisma.membershipSubscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
  });
  if (row) {
    void sendAdminMembershipStartedEmail(row).catch((err) =>
      console.error('Admin membership email failed:', err),
    );
  }
}

export async function syncMembershipFromStripeSubscription(sub: Stripe.Subscription) {
  const row = await prisma.membershipSubscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
  });
  if (!row) {
    return;
  }
  const periodEnd = subscriptionPeriodEnd(sub);
  await prisma.membershipSubscription.update({
    where: { stripeSubscriptionId: sub.id },
    data: {
      status: sub.status,
      currentPeriodEnd: periodEnd,
    },
  });
}
