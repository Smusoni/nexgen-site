/**
 * Netlify build: set NEXGEN_API_URL (preferred) to your Render API origin (no trailing slash),
 * e.g. https://nexgen-api.onrender.com — updates book.html + success.html meta tags.
 * Also accepts nexgen_api_url for the same value (common typo in the Netlify UI).
 * If unset, leaves files unchanged (localhost stays for local-only clones).
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const raw =
  process.env.NEXGEN_API_URL?.trim() || process.env.nexgen_api_url?.trim();
if (!raw) {
  const onNetlifyProd = process.env.NETLIFY === 'true' && process.env.CONTEXT === 'production';
  if (onNetlifyProd) {
    console.error(
      'Set NEXGEN_API_URL (or nexgen_api_url) for production Netlify builds: your Render API origin, no trailing slash, e.g. https://nexgen-api-xxxx.onrender.com'
    );
    process.exit(1);
  }
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
