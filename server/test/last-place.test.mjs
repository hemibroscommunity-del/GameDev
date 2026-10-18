/* A RECONNECT STARTS WHERE THE SERVER LAST HAD YOU (v2.3.3327).
 *
 * The anti-bot review's fix 7, its third part (docs/specs/antibot-review.md
 * §4).  lastplace.js has the rule; what this suite pins:
 *   1. the numbers, and the Wheel's arrival held to the phone's own table
 *      (src/game/worldTrial.js WHEELS) on both Wheels;
 *   2. a script: dropping its socket and coming back names a place that is
 *      judged from where it left -- followed past the fastest an honest phone
 *      goes, never taken -- twenty reconnects a minute go no faster than that,
 *      and the first move after any join is judged, a first join's too;
 *   3. honest phones lose nothing: a dead pipe (the old session still live),
 *      a dropped connection, the fastest stack, a sprint and the Swift Draught
 *      while nothing is heard, standing still -- every one taken exactly; and a
 *      reconnect never buys a fresh budget;
 *   4. a fresh page: a reload starts in today's town, and its way into the
 *      Wheel at the arrival is taken; a dungeon's or the farm's trip the drop
 *      cut short comes back where it left; a lingering body's resume; a second
 *      tab; a refused join's retry;
 *   5. a death comes back in at the arrival: taken there, followed from it
 *      anywhere else;
 *   6. what is not judged: a join with no last place, one older than KEEP_MS,
 *      the oldest past MAX, a reset character, a phone in another Wheel's
 *      numbers;
 *   7. `lastplace: false` and `movebudget: false` are all of it as before;
 *   8. the overview's counts;
 *   9. every way a player's state goes says where they were. */
import { readFileSync, readdirSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { MOVE_BUDGET } from '../src/movement.js';
import { LAST_PLACE } from '../src/lastplace.js';
import { SPRINT } from '../src/sprint.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { wheelTable } from '../src/wheeltables.js';
import { flagNameOk } from '../src/liveops.js';

let T = 1_960_000_000_000;
Date.now = () => T;

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

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
function fakeWs() { return { sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(c, r) { this.closed = { code: c, reason: r }; } }; }

const FULL = MOVE_BUDGET.SPEED_PX * MOVE_BUDGET.BURST_S + MOVE_BUDGET.SLACK_PX;   /* 1,580 */
const AWAY = MOVE_BUDGET.SPEED_PX * SPRINT.MULT;                                   /* 665 px/s while nothing is heard */
const C = wheelTable(5).WHEEL_CENTRE;
const A = { x: C[0] + 20000, y: C[1] };   /* out in a land */
const ARR = { x: C[0], y: C[1] + LAST_PLACE.ARRIVAL_DY };

function room(flags) {
  const r = new GameRoom(makeState(), env);
  r._liveFlags = flags || {};
  r._saveRpg = () => {}; r._saveRpgVitals = () => {}; r._saveRpgPools = () => {};
  /* a bystander, so the room is never empty (the last one out ends every
     linger: linger.js) */
  return r;
}
let seq = 0;
const ids = new Map();
async function join(r, id, data, opts = {}) {
  const ws = fakeWs();
  r.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T });
  await r.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Mover', phrase: 'p-' + id, protocolVersion: 2,
    ws: opts.ws || [1, 5], data: Object.assign({ x: A.x, y: A.y, z: WHEEL_ZONE }, data || {}) }));
  if (r.tickInterval) { clearInterval(r.tickInterval); r.tickInterval = null; }
  return ws;
}
const move = (r, ws, x, y, z, extra) => r.webSocketMessage(ws, JSON.stringify(Object.assign({ type: 'move', x, y, z }, extra || {})));
const ps = (r, id) => r.playerState[id];
const empty = (p) => { p._mvBudget = 0; p._mvBudgetAt = T; };
const newId = () => 'bp_lp' + (++seq);

