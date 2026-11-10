/* Which Wheel a player is on is the server's word -- v2.3.4540
 * (server/src/wheeltables.js _wheelSpectator).
 *
 * A phone says at its join which sizes of the Wheel it can draw (`ws`; every
 * page and bot of today sends [1, 5], TRAPS 196).  One that joins the long
 * Wheel's room with a `ws` that leaves 5 out (or with none) is "out of step"
 * for its whole session: no Wheel monster picks it or hits it, and No man's
 * land holds no rule for it (v2.3.3315).  Its own blows still landed, so one
 * number left out of the join made a page that hits monsters and is never hit
 * back (the 2026-11-03 sweep, S3-19).  The honest page that joins so is a
 * preview (`?bigtown`, `?plaintown`, `?placing=2`: src/game/wheelSize.js),
 * kept out of harm on purpose; it now deals nothing either, in the Wheel.
 *
 *   1. THE JOIN: `ws: [1]` and no `ws` are out of step in the long room,
 *      `ws: [1, 5]` in step.
 *   2. STILL SHELTERED: no monster is after the out-of-step player, and No
 *      man's land's level is 0 for it (as since v2.3.3315).
 *   3. EVERY ROAD TO A MONSTER deals 0 for both out-of-step joins and lands for
 *      the one in step, set up alike: the swing, an ability (bash), the lunge,
 *      the element burst (its mana kept), the arrow blast, a damage over time
 *      it started.
 *   4. EVERY ROAD TO A PLAYER: the PvP door refuses it both ways in No man's
 *      land; two players in step there are allowed; a duel's consent still
 *      holds for it (a duel hurts both ways).
 *   5. ONLY IN THE WHEEL: out of the Wheel's zone it is a player like any.
 *   6. THE SWITCH: `wheelstep: false` in the live flags, and its blows land
 *      as before.
 *
 * Wheel places come from the room's own spawned monsters, never written here.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import * as LONG from '../src/wheelspawns.js';

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [],
  acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(mockState, mockEnv);
room._liveFlags = {};   /* the live room: the long Wheel */
const sessions = Object.create(null);
async function join(id, ws) {
  const sock = fakeWs(id);
  room.sessions.set(sock, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  const msg = { type: 'join', id, name: id, protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } };
  if (ws !== undefined) msg.ws = ws;
  await room.webSocketMessage(sock, JSON.stringify(msg));
  sessions[id] = room.sessions.get(sock);
  return room.playerState[id];
}
const ONE = await join('bp_ws_one', [1]);        /* a preview's join */
const NONE = await join('bp_ws_none');            /* a page that says nothing */
const OK = await join('bp_ws_ok', [1, 5]);        /* every page of today */
const OK2 = await join('bp_ws_ok2', [1, 5]);

// ── 1. THE JOIN ───────────────────────────────────────────────────────────
check('join: the room plays the long Wheel', room._wheelLongNow() === LONG.WHEEL_LONG && LONG.WHEEL_LONG === 5);
check('join: `ws: [1]` and no `ws` are out of step, `ws: [1, 5]` in step',
  !room._wheelInStep(ONE) && !room._wheelInStep(NONE) && room._wheelInStep(OK) && room._wheelInStep(OK2));

/* a monster on the long Wheel past the safe ground (its third stretch: No
   man's land), every player standing beside it */
const ms = room._ensureZoneMonsters(WHEEL_ZONE);
const m = ms.find((x) => x.tier === 3);
const AT = { x: m.x, y: m.y };
const ALL = [ONE, NONE, OK, OK2];
const ready = (ps) => {
  for (const p of ALL) { p.z = WHEEL_ZONE; p.x = AT.x + 30; p.y = AT.y; p.level = 20; p.dying = false; p.dead = false; p.ex = null; }
  ps.hp = ps.maxHp = 500;
  ps.stamina = ps.maxStamina = 500;
  ps.mana = ps.maxMana = 500;
  ps.weapon = { type: 'sword', tierMult: 1, element1: 'flame' };
  ps.shield = { type: 'wood_shield' };
  ps.rangedWeapon = { name: 'Pine Bow', type: 'bow', gearBase: 'ww_pine', quality: 'normal', tierMult: 1 };
  ps._abilCd = {}; ps._burstCdUntil = 0; ps._arrowBlastCdUntil = 0; ps._lungeAt = 0;
  if (ps._monHitCad) ps._monHitCad.clear();
  ps._abilPending = null;
  if (room._abilPending) room._abilPending.clear();
};
const reset = () => {
  m.x = AT.x; m.y = AT.y; m.hp = m.maxHp = 50000; m.alive = true; m.statuses = {};
  m.dmgByPlayer = null; m._aggroOverrideTarget = null;
};
/* what one road takes off the monster for player `ps` */
const ROADS = {
  swing: (ps, id) => room._handleMonsterDamage(sessions[id], { monsterId: m.id, zone: WHEEL_ZONE, slot: 'melee' }),
  bash: (ps, id) => room._handleAbility(sessions[id], { kind: 'bash', targetId: String(m.id) }),
  lunge: (ps, id) => room._lungeStrike(sessions[id], ps, m.id),
  burst: (ps, id) => room._handleElementBurst(sessions[id]),
  arrowblast: (ps, id) => { room._liveFlags.bowvolley = false; room._handleArrowBlast(sessions[id], { zone: WHEEL_ZONE, x: m.x, y: m.y }); delete room._liveFlags.bowvolley; },
  dot: (ps, id) => room._applyMonsterDot(WHEEL_ZONE, m, 40, id, 'burn'),
};
const dealt = (road, ps) => {
  ready(ps); reset();
  const before = m.hp;
  ROADS[road](ps, ps === ONE ? 'bp_ws_one' : ps === NONE ? 'bp_ws_none' : ps === OK ? 'bp_ws_ok' : 'bp_ws_ok2');
  return before - m.hp;
};

