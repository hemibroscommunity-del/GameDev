/* ═══ v2.3.6700: THE LAST FEW CELLS' ANSWERS (card PRT, the performance red team) ═══
 *
 * src/game/hereCells.js: "what is under my feet" kept for the last four
 * cells, so two places a fraction of a pixel apart in two cells are not a
 * question to the ground worker on every frame.  This plays the page's own
 * rule (hereFor, the one wheelHere asks) against a worker that answers a
 * frame later, the way the real one does:
 *
 *   1. the store: an answer is kept by its cell, a cell's newer answer
 *      replaces its older, the oldest goes past the cap, clear empties it;
 *   2. THE LOOP, played: two places in two cells asked in the same frame,
 *      frame after frame (the renderer's two askers at the arrival point).
 *      With the answers kept: one question a cell, then silence.  With one
 *      answer (the way before, `?herecells=0`): a question EVERY frame --
 *      the fault itself, so a later change that brings it back fails here;
 *   3. a walk still asks at every new cell (the worker's own "where is he"
 *      must stay fresh: its far prefetch reads the last question);
 *   4. an answer is only ever given for its own cell (`fresh` stays true).
 *
 * The page-side proof, on the real page and the real worker, is the phone
 * scenario tools/qa/mp/mp-idlecensus.mjs.
 *
 * BREAK PROOF, each tried by hand, 2026-11-26:
 *   a. hereFor returns `last` for any cell                      -> FAIL 2a-2d, 3, 4b, 4c
 *   b. put() never drops the oldest                             -> FAIL 1d, 1e
 *   c. get() never finds a kept answer                          -> FAIL 1b-1e, 2a, 2c, 2d, 4b
 *   d. HERE_KEEP 1                                              -> FAIL 1e, 1g, 2a, 2c, 2d, 4b
 *
 * Run from the repository's root: node tools/guards/here-cells.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { HERE_KEEP, hereCells, hereFor } from '../../src/game/hereCells.js';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};

/* ── 1. the store ── */
{
  const k = hereCells();
  check('1a: nothing kept at the start', k.size() === 0 && k.get(0, 0) === null);
  const a = { x: 1, y: 1, q: 4 }, a2 = { x: 1, y: 1, q: 9 };
  k.put(a);
  check('1b: an answer is kept by its cell', k.get(1, 1) === a && k.get(1, 2) === null && k.size() === 1);
  k.put(a2);
  check('1c: a cell\'s newer answer replaces its older', k.get(1, 1) === a2 && k.size() === 1);
  for (let i = 0; i < HERE_KEEP; i++) k.put({ x: 10 + i, y: 0, q: i });
  check(`1d: past the cap (${HERE_KEEP}) the oldest goes`, k.size() === HERE_KEEP && k.get(1, 1) === null && k.get(10, 0) !== null, { size: k.size() });
  k.put({ x: 99, y: 0, q: 0 });
  check('1e: ...one at a time, the newest kept', k.size() === HERE_KEEP && k.get(10, 0) === null && k.get(99, 0) !== null && k.get(11, 0) !== null);
  k.clear();
  check('1f: clear empties it (another worker, another Wheel)', k.size() === 0 && k.get(99, 0) === null);
  check('1g: the cap is at least the four cells round a corner', HERE_KEEP >= 4, HERE_KEEP);
}

/* The page's side of wheelHere, with a worker that answers at the end of the frame the question was asked in.
   `places` asked in turn within each frame; returns the questions asked and the answers given. */
function play(frames, placesOf, kept) {
  const CELL = 24;
  let last = null, asked = null, asks = 0;
  const given = [];
  for (let f = 0; f < frames; f++) {
    for (const [x, y] of placesOf(f)) {
      const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
      const at = hereFor(last, kept, cx, cy);
      if (!at && !asked) { asked = { x: cx, y: cy }; asks++; }
      const h = at || last;
      given.push(h ? { cell: [cx, cy], from: [h.x, h.y], fresh: h.x === cx && h.y === cy } : null);
    }
    /* the worker's answer arrives between frames */
    if (asked) { last = { x: asked.x, y: asked.y, q: 1 }; if (kept) kept.put(last); asked = null; }
  }
  return { asks, given };
}

/* ── 2. the loop, played: the arrival point, your place and your place as drawn ── */
{
  /* 87168 and 87456 are whole cells' edges (24 game px); the drawn place is a fraction of a pixel up and left */
  const two = () => [[87167.516, 87455.795], [87168, 87456]];
  const now = play(600, two, hereCells());
  check(`2a: two places in two cells, 600 frames, the answers kept: a question a cell and no more (${now.asks})`, now.asks === 2, now.asks);
  const was = play(600, two, null);
  check(`2b: ...with one answer (the way before): a question every frame (${was.asks} in 600): the fault, seen`, was.asks >= 598, was.asks);
  /* the corner itself: the four cells round it, all asked every frame */
  const four = () => [[87167.5, 87455.5], [87168, 87455.5], [87167.5, 87456], [87168, 87456]];
  const corner = play(600, four, hereCells());
  check(`2c: the four cells round a corner, asked every frame: four questions and no more (${corner.asks})`, corner.asks === 4, corner.asks);
  const late = corner.given.slice(-4);
  check('2d: ...and once they are kept, every place gets its own cell\'s answer', late.every((g) => g && g.fresh), late);
}

/* ── 3. a walk asks at every new cell ── */
{
  const walk = (f) => [[87168 + f * 24, 87456]];   /* a cell a frame, east */
  const kept = play(200, walk, hereCells());
  const one = play(200, walk, null);
  check(`3: a walk of 200 new cells asks 200 times, kept (${kept.asks}) or not (${one.asks})`, kept.asks === 200 && one.asks === 200, [kept.asks, one.asks]);
}

/* ── 4. an answer is for its own cell ── */
{
  const k = hereCells();
  const a = { x: 5, y: 5, q: 1 }, b = { x: 6, y: 5, q: 2 };
  k.put(a); k.put(b);
  check('4a: the newest answer for its own cell', hereFor(b, k, 6, 5) === b);
  check('4b: a kept answer for its cell', hereFor(b, k, 5, 5) === a);
  check('4c: nothing for a cell never answered', hereFor(b, k, 7, 5) === null && hereFor(b, null, 5, 5) === null);
  check('4d: nothing at all before the first answer', hereFor(null, hereCells(), 0, 0) === null && hereFor(null, null, 0, 0) === null);
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
