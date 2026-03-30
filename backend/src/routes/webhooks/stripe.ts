import { Router, Request, Response } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { stripe } from '../../lib/stripe';
import { config } from '../../config';
import { confirmBooking, cancelBookingBySession } from '../../services/bookingService';
import {
  handleAnalysisCheckoutCompleted,
  handleMembershipCheckoutCompleted,
  syncMembershipFromStripeSubscription,
} from '../../services/checkoutPurchaseService';

const router = Router();

router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const meta = session.metadata || {};
          if (meta.bookingId) {
            await confirmBooking(session.id, session.payment_intent ?? null);
          } else if (meta.checkoutKind === 'analysis') {
            await handleAnalysisCheckoutCompleted(session);
          } else if (meta.checkoutKind === 'membership') {
            await handleMembershipCheckoutCompleted(session);
          }
          break;
        }
        case 'checkout.session.expired': {
          const session = event.data.object as Stripe.Checkout.Session;
          const meta = session.metadata || {};
          if (meta.bookingId) {
            await cancelBookingBySession(session.id);
          }
          break;
        }
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          await syncMembershipFromStripeSubscription(sub);
          break;
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          await syncMembershipFromStripeSubscription(sub);
          break;
        }
        default:
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error('Webhook processing error:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },
);

export { router as webhookRouter };