// ── 2. STILL SHELTERED ────────────────────────────────────────────────────
ready(OK);
check('sheltered: no monster is after an out-of-step player, one in step is fair game',
  room._wheelSheltered(m, 'bp_ws_one', ONE.x, ONE.y, Date.now()) === true
  && room._wheelSheltered(m, 'bp_ws_none', NONE.x, NONE.y, Date.now()) === true
  && room._wheelSheltered(m, 'bp_ws_ok', OK.x, OK.y, Date.now()) === false);
check('sheltered: No man\'s land\'s level is 0 for it, the one in step stands in it',
  room._nmlLevelOf(ONE) === 0 && room._nmlLevelOf(NONE) === 0 && room._nmlLevelOf(OK) >= 1,
  { one: room._nmlLevelOf(ONE), ok: room._nmlLevelOf(OK) });

// ── 3. EVERY ROAD TO A MONSTER ────────────────────────────────────────────
for (const road of Object.keys(ROADS)) {
  const ok = dealt(road, OK), one = dealt(road, ONE), none = dealt(road, NONE);
  check(`monster, ${road}: lands for the page in step (${ok}), 0 for \`ws: [1]\` and for no \`ws\``,
    ok > 0 && one === 0 && none === 0, { ok, one, none });
}
{
  dealt('burst', ONE);
  check('monster, burst: an out-of-step cast keeps its mana (a quiet drop, nothing spent)', ONE.mana === ONE.maxMana, ONE.mana);
}

// ── 4. EVERY ROAD TO A PLAYER ─────────────────────────────────────────────
ready(OK);
check('player: two in step in No man\'s land may fight (the control)', room._pvpAllowed('bp_ws_ok', 'bp_ws_ok2', WHEEL_ZONE) === true);
check('player: the out-of-step one can hit nobody and nobody hits it',
  !room._pvpAllowed('bp_ws_one', 'bp_ws_ok', WHEEL_ZONE) && !room._pvpAllowed('bp_ws_ok', 'bp_ws_one', WHEEL_ZONE)
  && !room._pvpAllowed('bp_ws_none', 'bp_ws_ok', WHEEL_ZONE) && !room._pvpAllowed('bp_ws_ok', 'bp_ws_none', WHEEL_ZONE));
{
  if (!room._pvpConsent) room._pvpConsent = new Map();
  room._pvpConsent.set(room._pvpPairKey('bp_ws_one', 'bp_ws_ok'), Date.now() + 60000);
  check('player: a duel\'s consent still holds for it (a duel hurts both ways)',
    room._pvpAllowed('bp_ws_one', 'bp_ws_ok', WHEEL_ZONE) && room._pvpAllowed('bp_ws_ok', 'bp_ws_one', WHEEL_ZONE));
  room._pvpConsent.delete(room._pvpPairKey('bp_ws_one', 'bp_ws_ok'));
}

// ── 5. ONLY IN THE WHEEL ──────────────────────────────────────────────────
{
  ready(ONE);
  check('only the Wheel: in the Wheel it is a spectator, one in step is not', room._wheelSpectator(ONE) && !room._wheelSpectator(OK));
  ONE.z = 'meadow';
  check('only the Wheel: out of the Wheel\'s zone it is a player like any', room._wheelSpectator(ONE) === false);
  ready(ONE);
}

// ── 6. THE SWITCH ─────────────────────────────────────────────────────────
{
  room._liveFlags = { wheelstep: false };
  const swing = dealt('swing', ONE), dot = dealt('dot', NONE);
  check('switch: `wheelstep: false` -- an out-of-step page\'s blows land as before', swing > 0 && dot > 0 && !room._wheelSpectator(ONE), { swing, dot });
  check('switch: ...and it is still sheltered (as before)', room._wheelSheltered(m, 'bp_ws_one', ONE.x, ONE.y, Date.now()) === true);
  room._liveFlags = {};
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
