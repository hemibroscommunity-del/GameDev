/* ═══ v2.3.6360: NO NEW READ OF THE PAGE'S LAYOUT (card LR PR 1; CLAUDE.md §7 "the page's one thread") ═══
 *
 * The freezes cards HB and HB2 keep fixing (58 ms, 81 ms, 114 ms on a slow
 * phone) mostly share one cause: code MEASURES THE PAGE (getBoundingClientRect,
 * clientWidth, innerWidth, getComputedStyle, elementFromPoint, a canvas's
 * measureText in a redraw, querySelectorAll in a timer) inside a React
 * commit, a tap or a frame, so the browser lays the whole page out there and
 * then (docs/plan/census/HB-holds.md, "By cause"; docs/specs/layout-reads.md).
 * The only check was mp-heldsweep, an hours-long run by hand, so new ones
 * slipped in and were found later in batches.  This guard refuses a new one
 * when it is written.  It fails:
 *
 *   1. a read (lib/layoutReads.mjs finds them: every .js/.jsx under src/) that
 *      is neither in an APPROVED place (the measure helpers, a
 *      ResizeObserver's callback, or the top of the game's frame: a function
 *      handed to framePacer.js `beforeDraw`, and a function of its file it
 *      calls by name) nor within its row of the frozen list
 *      (lib/layoutReadsKnown.mjs: file, function, kind, how many);
 *   2. the list's reads over LINE (the census's count: it only falls; a fix
 *      that takes reads away runs `--write`, which lowers the rows and LINE in
 *      the same PR, as player-words.test's lines fall);
 *   3. an APPROVED place that is gone from its file (the spec names it as
 *      THE way: a helper renamed or moved is the spec's change too);
 *   4. its own break proof, played every run on scratch files beside the real
 *      ones: a `clientWidth` in a component's render and a measure in a
 *      function named like a helper in another file, and one beside a
 *      `beforeDraw` but not in it, must fail 1; a read in a ResizeObserver's
 *      callback, in a `beforeDraw` callback or a function it calls, one in a
 *      comment and one in a string must not.
 *
 * BREAK PROOF (rule 8), tried by hand on scratch edits, 2026-11-18 (and put back):
 *   a. src/ui/mobile/dash/NavRail.jsx, in NavRail's render, before its
 *      `return (`: `const zzw = railRef.current ? railRef.current.clientWidth : 0;`
 *                                                                  -> FAIL 1, 2
 *   b. src/ui/panels/JumpButton.jsx:116 `winVw() || 390` -> `window.innerWidth
 *      || 390` (the read HB PR 2 took out)                         -> FAIL 1, 2
 *   c. tools/guards/lib/layoutReadsKnown.mjs: LINE one lower        -> FAIL 2
 *   d. src/ui/mayorScreen.js: `function canvasBox()` renamed `canvasBoxX`
 *      (and its caller)                                         -> FAIL 1, 2, 3
 *   e. src/ui/fixedBox.js: its last `w.innerWidth` taken out: passes, "room:
 *      365 -> 364", and `--write` takes its row off and LINE to 364.
 *   f. (v2.3.6360, the gatekeeper's sitting 51: main + HB2's #2224 merged)
 *      QuestCoach.jsx's beforeDraw callback: `p = readCoachPage()` -> `p =
 *      null` (its reads no longer at the top of the frame)            -> FAIL 1
 *   (and check 4 plays the scratch cases every run.)
 *
 *   node tools/guards/layout-reads.test.mjs            the verdict
 *   node tools/guards/layout-reads.test.mjs --write    lowers the list to what is
 *                                                      found; it never adds a row
 *
 * Run from the repository's root (cd server && npm test runs it with every
 * other guard and suite).  About a second.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { readsOf, tally, layoutFiles, APPROVED, KNOWN_PATH, renderKnown } from './lib/layoutReads.mjs';
import { KNOWN, LINE } from './lib/layoutReadsKnown.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + detail));
};
const key = (r) => r.file + '|' + r.fn + '|' + r.kind;
const known = new Map(KNOWN.map((r) => [key(r), r]));
const sum = (t) => [...t.values()].reduce((s, n) => s + n, 0);

/** the reads over their rows: [{ k, found, listed }] */
function over(t, list = known) {
  const out = [];
  for (const [k, n] of t) {
    const row = list.get(k);
    const listed = row ? row.n : 0;
    if (n > listed) out.push({ k, found: n, listed });
  }
  return out;
}
const say = (o) => o.map((x) => x.k.replace(/\|/g, ' > ') + ' x' + x.found + (x.listed ? ' (listed ' + x.listed + ')' : ' (new)')).join('; ');

const files = layoutFiles();
const reads = readsOf(files);
const t = tally(reads);

if (process.argv.includes('--write')) {
  /* lower each row to what is found, drop the gone ones: never add, never raise */
  const rows = [];
  for (const r of KNOWN) {
    const n = Math.min(r.n, t.get(key(r)) || 0);
    if (n > 0) rows.push({ ...r, n });
  }
  const total = rows.reduce((s, r) => s + r.n, 0);
  writeFileSync(join(ROOT, KNOWN_PATH), renderKnown(rows, Math.min(LINE, total)));
  console.log('wrote ' + KNOWN_PATH + ': ' + total + ' reads (was ' + LINE + ')');
  const o = over(t);
  if (o.length) console.log('NOT listed (never added by --write; docs/specs/layout-reads.md says the ways): ' + say(o));
  process.exit(0);
}

