/* SPARRING CLONES -- v2.3.3265 (server/src/spar.js, docs/specs/sparring.md).
 *
 * Owner, 2026-10-15: "I wish I could test PvP somehow. Can you make a special
 * environment where I can go to attack clones of myself using different
 * weapons and you just have them attack me using AI? Purely for testing
 * purposes. Maybe this is better to add to the admin window".
 *
 *   1. the panel's lever (/dev/spar): add, the cap, all, the skill, clear;
 *   2. a clone is you to fight: your level, points and armour, your weapon for
 *      its slot (a copy) or the tutorial's, none of your bag or gold; every
 *      phone is told it arrived, with its look;
 *   3. who may fight whom: a clone and its owner, either way, always engaged;
 *      nobody else; never No man's land's rule;
 *   4. no monster sees a clone;
 *   5. the AI fights you through the room's one door: a sword's swings, a
 *      bow's arrows, a staff's bolts, their relays; a dummy never attacks;
 *   6. specials and the sword's lunge go through the worker's own handlers;
 *   7. your blow on a clone, its knockout and its return;
 *   8. a knockout BY your clone is not a death: no screen, no pile, no loss,
 *      healed and saved healed; a monster's is still a death;
 *   9. nothing of a clone is ever stored;
 *  10. a hit's shove and slow are carried out on a clone;
 *  11. leaving the Wheel, leaving the game (no linger), the kill switch;
 *  12. a joining phone is told of the clones;
 *  13. mutations: each guard above fails this suite when it is broken;
 *  14. v2.3.3267: Easy is a beginner -- it fights, but throws no special,
 *      never lunges and waits longer between attacks (the owner: "The bot was
 *      tough to be beat even on easy");
 *  15. v2.3.3267: the page's half of "your clones are monsters to your
 *      weapons" (src/game/sparTargets.js) and a swing's count per clone
 *      (src/game/pvpSwing.js);
 *  16. v2.3.3268: a player you chose to attack in No man's land is one too,
 *      while the rule lets you fight them; the one who attacked you keeps the
 *      shield up (the owner: "attacks against real players to hit them even
 *      when not locked on target but only if you select the attack option").
 */
import { GameRoom } from '../src/index.js';
import { SPAR, SPAR_SKILLS, SPAR_WEAPONS } from '../src/spar.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';
/* v2.3.3266: the page's own reading of a peer's shot */
import { peerShotFlight } from '../../src/game/peerShots.js';
import { BOW_VOLLEY } from '../../src/game/bowVolley.js';
/* v2.3.3267: the page's half -- your clones are monsters to your weapons */
import { isLiveClone, clonesNear, shotPlayerTargets, fightersInSwing, fightOn, FIGHT_R,
  setFoeRule, chooseFoe, isLiveFoe, liveFoes, isLiveFighter, fightersNear, chosenNear, fightingNow, notePvpBlow,
  FIGHT_QUIET_MS, pvpBoutAt, hitMeAt, attackersNow } from '../../src/game/sparTargets.js';
import { pvpSwingClaimOk, PVP_SWING } from '../../src/game/pvpSwing.js';
/* the page's numbers (projectiles.js ARROW_SPEED_PX, gameSystems.js BOW_RANGE_PX;
   peer-shots.test.mjs holds them to the source) */
const PAGE = { arrowPx: 24, reachPx: 675, volleyK: BOW_VOLLEY.SPEED_K, peerPx: BOW_VOLLEY.PEER_PX_PER_FRAME };

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* the worker's clock and dice are the test's: a seeded generator, so every
   run fights the same fight */
let T = 1_900_000_000_000;
Date.now = () => T;
let _s = 7;
function seed(n) { _s = (n >>> 0) || 1; }
Math.random = () => {
  _s = (_s + 0x6D2B79F5) >>> 0;
  let t = _s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

const st = makeState();
const room = new GameRoom(st, mockEnv);
async function join(ws, id) {
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5],
    data: { x: 0, y: 0, z: 'town', sk: 'tan', hr: 'mohawk' } }));
  await new Promise((r) => setTimeout(r, 5));
}
const OWNER = 'bp_spar_owner', OTHER = 'bp_spar_other';
const WSO = fakeWs(), WSB = fakeWs();
await join(WSO, OWNER);
await join(WSB, OTHER);
clearInterval(room.tickInterval); room.tickInterval = null;
const O = room.playerState[OWNER], B = room.playerState[OTHER];
check('two players joined (guard)', !!(O && B));
room._liveFlags = {};
const sessO = room.sessions.get(WSO);

const CX = WHEEL_CENTRE[0], CY = WHEEL_CENTRE[1];
function dressOwner() {
  for (const c of ['sword', 'bow', 'staff']) O.prog3.sk[c].level = 1;
  O.prog3.sk.sword.level = 12;
  O.weapon = { type: 'greatsword', name: 'My Sword', tierMult: 1.25, quality: 'normal', gearBase: 'copper', element1: null };
  O.rangedWeapon = null;
  O.staffWeapon = null;
  O.shield = { name: 'Pine Shield', gearBase: 'wood', tierMult: 1 };
  O.armor = { name: 'Copper Torso', mat: 'copper', tierMult: 1, quality: 'normal' };
  O.legsArmor = null;
  O.inventory = { fish_minnow: 3, wood_pine_log: 5 };
  O.coins = 777;
  O.activeSlot = 'melee';
  room._prog3Recompute(O);
  O.hp = O.maxHp; O.stamina = O.maxStamina; O.mana = O.maxMana;
  O.z = 'wheel'; O.x = CX; O.y = CY;
  O.dead = O.dying = O.disconnected = false;
  O.blocking = false; O.dodging = false;
  O._dazeUntil = O._dazeImmuneUntil = O._stuckUntil = O._stuckImmuneUntil = 0;
  O._staggerUntil = 0; O._wst = null; O._godUntil = 0; O._zoneEntryGraceUntil = 0;
  B.z = 'wheel'; B.x = CX + 60; B.y = CY + 300;
}
/* the owner's position each tick, as their moves would leave it in the
   history the hits are judged against (tick.js snapshots it every tick) */
function snapOwner() {
  room.stateHistory[OWNER] = [{ x: O.x, y: O.y, d: O.d, z: O.z, dodging: !!O.dodging, blocking: !!O.blocking,
    ba: typeof O.ba === 'number' ? O.ba : null, dead: !!O.dead, tick: 0 }];
}
const clonesOf = () => [...(room._sparById ? room._sparById.values() : [])];
const cloneOf = (w) => clonesOf().find((c) => c.weapon === w) || null;
/* run the spar's tick for `ms`, gathering the events it made */
function run(ms, onEv) {
  const out = [];
  const end = T + ms;
  while (T < end) {
    T += 22;
    snapOwner();
    room._tickSpar(T);
    for (const e of room.eventBuffer) { out.push(e); if (onEv) onEv(e); }
    room.eventBuffer.length = 0;
  }
  return out;
}
const stateMsgs = (ws) => ws.sent.filter((m) => m.type === 'spar_state').map((m) => m.payload);

