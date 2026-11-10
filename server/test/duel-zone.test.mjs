/* v2.3.4371: a dueller who leaves the zone forfeits after 15 s (duel.js
 * _duelZoneMoved; spec docs/specs/duels.md "Leaving the zone").
 * Owner, 2026-11-10: "A dueller who walks into a dungeon or onto their farm
 * mid-duel forfeits after 15 seconds, the same as closing the app."
 * Driven against the real GameRoom, the zone changed by real `move`
 * messages (the road a dungeon mouth, the farm trip and a party pull all
 * take: the phone zones in on its own `move`).
 *   1. a social duel: walking into a dungeon starts the 15 s clock; it runs
 *      out and the leaver forfeits.
 *   2. a wagered duel: onto the farm, and the pot is paid ONCE, to the one
 *      who stayed, through the duel's own opId.
 *   3. back inside the 15 s (or the foe follows): no forfeit.
 *   4. both away: the first leaver loses.
 *   5. the kill switch `duelzone: false`: today's behaviour, no clock.
 *   6. an arena match is untouched: no clock, decided by its own clock.
 *   7. every server write of a player's zone goes through the hook.
 *   8. a disconnect, and a rejoin, in the other zone: the clock neither
 *      stretches nor clears.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { DUEL } from '../src/duel.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, z = 'town') {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, ws: [1, 5], data: { x: 0, y: 0, z } }));
}
async function moveTo(ws, z, x = 0, y = 0) {
  /* v2.3.4565: a step into a run is taken on the pass its dungeon_started
     gives (zonejudge.js); these runs are the suite's own (below), so the
     pass is given as their start would give it */
  const inst = typeof z === 'string' && z.startsWith('dungeon:') && room._dungeons ? room._dungeons.get(z.slice(8)) : null;
  if (inst) room._zonePassGive(inst, room.sessions.get(ws).id, Date.now());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x, y, z, d: 'down' }));
}
const A = 'bp_dz_a', B = 'bp_dz_b';
/* v2.3.4423: a move goes into a dungeon only while its run is open
   (dungeon.js _dungeonIdDead), so the runs this suite walks into are open:
   ones the room's dungeon sweep never takes (a finished run that lingers
   forever), as the duel's clock is all this suite is about */
if (!room._dungeons) room._dungeons = new Map();
for (let i = 1; i <= 8; i++) {
  room._dungeons.set('dz' + i, { id: 'dz' + i, zone: 'dungeon:dz' + i, ownerId: 'bp_dz_x', cfg: { width: 30, height: 20, waves: 1 },
    wave: 1, state: 'done', bossSpawned: false, createdAt: Date.now(), emptySince: 0, doneAt: Infinity });
}
const wsA = fakeWs('a'), wsB = fakeWs('b');
await join(wsA, A);
await join(wsB, B);
const psA = () => room.playerState[A], psB = () => room.playerState[B];

async function startDuel(wager = 0) {
  if (wager > 0) {
    await room._interceptDuel(A, { type: 'duel_wager_request', payload: { target: B, fromName: 'A', wager } });
    await room._interceptDuel(B, { type: 'duel_accept', payload: { target: A, wager } });
  } else {
    await room._interceptDuel(A, { type: 'duel_request', payload: { target: B, fromName: 'A' } });
    await room._interceptDuel(B, { type: 'duel_accept', payload: { target: A, wager: 0 } });
  }
  return room._duelFor(A);
}
const ends = () => room.eventBuffer.filter((e) => e.type === 'duel_end').map((e) => e.payload);
async function home() {   /* both back in town, beside each other, no duel left */
  for (const d of [...(room._duels ? room._duels.values() : [])]) room._duels.delete(d.id);
  if (psA().z !== 'town') await moveTo(wsA, 'town');
  if (psB().z !== 'town') await moveTo(wsB, 'town');
  room.eventBuffer.length = 0;
}

check('0. both start in town', psA().z === 'town' && psB().z === 'town', [psA().z, psB().z]);

// ── 1. a social duel: into a dungeon, the clock runs out, the leaver forfeits ──
{
  const d = await startDuel(0);
  check('1. a social duel is on', !!d && d.wager === 0);
  const t0 = Date.now();
  await moveTo(wsA, 'dungeon:dz1', 100, 100);
  check('1. the move took A into the dungeon', psA().z === 'dungeon:dz1', psA().z);
  check('1. walking into a dungeon starts the away clock (GRACE_MS)', typeof d.away[A] === 'number' && d.away[A] >= t0 + DUEL.GRACE_MS && d.away[A] <= Date.now() + DUEL.GRACE_MS, d.away);
  check('1. ...for the leaver only', d.away[B] === undefined);
  room.eventBuffer.length = 0;
  room._tickDuels(Date.now() + DUEL.GRACE_MS - 1000);
  check('1. 14 s in: still a duel', room._duelFor(A) === d && ends().length === 0);
  room._tickDuels(Date.now() + DUEL.GRACE_MS + 1000);
  const e = ends();
  check('1. past 15 s the leaver forfeits through the duel\'s own end', room._duelFor(A) === null && e.length === 1 && e[0].loser === A && e[0].winner === B && e[0].how === 'forfeit', e);
  await home();
}

