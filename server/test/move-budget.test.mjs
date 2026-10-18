/* A SCRIPT MOVES NO FASTER THAN THE FASTEST HONEST PLAYER (v2.3.3325).
 *
 * The anti-bot review's fix 7 (docs/specs/antibot-review.md §4; the owner:
 * "Yes" to the bot farming holes).  movement.js MOVE_BUDGET has the rule;
 * what this suite pins:
 *   1. the numbers: a budget that refills at the bound (500 px/s), holds 3 s
 *      of it + 80 px, and starts full on a connection's first judged move;
 *   2. a script: 30 moves a second, each one the old 80 px further, covers the
 *      bound's 500 px/s and one budget -- the old rule gave it 2,900 px/s --
 *      and a bundle of 24 moves in one frame covers what the budget holds;
 *   3. a move past the budget is FOLLOWED as far as it reaches, never refused:
 *      its flags taken, and the tick follows on at the bound's speed until the
 *      worker's copy is there -- 10,000 px away included: no pin, ever (the
 *      old rule's pin shown under the kill switch);
 *   4. honest phones lose nothing: a walk, the fastest legitimate stack, a
 *      sword lunge mid-walk, a roll, a sprint, the Swift Draught, a 3 s
 *      stall's backlog -- every move taken exactly; a 10 s stall's backlog is
 *      followed and caught up within seconds, walking on or standing;
 *   5. the bypasses that made "the next move a first move" are closed: a
 *      refused zone, a server-placed move; the respawn's free move kept (town
 *      is another map), and every writer of that bypass named;
 *   6. the Wheel's way back: out and straight back in is judged from where
 *      you left, the farm's and a dungeon's honest round trips land where
 *      they left and are taken, a flip does not refill the budget, a death
 *      forgets it, and the first way in on a connection is still free (the
 *      join, still open: pinned so changing it is deliberate);
 *   7. the follow ends on a zone change, a death, a server placement, the
 *      kill switch; it runs at the walk's bound, never a sprint's;
 *   8. `movebudget: false` is all of it as before, and the name is one the
 *      live flags route takes;
 *   9. the overview's counts. */
