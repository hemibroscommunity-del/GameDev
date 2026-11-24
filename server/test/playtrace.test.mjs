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
 *   8. THE SHADOW AGREES WITH THE REAL CHECK (v2.3.6483, sitting 59's mend):
 *      a normal character and a test-mode one in one room, the same moves,
 *      hits, strikes and cooks at the same clock times; what the room
 *      refuses the normal one (its sitting's card, its strike refusals, the
 *      fish left in its bag) the shadow counts for the test-mode one, reason
 *      by reason, at each check's exact edge, and with each check's own
 *      switch thrown (`movebudget`, `hitproof`, `swordswing`, a free-swing
 *      phone, `harvestproof`, `cookstart`).
 *   9. THE NOTE, EXACTLY: the events as kept (a move as what changed,
 *      `$gone`, thinning at THIN_MS, a kind no detector reads left out of
 *      both the events and the active time), the start, `after`, the
 *      active ms by SIT.IDLE_MS, the kinds, the bytes, the would-refuse and
 *      their moments; and the leave's ONE row carrying all of it.
 *  10. THE ENDS: MIN_ACTIVE_S at a leave (exactly: kept; a ms short: not);
 *      MAX_BYTES (filled exactly: goes on; a byte more: `cut: size`, kept
 *      however short); WOULD_AT (64 moments, every one counted).
 *  11. MID-RECORDING: `playtrace: false` thrown (nothing recorded, counted
 *      or shadowed, the shadow's lanes and clocks untouched; no row at the
 *      leave); test mode turned off (the room judges, the shadow is silent);
 *      a recording ended (test-mode play goes on as test mode lets it).
 *  12. A ROW'S PUT REFUSED (caught, the room goes on), and the pure helpers
 *      exactly: the KEEP ring, the row's kind, name, day, a copy, its start.
 *
 * MUTATION PASS (v2.3.6483, sitting 59's mend): every branch, call and
 * number card WHO's PR 3 added was mutated one at a time and this suite run
 * against each; what it does not kill is listed with why in the PR (an
 * equivalent mutant, or a guard the room cannot reach).  Three places where
 * the shadow and the room disagree were found and are NOT played in §8
 * (reported, not locked): the cook floor's shadow after a cook the floor
 * refused; a second cook with no start; a test-mode character's first move
 * after its join.
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
import { SIT } from '../src/sitting.js';
import { HARVEST_PROOF, HONEST_CYCLE } from '../src/gathering.js';

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

/* ══════════ v2.3.6483 (sitting 59's mend): a NORMAL character and a TEST-MODE one, side by side ══════════
 * The shadow's standard is the real check itself: one room, two characters
 * of one record, the same messages at the same clock times, each step
 * relative to where the character stands NOW (a refused move leaves the
 * normal one short, and the next step must not inherit that).  The normal
 * character's refusals are what the room records for it (its sitting's
 * card: hits refused by reason, SIT.REFUSALS / SIT.COL.hr, moves over the
 * budget, SIT.COL.mo; a strike's refusal, _strikeRefused; a cook's, the
 * fish left in the bag); the test-mode character's are its recording's
 * would-refuse counts (`ps._trace.wr`).  They must be equal, reason by
 * reason, and not by both being zero (each phase names what it expects). */
const NP = 'bp_who_real', TP = 'bp_who_test';
const W_BOW = { type: 'bow', tier: 'common', tierMult: 1.0, element1: null, element2: null, isVolatile: false, name: 'pine bow', gearBase: 'pine', quality: 'normal' };
const W_STAFF = { type: 'staff', tier: 'common', tierMult: 1.0, element1: null, element2: null, isVolatile: false, name: 'pine staff', gearBase: 'pine', quality: 'normal' };
const whoRec = () => ({ _v: 22, coins: 50, level: 5, hp: 250, maxHp: 250, inventory: { mining_pickaxe: 1, fish_minnow: 400, fish_trout: 5 }, lifeSkills: { mining: { level: 15, xp: 0 }, cooking: { level: 10, xp: 0 } }, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } });
/* the pair, joined in the Wheel at two tier-1 ore veins, at one clock time */
async function pairRoom(flags, opts = {}) {
  const st = makeStorage(new Map([['rpg:' + NP, whoRec()], ['rpg:' + TP, whoRec()], ['testmode:' + TP, { on: true }]]));
  const room = await openRoom(st, flags || null);
  const ores = room._ensureZoneNodes('wheel').filter((x) => x.nodeType === 'oreVein' && x.tierLvl === 1);
  const at = { [NP]: ores[0], [TP]: ores[1] };
  const ws = { [NP]: fakeWs('who-n'), [TP]: fakeWs('who-t') };
  for (const pid of [NP, TP]) await join(room, ws[pid], pid, { loginTaken: true, data: { x: at[pid].x + 10, y: at[pid].y + 10, z: 'wheel' } });
  await settle();
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  if (opts.fs) for (const pid of [NP, TP]) { const s = room.sessions.get(ws[pid]); if (s) s.freeSwing = opts.fs; }   /* join.js's own line for a join that said `fs` (claimbots.mjs makeWorld) */
  const ps = (pid) => room.playerState[pid];
  const send = (pid, msg) => room.webSocketMessage(ws[pid], JSON.stringify(msg));
  const both = async (fn) => { for (const pid of [NP, TP]) await fn(pid, ps(pid)); };
  /* a monster of the test's own, `dx, dy` from where the character stands now */
  room.monsters.wheel = [];
  let mn = 0;
  const mon = (pid, dx, dy) => { const p = ps(pid); const m = { id: 'mwho_' + pid.slice(-4) + '_' + (++mn), x: p.x + dx, y: p.y + dy, alive: true, hp: 1e6, maxHp: 1e6, level: 1 }; room.monsters.wheel.push(m); return m; };
  const hit = (pid, m, slot, extra) => send(pid, { type: 'monster_damage', payload: { monsterId: m.id, zone: 'wheel', slot, ...(extra || {}) } });
  const relay = (pid, m) => { const p = ps(pid); return send(pid, { type: 'player_projectile', payload: { x: Math.round(p.x), y: Math.round(p.y), ang: Math.atan2(m.y - p.y, m.x - p.x), isStaff: false, ts: Date.now() } }); };
  const arm = () => both(async (pid, p) => { p.rangedWeapon = { ...W_BOW }; p.staffWeapon = { ...W_STAFF }; });
  await both(async (pid, p) => { p._zoneEntryGraceUntil = 0; });
  /* a node struck stays standing for the next test's strike (each strike
     here is about its timing, not the node's life) */
  const snap = { [NP]: { ...at[NP] }, [TP]: { ...at[TP] } };
  const revive = () => { for (const pid of [NP, TP]) { const n = at[pid]; for (const k of Object.keys(n)) if (!(k in snap[pid])) delete n[k]; Object.assign(n, snap[pid]); } };
  return { st, room, ws, ps, send, both, mon, hit, relay, arm, at, revive };
}
const cardOf = (p) => { const s = p._econ.s, C = SIT.COL; return { hc: s[C.hc], hl: s[C.hl], hr: Object.fromEntries(SIT.REFUSALS.map((r, i) => [r, s[C.hr][i]])), mv: s[C.mv], mo: s[C.mo] }; };
const wrOf = (p) => Object.assign({}, p._trace && p._trace.wr);
/* the hit proof's chain, the normal character's refusals by the shadow's names;
   a sword's claim from past its reach (and, `hitproof: false`, a ranged one
   past the Wheel's widest) is refused with no reason counted: claimed and not
   landed, outside every counted reason */
const HIT_WHY = { noWeapon: 'hit_weapon', far: 'hit_far', rate: 'hit_rate', shot: 'hit_shot', swing: 'hit_swing' };
function hitsBoth(E, { quietFar = true } = {}) {
  const c = cardOf(E.ps(NP)), w = wrOf(E.ps(TP));
  const real = {}, shadow = {};
  let counted = 0;
  for (const [k, n] of Object.entries(HIT_WHY)) { real[n] = c.hr[k]; counted += c.hr[k]; shadow[n] = w[n] || 0; }
  if (quietFar) real.hit_far += c.hc - c.hl - counted;
  return { real, shadow };
}

/* ══════════ 8. THE SHADOW AGREES WITH THE REAL CHECK ══════════ */
/* 8a. THE MOVE.  `movetop: false`: the budget's refill is SPEED_PX itself
   (500 px a second, the burst 1,580), so a step can be EXACTLY what the
   budget holds (the room's rule takes it: dist <= the budget).  Every step
   is along x, inside one binade of the Wheel's coordinates, so `x + d - x`
   is d exactly for both characters. */
{
  const clock = seededClock({ start: Date.UTC(2026, 10, 24, 14, 0, 0), seed: 81 }).install();
  try {
    const out = await quietly(async () => {
      const E = await pairRoom({ movetop: false });
      const rows = [];
      const step = async (dt, dx, gust) => {
        clock.advance(dt);
        if (gust) await E.both(async (pid, p) => E.room._grantShove(p, [gust, 0], Date.now()));   /* the room's own grant (a mummy's shove, monsterstatus.js) */
        const mo0 = cardOf(E.ps(NP)).mo, w0 = wrOf(E.ps(TP)).move_budget || 0;
        await E.both((pid, p) => E.send(pid, { type: 'move', x: p.x + dx, y: p.y, z: 'wheel' }));
        rows.push([cardOf(E.ps(NP)).mo - mo0, (wrOf(E.ps(TP)).move_budget || 0) - w0]);
      };
      /* (the first move after the join: a short one -- the normal character's
         is judged from the join's own place, a test-mode one's from none) */
      await step(0, 2);
      await step(100, 20);          /* inside a full budget */
      await step(100, 5000);        /* a warp: over, the budget spent to 0 */
      await step(100, 50);          /* exactly the 100 ms refill: taken */
      await step(100, 50.5);        /* half a px past the refill: over */
      await step(100, 50.5);        /* again from 0 (not from 1) */
      await step(3000, 1000);       /* 1,500 refilled: taken, 500 left */
      await step(0, 400);           /* the same ms: 100 left */
      await step(0, 200);           /* over */
      await step(3200, 1600, 40);   /* full (1,580) and a 40 px gust: taken on the gust */
      await step(1500, 760);        /* AT the gust's end: 750 refilled, the gust gone: over */
      await step(3200, 1580.25, 0.5);   /* full, and a gust of half a px: taken */
      await step(1600, 800.2);      /* the gust's half px left but its time gone: over */
      /* a speed potion bought now (the shop's stamp, cooking.js _buffActive): the
         budget refills at 1.5 times the walk from here on */
      await E.both(async (pid, p) => { p._buffs = { spd: Date.now() + 600000, spdMul: 1.5 }; });
      await step(100, 5000);        /* a warp: over, 0 left */
      await step(100, 75);          /* exactly the potion's 100 ms: taken */
      await step(100, 75.5);        /* over */
      const off = await pairRoom({ movebudget: false });
      clock.advance(100); await off.send(TP, { type: 'move', x: off.ps(TP).x + 2, y: off.ps(TP).y, z: 'wheel' });
      clock.advance(100); await off.send(TP, { type: 'move', x: off.ps(TP).x + 5000, y: off.ps(TP).y, z: 'wheel' });
      return { rows, offWr: wrOf(off.ps(TP)) };
    });
    const real = out.rows.map((r) => r[0]), shadow = out.rows.map((r) => r[1]);
    check('8a. a move: the shadow\'s budget refuses exactly the moves the room\'s refuses (the warp, past the refill, past the gust, at the gust\'s end, past a potion\'s refill)', JSON.stringify(real) === JSON.stringify(shadow) && JSON.stringify(real) === JSON.stringify([0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1]), { real, shadow });
    check('8a. ...and with `movebudget: false` (the old per-message bound) nothing is shadowed', !out.offWr.move_budget, out.offWr);
  } finally { clock.restore(); }
}

/* 8b. THE HIT.  The chain in its order: the weapon, the reach (the sword's,
   the bow's or staff's own, with `hitproof: false` the Wheel's widest), the
   bow's rate, the bow's arrow seen, the sword's swing. */
{
  const clock = seededClock({ start: Date.UTC(2026, 10, 24, 14, 30, 0), seed: 82 }).install();
  try {
    const out = await quietly(async () => {
      const res = {};
      /* the default chain */
      {
        const E = await pairRoom(null);
        const { both, mon, hit, relay } = E;
        await both(async (pid, p) => { p.rangedWeapon = null; });
        await both(async (pid) => hit(pid, mon(pid, 50, 0), 'ranged'));   /* no bow, at the recording's first ms */
        await E.arm();
        const T = E.ps(TP), r = E.room._hitReach(T, 'ranged', Date.now()), rs = E.room._hitReach(T, 'staff', Date.now()), sw = E.room._swordReach();
        clock.advance(5000); await both(async (pid) => { const m = mon(pid, 300, 0); await relay(pid, m); await hit(pid, m, 'ranged'); });   /* a bow in reach, its arrow seen */
        clock.advance(5000); await both(async (pid) => hit(pid, mon(pid, 0, 5000), 'ranged'));   /* far, straight down */
        clock.advance(5000); await both(async (pid) => { const m = mon(pid, r, 0); await relay(pid, m); await hit(pid, m, 'ranged'); });   /* exactly the bow's reach */
        clock.advance(5000); await both(async (pid) => hit(pid, mon(pid, r + 1, 0), 'ranged'));
        clock.advance(5000); await both(async (pid) => hit(pid, mon(pid, sw, 0), 'melee'));       /* exactly the sword's reach */
        clock.advance(5000); await both(async (pid) => hit(pid, mon(pid, sw + 1, 0), 'melee'));
        clock.advance(5000); await both(async (pid) => hit(pid, mon(pid, 0, rs - 30), 'staff'));  /* a staff in its own reach */
        clock.advance(5000); await both(async (pid) => hit(pid, mon(pid, 0, rs + 30), 'staff'));  /* past the staff's, inside the bow's */
        clock.advance(5000); await both(async (pid) => { const a = mon(pid, 20, 0), b = mon(pid, 0, 20), c = mon(pid, -20, 0); for (const m of [a, a, b, a, c, b]) await hit(pid, m, 'melee'); });   /* one swing, its ring of three, and three again */
        /* 25 claims at once, no arrow seen, each on a monster of its own (the
           rate is the bow's across every monster; a monster's own 210 ms lane
           is no part of the hit proof's chain, and not shadowed) */
        clock.advance(5000); await both(async (pid) => { for (let i = 0; i < 25; i++) await hit(pid, mon(pid, 300, i), 'ranged'); });
        res.chain = hitsBoth(E);
        res.wt0 = E.ps(TP)._trace.wt[0];
        res.r = r;
        /* a special: left as test mode leaves it (playtrace.js: its window is never asked) */
        const w0 = wrOf(E.ps(TP));
        clock.advance(5000); { const m = mon(TP, 300, 0); for (let i = 0; i < 8; i++) await hit(TP, m, 'ranged', { special: true }); }
        res.special = [w0, wrOf(E.ps(TP))];
      }
      /* `hitproof: false`: no weapon, no reach of the bow's own, no rate; the Wheel's widest */
      {
        const E = await pairRoom({ hitproof: false });
        const { both, mon, hit, relay } = E;
        await both(async (pid, p) => { p.rangedWeapon = null; });
        clock.advance(1000); await both(async (pid) => hit(pid, mon(pid, 50, 0), 'ranged'));
        await E.arm();
        clock.advance(5000); await both(async (pid) => { const m = mon(pid, 3600, 0); await relay(pid, m); await hit(pid, m, 'ranged'); });   /* exactly WHEEL.RANGED_MAX */
        clock.advance(5000); await both(async (pid) => { const m = mon(pid, 0, 300); await relay(pid, m); await hit(pid, m, 'ranged'); });
        clock.advance(5000); await both(async (pid) => hit(pid, mon(pid, 3601, 0), 'ranged'));
        clock.advance(5000); await both(async (pid) => hit(pid, mon(pid, 0, 5000), 'ranged'));
        res.noproof = hitsBoth(E);
      }
      /* `swordswing: false`: the sword's old reach (PVE_MELEE_RANGE), no swing counted */
      {
        const E = await pairRoom({ swordswing: false });
        const { both, mon, hit } = E;
        const sw = E.room._swordReach();
        clock.advance(1000); await both(async (pid) => hit(pid, mon(pid, sw, 0), 'melee'));
        clock.advance(5000); await both(async (pid) => hit(pid, mon(pid, sw + 1, 0), 'melee'));
        res.noswing = hitsBoth(E); res.noswingReach = sw;
        /* four claims at once on one monster: no swing counted (the monster's
           own 210 ms lane refuses three in the room, outside the chain) */
        clock.advance(5000); await both(async (pid) => { const m = mon(pid, 20, 0); for (let i = 0; i < 4; i++) await hit(pid, m, 'melee'); });
        res.noswing4 = { real: cardOf(E.ps(NP)).hr.swing, shadow: wrOf(E.ps(TP)).hit_swing || 0 };
      }
      /* a phone on the free-swing trial: its swings are not the swing lane's
         -- until the trial's switch is thrown (`freeswing: false`), when they
         are, in the same session */
      {
        const E = await pairRoom(null, { fs: 1 });
        const { both, mon, hit } = E;
        clock.advance(1000); await both(async (pid) => { const m = mon(pid, 20, 0); for (let i = 0; i < 4; i++) await hit(pid, m, 'melee'); });
        res.free = { real: cardOf(E.ps(NP)).hr.swing, shadow: wrOf(E.ps(TP)).hit_swing || 0, claims: cardOf(E.ps(NP)).hc };
        E.room._liveFlags.freeswing = false;
        clock.advance(5000); await both(async (pid) => { const a = mon(pid, 20, 0), b = mon(pid, 0, 20); for (const m of [a, b, a]) await hit(pid, m, 'melee'); });
        res.freeOff = { real: cardOf(E.ps(NP)).hr.swing, shadow: wrOf(E.ps(TP)).hit_swing || 0 };
      }
      /* a paid volley (a swipe, index.js _handleAbilityUse): the bow's reach is
         the Wheel's widest while its window lasts, for an ordinary claim too */
      {
        const E = await pairRoom(null);
        const { both, mon, hit, relay, send } = E;
        await E.arm();
        await both(async (pid, p) => { p.mana = 100; });
        clock.advance(1000); await both((pid) => send(pid, { type: 'ability_use', payload: { type: 'swipe' } }));
        await both(async (pid) => { const m = mon(pid, 2000, 0); await relay(pid, m); await hit(pid, m, 'ranged'); });
        res.volley = { ...hitsBoth(E), landed: cardOf(E.ps(NP)).hl };
      }
      /* drawn arrows (drawgather.js, `bowdraw`): a shot loosed sooner than
         MIN_GAP_MS after the last is dropped, and a claim on it spends
         nothing of the bow's rate -- in shadow as in the room */
      {
        const E = await pairRoom(null);
        const { both, mon, hit, send } = E;
        await E.arm();
        clock.advance(5000);
        const t0 = Date.now();
        await both(async (pid, p) => { for (let i = 0; i < 21; i++) await send(pid, { type: 'player_projectile', payload: { x: Math.round(p.x), y: Math.round(p.y), ang: 0, isStaff: false, ts: t0 + i, dr: 2000 } }); });
        await both(async (pid) => { for (let i = 1; i < 21; i++) await hit(pid, mon(pid, 300, i), 'ranged', { sw: t0 + i }); });
        const c = cardOf(E.ps(NP)), w = wrOf(E.ps(TP));
        res.drawn = { real: { rate: c.hr.rate, shot: c.hr.shot }, shadow: { rate: w.hit_rate || 0, shot: w.hit_shot || 0 }, dropped: (E.ps(NP)._dg && E.ps(NP)._dg.q.filter((x) => x.drop).length) || 0 };
      }
      return res;
    });
    const want = { hit_weapon: 1, hit_far: 4, hit_rate: 10, hit_shot: 14, hit_swing: 3 };
    check('8b. a hit: the shadow refuses what the hit proof refuses, reason by reason (the weapon, each reach, the rate, the arrow, the swing)', JSON.stringify(out.chain.real) === JSON.stringify(out.chain.shadow) && Object.keys(want).every((k) => out.chain.real[k] > 0), out.chain);
    check('8b. ...the first, at the recording\'s first ms: `wt` [0, hit_weapon]', JSON.stringify(out.wt0) === JSON.stringify([0, TRACE.WOULD.indexOf('hit_weapon')]), out.wt0);
    const sp = out.special;
    check('8b. ...a special asks no lane in shadow (eight bow specials at once, no arrow seen: nothing counted)', JSON.stringify(sp[0]) === JSON.stringify(sp[1]), sp);
    check('8b. `hitproof: false`: no weapon or rate asked, a ranged hit held to the Wheel\'s widest (3,600 taken, 3,601 not), as the room holds it', JSON.stringify(out.noproof.real) === JSON.stringify(out.noproof.shadow) && out.noproof.real.hit_far === 2 && out.noproof.real.hit_weapon === 0, out.noproof);
    check('8b. `swordswing: false`: the sword\'s reach is PVE_MELEE_RANGE and no swing is counted, in shadow as in the room', out.noswingReach === 400 && JSON.stringify(out.noswing.real) === JSON.stringify(out.noswing.shadow) && out.noswing.real.hit_far === 1 && out.noswing4.real === 0 && out.noswing4.shadow === 0, out);
    check('8b. a free-swing phone: no swing refused, in shadow as in the room', out.free.real === 0 && out.free.shadow === 0 && out.free.claims === 4, out.free);
    check('8b. ...its trial switched off mid-session (`freeswing: false`): its swings counted again, in shadow as in the room', out.freeOff.real === 1 && out.freeOff.shadow === 1, out.freeOff);
    check('8b. a paid volley\'s window: an ordinary bow claim from 2,000 px is in reach, in shadow as in the room', out.volley.landed === 1 && JSON.stringify(out.volley.real) === JSON.stringify(out.volley.shadow) && out.volley.real.hit_far === 0, out.volley);
    check('8b. drawn arrows loosed under MIN_GAP_MS: dropped, and their claims spend none of the bow\'s rate, in shadow as in the room', out.drawn.dropped === 20 && out.drawn.real.rate === 0 && JSON.stringify(out.drawn.real) === JSON.stringify(out.drawn.shadow), out.drawn);
  } finally { clock.restore(); }
}

/* 8c. THE STRIKE: too early for its own start; with no start of its own
   (one a HARVEST_PROOF.RECOVER_MS taken as a recovery, the rest refused) */
const STRIKE_NO = new Set(['too-early', 'no-start', 'other-node']);
{
  const clock = seededClock({ start: Date.UTC(2026, 10, 24, 15, 0, 0), seed: 83 }).install();
  try {
    const out = await quietly(async () => {
      const play = async (flags) => {
        const E = await pairRoom(flags);
        const { room, both, send, at, revive } = E;
        const refused = { early: 0, startless: 0 };
        const real = room._strikeRefused.bind(room);
        room._strikeRefused = (s, why, extra) => { if (s && s.id === NP && STRIKE_NO.has(why)) refused[why === 'too-early' ? 'early' : 'startless']++; return real(s, why, extra); };
        const start = async () => { revive(); await both(async (pid) => { await send(pid, { type: 'extraction_start', payload: { nodeId: at[pid].id, zone: 'wheel', skill: 'mining', hitSeq: 1 } }); const ex = room.extractions[pid]; if (ex) { ex.openDelayBase = 5000; ex.jitter = 0; } }); };   /* one plan for both: its window opens 5 s on */
        const strike = async () => { revive(); await both(async (pid) => send(pid, { type: 'node_strike', payload: { id: at[pid].id, zone: 'wheel', accuracy: 'good' } })); };
        await start(); clock.advance(150); await strike();                                   /* too early */
        await start(); clock.advance(5000 - room.EXTRACTION_GRACE_MS); await strike();      /* exactly at the window's earliest */
        clock.advance(1000); await strike();                                                  /* no start: the recovery */
        clock.advance(1000); await strike();                                                  /* no start again: refused */
        clock.advance(HARVEST_PROOF.RECOVER_MS - 1001); await strike();                       /* a ms short of the recovery's time */
        clock.advance(1); await strike();                                                     /* exactly at it: the recovery again */
        const w = wrOf(E.ps(TP));
        return { real: refused, shadow: { early: w.strike_early || 0, startless: w.strike_unstarted || 0 } };
      };
      return { on: await play(null), off: await play({ harvestproof: false }) };
    });
    check('8c. a strike: the shadow refuses what the room refuses (too early, and at the window\'s earliest not; startless past the recovery, and at its exact time not)', JSON.stringify(out.on.real) === JSON.stringify(out.on.shadow) && out.on.real.early === 1 && out.on.real.startless === 2, out.on);
    check('8c. ...and with `harvestproof: false` no startless strike is refused, in shadow as in the room', JSON.stringify(out.off.real) === JSON.stringify(out.off.shadow) && out.off.real.startless === 0 && out.off.real.early === 1, out.off);
  } finally { clock.restore(); }
}

/* 8d. THE COOK: the 900 ms floor, COOK_PER_MIN a minute, the cook's start.
   KNOWN GAPS, not played here (reported, sitting 59's mend): the floor's
   shadow reads play's `_lastCookAt`, which test mode moves on every cook,
   so a cook the floor refused moves the next one's floor in shadow but not
   in the room; and a second cook with no start is refused by the room
   (one a session) but never in shadow (_cookStartOk spends nothing). */
{
  const clock = seededClock({ start: Date.UTC(2026, 10, 24, 15, 30, 0), seed: 84 }).install();
  try {
    const out = await quietly(async () => {
      const res = {};
      const cooker = async (flags) => {
        const E = await pairRoom(flags);
        const fish = (k) => (E.ps(NP).inventory[k] || 0);
        const rows = [];
        const cook = async (dt, fk = 'fish_minnow') => {
          clock.advance(dt);
          const f0 = fish(fk), w0 = wrOf(E.ps(TP));
          await E.both((pid) => E.send(pid, { type: 'cook_request', payload: { fishKey: fk, kind: 'cooked' } }));
          const w1 = wrOf(E.ps(TP)), d = (k) => (w1[k] || 0) - (w0[k] || 0);
          rows.push({ real: fish(fk) === f0 ? 1 : 0, shadow: d('cook_floor') + d('cook_rate') + d('cook_start'), floor: d('cook_floor'), rate: d('cook_rate'), start: d('cook_start') });
        };
        return { E, rows, cook };
      };
      /* the floor and the rate (`cookstart: false`, so every cook the floor and the rate let through is the room's) */
      {
        const { E: E1, rows, cook } = await cooker({ cookstart: false });
        await cook(0); await cook(900); await cook(899); await cook(1000);   /* the floor: at 900 taken, at 899 not */
        clock.advance(61000);
        await cook(0); for (let i = 0; i < 44; i++) await cook(1000);       /* 45 in a minute: taken */
        await cook(1000);                                                    /* the 46th: the rate */
        await cook(15000);                                                   /* exactly a minute after the first: it has left the minute, taken */
        res.rate = rows.slice();
        /* ...and with `cookstart: false` a result before its plan is no refusal, in shadow as in the room */
        clock.advance(61000);
        await E1.both((pid) => E1.send(pid, { type: 'extraction_start', payload: { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: 1 } }));
        await cook(1000);
        res.startOff = rows[rows.length - 1];
      }
      /* the cook's start (`cookstart`, on by default) */
      {
        const { E, rows, cook } = await cooker(null);
        const start = () => E.both((pid) => E.send(pid, { type: 'extraction_start', payload: { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: 1 } }));
        await start(); await cook(10);              /* the plan's result far too soon */
        await cook(8000);                           /* on its plan, in time */
        await cook(2000);                           /* the session's one result with no plan */
        await start(); await cook(8000, 'fish_trout');   /* a plan for another fish */
        res.start = rows;
        res.startWt = E.ps(TP)._trace.wt.map(([t]) => t);
        res.startT = Date.now() - E.ps(TP)._trace.t0;
      }
      return res;
    });
    const col = (rows, k) => rows.map((r) => r[k]);
    const r = out.rate;
    check('8d. a cook: the shadow\'s floor and rate refuse exactly the cooks the room refuses (at 899 ms, the 46th in a minute; at 900 ms and a minute exactly after the first not)', JSON.stringify(col(r, 'real')) === JSON.stringify(col(r, 'shadow')) && col(r, 'floor').reduce((a, b) => a + b) === 1 && col(r, 'rate').reduce((a, b) => a + b) === 1 && r[1].real === 0 && r[r.length - 1].real === 0, { real: col(r, 'real').join(''), shadow: col(r, 'shadow').join('') });
    check('8d. ...with `cookstart: false`, a result before its plan is refused neither in the room nor in shadow', out.startOff.real === 0 && out.startOff.shadow === 0, out.startOff);
    const s = out.start;
    check('8d. ...the cook\'s start: a result before its plan could be played and a result on another fish\'s plan refused, in shadow as in the room; one in time, and the session\'s one with no plan, taken', JSON.stringify(col(s, 'real')) === JSON.stringify([1, 0, 0, 1]) && JSON.stringify(col(s, 'start')) === JSON.stringify([1, 0, 0, 1]) && out.startWt.length === 2 && out.startWt[1] === out.startT, { s, wt: out.startWt, t: out.startT });
  } finally { clock.restore(); }
}

/* ══════════ 9. THE NOTE, EXACTLY: what a test-mode page sent, as the row keeps it ══════════ */
{
  const clock = seededClock({ start: Date.UTC(2026, 10, 24, 16, 0, 3), seed: 91 })   /* an odd second: the sitting's slot is not 0 */.install();
  try {
    const out = await quietly(async () => {
      const E = await pairRoom(null);
      const { room, send, at, revive } = E;
      const T = E.ps(TP), R = T._trace, J = R.t0, X = Math.round(T.x), Y = Math.round(T.y);
      const sid = R.sid, puts = countTracePuts(room);
      const go = async (t, msg) => { clock.advance(J + t - Date.now()); await send(TP, msg); };
      const ck = { type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } };
      const es = (seq) => ({ type: 'extraction_start', payload: { nodeId: at[TP].id, zone: 'wheel', skill: 'mining', hitSeq: seq } });
      const ns = (id) => ({ type: 'node_strike', payload: { id, zone: 'wheel', accuracy: 'good' } });
      await go(0, { type: 'pong' });                                /* no kind a detector reads */
      await go(0, { type: 'move', x: '5', y: Y, z: 'wheel' });      /* no number for x: kept, but no place to start from */
      await go(1, { type: 'move', x: X, y: Y, d: 'down' });         /* the start (no z: the room's zone) */
      await go(101, { type: 'move', x: X, y: Y, d: 'down' });       /* the same inside THIN_MS: thinned */
      await go(1001, { type: 'move', x: X, y: Y, d: 'down' });      /* the same at THIN_MS exactly: kept */
      await go(1002, { type: 'move', x: X + 1, y: Y });             /* `d` dropped */
      await go(1002, ck);
      await go(1102, ck);                                           /* the same cook again: never thinned (and under the floor) */
      await go(1202, { type: 'move', x: X + 1, y: Y });             /* the move again, a cook between: kept */
      await go(61202, { type: 'move', x: X + 1, y: Y });            /* SIT.IDLE_MS exactly after: active */
      await go(121203, { type: 'move', x: X + 1, y: Y });           /* a ms past it: not */
      await go(171203, { type: 'pong' });                           /* a kind no detector reads, in a gap: */
      await go(191203, { type: 'move', x: X + 1, y: Y });           /* ...the gap is still 70 s: not active */
      await go(191203, { type: 'move', x: X + 1, y: Y });           /* the same in the same ms, long into the recording: thinned */
      const act = R.act;
      const plan = () => { const x = room.extractions[TP]; if (x) { x.openDelayBase = 3000; x.jitter = 0; } return x; };   /* a plan whose window opens 3 s on */
      revive(); await go(191203, es(1)); plan();
      await go(191303, ns(at[TP].id));                               /* before its plan's end: `after` 0 */
      revive(); await go(191403, es(2));
      const ex = plan();
      const t4 = ex ? ex.startedAt - J + 3000 + HONEST_CYCLE.LEAD_MS + HONEST_CYCLE.SETTLE_MS + 777 : 0;
      await go(t4, ns(at[TP].id));                                   /* 777 ms past its plan */
      revive(); await go(t4 + 1000, es(3)); plan();
      await go(t4 + 1100, ns('no_such_node'));                       /* a strike on no node takes the start's `after`... */
      revive(); await go(t4 + 1200, ns(at[TP].id));                  /* ...so the strike on its node has none */
      revive(); await go(t4 + 1300, ns(at[TP].id));                  /* and a strike with no start at all, none */
      const snap = JSON.parse(JSON.stringify({ ev: R.ev, start: R.start, kinds: R.kinds, bytes: R.bytes, act: R.act, wr: R.wr, wt: R.wt }));
      clock.advance(1000);
      const leftAt = Date.now();
      await room.webSocketClose(E.ws[TP], 1000, 'bye', true); await settle();
      return { X, Y, J, sid, t4, act, snap, leftAt, puts: puts.n, rows: rowsOf(E.st), ck, es, ns, node: at[TP].id };
    });
    const { X, Y, t4, snap, ck, es, ns, node } = out;
    const want = [
      { t: 0, mv: { type: 'move', x: '5', y: Y, z: 'wheel' } },
      { t: 1, mv: { x: X, d: 'down', z: { $gone: 1 } } },
      { t: 1001, mv: {} },
      { t: 1002, mv: { x: X + 1, d: { $gone: 1 } } },
      { t: 1002, m: ck }, { t: 1102, m: ck },
      { t: 1202, mv: {} }, { t: 61202, mv: {} }, { t: 121203, mv: {} }, { t: 191203, mv: {} },
      { t: 191203, m: es(1) }, { t: 191303, m: ns(node), after: 0 },
      { t: 191403, m: es(2) }, { t: t4, m: ns(node), after: 777 },
      { t: t4 + 1000, m: es(3) }, { t: t4 + 1100, m: ns('no_such_node'), after: 0 },
      { t: t4 + 1200, m: ns(node) }, { t: t4 + 1300, m: ns(node) },
    ];
    check('9. the events, exactly: a move as what changed (`{ $gone: 1 }` a key dropped), repeats thinned inside THIN_MS and kept at it, every other kind whole, each strike\'s `after` only on the first strike after its start', JSON.stringify(snap.ev) === JSON.stringify(want), { got: snap.ev.map((e) => JSON.stringify(e).slice(0, 90)) });
    check('9. ...the trace\'s start the first move with a numbered place (its zone the room\'s when the move names none)', JSON.stringify(snap.start) === JSON.stringify({ x: X, y: Y, z: 'wheel' }), snap.start);
    check('9. ...active ms the sitting\'s card\'s rule: gaps of 1 ms counted, of SIT.IDLE_MS counted, of a ms more not, a kind no detector reads neither counted nor a gap\'s end', out.act === 61202 && snap.act === 61202 + 100 + 100 + (t4 - 191403) + 1000 + 100 + 100 + 100, { act: out.act, end: snap.act });
    check('9. ...each kind counted, the bytes each event\'s JSON and one', JSON.stringify(snap.kinds) === JSON.stringify({ cook_request: 2, extraction_start: 3, node_strike: 5 }) && snap.bytes === snap.ev.reduce((a, e) => a + JSON.stringify(e).length + 1, 0), { kinds: snap.kinds, bytes: snap.bytes });
    check('9. ...would-refuse counted, with their moments: the cook under the floor, the two strikes before their plans', JSON.stringify(snap.wr) === JSON.stringify({ cook_floor: 1, strike_early: 2 }) && JSON.stringify(snap.wt) === JSON.stringify([[1102, TRACE.WOULD.indexOf('cook_floor')], [191303, TRACE.WOULD.indexOf('strike_early')], [t4 + 1200, TRACE.WOULD.indexOf('strike_early')]]), { wr: snap.wr, wt: snap.wt });
    const [key, row] = out.rows[0] || [];
    check('9. the leave puts the ONE row: its key the sitting\'s slot, at the leave\'s moment, `cut: leave`, its act in seconds', out.puts === 1 && out.rows.length === 1 && key === traceKey(TP, out.sid) && row.at === out.leftAt && row.cut === 'leave' && row.act === Math.round(snap.act / 1000) && row.sid === out.sid && row.pid === TP, row && { key, at: row.at, cut: row.cut, act: row.act });
    check('9. ...the recording whole in it: its events, start, would-refuse; a harvest (the most of its kinds)', row && JSON.stringify(row.trace.events) === JSON.stringify(snap.ev) && JSON.stringify(row.trace.start) === JSON.stringify(snap.start) && JSON.stringify(row.wr) === JSON.stringify(snap.wr) && JSON.stringify(row.wt) === JSON.stringify(snap.wt) && row.trace.kind === 'harvest' && row.trace.name === 'play_trace ' + TP + ' ' + out.sid, row && { kind: row.trace.kind, name: row.trace.name });
  } finally { clock.restore(); }
}

