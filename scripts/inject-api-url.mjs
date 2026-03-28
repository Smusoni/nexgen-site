/**
 * Netlify build: set NEXGEN_API_URL to your Render API origin (no trailing slash),
 * e.g. https://nexgen-api.onrender.com — updates book.html + success.html meta tags.
 * If unset, leaves files unchanged (localhost stays for local-only clones).
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const raw = process.env.NEXGEN_API_URL?.trim();
if (!raw) {
  console.log('NEXGEN_API_URL not set — skipping API URL inject (meta tags unchanged).');
  process.exit(0);
}

const api = raw.replace(/\/$/, '').replace(/"/g, '');
const metaLine = `<meta name="nexgen-api" content="${api}">`;
const metaRe =
  /<meta\s+name\s*=\s*["']nexgen-api["']\s+content\s*=\s*["'][^"']*["']\s*\/?>/gi;

for (const file of ['book.html', 'success.html']) {
  const p = join(root, file);
  let html = readFileSync(p, 'utf8');
  const next = html.replace(metaRe, metaLine);
  if (next === html) {
    console.warn(`Warning: no nexgen-api meta found in ${file}`);
    continue;
  }
  writeFileSync(p, next, 'utf8');
  console.log(`Updated ${file} → nexgen-api = ${api}`);
}
