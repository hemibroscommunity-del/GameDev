/* A WORLD MONSTER'S LIFE ENDS WITH IT -- v2.3.4403 (the state-machine sweep's
 * V7: server/src/index.js the respawn reset, telegraph.js
 * _resolveMonsterTelegraph, combat.js _resolveMonsterKill; the phone's
 * src/game/monsterCarry.js endSwell and src/data/monsterVariants.js
 * isIntangible).
 *
 * A Wheel monster dies and comes back as the same object with the same id,
 * so whatever it was doing when it died rides into its next life unless
 * something ends it.  The new players' first quest is blue slimes.
 *   1. A BALL in the air when its thrower dies does not land on the first
 *      tick of the next life (it hit, about 19 s late, nothing drawn).
 *   2. The KNOCK-BACK DEBT does not glide the new life back.
 *   3. A blue slime killed during its LUNGE's wind-up swells and goes off,
 *      but the corpse does not lunge; nor does the Goo Grotto's giant through
 *      a split mark's swell.  A live slime's lunge still lands (control).
 *   4. THE LIFESTEAL LEDGER: a kill ends every player's entry for that
 *      monster, so a sword kill of its NEXT life pays back nothing it never
 *      dealt; the killer's own melee refund still pays (control).
 *   5. THE PHONE: a copy that came back from the dead holds no swell
 *      (the tick's respawn edge calls endSwell), and isIntangible reads the
 *      clock, so a swell whose blast the phone never heard ends by itself.
 *      (The re-push carry's case is slime-boss.test section 8.)
 * No kill switch: each is a leftover ended inside a rule that already exists
 * (the respawn list, the move resolver's guard, the spec's "a monster that
 * never hit you heals nothing"), not a new rule. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
import { TELEGRAPH } from '../src/telegraph.js';
import * as carry from '../../src/game/monsterCarry.js';
import * as variants from '../../src/data/monsterVariants.js';

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

/* every blow a sure one (the dodge roll) */
Math.random = () => 0.999;

const room = new GameRoom(mockState, mockEnv);
for (const id of ['p1', 'p2']) {
  const ws = fakeWs(id);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  await room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288, z: WHEEL_ZONE }));
}
const P = (id) => room.playerState[id];
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
const slime = wheel.find((m) => room._burstsOnDeath(m) && m.arch === 'fodder'
  && Object.prototype.hasOwnProperty.call(room.MONSTER_RANGED_BY_ARCH, m.arch));
const other = wheel.find((m) => !room._burstsOnDeath(m) && m !== slime);
check('0: the Wheel fields a blue slime that throws and lunges, and a monster that does not burst (guard)',
  !!slime && room._kitFor(slime) === TELEGRAPH.KITS.fodder && !!other, slime && { arch: slime.arch, variant: slime.variant });

function alongSpoke(m, r) {
  const ux = m.spawnX - WHEEL_CENTRE[0], uy = m.spawnY - WHEEL_CENTRE[1], ul = Math.hypot(ux, uy);
  return { x: WHEEL_CENTRE[0] + (ux / ul) * r, y: WHEEL_CENTRE[1] + (uy / ul) * r };
}
/* the monster out on its spoke, its spawn where it stands; p1 `off` px further out */
function stage(m, off) {
  const at = alongSpoke(m, Math.max(WHEEL_SAFE_R + 600, Math.hypot(m.spawnX - WHEEL_CENTRE[0], m.spawnY - WHEEL_CENTRE[1])));
  Object.assign(m, { x: at.x, y: at.y, alive: true, hp: m.maxHp, atkCd: 0, _attackingUntil: 0, respawnAt: 0,
    _tgPhase: null, _tgUntil: 0, _tgAim: null, _tgTarget: null, _tgNextAt: 0, _tgRadius: 0, statuses: Object.create(null),
    _burstUntil: 0, _burstKiller: null, _burstSlot: null, _burstDone: false, _burstHitKiller: false,
    _bwUntil: 0, _projImpactAt: 0, _kbDebt: 0, _split: undefined, targetId: null, dmgByPlayer: Object.create(null) });
  const pa = alongSpoke(m, Math.hypot(at.x - WHEEL_CENTRE[0], at.y - WHEEL_CENTRE[1]) + off);
  for (const id of ['p1', 'p2']) {
    const ps = P(id);
    Object.assign(ps, { z: WHEEL_ZONE, x: pa.x, y: pa.y + (id === 'p2' ? 2000 : 0), dead: false, dying: false, disconnected: false,
      blocking: false, ba: null, _zoneEntryGraceUntil: 0, _godUntil: 0 });
    ps.maxHp = 5000; ps.hp = 5000;
  }
  room.eventBuffer.length = 0;
}
const hitsOn = (m, id) => room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.targetId === id
  && (e.payload.monsterId === undefined || e.payload.monsterId === m.id));

