/* ═══ v2.3.3195: THE TICK'S SHARED PARTS -- SAME BYTES, LESS WORK ═══
 *
 * The room-capacity change (docs/specs/load-test.md, "What was done") makes
 * three parts of the 45 Hz tick cheaper without changing what anyone gets:
 *
 *   1. tick.js buildShared puts every tick message together from parts
 *      stringified once a tick (a zone's players, a mute key's events, a
 *      zone's nodes, a monster's wire).  With `_tickShareVerify` set, the
 *      tick builds every message the old way too and compares: here over
 *      300 ticks of a busy mixed room -- v2 players in the Wheel's town and
 *      on its spokes (interest, monsters coming into reach), v1 and v2
 *      players in town and the meadow, a socket that never joined, presence
 *      ticks, chat and emotes with two players muting the speaker, and
 *      dirty nodes.  Every message must match byte for byte.
 *   2. `tickshare: false` in the live flags builds the old way (the check
 *      never runs) and the room still sends.
 *   3. The history snapshot reuses the entry that falls off the end: after
 *      every tick each player's history must equal what the old code would
 *      have stored, and no entry object may be in two places.
 *   4. The monster scan asks the safe-ground rule only of a player who would
 *      be the nearest: a nearer player on the safe ground is passed over for
 *      one off it, and a nearer one who provoked the monster is picked.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_SPAWNS, WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

function mockState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

/* a seeded random, so a failure reproduces */
let seed = 20261013;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

async function makeRoom() {
  const room = new GameRoom(mockState(), mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; }
    return realSetInterval(fn, ms);
  };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn };
}
async function join(room, id, { pv = 2, z = 'town', x = 1000, y = 1000 } = {}) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name: id, data: { x, y, z } };
  if (pv === 2) msg.protocolVersion = 2;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  return { ws, id, pv };
}
async function move(room, p, x, y, z) {
  p.x = x; p.y = y;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x, y, d: 'south', f: 'south', z, vx: 1, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
}

const ARRIVAL = { x: 21504, y: 21792 };
const LANDS = Object.keys(WHEEL_SPAWNS);