/* ══════════ 10. THE ENDS: the leave's minimum, the row's size, the moments kept ══════════ */
{
  const clock = seededClock({ start: Date.UTC(2026, 10, 24, 17, 0, 5), seed: 101 })   /* an odd second: the sitting's slot is not 0 */.install();
  try {
    const out = await quietly(async () => {
      const res = {};
      /* a leave after `ms` active ms: a move a second, then the last gap */
      const leaveAfter = async (ms) => {
        const E = await pairRoom(null);
        const T = E.ps(TP), puts = countTracePuts(E.room);
        let left = ms, i = 0;
        while (left > 0) { const d = Math.min(1000, left); left -= d; clock.advance(d); await E.send(TP, { type: 'move', x: T.x + (++i % 2 ? 1 : -1), y: T.y, z: 'wheel' }); }
        const act = T._trace && T._trace.act, sid = T._trace && T._trace.sid;
        await E.room.webSocketClose(E.ws[TP], 1000, 'bye', true); await settle();
        return { act, puts: puts.n, rows: rowsOf(E.st).map(([k, r]) => [k === traceKey(TP, sid), r.cut, r.act]), ended: !T._trace };
      };
      res.min = await leaveAfter(TRACE.MIN_ACTIVE_S * 1000);
      res.short = await leaveAfter(TRACE.MIN_ACTIVE_S * 1000 - 1);
      /* the row's size: moves whose `d` fills it to MAX_BYTES (+ `over`) exactly */
      const fill = async (over) => {
        const E = await pairRoom(null);
        const T = E.ps(TP), R = T._trace, puts = countTracePuts(E.room);
        const X = T.x, Y = T.y;
        let i = 0;
        const mv = (d) => E.send(TP, { type: 'move', x: X, y: Y, z: 'wheel', d });
        while (T._trace && R.bytes < TRACE.MAX_BYTES - 4000 && i < 200) { clock.advance(1000); await mv((i++ % 2 ? 'a' : 'b').repeat(2000)); }
        clock.advance(1000);
        const room = TRACE.MAX_BYTES + over - R.bytes, base = JSON.stringify({ t: Date.now() - R.t0, mv: { d: '' } }).length + 1;
        const n0 = R.ev.length;
        await mv((i++ % 2 ? 'a' : 'b').repeat(room - base));
        const r = { n0, last: { recording: !!T._trace, bytes: R.bytes, n: R.ev.length }, puts0: puts.n };
        if (T._trace) { clock.advance(1000); await mv('c'); }
        r.puts = puts.n; r.rows = rowsOf(E.st).map(([, v]) => ({ cut: v.cut, act: v.act, n: v.trace.events.length, len: JSON.stringify(v).length }));
        return r;
      };
      res.fit = await fill(0);
      res.over = await fill(1);
      /* a recording with no move in it (cooks only): its start is where the room has the character */
      {
        const E = await pairRoom(null);
        const T = E.ps(TP), puts = countTracePuts(E.room);
        for (let i = 0; i < 61; i++) { clock.advance(1000); await E.send(TP, { type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } }); }
        const place = { x: Math.round(T.x), y: Math.round(T.y), z: T.z };
        await E.room.webSocketClose(E.ws[TP], 1000, 'bye', true); await settle();
        const r = rowsOf(E.st)[0];
        res.nomove = { puts: puts.n, place, start: r && r[1].trace.start, kind: r && r[1].trace.kind };
      }
      /* WOULD_AT: 70 would-refuse, 64 moments */
      {
        const E = await pairRoom(null);
        const T = E.ps(TP);
        T.rangedWeapon = null;
        const ts = [];
        for (let i = 0; i < 70; i++) { clock.advance(10); ts.push(Date.now() - T._trace.t0); await E.hit(TP, E.mon(TP, 50, 0), 'ranged'); }
        res.would = { wr: wrOf(T), wt: T._trace.wt.slice(), ts };
      }
      return res;
    });
    check('10. a leave after MIN_ACTIVE_S active seconds exactly puts its row (`cut: leave`, its key the sitting\'s)', out.min.act === 60000 && out.min.puts === 1 && JSON.stringify(out.min.rows) === JSON.stringify([[true, 'leave', 60]]) && out.min.ended, out.min);
    check('10. ...a ms short of them, none, and the recording ends all the same', out.short.act === 59999 && out.short.puts === 0 && out.short.rows.length === 0 && out.short.ended, out.short);
    const f = out.fit, o = out.over;
    check('10. a recording filled to MAX_BYTES exactly goes on; the next message ends it `cut: size`, under a minute active and kept', f.last.recording && f.last.bytes === TRACE.MAX_BYTES && f.last.n === f.n0 + 1 && f.puts0 === 0 && f.puts === 1 && f.rows.length === 1 && f.rows[0].cut === 'size' && f.rows[0].n === f.n0 + 1 && f.rows[0].act < TRACE.MIN_ACTIVE_S && f.rows[0].len <= TRACE.MAX_BYTES + 4096, f);
    check('10. ...a byte more and that message ends it, unrecorded', !o.last.recording && o.last.n === o.n0 && o.puts === 1 && o.rows.length === 1 && o.rows[0].cut === 'size' && o.rows[0].n === o.n0, o);
    check('10. a recording of cooks only: its start the room\'s place for the character, its kind `cook`', out.nomove.puts === 1 && out.nomove.place.z === 'wheel' && JSON.stringify(out.nomove.start) === JSON.stringify(out.nomove.place) && out.nomove.kind === 'cook', out.nomove);
    const w = out.would, I = TRACE.WOULD.indexOf('hit_weapon');
    check('10. WOULD_AT: seventy would-refuse all counted, the first 64 moments kept', w.wr.hit_weapon === 70 && w.wt.length === TRACE.WOULD_AT && JSON.stringify(w.wt) === JSON.stringify(w.ts.slice(0, 64).map((t) => [t, I])), { wr: w.wr, n: w.wt.length, last: w.wt[63] });
  } finally { clock.restore(); }
}