/* ── 1. the panel's lever ── */
dressOwner();
{
  const r1 = room._sparDev(OWNER, { add: 'sword' });
  check('1a add a sword clone', r1.ok && r1.clones.length === 1 && r1.clones[0].weapon === 'sword', r1);
  check('1b the default skill is normal', r1.skill === 'normal', r1.skill);
  const bad = room._sparDev(OWNER, { add: 'axe' });
  check('1c an unknown weapon is refused', !bad.ok, bad);
  const r2 = room._sparDev(OWNER, { add: 'bow' });
  const r3 = room._sparDev(OWNER, { add: 'staff' });
  check('1d three clones out', r3.ok && r3.clones.length === 3, r3.clones && r3.clones.length);
  const r4 = room._sparDev(OWNER, { add: 'sword' });
  check('1e at most SPAR.MAX at once', !r4.ok && clonesOf().length === SPAR.MAX, r4);
  const sk = room._sparDev(OWNER, { skill: 'hard' });
  check('1f the skill can be set', sk.ok && sk.skill === 'hard', sk);
  const skBad = room._sparDev(OWNER, { skill: 'godlike' });
  check('1g an unknown skill is refused', !skBad.ok, skBad);
  const all = room._sparDev(OWNER, { add: 'all' });
  check('1h all: one of each, replacing what was out', all.ok && all.clones.length === 3
    && ['sword', 'bow', 'staff'].every((w) => all.clones.filter((c) => c.weapon === w).length === 1), all.clones);
  check('1i ...keeping the skill', all.skill === 'hard', all.skill);
  const off = room._sparDev(OTHER, { add: 'sword' });
  const clr = room._sparDev(OWNER, { clear: true });
  check('1j clear: none out, the skill kept', clr.ok && clr.clones.length === 0 && clr.skill === 'hard', clr);
  check('1k ...and no clone left in the room', !Object.keys(room.playerState).some((k) => k.startsWith('spar_') && room.playerState[k]._spar && room.playerState[k]._spar.owner === OWNER));
  room._sparDev(OTHER, { clear: true });
  check('1l a player out of the Wheel is told to stand in the world', (() => {
    const z = O.z; O.z = 'farm_home';
    const r = room._sparDev(OWNER, { add: 'sword' });
    O.z = z; return !r.ok && /world/.test(r.error || '');
  })());
  check('1m (anyone online may be given clones by the admin key: the route is admin HTTP)', off.ok === true, off);
}

/* ── 2. a clone is you to fight ── */
dressOwner();
WSB.sent.length = 0;
room._sparDev(OWNER, { add: 'all' });
{
  const sw = cloneOf('sword'), bw = cloneOf('bow'), sf = cloneOf('staff');
  const swp = room.playerState[sw.id], bwp = room.playerState[bw.id], sfp = room.playerState[sf.id];
  check('2a each is a player in the room', !!(swp && bwp && sfp));
  check('2b your level and points', swp.level === O.level && swp.prog3.sk.sword.level === 12 && swp.maxHp === O.maxHp, { lv: swp.level, own: O.level });
  check('2c your armour', swp.armor && swp.armor.name === 'Copper Torso');
  check('2d the sword clone carries a copy of your sword', swp.weapon && swp.weapon.name === 'My Sword' && swp.weapon !== O.weapon);
  swp.weapon.tierMult = 9;
  check('2e ...a copy: its change is not yours', O.weapon.tierMult === 1.25);
  swp.weapon.tierMult = 1.25;
  check('2f a slot you leave empty gets the tutorial\'s weapon', bwp.rangedWeapon && bwp.rangedWeapon.type === 'bow'
    && bwp.rangedWeapon.gearBase === 'ww_pine' && sfp.staffWeapon && sfp.staffWeapon.type === 'staff', { b: bwp.rangedWeapon, s: sfp.staffWeapon });
  check('2g each holds only its own weapon', !bwp.weapon && !bwp.staffWeapon && !swp.rangedWeapon && sfp.activeSlot === 'staff' && bwp.activeSlot === 'ranged');
  check('2h none of your bag or gold', !(swp.inventory && Object.keys(swp.inventory).length) && !swp.coins);
  check('2i full health, stamina and mana', swp.hp === swp.maxHp && swp.stamina === swp.maxStamina && swp.mana === swp.maxMana);
  check('2j stands on the ring round you', Math.abs(Math.hypot(swp.x - O.x, swp.y - O.y) - SPAR.RING_R) < 1, Math.hypot(swp.x - O.x, swp.y - O.y));
  const joins = WSB.sent.filter((m) => m.type === 'player_join');
  check('2k every phone is told each arrived (player_join)', joins.length === 3, joins.length);
  const j0 = joins.find((m) => m.id === sw.id);
  check('2l ...with your look, its name and its weapon', !!j0 && j0.name === 'Sword Clone' && j0.data.sk === 'tan' && j0.data.hr === 'mohawk'
    && j0.data.wpnType === 'greatsword', j0 && j0.data);
  const upd = WSB.sent.filter((m) => m.type === 'player_update' && m.id === sw.id);
  check('2l2 ...and its look again as the look relay sends it (the weapon in hand rides only that road)', upd.length >= 1 && upd[0].data.wpnType === 'greatsword'
    && WSB.sent.some((m) => m.type === 'player_update' && m.id === bw.id && m.data.wpnType === 'bow'), upd.map((m) => m.data && m.data.wpnType));
  const ss = stateMsgs(WSO).pop();
  check('2m your phone is told which players they are (spar_state)', !!ss && ss.clones.length === 3 && ss.note === 'spawned', ss);
  check('2n nobody else is', stateMsgs(WSB).length === 0);
}

/* ── 3. who may fight whom ── */
{
  const [a, b] = clonesOf();
  check('3a you may hit your clone', room._pvpAllowed(OWNER, a.id, 'wheel'));
  check('3b your clone may hit you', room._pvpAllowed(a.id, OWNER, 'wheel'));
  check('3c a bystander may not hit your clone', !room._pvpAllowed(OTHER, a.id, 'wheel'));
  check('3d your clone may not hit a bystander', !room._pvpAllowed(a.id, OTHER, 'wheel'));
  check('3e two clones never fight each other', !room._pvpAllowed(a.id, b.id, 'wheel'));
  check('3f you and a clone are always "fighting" (area moves reach it)', room._pvpEngaged(OWNER, a.id, T) && room._pvpEngaged(a.id, OWNER, T));
  check('3g No man\'s land never applies to a clone', !room._nmlAllowed(OWNER, a.id) && !room._nmlAllowed(a.id, OWNER));
  /* a bystander's swing at a clone right beside them lands nothing */
  const ap = room.playerState[a.id];
  ap.x = B.x + 20; ap.y = B.y;
  room.eventBuffer.length = 0;
  room._pvpHitLanes = new Map();
  room._resolvePvPAttack(room.sessions.get(WSB), { kind: 'melee', x: B.x, y: B.y, angle: 0, range: 50, arc: 2.6, sw: T, dmgBase: 10 });
  check('3h ...and its swing finds nothing to hit', !room.eventBuffer.some((e) => e.type === 'pvp_hit'), room.eventBuffer.map((e) => e.type));
  room.eventBuffer.length = 0;
}

