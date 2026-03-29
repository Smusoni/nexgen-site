import Stripe from 'stripe';
import { config } from '../config';

const raw = (config.stripe.secretKey || '')
  .trim()
  .replace(/^\uFEFF/, '');

/** True when STRIPE_SECRET_KEY looks like a real Stripe secret (not pk_, not empty). */
export const stripeSecretConfigured =
  (raw.startsWith('sk_test_') || raw.startsWith('sk_live_')) && raw.length >= 40;

/**
 * Use Fetch-based HTTP client (Node 18+). On some hosts the default Node `https` agent
 * path fails to reach api.stripe.com while `fetch` works.
 */
const stripeOptions: Stripe.StripeConfig = {
  timeout: 60_000,
  maxNetworkRetries: 3,
  httpClient: Stripe.createFetchHttpClient(),
};

/** Dummy key only so the client can construct; real calls must check stripeSecretConfigured first. */
export const stripe = new Stripe(
  stripeSecretConfigured ? raw : 'sk_test_00000000000000000000000000000000000000000000000000000000',
  stripeOptions,
);
