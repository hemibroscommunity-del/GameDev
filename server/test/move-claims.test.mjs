/* WHAT A MOVE'S CLAIMS BUY -- v2.3.4605 (server/src/moveclaims.js).
 *
 * The state-machine sweep (2026-11-03, V1 S1-10 / S3-4, S3-26): the parry and
 * the cooking shield were bought by a field on the phone's `move` with
 * nothing on the worker behind it.  Against the real GameRoom, through the
 * real router, move handler and the one door a monster's blow goes through
 * (hits.js _monsterHit), on the Wheel:
 *
 *   1. parryrearm: a bundle re-raising the shield every 240 ms parries once,
 *      not every blow; a raise after PARRY_REARM_MS down parries; a quicker
 *      one still blocks;
 *   2. swingguard: a sword's claim while blocking lowers the guard on the
 *      worker (a monster_damage or a player_attack), and so the raise right
 *      after it parries nothing; a bow's claim (it lands after its flight), a
 *      Shield Bash and an element burst leave it up;
 *   3. blockarc: a raised guard with no `ba` covers the front of its facing
 *      (`f`, else `d`), not all round;
 *   4. cookshield: a cook edge with no fire grants nothing; a real fire (a log
 *      spent) and a cook at it grant the shield; an attack, `ex: null` and
 *      `ex: 'cook'` in one bundle grant nothing for COOK_REARM_MS; the fire
 *      is held to its zone, its reach and its life (a fish cooked keeps it);
 *   5. each switch false brings back today's behaviour.
 */
import { GameRoom } from '../src/index.js';
import { MOVE_CLAIMS } from '../src/moveclaims.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

/* the worker's clock and dice are the test's: sure hits, no dodge */
let T = 1_900_000_000_000;
Date.now = () => T;
Math.random = () => 0.999;

const mockState = () => ({
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
});
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

const room = new GameRoom(mockState(), mockEnv);
const WS = {};
for (const pid of ['bp_mc_p', 'bp_mc_a']) {
  const ws = fakeWs();
  WS[pid] = ws;
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
}
clearInterval(room.tickInterval); room.tickInterval = null;
room.stateHistory = {};
const P = room.playerState.bp_mc_p;     /* the one with the shield and the pan */
const A = room.playerState.bp_mc_a;     /* a second player, far off */
check('setup: two players joined', !!P && !!A);

/* A Wheel monster off the safe ground (server-dead.test's way), P 30 px east
   of it, so its blow comes from the WEST: a shield facing it is ba = PI */
const wheel = room._ensureZoneMonsters('wheel');
const M = wheel.find((q) => q.home === 'ember');
for (const q of wheel) q._wanderPausedUntil = T + 1e9;
check('setup: a Wheel monster to borrow', !!M);
const WEST = Math.PI;
function place() {
  P.z = 'wheel'; P.x = M.x + 30; P.y = M.y; P._zoneEntryGraceUntil = 0;
  A.z = 'wheel'; A.x = M.x + 3000; A.y = M.y + 3000; A._zoneEntryGraceUntil = 0;
  P.hp = P.maxHp = 100000; P.stamina = P.maxStamina = 100;
  P.dead = P.dying = false;
}
place();

const moveMsg = (fields) => ({ type: 'move', x: P.x, y: P.y, d: 'left', f: 'west', z: P.z, vx: 0, vy: 0,
  dodging: false, blocking: false, ba: null, dead: false, ex: null, ...fields });
async function send(msg) { await room.webSocketMessage(WS.bp_mc_p, JSON.stringify(msg)); }
async function move(fields, dt) { T += (dt === undefined ? 20 : dt); await send(moveMsg(fields)); }
/* several messages in ONE frame, as the quiet phone sends them (bundle.js) */
async function bundle(msgs, dt) { T += (dt === undefined ? 20 : dt); await send(msgs); }
const shield = (up, extra) => ({ blocking: up, ba: up ? WEST : null, ...(extra || {}) });

