/* Combat lifecycle test — runs the GameRoom with mocked Durable Object
 * state and checks the previously untested combat paths (2026-07-01
 * optimization roadmap, P1):
 *   1. Server-rolled monster damage respects the anti-cheat cap and the
 *      overkill clamp (hp never goes negative, credit = actual damage).
 *   2. Kill credit: contribution shares, monster_kill recipients.
 *   3. _applyDamage: block = 0, zone-entry grace, resist buff.
 *   4. Melee lifesteal: 90% refund + reason codes.
 *   5. Death -> death pile -> inventory wipe -> respawn flow, including
 *      the owner-only window on death piles.
 *   6. Regen tick: town HP regen, shield stamina drain + auto-release.
 *   7. Event buffer cap: a tick carries at most EVENTS_PER_TICK_CAP
 *      events (current behavior: the excess is DROPPED — flagged in
 *      docs/OPTIMIZATION-ROADMAP.md as a candidate fix; update this
 *      assertion if overflow deferral ships).
 */
import { GameRoom } from '../src/index.js';

const mockState = {
  storage: {
    get: async () => undefined,
    put: async () => {},
    list: async () => new Map(),
    delete: async () => {},
  },
  getWebSockets: () => [],
  acceptWebSocket: () => {},
};
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};

function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(mockState, mockEnv);

const wsA = fakeWs('killer');
const wsB = fakeWs('bystander');
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
room.sessions.set(wsA, baseSession());
room.sessions.set(wsB, baseSession());

// Join far from spawns so monsters stay idle until we poke them.
const joinData = { x: -100000, y: -100000, z: 'meadow' };
await room.webSocketMessage(wsA, JSON.stringify({ type: 'join', id: 'pa', name: 'Killer', protocolVersion: 2, data: { ...joinData } }));
await room.webSocketMessage(wsB, JSON.stringify({ type: 'join', id: 'pb', name: 'Bystander', protocolVersion: 2, data: { ...joinData } }));

const psA = room.playerState.pa;
const psB = room.playerState.pb;

// Freeze the idle-wander AI so monster positions/dirty sets stay put.
const meadowMonsters = room.monsters.meadow;
for (const m of meadowMonsters) m._wanderPausedUntil = Date.now() + 600000;

// ── 1 + 2. Server damage roll, overkill clamp, kill credit ──
{
  psA.weapon = { type: 'sword', tierMult: 1 };
  psA.rangedWeapon = null; psA.staffWeapon = null;
  psA.power = 0; psA.mind = 0; psA.weaponSpecs = {};
  psA.z = 'meadow'; psA.dead = false;
  const dmgCap = room._maxDmgForAttacker(psA, false);

  // Full-HP monster: the cheater's dmg:99999 in the payload is ignored;
  // the server rolls its own damage, bounded by the weapon-aware cap.
  const m1 = meadowMonsters[0];
  m1.alive = true; m1.hp = m1.maxHp;
  room.eventBuffer.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: m1.id, zone: 'meadow', dmg: 99999, isCrit: true, slot: 'melee' } }));
  const hit1 = room.eventBuffer.find((e) => e.type === 'monster_hit');
  check('monster dmg: client dmg:99999 ignored, server roll within cap',
    !!hit1 && hit1.payload.dmg >= 1 && hit1.payload.dmg <= dmgCap,
    hit1 && { dmg: hit1.payload.dmg, cap: dmgCap });
  check('monster dmg: hp reduced by exactly the credited amount',
    !!hit1 && m1.hp === m1.maxHp - hit1.payload.dmg, { hp: m1.hp, maxHp: m1.maxHp });

  // 1-HP monster: overkill clamps the credit to remaining HP, the
  // monster dies, and the killer (sole contributor) gets a full share.
  const m2 = meadowMonsters[1];
  m2.alive = true; m2.hp = 1; m2.dmgByPlayer = {};
  room.eventBuffer.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: m2.id, zone: 'meadow', slot: 'melee' } }));
  const hit2 = room.eventBuffer.find((e) => e.type === 'monster_hit');
  const kill = room.eventBuffer.find((e) => e.type === 'monster_kill');
  check('monster dmg: overkill clamped to remaining hp (no negative hp)',
    !!hit2 && hit2.payload.dmg === 1 && m2.hp === 0, { dmg: hit2 && hit2.payload.dmg, hp: m2.hp });
  check('monster kill: dead + respawn scheduled', m2.alive === false && m2.respawnAt > Date.now());
  check('monster kill: sole contributor gets full share',
    !!kill && kill.payload.recipients.includes('pa') && kill.payload.shares.pa === 1,
    kill && { recipients: kill.payload.recipients, shares: kill.payload.shares });

  // Two-contributor kill: shares split by damage contribution, and a
  // contributor who left the zone forfeits.
  const m3 = meadowMonsters[2];
  m3.alive = true; m3.hp = 10; m3.maxHp = Math.max(10, m3.maxHp);
  m3.dmgByPlayer = { pa: 60, pb: 40 };
  psB.z = 'frost';                       // pb walked away -> forfeits
  room.eventBuffer.length = 0;
  m3.hp = 1;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: m3.id, zone: 'meadow', slot: 'melee' } }));
  const kill3 = room.eventBuffer.find((e) => e.type === 'monster_kill');
  check('monster kill: out-of-zone contributor forfeits credit',
    !!kill3 && kill3.payload.recipients.includes('pa') && !kill3.payload.recipients.includes('pb'),
    kill3 && kill3.payload.recipients);
  psB.z = 'meadow';
}

