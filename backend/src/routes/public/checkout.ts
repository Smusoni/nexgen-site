import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { stripe, stripeSecretConfigured } from '../../lib/stripe';
import { validate } from '../../middleware/validate';
import {
  createAnalysisCheckoutSession,
  createMembershipCheckoutSession,
  type AnalysisPack,
  type MembershipPlan,
} from '../../services/stripeService';

const router = Router();

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: 'Too many checkout attempts. Please wait a moment.' },
});

const ANALYSIS_PACKS: AnalysisPack[] = ['single', 'pack3', 'pack5'];
const MEMBERSHIP_PLANS: MembershipPlan[] = ['weekly', 'intensive'];

router.post(
  '/analysis',
  checkoutLimiter,
  validate([
    { field: 'pack', required: true, type: 'string' },
    { field: 'email', required: true, type: 'email' },
    { field: 'name', required: true, type: 'string', minLength: 2 },
  ]),
  async (req: Request, res: Response) => {
    if (!stripeSecretConfigured) {
      res.status(503).json({ error: 'Payments are not configured.' });
      return;
    }
    const pack = req.body.pack as string;
    if (!ANALYSIS_PACKS.includes(pack as AnalysisPack)) {
      res.status(400).json({ error: 'Invalid pack. Use single, pack3, or pack5.' });
      return;
    }
    try {
      const session = await createAnalysisCheckoutSession({
        pack: pack as AnalysisPack,
        email: req.body.email,
        name: req.body.name,
      });
      res.json({ checkoutUrl: session.url });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({ error: err.message });
    }
  },
);

router.post(
  '/membership',
  checkoutLimiter,
  validate([
    { field: 'plan', required: true, type: 'string' },
    { field: 'email', required: true, type: 'email' },
    { field: 'name', required: true, type: 'string', minLength: 2 },
  ]),
  async (req: Request, res: Response) => {
    if (!stripeSecretConfigured) {
      res.status(503).json({ error: 'Payments are not configured.' });
      return;
    }
    const plan = req.body.plan as string;
    if (!MEMBERSHIP_PLANS.includes(plan as MembershipPlan)) {
      res.status(400).json({ error: 'Invalid plan. Use weekly or intensive.' });
      return;
    }
    try {
      const session = await createMembershipCheckoutSession({
        plan: plan as MembershipPlan,
        email: req.body.email,
        name: req.body.name,
      });
      res.json({ checkoutUrl: session.url });
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json({ error: err.message });
    }
  },
);

router.get('/verify/:sessionId', async (req: Request, res: Response) => {
  if (!stripeSecretConfigured) {
    res.status(503).json({ error: 'Payments are not configured.' });
    return;
  }
  const sessionId = req.params.sessionId as string;
  if (!sessionId || sessionId.length > 200) {
    res.status(400).json({ error: 'Invalid session id' });
    return;
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const meta = session.metadata || {};
    let kind: 'booking' | 'analysis' | 'membership' | 'unknown' = 'unknown';
    if (meta.bookingId) kind = 'booking';
    else if (meta.checkoutKind === 'analysis') kind = 'analysis';
    else if (meta.checkoutKind === 'membership') kind = 'membership';

    res.json({
      payment_status: session.payment_status,
      status: session.status,
      kind,
      pack: meta.pack || null,
      plan: meta.plan || null,
    });
  } catch (e: any) {
    if (e?.code === 'resource_missing') {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    console.error('[checkout/verify]', e);
    res.status(500).json({ error: 'Could not verify session' });
  }
});

export { router as checkoutRouter };