// ── 2. a wagered duel: onto the farm; the pot paid once, to the one who stayed ──
{
  psA().coins = 100; psB().coins = 100;
  const d = await startDuel(30);
  check('2. a wagered duel is on, both stakes held', !!d && d.wager === 30 && psA().coins === 70 && psB().coins === 70, [psA().coins, psB().coins]);
  await moveTo(wsB, 'farm_home', 50, 50);
  check('2. B is on the farm', psB().z === 'farm_home', psB().z);
  check('2. the farm starts B\'s clock', typeof d.away[B] === 'number' && d.away[A] === undefined, d.away);
  room._tickDuels(Date.now() + DUEL.GRACE_MS + 1000);
  await wait(20);
  room._tickDuels(Date.now() + DUEL.GRACE_MS + 5000);   /* a second tick pays nothing more */
  await wait(20);
  check('2. A (who stayed) takes the pot of 60', psA().coins === 130, psA().coins);
  check('2. B (who left) gets nothing back', psB().coins === 70, psB().coins);
  check('2. the pot went through the duel\'s own opId', await room._opSeen('duelpot:' + d.id));
  check('2. the escrow record is gone', !state._store.has('duelEscrow:' + d.id));
  const e = ends();
  check('2. one duel_end, a forfeit against B', e.length === 1 && e[0].loser === B && e[0].wager === 30 && e[0].how === 'forfeit', e);
  await home();
}

// ── 3. back inside the 15 s, or the foe follows: no forfeit ──
{
  const d = await startDuel(0);
  await moveTo(wsA, 'dungeon:dz3', 10, 10);
  check('3a. A in the dungeon: a clock', typeof d.away[A] === 'number');
  await moveTo(wsA, 'town', 0, 0);
  check('3a. back in town inside the 15 s: the clock is cleared', d.away[A] === undefined && !d.awayZone[A], { away: d.away, zone: d.awayZone });
  room._tickDuels(Date.now() + DUEL.GRACE_MS + 1000);
  check('3a. ...and nobody forfeits', room._duelFor(A) === d && ends().length === 0, ends());
  // 3b. the foe follows the leaver in: together again
  await moveTo(wsA, 'dungeon:dz3', 10, 10);
  check('3b. A in again: a clock', typeof d.away[A] === 'number');
  await moveTo(wsB, 'dungeon:dz3', 12, 12);
  check('3b. B follows A in: both together, no clock', d.away[A] === undefined && d.away[B] === undefined, d.away);
  room._tickDuels(Date.now() + DUEL.GRACE_MS + 1000);
  check('3b. ...and nobody forfeits', room._duelFor(A) === d && ends().length === 0);
  // 3c. stepping out and in does not stretch a clock that is running
  await moveTo(wsB, 'town', 0, 0);
  const first = d.away[B];
  await wait(5);
  await moveTo(wsB, 'farm_home', 0, 0);
  check('3c. a second zone change keeps the first deadline', d.away[B] === first, [first, d.away[B]]);
  await home();
}

// ── 4. both away: the first leaver loses ──
{
  const d = await startDuel(0);
  await moveTo(wsA, 'dungeon:dz4', 10, 10);
  await wait(5);
  await moveTo(wsB, 'farm_home', 10, 10);
  check('4. both hold a clock, A\'s the earlier', typeof d.away[A] === 'number' && typeof d.away[B] === 'number' && d.away[A] < d.away[B], d.away);
  room._tickDuels(Date.now() + DUEL.GRACE_MS + 1000);
  const e = ends();
  check('4. both expired: A, the first to leave, forfeits', e.length === 1 && e[0].loser === A && e[0].winner === B && e[0].how === 'forfeit', e);
  await home();
}

// ── 5. the kill switch: `duelzone: false` is today's behaviour ──
{
  const was = room._liveFlags;
  room._liveFlags = { ...(was || {}), duelzone: false };
  check('5. `duelzone: false` reads off, and nothing set reads on', room._duelZoneOff() === true);
  const d = await startDuel(0);
  await moveTo(wsA, 'dungeon:dz5', 10, 10);
  check('5. switched off: walking into a dungeon starts no clock', d.away[A] === undefined, d.away);
  room._tickDuels(Date.now() + DUEL.GRACE_MS + 1000);
  check('5. ...and the duel goes on, as before this change', room._duelFor(A) === d && ends().length === 0);
  room._liveFlags = was;
  check('5. cleared, it reads on again', room._duelZoneOff() === false);
  await home();
}

