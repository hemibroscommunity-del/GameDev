/* ═══ v2.3.6121: THE LEAGUE'S RUNG 1 -- A SCRIPT ON THE WIRE (GRAND-PLAN 10.7; card LG PR 2) ═══
 *
 * The house's own bot, the easiest rung: it sends what a phone sends, on
 * the wire alone, at machine-perfect timing.  Every number it claims is one
 * an honest phone could claim (the walk at 150 px a second, a swing a
 * 600 ms cycle, a strike after the hits the worker planned): what gives it
 * away is that it never wavers.
 *
 *   harvest  walks dead straight at the next copper vein's centre, starts,
 *            waits exactly the plan, strikes `perfect` with the SAME
 *            fingerprint every time (one recorded gesture, replayed);
 *   fight    stands on one spot with a sword and swings every 600 ms at
 *            whatever is in reach, raising its guard the moment a monster
 *            winds up at it;
 *   cook     lights a fire and cooks to a fixed beat.
 *
 * A bot speaks only through `w`, the league's wire (tools/league/score.mjs
 * makes one on the worker's own room): join, send, wait, and what a phone
 * reads off the worker's messages (its place, the veins, the monsters, a
 * wind-up aimed at it, the hits a harvest was planned).  Rung 2
 * (wire-noise.mjs) is this same script with a person's noise: `noise`
 * below.  The detectors are read, never touched (frozen: main's code).
 *
 * Tools only: nothing here is shipped, and no detector reads it. */

export const RUNG = 1;
export const NAME = 'wire-script';

/* no noise: every wait exact, every walk straight, every gesture the same */
export const NO_NOISE = Object.freeze({
  time: () => 1,                 /* a wait's factor */
  aimOff: () => ({ x: 0, y: 0 }),   /* where it aims, off the vein's centre */
  wobble: () => 0,               /* a step's sideways px */
  fp: (base) => base,            /* the gesture's fingerprint */
  grade: () => 'perfect',
  react: () => 0,                /* ms before answering a wind-up */
  shuffle: () => false,          /* a step of the feet between swings */
  pause: () => 0,                /* a breath between actions, ms */
});

/* the one gesture it replays (numbers inside a person's range: it is the
   SAME numbers every time that are a script's) */
export const REPLAYED_FP = Object.freeze({ len: 812, n: 74, dur: 1530, ent: 0.184, tv: 11.4, vc: 0.27, h: 2766012345 });

const STEP_MS = 100;
const WALK = 150;

/* walk to (tx, ty), a step every STEP_MS, stopping `stop` px short on the
   line; `noise.wobble` puts a step off the line */
async function walk(w, tx, ty, { stop = 0, noise }) {
  const me = w.me();
  let x = me.x, y = me.y;
  for (let guard = 0; guard < 2000 && !w.over(); guard++) {
    const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy);
    if (d <= stop + 0.5) break;
    const step = Math.min(d - stop, (WALK * STEP_MS) / 1000);
    const ux = dx / d, uy = dy / d, side = noise.wobble();
    x += ux * step - uy * side; y += uy * step + ux * side;
    await w.wait(STEP_MS * noise.time());
    await w.send({ type: 'move', x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, z: w.zone, d: 'down', vx: ux * 2.5, vy: uy * 2.5 });
  }
  await w.send({ type: 'move', x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, z: w.zone, d: 'down', vx: 0, vy: 0 });
}

export async function harvest(w, { noise = NO_NOISE } = {}) {
  await w.join();
  let seq = 0, last = null;
  while (!w.over()) {
    const me = w.me();
    /* the nearest live vein at least 60 px off: a walk long enough to judge */
    const node = w.ores().filter((n) => n.alive && n.id !== last && Math.hypot(n.x - me.x, n.y - me.y) >= 60)
      .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    if (!node) { await w.wait(1000); continue; }
    const off = noise.aimOff();
    /* aimed at the centre (or off it), stopping 18 px short on the line */
    await walk(w, node.x + off.x, node.y + off.y, { stop: 18, noise });
    w.mark();
    const ok = await w.send({ type: 'extraction_start', payload: { nodeId: node.id, zone: w.zone, skill: 'mining', hitSeq: ++seq } });
    if (!ok) continue;
    const hits = w.plannedHits(1);
    /* the plan's hits, the settle and the gesture: exactly, or with noise */
    await w.wait((90 + Math.max(0, hits - 1) * 650 + 220 + 1500) * noise.time());
    await w.send({ type: 'node_strike', payload: { id: node.id, zone: w.zone, accuracy: noise.grade(), swipeFp: noise.fp({ ...REPLAYED_FP }) } });
    last = node.id;
    await w.wait(300 * noise.time() + noise.pause());
  }
}

export async function fight(w, { noise = NO_NOISE } = {}) {
  await w.join();
  w.arm('sword');
  let next = w.now(), guardUntil = 0, swings = 0;
  const answered = new Set();
  while (!w.over()) {
    /* a wind-up aimed at it: the guard goes up (after `noise.react` ms) */
    for (const m of w.windups()) {
      const key = m.id + '@' + m.at;
      if (answered.has(key)) continue;
      answered.add(key);
      if (answered.size > 200) answered.delete(answered.values().next().value);
      const r = noise.react();
      if (r > 0) await w.wait(r);
      const me = w.me();
      await w.send({ type: 'move', x: me.x, y: me.y, z: w.zone, d: 'down', vx: 0, vy: 0, blocking: true, ba: Math.atan2(m.y - me.y, m.x - me.x) });
      guardUntil = w.now() + 150;
    }
    if (guardUntil && w.now() >= guardUntil) {
      const me = w.me();
      await w.send({ type: 'move', x: me.x, y: me.y, z: w.zone, d: 'down', vx: 0, vy: 0, blocking: false });
      guardUntil = 0;
    }
    if (w.now() >= next) {
      const me = w.me();
      const near = w.monsters().map((m) => ({ m, d: Math.hypot(m.x - me.x, m.y - me.y) })).filter((o) => o.d <= 140).sort((a, b) => a.d - b.d);
      if (near.length) {
        await w.send({ type: 'monster_damage', payload: { monsterId: near[0].m.id, zone: w.zone, slot: 'melee' } });
        swings++;
        if (noise.shuffle(swings)) {
          const s = me;
          await w.send({ type: 'move', x: s.x + (w.rand() * 16 - 8), y: s.y + (w.rand() * 16 - 8), z: w.zone, d: 'down', vx: 0, vy: 0 });
        }
      } else if (!w.monsters().some((m) => Math.hypot(m.x - me.x, m.y - me.y) <= 500)) {
        /* nothing coming: walk to the nearest (a script still has to find a fight) */
        const t = w.monsters().sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (t) await walk(w, t.x, t.y, { stop: 100, noise });
      }
      next = w.now() + 600 * noise.time() + noise.pause();
    }
    await w.wait(50);
  }
}

export async function cook(w, { noise = NO_NOISE } = {}) {
  await w.join();
  let seq = 0, fireAt = -Infinity;
  while (!w.over()) {
    if (w.now() - fireAt > 40000) { await w.send({ type: 'firemaking_request', payload: { invKey: 'wood_pine_log' } }); fireAt = w.now(); await w.wait(200); }
    w.mark();
    const ok = await w.send({ type: 'extraction_start', payload: { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: ++seq } });
    if (!ok) continue;
    const hits = w.plannedHits(2);
    await w.wait((90 + Math.max(0, hits - 1) * 650 + 220 + 1500) * noise.time());
    await w.send({ type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } });
    await w.wait(400 * noise.time() + noise.pause());
  }
}

export const SESSIONS = { harvest, fight, cook };
