/* ═══ v2.3.3241: THE CROWD CAP (src/game/crowdCap.js) ═══
 *
 * The phone draws at most K other players in full: the nearest, and always
 * the ones that matter to you (party, target, fighting you, your duel); the
 * edge of the crowd held a little so it does not flicker.  Checked here:
 *   1. the rule: under K everyone; over K the nearest K; the always-drawn on
 *      top of them; equal distances by id; the edge held only for those
 *      already drawn, and only within CROWD_HOLD places past the K-th;
 *   2. a crowd walking for 2,000 frames: never more than K + CROWD_HOLD,
 *      every always-drawn player drawn every frame, the nearest K always among
 *      the drawn, and far less flicker at the edge (a player drawn again
 *      within a second of going) than with no hold;
 *   3. `?crowd=`.
 * v2.3.5226 (card O PR 6), THE CAP IS A KNOB OF THE LADDER:
 *   4. crowdK() at each rung of the work axis: the owner's 50 at `full`'s
 *      row, 30, then 15; `?crowd=K` wins as before; `?laddercrowd=0` the 50
 *      at any rung (and the knob off the governor's live set); at the
 *      deepest rung the always-drawn are still drawn; the cap read through
 *      laneKnob('crowd') in crowdCap.js, and the renderer asks it each frame.
 * BREAK PROOF (rule 8), tried by hand 2026-11-14:
 *   4. crowdK's `_knob()` as `CROWD_K` (the rung not read)  -> FAIL 4a (50, 50, 50) and 4d
 *      ...entityRenderer.js asking crowdK() once at load (the old const's way)  -> FAIL 4e
 */
import { readFileSync } from 'node:fs';
import { CROWD_K, CROWD_HOLD, crowdPick, crowdFromSearch, crowdK, _resetCrowdK } from '../../src/game/crowdCap.js';
import { setRung, _resetLanes, liveKnobs, AXES, knobAt } from '../../src/game/drawLanes.js';   /* v2.3.5226: the crowd's knob */
import { systemNames, findIn } from '../../tools/guards/lib/filesOf.mjs';   /* v2.3.5226: the renderer read by system, never by its path */

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const ids = (s) => (s ? [...s].sort() : null);

/* ── 1. the rule ───────────────────────────────────────────────────────── */
{
  const c = (id, d, prio = false) => ({ id, d2: d * d, prio });
  check('1a. the owner\'s number is 50', CROWD_K === 50);
  check('1b. no more players than K: everyone (null)', crowdPick([c('a', 10), c('b', 20)], 2, null) === null);
  check('1c. K infinite (?crowd=all): everyone', crowdPick([c('a', 10), c('b', 20), c('c', 30)], Infinity, null) === null);
  const four = [c('d', 400), c('a', 100), c('c', 300), c('b', 200)];
  check('1d. over K: the nearest K', JSON.stringify(ids(crowdPick(four, 2, null))) === JSON.stringify(['a', 'b']));
  const withPrio = [c('d', 400, true), c('a', 100), c('c', 300), c('b', 200)];
  check('1e. the always-drawn (far, in your party) are drawn, and take one of the K places',
    JSON.stringify(ids(crowdPick(withPrio, 2, null))) === JSON.stringify(['a', 'd']));
  const allPrio = [c('d', 400, true), c('a', 100, true), c('c', 300, true)];
  check('1f. more always-drawn than K: all of them, nobody else', JSON.stringify(ids(crowdPick(allPrio.concat([c('z', 1)]), 2, null))) === JSON.stringify(['a', 'c', 'd']));
  const ties = [c('b', 100), c('a', 100), c('c', 100)];
  check('1g. equal distances: by id, whatever the order listed', JSON.stringify(ids(crowdPick(ties, 2, null))) === JSON.stringify(['a', 'b'])
    && JSON.stringify(ids(crowdPick(ties.slice().reverse(), 2, null))) === JSON.stringify(['a', 'b']));
  /* the edge: c was drawn, now just further than b */
  const edge = [c('a', 100), c('b', 200), c('c', 210), c('d', 400)];
  check('1h. the edge is held: drawn last frame and within CROWD_HOLD places of the K-th -- kept (K + 1 drawn)',
    JSON.stringify(ids(crowdPick(edge, 2, new Set(['a', 'c'])))) === JSON.stringify(['a', 'b', 'c']));
  check('1i. ...but not one that was not drawn last frame', JSON.stringify(ids(crowdPick(edge, 2, new Set(['a', 'b'])))) === JSON.stringify(['a', 'b']));
  const many = [c('a', 100), c('b', 200)];
  for (let i = 0; i < CROWD_HOLD; i++) many.push(c('m' + i, 300 + i));
  many.push(c('z', 900));
  check('1j. ...nor one CROWD_HOLD places or more past the K-th', JSON.stringify(ids(crowdPick(many, 2, new Set(['a', 'z'])))) === JSON.stringify(['a', 'b']));
  check('1k. CROWD_HOLD is 8', CROWD_HOLD === 8);
}

