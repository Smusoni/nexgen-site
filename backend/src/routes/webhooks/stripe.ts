import { Router, Request, Response } from 'express';
import express from 'express';
import { stripe } from '../../lib/stripe';
import { config } from '../../config';
import { confirmBooking, cancelBookingBySession } from '../../services/bookingService';

const router = Router();

router.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    let event;
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
          const session = event.data.object as {
            id: string;
            payment_intent?: string | { id: string } | null;
          };
          await confirmBooking(session.id, session.payment_intent ?? null);
          break;
        }
        case 'checkout.session.expired': {
          const session = event.data.object as any;
          await cancelBookingBySession(session.id);
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