import { readFileSync, readdirSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { MOVE_BUDGET } from '../src/movement.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { flagNameOk } from '../src/liveops.js';

let T = 1_800_000_000_000;
Date.now = () => T;

function makeState() {
  const store = new Map();
  return {
    store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const FULL = MOVE_BUDGET.SPEED_PX * MOVE_BUDGET.BURST_S + MOVE_BUDGET.SLACK_PX;   /* 1,580 */

/* A player on a socket of their own at (1000, 1000), one first move behind
   them (never judged), so the budget is full at the next. */
let seq = 0;
async function setup(opts = {}) {
  const room = new GameRoom(makeState(), env);
  room._liveFlags = opts.flags || {};
  room._saveRpg = () => {}; room._saveRpgVitals = () => {}; room._saveRpgPools = () => {};
  const id = 'bp_mb' + (++seq);
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Mover', phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: opts.z || 'meadow' } }));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  const ps = room.playerState[id];
  const move = (x, y, extra) => room.webSocketMessage(ws, JSON.stringify(Object.assign({ type: 'move', x, y, z: ps.z }, extra || {})));
  await move(ps.x, ps.y);
  const sess = room.sessions.get(ws);
  return { room, ws, ps, move, id, sess };
}
const empty = (ps) => { ps._mvBudget = 0; ps._mvBudgetAt = T; };
/* the tick's follow, `ms` of it at the room's 22 ms */
const ticks = (room, ms) => { for (let t = 0; t < ms; t += 22) { T += 22; room._tickMoveFollow(T); } };

/* An honest phone's walk: east at `pxs` px/s, a move every `gap` ms, for
   `ms`; how many were taken exactly, and how many followed. */
async function walk(p, pxs, ms, gap = 33, extra) {
  let taken = 0, n = 0;
  for (let t = 0; t < ms; t += gap) {
    T += gap;
    const want = p.ps.x + pxs * gap / 1000;
    await p.move(want, p.ps.y, extra);
    n++;
    if (near(p.ps.x, want)) taken++;
  }
  return { taken, n };
}

// ── 1. the numbers ──
{
  check('1. MOVE_BUDGET: the bound\'s 500 px/s, 80 px of slack, 3 s held', MOVE_BUDGET.SPEED_PX === 500 && MOVE_BUDGET.SLACK_PX === 80 && MOVE_BUDGET.BURST_S === 3 && FULL === 1580);
  const p = await setup();
  await p.move(1000 + FULL, 1000);
  check('1. a connection\'s first judged move has a full budget: a 1,580 px jump at once is taken', near(p.ps.x, 1000 + FULL), p.ps.x);
  await p.move(p.ps.x + 1, 1000);
  check('1. ...and spends it: one px more at the same instant moves nothing', near(p.ps.x, 1000 + FULL), p.ps.x);
  T += 1000;
  const x1 = p.ps.x;
  await p.move(x1 + 600, 1000);
  check('1. it refills at the bound: a second later a 600 px claim is followed exactly 500 px', near(p.ps.x, x1 + 500), { moved: p.ps.x - x1 });
  T += 10000;
  const x2 = p.ps.x;
  await p.move(x2 + 3000, 1000);
  check('1. ...and holds at most 3 s of it + 80: ten seconds standing buy 1,580 px, not 5,080', near(p.ps.x, x2 + FULL), { moved: p.ps.x - x2 });
}

// ── 2. a script ──
{
  /* the review's lab: 30 moves a second, each one the old slack further */
  const script = async (p, s) => {
    const x0 = p.ps.x;
    for (let i = 0; i < 30 * s; i++) {
      T += 33;
      await p.move(p.ps.x + 500 * 0.033 + 80, p.ps.y);
    }
    return (p.ps.x - x0) / s;
  };
  const p = await setup();
  const pxs = await script(p, 10);
  check(`2. a script's 30 moves a second, each 80 px past the bound: ${Math.round(pxs)} px/s over 10 s -- the bound's 500 and one budget's 158`, pxs <= 500 + FULL / 10 + 1 && pxs >= 500, pxs);
  const o = await setup({ flags: { movebudget: false } });
  const old = await script(o, 10);
  check(`2. ...where the old per-message 80 let it go ${Math.round(old)} px/s (the kill switch's rule)`, old > 2800, old);

  const b = await setup();
  empty(b.ps);
  T += 33;
  const xb = b.ps.x;
  const frame = [];
  for (let k = 1; k <= 24; k++) frame.push({ type: 'move', x: xb + 79.5 * k, y: 1000, z: 'meadow' });
  await b.room.webSocketMessage(b.ws, JSON.stringify(frame));
  check('2. a bundle of 24 moves in one frame covers what the budget holds (33 ms of it: 16.5 px), not 1,900', b.ps.x - xb <= 16.5 + 1e-6, { moved: b.ps.x - xb });
  const bo = await setup({ flags: { movebudget: false } });
  T += 33;
  const xo = bo.ps.x;
  const frame2 = [];
  for (let k = 1; k <= 24; k++) frame2.push({ type: 'move', x: xo + 79.5 * k, y: 1000, z: 'meadow' });
  await bo.room.webSocketMessage(bo.ws, JSON.stringify(frame2));
  check('2. ...where the old rule took the whole 1,908 px', near(bo.ps.x - xo, 79.5 * 24), { moved: bo.ps.x - xo });
}

// ── 3. followed, never refused ──
{
  const p = await setup();
  empty(p.ps);
  T += 200;
  await p.move(p.ps.x + 5000, 1000, { blocking: true, d: 'right' });
  check('3. a move past the budget is followed as far as it reaches (200 ms: 100 px), not refused', near(p.ps.x, 1100), p.ps.x);
  check('3. ...and its flags are taken as any move\'s (a refusal dropped them: a pinned player\'s guard did nothing)', p.ps.blocking === true && p.ps.d === 'right', { blocking: p.ps.blocking, d: p.ps.d });
  check('3. ...the rest is followed on between the phone\'s moves', !!p.ps._mvFollow && p.room._mvFollowing.has(p.id), p.ps._mvFollow);
  const x0 = p.ps.x;
  p.room.dirtyPlayers.clear();
  ticks(p.room, 1000);
  check('3. the tick follows on at the bound: a second of ticks, 500 px nearer', Math.abs((p.ps.x - x0) - 500) < 12, { moved: p.ps.x - x0 });
  check('3. ...and marks the player for the tick\'s broadcast', p.room.dirtyPlayers.has(p.id));
  ticks(p.room, 9000);
  check('3. ...until the worker\'s copy is where the phone said, and the follow ends', near(p.ps.x, 6000) && !p.ps._mvFollow && !p.room._mvFollowing.has(p.id), { x: p.ps.x, f: p.ps._mvFollow });

  const far = await setup();
  empty(far.ps);
  await far.move(far.ps.x + 10000, 1000);
  ticks(far.room, 20100);
  check('3. a claim 10,000 px off -- six budgets -- is reached in 20 s, with no further move from the phone: no pin', near(far.ps.x, 11000), far.ps.x);

  /* the old pin: a gap the worker never closes while the phone walks */
  const gapRun = async (flags) => {
    const g = await setup({ flags });
    empty(g.ps);
    let phone = g.ps.x + 300;   /* the phone is 300 px ahead of the worker's copy */
    let caughtAt = null;
    for (let t = 0; t < 4000; t += 33) {
      T += 33;
      phone += 250 * 0.033;
      await g.move(phone, 1000);
      if (flags === undefined) g.room._tickMoveFollow(T);
      if (caughtAt === null && near(g.ps.x, phone, 1e-3)) caughtAt = t;
    }
    return { caughtAt, gap: phone - g.ps.x };
  };
  const now = await gapRun(undefined);
  check(`3. a phone 300 px ahead and walking away at 250 px/s: the worker catches up (${now.caughtAt} ms)`, now.caughtAt !== null && now.caughtAt <= 1500, now);
  const old = await gapRun({ movebudget: false });
  check(`3. ...where the old rule never did while it walked (still ${Math.round(old.gap)} px behind after 4 s)`, old.caughtAt === null && old.gap > 300, old);
}

// ── 4. honest phones lose nothing ──
{
  let p = await setup();
  let r = await walk(p, 250, 20000);
  check(`4. a phone's walk, 250 px/s at 30 moves a second for 20 s: every move taken (${r.taken}/${r.n})`, r.taken === r.n && !p.room._mvCount.followed, r);
  p = await setup();
  r = await walk(p, 441, 20000);
  check(`4. the fastest legitimate stack, 441 px/s (the audit note's): every move taken (${r.taken}/${r.n})`, r.taken === r.n, r);
  p = await setup();
  await walk(p, 441, 2000);
  /* the sword's lunge: the phone streams it, 26 px a 60 fps frame
     (game/abilities.js DASH_STEP_PX), up to ~900 px, then walks on */
  r = await walk(p, 1560, 580);
  const r2 = await walk(p, 441, 2000);
  check(`4. a sword lunge mid-run (900 px at 1,560 px/s), then on: every move taken (${r.taken + r2.taken}/${r.n + r2.n})`, r.taken === r.n && r2.taken === r2.n, { r, r2 });
  p = await setup();
  await walk(p, 250, 2000);
  r = await walk(p, 600, 250);   /* a roll: ~150 px in a quarter second */
  check(`4. a roll mid-walk: taken (${r.taken}/${r.n})`, r.taken === r.n, r);
  p = await setup();
  p.ps.maxStamina = 100; p.ps.stamina = 100;
  r = await walk(p, 441 * 1.33, 5000, 33, { sp: 1 });
  check(`4. a sprint at the fastest stack, 587 px/s for 5 s: every move taken (${r.taken}/${r.n})`, r.taken === r.n, { r, st: p.ps.stamina });
  p = await setup();
  p.ps._buffs = { spd: T + 600000, spdMul: 1.5 };
  r = await walk(p, 441 * 1.5, 10000);
  check(`4. the Swift Draught at the fastest stack, 662 px/s for 10 s: every move taken (${r.taken}/${r.n})`, r.taken === r.n, r);

  /* a stalled connection: the moves queue on the phone and arrive at once */
  const stall = async (pxs, s, gap = 66) => {
    const q = await setup();
    await walk(q, pxs, 2000);
    const queued = [];
    let x = q.ps.x;
    for (let t = 0; t < s * 1000; t += gap) { x += pxs * gap / 1000; queued.push(x); }
    T += s * 1000;
    let taken = 0;
    for (const qx of queued) { await q.move(qx, 1000); if (near(q.ps.x, qx)) taken++; }
    return { q, taken, n: queued.length, x };
  };
  const s3 = await stall(441, 3);
  check(`4. a 3 s stall at the fastest stack, its backlog all at once: every move taken (${s3.taken}/${s3.n})`, s3.taken === s3.n, { taken: s3.taken, n: s3.n });
  const s10 = await stall(250, 10);
  check('4. a 10 s stall at a phone\'s walk (2,500 px of backlog): followed, not refused', s10.q.ps.x < s10.x && s10.q.ps.x > s10.x - 1000, { x: s10.q.ps.x, phone: s10.x });
  {
    let phone = s10.x, t = 0;
    while (!near(s10.q.ps.x, phone, 1e-3) && t < 10000) {
      T += 33; t += 33; phone += 250 * 0.033;
      await s10.q.move(phone, 1000);
      s10.q.room._tickMoveFollow(T);
    }
    check(`4. ...and caught up walking on at 250 px/s (${t} ms)`, near(s10.q.ps.x, phone, 1e-3) && t <= 4500, { t, gap: phone - s10.q.ps.x });
  }
  const s10b = await stall(250, 10);
  ticks(s10b.q.room, 2000);
  check('4. ...or standing still, by the tick alone within 2 s', near(s10b.q.ps.x, s10b.x, 1e-3), { x: s10b.q.ps.x, phone: s10b.x });
}

// ── 5. the bypasses ──
{
  const p = await setup();
  empty(p.ps);
  await p.room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x: 99999, y: 99999, z: 'not_a_zone' }));
  check('5. a refused zone writes nothing (as before)', near(p.ps.x, 1000) && p.ps.z === 'meadow', { x: p.ps.x, z: p.ps.z });
  T += 100;
  await p.move(6000, 1000);
  check('5. ...and no longer arms a free move: the next is judged and followed (100 ms: 50 px), not taken', near(p.ps.x, 1050), p.ps.x);
  const o = await setup({ flags: { movebudget: false } });
  await o.room.webSocketMessage(o.ws, JSON.stringify({ type: 'move', x: 99999, y: 99999, z: 'not_a_zone' }));
  await o.move(6000, 1000);
  check('5. ...where before it did: a bogus zone, then anywhere (the kill switch)', near(o.ps.x, 6000), o.ps.x);

  const s = await setup();
  s.ps.x = 2000; s.ps.y = 1000;   /* the worker put them at contact */
  s.room._moveServerPlaced(s.ps);
  await s.move(2010, 1000);
  check('5. a server-placed move: the next is judged from where the worker put them -- a 10 px step taken', near(s.ps.x, 2010), s.ps.x);
  await s.move(9000, 1000);
  check('5. ...and a jump after it followed (what is left of 1,580), not taken', near(s.ps.x, 2010 + FULL - 10), s.ps.x);

  const d = await setup({ z: WHEEL_ZONE });
  d.ps.x = 50000; d.ps.y = 50000;
  d.ps.dying = true; d.ps.respawnAt = T - 1; d.ps.hp = 0;
  d.room._tickPlayerRespawn();
  check('5. the respawn sends them to town (guard)', d.ps.z === 'town' && !d.ps.dying, { z: d.ps.z });
  await d.move(400, 300);
  check('5. ...and their first town move is taken wherever it is: town is another map, not 70,000 px from where they died', near(d.ps.x, 400) && near(d.ps.y, 300), { x: d.ps.x, y: d.ps.y });

  /* every writer of "the next move is a first move" is the kill switch's */
  const src = readdirSync(new URL('../src/', import.meta.url)).filter((f) => f.endsWith('.js'));
  const writers = [];
  for (const f of src) {
    const text = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
    text.split('\n').forEach((line, i) => { if (/lastMoveAt\s*=\s*undefined/.test(line)) writers.push(f + ':' + (i + 1)); });
  }
  const mv = readFileSync(new URL('../src/movement.js', import.meta.url), 'utf8');
  check('5. every "lastMoveAt = undefined" is in movement.js, behind the budget\'s switch or in the respawn (no new bypass)',
    writers.every((w) => w.startsWith('movement.js:')) && writers.length === 3, writers);
  const ab = readFileSync(new URL('../src/abilities.js', import.meta.url), 'utf8');
  const pl = readFileSync(new URL('../src/pvplunge.js', import.meta.url), 'utf8');
  const ix = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  check('5. the sword\'s dash, the lunge at a player and the respawn go through the helpers',
    /this\._moveServerPlaced\(ps\)/.test(ab) && /this\._moveServerPlaced\(ps\)/.test(pl) && /this\._moveRespawned\(ps\)/.test(ix) && /_moveRespawned\(ps\)\s*\{/.test(mv));
}

// ── 6. the Wheel's way back ──
{
  const p = await setup({ z: WHEEL_ZONE });
  await walk(p, 250, 1000);
  const P = { x: p.ps.x, y: p.ps.y };
  T += 500;
  await p.room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x: 300, y: 300, z: 'town' }));
  check('6. out to town (guard: a zone change is never judged)', p.ps.z === 'town' && near(p.ps.x, 300));
  check('6. ...the Wheel remembers where they left it', p.ps._wheelBack && near(p.ps._wheelBack.x, P.x), p.ps._wheelBack);
  T += 500;
  await p.room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x: P.x + 20000, y: P.y, z: WHEEL_ZONE }));
  check('6. straight back in 20,000 px further on: judged from where they left, followed one budget, not taken',
    p.ps.z === WHEEL_ZONE && near(p.ps.x, P.x + FULL), { x: p.ps.x, from: P.x });
  check('6. ...counted as a way back', p.room._mvCount.wayBack === 1, p.room._mvCount);
  check('6. ...and the way back is spent', p.ps._wheelBack === undefined);

  /* the farm: out by the Land Office's door, through town and the farm, back at the same door */
  const f = await setup({ z: WHEEL_ZONE });
  await walk(f, 250, 1000);
  const door = { x: f.ps.x, y: f.ps.y };
  for (const [z, x, y] of [['town', 300, 300], ['farm_home', 500, 600], ['town', 300, 300], [WHEEL_ZONE, door.x + 30, door.y]]) {
    T += 2000;
    await f.room.webSocketMessage(f.ws, JSON.stringify({ type: 'move', x, y, z }));
  }
  check('6. the farm\'s round trip (Wheel, town, farm, town, Wheel) back at the door it left by: taken', f.ps.z === WHEEL_ZONE && near(f.ps.x, door.x + 30), { x: f.ps.x, door: door.x });

  /* a dungeon: in at its mouth, out through town at the mouth */
  const g = await setup({ z: WHEEL_ZONE });
  await walk(g, 250, 1000);
  const mouth = { x: g.ps.x, y: g.ps.y };
  for (const [z, x, y] of [['dungeon_wheel_test_1', 400, 1500], ['town', 300, 300], [WHEEL_ZONE, mouth.x - 200, mouth.y + 150]]) {
    T += 5000;
    await g.room.webSocketMessage(g.ws, JSON.stringify({ type: 'move', x, y, z }));
  }
  check('6. a dungeon\'s round trip, back at its mouth 250 px from where they went in: taken', g.ps.z === WHEEL_ZONE && near(g.ps.x, mouth.x - 200) && near(g.ps.y, mouth.y + 150), { x: g.ps.x, y: g.ps.y, mouth });

  /* a flip does not refill the budget */
  const h = await setup({ z: WHEEL_ZONE });
  await h.move(h.ps.x + FULL, h.ps.y);   /* spends a full budget */
  const H = { x: h.ps.x, y: h.ps.y };
  await h.room.webSocketMessage(h.ws, JSON.stringify({ type: 'move', x: 300, y: 300, z: 'town' }));
  await h.room.webSocketMessage(h.ws, JSON.stringify({ type: 'move', x: H.x + FULL, y: H.y, z: WHEEL_ZONE }));
  check('6. out and back in at once does not buy a fresh budget: the re-entry moves next to nothing', h.ps.x - H.x < 1, { moved: h.ps.x - H.x });

  /* a death forgets it */
  const dd = await setup({ z: WHEEL_ZONE });
  await walk(dd, 250, 1000);
  await dd.room.webSocketMessage(dd.ws, JSON.stringify({ type: 'move', x: 300, y: 300, z: 'town' }));
  dd.ps.dying = true; dd.ps.respawnAt = T - 1; dd.ps.hp = 0;
  dd.room._tickPlayerRespawn();
  await dd.move(320, 300);
  await dd.room.webSocketMessage(dd.ws, JSON.stringify({ type: 'move', x: 87000, y: 87300, z: WHEEL_ZONE }));
  check('6. a death forgets the way back: back in at the Wheel\'s arrival, wherever they died', dd.ps.z === WHEEL_ZONE && near(dd.ps.x, 87000) && near(dd.ps.y, 87300), { x: dd.ps.x, y: dd.ps.y });

  /* the first way in on a connection is free: the join is still open */
  const j = await setup({ z: 'town' });
  await j.room.webSocketMessage(j.ws, JSON.stringify({ type: 'move', x: 123456, y: 45678, z: WHEEL_ZONE }));
  check('6. STILL OPEN: the first way into the Wheel on a connection is taken wherever it is (a join is a fresh state; docs/specs/move-budget.md)', near(j.ps.x, 123456), j.ps.x);

  /* the kill switch: the flip is free again */
  const k = await setup({ z: WHEEL_ZONE, flags: { movebudget: false } });
  const K = { x: k.ps.x, y: k.ps.y };
  await k.room.webSocketMessage(k.ws, JSON.stringify({ type: 'move', x: 300, y: 300, z: 'town' }));
  await k.room.webSocketMessage(k.ws, JSON.stringify({ type: 'move', x: K.x + 20000, y: K.y, z: WHEEL_ZONE }));
  check('6. ...and under `movebudget: false` out and back in lands anywhere, as before', near(k.ps.x, K.x + 20000) && k.ps._wheelBack === undefined, k.ps.x);
}

