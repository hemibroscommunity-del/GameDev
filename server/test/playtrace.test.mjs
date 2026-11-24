/* ═══ v2.3.6482: THE OWNER'S PLAY IS THE FIRST HUMAN RECORD (grand plan step 10.8; card WHO PR 3) ═══
 *
 *   1. THE SHAPE: the row's key is a ring of TRACE.KEEP a character; a
 *      label from a closed list; traceRead takes only a row of this shape.
 *   2. THE CARD'S "DONE WHEN": a test-mode honest harvest played in the
 *      league's own world (its bench's harvester, score.mjs HONEST) leaves
 *      ONE `play_trace:` row, labelled human, in the league's trace form, and
 *      the league's rung 4 (tools/league/replay.mjs replayTrace) reads it as
 *      a person's: no detector catches it at 60, 30, 20 and 4 frames a
 *      second, nor through a deploy halfway.
 *   3. ONE PUT A SITTING, test mode only: the same play outside test mode
 *      records nothing and writes no row; a reconnect inside the sitting
 *      starts no second recording; a leave ends it (`cut: 'leave'`).
 *   4. THE SHADOW: test mode's checks say what they would refuse (a move
 *      past the budget, a bow with no bow, a hit from too far, a too-early
 *      strike, a cook's floor) and play goes on exactly as test mode lets
 *      it: the same places, the same monster hit, with `playtrace: false`.
 *   5. THE SIZE: a recording past TRACE.MAX_BYTES ends `cut: 'size'` with
 *      its row under the cap (Durable Object storage holds 128 KiB a value).
 *   6. THE KILL SWITCH `playtrace: false` (and `sitting: false`, which it
 *      needs): nothing recorded, no row, the cap `playtrace` not advertised.
 *   7. THE MESSAGE PATH: a session not recording makes nothing at traceNote
 *      (no `_trace`), and traceNote never throws into the switch.
 *
 * BREAK PROOF (rule 8), run 2026-11-24 (twelve plants, each red):
 *   playtrace.js traceBegin: the isTest test taken out -> FAIL 3 (a player
 *     outside test mode recorded);
 *   playtrace.js traceBegin: the "just opened" test (`u !== t`) taken out
 *     -> FAIL 3 (a reconnect records a second time);
 *   playtrace.js traceEnd: `delete ps._trace` taken out -> FAIL 2 (4,155
 *     puts in one sitting);
 *   playtrace.js note: the node_strike's `after` taken out -> FAIL 2 (the
 *     form, and rung 4: a replay strikes inside the plan);
 *   index.js: the traceNote line taken out -> FAIL 2 (no row);
 *   combat.js, movement.js, gathering.js, cooking.js: a shadow call made
 *     `if (false)` -> FAIL 4 / 4b (its would-refuse not counted);
 *   playtrace.js note: the MAX_BYTES test taken out -> FAIL 2 and 5 (a
 *     row of 182 KB);
 *   join.js: the cap's `traceOff` taken out -> FAIL 6;
 *   playtrace.js note: the IDLE_MS test taken out -> FAIL 5b (an idle gap
 *     counted active).
 */
import { makeStorage, openRoom, join, fakeWs, settle, seededClock } from './testroom.mjs';
import * as B from './claimbots.mjs';
import { TRACE, traceKey, traceRead, traceNote, traceBegin, traceEnd, traceRowOf } from '../src/playtrace.js';
import { HONEST, caughtBy, readDetectors } from '../../tools/league/score.mjs';
import { replayTrace, unpackTrace, SPEEDS } from '../../tools/league/replay.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}
const quietly = async (fn) => {
  const q = { l: console.log, w: console.warn, e: console.error };
  console.log = () => {}; console.warn = () => {}; console.error = () => {};
  try { return await fn(); } finally { console.log = q.l; console.warn = q.w; console.error = q.e; }
};
/* the room's puts of `play_trace:` keys, counted at its storage */
const countTracePuts = (room) => {
  const sto = room.state.storage, put = sto.put.bind(sto), c = { n: 0 };
  sto.put = (k, v) => {
    if (typeof k === 'string' && k.startsWith(TRACE.PREFIX)) c.n++;
    else if (k && typeof k === 'object') for (const kk of Object.keys(k)) if (kk.startsWith(TRACE.PREFIX)) c.n++;
    return put(k, v);
  };
  return c;
};
const rowsOf = (st) => [...st._store.entries()].filter(([k]) => k.startsWith(TRACE.PREFIX));
const capsOf = (ws) => { const m = ws.sent.find((x) => x && x.type === 'state_sync'); return m ? (m.caps || (m.payload && m.payload.caps) || null) : null; };

