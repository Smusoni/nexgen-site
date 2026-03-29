# Troubleshooting NexGen deploy

Check in this order.

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