/* ══════════ 11. MID-RECORDING: the kill switch thrown, test mode turned off, a recording ended ══════════ */
{
  const clock = seededClock({ start: Date.UTC(2026, 10, 24, 18, 0, 0), seed: 111 }).install();
  try {
    const out = await quietly(async () => {
      const res = {};
      /* `playtrace: false` thrown while it records: nothing recorded, counted
         or shadowed (no lane of the shadow's spent, no budget, no clock), and
         its leave puts nothing; thrown back, the shadow is as it was left */
      {
        const E = await pairRoom(null);
        const { room, send, at, revive, mon, hit, relay } = E;
        const T = E.ps(TP), R = T._trace, puts = countTracePuts(room);
        const step = (dx) => send(TP, { type: 'move', x: T.x + dx, y: T.y, z: 'wheel' });
        for (let i = 0; i < 61; i++) { clock.advance(1000); await step(i % 2 ? 2 : -2); }   /* past MIN_ACTIVE_S: a leave now would keep a row */
        /* before it is thrown: each shadow asked once (a bow claim with no bow:
           one would-refuse; a cook; a startless strike, its recovery's clock
           stamped -- and a RECOVER_MS later, so the next one is a recovery) */
        T.rangedWeapon = null; await hit(TP, mon(TP, 50, 0), 'ranged');
        await send(TP, { type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } });
        revive(); await send(TP, { type: 'node_strike', payload: { id: at[TP].id, zone: 'wheel', accuracy: 'good' } });
        clock.advance(HARVEST_PROOF.RECOVER_MS + 1);
        const before = { n: R.ev.length, wr: wrOf(T), kinds: JSON.stringify(R.kinds) };
        room._liveFlags.playtrace = false;
        for (let i = 0; i < 45; i++) { clock.advance(1000); await send(TP, { type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } }); }
        clock.advance(200); await send(TP, { type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } });   /* under the floor */
        clock.advance(5000);
        revive(); await send(TP, { type: 'node_strike', payload: { id: at[TP].id, zone: 'wheel', accuracy: 'good' } });   /* the recovery's clock: untouched */
        await step(1500); await step(-1500);                         /* the shadow's budget: untouched (and back at the node) */
        T.rangedWeapon = null; await hit(TP, mon(TP, 50, 0), 'ranged');   /* no bow */
        T.rangedWeapon = { ...W_BOW };
        for (let i = 0; i < 20; i++) await hit(TP, mon(TP, 300, i), 'ranged');   /* the bow's lanes: untouched */
        const during = { n: R.ev.length, wr: wrOf(T), kinds: JSON.stringify(R.kinds), same: T._trace === R };
        room._liveFlags.playtrace = true;   /* and at once: no lane or budget refilled since */
        revive(); await send(TP, { type: 'node_strike', payload: { id: at[TP].id, zone: 'wheel', accuracy: 'good' } });
        await send(TP, { type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } });
        await step(1000);
        { const m = mon(TP, 300, 0); await relay(TP, m); await hit(TP, m, 'ranged'); }
        const back = { n: R.ev.length, wr: wrOf(T) };
        room._liveFlags.playtrace = false;
        for (let i = 0; i < 70; i++) { clock.advance(1000); await step(i % 2 ? 1 : -1); }   /* past MIN_ACTIVE_S, unrecorded */
        await room.webSocketClose(E.ws[TP], 1000, 'bye', true); await settle();
        res.flag = { before, during, back, puts: puts.n, rows: rowsOf(E.st).length, ended: !T._trace };
        /* ...and a NEW sitting begun while it is thrown (back past SIT.GAP_MS):
           not recorded, the cap not advertised */
        clock.advance(SIT.GAP_MS + 60000);
        const w2 = fakeWs('who-t3');
        await join(room, w2, TP, { loginTaken: true, data: { x: at[TP].x + 10, y: at[TP].y + 10, z: 'wheel' } }); await settle();
        res.flag.again = { recording: !!(room.playerState[TP] && room.playerState[TP]._trace), cap: (capsOf(w2) || {}).playtrace, fresh: room.playerState[TP] && room.playerState[TP]._econ.s[SIT.COL.u] === room.playerState[TP]._econ.s[SIT.COL.t] };
      }
      /* one sitting's row put; a new sitting (back past SIT.GAP_MS) records
         again, and `playtrace: false` thrown before ITS leave: no second row */
      {
        const E = await pairRoom(null);
        const { room, at } = E;
        const puts = countTracePuts(room);
        const sit = async (ws) => { const T = room.playerState[TP]; for (let i = 0; i < 61; i++) { clock.advance(1000); await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: T.x + (i % 2 ? 1 : -1), y: T.y, z: 'wheel' })); } };
        await sit(E.ws[TP]);
        await room.webSocketClose(E.ws[TP], 1000, 'bye', true); await settle();
        const first = puts.n;
        clock.advance(SIT.GAP_MS + 60000);
        const w2 = fakeWs('who-t4');
        await join(room, w2, TP, { loginTaken: true, data: { x: at[TP].x + 10, y: at[TP].y + 10, z: 'wheel' } }); await settle();
        const again = !!room.playerState[TP]._trace;
        await sit(w2);
        room._liveFlags.playtrace = false;
        await room.webSocketClose(w2, 1000, 'bye', true); await settle();
        res.second = { first, again, puts: puts.n };
      }
      /* test mode turned off while it records (the admin's own way): the room's
         checks judge the character now, and the shadow says nothing */
      {
        const E = await pairRoom(null);
        const { room, send, mon, hit } = E;
        const T = E.ps(TP);
        await E.arm();
        const cook = () => send(TP, { type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } });
        clock.advance(100); await send(TP, { type: 'move', x: T.x + 2, y: T.y, z: 'wheel' });
        await cook();
        await room._testModeSet(TP, false);
        clock.advance(100); await send(TP, { type: 'move', x: T.x + 5000, y: T.y, z: 'wheel' });
        clock.advance(100); for (let i = 0; i < 20; i++) await hit(TP, mon(TP, 300, i), 'ranged');
        for (let i = 0; i < 46; i++) { clock.advance(1000); await cook(); }   /* the room's own rate now (its 46th refused) */
        res.tmOff = { wr: wrOf(T), card: cardOf(T), recording: !!T._trace, hist: (T._cookHistory || []).length };
      }
      /* a test-mode character whose recording ended (the leave; back inside its
         sitting): its strikes and cooks are play as test mode lets them */
      {
        const E = await pairRoom(null);
        const { room, send, at, revive } = E;
        clock.advance(1000); await send(TP, { type: 'move', x: E.ps(TP).x + 2, y: E.ps(TP).y, z: 'wheel' });
        await room.webSocketClose(E.ws[TP], 1000, 'bye', true); await settle();
        clock.advance(20000);
        E.ws[TP] = fakeWs('who-t2');
        await join(room, E.ws[TP], TP, { loginTaken: true, data: { x: at[TP].x + 10, y: at[TP].y + 10, z: 'wheel' } }); await settle();
        const T = room.playerState[TP];
        const ore = () => T.inventory.ore_copper_ore || 0, fish = () => T.inventory.fish_minnow || 0;
        const o0 = ore(), f0 = fish();
        revive(); clock.advance(1000); await send(TP, { type: 'extraction_start', payload: { nodeId: at[TP].id, zone: 'wheel', skill: 'mining', hitSeq: 1 } });
        clock.advance(100); await send(TP, { type: 'node_strike', payload: { id: at[TP].id, zone: 'wheel', accuracy: 'good' } });   /* too early */
        for (let i = 0; i < 2; i++) { revive(); clock.advance(1000); await send(TP, { type: 'node_strike', payload: { id: at[TP].id, zone: 'wheel', accuracy: 'good' } }); }   /* no start */
        for (let i = 0; i < 2; i++) { clock.advance(100); await send(TP, { type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } }); }
        res.done = { recording: !!T._trace, ore: ore() - o0, fish: f0 - fish(), tm: room._testMode(T) };
      }
      /* `sitting: true` in the live flags (as any explicit on): it records */
      { const E = await pairRoom({ sitting: true }); res.sitOn = !!E.ps(TP)._trace; }
      return res;
    });
    const fl = out.flag;
    check('11. `playtrace: false` thrown mid-recording: nothing more recorded or counted, the recording kept as it was', fl.during.n === fl.before.n && JSON.stringify(fl.during.wr) === JSON.stringify(fl.before.wr) && fl.during.kinds === fl.before.kinds && fl.during.same, fl);
    check('11. ...thrown back: recorded again, and the shadow as the switch left it (its budget, the bow\'s lanes, the recovery\'s clock, the cook\'s minute: nothing would refuse)', fl.back.n === fl.during.n + 5 && JSON.stringify(fl.back.wr) === JSON.stringify(fl.before.wr) && fl.before.wr.hit_weapon === 1, fl);
    check('11. ...thrown again for the leave: no row, and the recording ended', fl.puts === 0 && fl.rows === 0 && fl.ended, fl);
    check('11. ...and a new sitting begun while it is thrown: no recording, no cap `playtrace`', fl.again.fresh && !fl.again.recording && fl.again.cap === undefined, fl.again);
    check('11. a second sitting records again; the switch thrown before its leave: its row not put (one row in all)', out.second.first === 1 && out.second.again && out.second.puts === 1, out.second);
    const tm = out.tmOff;
    check('11. test mode turned off mid-recording: the room judges the moves, hits and cooks (its card counts them; its rate keeps 45 a minute) and the shadow says nothing', JSON.stringify(tm.wr) === '{}' && tm.recording && tm.card.mo === 1 && tm.card.hr.rate > 0 && tm.hist === 45, tm);
    check('11. a test-mode character whose recording ended: a too-early and a startless strike and two quick cooks are play as test mode lets them', !out.done.recording && out.done.tm && out.done.ore === 3 && out.done.fish === 2, out.done);
    check('11. `sitting: true` in the live flags: a test-mode sitting still records', out.sitOn);
  } finally { clock.restore(); }
}

