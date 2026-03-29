import * as dns from 'dns';
import https from 'https';
import Stripe from 'stripe';
import { config } from '../config';

const raw = (config.stripe.secretKey || '')
  .trim()
  .replace(/^\uFEFF/, '');

/** True when STRIPE_SECRET_KEY looks like a real Stripe secret (not pk_, not empty). */
export const stripeSecretConfigured =
  (raw.startsWith('sk_test_') || raw.startsWith('sk_live_')) && raw.length >= 40;

/**
 * Force IPv4 for outbound calls to api.stripe.com. On some cloud hosts (including Render),
 * IPv6 routes fail or time out while IPv4 works — the Stripe SDK then reports
 * "An error occurred with our connection to Stripe. Request was retried N times."
 */
const stripeHttpsAgent = new https.Agent({
  lookup(hostname, _opts, cb) {
    dns.lookup(hostname, { family: 4 }, cb);
  },
  keepAlive: true,
});

const stripeOptions: Stripe.StripeConfig = {
  timeout: 60_000,
  maxNetworkRetries: 3,
  httpAgent: stripeHttpsAgent,
};

/** Dummy key only so the client can construct; real calls must check stripeSecretConfigured first. */
export const stripe = new Stripe(
  stripeSecretConfigured ? raw : 'sk_test_00000000000000000000000000000000000000000000000000000000',
  stripeOptions,
);