/* ── 4. no monster sees a clone ── */
{
  const c = cloneOf('sword');
  const ps = room.playerState[c.id];
  const hp0 = ps.hp;
  const mt = { id: 'm_test', x: ps.x + 10, y: ps.y, level: 5, dmg: 10, alive: true, hp: 100, maxHp: 100 };
  const got = room._telegraphHitPlayer('wheel', mt, c.id, { kind: 'slam', radius: 100, dmgMult: 1 });
  check('4a a monster\'s slam passes a clone by', got === 0 && ps.hp === hp0, { got, hp: ps.hp });
  const ft = room._fireTrailHitPlayer('wheel', { mid: 'm_test', lvl: 5 }, c.id);
  check('4b a fire trail does not burn one', ft === 0 && ps.hp === hp0, { ft });
  /* a live Wheel monster, outside the safe ground: it chases a real player
     beside it (the control) and never a clone in the very same spot */
  const wheel = room._ensureZoneMonsters('wheel');
  const m = wheel.find((q) => q.home === 'ember');
  for (const q of wheel) q._wanderPausedUntil = T + 600000;
  const calm = () => { m._bwUntil = 0; m._bwTarget = null; m._attackingUntil = 0; m.atkCd = 0; m.targetId = null; m._aggroOverrideTarget = null; m._aggroOverrideUntil = 0; };
  const keepO = [O.x, O.y];
  O.x = m.x + 3000; O.y = m.y;   /* you far off, still in the Wheel */
  B._zoneEntryGraceUntil = T + 600000;
  B.x = m.x + 100; B.y = m.y;
  calm(); room._tickMonsters();
  check('4c (control) a monster chases a real player 100 px from it', m.targetId === OTHER, m.targetId);
  B.x = m.x + 2600; B.y = m.y + 2600;
  ps.x = m.x + 100; ps.y = m.y;
  calm(); room._tickMonsters();
  check('4d ...and never a clone in the same spot', m.targetId == null, m.targetId);
  check('4e ...which takes nothing from it', ps.hp === hp0);
  O.x = keepO[0]; O.y = keepO[1];
  B.x = CX + 60; B.y = CY + 300;
}

/* ── 5. the AI fights you through the room's one door ── */
dressOwner();
room._sparDev(OWNER, { add: 'all' });
room._sparDev(OWNER, { skill: 'normal' });
{
  O.maxHp = 100000; O.hp = 100000;   /* a long fight with no knockout in it */
  for (const c of clonesOf()) room._sparStandBack(c, O, T, true);
  const calls = [];
  const real = room._resolvePvPAttack;
  room._resolvePvPAttack = function (sess, payload) { calls.push({ id: sess.id, kind: payload.kind, special: !!payload.special }); return real.call(this, sess, payload); };
  const evs = run(20000);
  room._resolvePvPAttack = real;
  const hits = evs.filter((e) => e.type === 'pvp_hit' && e.payload.target === OWNER);
  const by = (w) => hits.filter((e) => e.payload.attacker === cloneOf(w).id);
  check('5a the sword clone hits you', by('sword').length > 0, by('sword').length);
  check('5b the bow clone hits you', by('bow').length > 0, by('bow').length);
  check('5c the staff clone hits you', by('staff').length > 0, by('staff').length);
  check('5d every hit went through the one door (_resolvePvPAttack)', calls.length >= hits.filter((e) => !e.payload.ability).length && calls.length > 0, { calls: calls.length, hits: hits.length });
  check('5e a sword hit is a melee one, a bow\'s ranged, a staff\'s staff', by('sword').every((e) => e.payload.slot === 'melee')
    && by('bow').every((e) => e.payload.slot === 'ranged') && by('staff').every((e) => e.payload.slot === 'staff'));
  check('5f a hit names its clone', hits.every((e) => /Clone$/.test(e.payload.attackerName || '')), hits.slice(0, 2).map((e) => e.payload.attackerName));
  check('5g you lost the health the hits say', Math.abs((100000 - O.hp) - hits.reduce((s, e) => s + (e.payload.dmgTaken || 0), 0)) < 1, { lost: 100000 - O.hp });
  const rel = (t, w) => evs.filter((e) => e.type === t && e.from === cloneOf(w).id);
  check('5h a sword swing is drawn on your screen (player_swing)', rel('player_swing', 'sword').length > 0);
  check('5i an arrow and a bolt are drawn (player_projectile)', rel('player_projectile', 'bow').length > 0 && rel('player_projectile', 'staff').length > 0);
  check('5j a bolt names you, so it chases you on screen (tg)', rel('player_projectile', 'staff').every((e) => e.payload.tg === OWNER && e.payload.isStaff));
  /* v2.3.3266: a clone's arrow goes out as a page's does -- no speedPx, the
     life of 90 that says the bow's own speed and reach -- and the page's own
     rule (src/game/peerShots.js) draws it at the speed and to the reach the
     worker flies it at here (spar.js G.ARROW_SPEED, G.ARROW_FLIGHT) */
  const plainArrows = rel('player_projectile', 'bow').filter((e) => !e.payload.isSpecial);
  const drawnAs = plainArrows.map((e) => peerShotFlight(e.payload, e.payload.life, PAGE));
  check('5k an arrow goes out as a page\'s does (no speedPx, life 90)', plainArrows.length > 0
    && plainArrows.every((e) => e.payload.speedPx === undefined && e.payload.life === 90), plainArrows.slice(0, 1).map((e) => e.payload));
  check('5k1 ...so it is drawn at the bow\'s 24 px a frame, to 675 px, as the worker flies it', drawnAs.length > 0
    && drawnAs.every((f) => Math.abs(f.speedPx - 24) < 1e-9 && Math.abs(f.reach - 675) < 1e-9 && !f.pierce), drawnAs[0]);
  check('5k2 ...and names you, so it ends where it reaches you on screen (tg)', rel('player_projectile', 'bow').length > 0
    && rel('player_projectile', 'bow').every((e) => e.payload.tg === OWNER));
  check('5l the clones move (the tick is told)', clonesOf().some((c) => room.playerState[c.id].vx !== 0 || room.playerState[c.id].vy !== 0)
    || evs.length > 0);
  /* the dummy */
  room._sparDev(OWNER, { skill: 'dummy' });
  for (const c of clonesOf()) room._sparStandBack(c, O, T, true);
  const where = clonesOf().map((c) => [room.playerState[c.id].x, room.playerState[c.id].y]);
  const hp0 = O.hp;
  const dev = run(8000);
  check('5m a dummy never attacks', !dev.some((e) => e.type === 'pvp_hit') && O.hp === hp0, dev.map((e) => e.type).slice(0, 5));
  check('5n ...nor moves', clonesOf().every((c, i) => room.playerState[c.id].x === where[i][0] && room.playerState[c.id].y === where[i][1]));
  check('5o ...nor sends any move of a fight', !dev.some((e) => e.type === 'player_swing' || e.type === 'player_projectile' || e.type === 'player_dodge'));
}

