# Deploy NexGen (Render API + Netlify site)

You must run these steps in your own browser (GitHub, Render, Netlify, Stripe). This repo already includes `render.yaml` and `netlify.toml`.

## 1. Push code to GitHub

Create a repo and push the `nexgen-site` folder (or your monorepo root that contains `render.yaml` and `backend/`).

## 2. Deploy API on Render (Blueprint)

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect the GitHub repo and select the branch.
3. Render reads [`render.yaml`](./render.yaml): it will create **Postgres** + **Web Service** `nexgen-api`.
4. When prompted, set **sync** secrets:
   - `STRIPE_SECRET_KEY` — `sk_live_...` or `sk_test_...`
   - `STRIPE_WEBHOOK_SECRET` — from Stripe webhook (after step 5)
   - `FRONTEND_URL` — your Netlify site URL(s), comma-separated, e.g. `https://yoursite.netlify.app`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — admin login for `/admin/`
   - `RESEND_API_KEY` — from [resend.com](https://resend.com) (sending access)
5. Wait for first deploy. Copy the service **URL**, e.g. `https://nexgen-api-xxxx.onrender.com`.

**Database setup:** each deploy runs `prisma migrate deploy` then **`prisma db seed`** (idempotent: default services + admin). You can still run `npm run db:seed` manually in Render Shell if needed.

**Stripe webhook (production):** Developers → Webhooks → endpoint  
`https://YOUR-RENDER-URL/api/webhooks/stripe`  
Events: `checkout.session.completed`, `checkout.session.expired`  
Paste the signing secret into `STRIPE_WEBHOOK_SECRET` on Render and **Manual Deploy** if needed.

Optional env on Render:

- `PUBLIC_API_URL` — same as service URL (used in booking emails for `/admin/` link); `RENDER_EXTERNAL_URL` is often set automatically.
- `ADMIN_NOTIFY_EMAIL` — if different from `ADMIN_EMAIL` for alerts.

## 3. Deploy site on Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**.
2. Same repo, base directory: **repository root** (where `netlify.toml` lives).
3. **Site settings → Environment variables → Build** (must be available at **build** time, not only runtime):
   - `NEXGEN_API_URL` = your Render API origin, e.g. `https://nexgen-api-xxxx.onrender.com` (no trailing slash). The name must match exactly (all caps); `nexgen_api_url` is also accepted by the build script if you already created it that way.
4. Trigger deploy. The build runs [`scripts/inject-api-url.mjs`](./scripts/inject-api-url.mjs) and rewrites the `nexgen-api` meta tag in `book.html` and `success.html`. Without this variable, production builds will fail; if you deployed before adding it, booking will error until you set it and **redeploy**.

5. After Netlify gives you a URL, go back to Render and set **`FRONTEND_URL`** to that URL (comma-separate preview + production if needed), then redeploy the API so CORS allows the site.

## 4. Smoke test

- Open Netlify `book.html`, complete a **test** checkout, confirm `success.html` shows confirmed.
- Check `/admin/` on the API host, Resend inbox, and Stripe Dashboard.

## Order summary

1. Render Blueprint (DB + API) → get API URL  
2. Netlify + `NEXGEN_API_URL` → get site URL  
3. Set `FRONTEND_URL` on Render → redeploy API  
4. Stripe webhook → `STRIPE_WEBHOOK_SECRET` on Render  
