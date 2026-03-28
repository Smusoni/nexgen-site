# NexGen Booking API

Node.js + Express + PostgreSQL + Prisma + Stripe Checkout + Admin dashboard.

## Quick start (local)

1. Copy `.env.example` to `.env` and fill values.
2. Create a Postgres database and set `DATABASE_URL`.
3. Install and migrate:

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

- API: `http://localhost:4000`
- Health: `GET /api/health`
- Admin UI: `http://localhost:4000/admin/`
- Public booking API: `/api/public/*`

## Stripe

1. Use **Stripe Checkout** (created by this API — not Payment Links).
2. Dashboard → Developers → Webhooks → Add endpoint:  
   `https://YOUR-API-HOST/api/webhooks/stripe`  
   Events: `checkout.session.completed`, `checkout.session.expired`
3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.
4. Use your **secret key** in `STRIPE_SECRET_KEY` (`sk_live_...` or `sk_test_...`).

## Admin email (new paid bookings)

When Stripe confirms payment, the API can email you via [Resend](https://resend.com):

1. Create a free account and an **API key** (`re_...`).
2. Set in `.env`:
   - `RESEND_API_KEY=re_...`
   - `ADMIN_NOTIFY_EMAIL=your-real-inbox@example.com` (where alerts go; can match `ADMIN_EMAIL`)
   - Optional `RESEND_FROM` — defaults to `NexGen Bookings <onboarding@resend.dev>`. With the dev sender, Resend only delivers to **your own** verified address until you add a domain.
3. Optional `PUBLIC_API_URL` (or rely on `RENDER_EXTERNAL_URL` on Render) so the email includes a working link to `/admin/`.

If `RESEND_API_KEY` is unset, booking still works; emails are skipped.

## Frontend (Netlify static site)

In `book.html` and `success.html`, set the meta tag to your API URL:

```html
<meta name="nexgen-api" content="https://your-api.onrender.com">
```

Set `FRONTEND_URL` on the server to your Netlify site URL (comma-separated for multiple).

## Production deploy (e.g. Render)

1. New **Web Service** from this `backend` folder.
2. Build: `npm install && npm run build`
3. Start: `npm start`
4. Add env vars from `.env.example`.
5. Run migrations once (Render shell or release command):  
   `npx prisma migrate deploy && npm run db:seed`

## Admin

- Open `/admin/` on the API host.
- Default login from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (change in production).

## Data model

- **Services** — priced offerings (`1on1`, `group2`, `group34`, `group56`).
- **Slots** — concrete start/end times per service; capacity from service or override.
- **Bookings** — `pending_payment` → Stripe → `confirmed` via webhook.
- **Payments** — recorded on successful checkout.

## QA checklist

See [TESTING.md](./TESTING.md).
