/* ═══ v2.3.6700: A POLLED VIEW DRAWS AGAIN ONLY ON A CHANGE (card PRT, the performance red team) ═══
 *
 * src/game/drawOnChange.js: a control that shows the game's state looks at it
 * on a clock and tells React to draw it again.  The rule: draw only when the
 * KEY of what it shows is not the last one, or while something on it moves
 * by the clock.  The Element Burst button is its first user; the page-side
 * proof is tools/qa/mp/mp-idlecensus.mjs (0 renders a frame, standing).
 *
 *   1. the first look draws; the same key again does not; a new key does;
 *   2. while it moves, every look draws -- and the look after it stops draws
 *      only if the key changed;
 *   3. an hour of looks at a hidden button (60 a second) is one draw;
 *   4. a cast, played: the button's own keys through a cooldown and its
 *      flash -- drawn every frame of the 3 s, once when the flash starts,
 *      once when it ends, and not again.
 *
 * BREAK PROOF, each tried by hand, 2026-11-26:
 *   a. drawNow returns true always                    -> FAIL 1b, 1c, 1e, 2b, 3, 4b
 *   b. drawNow ignores `moving`                        -> FAIL 2a, 4a
 *   c. drawNow never stores the key                    -> FAIL 1b, 1c, 1e, 2b, 3, 4b
 *
 * Run from the repository's root: node tools/guards/draw-on-change.test.mjs
 */
import { drawStore, drawNow } from '../../src/game/drawOnChange.js';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};

/* ── 1 ── */
{
  const st = drawStore();
  check('1a: the first look draws', drawNow(st, 'hidden', false) === true);
  check('1b: the same key again does not', drawNow(st, 'hidden', false) === false && drawNow(st, 'hidden', false) === false);
  check('1c: a new key does, once', drawNow(st, 'shown|fire', false) === true && drawNow(st, 'shown|fire', false) === false);
  check('1d: ...and back again does', drawNow(st, 'hidden', false) === true);
  check('1e: the store counts looks and draws', st.looks === 6 && st.draws === 3, st);
}

/* ── 2 ── */
{
  const st = drawStore();
  drawNow(st, 'k', false);
  const during = [drawNow(st, 'k', true), drawNow(st, 'k', true), drawNow(st, 'k', true)];
  check('2a: while it moves, every look draws', during.every((v) => v === true), during);
  check('2b: the look after it stops, the key the same: no draw', drawNow(st, 'k', false) === false);
  drawNow(st, 'k', true);
  check('2c: ...the key changed: a draw', drawNow(st, 'k2', false) === true);
}

/* ── 3 ── */
{
  const st = drawStore();
  let draws = 0;
  for (let i = 0; i < 60 * 3600; i++) if (drawNow(st, 'hidden', false)) draws++;
  check(`3: an hour of looks at a hidden button, 60 a second: one draw (${draws} of ${st.looks})`, draws === 1 && st.looks === 216000, draws);
}

/* ── 4. a cast, played at 60 looks a second: 1 s ready, 3 s cooling, 0.7 s of flash, 2 s ready ── */
{
  const st = drawStore();
  const CD = 3000, FLASH = 700, STEP = 1000 / 60;
  let draws = 0, coolingDraws = 0, coolingLooks = 0;
  const castAt = 1000;
  for (let t = 0; t < 6700; t += STEP) {
    const cooling = t >= castAt && t < castAt + CD;
    const flash = t >= castAt + CD && t < castAt + CD + FLASH;
    const key = 'shown||fire|' + (cooling ? 'cooling' : 'ready') + (flash ? '|flash' : '');
    const d = drawNow(st, key, cooling);
    if (d) draws++;
    if (cooling) { coolingLooks++; if (d) coolingDraws++; }
  }
  check(`4a: every frame of the cooldown is drawn (${coolingDraws} of ${coolingLooks})`, coolingDraws === coolingLooks && coolingLooks >= 175, [coolingDraws, coolingLooks]);
  /* outside the cooldown: the first look, the flash starting, the flash ending */
  check(`4b: outside it, three draws in 3.7 s: the first look, the flash on, the flash off (${draws - coolingDraws})`, draws - coolingDraws === 3, draws - coolingDraws);
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