/* ══════════ 12. A PUT REFUSED, AND THE PURE HELPERS EXACTLY ══════════ */
{
  /* storage refuses the row's put: the room carries on (the put's rejection is
     caught, never an unhandled one that would end the worker) */
  const clock = seededClock({ start: Date.UTC(2026, 10, 24, 19, 0, 0), seed: 121 }).install();
  try {
    const out = await quietly(async () => {
      const E = await pairRoom(null);
      const sto = E.room.state.storage, put = sto.put.bind(sto);
      let refused = 0;
      sto.put = (k, v) => { if (typeof k === 'string' && k.startsWith(TRACE.PREFIX)) { refused++; return Promise.reject(new Error('storage refused')); } return put(k, v); };
      const T = E.ps(TP);
      for (let i = 0; i < 70; i++) { clock.advance(1000); await E.send(TP, { type: 'move', x: T.x + (i % 2 ? 1 : -1), y: T.y, z: 'wheel' }); }
      await E.room.webSocketClose(E.ws[TP], 1000, 'bye', true);
      for (let i = 0; i < 5; i++) await settle();
      clock.advance(1000); await E.send(NP, { type: 'move', x: E.ps(NP).x + 2, y: E.ps(NP).y, z: 'wheel' });
      return { refused, moved: cardOf(E.ps(NP)).mv };
    });
    check('12. a row\'s put refused by storage: caught, the room carries on', out.refused === 1 && out.moved >= 1, out);
  } finally { clock.restore(); }
  /* the numbers SHAPES part 7 names, as the suites above play them */
  check('12. the row\'s numbers: ten active minutes, one at least at a leave, 8 kept, 96,000 bytes, a repeat a second, 64 moments', TRACE.ACTIVE_S === 600 && TRACE.MIN_ACTIVE_S === 60 && TRACE.KEEP === 8 && TRACE.MAX_BYTES === 96000 && TRACE.THIN_MS === 1000 && TRACE.WOULD_AT === 64 && TRACE.WOULD.length === 11 && TRACE.TYPES.length === 9, TRACE);
  const keys = Array.from({ length: TRACE.KEEP }, (_, i) => traceKey('bp_x', 1764000000000 + i * 1000));
  check('12. traceKey: a sitting\'s seconds modulo KEEP, every slot used', JSON.stringify(keys.map((k) => +k.split(':').pop())) === JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7]) && traceKey('bp_x', 1764000008000) === keys[0], keys);
  const R = (kinds, start) => ({ pid: 'bp_x', sid: 5, act: 61499, start, ev: [{ t: 0, mv: { x: 1 } }], kinds, wr: { hit_far: 2 }, wt: [[3, 7]] });
  const kindOf = (k) => traceRowOf(R(k, { x: 1, y: 2, z: 'wheel' }), 'leave', Date.UTC(2026, 10, 24, 23, 59)).trace.kind;
  check('12. the row\'s kind: the most of the league\'s setups, `walk` with none', kindOf({}) === 'walk' && kindOf({ cook_request: 3 }) === 'cook' && kindOf({ monster_dmg_at: 3, cook_request: 2 }) === 'fight' && kindOf({ ability_use: 1, player_projectile: 1, monster_damage: 1, firemaking_request: 2 }) === 'fight' && kindOf({ node_strike: 2, extraction_start: 2, firemaking_request: 3 }) === 'harvest' && kindOf({ extraction_start: 1, firemaking_request: 2 }) === 'cook', [kindOf({}), kindOf({ cook_request: 3 })]);
  const r0 = R({}, { x: 1, y: 2, z: 'wheel' });
  const row = traceRowOf(r0, 'ten', Date.UTC(2026, 10, 24, 23, 59, 59));
  r0.wr.hit_far = 9; r0.wt.push([4, 7]); r0.ev.push({ t: 9, mv: {} }); r0.start.x = 99;
  check('12. traceRowOf: its name, its day, its act in seconds -- and a copy, the recording\'s later changes not in it', row.trace.name === 'play_trace bp_x 5' && row.trace.recorded === '2026-11-24' && row.act === 61 && row.cut === 'ten' && row.wr.hit_far === 2 && row.wt.length === 1 && row.trace.events.length === 1 && row.trace.start.x === 1, row);
  const placed = traceRowOf(R({}, null), 'leave', 0, { x: 10.6, y: -3.4, z: 'wheel' });
  check('12. ...with no move recorded, its start the room\'s place, rounded', JSON.stringify(placed.trace.start) === JSON.stringify({ x: 11, y: -3, z: 'wheel' }), placed.trace.start);
  let threw = false, nul = null;
  try { nul = traceRead({ v: 1, label: 'human', trace: null }); } catch (e) { threw = true; }
  check('12. traceRead: a row whose trace is null is no trace (and no throw)', !threw && nul === null);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