/* ══════════ 1. THE SHAPE ══════════ */
{
  const slots = new Set();
  for (let i = 0; i < 50; i++) slots.add(traceKey('bp_x', Date.UTC(2026, 10, 24) + i * 7919000));
  check('1. a character\'s rows are a ring of TRACE.KEEP slots under `play_trace:<pid>:`', slots.size <= TRACE.KEEP && [...slots].every((k) => /^play_trace:bp_x:[0-7]$/.test(k)), [...slots]);
  check('1. the same sitting\'s stint is the same slot', traceKey('bp_x', 1764000000123) === traceKey('bp_x', 1764000000999));
  check('1. the one label is `human`; the row\'s shape 1, the league\'s trace form 2', TRACE.LABELS.length === 1 && TRACE.LABELS[0] === 'human' && TRACE.V === 1 && TRACE.FORM === 2);
  const R = { pid: 'bp_x', sid: 5, act: 0, start: { x: 1, y: 2, z: 'wheel' }, ev: [{ t: 0, mv: { type: 'move', x: 1, y: 2 } }], kinds: Object.create(null), wr: { move_budget: 1 }, wt: [[0, 0]] };
  const row = traceRowOf(R, 'ten', Date.UTC(2026, 10, 24));
  check('1. traceRead reads a row of its shape as the league\'s trace', traceRead(row) === row.trace && row.trace.v === 2 && row.trace.what === 'human' && row.trace.kind === 'walk');
  check('1. ...and nothing else: another label, another shape, junk', traceRead({ ...row, label: 'bot' }) === null && traceRead({ ...row, v: 2 }) === null && traceRead(null) === null && traceRead({ v: 1, label: 'human', trace: { v: 2 } }) === null);
}

/* ══════════ 2. THE CARD'S "DONE WHEN": a recorded person, read as one by rung 4 ══════════ */
const H = HONEST.find((h) => h.kind === 'harvest');
async function recordHarvest({ testMode = true, flags = {}, minutes = 14, seed = 6482 } = {}) {
  const clock = seededClock({ seed }).install();
  try {
    return await quietly(async () => {
      const W = await B.makeWorld(clock, { tickMs: H.world.tickMs, prep: H.world.prep, recs: H.world.recs(), flags });
      if (testMode) W.st._store.set('testmode:' + H.pid, { on: true, at: clock.now() });
      const puts = countTracePuts(W.room);
      const ph = new B.Phone(W, null, null, minutes * B.MIN);
      const take = { kills: 0, xp: 0, ore: 0, cooked: 0, gold: 0, px: 0, points: 0 };
      let err = null;
      try { await H.play(W, ph, take); } catch (e) { err = (e && e.stack) || String(e); }
      const ps = W.ps(H.pid);
      const recording = !!(ps && ps._trace);
      if (W.ws[H.pid]) { await W.room.webSocketClose(W.ws[H.pid], 1000, 'bye', true); await settle(); }
      return { W, take, err, recording, puts: puts.n, rows: rowsOf(W.st), det: readDetectors(W.room, H.pid) };
    });
  } finally { clock.restore(); }
}
{
  const rec = await recordHarvest();
  check('2. the test-mode honest harvest played without an error, and harvested', !rec.err && rec.take.ore > 0, { err: rec.err && rec.err.slice(0, 300), take: rec.take });
  check('2. ONE `play_trace:` row, put once', rec.rows.length === 1 && rec.puts === 1, { rows: rec.rows.map(([k]) => k), puts: rec.puts });
  const [key, row] = rec.rows[0] || [];
  const tr = traceRead(row);
  check('2. ...labelled human, the character\'s, its sitting\'s id in its key', row && row.label === 'human' && row.pid === H.pid && key === traceKey(H.pid, row.sid), row && { label: row.label, pid: row.pid, key });
  /* the bench's harvester walks at ten moves a second: 96 KB holds about
     five active minutes of it, so its row ends at the cap (§5b holds `ten`) */
  check('2. ...ended by the first ten active minutes or the row\'s cap, whichever came first, and says which', row && (row.cut === 'ten' || row.cut === 'size') && row.act > 60 && row.act <= TRACE.ACTIVE_S + 1, row && { cut: row.cut, act: row.act });
  check('2. ...in the league\'s trace form: a harvest, moves and the harvest\'s messages, each strike\'s `after`', tr && tr.kind === 'harvest' && tr.events.some((e) => e.mv) && tr.events.filter((e) => e.m && e.m.type === 'node_strike').length > 0 && tr.events.filter((e) => e.m && e.m.type === 'node_strike').every((e) => typeof e.after === 'number' && e.after >= 0), tr && { kind: tr.kind, n: tr.events.length });
  check('2. ...under the row\'s cap', row && JSON.stringify(row).length <= TRACE.MAX_BYTES + 4096, row && JSON.stringify(row).length);
  check('2. an honest harvest in test mode: its shadow would refuse nothing', row && Object.keys(row.wr).length === 0, row && row.wr);
  const trace = tr && unpackTrace(tr);
  const runs = [];
  if (trace) {
    for (const fps of SPEEDS) runs.push({ fps, ...(await replayTrace(trace, { fps, seed: 'who' })) });
    runs.push({ fps: 60, deploy: true, ...(await replayTrace(trace, { fps: 60, deploy: true, seed: 'who' })) });
  }
  const caught = runs.map((r) => ({ fps: r.fps, deploy: !!r.deploy, caught: caughtBy(r.det), refusals: r.refusals.slice(0, 3), sent: r.sent }));
  check('2. RUNG 4 READS IT AS A PERSON\'S: no detector catches it at 60, 30, 20 and 4 fps, nor through a deploy', runs.length === SPEEDS.length + 1 && caught.every((c) => c.caught.length === 0), caught);
  check('2. ...and the replay is taken as it was played: every message delivered, no step or strike refused', runs.length && runs.every((r) => r.refusals.length === 0 && r.sent === trace.events.length), caught);
}