/* ── 6. specials and the lunge through the worker's own handlers ── */
dressOwner();
room._sparDev(OWNER, { add: 'all' });
room._sparDev(OWNER, { skill: 'hard' });
{
  O.maxHp = 100000; O.hp = 100000;
  for (const c of clonesOf()) room._sparStandBack(c, O, T, true);
  const uses = [];
  const realUse = room._handleAbilityUse;
  room._handleAbilityUse = function (sess, p) { uses.push({ id: sess.id, type: p.type }); return realUse.call(this, sess, p); };
  const abil = [];
  const realAb = room._handleAbility;
  room._handleAbility = function (sess, p) { abil.push({ id: sess.id, kind: p.kind, pid: p.pid }); return realAb.call(this, sess, p); };
  /* the sword clone held out of reach at first, so it lunges */
  const sw = cloneOf('sword');
  room.playerState[sw.id].x = O.x + 280; room.playerState[sw.id].y = O.y;
  const evs = run(30000);
  room._handleAbilityUse = realUse; room._handleAbility = realAb;
  const swipes = uses.filter((u) => u.type === 'swipe');
  check('6a specials are paid at the worker (a swipe\'s mana)', swipes.length > 0, uses.length);
  const specialHits = evs.filter((e) => e.type === 'pvp_hit' && e.payload.target === OWNER && e.payload.dmgTaken > 0 && evs.some((s) => s.type === 'player_projectile' && s.payload.isSpecial && s.from === e.payload.attacker));
  check('6b a bow volley or big bolt is drawn as one (isSpecial)', evs.some((e) => e.type === 'player_projectile' && e.payload.isSpecial), null);
  /* v2.3.3266: a volley goes out as a page's does: three relays of one shot
     (one ts), each one's wait sized for PEER_PX_PER_FRAME, and the page's rule
     lets each go VOLLEY_GAP_MS after the one before, at the volley's speed,
     flying on through you (it pierces, as a page's volley does) */
  const volleys = evs.filter((e) => e.type === 'player_projectile' && e.payload.volley && e.from === cloneOf('bow').id);
  const v3 = volleys.slice(0, 3).map((e) => ({ p: e.payload, f: peerShotFlight(e.payload, e.payload.life, PAGE) }));
  check('6b1 a volley is three relays of one shot, no speedPx', v3.length === 3 && v3.every((v) => v.p.ts === v3[0].p.ts && v.p.speedPx === undefined && v.p.tg === OWNER),
    v3.map((v) => ({ ts: v.p.ts, d: v.p.delayMs })));
  check('6b2 ...drawn at the volley\'s 16.8 px a frame, leaving 198 ms apart, as the worker flies them', v3.length === 3
    && v3.every((v, i) => Math.abs(v.f.speedPx - 24 * 0.7) < 1e-9 && Math.abs(v.f.holdFrames * (1000 / 60) - i * 200 / (24 * 0.7 * 60 / 1000)) < 2 && v.f.pierce),
    v3.map((v) => ({ speed: v.f.speedPx, hold: v.f.holdFrames, pierce: v.f.pierce })));
  check('6c ...and lands', specialHits.length > 0 || evs.some((e) => e.type === 'pvp_hit' && e.payload.target === OWNER), specialHits.length);
  const lunges = abil.filter((a) => a.kind === 'sworddash' && a.id === sw.id);
  check('6d the sword clone lunges at you through abilities.js (sworddash naming you)', lunges.length > 0 && lunges.every((a) => a.pid === OWNER), abil.slice(0, 3));
  check('6e its dash is drawn as a player\'s (player_dodge sworddash)', evs.some((e) => e.type === 'player_dodge' && e.payload.kind === 'sworddash' && e.from === sw.id));
  const dashHit = evs.find((e) => e.type === 'pvp_hit' && e.payload.attacker === sw.id && e.payload.ability === 'sworddash');
  check('6f the lunge lands as the worker\'s own (ability sworddash)', !!dashHit, null);
  check('6g ...and a landed lunge dazes you, as a player\'s does', !dashHit || !(dashHit.payload.dmgTaken > 0) || dashHit.payload.st === 'daze' || (O._dazeImmuneUntil > 0), dashHit && dashHit.payload);
  /* your special, seen: a hard clone answers it with its shield or a roll */
  for (const c of clonesOf()) room._sparStandBack(c, O, T, true);
  room.eventBuffer.length = 0;
  const uses2 = [];
  room._handleAbilityUse = function (sess, p) { uses2.push({ id: sess.id, type: p.type }); return realUse.call(this, sess, p); };
  const answers = [];
  for (let i = 0; i < 12; i++) {
    room._sparSeen(OWNER, { type: 'player_projectile', payload: { isStaff: true, isSpecial: true, big: true } });
    answers.push(...run(2500).filter((e) => (e.type === 'player_shield' && e.payload.up) || (e.type === 'player_dodge' && e.payload.kind === 'dodge')));
  }
  room._handleAbilityUse = realUse;
  check('6h a hard clone answers your special: its shield goes up (player_shield)', answers.some((e) => e.type === 'player_shield'), answers.length);
  check('6i ...or it rolls, the stamina paid at the worker (player_dodge)', answers.some((e) => e.type === 'player_dodge')
    && uses2.some((u) => u.type === 'dodge'), uses2.filter((u) => u.type === 'dodge').length);
}

/* ── 7. your blow, a clone's knockout and its return ── */
dressOwner();
room._sparDev(OWNER, { add: 'all' });
room._sparDev(OWNER, { skill: 'dummy' });
{
  const sw = cloneOf('sword');
  const ps = room.playerState[sw.id];
  const rounds0 = room._sparSummary(OWNER).rounds.you;
  ps.x = O.x + 30; ps.y = O.y;
  room.stateHistory[sw.id] = [];
  let hits = 0, piles = 0;
  const realPile = room._spawnDeathPile;
  room._spawnDeathPile = function (...a) { piles++; return realPile.apply(this, a); };
  WSO.sent.length = 0;
  for (let k = 0; k < 200 && !ps.dead; k++) {
    T += 700;
    room.eventBuffer.length = 0;
    room._resolvePvPAttack(sessO, { kind: 'melee', x: O.x, y: O.y, angle: 0, range: 50, arc: 2.6, sw: T, dmgBase: 10 });
    hits += room.eventBuffer.filter((e) => e.type === 'pvp_hit' && e.payload.target === sw.id && e.payload.dmgTaken > 0).length;
    ps.x = O.x + 30; ps.y = O.y;
  }
  room._spawnDeathPile = realPile;
  check('7a your swings land on a clone (pvp_hit)', hits > 0, hits);
  check('7b and knock it out', ps.dead && ps.dying, { hp: ps.hp });
  check('7c no pile, no wipe -- a clone has nothing', piles === 0, piles);
  const ko = room.eventBuffer.find((e) => e.type === 'player_died_to_monster' && e.from === sw.id);
  check('7d its knockout is drawn as a player\'s (player_died_to_monster)', !!ko, room.eventBuffer.map((e) => e.type));
  check('7e the round is yours', room._sparSummary(OWNER).rounds.you === rounds0 + 1);
  check('7f your phone is told (down)', stateMsgs(WSO).some((p) => p.note === 'down'));
  check('7g it is not sent to town', ps.z === 'wheel');
  room.eventBuffer.length = 0;
  const back = run(SPAR.RESPAWN_MS + 200);
  check('7h it stands up again after RESPAWN_MS', !ps.dead && !ps.dying && ps.hp === ps.maxHp, { dead: ps.dead, hp: ps.hp });
  check('7i ...drawn standing (player_respawned) and whole (player_update)', back.some((e) => e.type === 'player_respawned' && e.from === sw.id)
    && WSB.sent.some((m) => m.type === 'player_update' && m.id === sw.id && m.data.rpgHp === Math.round(ps.maxHp)));
  check('7j ...beside you', Math.hypot(ps.x - O.x, ps.y - O.y) <= SPAR.RING_R + 1);
  /* the respawn tick of the room never touches a clone; the spar's own does */
  ps.hp = 0; ps.dead = false; ps.dying = false;
  room._tickPlayerRespawn();
  check('7k the room\'s respawn and stuck-at-zero sweeps leave a clone alone (never to town)', ps.z === 'wheel' && !ps.dying, { z: ps.z, dying: ps.dying });
  run(50);
  check('7l ...and the spar takes a clone at nothing down itself', ps.dead === true && ps.dying === true, { dead: ps.dead });
}

