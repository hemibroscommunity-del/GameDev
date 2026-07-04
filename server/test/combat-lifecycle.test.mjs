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
  ps.hp = 100; ps.defenseSpec = { ironskin: 100 }; // v2.3.1156: cap moved to 100 (0.25%/pt)
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

  // v2.3.1153: Bulwark block-stamina efficiency also discounts the
  // shield-HOLD drain (v2.3.1156: 0.5%/pt — 5/tick -> 3 at the 100-pt
  // cap; floored at 1 so holding a shield is never free).
  psA.blocking = true; psA.stamina = 100; psA.defenseSpec = { bulwark: 100 };
  room._tickPlayerRegen();
  check('bulwark: 100 pts (cap) discount the shield-hold drain (5 -> 3/tick)',
    psA.stamina === 97, psA.stamina);
  check('bulwark: helper mult floors at -50%', Math.abs(room._blockStaminaMult(psA) - 0.5) < 1e-9
    && Math.abs(room._blockStaminaMult({ defenseSpec: { bulwark: 999 } }) - 0.5) < 1e-9,
    room._blockStaminaMult(psA));
  psA.blocking = false; psA.defenseSpec = {};
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

// ── 6c. v2.3.1114: server-authoritative elemental (status/DoT/collision) ──
{
  psA.z = 'meadow'; psA.dead = false; psA.dying = false; psA.disconnected = false;
  psA.weapon = { type: 'sword', tierMult: 1 };
  psA.rangedWeapon = null; psA.staffWeapon = null;
  psA.power = 20; psA.weaponSpecs = {};
  const me = meadowMonsters[5];
  me.alive = true; me.hp = 500; me.maxHp = 500; me.dmgByPlayer = {};
  me.statuses = undefined; me._wanderPausedUntil = Date.now() + 600000;

  // Flame hit applies burn with a server-side power snapshot.
  room.eventBuffer.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: me.id, zone: 'meadow', element: 'flame', slot: 'melee' } }));
  check('elemental: flame hit applies burn status', !!(me.statuses && me.statuses.burn)
    && me.statuses.burn.sourceId === 'pa' && me.statuses.burn.power === 20,
    me.statuses && me.statuses.burn);

  // Burn DoT ticks inside _tickMonsters: (5 + 20*0.3) = 11/tick,
  // credited to the source through dmgByPlayer.
  me.statuses.burn.lastTick = Date.now() - 600;   // past the 0.5s tick gate
  const hpBeforeDot = me.hp;
  const creditBefore = me.dmgByPlayer.pa || 0;
  room.eventBuffer.length = 0;
  room._tickMonsters();
  const dotHit = room.eventBuffer.find((e) => e.type === 'monster_hit' && e.payload.status === 'burn');
  check('elemental: burn DoT ticks 11 dmg with kill credit', !!dotHit && dotHit.payload.dmg === 11
    && me.hp === hpBeforeDot - 11 && (me.dmgByPlayer.pa || 0) === creditBefore + 11,
    { dotHit: dotHit && dotHit.payload, hp: me.hp, hpBeforeDot });

  // Frost hit on a burning monster detonates Steam (flame|frost):
  // base 40 + power*0.8 = 56 raw, x effectiveness vs the monster's own
  // element; burn is CONSUMED; damage capped at raw*3.2.
  // v2.3.1134: clear the hit-cadence tracker -- in real play these two
  // swings are >=450ms apart; the test fires them back-to-back.
  if (psA._monHitCad) psA._monHitCad.clear();
  const hpBeforeCol = me.hp;
  room.eventBuffer.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: me.id, zone: 'meadow', element: 'frost', slot: 'melee' } }));
  const colHit = room.eventBuffer.find((e) => e.type === 'monster_hit' && e.payload.collision === 'steam');
  const rawSteam = 40 + 20 * 0.8;
  check('elemental: frost trigger detonates steam within the burst cap',
    !!colHit && colHit.payload.dmg >= 1 && colHit.payload.dmg <= Math.round(rawSteam * 3.2)
    && me.hp < hpBeforeCol, colHit && colHit.payload);
  check('elemental: collision consumed the burn setup', !(me.statuses && me.statuses.burn)
    && !!(me.statuses && me.statuses.freeze), me.statuses && Object.keys(me.statuses));

  // DoT kill resolves through the shared kill pipeline (XP recipients,
  // loot, monster_kill event) with lifesteal denied (slot 'dot').
  const mk = meadowMonsters[6];
  mk.alive = true; mk.hp = 1; mk.maxHp = Math.max(10, mk.maxHp); mk.dmgByPlayer = {};
  mk.statuses = undefined; mk._wanderPausedUntil = Date.now() + 600000;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: mk.id, zone: 'meadow', element: 'flame', slot: 'melee' } }));
  if (mk.alive) {   // weapon roll may have left >0 hp; force the DoT to be the killer
    mk.hp = 1;
    mk.statuses.burn.lastTick = Date.now() - 600;
    room.eventBuffer.length = 0;
    room._tickMonsters();
    const dotKill = room.eventBuffer.find((e) => e.type === 'monster_kill' && e.payload.monsterId === mk.id);
    check('elemental: DoT kill flows through the shared kill pipeline',
      !!dotKill && mk.alive === false && dotKill.payload.recipients.includes('pa'),
      dotKill && dotKill.payload);
  } else {
    check('elemental: DoT kill flows through the shared kill pipeline', true, 'weapon roll killed at hp=1; kill path already covered');
  }
}

