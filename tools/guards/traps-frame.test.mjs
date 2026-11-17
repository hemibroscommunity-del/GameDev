/* ═══ v2.3.5764: TRAPS INTO GUARDS, THE FRAME (card V2 PR 5) ═══
 *
 * Grand plan step 8.2, card V2's fifth batch (the form: tools/guards/README.md,
 * "A trap held").  The census of what holds each trap:
 * docs/plan/census/traps.md.
 *
 * TRAPS §170 (the rule): a sum of time from `TICK_RATE` in server/src/ (it times or divides by it: `* TICK_RATE`, `TICK_RATE / 1000`, `/ this.TICK_RATE`) outside the pacer (tickpace.js) is in a function that reads the pacer's real period (`_tickPaceInfo()`, `_tickPace`), or is listed; the list only falls. Break: server/src/tick.js: `export function regenMs(room) { return 20 * room.TICK_RATE; }` -> FAIL (tried 2026-11-17).
 * TRAPS §194 (the rule): no `getContext(...)` in src/ asks for anything but '2d' (a WebGL context is made by whoever asks first: the renderer's, through Pixi, never a bare ask). Break: src/debug/crashTrap.js: `const gl = document.querySelector('canvas').getContext('webgl2');` in _doFlush -> FAIL (tried 2026-11-17).
 * TRAPS §282 (the rule): a read of the screen's pixels in src/ (`readPixels(`, or `toDataURL(` of the game's canvas: `querySelector('canvas')`, `.app.canvas`, `renderer.canvas`, `.view`) is inside a `whenDrawn(...)` callback, or is listed by function. Break: BroTown.jsx: the watchdog's thumbnail read taken out of its whenDrawn -> FAIL (tried 2026-11-17).
 * TRAPS §303 (the rule): no group handed to `settleGroups` (preloadReport.js) carries its own catch, in any spelling: a `.catch(`, a `.then(` with a second argument, a `try` in the group's own code. Break: src/rendering/preloadAnimations.js: `walkability: loadWalkabilityMaps().catch(() => {}),` -> FAIL (tried 2026-11-17).
 *
 * HOW IT READS.  The code of server/src/ (§170: card N's walker,
 * server/test/src-walk.mjs) and src/ (comments dropped: lib/codeOnly.mjs;
 * strings blanked where a name is searched: lib/maskCode.mjs), one function
 * at a time (lib/fnSpans.mjs).  Lists name a function, never a file and
 * line.  Card M holds BroTown.jsx and M2 the two renderers: §282 reads
 * them, by name; a move between their files is never a new place.
 *
 * §170 AND §282 KEEP LISTS (the plan's rule 3): a place not listed fails,
 * the lists only fall, and a listed place that is gone fails until its name
 * comes off.  Each one stepped in today is under Found in
 * docs/plan/status/V2.md, for the card whose file it is.
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §170  tick.js: `export function regenMs(room) { return 20 * room.TICK_RATE; }` -> FAIL §170
 *   §194  crashTrap.js: a bare `getContext('webgl2')` on the queried canvas -> FAIL §194
 *   §282  BroTown.jsx: the watchdog's read out of its whenDrawn          -> FAIL §282
 *   §303  preloadAnimations.js: one group given `.catch(() => {})`       -> FAIL §303
 *         the same as `.then(null, () => {})`                            -> FAIL §303
 *
 * Run from the repository's root: node tools/guards/traps-frame.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';
import { spansOf, namedFn, closeOf } from './lib/fnSpans.mjs';
import { srcFiles } from '../../server/test/src-walk.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
function census(tag, what, found, known) {
  const fresh = [...found].filter((k) => !Object.hasOwn(known, k)).sort();
  const gone = Object.keys(known).filter((k) => !found.has(k));
  check(`${tag}: ${what}: ${found.size} today, none new`, fresh.length === 0, fresh);
  check(`${tag}: every listed place is still there (a fixed one's name comes off)`, gone.length === 0, gone);
}

const code = codeOf(['server/src', 'src']);
const masked = new Map();
const spans = new Map();
const M = (f) => { if (!masked.has(f)) { const m = maskCode(code.get(f)); masked.set(f, m); spans.set(f, spansOf(m)); } return masked.get(f); };
const SERVER = srcFiles().map((f) => 'server/src/' + f);
const PAGE = [...code.keys()].filter((f) => f.startsWith('src/'));

/* ── §170: TICK_RATE is not the real period ── */