// ── 3. _applyDamage: block, grace, resist ──
{
  const ps = { hp: 100, maxHp: 100, agility: 0, z: 'meadow' };
  check('applyDamage: blocked hit deals 0', room._applyDamage(ps, 50, true).dmgTaken === 0 && ps.hp === 100);

  ps._zoneEntryGraceUntil = Date.now() + 5000;
  const graced = room._applyDamage(ps, 50, false);
  check('applyDamage: zone-entry grace absorbs the hit but reports intent',
    graced.dmgTaken === 0 && graced.graced === true && graced.dmgIntent === 50 && ps.hp === 100, graced);
  ps._zoneEntryGraceUntil = 0;

  ps._buffs = { resist: Date.now() + 10000 };
  const resisted = room._applyDamage(ps, 100, false);
  check('applyDamage: resist buff shaves 5%', resisted.dmgTaken === 95 && ps.hp === 5, resisted);
  ps._buffs = {};

  // v2.3.1113: Iron Skin defense channel -- -0.5%/pt, cap -25%.
  ps.hp = 100; ps.defenseSpec = { ironskin: 50 };
  const ironed = room._applyDamage(ps, 100, false);
  check('applyDamage: Iron Skin 50pts cuts 25%', ironed.dmgTaken === 75 && ps.hp === 25, ironed);
  ps.defenseSpec = { ironskin: 999 };   // over-cap spec (legacy blob) still capped at 25%
  ps.hp = 100;
  const ironCap = room._applyDamage(ps, 100, false);
  check('applyDamage: Iron Skin cap holds at 25% for over-cap spec', ironCap.dmgTaken === 75, ironCap);
  ps.defenseSpec = {};
}

// ── 4. Melee lifesteal refund + reason codes ──
{
  const ps = { hp: 50, maxHp: 100, activeSlot: 'melee' };
  check('lifesteal: ranged slot denied', room._applyMeleeLifesteal(ps, 'm1', 'ranged').reason === 'not-melee');
  check('lifesteal: no damage tracked', room._applyMeleeLifesteal(ps, 'm1', 'melee').reason === 'no-damage');
  room._trackMonsterDamage(ps, 'mOther', 20);
  check('lifesteal: damage from a different monster only', room._applyMeleeLifesteal(ps, 'm1', 'melee').reason === 'no-this-mon');
  room._trackMonsterDamage(ps, 'm1', 20);
  const ls = room._applyMeleeLifesteal(ps, 'm1', 'melee');
  check('lifesteal: refunds 90% of tracked damage', ls.reason === 'ok' && ls.refund === 18 && ps.hp === 68, { ls, hp: ps.hp });
  check('lifesteal: tracked entry consumed (no double refund)', room._applyMeleeLifesteal(ps, 'm1', 'melee').reason === 'no-this-mon');
}