/* An honest phone's walk: east at `pxs` px/s, a move every `gap` ms, for
   `ms`; whether every move was taken exactly. */
async function walk(r, ws, id, pxs, ms, gap = 33, extra) {
  let all = true;
  for (let t = 0; t < ms; t += gap) {
    T += gap;
    const p = ps(r, id);
    const want = p.x + pxs * gap / 1000;
    await move(r, ws, want, p.y, p.z, extra);
    if (!near(ps(r, id).x, want)) all = false;
  }
  return all;
}

// ── 1. the numbers ──
{
  check('1. LAST_PLACE: an hour kept, 480 at most, the arrival 288 px south of the centre',
    LAST_PLACE.KEEP_MS === 3600000 && LAST_PLACE.MAX === 480 && LAST_PLACE.ARRIVAL_DY === 288);
  const wt = readFileSync(new URL('../../src/game/worldTrial.js', import.meta.url), 'utf8');
  const phone = {};
  for (const m of wt.matchAll(/(\d+): \{ worldW: \d+, worldH: \d+, arrival: \{ x: (\d+), y: (\d+) \} \}/g)) phone[m[1]] = { x: +m[2], y: +m[3] };
  const both = [5, 1].map((n) => { const c = wheelTable(n).WHEEL_CENTRE; return { n, server: { x: c[0], y: c[1] + LAST_PLACE.ARRIVAL_DY }, phone: phone[n] }; });
  check('1. the arrival is the phone\'s own, on both Wheels (worldTrial.js WHEELS)',
    both.every((b) => b.phone && b.phone.x === b.server.x && b.phone.y === b.server.y), both);
  const r5 = room(), r1 = room({ wheel5x: false });
  check('1. ...and each room reads its own Wheel\'s', near(r5._wheelArrival().x, ARR.x) && near(r5._wheelArrival().y, ARR.y)
    && near(r1._wheelArrival().y, wheelTable(1).WHEEL_CENTRE[1] + 288), { r5: r5._wheelArrival(), r1: r1._wheelArrival() });
}

// ── 2. a script ──
{
  const r = room();
  const id = newId();
  let ws = await join(r, id);
  await move(r, ws, A.x, A.y, WHEEL_ZONE);
  empty(ps(r, id));
  await r.webSocketClose(ws);
  check('2. (guard) the socket\'s close took the player out, and the place is kept', !ps(r, id) && !!r._lastPlaces && r._lastPlaces.has(id));
  T += 1000;
  ws = await join(r, id, { x: A.x + 20000, y: A.y });
  let p = ps(r, id);
  check('2. a reconnect a second later naming a place 20,000 px on is put 665 px on (a second at the fastest an honest phone goes unheard), not where it says',
    near(p.x, A.x + AWAY) && near(p.y, A.y), { x: p.x - A.x });
  check('2. ...and followed on toward it, never refused', !!p._mvFollow && near(p._mvFollow.x, A.x + 20000) && r._mvFollowing.has(id), p._mvFollow);
  check('2. ...its budget spent', p._mvBudget === 0);
  const x0 = p.x;
  await move(r, ws, A.x + 40000, A.y, WHEEL_ZONE);
  check('2. the first move after the join is judged too: next to nothing at the same instant, not the 20,000 px more it names', ps(r, id).x - x0 < 1, { moved: ps(r, id).x - x0 });

  /* a second socket of its own, the first still live: judged from the session it takes over */
  const re = room();
  const ie = newId();
  const we1 = await join(re, ie);
  await move(re, we1, A.x, A.y, WHEEL_ZONE);
  empty(ps(re, ie));
  T += 1000;
  await join(re, ie, { x: A.x + 20000, y: A.y });
  check('2. a second socket naming a place 20,000 px on, the first still live: judged from the session it takes over (665 px on), not taken',
    near(ps(re, ie).x, A.x + AWAY) && !!ps(re, ie)._mvFollow, { x: ps(re, ie).x - A.x });

  /* twenty reconnects a minute, each naming 50,000 px further on */
  const r2 = room();
  const id2 = newId();
  let w2 = await join(r2, id2);
  await move(r2, w2, A.x, A.y, WHEEL_ZONE);
  const start = ps(r2, id2).x;
  for (let i = 0; i < 20; i++) {
    /* the script names a place 50,000 px past wherever the room has it,
       on the join and on the move straight after it */
    const at = ps(r2, id2).x;
    await r2.webSocketClose(w2);
    T += 3000;
    w2 = await join(r2, id2, { x: at + 50000, y: A.y });
    await move(r2, w2, ps(r2, id2).x + 50000, A.y, WHEEL_ZONE);
  }
  const went = ps(r2, id2).x - start;
  check('2. twenty reconnects 3 s apart, each naming 50,000 px further, go no faster than an honest phone unheard (665 px/s) and one budget',
    went <= AWAY * 60 + FULL + 1, { went: Math.round(went), most: AWAY * 60 + FULL });

  /* a first join: no last place, but its first move is still judged */
  const r3 = room();
  const id3 = newId();
  const w3 = await join(r3, id3);
  await move(r3, w3, A.x + 20000, A.y, WHEEL_ZONE);
  check('2. a first join\'s first move is judged from where it joined: followed one budget, not 20,000 px',
    near(ps(r3, id3).x, A.x + FULL), { x: ps(r3, id3).x - A.x });
}

