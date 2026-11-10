/* The pet's fetch is given the time -- v2.3.4388 (sweep 2026-11-03, VA U1-1;
 * spec docs/specs/pet-fetch.md).
 *
 * The pet block in BroTown.jsx's game loop read the frame's `now`, but the
 * loop sets `var now = performance.now()` further down (the broadcast), so
 * `now` was the hoisted undefined there.  The fetch's timers compared against
 * undefined and never fired (a pet never gave up on a pile it could not
 * reach; a skipped pile was skipped for good), and the playful and curious
 * pets' idle sway, sin(now / 300), made their place NaN: a pet never drawn.
 *
 * This runs the REAL code: src/game/petFetch.js, and the pet block cut out of
 * src/ui/BroTown.jsx (from "Initialize pet position" to "AUTO-LOOT"), with
 * `now` as the loop has it at that point (undefined unless the loop sets it
 * before the cut).  Time is the clock this test passes in, frame by frame, at
 * a slow box's 12 frames a second and a phone's 60 (TRAPS §200): never a
 * count of frames.
 *
 *   1. THE CUT: the block is found and calls petFetchStep.
 *   2. EVERY PERSONALITY, IDLE: no place is ever NaN, over 10 s.
 *   3. EVERY PERSONALITY, A PILE IT CANNOT REACH (ringed by a wall it slides
 *      round): no place is ever NaN; it gives up at GIVE_UP_MS (by the clock,
 *      within one frame); it is home or released by BACK_MS; the pile is
 *      skipped, then tried again once SKIP_MS has passed.
 *   4. A PILE THE VACUUM NEVER ASKS FOR: the pet waiting at it gives up at
 *      GIVE_UP_MS too.
 *   5. THE GUARD: a pet whose place is NaN (x, or y alone) is put back beside
 *      its player within the frame; petPlaceBad's cases.
 *   6. NO CLOCK, NO FETCH: petFetchStep without a time never starts a run.
 */
import { readFileSync } from 'node:fs';
import * as PF0 from '../../src/game/petFetch.js';
/* a missing helper fails its checks, it does not stop the suite */
const PF = { ...PF0, petPlaceBad: PF0.petPlaceBad || (() => false) };

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

const src = readFileSync(new URL('../../src/ui/BroTown.jsx', import.meta.url), 'utf8');
const loopAt = src.indexOf('var _gameLoop = function gameLoop(');   /* v2.3.4400: the loop takes its animation frame's timestamp (game/framePacer.js) */
const a = src.indexOf('/* Initialize pet position */', loopAt);
const b = src.indexOf('/* AUTO-LOOT', a);
const cut = (loopAt > 0 && a > 0 && b > a) ? src.slice(a, b) : '';
check('1a the pet block is cut from the game loop', cut.length > 0 && cut.length < 12000, { loopAt, a, b });
check('1b it calls the real petFetchStep', /petFetchStep\(S\._petFetch,/.test(cut));
/* `now` as the loop has it at the cut: set before it, or the hoisted undefined */
const nowSetBefore = /(^|[^\w.$])now\s*=[^=]/.test(src.slice(loopAt, a).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''));

const SPEED = 2.5;
const names = ['PET_FETCH', 'petFetchStep', 'petFetchState', 'petFetchHolds', 'petPlaceBad', 'SPEED', 'performance'];
// eslint-disable-next-line no-new-func
const block = new Function('S', 'P', 'pet', '_petBlockedAt', '_petWaterAt', '__clock', ...names,
  (nowSetBefore ? 'var now = __clock();\n' : 'var now;\n') + cut);

const PERSONALITIES = ['playful', 'lazy', 'curious', 'anxious', 'bold'];   /* src/data/gameSystems.js */

function world(fps, opts) {
  let t = 1000;
  const clock = () => t;
  const perf = { now: clock };
  const S = {
    myId: 'me', currentZone: 'wheel', _dtScale: 60 / fps, rpg: { hp: 100 },
    _serverCaps: { petfetch: true, petLoot: true }, groundLoot: opts.piles || [],
  };
  const P = { x: 1000, y: 1000 };
  const pet = { personality: opts.personality };
  const frame = () => {
    block(S, P, pet, opts.blockedAt || (() => false), () => false, clock,
      PF.PET_FETCH, PF.petFetchStep, PF.petFetchState, PF.petFetchHolds, PF.petPlaceBad, SPEED, perf);
    t += 1000 / fps;
  };
  return { S, P, frame, now: clock };
}

/* 2. idle, every personality, at two frame rates */
for (const fps of [12, 60]) {
  for (const personality of PERSONALITIES) {
    const w = world(fps, { personality });
    let bad = 0, first = null;
    const end = w.now() + 10000;
    while (w.now() < end) {
      w.frame();
      if (!Number.isFinite(w.S._petX) || !Number.isFinite(w.S._petY)) { bad++; if (!first) first = { t: w.now(), x: w.S._petX, y: w.S._petY }; }
    }
    const d = Math.hypot(w.S._petX - w.P.x, w.S._petY - w.P.y);
    check(`2 ${personality} @${fps} fps idle: never NaN over 10 s, at your heels`, bad === 0 && d < 80, { bad, first, d });
  }
}

