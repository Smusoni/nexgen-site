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
import { stripeSecretConfigured } from './lib/stripe';

const app = express();

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
  });
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