// ── 3. honest phones ──
{
  /* a dead pipe: the old socket still in the room, the phone walking on */
  const r = room();
  const id = newId();
  const ws = await join(r, id);
  await move(r, ws, A.x, A.y, WHEEL_ZONE);
  check('3. (guard) an honest walk is taken', await walk(r, ws, id, 250, 2000));
  const last = ps(r, id).x;
  T += 10000;   /* ten seconds of a dead pipe, the phone walking at 250 px/s */
  const ws2 = await join(r, id, { x: last + 2500, y: A.y });
  check('3. a dead pipe\'s reconnect, ten seconds of walking on, the old session still live: taken exactly',
    near(ps(r, id).x, last + 2500) && !ps(r, id)._mvFollow, { x: ps(r, id).x - last });
  check('3. ...the old session closed as superseded (guard)', ws.closed && ws.closed.reason === 'superseded by reconnect', ws.closed);
  check('3. ...and the walk goes on, every move taken', await walk(r, ws2, id, 250, 1000));

  /* a dropped connection: closed first, the fastest stack walking on */
  const cases = [
    ['a dropped connection, 5 s at the fastest honest stack (441 px/s)', 441, 5000, null],
    ['15 s of a dead pipe at the fastest honest stack', 441, 15000, null],
    ['15 s of it sprinting (x1.33, billed by no move)', 441 * SPRINT.MULT, 15000, null],
    ['15 s of it sprinting on the Swift Draught (x1.5)', 441 * 1.5 * SPRINT.MULT, 15000, 1.5],
  ];
  for (const [what, pxs, ms, draught] of cases) {
    const rr = room();
    const iid = newId();
    let w = await join(rr, iid);
    await move(rr, w, A.x, A.y, WHEEL_ZONE);
    if (draught) { ps(rr, iid)._buffs = { spd: T + 600000, spdMul: draught }; }
    await walk(rr, w, iid, 300, 500);
    const at = ps(rr, iid).x;
    await rr.webSocketClose(w);
    T += ms;
    w = await join(rr, iid, { x: at + pxs * ms / 1000, y: A.y });
    check('3. ' + what + ': taken exactly', near(ps(rr, iid).x, at + pxs * ms / 1000) && !ps(rr, iid)._mvFollow,
      { short: Math.round(at + pxs * ms / 1000 - ps(rr, iid).x) });
  }

  /* standing still */
  const rs = room();
  const is = newId();
  let wst = await join(rs, is);
  await move(rs, wst, A.x, A.y, WHEEL_ZONE);
  await rs.webSocketClose(wst);
  T += 1000;
  wst = await join(rs, is, { x: A.x, y: A.y });
  check('3. back a second later where they stood: taken', near(ps(rs, is).x, A.x) && !ps(rs, is)._mvFollow);

  /* a reconnect never buys a fresh budget */
  const rb = room();
  const ib = newId();
  let wb = await join(rb, ib);
  await move(rb, wb, A.x, A.y, WHEEL_ZONE);
  empty(ps(rb, ib));
  await rb.webSocketClose(wb);
  T += 10;
  wb = await join(rb, ib, { x: A.x, y: A.y });
  await move(rb, wb, A.x + FULL, A.y, WHEEL_ZONE);
  check('3. a reconnect never buys a fresh budget: spent, out and back in at once, a 1,580 px move goes 7 px (what 10 ms refilled), not all of it',
    ps(rb, ib).x - A.x < 10, { moved: ps(rb, ib).x - A.x });
}

