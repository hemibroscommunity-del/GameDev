/* ═══ v2.3.5717: THE SITE SHIPS ITS PROTECTIVE HEADERS (card SEC PR 18) ═══
 *
 * The protective headers lived in src/public/_headers, which the build never
 * copies (vite.config.js: root 'src', publicDir '../public'), so production
 * sent none of them.  They are in public/_headers now, which Pages reads from
 * dist/.  This holds:
 *
 *   1. src/public/_headers does not come back (a file there is never shipped,
 *      and reads as though it were);
 *   2. the build's public folder is public/ (vite.config.js publicDir), so
 *      public/_headers is the one that ships;
 *   3. public/_headers sends, on every page (`/*`): X-Frame-Options DENY,
 *      Content-Security-Policy frame-ancestors 'none', X-Content-Type-Options
 *      nosniff and a Referrer-Policy.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-17:
 *   1. src/public/_headers put back                         -> FAIL 1
 *   2. the frame-ancestors line taken out of public/_headers -> FAIL 3
 *   3. the four lines moved under /assets/* instead of /*    -> FAIL 3
 *
 * Run from the repository's root: node tools/guards/site-headers.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};

/* 1 */
check('1: src/public/_headers is not back (the build never ships it)', !existsSync(join(ROOT, 'src', 'public', '_headers')));

/* 2 */
const vite = readFileSync(join(ROOT, 'vite.config.js'), 'utf8');
check('2: the build\'s public folder is public/ (vite.config.js publicDir)', /publicDir:\s*['"]\.\.\/public['"]/.test(vite) && /root:\s*['"]src['"]/.test(vite));

/* 3: the `/*` block's headers */
const text = readFileSync(join(ROOT, 'public', '_headers'), 'utf8');
const blocks = new Map();
let cur = null;
for (const raw of text.split(/\r?\n/)) {
  if (!raw.trim() || raw.trim().startsWith('#')) { if (!raw.trim()) cur = null; continue; }
  if (!/^\s/.test(raw)) { cur = raw.trim(); if (!blocks.has(cur)) blocks.set(cur, []); continue; }
  if (cur) blocks.get(cur).push(raw.trim());
}
const all = blocks.get('/*') || [];
const has = (re) => all.some((l) => re.test(l));
check('3: public/_headers has a block for every page (/*)', all.length > 0, [...blocks.keys()]);
check('3: ...X-Frame-Options: DENY', has(/^X-Frame-Options:\s*DENY$/i), all);
check('3: ...Content-Security-Policy: frame-ancestors \'none\'', has(/^Content-Security-Policy:.*frame-ancestors\s+'none'/i), all);
check('3: ...X-Content-Type-Options: nosniff', has(/^X-Content-Type-Options:\s*nosniff$/i), all);
check('3: ...a Referrer-Policy', has(/^Referrer-Policy:\s*\S+/i), all);

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
