# QA checklist

## Capacity

- [x] Create a 1-on-1 slot; only 1 seat available (smoke-test.js #10)
- [x] Group slot shows correct remaining seats (smoke-test.js #10: group34 cap 4)
- [x] Failed checkout releases pending booking seats (smoke-test.js #12)
- [ ] Create a group slot with capacity 4; four separate checkouts succeed; fifth returns "Not enough capacity" (manual with real Stripe keys)
- [ ] Two browsers cannot both complete checkout for same 1-on-1 slot (manual with real Stripe keys)

## Stripe

- [x] Successful payment webhook: booking becomes `confirmed`, payment row `succeeded` (webhook-test.js #2-4)
- [x] Webhook retry: no duplicate payment rows — idempotent (webhook-test.js #5)
- [x] Invalid webhook signature rejected with 400 (webhook-test.js #6)
- [x] Expired checkout session webhook: pending booking cancelled (webhook-test.js #7)
- [ ] Abandoned checkout: cron marks `expired` after 15 min (manual timing test)

## Admin

- [x] Login returns JWT cookie; protected routes work (smoke-test.js #4)
- [x] Logout succeeds (smoke-test.js #17)
- [x] Unauthenticated requests return 401 (smoke-test.js #7)
- [x] Wrong password returns 401 (smoke-test.js #18)
- [x] Create slot; appears in public slots (smoke-test.js #8, #10)
- [x] Cancel slot; no longer bookable (smoke-test.js #16)
- [x] Overview, services, bookings, payments endpoints return data (smoke-test.js #5, #6, #14, #15)
- [x] Admin dashboard UI served at /admin/ (smoke-test.js #19)

## Frontend

- [x] `book.html` loads services from API (smoke-test.js #2, manual verification)
- [ ] Date change loads slots; selecting slot + pay redirects to Stripe (manual with real Stripe keys)
- [ ] `success.html?session_id=...` polls until `confirmed` (manual with real Stripe keys)

## Go-Live Checklist

- [ ] Deploy backend to Render/Railway/Fly (use `render.yaml` at repo root as template)
- [ ] Set production env vars: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- [ ] Run `npx prisma migrate deploy` + `npm run db:seed` once on prod host
- [ ] Add Stripe webhook endpoint: `https://YOUR-API/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.expired`
- [ ] Update `book.html` and `success.html` meta tag `nexgen-api` to production API URL
- [ ] Set `FRONTEND_URL` to Netlify site URL(s)
- [ ] Deploy static site to Netlify
- [ ] Smoke test: admin login at `https://YOUR-API/admin/`
- [ ] Smoke test: full booking flow with Stripe test mode
- [ ] Switch Stripe to live keys when ready

## Rollback

- Revert `book.html` / `success.html` meta tag to old value or blank
- Previous static-only booking flow (Formspree + Payment Links) can be restored by reverting `js/booking.js`
- Backend can be stopped without breaking the static site (booking page just shows "API not configured" message)
