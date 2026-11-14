/* ═══ v2.3.5324: TRAPS INTO GUARDS, THE SCREENS (card V PR 5) ═══
 *
 * Grand plan step 8.2, card V's fifth batch (the form: tools/guards/README.md,
 * "A trap held").  The census of what holds each trap:
 * docs/plan/census/traps.md.  Read off src/styles/game.css, src/index.html
 * and the page's code (comments dropped: lib/codeOnly.mjs; strings blanked
 * where a brace is counted: lib/maskCode.mjs).  DevPanel.jsx is card A's
 * while A runs: only read here.
 *
 * TRAPS §52 (the rule): no CSS mask (game.css, or a custom property a mask reads, set in the page's code) is the file an <img> shows or a preload fetches: a mask is its own download, never the img's; one stepped in today, listed. Break: src/styles/game.css: .bt-cc-logo-shine's mask at '/ui/welcome/title/brotown-lockup.png' (the img's own file) -> FAIL (tried 2026-11-14).
 * TRAPS §64 (one case): the creator's box (.bt-name-modal: fixed, overflow hidden, touch-action none) keeps `overflow:clip` under a coarse pointer, its `overflow:hidden` for iOS 14-15, and its scroll listener putting scrollTop back to 0; whether another box's content can stop fitting under a keyboard needs the page. Break: src/styles/game.css: the `@media (pointer:coarse){ .bt-name-modal{overflow:clip} }` rule gone -> FAIL (tried 2026-11-14).
 * TRAPS §77 (the rule): every fetch of the Test panel has a timeout (an AbortController and a setTimeout) and its opening refresh is quiet; a fetch in any other window or the dash with no timeout is a census that only falls. Break: src/ui/panels/DevPanel.jsx: fetchWithTimeout returns `await fetch(url, init)` with no signal -> FAIL (tried 2026-11-14).
 * TRAPS §85 (the rule): no custom property in game.css that a calc() multiplies or divides holds a `%` or an `em` (a token is resolved where it is used, not where it is written). Break: src/styles/game.css: the landscape `--zb-w:min(64%,360px)` -> FAIL (tried 2026-11-14).
 * TRAPS §134 (one case): the quest banner is a body portal (createPortal(..., document.body)), over the quest window's body-portalled scrim; the first join's welcome plate alone is drawn in the wrap; which other overlay must be over a body portal needs the page. Break: src/ui/panels/QuestBannerLayer.jsx: return the div itself instead of createPortal(..., document.body) -> FAIL (tried 2026-11-14).
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §52   game.css: .bt-cc-logo-shine's mask at brotown-lockup.png           -> FAIL §52 literal
 *         BoardRow.jsx's trophy known; LoginScreen.jsx: `--lg-logo` at
 *         `url("${art('logo-full')}")`, the img's own                     -> FAIL §52 same name
 *   §64   game.css: the coarse-pointer clip rule gone                        -> FAIL §64 clip
 *         game.css: .bt-name-modal's `overflow:hidden` gone                  -> FAIL §64 hidden
 *   §77   DevPanel.jsx: fetchWithTimeout's fetch with no signal              -> FAIL §77 test panel
 *         DevPanel.jsx: the opening `refresh(true)` -> `refresh(false)`       -> FAIL §77 quiet
 *         FeedbackPanel.jsx (the dash's): a second bare fetch                -> FAIL §77 census
 *   §85   game.css: `--zb-w:min(64%,360px)` in the landscape rule           -> FAIL §85
 *   §134  QuestBannerLayer.jsx: the div returned, no portal                 -> FAIL §134
 *
 * Run from the repository's root: node tools/guards/traps-screens.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const base = (f) => f.slice(f.lastIndexOf('/') + 1);
const path = (u) => String(u).replace(/[?#].*$/, '');

const CSS = read('src/styles/game.css').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
/* every declaration of game.css: { prop, value, sel, media } */
const decls = [];
{
  const stack = [];
  let i = 0, start = 0;
  while (i < CSS.length) {
    const ch = CSS[i];
    if (ch === '{') { stack.push(CSS.slice(start, i).trim()); start = i + 1; }
    else if (ch === '}') {
      const body = CSS.slice(start, i);
      const sel = stack[stack.length - 1] || '';
      const media = stack.slice(0, -1).filter((s) => s.startsWith('@')).join(' ');
      for (const d of body.split(';')) {
        const k = d.indexOf(':');
        if (k > 0 && !d.includes('{')) decls.push({ prop: d.slice(0, k).trim(), value: d.slice(k + 1).trim(), sel, media });
      }
      stack.pop(); start = i + 1;
    } else if (ch === ';' && stack.length === 0) start = i + 1;
    i++;
  }
}
const page = codeOf(['src']);
const masked = new Map([...page].map(([f, c]) => [f, maskCode(c)]));
/* the value of a `key:` at index k (masked code): to the next top-level , or } */
function valueAt(m, k) {
  let d = 0, e = k;
  for (; e < m.length; e++) {
    const ch = m[e];
    if (ch === '(' || ch === '[' || ch === '{') d++;
    else if (ch === ')' || ch === ']' || ch === '}') { if (d-- === 0) break; }
    else if (ch === ',' && d === 0) break;
  }
  return e;
}

