#!/usr/bin/env node
/* ═══ v2.3.6820: HOW OFTEN IS THE LOCK OFF THE NEAREST? (card LOCK, reading 1) ═══
 *
 * The owner, 2026-11-26: "it will lock on the wrong target".  Measured in
 * node, before the mend and after it: a few thousand made-up fights (two to
 * eight monsters walking and closing, the player walking with the stick and
 * standing to fight, the sword's ring of 440 held to 550 as in the game), each
 * frame put through game/lockPick.js twice: today's rule (`near: false`, the
 * 12% step everywhere: `?locknear=0`) and the new one.
 *
 * "Off the nearest": a frame with candidates where the lock is not on the
 * one nearest the body's FEET (what targeting.js measures to: monPos is
 * renderX/renderY, the ground point).  Split by cause:
 *   step     the held one is inside the ring and the nearer rival is not 12%
 *            nearer (today's rule everywhere; the new one outside reach);
 *   hold     the held one is past the ring (440-550): the hysteresis;
 *   dwell    the new rule's 120 ms wait inside reach;
 *   pushed   the stick chose it, pushed toward it (the new rule; the player's
 *            choice, not a fault).
 * And the measuring point: how often the monster nearest by its feet is not
 * the one whose drawn BODY is nearest (the swing measures to the body centre
 * less its hit radius: a tall or wide monster).  Reported, not mended.
 *
 *   node tools/qa/lock-census.mjs [--fights 3000] [--seed 7]
 * The numbers go in the PR body (card LOCK's "Done when").
 */
import { lockPick, reachHas, LOCK_PICK } from '../../src/game/lockPick.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const FIGHTS = arg('--fights', 3000), SEED = arg('--seed', 7);
const FPS = 60, DT = 1000 / FPS, SECS = 20;
const RING = 440, HOLD = 550, SWORD = 72;   /* TARGET_PERIMETER_PX 220 x 2; x TARGET_HYST 1.25; GS_OUTER_RADIUS */
const PLAYER_PX = 3;                       /* a frame's walk, about 180 px a second */
/* the shapes (gameSystems monsterBodyOffsetY / monsterMeleeHitRadius) and a boss's size */
const SHAPES = [
  { n: 'fodder', up: 23, r: 24, w: 5 }, { n: 'snowman', up: 19, r: 32, w: 2 }, { n: 'fireGoblin', up: 28, r: 14, w: 2 },
  { n: 'mummy', up: 48, r: 40, w: 2 }, { n: 'skeleton', up: 60, r: 50, w: 1 }, { n: 'boss', up: 23 * 2.5, r: 24 * 2.5, w: 0.5 },
];

let rs = SEED >>> 0;
const rnd = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
const pickShape = () => { const tot = SHAPES.reduce((a, s) => a + s.w, 0); let x = rnd() * tot; for (const s of SHAPES) { x -= s.w; if (x <= 0) return s; } return SHAPES[0]; };

function newTally() { return { frames: 0, off: 0, offReach: 0, cause: { step: 0, hold: 0, dwell: 0, pushed: 0, other: 0 }, pushNow: 0, pushAway: 0, eps: [], cur: 0 }; }
const T = { old: newTally(), neu: newTally() };
let bodyDiffer = 0, withCands = 0;