/* ══════════ 3. ONE PUT A SITTING, TEST MODE ONLY ══════════ */
{
  const plain = await recordHarvest({ testMode: false, minutes: 12 });
  check('3. the same play outside test mode records nothing and writes no `play_trace:` row', plain.rows.length === 0 && plain.puts === 0 && !plain.recording, { rows: plain.rows.length, puts: plain.puts });

  const T0 = Date.UTC(2026, 10, 24, 12, 0, 0);
  const clock = seededClock({ start: T0, seed: 3 }).install();
  try {
    const pid = 'bp_trace_short';
    const st = makeStorage(new Map([['rpg:' + pid, { _v: 22, coins: 50, inventory: {}, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } }], ['testmode:' + pid, { on: true }]]));
    const out = await quietly(async () => {
      const room = await openRoom(st);
      const puts = countTracePuts(room);
      let ws = fakeWs('s1');
      await join(room, ws, pid, { loginTaken: true }); await settle();
      if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
      const began = !!room.playerState[pid]._trace;
      const mv = async (w) => { const ps = room.playerState[pid]; clock.advance(1000); await room.webSocketMessage(w, JSON.stringify({ type: 'move', x: ps.x + (ps._flip = !ps._flip) * 20 - 10, y: ps.y, z: ps.z })); };
      for (let i = 0; i < 90; i++) await mv(ws);   /* ninety active seconds, then the phone goes */
      await room.webSocketClose(ws, 1000, 'bye', true); await settle();
      const afterLeave = { puts: puts.n, rows: rowsOf(st).map(([, r]) => r.cut) };
      clock.advance(20000);   /* back inside the sitting (SIT.GAP_MS) */
      ws = fakeWs('s2');
      await join(room, ws, pid, { loginTaken: true }); await settle();
      const again = !!(room.playerState[pid] && room.playerState[pid]._trace);
      for (let i = 0; i < 30; i++) await mv(ws);
      await room.webSocketClose(ws, 1000, 'bye', true); await settle();
      return { began, afterLeave, again, puts: puts.n, caps: capsOf(ws) };
    });
    check('3. a test-mode sitting\'s join begins a recording', out.began);
    check('3. its leave ends it: one row, `cut: leave`', out.afterLeave.puts === 1 && out.afterLeave.rows.length === 1 && out.afterLeave.rows[0] === 'leave', out.afterLeave);
    check('3. a reconnect inside the same sitting starts no second recording: still ONE put', !out.again && out.puts === 1, out);
    check('3. the cap `playtrace: 1` is advertised', out.caps && out.caps.playtrace === 1, out.caps);
  } finally { clock.restore(); }
}

