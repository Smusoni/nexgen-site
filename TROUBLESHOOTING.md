# Troubleshooting NexGen deploy

## Local dev: “connection failed” or booking services won’t load

1. **Browser can’t open `http://127.0.0.1:4000` at all**  
   The API isn’t running. In `backend/` run **`npm run dev`** and leave that terminal open. You should see: `NexGen API running on http://localhost:4000`.

2. **The API runs, but `http://127.0.0.1:4000/api/public/services` errors or booking shows no services**  
   The app is up; **PostgreSQL** is not (or `DATABASE_URL` is wrong). **Netlify + Render works** because the cloud API already has a database; **localhost** only works after you run Postgres on your PC (or point `DATABASE_URL` at a reachable cloud DB). In the API terminal, look for **`ECONNREFUSED`** or Prisma **`P1001`** next to `service.findMany`.  
   - Easiest: from repo root **`docker compose up -d`** (see `docker-compose.yml`), or:  
     `docker run --name nexgen-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=nexgen -p 5432:5432 -d postgres:16`  
   - Set **`DATABASE_URL`** in `backend/.env` to match (example):  
     `postgresql://postgres:postgres@localhost:5432/nexgen?schema=public`  
   - Then: **`npx prisma migrate deploy`** (or `migrate dev`) and **`npm run db:seed`**.

3. **Quick checks**  
   - **`GET /api/health`** — JSON `status: "ok"` means the Node process is listening.  
   - If `/api/public/services` still returns 500, the failure is almost always **database URL or Postgres not running**.

Check in this order (production).

## 1. API (Render)

Open in a browser:

`https://YOUR-API.onrender.com/api/health`

You should see JSON including:

- `status: "ok"`
- `stripeSecretConfigured: true` after you set `STRIPE_SECRET_KEY` correctly
- `frontendOrigin` — your site URL (used for Stripe redirect URLs)

If the service is asleep (free tier), wait ~1 minute and retry.

## 2. Stripe checkout

- **Render → Environment:** `STRIPE_SECRET_KEY` = **Secret** key (`sk_test_...` or `sk_live_...`), not `pk_...`.
- Stripe Dashboard: **Test mode** on when using `sk_test_...`.
- After changing env vars, **redeploy** the service.

### “An error occurred with our connection to Stripe. Request was retried…”

That text comes from the **Stripe SDK on your server** (Render → `api.stripe.com`), not from your browser.

1. Open **`/api/health/stripe-reach`** on your API — use **single** slashes only, e.g.  
   `https://YOUR-API.onrender.com/api/health/stripe-reach`  
   (not `api//health` — that was a typo in the path.)  
   - **`ok: true`** → Stripe is reachable; if checkout still fails, check Render logs for the next error.  
   - **`ok: false`** → network/auth: confirm key, no bad **`HTTPS_PROXY`/`HTTP_PROXY`** on the service, try redeploy. The app forces **IPv4** to Stripe to avoid broken IPv6 on some hosts.

2. Check **`/api/health`**: `httpsProxySet` should be **`false`** unless you intentionally use a proxy.

3. Read **Render → Logs** when you click **Confirm & Pay**.

If you’re already on a **paid** Render instance and `stripe-reach` still returns `StripeConnectionError`, redeploy after the latest code (uses **Fetch** for Stripe instead of the Node HTTPS agent). If it still fails, contact **Render support** with the JSON from `stripe-reach` — something on the path to `api.stripe.com` is still blocking.

## 3. Admin login

Login uses the **email + password stored in the database**, not live `ADMIN_PASSWORD` changes.

**Reset password on Render (Shell):**

```bash
cd backend
npx tsx scripts/reset-admin-password.ts YOUR_EMAIL YourNewPassword
```

Or from repo root if `rootDir` is `backend`:

```bash
npx tsx scripts/reset-admin-password.ts YOUR_EMAIL YourNewPassword
```

Then log in at `https://YOUR-API.onrender.com/admin/`.

## 4. Netlify booking page

- **Build env:** `NEXGEN_API_URL` = your Render API origin (no path).
- View source on `book.html` — `nexgen-api` meta must be your Render URL, not `localhost`.

## 5. Services / slots empty

- **Services:** automatic seed on deploy start, or `npm run db:seed` in Shell.
- **Time slots:** create in **Admin → Slots**.