/* by function, with what it times: each off by the pacer's difference under load */
const TICK_SUM_KNOWN = {
  _dashTick: 'monstermoves.js: a move\'s step, px a second times TICK_RATE / 1000',
  _resolvePvPAttack: 'combat.js: the lag-comp rewind\'s ticks, half the round trip over TICK_RATE',
  _resolveBurrow: 'telegraph.js: the burrow pile\'s step',
  _tickMonsters: 'index.js: a DoT\'s seconds a tick',
  _applyShopItem: 'cooking.js: the mana surge a tick, REGEN_TICKS * TICK_RATE',
};
{
  const found = new Set();
  let reads = 0;
  for (const f of SERVER) {
    if (f.endsWith('/tickpace.js')) continue;
    const m = M(f);
    const { fns } = spans.get(f);
    for (const x of m.matchAll(/(?:[*/]\s*(?:[\w$]+\.)?TICK_RATE(?![\w$])|(?<![\w$.])(?:[\w$]+\.)?TICK_RATE\s*[*/])/g)) {
      reads++;
      const fnName = namedFn(fns, x.index);
      const fn = fns.filter((s) => s.name === fnName && s.a < x.index && x.index < s.b).pop();
      const body = fn ? m.slice(fn.a, fn.b) : '';
      if (/_tickPaceInfo\(|_tickPace(?![\w$])/.test(body)) continue;
      found.add(fnName);
    }
  }
  check(`§170: the worker's sums of time from TICK_RATE are read (${reads})`, reads >= 4, reads);
  census('§170', 'functions that time something by TICK_RATE without the pacer\'s real period', found, TICK_SUM_KNOWN);
}

/* ── §194: a WebGL context is the renderer's ── */
{
  const asks = [];
  let twoD = 0;
  for (const f of PAGE) {
    const m = M(f);
    const c = code.get(f);
    for (const x of m.matchAll(/\.getContext\(/g)) {
      const o = x.index + x[0].length - 1;
      const arg = c.slice(o + 1, closeOf(m, o)).split(',')[0].trim();
      if (/^["']2d["']$/.test(arg)) { twoD++; continue; }
      asks.push(namedFn(spans.get(f).fns, x.index) + ': ' + arg);
    }
  }
  check(`§194: the page's getContext asks are read (${twoD} for '2d')`, twoD >= 50, twoD);
  check('§194: none asks for a WebGL context (or one by a name not read here): the renderer\'s is Pixi\'s, with its stencil', asks.length === 0, asks);
}

/* ── §282: a read of the screen waits for a drawn refresh ── */

/* by function: reads of a canvas or a target that is not the screen's, or stepped in */
const SCREEN_READ_KNOWN = {
  _wdThumbAsk: 'BroTown.jsx: the watchdog\'s copy, a helper: its callers ask in whenDrawn (the scan cannot follow the call)',
  _startRead: 'selfTest.js: the program\'s self-test reads its own picture, not the screen',
  headPixelsTick: 'headFrames.js: a QA probe that reads the screen each tick (stepped in: Found)',
};
{
  const found = new Set();
  let reads = 0;
  for (const f of PAGE) {
    const m = M(f);
    const c = code.get(f);
    const hits = [...m.matchAll(/\.readPixels\(/g)].map((x) => x.index);
    for (const x of c.matchAll(/(?:querySelector\("canvas"\)|\.app\.canvas|renderer\.canvas|\.view)\.toDataURL\(/g)) hits.push(x.index);
    if (!hits.length) continue;
    /* the spans of every whenDrawn(...) call's arguments */
    const drawn = [...m.matchAll(/(?<![\w$.])whenDrawn\(/g)].map((x) => [x.index, closeOf(m, x.index + x[0].length - 1)]);
    for (const at of hits) {
      reads++;
      if (drawn.some(([a, b]) => a < at && at < b)) continue;
      found.add(namedFn(spans.get(f).fns, at));
    }
  }
  check(`§282: the page's screen reads are read (${reads})`, reads >= 2, reads);
  census('§282', 'reads of the screen\'s pixels outside a whenDrawn callback', found, SCREEN_READ_KNOWN);
}

/* ── §303: settleGroups settles the promises as they are ── */
{
  const calls = [];
  const caught = [];
  for (const f of PAGE) {
    const m = M(f);
    const c = code.get(f);
    for (const x of m.matchAll(/(?<![\w$.])settleGroups\(/g)) {
      if (/function\s*$/.test(m.slice(Math.max(0, x.index - 10), x.index))) continue;   /* its own definition */
      const o = x.index + x[0].length - 1;
      const first = c.slice(o + 1, closeOf(m, o)).split(',')[0].trim();
      let lit = null;
      let litAt = -1;
      if (first.startsWith('{')) { litAt = o + 1 + c.slice(o + 1).indexOf('{'); }
      else if (/^[\w$]+$/.test(first)) {
        const fnName = namedFn(spans.get(f).fns, x.index);
        const fn = spans.get(f).fns.filter((s) => s.name === fnName && s.a < x.index && x.index < s.b).pop();
        const from = fn ? fn.a : 0;
        const d = new RegExp('(?<![\\w$.])' + first.replace(/\$/g, '\\$') + '=\\{').exec(m.slice(from, x.index));
        if (d) litAt = from + d.index + d[0].length - 1;
      }
      if (litAt < 0) { calls.push(f + ': ' + first + ' (not read)'); continue; }
      lit = c.slice(litAt, closeOf(m, litAt) + 1);
      calls.push(namedFn(spans.get(f).fns, x.index) + ': ' + first);
      /* each group's own code: the values at the literal's top level */
      const lm = maskCode(lit);
      let d = 0, s = 1;
      const parts = [];
      for (let k = 1; k < lm.length - 1; k++) {
        const ch = lm[k];
        if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) d--;
        else if (ch === ',' && d === 0) { parts.push([s, k]); s = k + 1; }
      }
      parts.push([s, lm.length - 1]);
      for (const [a, b] of parts) {
        const pm = lm.slice(a, b);
        if (!pm.trim()) continue;
        const name = (/^\s*([\w$]+)\s*:/.exec(pm) || [, pm.trim().slice(0, 20)])[1];
        let bad = /\.catch\(|(?<![\w$])try\{|(?<![\w$])catch\(|(?<![\w$])catch\{/.test(pm);
        for (const t of pm.matchAll(/\.then\(/g)) {
          const tm = pm.slice(t.index + 5);
          const e = closeOf(tm, 0);
          let dd = 0;
          for (let k = 1; k < e; k++) { const ch = tm[k]; if ('([{'.includes(ch)) dd++; else if (')]}'.includes(ch)) dd--; else if (ch === ',' && dd === 0) bad = true; }
        }
        if (bad) caught.push(name);
      }
    }
  }
  check(`§303: the calls of settleGroups and their groups are read (${calls.join('; ')})`, calls.length >= 2 && calls.every((c) => !/not read/.test(c)), calls);
  check('§303: no group carries its own catch (.catch, a .then with a second argument, a try): settleGroups reports a rejected one', caught.length === 0, caught);
}

process.exit(failed ? 1 : 0);
