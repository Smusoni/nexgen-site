# 18x26 NexGen — Football Training Club

Static marketing site (Netlify) + **booking API** (`backend/`) with PostgreSQL, Stripe Checkout, capacity rules, and admin dashboard.

## Frontend (this folder)

1. Serve locally: `npx http-server -p 8080` (from this directory).
2. **Booking** talks to the API. For **production on Netlify**, set build env **`NEXGEN_API_URL`** (see [`DEPLOY.md`](./DEPLOY.md)); the build injects `book.html` / `success.html` meta tags. For local dev, meta defaults to `http://localhost:4000`.

3. **Go-live checklist:** follow **[DEPLOY.md](./DEPLOY.md)** (Render Blueprint + Netlify + Stripe webhook).

### Contact form (optional)

`contact.html` can still use [Formspree](https://formspree.io): replace `YOUR_FORMSPREE_ID` in the form `action`.

### Images

Coach photos and branding live in `images/`. See filenames referenced in HTML.

## Backend (booking + admin)

See **[backend/README.md](backend/README.md)** for:

- Environment variables
- `prisma migrate deploy` + seed
- Stripe webhooks
- Admin UI at `https://YOUR-API/admin/`

## Architecture

- **Netlify** — static HTML/CSS/JS.
- **API host** (Render, Railway, Fly, etc.) — Express API, Prisma, Postgres. Example Render blueprint: `render.yaml` at repo root (`rootDir: backend`).
- **Stripe** — Checkout Sessions; webhook confirms bookings.

## File structure

```
nexgen-site/
  backend/            API, Prisma schema, admin dashboard (public/admin)
  render.yaml         Render Blueprint (Postgres + API)
  netlify.toml        Netlify build (injects NEXGEN_API_URL into HTML)
  scripts/inject-api-url.mjs
  DEPLOY.md           Step-by-step production deploy
  book.html           Booking wizard (loads slots from API)
  success.html        Post-checkout status polling
  js/booking.js       API client for checkout
  ...
```

## Tech stack

- Frontend: HTML, CSS, vanilla JS (Oswald + Inter)
- Backend: Node, Express, TypeScript, Prisma, PostgreSQL, Stripe