/* ── 2. a crowd walking ────────────────────────────────────────────────── */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
{
  const rnd = seeded(20261013);
  const N = 119, K = CROWD_K;
  const ppl = [];
  for (let i = 0; i < N; i++) ppl.push({ id: 'p' + String(i).padStart(3, '0'), x: (rnd() - 0.5) * 1200, y: (rnd() - 0.5) * 1600, vx: (rnd() - 0.5) * 6, vy: (rnd() - 0.5) * 6 });
  const prioIds = new Set(['p007', 'p042', 'p111']);   /* a party of two and a duel */
  let shown = null, shownNoHold = null;
  let maxShown = 0, prioMissed = 0, nearestMissed = 0, flicker = 0, flickerNoHold = 0;
  /* flicker: drawn again within 30 frames (a second) of going */
  const goneAt = new Map(), goneAtNoHold = new Map();
  for (let f = 0; f < 2000; f++) {
    for (const p of ppl) {
      p.x += p.vx; p.y += p.vy;
      if (Math.abs(p.x) > 600) p.vx = -p.vx;
      if (Math.abs(p.y) > 800) p.vy = -p.vy;
    }
    const cands = ppl.map((p) => ({ id: p.id, d2: p.x * p.x + p.y * p.y, prio: prioIds.has(p.id) }));
    const pick = crowdPick(cands, K, shown);
    const pickNoHold = crowdPick(cands, K, null);
    maxShown = Math.max(maxShown, pick ? pick.size : N);
    for (const id of prioIds) if (pick && !pick.has(id)) prioMissed++;
    const nearest = cands.filter((c) => !c.prio).sort((a, b) => (a.d2 - b.d2) || (a.id < b.id ? -1 : 1)).slice(0, K - prioIds.size);
    for (const c of nearest) if (pick && !pick.has(c.id)) nearestMissed++;
    const track = (prev, now, gone, add) => {
      if (!prev) return 0;
      let n = 0;
      for (const id of prev) if (!now.has(id)) gone.set(id, f);
      for (const id of now) if (!prev.has(id) && gone.has(id) && f - gone.get(id) <= 30) n++;
      return n;
    };
    flicker += track(shown, pick, goneAt);
    flickerNoHold += track(shownNoHold, pickNoHold, goneAtNoHold);
    shown = pick; shownNoHold = pickNoHold;
  }
  check(`2a. 2,000 frames of 119 players walking: never more than K + CROWD_HOLD drawn (at most ${maxShown})`, maxShown >= K && maxShown <= K + CROWD_HOLD, { maxShown });
  check('2b. ...the always-drawn drawn every frame', prioMissed === 0, { prioMissed });
  check('2c. ...the nearest K always among the drawn', nearestMissed === 0, { nearestMissed });
  check(`2d. ...and the edge flickers far less with the hold (${flicker} players drawn again within a second of going, against ${flickerNoHold} without)`, flicker < flickerNoHold * 0.25, { flicker, flickerNoHold });
}

