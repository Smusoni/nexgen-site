import dotenv from 'dotenv';
dotenv.config();

function parseOrigins(): string[] {
  const raw = process.env.FRONTEND_URL || 'http://localhost:8080';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  frontendOrigins: parseOrigins(),
  get frontendUrl() {
    return this.frontendOrigins[0] || 'http://localhost:8080';
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@nexgen.com',
    password: process.env.ADMIN_PASSWORD || 'changeme123',
  },
  /** Public API URL for links in emails (e.g. https://nexgen-api.onrender.com). RENDER_EXTERNAL_URL is set on Render. */
  publicApiUrl: (process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, ''),
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    /** Verified domain in Resend, or onboarding@resend.dev for testing */
    from: process.env.RESEND_FROM || 'NexGen Bookings <onboarding@resend.dev>',
    /** Comma-separated; defaults to ADMIN_EMAIL */
    notifyEmails: (process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || 'admin@nexgen.com')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  bookingExpirationMinutes: 15,
};