/* ── 8. a knockout by your own clone is not a death ── */
dressOwner();
room._sparDev(OWNER, { add: 'all' });
room._sparDev(OWNER, { skill: 'hard' });
{
  const sw = cloneOf('sword');
  const swp = room.playerState[sw.id];
  const rounds0 = room._sparSummary(OWNER).rounds.clones;
  O.hp = 1;
  swp.x = O.x + 30; swp.y = O.y;
  let piles = 0;
  const realPile = room._spawnDeathPile;
  room._spawnDeathPile = function (...a) { piles++; return realPile.apply(this, a); };
  WSO.sent.length = 0;
  room.eventBuffer.length = 0;
  room._pvpHitLanes = new Map();
  /* the clone's own swing, as its AI throws it */
  snapOwner();
  const landed = room._sparClaim(sw, swp, { kind: 'melee', x: swp.x, y: swp.y, angle: Math.PI, dmgBase: 50, critChance: 0, range: 50, arc: 2.6, sw: T });
  room._spawnDeathPile = realPile;
  check('8a the clone\'s swing lands (guard)', landed, room.eventBuffer.map((e) => e.type));
  check('8b you are not dying, not dead', !O.dying && !O.dead, { dying: O.dying, dead: O.dead });
  check('8c healed where you stand', O.hp === O.maxHp && O.z === 'wheel', { hp: O.hp });
  check('8d no death message', !WSO.sent.some((m) => m.type === 'player_died'));
  check('8e no pile, your bag and gold untouched', piles === 0 && O.inventory.fish_minnow === 3 && O.coins === 777, { piles, inv: O.inventory });
  check('8f the round is the clones\'', room._sparSummary(OWNER).rounds.clones === rounds0 + 1);
  check('8g your phone is told (ko, by whom)', stateMsgs(WSO).some((p) => p.note === 'ko' && p.who === 'Sword Clone'));
  await new Promise((r) => setTimeout(r, 5));
  const rec = st._store.get('rpg:' + OWNER);
  check('8h saved healed (a restart cannot bring the knockout back)', !!rec && rec.hp === O.maxHp, rec && rec.hp);
  check('8i the clones step back and stand off a moment', clonesOf().every((c) => Math.abs(Math.hypot(room.playerState[c.id].x - O.x, room.playerState[c.id].y - O.y) - SPAR.RING_R) < 1));
  room.eventBuffer.length = 0;
  const pause = run(SPAR.PAUSE_MS - 300);
  check('8j ...no blow for SPAR.PAUSE_MS', !pause.some((e) => e.type === 'pvp_hit'), pause.filter((e) => e.type === 'pvp_hit').length);
  /* a monster's knockout is still a death */
  dressOwner();
  O.hp = 0;
  room._handlePlayerDeath(O, OWNER, 'monster:m_x');
  check('8k a monster still kills you (the game\'s own death)', O.dying === true);
  O.dying = false; O.dead = false; O.respawnAt = 0;
  dressOwner();
  /* a clone that is not YOURS is no knockout of yours (cannot happen: no
     other clone may hit you -- the hook is that strict anyway) */
  check('8l only your own clone\'s blow is a knockout', room._sparDeath(O, OWNER, 'pvp:spar_nobody') === false);
}

/* ── 9. nothing of a clone is stored ── */
{
  await new Promise((r) => setTimeout(r, 5));
  room._tickPlayerRegen();
  for (const c of clonesOf()) room._saveRpg(c.id, room.playerState[c.id]);
  await new Promise((r) => setTimeout(r, 5));
  const cloneIds = clonesOf().map((c) => c.id);
  const keys = [...st._store.keys()].filter((k) => cloneIds.some((id) => k.indexOf(id) >= 0) || /:spar_/.test(k));
  check('9a no record of a clone in storage', keys.length === 0, keys);
}

/* ── 10. a hit's shove and slow are carried out on a clone ── */
{
  const c = cloneOf('bow');
  const ps = room.playerState[c.id];
  const x0 = ps.x;
  room.eventBuffer.length = 0;
  room.eventBuffer.push({ type: 'pvp_hit', payload: { attacker: OWNER, target: c.id, dmgTaken: 1, kb: [90, 0], st: 'slow', stMs: 2000, mult: 0.4 } });
  room._sparTakeHits(T);
  check('10a a bash\'s shove moves it', Math.abs(ps.x - (x0 + 90)) < 0.01, ps.x - x0);
  check('10b a slow slows it', c.slowUntil > T && Math.abs(c.slowK - 0.4) < 1e-9, { u: c.slowUntil, k: c.slowK });
  room._sparTakeHits(T);
  check('10c each hit once', Math.abs(ps.x - (x0 + 90)) < 0.01);
  room.eventBuffer.length = 0;
  room.eventBuffer.push({ type: 'pvp_hit', payload: { attacker: OWNER, target: c.id, dmgTaken: 1, kb: [5000, 0] } });
  const x1 = ps.x;
  room._sparTakeHits(T);
  check('10d a shove is held to SPAR.SHOVE_MAX', Math.abs(ps.x - x1 - SPAR.SHOVE_MAX) < 0.01, ps.x - x1);
  room.eventBuffer.length = 0;
}

/* ── 14. v2.3.3267: Easy is a beginner ── */
dressOwner();
room._sparDev(OWNER, { add: 'all' });
room._sparDev(OWNER, { skill: 'easy' });
{
  const E = SPAR_SKILLS.easy;
  check('14a Easy\'s table: no special, no lunge, a longer wait between attacks, half the focus', E.special === null && E.dashAt === null
    && E.gapMs >= 600 && E.focus <= 0.5 && !E.lunge && !E.sprint, E);
  O.maxHp = 100000; O.hp = 100000;   /* a long fight with no knockout in it */
  for (const c of clonesOf()) room._sparStandBack(c, O, T, true);
  const uses = [];
  const realUse = room._handleAbilityUse;
  room._handleAbilityUse = function (sess, p) { uses.push({ id: sess.id, type: p.type }); return realUse.call(this, sess, p); };
  const abil = [];
  const realAb = room._handleAbility;
  room._handleAbility = function (sess, p) { abil.push({ id: sess.id, kind: p.kind }); return realAb.call(this, sess, p); };
  /* the sword clone where Normal and Hard would lunge (6d) */
  const sw = cloneOf('sword');
  room.playerState[sw.id].x = O.x + 120; room.playerState[sw.id].y = O.y;
  const evs = run(40000);
  room._handleAbilityUse = realUse; room._handleAbility = realAb;
  const ids = clonesOf().map((c) => c.id);
  const hits = evs.filter((e) => e.type === 'pvp_hit' && e.payload.target === OWNER && ids.includes(e.payload.attacker));
  check('14b Easy still fights: its blows arrive, from every weapon', hits.length > 0
    && ['sword', 'bow', 'staff'].every((w) => hits.some((e) => e.payload.attacker === cloneOf(w).id)), { hits: hits.length });
  const specials = evs.filter((e) => ids.includes(e.from) && ((e.type === 'player_projectile' && e.payload.isSpecial) || (e.type === 'player_swing' && e.payload.special)));
  check('14c ...and throws no special: no swipe paid, no special shot or swing', !uses.some((u) => u.type === 'swipe' && ids.includes(u.id)) && specials.length === 0,
    { swipes: uses.filter((u) => u.type === 'swipe').length, specials: specials.length });
  check('14d ...and never lunges', !abil.some((a) => a.kind === 'sworddash' && ids.includes(a.id))
    && !evs.some((e) => e.type === 'player_dodge' && e.payload.kind === 'sworddash' && ids.includes(e.from)), abil.slice(0, 3));
  /* each attack at least the weapon's cooldown + gapMs after the one before
     (spar.js G: a swing 600, a shot 495, a bolt 900), less a tick */
  const gapsOf = (w, type) => {
    const t = evs.filter((e) => e.type === type && e.from === cloneOf(w).id).map((e) => e.payload.ts);
    return t.slice(1).map((x, i) => x - t[i]);
  };
  const minGap = (g) => (g.length ? Math.min(...g) : Infinity);
  const gS = gapsOf('sword', 'player_swing'), gB = gapsOf('bow', 'player_projectile'), gT = gapsOf('staff', 'player_projectile');
  check('14e ...a swing at least 1,200 ms after the last (600 + 600)', gS.length > 0 && minGap(gS) >= 600 + E.gapMs - 22, { n: gS.length, min: minGap(gS) });
  check('14f ...an arrow 1,095 ms (495 + 600), a bolt 1,500 (900 + 600)', gB.length > 0 && gT.length > 0
    && minGap(gB) >= 495 + E.gapMs - 22 && minGap(gT) >= 900 + E.gapMs - 22, { bow: minGap(gB), staff: minGap(gT) });
  /* the gap check means something: a Normal sword swings sooner than that */
  room._sparDev(OWNER, { skill: 'normal' });
  for (const c of clonesOf()) room._sparStandBack(c, O, T, true);
  const evN = run(20000);
  const tN = evN.filter((e) => e.type === 'player_swing' && e.from === cloneOf('sword').id && !e.payload.special).map((e) => e.payload.ts);
  const gN = tN.slice(1).map((x, i) => x - tN[i]);
  check('14g (contrast) a Normal sword swings sooner than Easy may (a gap under 1,200 ms)', gN.length > 0 && minGap(gN) < 600 + E.gapMs - 22, { n: gN.length, min: minGap(gN) });
  room._sparDev(OWNER, { skill: 'dummy' });
}