/* ── 1. a ball thrown in one life does not land in the next ── */
{
  stage(slime, 900);   /* far from its spawn: nothing of the NEW life reaches p1 */
  const now = Date.now();
  /* thrown at p1 just before it died (telegraph.js _resolveBasicWindup's
     throw); its landing time long past when it comes back 18.75 s later */
  Object.assign(slime, { _projImpactAt: now - 18000, _projTargetId: 'p1', _projTx: P('p1').x, _projTy: P('p1').y,
    _projFromX: P('p1').x - 10, _projFromY: P('p1').y });
  slime.alive = false; slime.hp = 0; slime.respawnAt = now - 1;
  room._tickMonsters();                       /* the respawn */
  const back = slime.alive === true;
  room._tickMonsters();                       /* the new life's first tick */
  check('1: the slime came back (guard)', back);
  check('1: the ball thrown in its last life is gone from its new one', !slime._projImpactAt && slime._projTargetId == null,
    { at: slime._projImpactAt, tg: slime._projTargetId });
  check('1: ...and never lands: p1, standing on the old aim point, is not hit', P('p1').hp === 5000 && hitsOn(slime, 'p1').length === 0,
    { hp: P('p1').hp, hits: hitsOn(slime, 'p1').length });
}

/* ── 2. the knock-back debt does not cross a life ── */
{
  stage(slime, 900);
  slime._kbDebt = 55;
  slime.alive = false; slime.hp = 0; slime.respawnAt = Date.now() - 1;
  room._tickMonsters();
  check('2: a respawned monster owes no knock-back from its last life', slime.alive === true && !slime._kbDebt, { kb: slime._kbDebt });
}

/* ── 3. a corpse does not lunge ── */
{
  /* control: a live slime's lunge lands */
  stage(slime, 60);
  const t0 = Date.now();
  const started = room._maybeStartTelegraph(WHEEL_ZONE, slime, { id: 'p1', extracting: false }, 60, t0);
  check('3: a blue slime in reach winds up its lunge (guard)', started && slime._tgPhase === 'telegraph', slime._tgPhase);
  slime._tgUntil = Date.now() - 1;
  room._resolveMonsterTelegraph(WHEEL_ZONE, slime, Date.now());
  check('3: control: a live slime\'s lunge lands', P('p1').hp < 5000, { hp: P('p1').hp });

  /* killed during the wind-up: it swells, and the wind-up runs out inside the swell */
  stage(slime, 60);
  room._maybeStartTelegraph(WHEEL_ZONE, slime, { id: 'p1', extracting: false }, 60, Date.now());
  slime.hp = 0;
  room._resolveMonsterKill(WHEEL_ZONE, slime, 'p2', P('p2'), 'melee');
  check('3: killed mid-wind-up, it swells (guard)', slime.alive && slime._burstUntil > Date.now(), { alive: slime.alive, bu: slime._burstUntil });
  slime._tgUntil = Date.now() - 1;
  room.eventBuffer.length = 0;
  const owned = room._resolveMonsterTelegraph(WHEEL_ZONE, slime, Date.now());
  check('3: ...and the swelling corpse does not lunge', P('p1').hp === 5000 && hitsOn(slime, 'p1').length === 0,
    { hp: P('p1').hp });
  check('3: ...the cast is over, and the tick goes on to the swell', !owned && slime._tgPhase === null && slime._burstUntil > 0, { ph: slime._tgPhase });

  /* the Goo Grotto's giant: a split mark's swell at hp above 0 */
  stage(slime, 60);
  room._maybeStartTelegraph(WHEEL_ZONE, slime, { id: 'p1', extracting: false }, 60, Date.now());
  slime._split = { n: 0, of: 3, until: Date.now() + 1000 };
  slime._tgUntil = Date.now() - 1;
  room._resolveMonsterTelegraph(WHEEL_ZONE, slime, Date.now());
  check('3: a boss swelling at a split mark does not lunge either', P('p1').hp === 5000 && slime._tgPhase === null, { hp: P('p1').hp });
  slime._split = undefined;
}