// ── 7. the follow's ends ──
{
  const start = async () => {
    const p = await setup();
    empty(p.ps);
    await p.move(p.ps.x + 5000, 1000);
    return p;
  };
  let p = await start();
  check('7. (guard) a follow is on', !!p.ps._mvFollow);
  await p.room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x: 300, y: 300, z: 'town' }));
  p.room._tickMoveFollow(T + 22);
  check('7. a zone change ends it (it belongs to the zone it began in)', !p.ps._mvFollow && !p.room._mvFollowing.has(p.id) && near(p.ps.x, 300));
  p = await start();
  p.ps.dying = true;
  const xd = p.ps.x;
  ticks(p.room, 500);
  check('7. a death ends it: no dead body slid across the map', near(p.ps.x, xd) && !p.room._mvFollowing.has(p.id));
  p = await start();
  p.ps.x = 1200; p.room._moveServerPlaced(p.ps);
  ticks(p.room, 500);
  check('7. a server placement ends it: the worker\'s place stands', near(p.ps.x, 1200) && !p.ps._mvFollow);
  p = await start();
  const xk = p.ps.x;
  p.room._liveFlags = { movebudget: false };
  ticks(p.room, 500);
  check('7. the kill switch ends it', near(p.ps.x, xk) && !p.room._mvFollowing.has(p.id));
  p = await setup();
  p.ps.maxStamina = 100; p.ps.stamina = 100;
  empty(p.ps);
  T += 100;
  await p.move(p.ps.x + 5000, 1000, { sp: 1 });
  check('7. a followed sprint step went at the sprint\'s bound (100 ms: 66.5 px)', near(p.ps.x, 1000 + 66.5), p.ps.x);
  const xs = p.ps.x;
  ticks(p.room, 1000);
  check('7. ...but the tick follows at the walk\'s (a sprint is billed by its moves, never by the tick)', Math.abs((p.ps.x - xs) - 500) < 12, { moved: p.ps.x - xs });
}