// ── 6. an arena match is untouched ──
{
  const now = Date.now();
  const d = room._makeDuel({ id: 'arena-dz', a: A, b: B, wager: 0, startedAt: now, expiresAt: now + 180000, arenaMatch: { id: 'm-dz' } });
  room._duels.set(d.id, d);
  await moveTo(wsA, 'dungeon:dz6', 10, 10);
  check('6. an arena fighter walking into a dungeon starts no clock', d.away[A] === undefined && !d.awayZone[A], d.away);
  room._tickDuels(Date.now() + DUEL.GRACE_MS + 1000);
  check('6. ...and the match goes on past 15 s', room._duels.get('arena-dz') === d && d.status === 'active');
  /* what it does today: its own 3-minute clock decides it on hp */
  const orig = room._arenaOnMatchResolved; room._arenaOnMatchResolved = () => {};
  psA().hp = 10; psB().hp = psB().maxHp || 100;
  room._tickDuels(now + 180001);
  room._arenaOnMatchResolved = orig;
  const e = ends();
  check('6. the match ends on its own clock, the hp tiebreak (not a forfeit)', e.length === 1 && e[0].how === 'timeout' && e[0].winner === B && e[0].arena === true, e);
  psA().hp = psA().maxHp || 100;
  await home();
}

// ── 7. every server write of a player's zone goes through the hook ──
/* A writer is a `ps.z =` assignment or a new playerState record (join.js:
   `this.playerState[id] = {...}`, spar.js's clones).  Each must call
   `_duelZoneMoved(` within the next few lines, or this fails -- the four
   the sweep counted (movement.js, join.js, index.js's respawn, spar.js) and
   any new one. */
{
  const dir = new URL('../src/', import.meta.url);
  const WRITE = /\b(?:ps|mps|qps|ownerPs|playerState\[[^\]]+\])\.z\s*=(?!=)|this\.playerState\[[^\]]+\]\s*=\s*\{/;
  const NEAR = 12;
  const writers = [], missing = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const lines = readFileSync(new URL(f, dir), 'utf8').split('\n');
    lines.forEach((ln, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(ln) || !WRITE.test(ln)) return;
      writers.push(f + ':' + (i + 1));
      if (!lines.slice(i, i + NEAR + 1).some((l) => l.includes('_duelZoneMoved('))) missing.push(f + ':' + (i + 1));
    });
  }
  check('7. the scan finds the zone writers (movement, join, the respawn, spar)', ['movement.js', 'join.js', 'index.js', 'spar.js'].every((f) => writers.some((w) => w.startsWith(f + ':'))), writers);
  check('7. every one of them calls _duelZoneMoved', missing.length === 0, missing);
  /* and the respawn's call really is reached: a duel record still naming a
     respawning player (a hand-built one) is looked at */
  let asked = 0; const orig = room._duelZoneMoved; room._duelZoneMoved = function (id) { if (id === B) asked++; return orig.call(this, id); };
  const ps = psB(); ps.dying = true; ps.respawnAt = Date.now() - 1; ps.hp = 0;
  room._tickPlayerRespawn();
  room._duelZoneMoved = orig;
  check('7. the respawn asks the duel', asked === 1 && ps.z === 'town' && !ps.dying, { asked, z: ps.z });
}

// ── 8. a disconnect, and a rejoin, in the other zone ──
{
  const d = await startDuel(0);
  await moveTo(wsA, 'dungeon:dz8', 10, 10);
  const first = d.away[A];
  await wait(5);
  await room.webSocketClose(wsA, 1000, 'bye', true);
  check('8. closing the app from the dungeon keeps the zone\'s deadline (no fresh 15 s)', d.away[A] === first, [first, d.away[A]]);
  /* the foe walking about meanwhile changes nothing (A's state is gone) */
  await moveTo(wsB, 'farm_home', 0, 0); await moveTo(wsB, 'town', 0, 0);
  check('8. the foe moving while A is gone leaves A\'s clock alone', d.away[A] === first && d.away[B] === undefined, d.away);
  const wsA2 = fakeWs('a2');
  await join(wsA2, A, 'dungeon:dz8');
  check('8. rejoined, still in the dungeon: the clock runs on', room._duelFor(A) === d && d.away[A] === first, d.away);
  room._tickDuels(first + 1);
  const e = ends();
  check('8. ...and runs out: A forfeits', e.some((x) => x.loser === A && x.how === 'forfeit'), e);
  // 8b. a rejoin in the SAME zone as the foe clears it, as a rejoin always has
  room.eventBuffer.length = 0;
  await moveTo(wsA2, 'town', 0, 0);
  const d2 = await startDuel(0);
  await moveTo(wsA2, 'dungeon:dz8', 10, 10);
  await room.webSocketClose(wsA2, 1000, 'bye', true);
  const wsA3 = fakeWs('a3');
  await join(wsA3, A, 'town');
  check('8b. rejoined beside the foe: the clock is cleared', room._duelFor(A) === d2 && d2.away[A] === undefined && !d2.awayZone[A], { away: d2.away, zone: d2.awayZone });
  room._tickDuels(Date.now() + DUEL.GRACE_MS + 1000);
  check('8b. ...and nobody forfeits', room._duelFor(A) === d2 && ends().length === 0, ends());
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
