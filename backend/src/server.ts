import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { webhookRouter } from './routes/webhooks/stripe';
import { startExpirationJob } from './services/expirationService';
import { stripe, stripeSecretConfigured } from './lib/stripe';

const app = express();

/** Collapse accidental double slashes (e.g. /api//health → /api/health) so pasted URLs still match routes. */
app.use((req, _res, next) => {
  if (!req.url.includes('//')) {
    next();
    return;
  }
  const q = req.url.indexOf('?');
  const pathPart = q === -1 ? req.url : req.url.slice(0, q);
  const query = q === -1 ? '' : req.url.slice(q);
  req.url = pathPart.replace(/\/+/g, '/') + query;
  next();
});

function isPublicApiPath(req: express.Request): boolean {
  const pathOnly = req.originalUrl.split('?')[0];
  return pathOnly === '/api/public' || pathOnly.startsWith('/api/public/');
}

const corsPublicBooking = cors({
  origin: true,
  credentials: false,
});

const corsRestricted = cors({
  origin: (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    if (config.frontendOrigins.includes(origin)) {
      cb(null, true);
      return;
    }
    cb(null, false);
  },
  credentials: true,
});

app.use(helmet());
app.use(morgan('dev'));
app.use((req, res, next) => {
  if (isPublicApiPath(req)) {
    corsPublicBooking(req, res, next);
    return;
  }
  corsRestricted(req, res, next);
});

app.use('/api/webhooks/stripe', webhookRouter);

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    stripeSecretConfigured,
    frontendOrigin: config.frontendOrigins[0] ?? null,
    httpsProxySet: Boolean(process.env.HTTPS_PROXY || process.env.HTTP_PROXY),
  });
});

/** Confirms this server can reach api.stripe.com (diagnose "connection to Stripe" checkout errors). */
app.get('/api/health/stripe-reach', async (_req, res) => {
  if (!stripeSecretConfigured) {
    res.status(503).json({ ok: false, message: 'STRIPE_SECRET_KEY not configured' });
    return;
  }
  try {
    await stripe.customers.list({ limit: 1 });
    res.json({ ok: true, message: 'Server reached Stripe API successfully' });
  } catch (e: any) {
    console.error('[health/stripe-reach]', e);
    res.status(502).json({
      ok: false,
      message: e?.message || 'Stripe request failed',
      type: e?.type,
      code: e?.code,
    });
  }
});

app.use('/api/public', publicRouter);
app.use('/api/admin', adminRouter);

const adminDir = path.join(process.cwd(), 'public', 'admin');
app.use('/admin', express.static(adminDir));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(config.port, () => {
  console.log(`NexGen API running on http://localhost:${config.port}`);
  if (config.nodeEnv === 'production') {
    if (!stripeSecretConfigured) {
      console.warn('[nexgen] STRIPE_SECRET_KEY missing or invalid — checkout will fail until set.');
    }
    const fe = config.frontendOrigins[0] || '';
    if (!fe || fe.includes('localhost')) {
      console.warn('[nexgen] FRONTEND_URL may be unset — Stripe success/cancel URLs use first origin.');
    }
  }
  startExpirationJob();
});

export default app;