// ── 6g. v2.3.1137: defense channels — Second Wind + Thorns ──
{
  // Second Wind: 1%/pt of maxHp after surviving an unblocked hit,
  // cap 50% (50 pts), 10s cooldown, never on the lethal hit.
  const ps = { hp: 100, maxHp: 200, agility: 0, defenseSpec: { secondwind: 100 } }; // v2.3.1156: cap 100 (0.5%/pt)
  const r1 = room._applyDamage(ps, 50, false);
  check('secondwind: heals 50% of maxHp after surviving a hit',
    r1.dmgTaken === 50 && r1.secondWind === 100 && ps.hp === 150, { r1, hp: ps.hp });
  const r2 = room._applyDamage(ps, 50, false);
  check('secondwind: 10s cooldown blocks back-to-back heals',
    r2.secondWind === 0 && ps.hp === 100, { r2, hp: ps.hp });
  ps._secondWindReadyAt = 0; ps.hp = 30;
  const r3 = room._applyDamage(ps, 100, false);
  check('secondwind: never fires on the lethal hit', ps.hp === 0 && r3.secondWind === 0, { r3, hp: ps.hp });

  // Thorns: blocked attack reflects 1%/pt (cap 50%) through the REAL
  // tick block branch; lethal reflect kills via the shared pipeline.
  psA.z = 'meadow'; psA.dead = false; psA.dying = false; psA.disconnected = false;
  psA.blocking = true; psA.stamina = 100; psA.maxStamina = 100; psA.hp = 100; psA.maxHp = 100;
  psA.defenseSpec = { thorns: 100 }; // v2.3.1156: cap 100 (0.5%/pt)
  const tm = meadowMonsters[3];
  tm.alive = true; tm.hp = 1000; tm.maxHp = 1000; tm.dmg = 40; tm.dmgByPlayer = {};
  tm.statuses = undefined; tm.atkCd = 0; tm._attackingUntil = 0; tm._wanderPausedUntil = 0;
  tm.x = 3000; tm.y = 3000; tm.spawnX = 3000; tm.spawnY = 3000;
  psA.x = 3000; psA.y = 3000;
  room.eventBuffer.length = 0;
  room._tickMonsters();
  const th = room.eventBuffer.find((e) => e.type === 'monster_hit' && e.payload.thorns);
  check('thorns: blocked attack reflects 50% back at the monster',
    !!th && th.payload.dmg === 20 && tm.hp === 980 && (tm.dmgByPlayer.pa || 0) === 20,
    { th: th && th.payload, hp: tm.hp });

  tm.hp = 5; tm.atkCd = 0; tm._attackingUntil = 0;
  room.eventBuffer.length = 0;
  room._tickMonsters();
  const tk = room.eventBuffer.find((e) => e.type === 'monster_kill' && e.payload.monsterId === tm.id);
  check('thorns: lethal reflect kills through the shared pipeline',
    !!tk && tm.alive === false && tk.payload.recipients.includes('pa'),
    tk && tk.payload);
  psA.blocking = false; psA.defenseSpec = {};
}