/* ── 3. ?crowd= ────────────────────────────────────────────────────────── */
check('3a. ?crowd=30 is a cap of 30', crowdFromSearch('?room=x&crowd=30') === 30);
check('3b. ?crowd=all, =0, =off: no cap', crowdFromSearch('?crowd=all') === Infinity && crowdFromSearch('?a=1&crowd=0') === Infinity && crowdFromSearch('?crowd=off') === Infinity);
check('3c. not given, or nonsense: null (the default)', crowdFromSearch('?room=x') === null && crowdFromSearch('?crowd=abc') === null && crowdFromSearch('') === null);
check('3d. capped at 500', crowdFromSearch('?crowd=99999') === 500);

/* ── 4. the cap is a knob of the ladder (v2.3.5226) ───────────────────── */
{
  _resetLanes();
  _resetCrowdK();
  const crowdAt = AXES.work.map((r, i) => (r.knob === 'crowd' ? i + 1 : 0)).filter(Boolean);
  const caps = [crowdK('')];
  for (const n of crowdAt) { setRung(n, 0, 0); caps.push(crowdK('')); }
  check(`4a. the cap at each rung of the work axis: ${caps.join(', ')} (the owner's 50 at the lane's row, then 30, then 15)`,
    JSON.stringify(caps) === JSON.stringify([50, 30, 15]) && knobAt('full', 'crowd', null) === CROWD_K, caps);
  check('4b. `?crowd=K` wins at any rung, as before (its meaning kept until card O\'s PR 12)', crowdK('?crowd=12') === 12 && crowdK('?crowd=all') === Infinity);
  const hadLoc = Object.prototype.hasOwnProperty.call(globalThis, 'location'), wasLoc = globalThis.location;
  globalThis.location = { search: '?laddercrowd=0' };
  _resetLanes();
  const liveOff = liveKnobs().slice();
  if (hadLoc) globalThis.location = wasLoc; else delete globalThis.location;
  _resetLanes();
  setRung(crowdAt[crowdAt.length - 1], 0, 0);
  check(`4c. \`?laddercrowd=0\`: the owner's 50 at any rung, and the crowd off the governor's live set (${liveOff.join('+')})`,
    crowdK('?laddercrowd=0') === CROWD_K && !liveOff.includes('crowd') && liveKnobs().includes('crowd'), liveOff);
  /* the deepest rung: 15, and the always-drawn still all drawn */
  const far = Array.from({ length: 40 }, (_, i) => ({ id: 'p' + String(i).padStart(2, '0'), d2: (i + 1) * 100, prio: i >= 30 }));
  const kept = crowdPick(far, crowdK(''), null);
  check(`4d. at the deepest crowd rung (${crowdK('')}), every always-drawn player is drawn (10 far away), and the nearest fill the rest`,
    !!kept && kept.size === 15 && far.filter((c) => c.prio).every((c) => kept.has(c.id)) && ['p00', 'p01', 'p02', 'p03', 'p04'].every((id) => kept.has(id)), kept && [...kept]);
  _resetLanes();
  const cc = readFileSync(new URL('../../src/game/crowdCap.js', import.meta.url), 'utf8');
  /* the renderer, found by system (tools/guards/lib/filesOf.mjs): whichever file draws the crowd */
  const hits = (re) => systemNames().flatMap((sys) => findIn(sys, re));
  const asks = hits(/const _crowdK = \(\) => \(_noPeerCull \? Infinity : crowdK\(\)\);/);
  const perFrame = hits(/const _capK = _crowdK\(\);/);
  const atLoad = hits(/crowdFromSearch\(location|_crowdKAtLoad/);
  check(`4e. the cap is read through the lanes' one reader in crowdCap.js, and the renderer asks it every frame (no K fixed at load): ${asks.map((h) => h.file).join(', ')}`,
    /laneKnob\('crowd'\)/.test(cc) && asks.length === 1 && perFrame.length === 1 && perFrame[0].file === asks[0].file && atLoad.length === 0, { asks, perFrame, atLoad });
}

console.log(`\ncrowd-cap: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
