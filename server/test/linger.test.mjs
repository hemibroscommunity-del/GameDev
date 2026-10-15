/* LEAVING IN THE MIDDLE OF A FIGHT -- THE BODY STAYS (v2.3.3260,
 * server/src/linger.js, docs/specs/pvp-fights.md "Leaving mid-fight").
 *
 *   1. A player who leaves within 10 s of a hit between players, in the
 *      Wheel, leaves their body for LINGER.MS: still in the room, still
 *      hittable, no player_leave; a joiner sees it.
 *   2. Not in a fight, in a duel, or the last one in the room: they leave at
 *      once, as before.
 *   3. The body goes when its time is up (saved, player_leave), or after it
 *      died and came back.
 *   4. A join from where the body stands takes it back at once, with its HP;
 *      a join from anywhere else is refused (`linger_wait`, close 4010) until
 *      the body has gone.
 *   5. The kill switch, the last one out, and the refusal cannot be forged.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { LINGER } from '../src/linger.js';
import { PVP_HEAL } from '../src/data.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

let T = 1_950_000_000_000;
const realNow = Date.now;
Date.now = () => T;
const realRandom = Math.random;
Math.random = () => 0.5;

function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(c, r) { this.closed = { code: c, reason: r }; } }; }
const settle = () => new Promise((r) => setTimeout(r, 5));

const state = makeState();
const room = new GameRoom(state, mockEnv);
const NML_X = WHEEL_CENTRE[0] + 9000, NML_Y = WHEEL_CENTRE[1];   /* No man's land, a few rings out */
async function join(id, data) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2,
    data: Object.assign({ x: NML_X, y: NML_Y, z: WHEEL_ZONE }, data || {}) }));
  await settle();
  return ws;
}
function place(id, x, y) {
  const ps = room.playerState[id];
  ps.z = WHEEL_ZONE; ps.x = x; ps.y = y; ps.dead = false; ps.dying = false;
  ps._zoneEntryGraceUntil = 0; ps.hp = ps.maxHp;
  return ps;
}
/* a hit between two players, as combat.js stamps it */
const exchange = (a, b) => room._notePvpExchange(a, b, T);
const left = (id) => !(id in room.playerState);
const leaves = (ws, id) => ws.sent.filter((m) => m.type === 'player_leave' && m.id === id).length;

const wsA = await join('bp_lg_a');
const wsB = await join('bp_lg_b');
const wsC = await join('bp_lg_c');
clearInterval(room.tickInterval); room.tickInterval = null;
place('bp_lg_a', NML_X, NML_Y);
place('bp_lg_b', NML_X + 40, NML_Y);
place('bp_lg_c', NML_X + 2000, NML_Y);
check('(guard) all three joined, in the Wheel', ['bp_lg_a', 'bp_lg_b', 'bp_lg_c'].every((id) => room.playerState[id] && room.playerState[id].z === WHEEL_ZONE));
check('(guard) A may hit B under No man\'s land\'s rule', room._nmlAllowed('bp_lg_a', 'bp_lg_b'));

// ── 1. a leaver in a fight leaves their body ──
{
  exchange('bp_lg_a', 'bp_lg_b');
  wsA.sent.length = 0;
  T += 1000;
  await room.webSocketClose(wsB);
  const B = room.playerState.bp_lg_b;
  check('B left within 10 s of a hit: the body stays', !!B && B.lingering === true && !B.disconnected, B && { lingering: B.lingering, disconnected: B.disconnected });
  check('...for LINGER.MS', !!B && B._lingerUntil === T + LINGER.MS, B && B._lingerUntil - T);
  check('...nobody is told B left', leaves(wsA, 'bp_lg_b') === 0);
  check('...its session is gone (nothing is sent to it)', ![...room.sessions.values()].some((s) => s.id === 'bp_lg_b'));
  check('...it stands still with its guard down', !!B && B.vx === 0 && B.vy === 0 && !B.blocking && !B.dodging);
  check('...and its stop goes out on the next tick', room.dirtyPlayers.has('bp_lg_b'));
  const snap = room.getAllPlayerData();
  check('a joiner\'s snapshot includes the lingering body', !!snap.bp_lg_b, Object.keys(snap));
  /* it can still be hit */
  room._pvpHitLanes = new Map();
  room.eventBuffer.length = 0;
  const hp0 = B.hp;
  room._resolvePvPAttack(room.sessions.get(wsA), { kind: 'melee', range: 200, arc: 3, angle: 0, target: 'bp_lg_b', sw: 1 });
  const hit = room.eventBuffer.find((e) => e.type === 'pvp_hit' && e.payload.target === 'bp_lg_b');
  check('A\'s swing lands on the lingering body', !!hit && B.hp < hp0, { hit: !!hit, hp: B.hp, hp0 });
}