// ── 4. a fresh page, a trip cut short, a resume, a second tab, a retry ──
{
  /* a reload: in town, then down the stairs to the arrival */
  const r = room();
  const id = newId();
  let ws = await join(r, id);
  await move(r, ws, A.x, A.y, WHEEL_ZONE);
  await walk(r, ws, id, 250, 1000);
  const left = ps(r, id).x;
  await r.webSocketClose(ws);
  T += 3000;
  ws = await join(r, id, { x: 400, y: 300, z: 'town' });
  check('4. a reload starts in today\'s town: taken (nothing is farmed there)', ps(r, id).z === 'town' && near(ps(r, id).x, 400));
  check('4. ...the Wheel\'s way back is where they left it, and its arrival is allowed too',
    ps(r, id)._wheelBack && near(ps(r, id)._wheelBack.x, left) && ps(r, id)._wheelArrive === true, { back: ps(r, id)._wheelBack, arrive: ps(r, id)._wheelArrive });
  T += 600;
  await move(r, ws, ARR.x + 4, ARR.y - 6, WHEEL_ZONE);
  check('4. ...down the stairs to the arrival: taken', ps(r, id).z === WHEEL_ZONE && near(ps(r, id).x, ARR.x + 4) && near(ps(r, id).y, ARR.y - 6), { x: ps(r, id).x, y: ps(r, id).y });
  check('4. ...counted as a way in at the arrival, and both ways back spent', r._mvCount.arrival === 1 && ps(r, id)._wheelBack === undefined && ps(r, id)._wheelArrive === undefined, r._mvCount);

  /* ...and a script's fresh page naming anywhere */
  const rq = room();
  const iq = newId();
  let wq = await join(rq, iq);
  await move(rq, wq, A.x, A.y, WHEEL_ZONE);
  await rq.webSocketClose(wq);
  T += 3000;
  wq = await join(rq, iq, { x: 400, y: 300, z: 'town' });
  T += 500;
  await move(rq, wq, A.x + 40000, A.y, WHEEL_ZONE);
  check('4. a reload\'s way in 40,000 px past where it left is judged from the nearer of the two (where it left): followed, not taken',
    ps(rq, iq).x - A.x < FULL + 1, { x: ps(rq, iq).x - A.x });

  /* a dungeon trip the drop cut short: a fresh page, back at the mouth or the arrival */
  for (const [what, to] of [['back at the mouth', null], ['back at the arrival', ARR]]) {
    const rd = room();
    const idd = newId();
    let wd = await join(rd, idd);
    await move(rd, wd, A.x, A.y, WHEEL_ZONE);
    T += 2000;
    await move(rd, wd, 600, 1500, 'dungeon_wheel_test_1');
    await walk(rd, wd, idd, 200, 3000);
    await rd.webSocketClose(wd);
    T += 4000;
    wd = await join(rd, idd, { x: 400, y: 300, z: 'town' });
    T += 600;
    const dest = to || { x: A.x - 200, y: A.y + 150 };
    await move(rd, wd, dest.x, dest.y, WHEEL_ZONE);
    check('4. a reload in a Wheel dungeon, then ' + what + ': taken', ps(rd, idd).z === WHEEL_ZONE && near(ps(rd, idd).x, dest.x) && near(ps(rd, idd).y, dest.y),
      { x: ps(rd, idd).x - dest.x, y: ps(rd, idd).y - dest.y });
  }

  /* the farm, a dead pipe on it: back on the farm, then out at the door */
  const rf = room();
  const idf = newId();
  let wf = await join(rf, idf);
  await move(rf, wf, A.x, A.y, WHEEL_ZONE);
  const door = { x: A.x, y: A.y };
  for (const [z, x, y] of [['town', 300, 300], ['farm_home', 500, 600]]) { T += 2000; await move(rf, wf, x, y, z); }
  await rf.webSocketClose(wf);
  T += 5000;
  wf = await join(rf, idf, { x: 700, y: 600, z: 'farm_home' });
  check('4. a dead pipe on the farm: back on the farm 200 px on, taken', ps(rf, idf).z === 'farm_home' && near(ps(rf, idf).x, 700));
  for (const [z, x, y] of [['town', 300, 300], [WHEEL_ZONE, door.x + 30, door.y]]) { T += 2000; await move(rf, wf, x, y, z); }
  check('4. ...and out at the door it left by: taken', ps(rf, idf).z === WHEEL_ZONE && near(ps(rf, idf).x, door.x + 30), { x: ps(rf, idf).x - door.x });

  /* a lingering body taken back */
  const rl = room();
  const NML = { x: C[0] + 9000, y: C[1] };
  const ia = newId(), ib = newId();
  const wa = await join(rl, ia, { x: NML.x, y: NML.y });
  let wb = await join(rl, ib, { x: NML.x + 40, y: NML.y });
  for (const i of [ia, ib]) { const q = ps(rl, i); q.dead = false; q.dying = false; q._zoneEntryGraceUntil = 0; q.hp = q.maxHp; }
  rl._notePvpExchange(ia, ib, T);
  T += 1000;
  await rl.webSocketClose(wb);
  check('4. (guard) B left in a fight: the body lingers', ps(rl, ib) && ps(rl, ib).lingering === true);
  T += 1000;
  wb = await join(rl, ib, { x: NML.x + 40 + 250, y: NML.y });
  check('4. a lingering body taken back from 250 px on (within RESUME_PX): taken where the phone is',
    ps(rl, ib) && !ps(rl, ib).lingering && near(ps(rl, ib).x, NML.x + 290) && !ps(rl, ib)._mvFollow, ps(rl, ib) && { x: ps(rl, ib).x - NML.x });
  void wa;

  /* a second tab: a fresh page of the same player, the first still live */
  const rt = room();
  const it = newId();
  const w1 = await join(rt, it);
  await move(rt, w1, A.x, A.y, WHEEL_ZONE);
  T += 2000;
  const w2 = await join(rt, it, { x: 380, y: 320, z: 'town' });
  check('4. a second tab starts in today\'s town: taken, the first tab superseded', ps(rt, it).z === 'town' && w1.closed && w1.closed.reason === 'superseded by reconnect');
  T += 700;
  await move(rt, w2, ARR.x, ARR.y, WHEEL_ZONE);
  check('4. ...and down the stairs to the arrival: taken', near(ps(rt, it).x, ARR.x) && near(ps(rt, it).y, ARR.y));

  /* a refused join's retry */
  const rr = room();
  const ir = newId();
  let wr = await join(rr, ir);
  await move(rr, wr, A.x, A.y, WHEEL_ZONE);
  empty(ps(rr, ir));
  await rr.webSocketClose(wr);
  T += 1000;
  const realLoad = rr._loadRpg;
  rr._loadRpg = async (pid, opts) => { if (pid === ir && opts && opts.throwOnError) throw new Error('storage down'); return realLoad.call(rr, pid, opts); };
  wr = await join(rr, ir, { x: A.x + 30000, y: A.y });
  check('4. (guard) a join whose record cannot be read is refused', wr.closed && wr.closed.code === 1011 && !ps(rr, ir), wr.closed);
  rr._loadRpg = realLoad;
  T += 100;
  wr = await join(rr, ir, { x: A.x + 30000, y: A.y });
  check('4. ...and its retry is judged from where the refused one was put, never from nothing',
    ps(rr, ir) && ps(rr, ir).x - A.x <= AWAY * 1.1 + 1, ps(rr, ir) && { x: ps(rr, ir).x - A.x, most: AWAY * 1.1 });
}