for (let f = 0; f < FIGHTS; f++) {
  const P = { x: 0, y: 0 };
  const n = 2 + Math.floor(rnd() * 7);
  const ms = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, d = 150 + rnd() * 450, s = pickShape();
    ms.push({ key: i, x: Math.cos(a) * d, y: Math.sin(a) * d, sp: 0.8 + rnd() * 1.4, stop: 40 + rnd() * 50, shape: s, alive: true, hp: 1 + Math.floor(rnd() * 6), jit: rnd() * 6.28 });
  }
  /* the player: walks a leg with the stick (the push is the walk), stands to fight, walks again */
  let walk = null, legLeft = 0;
  const L = { old: null, neu: null }, M = { old: { rival: null, since: 0, pushed: null }, neu: { rival: null, since: 0, pushed: null } };
  for (let k = 0; k < SECS * FPS; k++) {
    const now = k * DT;
    if (legLeft <= 0) {
      if (walk) { walk = null; legLeft = 30 + Math.floor(rnd() * 120); }
      else { const a = rnd() * Math.PI * 2; walk = { x: Math.cos(a), y: Math.sin(a) }; legLeft = 20 + Math.floor(rnd() * 90); }
    }
    legLeft--;
    if (walk) { P.x += walk.x * PLAYER_PX; P.y += walk.y * PLAYER_PX; }
    for (const m of ms) {
      if (!m.alive) continue;
      const dx = P.x - m.x, dy = P.y - m.y, d = Math.hypot(dx, dy);
      if (d > m.stop) { m.x += dx / d * m.sp; m.y += dy / d * m.sp; }
      else { m.jit += 0.05; m.x += Math.cos(m.jit) * 0.6; m.y += Math.sin(m.jit) * 0.6; }   /* a fight's shuffle */
      if (d < 120 && rnd() < 0.004) { if (--m.hp <= 0) m.alive = false; }   /* the sword's work */
    }
    const live = ms.filter((m) => m.alive);
    const cands = live.map((m) => ({ key: m.key, m, x: m.x, y: m.y, d2: (m.x - P.x) ** 2 + (m.y - P.y) ** 2,
      inReach: reachHas(P.x, P.y, m.x, m.y, m.shape.up, SWORD, m.shape.r) }))
      .filter((c) => c.d2 <= RING * RING).sort((a, b) => a.d2 - b.d2);
    if (cands.length) {
      withCands++;
      let bb = null, bg = Infinity;
      for (const c of cands) { const g = Math.hypot(c.x - P.x, c.y - P.y - c.m.shape.up) - c.m.shape.r; if (g < bg) { bg = g; bb = c; } }
      if (bb !== cands[0]) bodyDiffer++;
    }
    for (const w of ['old', 'neu']) {
      const tl = T[w];
      const hm = L[w] != null ? ms[L[w]] : null;
      const hd2 = hm ? (hm.x - P.x) ** 2 + (hm.y - P.y) ** 2 : 0;
      const held = hm && hm.alive && hd2 <= HOLD * HOLD
        ? { key: hm.key, d2: hd2, inReach: reachHas(P.x, P.y, hm.x, hm.y, hm.shape.up, SWORD, hm.shape.r) } : null;
      if (!held) L[w] = null;
      const out = lockPick({ cands, held, push: walk, px: P.x, py: P.y, now, mem: M[w], near: w === 'neu' }, {});
      if (out.take) L[w] = out.take.key;
      if (!cands.length) { if (tl.cur) { tl.eps.push(tl.cur); tl.cur = 0; } continue; }
      tl.frames++;
      if (L[w] !== cands[0].key) {
        tl.off++;
        if (cands[0].inReach) tl.offReach++;
        tl.cur++;
        const why = out.rule;
        const lm = L[w] != null ? ms[L[w]] : null;
        const ld2 = lm ? (lm.x - P.x) ** 2 + (lm.y - P.y) ** 2 : 0;
        if (why === 'push' || why === 'pushed') {
          tl.cause.pushed++;
          if (why === 'push') {
            tl.pushNow++;
            const bx = lm.x - P.x, by = lm.y - P.y;
            if (walk && bx * walk.x + by * walk.y <= 0) tl.pushAway++;   /* every tie behind the walk: the stick chose among them by the least-behind */
          }
        }
        else if (why === 'dwell') tl.cause.dwell++;
        else if (lm && ld2 > RING * RING) tl.cause.hold++;
        else if (why === 'held') tl.cause.step++;
        else tl.cause.other++;
      } else if (tl.cur) { tl.eps.push(tl.cur); tl.cur = 0; }
    }
  }
  for (const w of ['old', 'neu']) if (T[w].cur) { T[w].eps.push(T[w].cur); T[w].cur = 0; }
}

const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '0.0') + '%';
const ms = (fr) => Math.round(fr * DT);
function line(name, t) {
  const e = t.eps.slice().sort((a, b) => a - b);
  const med = e.length ? e[Math.floor(e.length / 2)] : 0, p90 = e.length ? e[Math.floor(e.length * 0.9)] : 0, mx = e.length ? e[e.length - 1] : 0;
  const notChosen = t.off - t.cause.pushed;
  console.log(`${name}: off the nearest ${pct(t.off, t.frames)} of fight frames (${pct(notChosen, t.frames)} not chosen by the stick); ` +
    `with the nearest INSIDE reach ${pct(t.offReach, t.frames)}; ${e.length} spells, median ${ms(med)} ms, 90th ${ms(p90)} ms, longest ${ms(mx)} ms`);
  if (t.cause.pushed) console.log(`   chosen by the stick: ${pct(t.pushNow, t.cause.pushed)} while pushed (of those ${pct(t.pushAway, t.pushNow)} with the pick behind the walk)`);
  console.log(`   causes (share of the off frames): step ${pct(t.cause.step, t.off)}, hold 440-550 ${pct(t.cause.hold, t.off)}, dwell ${pct(t.cause.dwell, t.off)}, chosen by the stick ${pct(t.cause.pushed, t.off)}, other ${pct(t.cause.other, t.off)}`);
}
console.log(`lock census: ${FIGHTS} fights x ${SECS} s at ${FPS} fps (seed ${SEED}); dwell ${LOCK_PICK.DWELL_MS} ms, tie ${LOCK_PICK.TIE}, far step ${LOCK_PICK.FAR_STEP}, reach ${SWORD} + hit radius + ${LOCK_PICK.LUNGE_PX} (to the body centre)`);
line('today  (?locknear=0)', T.old);
line('new    (the default)', T.neu);
console.log(`measuring point: the monster nearest by its feet is not the one whose drawn body is nearest in ${pct(bodyDiffer, withCands)} of fight frames (reported, not mended: the lock still orders by the feet)`);