// ── 5. Death -> death pile -> wipe -> respawn ──
{
  psA.z = 'meadow'; psA.x = 2000; psA.y = 2000;
  psA.inventory = { wood_oak: 3, fish_minnow: 2 };
  psA.maxHp = 100; psA.hp = 0;
  wsA.sent.length = 0;
  room._handlePlayerDeath(psA, 'pa', 'test');
  check('death: dying + respawn scheduled ~5s out', psA.dying === true && psA.dead === true
    && psA.respawnAt > Date.now() + 4000 && psA.respawnAt <= Date.now() + 6000);
  check('death: inventory wiped', Object.keys(psA.inventory).length === 0, psA.inventory);
  check('death: player_died sent with cause', msgsOfType(wsA, 'player_died').length === 1
    && msgsOfType(wsA, 'player_died')[0].payload.cause === 'test');

  const pile = (room.loot.meadow || []).find((p) => p.isDeathDrop && p.lootId.startsWith('dd-pa'));
  check('death: pile carries the full inventory', !!pile
    && pile.deathItems.some((i) => i.key === 'wood_oak' && i.qty === 3)
    && pile.deathItems.some((i) => i.key === 'fish_minnow' && i.qty === 2), pile && pile.deathItems);

  // Owner-only window: another player is rejected until it elapses.
  if (pile) {
    psB.x = pile.x; psB.y = pile.y; psB.z = 'meadow'; psB.dead = false; psB.disconnected = false;
    wsB.sent.length = 0;
    room._handleLootPickup(room.sessions.get(wsB), { lootId: pile.lootId, zone: 'meadow' });
    check('death pile: owner-only window rejects others',
      msgsOfType(wsB, 'loot_pickup_rejected').some((m) => m.payload.reason === 'not-recipient'));

    pile.ownerOnlyUntil = Date.now() - 1;   // window elapsed -> free-for-all
    if (!psB.inventory) psB.inventory = {};
    wsB.sent.length = 0;
    room._handleLootPickup(room.sessions.get(wsB), { lootId: pile.lootId, zone: 'meadow' });
    check('death pile: free-for-all after owner window, first picker gets all',
      psB.inventory.wood_oak === 3 && psB.inventory.fish_minnow === 2
      && !(room.loot.meadow || []).some((p) => p.lootId === pile.lootId),
      psB.inventory);
  }

  // Respawn tick: due players flip back alive in town with full pools.
  psA.respawnAt = Date.now() - 1;
  wsA.sent.length = 0;
  room._tickPlayerRespawn();
  check('respawn: alive in town with full pools', psA.dying === false && psA.dead === false
    && psA.z === 'town' && psA.hp === psA.maxHp, { z: psA.z, hp: psA.hp, maxHp: psA.maxHp });
  check('respawn: player_respawned sent', msgsOfType(wsA, 'player_respawned').length === 1);
}

// ── 6. Regen tick: town HP regen, shield stamina drain ──
{
  psA.z = 'town'; psA.dying = false; psA.dead = false; psA.disconnected = false;
  psA.maxHp = 100; psA.hp = 50;
  psA.maxStamina = 100; psA.stamina = 100;
  psA.maxMana = 100; psA.mana = 100;
  psA.blocking = false;
  room._tickPlayerRegen();
  check('regen: town heals 10% of maxHp per regen tick', psA.hp === 60, psA.hp);

  psA.z = 'meadow'; psA.hp = 50; psA.lastDamageAt = Date.now();
  room._tickPlayerRegen();
  check('regen: combat zones have no passive HP regen', psA.hp === 50, psA.hp);

  psA.blocking = true; psA.stamina = 3;
  room._tickPlayerRegen();
  check('regen: shield drain hits 0 and auto-releases the block',
    psA.stamina === 0 && psA.blocking === false, { stamina: psA.stamina, blocking: psA.blocking });
}

// ── 6b. v2.3.1110: monster<->monster separation ──
// Chase/wander have no body collision; the tick now runs a gentle
// pairwise push so aggro-stacked monsters can't merge into one blob.
{
  // Deterministic layout: spawn positions are random per DO wake, so
  // pin every monster far apart first, then overlap exactly one pair.
  meadowMonsters.forEach((m, i) => {
    m.x = 200 + i * 100; m.y = 200;
    m.spawnX = m.x; m.spawnY = m.y; // stay inside the wander leash
  });
  const m1 = meadowMonsters[3];
  const m2 = meadowMonsters[4];
  m1.alive = true; m2.alive = true;
  m1.x = 5000; m1.y = 5000; m2.x = 5002; m2.y = 5000;   // overlapping (2 px apart)
  m1.spawnX = 5000; m1.spawnY = 5000; m2.spawnX = 5002; m2.spawnY = 5000;
  const m3 = meadowMonsters[0];
  const farX = m3.x, farY = m3.y;                        // far monster must not move
  room._tickMonsters();
  const dx = m2.x - m1.x, dy = m2.y - m1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  check('separation: overlapping monsters pushed apart to >= 22px', dist >= 21.9, dist);
  check('separation: non-overlapping monster untouched', m3.x === farX && m3.y === farY,
    { before: [farX, farY], after: [m3.x, m3.y] });
}

// ── 7. Event buffer cap on the tick broadcast ──
{
  room.eventBuffer.length = 0;
  for (let i = 0; i < room.EVENTS_PER_TICK_CAP + 100; i++) {
    room.eventBuffer.push({ type: 'test_event', payload: { i } });
  }
  wsA.sent.length = 0; wsB.sent.length = 0;
  room.startTickLoop();
  await new Promise((r) => setTimeout(r, 80));
  clearInterval(room.tickInterval); room.tickInterval = null;
  const evTick = msgsOfType(wsA, 'tick').find((t) => Array.isArray(t.events) && t.events.some((e) => e.type === 'test_event'));
  check('tick: events capped at EVENTS_PER_TICK_CAP',
    !!evTick && evTick.events.length <= room.EVENTS_PER_TICK_CAP
    && evTick.events.filter((e) => e.type === 'test_event').length === room.EVENTS_PER_TICK_CAP,
    evTick && evTick.events.length);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