/* ── 4. the lifesteal ledger ends with the life ── */
{
  stage(other, 60);
  P('p1').dmgFromMonster = { [other.id]: 300 };
  P('p2').dmgFromMonster = { [other.id]: 200, 'not-it': 50 };
  other.hp = 0;
  room._resolveMonsterKill(WHEEL_ZONE, other, 'p2', P('p2'), 'ranged');   /* a bow kill: no refund */
  check('4: after a kill, no player still holds that monster\'s damage (the bystander\'s, the bow killer\'s)',
    !P('p1').dmgFromMonster[other.id] && !P('p2').dmgFromMonster[other.id], { p1: P('p1').dmgFromMonster, p2: P('p2').dmgFromMonster });
  check('4: ...another monster\'s entry is untouched', P('p2').dmgFromMonster['not-it'] === 50);
  /* its next life, never touched p1: p1's sword kill heals nothing */
  stage(other, 60);
  P('p1').hp = 4000;
  other.hp = 0;
  room._resolveMonsterKill(WHEEL_ZONE, other, 'p1', P('p1'), 'melee');
  check('4: a sword kill of its next life pays back nothing from the last', P('p1').hp <= 4000 + room._lifebloodFlat(P('p1')), { hp: P('p1').hp });
  /* control: the killer's own melee refund still pays */
  stage(other, 60);
  P('p1').hp = 4000;
  P('p1').dmgFromMonster = { [other.id]: 300 };
  other.hp = 0;
  room._resolveMonsterKill(WHEEL_ZONE, other, 'p1', P('p1'), 'melee');
  check('4: control: a melee kill of a monster that hit you still heals you (90%)', P('p1').hp >= 4000 + 270, { hp: P('p1').hp });
}

/* ── 5. the phone's copy ── */
{
  /* namespaces, so the suite runs (and fails) on a tree without them */
  const isIntangible = variants.isIntangible;
  const SWELL_GRACE_MS = variants.SWELL_GRACE_MS;
  const endSwell = carry.endSwell || (() => {});
  const now = 1_000_000;
  const swollen = { id: 's', alive: true, curHp: 30, _burstFrom: now - 23000, _burstUntil: now - 21400, _burstScale: 3.5 };
  check('5: isIntangible reads the clock: a swell 21 s over is not a shield', isIntangible(swollen, now) === false);
  check('5: ...one under way still is', isIntangible({ _burstFrom: now - 500, _burstUntil: now + 1100 }, now) === true);
  check('5: ...and just after the phone\'s fuse, while the blast\'s event is on its way, still is',
    isIntangible({ _burstUntil: now - 100 }, now) === true && SWELL_GRACE_MS < 18000);
  check('5: a snow pile still is, with no clock', isIntangible({ _burPhase: 'pile' }, now) === true);
  endSwell(swollen);
  check('5: endSwell ends the swell', !swollen._burstUntil && !swollen._burstFrom && !swollen._burstScale && !isIntangible(swollen, now));
  /* the tick's respawn edge (wsClient.js, `md.alive && !localM.alive`) calls it */
  const ws = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
  const edge = ws.indexOf('if (md.alive && !localM.alive) {');
  const edgeEnd = ws.indexOf('if (!md.alive && localM.alive) {', edge);
  check('5: the tick\'s respawn edge ends a swell the phone still holds',
    edge > 0 && edgeEnd > edge && /endSwell\(localM\)/.test(ws.slice(edge, edgeEnd)));
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nall passed');
