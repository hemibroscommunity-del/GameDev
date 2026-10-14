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
 */
import { CROWD_K, CROWD_HOLD, crowdPick, crowdFromSearch } from '../../src/game/crowdCap.js';

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

console.log(`\ncrowd-cap: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