/* ── §52: a mask is never the img's or a preload's file ── */
{
  const MASK_PROPS = /^(?:-webkit-)?mask(?:-image)?$/;
  const maskDecls = decls.filter((d) => MASK_PROPS.test(d.prop));
  const maskUrls = [], maskVars = new Set();
  for (const d of maskDecls) {
    for (const x of d.value.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) if (!x[1].startsWith('data:')) maskUrls.push({ url: x[1], where: 'game.css ' + d.sel });
    for (const x of d.value.matchAll(/var\(\s*(--[\w-]+)/g)) maskVars.add(x[1]);
  }
  for (const d of decls) if (maskVars.has(d.prop)) for (const x of d.value.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) maskUrls.push({ url: x[1], where: 'game.css ' + d.prop });
  /* what an <img> shows (`src:` in the page's code) and what a preload fetches */
  const imgLits = new Set(), sameName = [];
  const STOP = new Set(['BUILD_INFO', 'String', 'encodeURIComponent', 'window', 'Math', 'url']);
  /* the names in an expression, read off the masked code (strings and a
     template's text blanked, its ${...} kept) */
  const ids = (ms) => new Set([...ms.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)/g)].map((x) => x[1]).filter((n) => !STOP.has(n)));
  for (const [f, c] of page) {
    const m = masked.get(f);
    const srcs = [];
    for (const x of m.matchAll(/(?<![\w$.-])src:/g)) {
      const e = valueAt(m, x.index + 4);
      const v = c.slice(x.index + 4, e).trim();
      srcs.push(m.slice(x.index + 4, e));
      const lit = /^["'`]([^"'`$]+)["'`]$/.exec(v);
      if (lit) imgLits.add(path(lit[1]));
    }
    for (const x of c.matchAll(/["'](--[\w-]+)["']:/g)) {
      if (!maskVars.has(x[1])) continue;
      const k = x.index + x[0].length;
      const e = valueAt(m, k);
      const v = c.slice(k, e);
      for (const u of v.matchAll(/["'`]([^"'`$]*\/[^"'`$]+\.(?:png|webp|jpe?g|svg|gif))/g)) maskUrls.push({ url: u[1], where: base(f) + ' ' + x[1] });
      const vi = ids(m.slice(k, e));
      for (const s of srcs) {
        const shared = [...ids(s)].filter((n) => vi.has(n));
        if (shared.length) sameName.push(`${f}: ${x[1]} and an img src share ${shared.join(', ')}`);
      }
    }
  }
  const preloads = [...read('src/index.html').matchAll(/<link[^>]*rel=["']preload["'][^>]*>/g)]
    .map((x) => (/href=["']([^"']+)["']/.exec(x[0]) || [])[1]).filter(Boolean).map(path);
  const clash = maskUrls.filter((u) => imgLits.has(path(u.url)) || preloads.includes(path(u.url)))
    .map((u) => `${u.where}: ${u.url}`);
  check(`§52 literal: no mask is the file an <img> shows or a preload fetches (${maskUrls.length} mask files, ${imgLits.size} img files, ${preloads.length} preloads)`,
    maskDecls.length >= 3 && clash.length === 0, clash);
  /* a mask built from the very name the element's <img> shows: known, the
     trophies' shine (a picture its own mask, BoardRow.jsx) */
  const KNOWN = ['src/ui/mobile/dash/BoardRow.jsx: --rank-art'];
  const fresh = sameName.filter((s) => !KNOWN.some((k) => s.startsWith(k)));
  check(`§52 same name: no mask is set from the name an <img> in the same file shows (${sameName.length} today, known: the leaderboards' trophies)`,
    fresh.length === 0 && sameName.length <= KNOWN.length, sameName);
}

/* ── §64: the creator's box cannot be shoved ── */
{
  const baseRule = decls.filter((d) => d.sel === '.bt-name-modal' && !d.media);
  const has = (p, v) => baseRule.some((d) => d.prop === p && new RegExp('^' + v + '$').test(d.value));
  check('§64 the box: .bt-name-modal is fixed, overflow hidden, touch-action none and overscroll none (the trap\'s box, no finger can drag it back)',
    has('position', 'fixed') && has('touch-action', 'none') && has('overscroll-behavior', 'none'), baseRule.map((d) => d.prop + ':' + d.value));
  check('§64 hidden: ...its base rule keeps `overflow:hidden` (iOS 14-15 drop `clip` and would spill the layout)', has('overflow', 'hidden'));
  const clip = decls.filter((d) => d.sel.split(',').map((s) => s.trim()).includes('.bt-name-modal') && /pointer\s*:\s*coarse/.test(d.media) && d.prop === 'overflow' && d.value === 'clip');
  check('§64 clip: ...and `overflow:clip` under a coarse pointer (no scroll container to shove)', clip.length >= 1);
  const modal = [...page].filter(([, c]) => /className:"bt-name-modal"/.test(c)).map(([f]) => f);
  const guard = modal.filter((f) => /addEventListener\("scroll",[\w$]+/.test(page.get(f)) && /\.scrollTop\)[\w$]+\.scrollTop=0/.test(page.get(f)));
  check(`§64 guard: ...and the creator puts its scrollTop back to 0 on a scroll (the versions that keep hidden): ${guard.map(base).join(', ')}`, guard.length >= 1, modal);
}

/* ── §77: a fetch that gates a control always settles ── */
{
  const dev = 'src/ui/panels/DevPanel.jsx';
  const c = page.get(dev) || '';
  const m = masked.get(dev) || '';
  const callOf = (cc, mm, i) => { let d = 0, k = i; for (; k < mm.length; k++) { if (mm[k] === '(') d++; else if (mm[k] === ')' && --d === 0) break; } return cc.slice(i, k + 1); };
  const calls = [...m.matchAll(/(?<![\w$.])fetch\(/g)].map((x) => callOf(c, m, x.index + 5));
  const helper = /const fetchWithTimeout=async\([^)]*\)=>\{([\s\S]*?)\};/.exec(c);
  check(`§77 test panel: every fetch of the Test panel carries a signal (${calls.length})`, calls.length >= 1 && calls.every((s) => /signal/.test(s)), calls);
  check('§77 test panel: ...from an AbortController a setTimeout aborts (the promise always settles)',
    !!helper && /new AbortController(?:\(\))?[;,]/.test(helper[1]) && /setTimeout\(\(\)=>[\w$]+\.abort\(\)/.test(helper[1]), helper && helper[1].slice(0, 200));
  const goesThrough = (c.match(/(?<![\w$.])fetchWithTimeout\(/g) || []).length;
  check(`§77 test panel: ...and its calls go through it (${goesThrough})`, goesThrough >= 2);
  check('§77 quiet: the refresh the panel makes on opening is quiet (it may not disable a control or write a message)',
    /useEffect\(\(\)=>\{refresh\(true\)\}/.test(c) && /if\(!quiet\)setBusy\(true\)/.test(c));
  /* every other window's and the dash's fetches: a census of those with no
     timeout (the dash's Feedback Send waits on one with its button disabled:
     the trap's shape, stepped in) */
  const KNOWN = {
    'src/ui/mobile/dash/FeedbackPanel.jsx': 3, 'src/ui/mobile/dash/LeaderboardPanel.jsx': 1,
    'src/ui/panels/FeedbackPanel.jsx': 4, 'src/ui/panels/LeaderboardPanel.jsx': 1,
    'src/ui/panels/buildings/ExchangePanel.jsx': 7, 'src/ui/panels/buildings/PartyPanel.jsx': 5,
  };
  const bare = {};
  for (const [f, cc] of page) {
    if (f === dev || !/^src\/ui\/(?:panels|mobile)\//.test(f)) continue;
    const mm = masked.get(f);
    for (const x of mm.matchAll(/(?<![\w$.])fetch\(/g)) {
      if (!/signal/.test(callOf(cc, mm, x.index + 5))) bare[f] = (bare[f] || 0) + 1;
    }
  }
  const over = Object.entries(bare).filter(([f, n]) => n > (KNOWN[f] || 0)).map(([f, n]) => `${f}: ${n} > ${KNOWN[f] || 0}`);
  const total = Object.values(bare).reduce((a, b) => a + b, 0), line = Object.values(KNOWN).reduce((a, b) => a + b, 0);
  check(`§77 census: a fetch with no timeout in a window or the dash: ${total}, at or under the line ${line}, file by file`, over.length === 0, over);
  if (total < line) console.log(`     (room: ${total} under the line ${line}; the gatekeeper may lower it)`);
}

/* ── §85: a token a calc() multiplies holds no % or em ── */
{
  const arith = new Set();
  for (const d of decls) {
    for (const x of d.value.matchAll(/calc\(/g)) {
      let dd = 0, e = x.index + 4;
      for (; e < d.value.length; e++) { if (d.value[e] === '(') dd++; else if (d.value[e] === ')' && --dd === 0) break; }
      /* multiplied or divided: `var(--x) *`, `* var(--x)` (an addition of a
         % to a %, a gradient's stop, stays on one ray: --glow-in) */
      for (const v of d.value.slice(x.index, e).matchAll(/var\(\s*(--[\w-]+)[^()]*(?:\([^()]*\))?[^()]*?\)\s*[*/]|[*/]\s*var\(\s*(--[\w-]+)/g)) arith.add(v[1] || v[2]);
    }
  }
  const relative = decls.filter((d) => d.prop.startsWith('--') && /\d(?:\.\d+)?(?:%|em)(?![a-z])/.test(d.value.replace(/\d(?:\.\d+)?rem/g, '')));
  const bad = relative.filter((d) => arith.has(d.prop)).map((d) => `${d.sel}${d.media ? ' (' + d.media + ')' : ''}: ${d.prop}:${d.value}`);
  check(`§85: no custom property a calc() multiplies or divides holds a % or an em (${arith.size} of them; name what the % meant, e.g. var(--play-w))`,
    arith.size >= 5 && arith.has('--zb-w') && bad.length === 0, bad);
}

/* ── §134: the quest banner is a body portal ── */
{
  const makers = [];
  for (const [f, c] of page) {
    const m = masked.get(f);
    for (const x of c.matchAll(/className:"bt-quest-banner"/g)) {
      /* inside a createPortal(..., document.body)? */
      let portal = false;
      for (const p of m.matchAll(/createPortal\(/g)) {
        if (p.index > x.index) break;
        const e = valueAt(m, p.index + 13);   /* the first argument */
        let d = 0, k = p.index + 12;
        for (; k < m.length; k++) { if (m[k] === '(') d++; else if (m[k] === ')' && --d === 0) break; }
        if (x.index < e && /,\s*document\.body\s*$/.test(c.slice(p.index, k))) portal = true;
      }
      const welcome = /kind==="welcome"&&[^;]{0,40}$/.test(c.slice(Math.max(0, x.index - 120), x.index).replace(/\/\*#__PURE__\*\//g, ''));
      makers.push({ f: base(f), portal, welcome });
    }
  }
  const bad = makers.filter((k) => !k.portal && !k.welcome);
  check(`§134: every quest banner is portalled to document.body, the first join's welcome alone in the wrap (${makers.map((k) => k.f + (k.portal ? ' portal' : k.welcome ? ' welcome' : ' WRAP')).join(', ')})`,
    makers.some((k) => k.portal) && bad.length === 0, bad);
}

process.exit(failed ? 1 : 0);