// ── 2. ...and the others leave at once ──
{
  /* not in a fight */
  const wsD = await join('bp_lg_d');
  place('bp_lg_d', NML_X + 3000, NML_Y);
  wsA.sent.length = 0;
  await room.webSocketClose(wsD);
  check('a leaver who was in no fight with a player leaves at once', left('bp_lg_d') && leaves(wsA, 'bp_lg_d') === 1);
  /* a fight that is over (11 s ago) */
  const wsE = await join('bp_lg_e');
  place('bp_lg_e', NML_X + 3000, NML_Y);
  exchange('bp_lg_a', 'bp_lg_e');
  T += PVP_HEAL.WINDOW_MS + 1;
  await room.webSocketClose(wsE);
  check('...nor one whose last exchange was over 10 s ago', left('bp_lg_e'));
  /* a duel has its own grace */
  const wsF = await join('bp_lg_f');
  place('bp_lg_f', NML_X + 3000, NML_Y);
  exchange('bp_lg_a', 'bp_lg_f');
  if (!room._duels) room._duels = new Map();
  room._duels.set('lg-duel', { id: 'lg-duel', status: 'active', a: 'bp_lg_f', b: 'bp_lg_a', away: Object.create(null) });
  await room.webSocketClose(wsF);
  check('...nor one in a duel (its 15 s grace and forfeit rule)', left('bp_lg_f'));
  room._duels.delete('lg-duel');
  /* not in the Wheel */
  const wsG = await join('bp_lg_g');
  const G = place('bp_lg_g', 100, 100); G.z = 'town';
  exchange('bp_lg_a', 'bp_lg_g');
  await room.webSocketClose(wsG);
  check('...nor one outside the Wheel', left('bp_lg_g'));
}

// ── 3. the body goes when its time is up ──
{
  const B = room.playerState.bp_lg_b;
  const until = B._lingerUntil;
  T = until - 1;
  room._lingerSweep(T);
  check('a second before its time the body is still there', !!room.playerState.bp_lg_b);
  wsA.sent.length = 0;
  const hpAtEnd = B.hp;
  T = until;
  room._lingerSweep(T);
  await settle();
  check('at its time the body goes', left('bp_lg_b'));
  check('...player_leave goes out', leaves(wsA, 'bp_lg_b') === 1);
  const rec = state._store.get('rpg:bp_lg_b');
  check('...and its HP as it stood is saved (the hit it took included)', !!rec && rec.hp === hpAtEnd, rec && { saved: rec.hp, hpAtEnd });
}

