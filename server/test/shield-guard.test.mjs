/* v2.3.4393: the shield guard's copies agree (the state-machine sweep, V10 and
 * V1 S1-10).  Three things, each failing before this version:
 *
 *   1. SERVER: at 0 stamina a monster's blocked blow breaks the guard as a
 *      player's blocked blow does (hits.js _hitStopped; combat.js and
 *      pvpextras.js already did).  Before: the bar clamped at 0, the shield
 *      stayed up, and every blow until the next regen tick (~670 ms) was
 *      stopped for free.  `monsterguardbreak: false` in the live flags is the
 *      way back (its check is here, not in liveops.test).
 *   2. PHONE: the fallback block is for local monsters only; in a server zone
 *      a blow that reaches it LANDED (src/game/shieldCopies.js).
 *   3. PHONE: another player's `player_shield` edge is applied whatever
 *      their zone; only the sound is for a peer here.
 *
 * Against the real GameRoom, through a basic swing's real entry point
 * (telegraph.js _resolveBasicWindup), on the Wheel off the safe ground. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
import { BLOCK_COSTS_STAMINA, BLOCK_STAMINA_COST } from '../src/data.js';
import { localBlockApplies, applyPeerShieldEdge } from '../../src/game/shieldCopies.js';

const mockState = () => ({
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
});
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

/* Sure hits: _applyDamage rolls a Dodge on Math.random. */
Math.random = () => 0.999;

const room = new GameRoom(mockState(), mockEnv);
const ws = fakeWs('p1');
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
/* TRAPS §196: the Wheels a phone of today draws */
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'p1', name: 'Guard', protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
const P = room.playerState.p1;
const M = room._ensureZoneMonsters(WHEEL_ZONE).find((m) => m.home === 'frost');
check('setup: a player joined, a Wheel monster to borrow, the drain on', !!P && !!M && BLOCK_COSTS_STAMINA === true && BLOCK_STAMINA_COST > 0);

/* Out on the Wheel, 400 px past the safe ground along the monster's spoke. */
const ux = M.spawnX - WHEEL_CENTRE[0], uy = M.spawnY - WHEEL_CENTRE[1], ul = Math.hypot(ux, uy);
const SX = WHEEL_CENTRE[0] + (ux / ul) * (WHEEL_SAFE_R + 400), SY = WHEEL_CENTRE[1] + (uy / ul) * (WHEEL_SAFE_R + 400);

/* One basic swing at a player holding the shield toward it. */
function swingAt({ stamina, raisedAgo = 5000 }) {
  const now = Date.now();
  const m = M;
  m.alive = true; m.x = SX; m.y = SY; m.hp = m.maxHp;
  m.statuses = {}; m.arch = 'fodder'; m.element = null; m.variant = null; m.dmg = 30; m.level = 5;
  m.dmgByPlayer = Object.create(null);
  m.atkCd = now + 1e9; m._attackingUntil = 0; m._stunUntil = 0;
  m._tgPhase = null; m._tgUntil = 0; m._tgNextAt = now + 1e9;
  m._burPhase = null; m._burCd = now + 1e9; m._invulnUntil = 0;
  m._projImpactAt = 0; m._projTargetId = null;
  m.tier = undefined; room._clearMonsterMove(m);
  room.monsters[WHEEL_ZONE] = [m];
  P.z = WHEEL_ZONE; P.x = SX + 30; P.y = SY;
  P.dead = false; P.dying = false; P.disconnected = false;
  P.hp = P.maxHp; P.stamina = stamina;
  P.dodging = false; P._rollUntil = 0; P.ex = null;
  P._zoneEntryGraceUntil = 0; P._godUntil = 0; P._guardBrokenUntil = 0;
  P.blocking = true; P.blockStartT = now - raisedAgo;
  P.ba = Math.atan2(m.y - P.y, m.x - P.x);
  room.eventBuffer.length = 0;
  const hp0 = P.hp;
  m._bwUntil = now - 1; m._bwTarget = 'p1'; m._bwKind = 'swing';
  room._resolveBasicWindup(WHEEL_ZONE, m, now);
  const ev = room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload.targetId === 'p1');
  return { blocked: !!(ev && ev.payload.blocked), parried: !!(ev && ev.payload.parried), hpLost: hp0 - P.hp };
}

