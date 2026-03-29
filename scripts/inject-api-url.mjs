/**
 * Netlify build: set NEXGEN_API_URL (preferred) to your Render API origin (no trailing slash),
 * e.g. https://nexgen-api.onrender.com — updates nexgen-api meta tags in all root *.html that have one.
 * Also accepts nexgen_api_url for the same value (common typo in the Netlify UI).
 * If unset, leaves files unchanged (localhost stays for local-only clones).
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs';
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

const htmlFiles = readdirSync(root).filter((f) => f.endsWith('.html'));
for (const file of htmlFiles) {
  const p = join(root, file);
  let html = readFileSync(p, 'utf8');
  if (!/name\s*=\s*["']nexgen-api["']/i.test(html)) continue;
  const next = html.replace(metaRe, metaLine);
  if (next === html) {
    console.warn(`Warning: nexgen-api meta present but pattern did not match in ${file}`);
    continue;
  }
  writeFileSync(p, next, 'utf8');
  console.log(`Updated ${file} → nexgen-api = ${api}`);
}