/* ── 15. v2.3.3267: the page's half (src/game/sparTargets.js, pvpSwing.js) ── */
{
  const S = {
    currentZone: 'wheel', player: { x: 0, y: 0 },
    _spar: { ids: new Set(['c1', 'c2', 'c3', 'c4']) },
    others: {
      c1: { x: 100, y: 0, zone: 'wheel' },
      c2: { x: 0, y: 300, zone: 'wheel', renderX: 0, renderY: 310 },
      c3: { x: 50, y: 0, zone: 'wheel', _isDead: true },
      c4: { x: 60, y: 0, zone: 'frost' },
      p9: { x: 10, y: 0, zone: 'wheel' },
    },
  };
  check('15a a live clone of yours in your zone is one; down, elsewhere, parked or not yours is not',
    isLiveClone(S, 'c1') && isLiveClone(S, 'c2') && !isLiveClone(S, 'c3') && !isLiveClone(S, 'c4') && !isLiveClone(S, 'p9')
      && !isLiveClone({ ...S, others: { ...S.others, c1: { ...S.others.c1, _away: true } } }, 'c1') && !isLiveClone({}, 'c1'));
  const n220 = clonesNear(S, 220), n400 = clonesNear(S, 400);
  check('15b clones near you, nearest first, in the candidates\' shape (where each is drawn)', n220.length === 1 && n220[0].id === 'c1'
    && n400.map((c) => c.id).join() === 'c1,c2' && n400.every((c) => c.spar && c.m === S.others[c.id]) && n400[1].y === 310 && n400[1].d2 === 310 * 310,
    n400.map((c) => [c.id, c.d2]));
  check('15c a shot tries the lock first, then every clone, once each', shotPlayerTargets(S, 'p9').join() === 'p9,c1,c2'
    && shotPlayerTargets(S, 'c1').join() === 'c1,c2' && shotPlayerTargets(S, null).join() === 'c1,c2' && shotPlayerTargets({}, 'p9').join() === 'p9');
  const east = fightersInSwing(S, 0, 0, 0, 90, Math.PI * 0.85, 24);
  check('15d a swing reaches the clones in its arc and reach (+ a stride), with the bearing to each', east.length === 1 && east[0].id === 'c1' && east[0].ang === 0
    && fightersInSwing(S, 0, 0, Math.PI, 90, Math.PI * 0.85, 24).length === 0 && fightersInSwing(S, 0, 0, 0, 50, Math.PI * 0.85, 24).length === 0
    && fightersInSwing(S, 0, 0, Math.PI / 2, 400, Math.PI * 0.85, 0).map((c) => c.id).join() === 'c2', east);
  check('15e a fight is on while a clone is within FIGHT_R (about a screen)', FIGHT_R >= 600 && fightOn(S)
    && !fightOn({ ...S, player: { x: 5000, y: 5000 } }) && !fightOn({ ...S, _spar: null }));
  /* a swing's claims: its own count per clone named (the worker lands one hit
     a swing on each), the swing's single count without a name, as before */
  const Q = { _serverCaps: { pvpbalance: true, oneformula: true } };
  const t0 = 1000;
  const a = [pvpSwingClaimOk(Q, 7, t0, true, 'c1'), pvpSwingClaimOk(Q, 7, t0 + 10, true, 'c1'), pvpSwingClaimOk(Q, 7, t0 + 95, true, 'c1'),
    pvpSwingClaimOk(Q, 7, t0 + 190, true, 'c1'), pvpSwingClaimOk(Q, 7, t0 + 290, true, 'c1')];
  const b = pvpSwingClaimOk(Q, 7, t0 + 10, true, 'c2');
  const u = pvpSwingClaimOk(Q, 7, t0 + 10, true);
  const next = pvpSwingClaimOk(Q, 8, t0 + 400, true, 'c1');
  check('15f a swing claims each clone at most ' + PVP_SWING.TRIES + ' times, ' + PVP_SWING.GAP_MS + ' ms apart, on its own count',
    a.join() === 'true,false,true,true,false' && b === true && u === true && next === true, { a, b, u, next });
  check('15g ...an older worker: every frame, as before', pvpSwingClaimOk({}, 7, t0, true, 'c1') && pvpSwingClaimOk({}, 7, t0, true, 'c1'));
}