/* The monster's basic swing at P, through the one door (hits.js) */
function calm() { M._bwUntil = 0; M._bwTarget = null; M._attackingUntil = 0; M.atkCd = 0; M._tgPhase = null; M._mvPhase = null; }
function blow(dt) {
  T += (dt === undefined ? 100 : dt);
  calm();
  P.stamina = 50;   /* never a guard break at 0, never a full bar */
  room.eventBuffer.length = 0;
  const hp0 = P.hp;
  room._resolveBasicSwingHit('wheel', M, 'bp_mc_p', T);
  const ev = room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload && e.payload.targetId === 'bp_mc_p');
  return { sent: !!ev, blocked: !!(ev && ev.payload.blocked), parried: !!(ev && ev.payload.parried), took: hp0 - P.hp };
}
/* the guard down a long while, as it is between fights */
async function rest() { await move(shield(false), 50); await move(shield(false), 2000); }

/* ── 1. parryrearm ── */
room._liveFlags = {};
place();
{
  await rest();
  await move(shield(true));
  let b = blow();
  check('1a. a raise after a long time down parries (as always)', b.blocked && b.parried, b);

  /* the exploit: down and straight back up, every 240 ms, a blow after each */
  let parries = 0, blocks = 0;
  for (let i = 0; i < 8; i++) {
    await bundle([moveMsg(shield(false)), moveMsg(shield(true))], 240 - 100);
    b = blow(100);
    if (b.parried) parries++;
    if (b.blocked) blocks++;
  }
  check('1b. a bundle re-raising every 240 ms parries none of its 8 blows (main: all 8)', parries === 0, { parries, blocks });
  check('1c. ...though each quick raise still BLOCKS: the guard is up', blocks === 8, { blocks });

  await move(shield(false), 50);
  await move(shield(true), MOVE_CLAIMS.PARRY_REARM_MS - 50);
  b = blow(50);
  check('1d. a raise after ' + (MOVE_CLAIMS.PARRY_REARM_MS - 50) + ' ms down blocks and does not parry', b.blocked && !b.parried, b);

  await move(shield(false), 50);
  await move(shield(true), MOVE_CLAIMS.PARRY_REARM_MS);
  b = blow(50);
  check('1e. a raise after PARRY_REARM_MS (' + MOVE_CLAIMS.PARRY_REARM_MS + ' ms) down parries', b.blocked && b.parried, b);
  check('1f. the re-arm is the decided 400 ms', MOVE_CLAIMS.PARRY_REARM_MS === 400 && Object.isFrozen(MOVE_CLAIMS));

  /* the whole exploit, as one long held press is not: a held guard parries
     only inside PARRY_WINDOW_MS of its raise, as before */
  b = blow(room.PARRY_WINDOW_MS + 50);
  check('1g. a held guard past the window blocks without a parry (unchanged)', b.blocked && !b.parried, b);
  await rest();
}

/* ── 2. swingguard ── */
room._liveFlags = {};
place();
{
  await rest();
  await move(shield(true));
  check('2a. (setup) the guard is up on the worker', P.blocking === true);
  await send({ type: 'monster_damage', payload: { monsterId: M.id, zone: 'wheel', slot: 'melee', special: false } });
  check('2b. a sword\'s monster_damage claim lowers the guard on the worker (main: still up)', P.blocking === false, { blocking: P.blocking });
  await move(shield(true));
  const b = blow(50);
  check('2c. ...so the raise right after the swing blocks but cannot parry', b.blocked && !b.parried, b);

  await rest();
  await move(shield(true));
  await send({ type: 'player_attack', payload: { kind: 'melee', x: P.x, y: P.y, angle: 0, range: 80, arc: 2.6, dmgBase: 10 } });
  check('2d. a sword\'s player_attack claim lowers it too', P.blocking === false, { blocking: P.blocking });

  await rest();
  await move(shield(true));
  P.rangedWeapon = P.rangedWeapon || { type: 'bow', tierMult: 1 };
  await send({ type: 'player_attack', payload: { kind: 'ranged', x: P.x, y: P.y, angle: 0, range: 600, arc: 0.3, dmgBase: 10 } });
  check('2e. a bow\'s player_attack (sent when the arrow LANDS) leaves it up', P.blocking === true, { blocking: P.blocking });
  await send({ type: 'monster_damage', payload: { monsterId: M.id, zone: 'wheel', slot: 'ranged', special: false, noKb: true } });
  check('2f. a bow\'s monster_damage leaves it up', P.blocking === true, { blocking: P.blocking });
  delete P.rangedWeapon;
  await send({ type: 'player_attack', payload: { kind: 'ranged', x: P.x, y: P.y, angle: 0, range: 600, arc: 0.3, dmgBase: 10 } });
  check('2g. a "ranged" player_attack with no bow is a swing (the handler\'s own rule) and lowers it', P.blocking === false, { blocking: P.blocking });

  await rest();
  await move(shield(true));
  await send({ type: 'ability', payload: { kind: 'bash' } });
  check('2h. Shield Bash, cast out of a raised shield, leaves it up', P.blocking === true, { blocking: P.blocking });
  await send({ type: 'element_burst', payload: {} });
  check('2i. an element burst (the phone casts it shield up) leaves it up', P.blocking === true, { blocking: P.blocking });
  await rest();
}