/* ══════════ 4. THE SHADOW: would refuse, and play as test mode lets it ══════════ */
{
  const T0 = Date.UTC(2026, 10, 24, 13, 0, 0);
  const play = async (flags) => {
    const clock = seededClock({ start: T0, seed: 4 }).install();
    try {
      return await quietly(async () => {
        const pid = 'bp_trace_shadow';
        const st = makeStorage(new Map([['rpg:' + pid, { _v: 22, coins: 50, inventory: {}, level: 5, hp: 100, maxHp: 100, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } }], ['testmode:' + pid, { on: true }]]));
        const room = await openRoom(st, flags);
        const ws = fakeWs('sh');
        await join(room, ws, pid, { loginTaken: true }); await settle();
        if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
        const ps = room.playerState[pid];
        const send = (m) => room.webSocketMessage(ws, JSON.stringify(m));
        const path = [];
        for (let i = 0; i < 8; i++) { clock.advance(100); await send({ type: 'move', x: ps.x + 30, y: ps.y, z: ps.z }); path.push([Math.round(ps.x), Math.round(ps.y)]); }
        clock.advance(100); await send({ type: 'move', x: ps.x + 5000, y: ps.y, z: ps.z });   /* a warp: past any budget */
        path.push([Math.round(ps.x), Math.round(ps.y)]);
        const near = { id: 'm_tr_near', x: ps.x + 10, y: ps.y, alive: true, hp: 50, maxHp: 50, level: 1 };
        const far = { id: 'm_tr_far', x: ps.x + 3000, y: ps.y, alive: true, hp: 50, maxHp: 50, level: 1 };
        room.monsters[ps.z] = [near, far];
        ps.rangedWeapon = null;
        const hit = (id, slot) => send({ type: 'monster_damage', payload: { monsterId: id, zone: ps.z, element: null, slot, special: false } });
        clock.advance(1000); await hit(near.id, 'ranged');   /* no bow in the worker's own slot */
        clock.advance(1000); await hit(far.id, 'melee');     /* far past the sword's reach */
        /* two cooks 100 ms apart: under the cook's 900 ms floor */
        ps.inventory = { fish_minnow: 3 };
        clock.advance(1000); await send({ type: 'cook_request', payload: { fishKey: 'fish_minnow' } });
        clock.advance(100); await send({ type: 'cook_request', payload: { fishKey: 'fish_minnow' } });
        const R = ps._trace;
        return { path, wr: R ? Object.assign({}, R.wr) : null, hp: [near.hp, far.hp], coins: ps.coins, inv: JSON.stringify(ps.inventory) };
      });
    } finally { clock.restore(); }
  };
  const on = await play(null), off = await play({ playtrace: false });
  check('4. a warp in test mode: the shadow\'s budget would refuse it', on.wr && on.wr.move_budget >= 1, on.wr);
  check('4. a bow claim with no bow: `hit_weapon`; a sword hit from 3,000 px: `hit_far`', on.wr && on.wr.hit_weapon === 1 && on.wr.hit_far === 1, on.wr);
  check('4. a second cook 100 ms after the first: `cook_floor`', on.wr && on.wr.cook_floor === 1, on.wr);
  check('4. play as test mode lets it, the same with `playtrace: false`: the places, the monsters\' hp, the purse, the bag', JSON.stringify(on.path) === JSON.stringify(off.path) && (on.hp[0] < 50) === (off.hp[0] < 50) && (on.hp[1] < 50) === (off.hp[1] < 50) && on.coins === off.coins && on.inv === off.inv, { on, off });
  check('4. ...the warp taken where the phone said (test mode), with the shadow on', on.path[on.path.length - 1][0] - on.path[on.path.length - 2][0] >= 4999, on.path.slice(-2));
  check('4. `playtrace: false`: nothing shadowed', off.wr === null);
}

/* ══════════ 4b. A TOO-EARLY STRIKE IN TEST MODE ══════════ */
{
  const clock = seededClock({ seed: 41 }).install();
  try {
    const out = await quietly(async () => {
      const W = await B.makeWorld(clock, { tickMs: H.world.tickMs, prep: H.world.prep, recs: H.world.recs() });
      W.st._store.set('testmode:' + H.pid, { on: true });
      const n = W.room._ensureZoneNodes('wheel').filter((x) => x.nodeType === 'oreVein' && x.tierLvl === 1)[0];
      await W.join(H.pid, { x: n.x + 10, y: n.y + 10, z: 'wheel' });
      await W.run(200);
      await W.deliver(H.pid, { type: 'extraction_start', payload: { nodeId: n.id, zone: 'wheel', skill: 'mining', hitSeq: 1 } });
      const ex = W.room.extractions[H.pid];
      if (ex) { ex.hits = undefined; ex.openDelayBase = 5000; ex.jitter = 0; }   /* a plan whose window opens 5 s on */
      await W.run(150);
      await W.deliver(H.pid, { type: 'node_strike', payload: { id: n.id, zone: 'wheel', accuracy: 'good' } });
      const R = W.ps(H.pid)._trace;
      return { wr: R ? Object.assign({}, R.wr) : null, ev: R ? R.ev.map((e) => (e.m ? e.m.type : 'move')) : null };
    });
    check('4b. a strike 150 ms after its start, in test mode: `strike_early` (and recorded, the start and the strike)', out.wr && out.wr.strike_early === 1 && out.ev.includes('extraction_start') && out.ev.includes('node_strike'), out);
  } finally { clock.restore(); }
}