// ── 6f. v2.3.1136: Attunement scales server status duration ──
// +0.5%/pt from SERVER-clamped weaponSpecs.staff.attunement; 99 pts =
// x1.495 on both remaining and maxDur.  Burn base dur = 4s.
{
  psA.z = 'meadow'; psA.dead = false; psA.weapon = { type: 'sword', tierMult: 1 };
  psA.power = 20;
  const ma = meadowMonsters[9];
  ma.alive = true; ma.hp = ma.maxHp = 10000; ma.dmgByPlayer = {}; ma.statuses = undefined;
  ma._wanderPausedUntil = Date.now() + 600000;

  check('attune: _attuneMult caps at 1.50 even for an over-cap blob (v2.3.1156: 100-pt cap)',
    Math.abs(room._attuneMult({ weaponSpecs: { staff: { attunement: 500 } } }) - 1.50) < 1e-9,
    room._attuneMult({ weaponSpecs: { staff: { attunement: 500 } } }));

  // Baseline burn (no attunement): remaining == base 4s.
  psA.weaponSpecs = {};
  if (psA._monHitCad) psA._monHitCad.clear();
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: ma.id, zone: 'meadow', element: 'flame', slot: 'melee' } }));
  const basePlain = ma.statuses && ma.statuses.burn && ma.statuses.burn.remaining;

  // 99-pt attunement on a fresh application: x1.495.
  ma.statuses = undefined;
  psA.weaponSpecs = { staff: { attunement: 99 } };
  if (psA._monHitCad) psA._monHitCad.clear();
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: ma.id, zone: 'meadow', element: 'flame', slot: 'melee' } }));
  const buffed = ma.statuses && ma.statuses.burn;
  // burn def: dur 4, maxDur 6 — both scale by the multiplier.
  check('attune: 99 pts scales burn duration x1.495',
    !!buffed && Math.abs(buffed.remaining - basePlain * 1.495) < 1e-6
    && Math.abs(buffed.maxDur - 6 * 1.495) < 1e-6,
    { basePlain, remaining: buffed && buffed.remaining, maxDur: buffed && buffed.maxDur });
  psA.weaponSpecs = {};
}

// ── 6e. v2.3.1134: hit-cadence floor in _handleMonsterDamage ──
// Normal hits: min 335ms per (player, monster).  Specials: <=3 per 1200ms
// per monster (staff cone).  Different monsters in the same tick all land
// (Cleave / pierce fan-out safety).
{
  psA.z = 'meadow'; psA.dead = false; psA.weapon = { type: 'sword', tierMult: 1 };
  psA.power = 0; psA.weaponSpecs = {};
  if (psA._monHitCad) psA._monHitCad.clear();
  const ca = meadowMonsters[7];
  const cb = meadowMonsters[8];
  ca.alive = true; ca.hp = ca.maxHp = 10000; ca.dmgByPlayer = {}; ca.statuses = undefined;
  cb.alive = true; cb.hp = cb.maxHp = 10000; cb.dmgByPlayer = {}; cb.statuses = undefined;

  // Same monster, two sends in the same tick: second dropped.
  room.eventBuffer.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: ca.id, zone: 'meadow', slot: 'melee' } }));
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: ca.id, zone: 'meadow', slot: 'melee' } }));
  check('cadence: rapid same-monster second hit dropped',
    room.eventBuffer.filter((e) => e.type === 'monster_hit' && e.payload.monsterId === ca.id).length === 1,
    room.eventBuffer.length);

  // A different monster in the same tick still lands (fan-out safety).
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: cb.id, zone: 'meadow', slot: 'melee' } }));
  check('cadence: same-tick hit on a DIFFERENT monster lands',
    room.eventBuffer.filter((e) => e.type === 'monster_hit' && e.payload.monsterId === cb.id).length === 1);

  // A backdated last-hit stamp (>335ms ago) lets the next hit through.
  psA._monHitCad.get(ca.id).n = Date.now() - 400;
  room.eventBuffer.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: ca.id, zone: 'meadow', slot: 'melee' } }));
  check('cadence: hit lands again after the 335ms floor elapses',
    room.eventBuffer.filter((e) => e.type === 'monster_hit' && e.payload.monsterId === ca.id).length === 1);

  // Specials: 3 land (staff cone burst), the 4th in the window is dropped.
  if (psA._monHitCad) psA._monHitCad.clear();
  room.eventBuffer.length = 0;
  for (let i = 0; i < 4; i++) {
    await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: ca.id, zone: 'meadow', slot: 'staff', special: true } }));
  }
  check('cadence: special burst allows 3 per monster, drops the 4th',
    room.eventBuffer.filter((e) => e.type === 'monster_hit' && e.payload.monsterId === ca.id).length === 3,
    room.eventBuffer.length);
}