/* ── 3. blockarc ── */
room._liveFlags = {};
place();
{
  await rest();
  await move({ blocking: true, ba: null, f: 'west', d: 'left' });
  let b = blow(400);
  check('3a. no `ba`, facing the monster (f: west): blocked', b.blocked, b);
  await move({ blocking: true, ba: null, f: 'east', d: 'right' });
  b = blow(400);
  check('3b. no `ba`, its back to the monster (f: east): the blow LANDS (main: blocked all round)', !b.blocked && b.took > 0, b);
  await move({ blocking: true, ba: null, f: null, d: 'left' });
  P.f = undefined;
  b = blow(400);
  check('3c. no `ba` and no `f`: the 4-way `d` (left, the monster\'s side) blocks', b.blocked, b);
  P.d = 'right';
  b = blow(400);
  check('3d. ...and `d` right lands', !b.blocked && b.took > 0, b);
  P.f = '__proto__'; P.d = 'constructor';
  b = blow(400);
  check('3e. junk words for the facing fall to south: a blow from the west lands, nothing throws', !b.blocked && b.took > 0, b);
  check('3f. a guard WITH `ba` is unchanged: the phone\'s own angle', (P.ba = WEST, P.f = 'east', room._blockArcCovers(P, M.x, M.y)) && !(P.ba = 0, room._blockArcCovers(P, M.x, M.y)));
  P.ba = null; P.f = 'west'; P.d = 'left';
  await rest();
}

