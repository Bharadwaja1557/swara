/**
 * spa-fallback.js
 *
 * Run after `next build` (output: 'export').
 *
 * GitHub Pages serves a 404.html page for any unmatched URL.
 * By copying the React app's index.html → 404.html, all 404s
 * are handled by React Router instead of GitHub's default 404 page.
 *
 * This enables direct URL navigation to album pages (/album/[id]/)
 * that were not pre-rendered by generateStaticParams.
 *
 * Usage:
 *   node scripts/spa-fallback.js
 *
 * In package.json:
 *   "build:pages": "next build && node scripts/spa-fallback.js"
 */

const fs   = require('fs');
const path = require('path');

const OUT_DIR     = path.join(process.cwd(), 'out');
const INDEX_HTML  = path.join(OUT_DIR, 'index.html');
const NOT_FOUND   = path.join(OUT_DIR, '404.html');
const NOJEKYLL    = path.join(OUT_DIR, '.nojekyll');

// ─── Ensure out/ exists ───────────────────────────────────────────────────

if (!fs.existsSync(OUT_DIR)) {
  console.error('[spa-fallback] ERROR: out/ directory not found. Run `next build` first.');
  process.exit(1);
}

// ─── Copy index.html → 404.html ───────────────────────────────────────────

if (!fs.existsSync(INDEX_HTML)) {
  console.error('[spa-fallback] ERROR: out/index.html not found.');
  process.exit(1);
}

fs.copyFileSync(INDEX_HTML, NOT_FOUND);
console.log('[spa-fallback] ✓ Copied index.html → 404.html');

// ─── Create .nojekyll (prevents GitHub Pages from ignoring _next/) ────────

fs.writeFileSync(NOJEKYLL, '');
console.log('[spa-fallback] ✓ Created .nojekyll');

// ─── Done ─────────────────────────────────────────────────────────────────

console.log('[spa-fallback] ✓ GitHub Pages SPA fallback ready.');
console.log('');
console.log('  Deploy out/ to GitHub Pages.');
console.log('  All unmatched routes will be handled by the React app.');