// ── 8. the kill switch ──
{
  check('8. `movebudget` is a name the live flags route takes (liveops.js flagNameOk)', flagNameOk('movebudget'));
  const o = await setup({ flags: { movebudget: false } });
  T += 200;
  await o.move(o.ps.x + 200, 1000);
  check('8. `movebudget: false`: the old per-message bound -- a 200 px step in 200 ms refused, the worker\'s copy kept (500 x 0.2 + 80 = 180)', near(o.ps.x, 1000), o.ps.x);
  T += 200;
  await o.move(o.ps.x + 170, 1000);
  check('8. ...and a 170 px one taken whole: the 80 again with this message', near(o.ps.x, 1170), o.ps.x);
  o.ps.x = 500; o.room._moveServerPlaced(o.ps);
  check('8. ...a server placement makes the next move a first move again', o.ps.lastMoveAt === undefined);
  o.ps.lastMoveAt = T; o.ps.dying = true; o.ps.respawnAt = T - 1; o.ps.hp = 0;
  o.room._tickPlayerRespawn();
  check('8. ...and the respawn leaves the move clock as it was', o.ps.lastMoveAt === T, o.ps.lastMoveAt);
}

// ── 9. the overview ──
{
  const p = await setup();
  await p.move(1010, 1000);
  empty(p.ps);
  await p.move(5000, 1000);
  const info = p.room._moveBudgetInfo();
  check('9. the overview counts the moves judged, the ones followed, and who is followed now',
    info.on === true && info.judged === 2 && info.followed === 1 && info.following === 1 && info.wayBack === 0, info);
  p.room._liveFlags = { movebudget: false };
  check('9. ...and says when the switch is off', p.room._moveBudgetInfo().on === false);
}

console.log(failures === 0 ? '\nmove-budget: all checks passed' : `\nmove-budget: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