/* ══════════ 5. THE SIZE ══════════ */
{
  const puts = [];
  const card = [1764000000000, 1764000000000]; while (card.length < 16) card.push(0);
  const ps = { x: 0, y: 0, z: 'wheel', _testMode: true, _econ: { v: 2, s: card } };
  const room = { playerState: { s: ps }, _liveFlags: null, _testMode: (p) => p._testMode === true, state: { storage: { put: (k, v) => { puts.push([k, v]); return Promise.resolve(); } } } };
  traceBegin(room, ps, 'bp_big', 1764000000000, 0);
  for (let i = 0; i < 20000 && ps._trace; i++) traceNote(room, { id: 's' }, { type: 'move', x: i, y: i * 2, z: 'wheel', d: 'down', vx: i % 7, vy: 0 }, i * 50);
  check('5. a recording past TRACE.MAX_BYTES ends `cut: size`, ONE put, its row under the cap', puts.length === 1 && puts[0][1].cut === 'size' && JSON.stringify(puts[0][1].trace.events).length <= TRACE.MAX_BYTES, puts.map(([k, v]) => [k, v.cut, JSON.stringify(v).length]));
  check('5. ...and a recording ended records no more', !ps._trace && traceEnd(room, ps, 'leave', 1) === null);
}

/* ══════════ 5b. TEN ACTIVE MINUTES ══════════ */
{
  const puts = [];
  const card = [1764000000000, 1764000000000]; while (card.length < 16) card.push(0);
  const ps = { x: 0, y: 0, z: 'wheel', _testMode: true, _econ: { v: 2, s: card } };
  const room = { playerState: { s: ps }, _liveFlags: null, _testMode: (p) => p._testMode === true, state: { storage: { put: (k, v) => { puts.push([k, v]); return Promise.resolve(); } } } };
  traceBegin(room, ps, 'bp_ten', 1764000000000, 0);
  let t = 0;
  for (let i = 0; i < 400; i++) { t += 1000; traceNote(room, { id: 's' }, { type: 'move', x: i, y: 0, z: 'wheel' }, t); }
  t += 120000;   /* two idle minutes: not active */
  for (let i = 0; i < 400 && ps._trace; i++) { t += 1000; traceNote(room, { id: 's' }, { type: 'move', x: i, y: 1, z: 'wheel' }, t); }
  const r = puts[0] && puts[0][1];
  check('5b. a move a second: ONE put, `cut: ten`, at ten ACTIVE minutes (an idle gap not counted)', puts.length === 1 && r.cut === 'ten' && r.act === 600 && r.trace.events.length === 601, r && { cut: r.cut, act: r.act, n: r.trace.events.length });
  check('5b. ...the trace\'s start the first move\'s place, its times from the recording\'s start', r && r.trace.start.x === 0 && r.trace.start.y === 0 && r.trace.events[0].t === 1000);
}

/* ══════════ 6. THE KILL SWITCH ══════════ */
for (const flags of [{ playtrace: false }, { sitting: false }]) {
  const rec = await recordHarvest({ flags, minutes: 12 });
  const name = Object.keys(flags)[0];
  check(`6. \`${name}: false\`: nothing recorded, no \`play_trace:\` row`, rec.rows.length === 0 && rec.puts === 0 && !rec.recording, { rows: rec.rows.length, puts: rec.puts });
  const ws = Object.values(rec.W.ws)[0];
  check(`6. ...the cap \`playtrace\` not advertised`, ws && capsOf(ws) && capsOf(ws).playtrace === undefined, ws && capsOf(ws));
}

/* ══════════ 7. THE MESSAGE PATH ══════════ */
{
  const ps = { x: 0, y: 0 };
  const room = { playerState: { s: ps }, _liveFlags: null };
  traceNote(room, { id: 's' }, { type: 'move', x: 1, y: 1 }, 0);
  check('7. a session not recording: traceNote makes nothing', !('_trace' in ps) && Object.keys(ps).length === 2);
  let threw = false;
  const bad = { playerState: { s: { _trace: { get ev() { throw new Error('x'); } } } } };
  try { traceNote(bad, { id: 's' }, { type: 'move', x: 1, y: 1 }, 0); traceNote(null, null, null); traceNote(room, { id: 'nobody' }, null); } catch (e) { threw = true; }
  check('7. traceNote never throws into the message switch', !threw);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