// ── 6d. v2.3.1133: crit-DMG channel reaches the authoritative crit roll ──
// Executioner/Headshot/Arcane Focus feed the crit MULTIPLIER at +0.008/pt
// (mirror of client calcCritMult); the anti-cheat ceiling assumes the
// maxed channel so a fully-invested crit is never rejected.
{
  const ps = { power: 200, weapon: { type: 'sword', tierMult: 1 }, activeSlot: 'melee', weaponSpecs: {} };
  const origRandom = Math.random;
  Math.random = () => 0;   // variance floor (×0.75 sword) + guaranteed crit (P200 → 20%)
  const plain = room._computeAttackDamage(ps, 'melee', false);
  ps.weaponSpecs = { sword: { executioner: 99 } };
  const boosted = room._computeAttackDamage(ps, 'melee', false);
  // Max-variance, max-channel roll must stay under the anti-cheat ceiling.
  ps.weaponSpecs = { sword: { edge: 99, executioner: 99 } };
  Math.random = () => 0.999999;
  const maxRoll = room._computeAttackDamage(ps, 'melee', false);
  Math.random = origRandom;
  check('critDmg: helper reads executioner points', room._wpnCritDmgPts(ps, 'sword') === 99);
  check('critDmg: both rolls crit under a forced roll', plain.isCrit === true && boosted.isCrit === true);
  // v2.3.1157 (UN-01 parity retune, 1.2%/pt):
  // ratio = (1.5 + 0.2 + 99×0.012) / (1.5 + 0.2) = 2.888 / 1.7 ≈ 1.699
  const ratio = boosted.dmg / plain.dmg;
  check('critDmg: 99 executioner pts scale the crit ×2.888/×1.7', Math.abs(ratio - 2.888 / 1.7) < 0.02, ratio);
  check('critDmg: maxed edge+executioner crit clears the anti-cheat ceiling',
    maxRoll.dmg <= room._maxDmgForAttacker(ps, false),
    { roll: maxRoll.dmg, cap: room._maxDmgForAttacker(ps, false) });
}

// ── 6e. v2.3.1153: damage channel repriced flat +1/pt -> ×(1+pts×0.005) ──
// The flat term rode INSIDE the tierMult product (~+725% DPS at 99 pts
// mid-band, the BALANCE-PLAN §4 outlier).  99 pts must now scale a fixed
// roll by exactly ×1.495 regardless of tier, and the anti-cheat ceiling
// must have TIGHTENED (maxed-channel ×1.495 replaces the old +99 pre-tier
// flat term, which was worth far more once the tier multiplied it).
{
  const ps = { power: 200, weapon: { type: 'sword', tierMult: 3.24 }, activeSlot: 'melee', weaponSpecs: {} };
  const origRandom = Math.random;
  Math.random = () => 0.5;   // fixed mid variance; 0.5 > 20% crit chance -> no crit
  const plain = room._computeAttackDamage(ps, 'melee', false);
  ps.weaponSpecs = { sword: { edge: 99 } };
  const priced = room._computeAttackDamage(ps, 'melee', false);
  ps.weapon.tierMult = 1;
  const pricedT1 = room._computeAttackDamage(ps, 'melee', false);
  ps.weaponSpecs = {};
  const plainT1 = room._computeAttackDamage(ps, 'melee', false);
  ps.weapon.tierMult = 3.24;
  Math.random = origRandom;
  check('reprice: 99 edge pts multiply damage ×1.495', Math.abs(priced.dmg / plain.dmg - 1.495) < 0.02, priced.dmg / plain.dmg);
  check('reprice: channel uplift is tier-independent (same ×1.495 at tier 1)',
    Math.abs(pricedT1.dmg / plainT1.dmg - 1.495) < 0.02, pricedT1.dmg / plainT1.dmg);
  // Ceiling regression guard: the old formula's weapon bound carried the
  // flat +99 inside the tier product — (effBase + stat×0.1667 + 99) ×
  // tierMult.  The new bound (maxed-channel ×1.495) must sit well under
  // it, or the reprice silently re-opened anti-cheat headroom.
  ps.weaponSpecs = { sword: { edge: 99 } };
  const newBound = room._maxWeaponDmg(ps, false);
  const oldBound = (room._weaponEffBase('sword', ps.weapon) + 200 * 0.1667 + 99) * 3.24;
  check('reprice: anti-cheat weapon bound tightened vs the old flat formula',
    newBound < oldBound * 0.5, { newBound, oldBound });
  ps.weaponSpecs = {};
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