// ── 4. coming back ──
{
  /* a fresh launch (from town) while the body lingers: refused */
  let wsB2 = await join('bp_lg_b');
  place('bp_lg_b', NML_X + 40, NML_Y);
  exchange('bp_lg_a', 'bp_lg_b');
  await room.webSocketClose(wsB2);
  const B = room.playerState.bp_lg_b;
  check('(guard) B lingers again', !!B && B.lingering);
  T += 2000;
  const wsFresh = await join('bp_lg_b', { x: 50, y: 50, z: 'town' });
  const wait = wsFresh.sent.find((m) => m.type === 'linger_wait');
  check('a join from town while the body lingers is refused: linger_wait with the time left',
    !!wait && wait.payload.ms === LINGER.MS - 2000 + LINGER.WAIT_SLACK_MS, wait && wait.payload);
  check('...closed with code 4010', !!wsFresh.closed && wsFresh.closed.code === LINGER.CLOSE_CODE, wsFresh.closed);
  check('...and the body is untouched, still lingering', room.playerState.bp_lg_b === B && B.lingering);
  check('...the refused socket is not in the room', !room.sessions.has(wsFresh));
  /* the same from far off in the Wheel */
  const wsFar = await join('bp_lg_b', { x: NML_X + 40 + LINGER.RESUME_PX + 50, y: NML_Y, z: WHEEL_ZONE });
  check('...and from the Wheel but past RESUME_PX', !!wsFar.sent.find((m) => m.type === 'linger_wait'));
  /* a hit while it waits */
  room._pvpHitLanes = new Map();
  room._resolvePvPAttack(room.sessions.get(wsA), { kind: 'melee', range: 200, arc: 3, angle: 0, target: 'bp_lg_b', sw: 2 });
  const hpHit = B.hp;
  check('(guard) the waiting body was hit', hpHit < B.maxHp, { hpHit, max: B.maxHp });
  /* a reconnect from where it stands: takes it back */
  wsA.sent.length = 0;
  const wsBack = await join('bp_lg_b', { x: NML_X + 60, y: NML_Y + 20, z: WHEEL_ZONE });
  const NB = room.playerState.bp_lg_b;
  check('a reconnect from beside the body takes it back at once (no refusal)', !wsBack.sent.find((m) => m.type === 'linger_wait') && !!NB && !NB.lingering && room.sessions.has(wsBack));
  check('...with the HP the body had (saved, then read back)', !!NB && NB.hp === hpHit, NB && { hp: NB.hp, hpHit });
  check('...and nobody saw it leave', leaves(wsA, 'bp_lg_b') === 0);
  check('...nothing lingers any more', !room._lingerBodies || !room._lingerBodies.has('bp_lg_b'));
  wsB2 = wsBack;

  /* a body that died: the join waits for the respawn, then goes on */
  place('bp_lg_b', NML_X + 40, NML_Y);
  exchange('bp_lg_a', 'bp_lg_b');
  await room.webSocketClose(wsB2);
  const D = room.playerState.bp_lg_b;
  D.hp = 1;
  room._pvpHitLanes = new Map();
  room._resolvePvPAttack(room.sessions.get(wsA), { kind: 'melee', range: 200, arc: 3, angle: 0, target: 'bp_lg_b', sw: 3 });
  check('(guard) the lingering body was killed', D.dying === true, { hp: D.hp, dying: D.dying });
  const wsDead = await join('bp_lg_b', { x: NML_X + 40, y: NML_Y, z: WHEEL_ZONE });
  const w2 = wsDead.sent.find((m) => m.type === 'linger_wait');
  check('a join while the body is dying waits for its respawn (5 s at most)', !!w2 && w2.payload.ms <= 5000 + 50 + LINGER.WAIT_SLACK_MS, w2 && w2.payload);
  room._lingerSweep(T);
  check('...the sweep lets the death finish first', !!room.playerState.bp_lg_b && room.playerState.bp_lg_b.dying);
  T += 5001;
  room._tickPlayerRespawn();
  room._lingerSweep(T);
  await settle();
  check('...once it has come back (in town) the body goes', left('bp_lg_b'));
  const wsAfter = await join('bp_lg_b', { x: 50, y: 50, z: 'town' });
  check('...and the next join goes on as any join', !wsAfter.sent.find((m) => m.type === 'linger_wait') && !!room.playerState.bp_lg_b && !room.playerState.bp_lg_b.lingering);
  await room.webSocketClose(wsAfter);
}

// ── 5. the switch, the last one out, the refusal's own word ──
{
  room._liveFlags = { linger: false };
  const wsH = await join('bp_lg_h');
  place('bp_lg_h', NML_X + 40, NML_Y);
  exchange('bp_lg_a', 'bp_lg_h');
  await room.webSocketClose(wsH);
  check('linger:false: a leaver in a fight leaves at once', left('bp_lg_h'));
  room._liveFlags = {};
  const wsI = await join('bp_lg_i');
  place('bp_lg_i', NML_X + 40, NML_Y);
  exchange('bp_lg_a', 'bp_lg_i');
  await room.webSocketClose(wsI);
  check('(guard) I lingers', !!room.playerState.bp_lg_i && room.playerState.bp_lg_i.lingering);
  room._liveFlags = { linger: false };
  room._lingerSweep(T);
  await settle();
  check('...and a body already lingering goes on the next sweep once it is thrown', left('bp_lg_i'));
  room._liveFlags = {};

  /* the last one in the room: nobody to fight */
  await room.webSocketClose(wsC);
  const wsJ = await join('bp_lg_j');
  place('bp_lg_j', NML_X + 40, NML_Y);
  exchange('bp_lg_a', 'bp_lg_j');
  await room.webSocketClose(wsJ);
  check('(guard) J lingers with A still here', !!room.playerState.bp_lg_j && room.playerState.bp_lg_j.lingering);
  await room.webSocketClose(wsA);
  await settle();
  check('the last one out ends every linger', left('bp_lg_j') && Object.keys(room.playerState).length === 0, Object.keys(room.playerState));
  const wsK = await join('bp_lg_k');
  place('bp_lg_k', NML_X, NML_Y);
  exchange('bp_lg_k', 'bp_lg_a');
  await room.webSocketClose(wsK);
  check('a leaver alone in the room leaves at once', left('bp_lg_k'));

  check('linger_wait is a server-emitted type (PRIVILEGED_EVENTS): a phone cannot forge it', PRIVILEGED_EVENTS.has('linger_wait'));
}

Date.now = realNow;
Math.random = realRandom;
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