/* 3. a pile it cannot reach: a wall ring 100-130 px round it (the pet slides
   round the ring and never gets in, a building it cannot get round) */
const PILE = { x: 1300, y: 1000 };
const ring = (x, y) => { const r = Math.hypot(x - PILE.x, y - PILE.y); return r > 100 && r < 130; };
const mkPile = () => ({ _serverLoot: true, lootId: 'L1', x: PILE.x, y: PILE.y, recipients: ['me'] });
for (const fps of [12, 60]) {
  for (const personality of PERSONALITIES) {
    const w = world(fps, { personality, piles: [mkPile()], blockedAt: ring });
    const G = PF.PET_FETCH;
    let bad = 0, goAt = null, backAt = null, why = null, freeAt = null, retryAt = null, prev = null;
    const end = w.now() + G.GIVE_UP_MS + G.SKIP_MS + 3000;
    while (w.now() < end) {
      const t = w.now();
      w.frame();
      const F = w.S._petFetch, ph = F ? F.phase : null;
      if (!Number.isFinite(w.S._petX) || !Number.isFinite(w.S._petY)) bad++;
      if (ph === 'go' && prev !== 'go') { if (goAt === null) goAt = t; else if (backAt !== null && retryAt === null) retryAt = t; }
      if (ph === 'back' && prev === 'go' && backAt === null) { backAt = t; why = F.why; }
      if (ph === null && prev === 'back' && freeAt === null) freeAt = t;
      prev = ph;
    }
    const tag = `3 ${personality} @${fps} fps, a walled-in pile:`;
    const frameMs = 1000 / fps;
    check(`${tag} never NaN`, bad === 0, { bad });
    check(`${tag} it runs`, goAt !== null, { goAt });
    check(`${tag} gives up by the clock at GIVE_UP_MS`, backAt !== null && why === 'time' &&
      backAt - goAt > G.GIVE_UP_MS && backAt - goAt <= G.GIVE_UP_MS + frameMs + 0.001, { goAt, backAt, why, ran: backAt - goAt });
    check(`${tag} back with the follow within BACK_MS`, freeAt !== null && freeAt - backAt <= G.BACK_MS + frameMs + 0.001, { backAt, freeAt });
    check(`${tag} skipped SKIP_MS, then tried again`, retryAt !== null && retryAt - backAt > G.SKIP_MS &&
      retryAt - backAt <= G.SKIP_MS + G.LOOK_MS + 2 * frameMs + 0.001, { backAt, retryAt });
  }
}

/* 4. a pile it reaches but the vacuum never asks for (no _petPickupPending) */
{
  const w = world(12, { personality: 'playful', piles: [mkPile()] });
  let goAt = null, backAt = null, atPile = false;
  const end = w.now() + 8000;
  while (w.now() < end && backAt === null) {
    const t = w.now();
    w.frame();
    const F = w.S._petFetch;
    if (F.phase === 'go' && goAt === null) goAt = t;
    if (F.atPile) atPile = true;
    if (F.phase === 'back' && backAt === null) backAt = t;
  }
  check('4 a pile never asked for: waits at it, gives up at GIVE_UP_MS', atPile && backAt !== null &&
    backAt - goAt > PF.PET_FETCH.GIVE_UP_MS && backAt - goAt <= PF.PET_FETCH.GIVE_UP_MS + 1000 / 12 + 0.001, { atPile, goAt, backAt });
}

/* 5. the guard */
for (const [label, bx, by] of [['x', NaN, 1020], ['y alone', 970, NaN], ['undefined', undefined, undefined]]) {
  for (const personality of ['curious', 'anxious']) {
    const w = world(60, { personality });
    w.S._petX = bx; w.S._petY = by;
    w.frame();
    const d = Math.hypot(w.S._petX - w.P.x, w.S._petY - w.P.y);
    check(`5 a ${personality} pet whose ${label} is not a number is back beside you`, Number.isFinite(w.S._petX) && Number.isFinite(w.S._petY) && d < 80, { x: w.S._petX, y: w.S._petY });
  }
}
check('5 petPlaceBad', PF.petPlaceBad(NaN, 1) && PF.petPlaceBad(1, NaN) && PF.petPlaceBad(undefined, 1) && PF.petPlaceBad(1, Infinity) &&
  !PF.petPlaceBad(0, 0) && !PF.petPlaceBad(1000.5, -3));

/* 6. no clock, no fetch */
{
  const F = PF.petFetchState();
  const c = { now: undefined, zone: 'wheel', me: 'me', piles: [mkPile()], px: 1000, py: 1000, petX: 970, petY: 1020, stepPx: 5, pace: 5 };
  const r = PF.petFetchStep(F, c);
  check('6 petFetchStep with no time starts no run', r === null && F.phase === null && F.skip.size === 0, { r, phase: F.phase });
  const r2 = PF.petFetchStep(F, { ...c, now: 5000 });
  check('6 ...and with one it does', r2 !== null && F.phase === 'go', { r2, phase: F.phase });
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