/* ── 4. cookshield ── */
room._liveFlags = {};
place();
const cookGuarded = () => { const b = blow(50); return !b.sent && b.took === 0; };
{
  await rest();
  P._fireLit = undefined;
  await move({ ex: null });
  await move({ ex: 'cook' });
  check('4a. (setup) the cook edge is stamped by the move, as before', P.ex === 'cook' && P._exAt === T, { ex: P.ex, at: P._exAt, T });
  check('4b. a cook edge with NO fire grants nothing: the blow lands (main: shielded)', !cookGuarded() && room._extractionShielded('bp_mc_p', T) === false);
  await move({ ex: null });

  /* a real fire: a log spent */
  P.inventory = P.inventory || {};
  P.inventory.wood_oak = 3;
  await send({ type: 'firemaking_request', payload: { invKey: 'wood_oak' } });
  check('4c. a firemaking_request spends a log and the worker knows the fire (zone, place, time)',
    P.inventory.wood_oak === 2 && !!P._fireLit && P._fireLit.z === 'wheel' && P._fireLit.x === P.x && P._fireLit.y === P.y && P._fireLit.at === T, P._fireLit);
  await move({ ex: 'fire' });
  check('4d. lighting it is shielded', cookGuarded());
  await move({ ex: 'cook' }, 700);   /* fire -> cook: no null between, as the phone sends it */
  await move({ ex: null });
  await move({ ex: 'cook' }, 500);
  check('4e. a cook at it is shielded', cookGuarded());

  /* the exploit: a swing, `ex: null`, `ex: 'cook'`, one frame */
  await bundle([
    { type: 'monster_damage', payload: { monsterId: M.id, zone: 'wheel', slot: 'melee', special: false } },
    moveMsg({ ex: null }),
    moveMsg({ ex: 'cook' }),
  ]);
  check('4f. (setup) the bundle re-stamped the cook edge after its swing', P.ex === 'cook' && P._exAt === T);
  check('4g. an attack, then a re-armed cook in one bundle: NOT shielded (main: shielded at once)', !cookGuarded());
  T += MOVE_CLAIMS.COOK_REARM_MS - 1000;
  check('4h. ...nor ' + (MOVE_CLAIMS.COOK_REARM_MS - 900) + ' ms on', !cookGuarded());
  T += 1000;
  check('4i. ...and COOK_REARM_MS (' + MOVE_CLAIMS.COOK_REARM_MS + ' ms) after the swing, a cook still at the fire is shielded again', cookGuarded());
  check('4j. the re-arm is the decided 3000 ms', MOVE_CLAIMS.COOK_REARM_MS === 3000);
  await move({ ex: null });

  /* the fire's place and zone */
  const fx = P.x, fy = P.y;
  P.x = fx + MOVE_CLAIMS.COOK_FIRE_REACH + 40;
  await move({ ex: 'cook' });
  check('4k. a cook begun past COOK_FIRE_REACH from the fire grants nothing', !cookGuarded());
  await move({ ex: null });
  P.x = fx; P.y = fy;
  P._fireLit.z = 'dungeon_x';
  await move({ ex: 'cook' });
  check('4l. a fire in another zone grants nothing', !cookGuarded());
  P._fireLit.z = 'wheel';
  await move({ ex: null });

  /* the fire's life: read when the cook BEGAN */
  T = P._fireLit.at + MOVE_CLAIMS.COOK_FIRE_MS + 1000;
  await move({ ex: 'cook' });
  check('4m. a cook begun after the fire burned out (no fish cooked at it) grants nothing', !cookGuarded());
  await move({ ex: null });
  /* light again, cook a fish, and the fire's life runs from the fish */
  await send({ type: 'firemaking_request', payload: { invKey: 'wood_oak' } });
  const lit = T;
  T = lit + 40000;
  P._lastCookAt = T;   /* cooking.js _handleCookRequest's own stamp on a fish cooked (its floors and bot checks are its suite's) */
  T = lit + 40000 + MOVE_CLAIMS.COOK_FIRE_MS - 1000;
  await move({ ex: 'cook' });
  check('4n. a cook begun ' + Math.round((T - lit) / 1000) + ' s after the light, inside COOK_FIRE_MS of the last fish, is shielded', cookGuarded());
  T += 100000;
  check('4o. ...and stays shielded however long that cook runs (the fire is read at its start; 120 s ceiling unchanged)', room._extractionShielded('bp_mc_p', T) === true);
  T += room.COOK_SHIELD_MS;
  check('4p. ...until the old ceiling', room._extractionShielded('bp_mc_p', T) === false);
  await move({ ex: null });
}

/* ── 5. each switch false brings back today ── */
place();
{
  room._liveFlags = { parryrearm: false };
  await rest();
  await move(shield(true));
  let parries = 0;
  for (let i = 0; i < 4; i++) {
    await bundle([moveMsg(shield(false)), moveMsg(shield(true))], 140);
    if (blow(100).parried) parries++;
  }
  check('5a. parryrearm: false -- every quick re-raise parries again', parries === 4, { parries });

  room._liveFlags = { swingguard: false };
  await rest();
  await move(shield(true));
  await send({ type: 'monster_damage', payload: { monsterId: M.id, zone: 'wheel', slot: 'melee', special: false } });
  check('5b. swingguard: false -- a sword\'s claim leaves the guard up', P.blocking === true);

  room._liveFlags = { blockarc: false };
  await move({ blocking: true, ba: null, f: 'east', d: 'right' }, 400);
  const b = blow(400);
  check('5c. blockarc: false -- no `ba` blocks all round again (its back to the monster)', b.blocked, b);
  await rest();

  room._liveFlags = { cookshield: false };
  P._fireLit = undefined;
  await move({ ex: null });
  await move({ ex: 'cook' });
  check('5d. cookshield: false -- a cook edge with no fire is shielded again', cookGuarded());
  await bundle([
    { type: 'monster_damage', payload: { monsterId: M.id, zone: 'wheel', slot: 'melee', special: false } },
    moveMsg({ ex: null }),
    moveMsg({ ex: 'cook' }),
  ]);
  check('5e. ...and the swing-then-cook bundle re-arms it at once', cookGuarded());
  await move({ ex: null });
  room._liveFlags = {};
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