// ── 5. a death comes back in at the arrival ──
{
  for (const [what, to, taken] of [['at the arrival: taken', ARR, true], ['where they died: judged from the arrival, followed', { x: A.x + 500, y: A.y }, false]]) {
    const r = room();
    const id = newId();
    const ws = await join(r, id);
    await move(r, ws, A.x, A.y, WHEEL_ZONE);
    const p = ps(r, id);
    p.dying = true; p.respawnAt = T - 1; p.hp = 0;
    r._tickPlayerRespawn();
    check('5. (guard) the respawn sent them to town, the arrival allowed', ps(r, id).z === 'town' && ps(r, id)._wheelArrive === true);
    T += 500;
    await move(r, ws, 300, 300, 'town');
    T += 600;
    await move(r, ws, to.x, to.y, WHEEL_ZONE);
    const q = ps(r, id);
    check('5. a death, then back into the Wheel ' + what, taken ? (near(q.x, to.x) && near(q.y, to.y)) : (Math.hypot(q.x - ARR.x, q.y - ARR.y) < FULL + 1 && !!q._mvFollow),
      { x: q.x, y: q.y });
  }
}

// ── 6. what is not judged ──
{
  const r = room();
  const id = newId();
  let ws = await join(r, id);
  await move(r, ws, A.x, A.y, WHEEL_ZONE);
  await r.webSocketClose(ws);
  T += LAST_PLACE.KEEP_MS + 1;
  ws = await join(r, id, { x: A.x + 60000, y: A.y });
  check('6. a place older than KEEP_MS is forgotten: the join is taken where it says (the allowance is the whole Wheel by then)', near(ps(r, id).x, A.x + 60000));
  /* ...and the Wheel's way back with it: a reload's way in after an hour is
     a first join's, taken wherever it is (what KEEP_MS is for) */
  const rk = room();
  const ik = newId();
  let wk = await join(rk, ik);
  await move(rk, wk, A.x, A.y, WHEEL_ZONE);
  await rk.webSocketClose(wk);
  T += LAST_PLACE.KEEP_MS - 1000;
  wk = await join(rk, ik, { x: 400, y: 300, z: 'town' });
  check('6. within the hour a reload still carries the Wheel\'s way back and its arrival', !!ps(rk, ik)._wheelBack && ps(rk, ik)._wheelArrive === true);
  await rk.webSocketClose(wk);
  T += LAST_PLACE.KEEP_MS + 1;
  wk = await join(rk, ik, { x: 400, y: 300, z: 'town' });
  T += 500;
  await move(rk, wk, A.x + 50000, A.y, WHEEL_ZONE);
  check('6. ...past it a reload carries nothing, and its way in is a first join\'s: taken where it is', near(ps(rk, ik).x, A.x + 50000) && !ps(rk, ik)._mvFollow, { x: ps(rk, ik).x - A.x });

  const rm = room();
  const first = newId();
  for (let i = 0; i <= LAST_PLACE.MAX; i++) {
    const iid = i === 0 ? first : newId();
    const w = await join(rm, iid);
    await rm.webSocketClose(w);
  }
  check('6. at most MAX kept, the oldest first out', rm._lastPlaces.size === LAST_PLACE.MAX && !rm._lastPlaces.has(first), rm._lastPlaces.size);

  const rz = room();
  const iz = newId();
  const wz = await join(rz, iz);
  await rz.webSocketClose(wz);
  await rz._resetCharacterData(iz);
  check('6. a reset character has no last place', !rz._lastPlaces.has(iz));

  const ro = room();
  const io = newId();
  let wo = await join(ro, io, null, { ws: [1] });
  await move(ro, wo, A.x, A.y, WHEEL_ZONE);
  await ro.webSocketClose(wo);
  check('6. a phone that draws another Wheel than the room plays is not remembered (its numbers are another map\'s)', !ro._lastPlaces || !ro._lastPlaces.has(io));
  T += 1000;
  wo = await join(ro, io, { x: A.x + 30000, y: A.y }, { ws: [1] });
  check('6. ...nor judged: left alone, as the room leaves it alone', near(ps(ro, io).x, A.x + 30000));
}