/* ── 16. v2.3.3268: a player you chose to attack (src/game/sparTargets.js) ── */
{
  /* No man's land's rule is handed in by noMansLand.js; here a stand-in: who
     you may fight is the set `may` */
  const may = new Set(['p1', 'p2', 'p3']);
  setFoeRule((S0, id) => may.has(String(id)));
  const mk = () => ({
    myId: 'me', currentZone: 'wheel', player: { x: 0, y: 0 },
    _spar: { ids: new Set(['c1']) },
    others: {
      c1: { x: 400, y: 0, zone: 'wheel' },
      p1: { x: 60, y: 0, zone: 'wheel' },      /* in front, in a swing's reach */
      p2: { x: 0, y: 60, zone: 'wheel' },      /* beside you, never chosen */
      p3: { x: -300, y: 0, zone: 'wheel' },
    },
  });
  const S = mk();
  const swing = (S0, ang) => fightersInSwing(S0, 0, 0, ang, 90, Math.PI * 0.85, 24).map((c) => c.id).join();
  check('16a nobody you have not chosen is a target: a shot tries only the lock and your clones, a swing passes them by',
    shotPlayerTargets(S, null).join() === 'c1' && swing(S, 0) === '' && !isLiveFoe(S, 'p1') && !isLiveFighter(S, 'p2'));
  chooseFoe(S, 'p1');
  check('16b chosen (the window\'s Attack), a player is hit whatever is locked: in a shot\'s list and in a swing\'s arc, by its bearing',
    isLiveFoe(S, 'p1') && isLiveFighter(S, 'p1') && shotPlayerTargets(S, null).join() === 'c1,p1' && swing(S, 0) === 'p1'
      && !shotPlayerTargets(S, null).includes('p2'), { shot: shotPlayerTargets(S, null), swing: swing(S, 0) });
  check('16c ...and only them: a second player beside you, never chosen, is still nobody\'s target', !isLiveFighter(S, 'p2')
    && swing(S, Math.PI / 2) === '');
  S.others.p1._isDead = true;
  const down = !isLiveFoe(S, 'p1');
  S.others.p1._isDead = false;
  check('16d down, a foe is no target -- and still chosen while the rule lets you fight them', down && isLiveFoe(S, 'p1'));
  may.delete('p1');
  const lapsed = !isLiveFoe(S, 'p1') && !(S._nmlFoes && S._nmlFoes.has('p1'));
  may.add('p1');
  check('16e when the rule no longer lets you fight them, the choice lapses -- back in reach, a new choice is needed', lapsed && !isLiveFoe(S, 'p1'));
  chooseFoe(S, 'p1');
  delete S.others.p1;
  const gone = !isLiveFoe(S, 'p1') && !(S._nmlFoes && S._nmlFoes.has('p1'));
  S.others.p1 = { x: 60, y: 0, zone: 'wheel' };
  check('16f ...and when they leave (no longer drawn), the same', gone && liveFoes(S).length === 0);
  /* the fight's clock: a quiet minute ends the choice, a blow either way
     keeps it, your own lock on them keeps it, the sword's automatic one not */
  const T0 = 5_000_000;
  {
    const A = mk();
    chooseFoe(A, 'p1', T0);
    const at59 = isLiveFoe(A, 'p1', T0 + FIGHT_QUIET_MS - 1000);
    const at61 = isLiveFoe(A, 'p1', T0 + FIGHT_QUIET_MS + 1000);
    check('16g a minute (FIGHT_QUIET_MS) with no blow between you and the choice lapses -- a stray shot much later is no choice of yours',
      FIGHT_QUIET_MS === 60000 && at59 && !at61 && !A._nmlFoes.has('p1'), { at59, at61 });
    const B = mk();
    chooseFoe(B, 'p1', T0);
    notePvpBlow(B, { attacker: 'p1', target: 'me' }, T0 + 50000);
    const kept = isLiveFoe(B, 'p1', T0 + 100000);
    notePvpBlow(B, { attacker: 'me', target: 'p1' }, T0 + 100000);
    const kept2 = isLiveFoe(B, 'p1', T0 + 150000);
    const ends = isLiveFoe(B, 'p1', T0 + 161000);
    check('16h ...a blow either way (theirs on you, yours on them) keeps the fight, and the choice, on for a minute past it',
      kept && kept2 && !ends, { kept, kept2, ends });
    const C = mk();
    chooseFoe(C, 'p1', T0);
    C.lockedTarget = { type: 'player', id: 'p1', ref: C.others.p1, nml: true };
    const aimed = isLiveFoe(C, 'p1', T0 + 200000) && isLiveFoe(C, 'p1', T0 + 300000);
    const D = mk();
    chooseFoe(D, 'p1', T0);
    D.lockedTarget = { type: 'player', id: 'p1', ref: D.others.p1, nml: true, src: 'auto' };
    const autoKeeps = isLiveFoe(D, 'p1', T0 + 200000);
    check('16i ...your own lock on them (the window\'s Attack aims) keeps the choice; the sword\'s automatic lock does not -- it holds a foe only while the choice does',
      aimed && !autoKeeps, { aimed, autoKeeps });
  }
  {
    const E = mk();
    const mine = notePvpBlow(E, { attacker: 'p3', target: 'me' }, T0) && notePvpBlow(E, { attacker: 'me', target: 'p2' }, T0);
    const notMine = !notePvpBlow(E, { attacker: 'p1', target: 'p2' }, T0) && !notePvpBlow(E, { attacker: 'me', target: 'me' }, T0)
      && !notePvpBlow(E, null, T0) && !notePvpBlow({}, { attacker: 'p1', target: 'me' }, T0);
    check('16j a blow is noted only between you and another player, either way (pvp_hit), by their id',
      mine && notMine && E._pvpBlows instanceof Map && [...E._pvpBlows.keys()].sort().join() === 'p2,p3', [...(E._pvpBlows || new Map()).keys()]);
    for (let i = 0; i < 40; i++) notePvpBlow(E, { attacker: 'q' + i, target: 'me' }, T0);
    check('16j2 ...kept short (at most 32)', E._pvpBlows.size <= 32, E._pvpBlows.size);
  }
  {
    /* the one who attacked you: not a target until you choose, but a fight */
    const F = mk();
    F._spar = null;
    notePvpBlow(F, { attacker: 'p3', target: 'me' }, T0);
    const now = fightingNow(F, T0 + 1000).map((c) => c.id).join();
    check('16k a player who hit you is a fight (fightingNow) -- not a target of yours until you choose (v2.3.3528: the window\'s Attack, as for anyone)',
      now === 'p3' && !isLiveFighter(F, 'p3') && !shotPlayerTargets(F, null).includes('p3') && swing(F, Math.PI) === '', now);
    const later = fightingNow(F, T0 + FIGHT_QUIET_MS + 1000).length;
    notePvpBlow(F, { attacker: 'p3', target: 'me' }, T0);
    may.delete('p3');
    const ruled = fightingNow(F, T0 + 1000).length;
    may.add('p3');
    F.others.p3._isDead = true;
    const dead = fightingNow(F, T0 + 1000).length;
    F.others.p3._isDead = false;
    check('16l ...no longer after a quiet minute, nor while the rule does not let you fight them, nor while they are down',
      later === 0 && ruled === 0 && dead === 0, { later, ruled, dead });
  }
  {
    const G = mk();
    chooseFoe(G, 'p1');
    notePvpBlow(G, { attacker: 'p3', target: 'me' });
    const near = fightersNear(G, FIGHT_R);
    check('16m the fight round you, nearest first: your foe, the one who hit you, your clone, each marked',
      near.map((c) => c.id).join() === 'p1,p3,c1' && near[0].foe && near[1].fight && near[2].spar, near.map((c) => [c.id, Math.round(Math.sqrt(c.d2))]));
    const picks = chosenNear(G, 500).map((c) => c.id).join();
    check('16n the sword\'s automatic target picks from your clones and foes, never from a player you have not chosen',
      picks === 'p1,c1' && chosenNear(G, 220).map((c) => c.id).join() === 'p1', picks);
    check('16o a fight with a player is on (the shield and Special buttons) while they are within FIGHT_R, not beyond',
      fightOn({ ...mk(), _spar: null, _pvpBlows: new Map([['p3', Date.now()]]) })
        && !fightOn({ ...mk(), _spar: null, _pvpBlows: new Map([['p3', Date.now()]]), player: { x: 5000, y: 0 } })
        && !fightOn({ ...mk(), _spar: null }));
  }
  const noRule = (() => {
    const H = mk();
    chooseFoe(H, 'p1');
    notePvpBlow(H, { attacker: 'p3', target: 'me' });
    setFoeRule(null);
    const r = isLiveFoe(H, 'p1') || fightingNow(H).length > 0;
    setFoeRule((S0, id) => may.has(String(id)));
    return r;
  })();
  check('16p with no rule handed in (no No man\'s land), no player is ever a foe or a fight', noRule === false);
  /* v2.3.3528: the BOUT -- the first blow either way after a quiet
     FIGHT_QUIET_MS; No man's land's window asks again about one who attacks
     you in a bout that began after your last answer (nmlAsk.js
     nmlAttackedSince) */
  {
    const T1 = 9_000_000;
    const B1 = mk();
    const none = pvpBoutAt(B1, 'p3');
    notePvpBlow(B1, { attacker: 'p3', target: 'me' }, T1);
    const first = pvpBoutAt(B1, 'p3');
    notePvpBlow(B1, { attacker: 'me', target: 'p3' }, T1 + 30000);
    notePvpBlow(B1, { attacker: 'p3', target: 'me' }, T1 + 80000);
    const same = pvpBoutAt(B1, 'p3');
    notePvpBlow(B1, { attacker: 'p3', target: 'me' }, T1 + 80000 + FIGHT_QUIET_MS);
    const fresh = pvpBoutAt(B1, 'p3');
    check('16q a bout begins with the first blow either way, goes on while blows come within FIGHT_QUIET_MS of each other, and a blow after a quiet minute begins a new one',
      none === 0 && first === T1 && same === T1 && fresh === T1 + 80000 + FIGHT_QUIET_MS && pvpBoutAt(B1, 'p1') === 0,
      { none, first, same, fresh });
    for (let i = 0; i < 40; i++) notePvpBlow(B1, { attacker: 'b' + i, target: 'me' }, T1);
    check('16q2 ...kept short (at most 32), and never for a blow that is not yours', B1._pvpBouts.size <= 32
      && !notePvpBlow(B1, { attacker: 'p1', target: 'p2' }, T1) && pvpBoutAt(B1, 'p2') === 0, B1._pvpBouts.size);
  }
  /* v2.3.3530: WHO STRUCK YOU -- a group that attacks you joins a fight you
     chose with no window of its own (nmlAsk.js nmlJoinFight reads these) */
  {
    const T2 = 20_000_000;
    const G = mk();
    notePvpBlow(G, { attacker: 'p1', target: 'me' }, T2);          /* p1 strikes you */
    notePvpBlow(G, { attacker: 'me', target: 'p2' }, T2 + 10);     /* you strike p2: not an attacker of yours */
    notePvpBlow(G, { attacker: 'p3', target: 'me' }, T2 + 20);     /* p3 strikes you */
    check('16r only blows ON you name your attackers, with when (hitMeAt)', hitMeAt(G, 'p1') === T2 && hitMeAt(G, 'p3') === T2 + 20
      && hitMeAt(G, 'p2') === 0, { p1: hitMeAt(G, 'p1'), p2: hitMeAt(G, 'p2'), p3: hitMeAt(G, 'p3') });
    const now = attackersNow(G, T2 + 30);
    check('16r2 the ones attacking you now, the most recent first', JSON.stringify(now) === JSON.stringify(['p3', 'p1']), now);
    const later = attackersNow(G, T2 + FIGHT_QUIET_MS + 5);
    check('16r3 ...a blow FIGHT_QUIET_MS old is no attack now (and is let go)', JSON.stringify(later) === JSON.stringify(['p3'])
      && hitMeAt(G, 'p1') === 0, { later, p1: hitMeAt(G, 'p1') });
    for (let i = 0; i < 40; i++) notePvpBlow(G, { attacker: 'm' + i, target: 'me' }, T2 + 100 + i);
    check('16r4 ...kept short (at most 32), never a blow between two others', G._pvpHitBy.size <= 32
      && !notePvpBlow(G, { attacker: 'p5', target: 'p6' }, T2) && hitMeAt(G, 'p5') === 0 && hitMeAt(G, 'p6') === 0, G._pvpHitBy.size);
  }
  setFoeRule(null);
}

