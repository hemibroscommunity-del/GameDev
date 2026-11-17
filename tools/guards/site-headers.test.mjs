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
 * ═══ v2.3.5820 (card SEC2, the owner's outside audit of 2026-11-17) ═══
 *   4. `/*` also sends Strict-Transport-Security (a year at least, every
 *      name under brotown.net) and a Permissions-Policy that switches off the
 *      camera, microphone and location and NOT what the game uses
 *      (fullscreen, autoplay, the clipboard, the share sheet);
 *   5. `/*` sends a full Content-Security-Policy (report-only or enforced:
 *      the line with default-src), with object-src 'none', and a hash in
 *      script-src for EVERY inline handler src/index.html carries, so editing
 *      the font preload's onload cannot quietly break the policy; and
 *      index.html has no inline <script> (the policy allows none);
 *   6. public/.well-known/security.txt is there, names a Contact, and its
 *      Expires has not passed (it warns 60 days ahead);
 *   7. the build's comment stripper (tools/dev/strip-html-comments.mjs, run
 *      by vite.config.js) takes every comment out of src/index.html and
 *      NOTHING ELSE: every line outside a comment survives, the version
 *      badge with it; and no "<!--" sits inside a <style> or a quoted
 *      attribute, where a plain pattern would cut real markup.
 *   tools/qa/mp/mp-csp.mjs plays the game under the policy, enforced.
 *
 * BREAK PROOF, v2.3.5820, each tried by hand, 2026-11-17:
 *   4. includeSubDomains taken off the HSTS line            -> FAIL 4
 *   4. fullscreen=() added to Permissions-Policy            -> FAIL 4
 *   5. the onload handler in src/index.html edited          -> FAIL 5
 *   6. Expires set to 2026-01-01                            -> FAIL 6
 *   7. the stripper's pattern made greedy ([\s\S]*)         -> FAIL 7
 *
 * Run from the repository's root: node tools/guards/site-headers.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT } from './lib/fourLines.mjs';
import { stripHtmlComments } from '../dev/strip-html-comments.mjs';

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

/* 4: HSTS and Permissions-Policy (v2.3.5820) */
const line = (re) => all.find((l) => re.test(l)) || '';
const hsts = line(/^Strict-Transport-Security:/i);
const maxAge = Number((/max-age=(\d+)/i.exec(hsts) || [])[1] || 0);
check('4: ...Strict-Transport-Security, a year at least, includeSubDomains', maxAge >= 31536000 && /;\s*includeSubDomains\b/i.test(hsts), hsts);
const pp = line(/^Permissions-Policy:/i);
const denied = (f) => new RegExp(`(^|[:,]\\s*)${f}=\\(\\)`).test(pp);
check('4: ...Permissions-Policy switches off the camera, microphone and location', ['camera', 'microphone', 'geolocation'].every(denied), pp);
const used = ['fullscreen', 'autoplay', 'clipboard-write', 'web-share'].filter((f) => new RegExp(`(^|[:,]\\s*)${f}=`).test(pp));
check('4: ...and touches nothing the game uses (fullscreen, autoplay, clipboard, share)', !!pp && used.length === 0, used);

/* 5: the full policy, and index.html's inline code held to it */
const cspLine = line(/^Content-Security-Policy(-Report-Only)?:\s*default-src\b/i);
const csp = cspLine.replace(/^[^:]+:\s*/, '');
const dirOf = (d) => ((new RegExp(`(?:^|;)\\s*${d}\\s+([^;]+)`).exec(csp) || [])[1] || '').trim();
check('5: ...a full Content-Security-Policy (report-only or enforced: default-src)', !!cspLine, all);
check('5: ...object-src \'none\'', dirOf('object-src') === "'none'", dirOf('object-src'));
const html = readFileSync(join(ROOT, 'src', 'index.html'), 'utf8');
const handlers = [...html.matchAll(/\son[a-z]+="([^"]*)"/g)].map((m) => m[1]);
const missing = handlers.filter((h) => !dirOf('script-src').includes(`'sha256-${createHash('sha256').update(h).digest('base64')}'`));
check(`5: ...a hash in script-src for each of index.html's ${handlers.length} inline handler(s)`, handlers.length > 0 && missing.length === 0 && dirOf('script-src').includes("'unsafe-hashes'"), missing);
const inlineScripts = [...html.matchAll(/<script\b([^>]*)>/gi)].filter((m) => !/\bsrc=/.test(m[1]));
check('5: ...index.html has no inline <script> (the policy allows none)', inlineScripts.length === 0, inlineScripts.map((m) => m[0]));

/* 6: security.txt */
const stxtPath = join(ROOT, 'public', '.well-known', 'security.txt');
const stxt = existsSync(stxtPath) ? readFileSync(stxtPath, 'utf8') : '';
const field = (f) => ((new RegExp(`^${f}:\\s*(\\S.*)$`, 'mi').exec(stxt) || [])[1] || '').trim();
const expires = Date.parse(field('Expires'));
check('6: public/.well-known/security.txt names a Contact', /^(https:\/\/|mailto:)/.test(field('Contact')), field('Contact'));
check('6: ...and its Expires has not passed (renew it: at most a year ahead)', Number.isFinite(expires) && expires > Date.now(), field('Expires'));
if (Number.isFinite(expires) && expires - Date.now() < 60 * 864e5) console.log('WARN 6: security.txt expires within 60 days: move Expires on (at most a year ahead)');

/* 7: the comment stripper takes comments and nothing else */
const out = stripHtmlComments(html);
check('7: the built page carries no "<!--"', !out.includes('<!--'), out.slice(out.indexOf('<!--'), out.indexOf('<!--') + 80));
const kept = new Set(out.split(/\r?\n/).map((l) => l.trim()));
let inC = false;
const lost = [];
for (const raw of html.split(/\r?\n/)) {
  const l = raw.trim();
  if (inC) { if (l.includes('-->')) inC = false; continue; }
  if (l.includes('<!--')) { if (!l.includes('-->')) inC = true; continue; }
  if (l && !kept.has(l)) lost.push(l);
}
check('7: ...and every line outside a comment survives (the version badge with it)', lost.length === 0 && out.includes('v__GAME_VERSION__ (__BUILD_SHA__)'), lost.slice(0, 4));
const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const attrs = [...html.matchAll(/="([^"]*)"/g)].map((m) => m[1]);
check('7: ...no "<!--" inside a <style> or a quoted attribute', ![...styles, ...attrs].some((s) => s.includes('<!--')));

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