// ── 7. the kill switches ──
{
  check('7. `lastplace` is a name the live flags route takes', flagNameOk('lastplace'));
  for (const flags of [{ lastplace: false }, { movebudget: false }]) {
    const r = room(flags);
    const id = newId();
    let ws = await join(r, id);
    await move(r, ws, A.x, A.y, WHEEL_ZONE);
    await r.webSocketClose(ws);
    T += 1000;
    ws = await join(r, id, { x: A.x + 20000, y: A.y });
    const k = JSON.stringify(flags);
    check('7. ' + k + ': a reconnect lands where it says, as before', near(ps(r, id).x, A.x + 20000) && !r._lastPlaces);
    check('7. ' + k + ': ...and its first move is a first move', ps(r, id).lastMoveAt === undefined);
    const p = ps(r, id);
    p.dying = true; p.respawnAt = T - 1; p.hp = 0;
    r._tickPlayerRespawn();
    check('7. ' + k + ': ...and a death allows no arrival', ps(r, id)._wheelArrive === undefined);
  }
}

// ── 8. the overview ──
{
  const r = room();
  const id = newId();
  let ws = await join(r, id);
  await move(r, ws, A.x, A.y, WHEEL_ZONE);
  empty(ps(r, id));
  await r.webSocketClose(ws);
  T += 1000;
  ws = await join(r, id, { x: A.x + 20000, y: A.y });
  await r.webSocketClose(ws);
  T += 1000;
  ws = await join(r, id, { x: A.x + AWAY, y: A.y });
  const info = r._lastPlaceInfo();
  check('8. the overview counts the places kept, the joins judged, the ones followed and the fresh ones',
    info.on === true && info.kept === 2 && info.judged === 2 && info.followed >= 1 && info.fresh === 1 && info.held === 0, info);
  r._liveFlags = { lastplace: false };
  check('8. ...and says when the switch is off', r._lastPlaceInfo().on === false);
}

// ── 9. every way a player's state goes says where they were ──
{
  const src = readdirSync(new URL('../src/', import.meta.url)).filter((f) => f.endsWith('.js'));
  const bad = [];
  for (const f of src) {
    const lines = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!/delete this\.playerState\[[^\]]+\](?!\[)/.test(line)) return;   /* the whole state, not one of its keys */
      if (f === 'spar.js') return;   /* a sparring clone is nobody's place */
      const before = lines.slice(Math.max(0, i - 4), i + 1).join('\n');
      if (!/_placeRemember\(|_placeForget\(/.test(before) && !/_placeForget\(/.test(lines.slice(i, i + 4).join('\n'))) bad.push(f + ':' + (i + 1));
    });
  }
  check('9. every "delete this.playerState[...]" remembers the place first (or forgets it: a reset)', bad.length === 0, bad);
}

console.log(failures === 0 ? '\nlast-place: all checks passed' : `\nlast-place: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