/* ── 12. a joining phone is told of the clones ── */
{
  const data = room.getAllPlayerData();
  const c = cloneOf('staff');
  const d = data[c.id];
  check('12a the snapshot carries each clone', !!d && d.name === 'Staff Clone' && d.wpnType === 'staff', d);
  check('12b ...where it stands now', !!d && d.x === room.playerState[c.id].x && d.y === room.playerState[c.id].y);
}

/* ── 11. leaving the Wheel, leaving the game, the kill switch ── */
{
  WSB.sent.length = 0;
  WSO.sent.length = 0;
  O.z = 'farm_home';
  run(50);
  check('11a leaving the Wheel takes every clone away', clonesOf().length === 0);
  check('11b ...every phone is told (player_leave)', WSB.sent.filter((m) => m.type === 'player_leave').length === 3);
  check('11c ...and yours why (left)', stateMsgs(WSO).some((p) => p.note === 'left'));
  dressOwner();
  room._sparDev(OWNER, { add: 'sword' });
  check('11d (guard) a clone out', clonesOf().length === 1);
  /* a spar is no fight to linger for */
  const sess = room.sessions.get(WSO);
  check('11e no linger for a spar', room._lingerOnClose(sess, T) === false);
  /* the switch */
  room._liveFlags = { spar: false };
  const refused = room._sparDev(OWNER, { add: 'bow' });
  check('11f the switch refuses the lever', !refused.ok, refused);
  run(50);
  check('11g ...and takes every live clone away on the next tick', clonesOf().length === 0);
  check('11h ...saying so (off)', stateMsgs(WSO).some((p) => p.note === 'off'));
  room._liveFlags = {};
  room._sparDev(OWNER, { add: 'staff' });
  await room.webSocketClose(WSO);
  check('11i leaving the game takes them with you', clonesOf().length === 0 && !(room._spars && room._spars.has(OWNER)));
  check('11j ...and leaves no body to linger', !room.playerState[OWNER] || !room.playerState[OWNER].lingering);
}

/* ── 13. mutations: each guard, broken, fails a check above ── */
{
  /* a: without the pair rule a bystander may hit a clone (3c) */
  dressOwner();
  await join(WSO, OWNER);
  clearInterval(room.tickInterval); room.tickInterval = null;
  const O2 = room.playerState[OWNER];
  Object.assign(O2, { z: 'wheel', x: CX, y: CY, hp: O2.maxHp || 100, dead: false, dying: false });
  const r13 = room._sparDev(OWNER, { add: 'sword' });
  check('13 (guard) a clone out again after you came back', r13.ok, r13);
  const c = cloneOf('sword');
  const realPair = room._sparPair;
  room._sparPair = () => false;
  const flags0 = room.OPEN_PVP;
  room.OPEN_PVP = true;
  const leak = room._pvpAllowed(OWNER, c.id, 'wheel');
  room._sparPair = realPair; room.OPEN_PVP = flags0;
  check('13a mutation: no pair rule -> you could not even hit your clone (3a fails)', leak === false);
  /* b: without the death hook a clone's knockout is a real death to town */
  const realDeath = room._sparDeath;
  room._sparDeath = () => false;
  const cps = room.playerState[c.id];
  cps.hp = 0;
  room._handlePlayerDeath(cps, c.id, 'pvp:' + OWNER);
  const wentReal = cps.dying === true && cps.respawnAt > 0;
  room._sparDeath = realDeath;
  check('13b mutation: no death hook -> the game\'s own death runs on a clone (7c/7g would fail)', wentReal);
  /* c: without the monsters' guard a clone is chased: the very setup of 4d,
     with the clone's mark hidden from _tickMonsters for one pass */
  {
    const wheel = room._ensureZoneMonsters('wheel');
    const m = wheel.find((q) => q.home === 'ember');
    const cps2 = room.playerState[c.id];
    cps2.dead = false; cps2.dying = false; cps2.hp = cps2.maxHp || 100;
    O2.x = m.x + 3000; O2.y = m.y;
    B.x = m.x + 2600; B.y = m.y + 2600;
    cps2.x = m.x + 100; cps2.y = m.y;
    m._bwUntil = 0; m._bwTarget = null; m._attackingUntil = 0; m.atkCd = 0; m.targetId = null; m._aggroOverrideTarget = null; m._aggroOverrideUntil = 0;
    const mark = cps2._spar;
    delete cps2._spar;
    room._tickMonsters();
    cps2._spar = mark;
    check('13c mutation: no monsters\' guard -> the monster chases the clone (4d would fail)', m.targetId === c.id, m.targetId);
  }
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