/* 1. no read outside the ways and the list */
{
  const o = over(t);
  check('1. every layout read is in a measure helper, a ResizeObserver\'s callback, the top of the frame, or its row of the list ('
    + reads.length + ' reads: ' + reads.filter((r) => r.approved === 'helper').length + ' in the helpers, '
    + reads.filter((r) => r.approved === 'observer').length + ' in an observer, '
    + reads.filter((r) => r.approved === 'frame-top').length + ' at the top of the frame, ' + sum(t) + ' listed)',
  o.length === 0,
  o.length ? 'a new read of the page\'s layout: ' + say(o)
    + '.  Measure through the ways in docs/specs/layout-reads.md (a kept size: playViewport.js winVw/playVw; '
    + 'a ResizeObserver; after the paint), never a new row of ' + KNOWN_PATH : undefined);
}

/* the frame's top: its functions also called elsewhere, named (the
   gatekeeper's sitting 51: a first reading in a render, or the `?afterpaint=0`
   off-ramp, is allowed; a reviewer reads the line) */
if (reads.elsewhere.length) {
  const seen = new Map();
  for (const e of reads.elsewhere) {
    const k = e.file.replace(/^src\//, '') + ' > ' + e.name;
    seen.set(k, (seen.get(k) || []).concat(e.from));
  }
  console.log('     note: ' + seen.size + ' function(s) measured at the top of the frame are called outside it too: '
    + [...seen].map(([k, v]) => k + ' (from ' + [...new Set(v)].join(', ') + ')').join('; '));
}

/* 2. the count line only falls */
{
  const n = sum(t);
  check('2. the listed reads are no more than LINE: ' + n + ' (line ' + LINE + ')', n <= LINE,
    'run node tools/guards/layout-reads.test.mjs for the new ones');
  const fell = KNOWN.filter((r) => (t.get(key(r)) || 0) < r.n);
  if (n < LINE || fell.length) {
    console.log('     room: ' + LINE + ' -> ' + n + ' (' + fell.length + ' rows fell: '
      + fell.slice(0, 6).map((r) => r.file.replace(/^src\//, '') + ' > ' + r.fn + ' > ' + r.kind).join('; ')
      + (fell.length > 6 ? '; ...' : '') + '); run --write to take it down');
  }
}

/* 3. the approved places are where the spec says */
{
  const gone = [];
  for (const a of APPROVED) {
    let src = '';
    try { src = readFileSync(join(ROOT, a.file), 'utf8'); } catch { /* gone */ }
    const has = (fn) => new RegExp('(?:function\\s+' + fn + '\\s*\\(|(?:const|let|var)\\s+' + fn + '\\s*=)').test(src);
    if (!has(a.fn) && !(a.alias && has(a.alias))) gone.push(a.file + ' > ' + a.fn);
  }
  check('3. the ' + APPROVED.length + ' measure helpers are in their files', gone.length === 0,
    'gone: ' + gone.join('; ') + ' (lib/layoutReads.mjs APPROVED and docs/specs/layout-reads.md "The ways" change with it)');
}

/* 4. the break proof, every run */
{
  const S = {
    'src/ui/panels/ZzLayoutProof.jsx':
      '/* el.clientWidth in a comment is no read */\n'
      + 'export function ZzProof({ r }) { const w = r.current ? r.current.clientWidth : 0; const s = "getBoundingClientRect()"; return <div style={{ width: w }}>{s}</div>; }\n'
      + 'export function zzWatch(el, keep) { const ro = new ResizeObserver(() => { keep(el.clientWidth); }); ro.observe(el); return ro; }\n'
      + 'function zzRead(el) { return el.getBoundingClientRect(); }\n'
      + 'function zzLate(el) { return el.offsetHeight; }\n'
      + 'export function zzAsk(el, keep) { beforeDraw(function () { keep(zzRead(el), el.clientHeight); }); return zzLate(el); }\n',
    'src/ui/ZzNamedLikeAHelper.js':
      'export function canvasBox(c) { return c.getBoundingClientRect(); }\n',
  };
  const scratch = Object.keys(S);
  const r2 = readsOf(files.concat(scratch), (f) => (S[f] !== undefined ? S[f] : readFileSync(join(ROOT, f), 'utf8')));
  const o2 = over(tally(r2)).map((x) => x.k);
  const want = ['src/ui/panels/ZzLayoutProof.jsx|ZzProof|clientWidth', 'src/ui/ZzNamedLikeAHelper.js|canvasBox|getBoundingClientRect',
    'src/ui/panels/ZzLayoutProof.jsx|zzLate|offsetHeight'];
  const extra = r2.filter((r) => scratch.includes(r.file));
  const observed = extra.filter((r) => r.approved === 'observer').length;
  const topped = extra.filter((r) => r.approved === 'frame-top').length;
  const ok = want.every((k) => o2.includes(k)) && o2.filter((k) => k.includes('Zz')).length === 3
    && extra.length === 6 && observed === 1 && topped === 2;
  check('4. the break proof: a clientWidth in a render, a helper\'s name in another file and a read beside a '
    + 'beforeDraw (not in it) fail 1; an observer\'s read, a beforeDraw\'s (and its function\'s), a comment and a string do not', ok,
  JSON.stringify({ over: o2.filter((k) => k.includes('Zz')), found: extra.map((r) => r.fn + ':' + r.kind + ':' + (r.approved || '-')) }));
}

process.exit(failed ? 1 : 0);