/* ── 1. byte for byte, a busy mixed room ───────────────────────────────── */
{
  const { room, tickFn } = await makeRoom();
  const players = [];
  /* the Wheel, v2: 16 in its town, 12 on the spokes by their land's monsters */
  for (let i = 0; i < 28; i++) {
    const p = await join(room, 'ts' + i, { pv: 2 });
    const onSpoke = i >= 16;
    const land = LANDS[i % LANDS.length];
    const pt = (WHEEL_SPAWNS[land].points || [])[0] || [ARRIVAL.x, ARRIVAL.y];
    p.home = onSpoke ? { x: pt[0], y: pt[1] } : ARRIVAL;
    p.r = onSpoke ? 900 : 1200;
    p.z = 'wheel';
    await move(room, p, p.home.x + (rnd() - 0.5) * 200, p.home.y + (rnd() - 0.5) * 200, 'wheel');
    players.push(p);
  }
  /* one v1 player in the Wheel: the whole monster list, the old way */
  { const p = await join(room, 'tsv1w', { pv: 1 }); p.home = ARRIVAL; p.r = 800; p.z = 'wheel'; await move(room, p, ARRIVAL.x, ARRIVAL.y, 'wheel'); players.push(p); }
  /* town and the meadow, both protocols */
  for (const [id, pv, z] of [['tst1', 2, 'town'], ['tst2', 1, 'town'], ['tsm1', 2, 'meadow'], ['tsm2', 1, 'meadow']]) {
    const p = await join(room, id, { pv, z, x: 600, y: 600 }); p.home = { x: 600, y: 600 }; p.r = 300; p.z = z;
    await move(room, p, 600, 600, z);
    players.push(p);
  }
  /* a socket that never joined: the roster only */
  const lurker = fakeWs();
  room.sessions.set(lurker, baseSession());

  /* two players mute the speaker, a third mutes someone who never speaks */
  const speaker = players[0].id, emoter = players[5].id;
  room.chatMutes = new Map([
    [players[1].id, new Set([speaker])],
    [players[2].id, new Set([speaker])],
    [players[3].id, new Set(['nobody'])],
  ]);

  const verify = { checked: 0, mismatched: 0, first: null };
  room._tickShareVerify = verify;
  const TICKS = 300;
  for (let t = 0; t < TICKS; t++) {
    for (let k = 0; k < players.length; k++) {
      const p = players[k];
      if ((t + k) % 2) continue;   /* everyone moves every other tick */
      let x = p.x + (rnd() - 0.5) * 12, y = p.y + (rnd() - 0.5) * 12;
      if (Math.hypot(x - p.home.x, y - p.home.y) > p.r) { x = p.home.x; y = p.home.y; }
      await move(room, p, x, y, p.z);
    }
    /* a spoke player walks far and back: monsters leave and come into reach */
    if (t % 60 === 30) await move(room, players[20], ARRIVAL.x, ARRIVAL.y, 'wheel');
    if (t % 60 === 0) await move(room, players[20], players[20].home.x, players[20].home.y, 'wheel');
    if (t % 7 === 0) room.eventBuffer.push({ type: 'chat', from: speaker, payload: { id: speaker, name: 'S', text: 'line ' + t, color: '' } });
    if (t % 11 === 0) room.eventBuffer.push({ type: 'emote', from: emoter, payload: { id: emoter, emote: 'wave' } });
    if (t % 13 === 0) room.eventBuffer.push({ type: 'loot_despawn', payload: { lootId: 'l' + t, zone: 'wheel' } });
    if (t % 17 === 0) {
      const ns = room.nodes && room.nodes.wheel;
      if (ns && ns.length) room._markNodeDirty('wheel', ns[t % ns.length].id);
      const mn = room.nodes && room.nodes.meadow;
      if (mn && mn.length) room._markNodeDirty('meadow', mn[t % mn.length].id);
    }
    /* keep everyone standing: a death is a different path, not this one's */
    for (const p of players) {
      const ps = room.playerState[p.id];
      if (ps) { ps.hp = Math.max(ps.hp || 0, 1e6); ps.maxHp = Math.max(ps.maxHp || 0, 1e6); ps.dead = false; ps.dying = false; }
    }
    tickFn();
  }
  check('1a every tick message built from shared parts equals the old build, byte for byte', verify.mismatched === 0, verify.first);
  check('1b ... over thousands of messages', verify.checked > 3000, verify.checked);

  const all = players.flatMap((p) => p.ws.sent);
  const has = (part) => all.some((s) => s.indexOf(part) !== -1);
  check('1c the run exercised players, events, monsters and nodes', has('"players":') && has('"events":') && has('"monsters":') && has('"nodes":'),
    { players: has('"players":'), events: has('"events":'), monsters: has('"monsters":'), nodes: has('"nodes":') });
  const v1w = players.find((p) => p.id === 'tsv1w');
  check('1d the v1 Wheel player got the whole monster list (the old path)', v1w.ws.sent.some((s) => (s.match(/"id":"wm-/g) || []).length > 300));
  const lurkTicks = lurker.sent.filter((s) => s.startsWith('{"type":"tick"'));
  /* it hears the room-wide events too; the roster comes every
     PRESENCE_REFRESH_TICKS (45), so 6 or 7 times in 300 ticks */
  const lurkRoster = lurkTicks.filter((s) => s.indexOf('"players":') !== -1).length;
  check('1e the socket that never joined got the presence roster', lurkRoster >= 6, { ticks: lurkTicks.length, roster: lurkRoster });
  const muter = players[1], other = players[4];
  const lineOf = (p) => p.ws.sent.filter((s) => s.indexOf('"type":"chat"') !== -1).length;
  check('1f a player who mutes the speaker never gets their lines; others do', lineOf(muter) === 0 && lineOf(other) > 0, { muter: lineOf(muter), other: lineOf(other) });
  const tickMsgs = all.filter((s) => s.startsWith('{"type":"tick"'));
  let parsed = 0;
  for (const s of tickMsgs) { const d = JSON.parse(s); if (d && d.type === 'tick' && typeof d.seq === 'number' && typeof d.ts === 'number') parsed++; }
  check('1g every tick message is valid JSON with its seq and ts', tickMsgs.length > 1000 && parsed === tickMsgs.length, { ticks: tickMsgs.length, parsed });
  const spoke = players[20];
  check('1h a player walking back to the spokes hears its monsters come into reach', spoke.ws.sent.some((s) => s.indexOf('"monsters":{"wheel":[') !== -1));

  /* ── 2. tickshare: false ──────────────────────────────────────────────── */
  const before = verify.checked;
  const sentBefore = all.length;
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { tickshare: false });
  for (let t = 0; t < 30; t++) {
    for (const p of players) await move(room, p, p.x + 1, p.y, p.z);
    tickFn();
  }
  const sentAfter = players.reduce((a, p) => a + p.ws.sent.length, 0);
  check('2a tickshare:false builds the old way (the comparison never runs)', verify.checked === before, verify.checked - before);
  check('2b ... and the room still sends', sentAfter > sentBefore + 30 * 10, sentAfter - sentBefore);
}

/* ── 3. the history snapshot, against the old code's ───────────────────── */
{
  const { room, tickFn } = await makeRoom();
  const ps = [];
  for (let i = 0; i < 6; i++) {
    const p = await join(room, 'th' + i, { pv: 2 });
    p.z = 'wheel'; await move(room, p, ARRIVAL.x + i * 30, ARRIVAL.y, 'wheel');
    ps.push(p);
  }
  const LIM = room.LAGCOMP_BUFFER_TICKS;
  const ref = Object.create(null);
  let same = true, firstDiff = null, aliased = false;
  for (let t = 0; t < 60; t++) {
    for (const p of ps) {
      await move(room, p, p.x + 3, p.y + (t % 2 ? 1 : -1), 'wheel');
      const s = room.playerState[p.id];
      if (t % 9 === 0) { s.blocking = true; s.ba = 0.5; } else { s.blocking = false; s.ba = undefined; }
      if (t % 13 === 0) s.dodging = true; else s.dodging = false;
    }
    /* what the old code stored: a new object each tick, the oldest dropped */
    for (const id of Object.keys(room.playerState)) {
      const s = room.playerState[id];
      (ref[id] || (ref[id] = [])).push({
        x: s.x, y: s.y, d: s.d, z: s.z, dodging: s.dodging || false, blocking: s.blocking || false,
        ba: (typeof s.ba === 'number' && Number.isFinite(s.ba)) ? s.ba : null, dead: s.dead || false, tick: room.tickSeq,
      });
      if (ref[id].length > LIM) ref[id].shift();
    }
    tickFn();
    const seen = new Set();
    for (const id of Object.keys(ref)) {
      const got = JSON.stringify(room.stateHistory[id]);
      if (got !== JSON.stringify(ref[id])) { same = false; if (!firstDiff) firstDiff = { t, id, got, want: JSON.stringify(ref[id]) }; }
      for (const e of room.stateHistory[id] || []) { if (seen.has(e)) aliased = true; seen.add(e); }
    }
  }
  check('3a every player\'s history equals the old code\'s, tick after tick', same, firstDiff);
  check('3b no history entry object sits in two places', !aliased);
  check('3c each history is the lag-compensation window long', ps.every((p) => (room.stateHistory[p.id] || []).length === LIM), LIM);
}

/* ── 4. the monster scan ──────────────────────────────────────────────── */
{
  const { room } = await makeRoom();
  const a = await join(room, 'tma', { pv: 2 });
  const b = await join(room, 'tmb', { pv: 2 });
  for (const p of [a, b]) { p.z = 'wheel'; await move(room, p, ARRIVAL.x, ARRIVAL.y, 'wheel'); }
  const monsters = room._ensureZoneMonsters('wheel');
  const m = monsters.find((x) => x.arch === 'snowman') || monsters[0];
  /* on the ray from the middle to its spawn: the monster just off the safe
     ground, A just on it (nearer), B further out (off it) */
  const ang = Math.atan2(m.spawnY - WHEEL_CENTRE[1], m.spawnX - WHEEL_CENTRE[0]);
  const at = (r) => ({ x: WHEEL_CENTRE[0] + Math.cos(ang) * r, y: WHEEL_CENTRE[1] + Math.sin(ang) * r });
  const place = () => {
    const mp = at(WHEEL_SAFE_R + 60); m.x = mp.x; m.y = mp.y;
    const pa = at(WHEEL_SAFE_R - 20), pb = at(WHEEL_SAFE_R + 200);
    Object.assign(room.playerState[a.id], { x: pa.x, y: pa.y, z: 'wheel', dead: false, dying: false, hp: 1e6, maxHp: 1e6 });
    Object.assign(room.playerState[b.id], { x: pb.x, y: pb.y, z: 'wheel', dead: false, dying: false, hp: 1e6, maxHp: 1e6 });
    m.alive = true; m.targetId = null; m._aggroOverrideUntil = 0; m._aggroOverrideTarget = null;
    m.dmgByPlayer = Object.create(null);
    /* a monster mid-swing (the first case starts one at B) does not re-pick
       its target until the swing resolves: clear it, so each case starts
       from a monster at rest */
    m._bwUntil = 0; m._bwTarget = null; m._bwKind = null; m._attackingUntil = 0; m.atkCd = 0;
  };
  for (const other of monsters) if (other !== m) { other.alive = false; other.respawnAt = 0; }
  place();
  room._tickMonsters();
  check('4a a nearer player on the safe ground is passed over for one off it', m.targetId === b.id, { target: m.targetId });
  place();
  m.dmgByPlayer[a.id] = 25;
  room.playerState[a.id]._lastDealtAt = Date.now();
  room._tickMonsters();
  check('4b a nearer player who provoked it from the safe ground is the one it picks', m.targetId === a.id, { target: m.targetId });
}

/* ── 5. the monster grid answers exactly what the full walk does ───────── */
{
  const room = new GameRoom(mockState(), mockEnv);
  const monsters = [];
  for (let i = 0; i < 420; i++) monsters.push({ id: 'g' + i, x: 15000 + rnd() * 13000, y: 15000 + rnd() * 13000 });
  monsters.push({ id: 'gnan', x: NaN, y: 21000 });   /* never in reach, either way */
  const walk = {}, grid = {};   /* two sessions: the full walk and the grid */
  const ps = { x: 21500, y: 21500 };
  let same = true, firstDiff = null, seenSome = 0, enteredSome = 0;
  const ids = (it) => JSON.stringify([...it].map((v) => (typeof v === 'string' ? v : v.id)));
  for (let t = 0; t < 400; t++) {
    for (const m of monsters) if (Number.isFinite(m.x)) { m.x += (rnd() - 0.5) * 90; m.y += (rnd() - 0.5) * 90; }
    if (t % 50 === 49) { ps.x = 15000 + rnd() * 13000; ps.y = 15000 + rnd() * 13000; }   /* a jump: a new reach */
    else { ps.x += (rnd() - 0.5) * 160; ps.y += (rnd() - 0.5) * 160; }
    const g = room._wheelMonsterGrid(monsters);
    const a = room._wheelInterest(walk, ps, monsters);
    const b = room._wheelInterest(grid, ps, monsters, g);
    const pairs = [['seen', ids(a.seen), ids(b.seen)], ['entered', ids(a.entered), ids(b.entered)], ['list', ids(a.list), ids(b.list)], ['kept', ids(walk._wheelSeen), ids(grid._wheelSeen)]];
    for (const [what, x, y] of pairs) if (x !== y) { same = false; if (!firstDiff) firstDiff = { t, what, walk: x.slice(0, 200), grid: y.slice(0, 200) }; }
    seenSome += a.seen.size; enteredSome += a.entered.size;
  }
  check('5a the grid gives the same monsters in reach, the same new ones and the same order as walking all of them', same, firstDiff);
  check('5b ... with monsters in reach and coming into reach on the way', seenSome > 1000 && enteredSome > 50, { seenSome, enteredSome });
  const off = room._wheelInterest({}, { x: Infinity, y: 21000 }, monsters, room._wheelMonsterGrid(monsters));
  check('5c a position that is not finite reaches nothing (and returns)', off.seen.size === 0 && off.list.length === 0);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all tick-share checks passed');