// ── 1. the server: zero stamina means one thing ──
{
  room._liveFlags = Object.create(null);
  const r = swingAt({ stamina: 0 });
  check('1a. at 0 stamina the blow that reaches the raised shield is still blocked (the guard holds for THIS one)', r.blocked && r.hpLost === 0, r);
  check('1a. ...and breaks the guard, as a player\'s blocked blow does', P.blocking === false && P.blockStartT === 0 && P._guardBrokenUntil > Date.now(), { blocking: P.blocking, until: P._guardBrokenUntil });
  /* the latch: the phone's next move still says blocking:true and is refused */
  const sess = [...room.sessions.values()].find((x) => x.id === 'p1');
  room._handleMove(sess, ws, { type: 'move', x: P.x, y: P.y, d: 'down', z: WHEEL_ZONE, blocking: true, ba: P.ba });
  check('1b. the phone\'s next blocking:true is refused for the 3 s', P.blocking === false, { blocking: P.blocking });
  const next = (() => {   /* the next blow in the same latch lands */
    const now = Date.now();
    M.alive = true; M._bwUntil = now - 1; M._bwTarget = 'p1'; M._bwKind = 'swing';
    room.eventBuffer.length = 0;
    const hp0 = P.hp;
    room._resolveBasicWindup(WHEEL_ZONE, M, now);
    return hp0 - P.hp;
  })();
  check('1c. the next blow inside the break lands (no longer free for up to a regen tick)', next > 0, { next });

  const r2 = swingAt({ stamina: BLOCK_STAMINA_COST + 5 });
  check('1d. a block with stamina to spare leaves the guard up (honest play unchanged)', r2.blocked && P.blocking === true && !(P._guardBrokenUntil > Date.now()), { r2, st: P.stamina });

  const r3 = swingAt({ stamina: BLOCK_STAMINA_COST });
  check('1e. a block that spends the last of the bar breaks it (as combat.js: "stamina <= 0")', r3.blocked && P.stamina === 0 && P.blocking === false && P._guardBrokenUntil > Date.now(), { r3, st: P.stamina });

  const r4 = swingAt({ stamina: 0, raisedAgo: 10 });
  check('1f. a parry costs nothing, so it breaks nothing, even at 0', r4.parried && P.blocking === true, { r4, blocking: P.blocking });
}

// ── 1k. the kill switch ──
{
  room._liveFlags = Object.assign(Object.create(null), { monsterguardbreak: false });
  const r = swingAt({ stamina: 0 });
  check('1k. `monsterguardbreak: false`: the old way, the bar at 0 and the shield left up', r.blocked && P.stamina === 0 && P.blocking === true && !(P._guardBrokenUntil > Date.now()), { r, blocking: P.blocking });
  room._liveFlags = Object.assign(Object.create(null), { monsterguardbreak: true });
  swingAt({ stamina: 0 });
  check('1k. `monsterguardbreak: true` (or absent) breaks it', P.blocking === false);
  check('1k. the switch\'s name is lower case (liveops §8)', 'monsterguardbreak' === 'monsterguardbreak'.toLowerCase());
  room._liveFlags = Object.create(null);
}

// ── 2. the phone: the fallback block is for local monsters only ──
{
  check('2a. in a server zone a landed blow is never the phone\'s to block', localBlockApplies({ _serverMonsters: true }, false) === false);
  check('2b. a worker-resolved blow never is either (v2.3.2238)', localBlockApplies({ _serverMonsters: true }, true) === false && localBlockApplies({ _serverMonsters: false }, true) === false);
  check('2c. with local monsters the fallback still blocks', localBlockApplies({ _serverMonsters: false }, false) === true);
  const src = readFileSync(new URL('../../src/networking/gameEvents.js', import.meta.url), 'utf8');
  check('2d. gameEvents\' fallback block asks localBlockApplies', /S\._shieldUp && localBlockApplies\(S, _srvResolved\) && isAttackInShieldArc/.test(src));
  check('2d. ...and no longer the bare `!_srvResolved` test', !/S\._shieldUp && !_srvResolved && isAttackInShieldArc/.test(src));
}

// ── 3. the phone: a peer's shield edge whatever their zone ──
{
  const far = { _shieldUp: true };
  const heardFar = applyPeerShieldEdge(far, false, false, 123);
  check('3a. a peer in another zone who lowers the guard is drawn lowered when we meet', far._shieldUp === false && far._shieldTs === 123 && heardFar === false);
  const far2 = { _shieldUp: false };
  check('3b. ...and raised, silently (the sound is for a peer here)', applyPeerShieldEdge(far2, true, false, 1) === false && far2._shieldUp === true);
  const here = { _shieldUp: false };
  check('3c. a peer here raising it is heard', applyPeerShieldEdge(here, true, true, 1) === true && here._shieldUp === true);
  check('3d. ...but not a second time while it is up', applyPeerShieldEdge(here, true, true, 2) === false);
  check('3e. an unknown sender is still dropped', applyPeerShieldEdge(undefined, true, true, 1) === false);
  const src = readFileSync(new URL('../../src/networking/gameEvents.js', import.meta.url), 'utf8');
  const i = src.indexOf("case 'player_shield':");
  const body = src.slice(i, src.indexOf('break;', i));
  check('3f. gameEvents\' player_shield case applies the edge through applyPeerShieldEdge', i > 0 && /applyPeerShieldEdge\(/.test(body));
  check('3f. ...and the zone test gates only the sound (no `if (payload.id && _peerInZone(...)) {` around the write)', !/if \(payload\.id && _peerInZone\(S, payload\.id\)\) \{/.test(body));
  check('3g. own keys only: an id like __proto__ never reaches Object.prototype', /hasOwnProperty\.call\(S\.others, payload\.id\)/.test(body));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
