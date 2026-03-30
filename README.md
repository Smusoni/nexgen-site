# 18x26 NexGen — Football Training Club

Static marketing site (Netlify) + **booking API** (`backend/`) with PostgreSQL, Stripe Checkout, capacity rules, and admin dashboard.

## Frontend (this folder)

### Local preview (static pages + booking)

1. **Serve the HTML site** from this folder (repo root), not from `backend/`:
   - `npx --yes http-server . -p 8080 -c-1`  
   - Then open **http://127.0.0.1:8080/services.html** (or **http://127.0.0.1:8080/** for the home page).  
   **Do not use only `http://127.0.0.1`** (port 80) or expect the **booking API** (`:4000`) to show the website — port **4000** is JSON/API only; the HTML lives on **8080** (or whatever port `http-server` uses).  
   Using **Open in Browser** on a single file (`file://`) can break paths and skip a real origin; prefer `http-server` or VS Code Live Server with the **workspace folder** as the web root.

2. **Booking & checkout** call the API at `http://localhost:4000` (see `meta name="nexgen-api"` in HTML). The **live site** uses Render’s Postgres; **on your machine** the API still needs a real database or `/api/public/services` will fail (the booking page will show a clear message). In a second terminal:
   - **Postgres:** from the repo root, if you use Docker: **`docker compose up -d`** (see [`docker-compose.yml`](./docker-compose.yml)), or run **`powershell -ExecutionPolicy Bypass -File scripts/start-local-db.ps1`** once Docker Desktop is installed and running (starts Postgres, then migrate + seed). Or install PostgreSQL locally and set **`DATABASE_URL`** in `backend/.env` to match.
   - `cd backend` — ensure **`DATABASE_URL`** matches your DB (for Docker compose: `postgresql://postgres:postgres@localhost:5432/nexgen?schema=public`).
   - **`npx prisma migrate deploy`** (or `migrate dev`) and **`npm run db:seed`**
   - **`npm run dev`** — leave this running while you test `book.html`, `pay.html`, etc.

3. **Stripe return URLs (local only):** the API uses **`FRONTEND_URL`** (default `http://localhost:8080`) for Checkout success/cancel links. If you use another port (e.g. Live Server on `5500`), set in `backend/.env`:  
   `FRONTEND_URL=http://127.0.0.1:5500`  
   so Stripe sends you back to the same origin you’re using.

4. For **production on Netlify**, set build env **`NEXGEN_API_URL`** (see [`DEPLOY.md`](./DEPLOY.md)); the build injects `nexgen-api` meta tags. Locally, meta defaults to `http://localhost:4000`.

5. **Go-live checklist:** follow **[DEPLOY.md](./DEPLOY.md)** (Render Blueprint + Netlify + Stripe webhook). If something breaks in production, see **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**.

### Booking page looks unstyled (plain black text) on localhost

You are almost certainly opening **`book.html` as a file** (`file://` in the address bar) or running a static server from the **wrong folder**. The server’s working directory must be the **nexgen-site** root (next to `css/`, `js/`, `images/`). Use **`http://127.0.0.1:8080/book.html`**, not a `file:///…` URL.

### Skip local Docker: test the booking UI against production API

If Docker Desktop is problematic, you can still preview booking locally: set the **`nexgen-api`** meta tag in `book.html` (temporarily, do not commit) to your **Render API origin** (same value as Netlify’s `NEXGEN_API_URL`), serve the site with `http-server` as above, and reload. Public API routes allow browser CORS from any origin.

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
