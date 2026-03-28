import Stripe from 'stripe';
import { config } from '../config';

const key = config.stripe.secretKey || 'sk_test_placeholder';
export const stripe = new Stripe(key);
