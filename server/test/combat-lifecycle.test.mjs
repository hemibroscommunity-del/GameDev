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
/* v2.3.1451 (bench-locked T2): fixtures build their accumulator with
   the REAL replay helper and assertions derive from it — never
   hand-rolled numbers, so tuning T2_BENCH can't silently break the
   suite (the v2.3.1415 lesson, now structural). */
import { t2ReplayFlat as _replay } from '../src/data.js';

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
/* v2.3.1592: meadow fielded 10 monsters when this suite was written and now
   fields 3, but the sections below each reach for their OWN monster (indices
   up to [9]) precisely so they cannot interfere with one another.  Top the
   live list up with real spawns under unique ids rather than re-pointing
   every section at the surviving three: this suite is about the combat
   lifecycle, not zone density, and it should not have to change again the
   next time the owner retunes the population.  node-respawn.test.mjs owns
   that number. */
while (meadowMonsters.length < 10) {
  const extra = room._spawnZoneMonsters('meadow');
  if (!extra.length) break;                       /* never loop forever */
  for (const m of extra) {
    if (meadowMonsters.length >= 10) break;
    m.id = 'sm-meadow-x' + meadowMonsters.length; /* ids repeat per spawn call */
    meadowMonsters.push(m);
  }
}
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

  // v2.3.1451 (bench-locked): Iron Skin soaks the BANKED flat from
  // ps.t2Flat — fixtures replay their spec through the real helper
  // and the expectations derive from the banked value.
  ps.hp = 100; ps.defenseSpec = { ironskin: 100 };
  ps.t2Flat = _replay(ps);
  const _soakMax = ps.t2Flat.defense.ironskin;   // 100 pts replayed from level 1
  const ironed = room._applyDamage(ps, _soakMax, false); // hit == soak -> floor 1
  check('applyDamage: Iron Skin banked soak swallows an equal hit to the floor 1', ironed.dmgTaken === 1 && ps.hp === 99, { ironed, _soakMax });
  ps.defenseSpec = { ironskin: 10 }; // small spend
  ps.t2Flat = _replay(ps);
  const _soak10 = ps.t2Flat.defense.ironskin;
  ps.hp = 100;
  const ironSmall = room._applyDamage(ps, _soak10 + 45, false);
  check('applyDamage: Iron Skin small spend soaks exactly its banked flat', ironSmall.dmgTaken === 45, { ironSmall, _soak10 });
  ps.defenseSpec = { ironskin: 999 };   // over-cap spec: replay clamps at 100 pts
  ps.t2Flat = _replay(ps);
  check('applyDamage: over-cap spec banks only the 100-pt replay value', ps.t2Flat.defense.ironskin === _soakMax, ps.t2Flat.defense.ironskin);
  ps.hp = 100;
  const ironCap = room._applyDamage(ps, _soakMax, false);
  check('applyDamage: Iron Skin over-cap spec still soaks to the floor 1', ironCap.dmgTaken === 1, ironCap);
  ps.t2Flat = undefined; ps.defenseSpec = undefined;
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

  // v2.3.1343 (kid-simple reprice): Bulwark -1%/pt, cap -100% — but the
  // Math.max(1, …) floor keeps the shield-hold drain at >= 1/tick, so
  // holding a shield is never TRULY free (the anti-turtle backstop).
  psA.blocking = true; psA.stamina = 100; psA.defenseSpec = { bulwark: 100 };
  room._tickPlayerRegen();
  check('bulwark: 100 pts (cap) floor the shield-hold drain at 1/tick',
    psA.stamina === 99, psA.stamina);
  check('bulwark: helper mult floors at -100% (mult 0)', Math.abs(room._blockStaminaMult(psA) - 0) < 1e-9
    && Math.abs(room._blockStaminaMult({ defenseSpec: { bulwark: 999 } }) - 0) < 1e-9,
    room._blockStaminaMult(psA));
  psA.blocking = false; psA.defenseSpec = {};

  // v2.3.1414: WORLD VIEW joins the safe-zone regen list, and hubs top
  // off stamina/mana at the HP pace (10%/tick) — all combat resources
  // refill in a hub, not just HP.
  psA.z = 'worldview'; psA.hp = 50; psA.stamina = 40; psA.mana = 40;
  psA.lastDamageAt = Date.now(); /* even fresh out of combat */
  room._tickPlayerRegen();
  check('regen: worldview heals 10% of maxHp per tick', psA.hp === 60, psA.hp);
  check('regen: hub tops off stamina at >=10%/tick', psA.stamina >= 50, psA.stamina);
  check('regen: hub tops off mana at >=10%/tick', psA.mana >= 50, psA.mana);

  // v2.3.1414: a combat-skill level-up reported via stats_update fully
  // restores hp/stamina/mana (level INCREASE only — echoes don't).
  psA.z = 'town'; psA.hp = 10; psA.stamina = 10; psA.mana = 10;
  psA.weaponSkills = { sword: { level: 2, xp: 0 } };
  room._handleStatsUpdate({ id: 'pa' }, { weaponSkills: { sword: { level: 3, xp: 0 } } });
  check('levelup restore: weapon level increase fills hp/stamina/mana',
    psA.hp === psA.maxHp && psA.stamina === psA.maxStamina && psA.mana === psA.maxMana,
    { hp: psA.hp, stamina: psA.stamina, mana: psA.mana });
  psA.hp = 10; psA.stamina = 10; psA.mana = 10;
  room._handleStatsUpdate({ id: 'pa' }, { weaponSkills: { sword: { level: 3, xp: 5 } } });
  check('levelup restore: same-level echo does NOT restore', psA.hp === 10, psA.hp);
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
  /* v2.3.1592: was [3] and [4].  Meadow fielded 10 monsters when this was
     written and now fields 3, so those indices are undefined.  Any two
     distinct monsters prove the separation push — the indices were never the
     point, only that they are not the "far" monster at [0]. */
  const m1 = meadowMonsters[1];
  const m2 = meadowMonsters[2];
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
  // v2.3.1451 (bench-locked): Second Wind heals the BANKED flat from
  // ps.t2Flat (plus Recovery's banked bonus, 0 here), bounded to
  // maxHp, on a 10s cooldown, never on the lethal hit.
  const ps = { hp: 100, maxHp: 200, agility: 0, defenseSpec: { secondwind: 100 } };
  ps.t2Flat = _replay(ps);
  const _swFlat = ps.t2Flat.defense.secondwind;
  const r1 = room._applyDamage(ps, 50, false);
  check('secondwind: banked heal fires after surviving a hit (bounded to maxHp)',
    r1.dmgTaken === 50 && r1.secondWind === _swFlat && ps.hp === Math.min(200, 50 + _swFlat), { r1, hp: ps.hp, _swFlat });
  const _hpAfter1 = ps.hp;
  const r2 = room._applyDamage(ps, 50, false);
  check('secondwind: 10s cooldown blocks back-to-back heals',
    r2.secondWind === 0 && ps.hp === _hpAfter1 - 50, { r2, hp: ps.hp });
  ps._secondWindReadyAt = 0; ps.hp = 30;
  const r3 = room._applyDamage(ps, 100, false);
  check('secondwind: never fires on the lethal hit', ps.hp === 0 && r3.secondWind === 0, { r3, hp: ps.hp });

  // Thorns: blocked attack reflects through the REAL tick block
  // branch; lethal reflect kills via the shared pipeline.
  psA.z = 'meadow'; psA.dead = false; psA.dying = false; psA.disconnected = false;
  psA.blocking = true; psA.stamina = 100; psA.maxStamina = 100; psA.hp = 100; psA.maxHp = 100;
  psA.defenseSpec = { thorns: 100 }; // v2.3.1156: cap 100
  // v2.3.1451 (bench-locked): the payback is the BANKED flat, so the
  // test monster's HP is sized to it — the lethal reflect must still
  // flow through the shared kill pipeline.
  psA.t2Flat = _replay({ defenseSpec: psA.defenseSpec });
  const _thornsFlat = psA.t2Flat.defense.thorns;
  const tm = meadowMonsters[3];
  tm.alive = true; tm.hp = _thornsFlat; tm.maxHp = _thornsFlat; tm.dmg = 40; tm.dmgByPlayer = {};
  tm.statuses = undefined; tm.atkCd = 0; tm._attackingUntil = 0; tm._wanderPausedUntil = 0;
  tm.x = 3000; tm.y = 3000; tm.spawnX = 3000; tm.spawnY = 3000;
  psA.x = 3000; psA.y = 3000;
  room.eventBuffer.length = 0;
  room._tickMonsters();
  const th = room.eventBuffer.find((e) => e.type === 'monster_hit' && e.payload.thorns);
  const tk = room.eventBuffer.find((e) => e.type === 'monster_kill' && e.payload.monsterId === tm.id);
  check('thorns: banked payback lands and the lethal reflect kills through the shared pipeline',
    !!th && th.payload.dmg === _thornsFlat && tm.hp === 0
    && !!tk && tm.alive === false && tk.payload.recipients.includes('pa'),
    { th: th && th.payload, hp: tm.hp, tk: tk && tk.payload, _thornsFlat });
  psA.blocking = false; psA.defenseSpec = {}; psA.t2Flat = undefined;
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

  check('attune: _attuneMult caps at 2.00 even for an over-cap blob (v2.3.1343: +1%/pt)',
    Math.abs(room._attuneMult({ weaponSpecs: { staff: { attunement: 500 } } }) - 2.00) < 1e-9,
    room._attuneMult({ weaponSpecs: { staff: { attunement: 500 } } }));

  // Baseline burn (no attunement): remaining == base 4s.
  psA.weaponSpecs = {};
  if (psA._monHitCad) psA._monHitCad.clear();
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: ma.id, zone: 'meadow', element: 'flame', slot: 'melee' } }));
  const basePlain = ma.statuses && ma.statuses.burn && ma.statuses.burn.remaining;

  // 99-pt attunement on a fresh application: x1.99 (v2.3.1343).
  ma.statuses = undefined;
  psA.weaponSpecs = { staff: { attunement: 99 } };
  if (psA._monHitCad) psA._monHitCad.clear();
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: ma.id, zone: 'meadow', element: 'flame', slot: 'melee' } }));
  const buffed = ma.statuses && ma.statuses.burn;
  // burn def: dur 4, maxDur 6 — both scale by the multiplier.
  check('attune: 99 pts scales burn duration x1.99',
    !!buffed && Math.abs(buffed.remaining - basePlain * 1.99) < 1e-6
    && Math.abs(buffed.maxDur - 6 * 1.99) < 1e-6,
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

// ── 6h. v2.3.1238: ranged specials declare special:true (client parity) ──
// The client's projectile hit send (src/game/projectiles.js) hardcoded
// special:false on ALL ranged/staff hits ("ranged shots are never
// special") even though the bow heavy and the staff 3-bolt cone spawn
// projectiles with isSpecial:true (playerActions.js).  The server was
// BUILT for the declaration -- the v2.3.1134 special lane above exists
// explicitly because the staff cone lands 3 bolts on one target -- so
// with special:false cone bolts 2-3 fell into the 335ms normal lane and
// were silently dropped, and every ranged special forfeited the
// Mind-scaled 2x special roll ("kills slowed down after bow/staff
// specials").  NO server logic changed for the fix; these cases pin the
// contract the fixed client now relies on:
//   (a) three staff-cone special hits inside 1200ms on one monster ALL
//       land through the special lane;
//   (b) _computeAttackDamage's 2x special multiplier + Mind scaling are
//       slot-agnostic (not melee-conditioned);
//   (c) a NORMAL (special:false) rapid second ranged hit inside 335ms
//       is still dropped -- old clients keep the existing lane.
// Trust model unchanged: melee has declared client-side special since
// server-computed damage shipped; a forged ranged special:true is
// bounded by the same lane cap + _maxDmgForAttacker special headroom.
{
  psA.z = 'meadow'; psA.dead = false; psA.dying = false;
  psA.weapon = null;
  psA.staffWeapon = { type: 'staff', tierMult: 1 };
  psA.rangedWeapon = { type: 'bow', tierMult: 1 };
  psA.power = 0; psA.mind = 0; psA.agility = 0; psA.weaponSpecs = {};
  if (psA._monHitCad) psA._monHitCad.clear();
  const rs = meadowMonsters[7];
  rs.alive = true; rs.hp = rs.maxHp = 100000; rs.dmgByPlayer = {}; rs.statuses = undefined;

  // (a) staff cone: 3 special bolts back-to-back (same monster, well
  // inside 1200ms) all land -- none stolen by the 335ms normal lane.
  room.eventBuffer.length = 0;
  for (let i = 0; i < 3; i++) {
    await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: rs.id, zone: 'meadow', slot: 'staff', special: true } }));
  }
  check('ranged special: staff cone lands all 3 bolts on one monster inside 1200ms',
    room.eventBuffer.filter((e) => e.type === 'monster_hit' && e.payload.monsterId === rs.id).length === 3,
    room.eventBuffer.length);

  // (c) the normal ranged lane is untouched: two rapid special:false
  // bow hits on the same monster -> second dropped (old-client shape).
  if (psA._monHitCad) psA._monHitCad.clear();
  room.eventBuffer.length = 0;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: rs.id, zone: 'meadow', slot: 'ranged', special: false } }));
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'monster_damage', payload: { monsterId: rs.id, zone: 'meadow', slot: 'ranged', special: false } }));
  check('ranged normal: rapid second special:false hit inside 335ms still dropped',
    room.eventBuffer.filter((e) => e.type === 'monster_hit' && e.payload.monsterId === rs.id).length === 1,
    room.eventBuffer.length);

  // (b) the special roll is slot-agnostic.  Pin variance (0.5 -> staff
  // v=1.0, bow v=0.7) and no crit (power 0); mind=200 keeps the numbers
  // big enough that rounding can't fake the ratio.
  const origRandom = Math.random;
  Math.random = () => 0.5;
  const ps = { power: 0, mind: 200, agility: 0, activeSlot: 'staff', weaponSpecs: {},
    weapon: null, staffWeapon: { type: 'staff', tierMult: 1 }, rangedWeapon: { type: 'bow', tierMult: 1 } };
  const staffNorm = room._computeAttackDamage(ps, 'staff', false);
  const staffSpec = room._computeAttackDamage(ps, 'staff', true);
  check('ranged special: staff special roll carries the 2x multiplier',
    Math.abs(staffSpec.dmg / staffNorm.dmg - 2.0) < 0.05, { norm: staffNorm.dmg, spec: staffSpec.dmg });
  // Bow special scales on Mind (all specials do), exactly the formula:
  // (effBase + mind*0.1667) * v(0.7) * 3.0.
  // v2.3.1397 (owner): per-weapon special mult — melee/bow 3x, staff 2x.
  const bowExpect = Math.round((room._weaponEffBase('bow', ps.rangedWeapon) + 200 * 0.1667) * 0.7 * 3.0);
  const bowSpec = room._computeAttackDamage(ps, 'ranged', true);
  check('ranged special: bow special = Mind-scaled 3x formula',
    Math.abs(bowSpec.dmg - bowExpect) <= 1, { got: bowSpec.dmg, expect: bowExpect });
  // Agility must NOT leak into the special roll (specials are Mind-only).
  ps.agility = 999;
  const bowSpecAgi = room._computeAttackDamage(ps, 'ranged', true);
  check('ranged special: Agility does not leak into the special roll',
    bowSpecAgi.dmg === bowSpec.dmg, { withAgi: bowSpecAgi.dmg, without: bowSpec.dmg });
  // And the 2x cap headroom covers the special roll (anti-cheat parity).
  check('ranged special: special roll clears _maxDmgForAttacker special headroom',
    bowSpec.dmg <= room._maxDmgForAttacker(ps, true), { roll: bowSpec.dmg, cap: room._maxDmgForAttacker(ps, true) });
  Math.random = origRandom;
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
  // v2.3.1451 (bench-locked): the crit-dmg value is the BANKED flat —
  // build it with the real replay helper, assert the exact delta.
  ps.weaponSpecs = { sword: { executioner: 99 } };
  ps.t2Flat = _replay(ps);
  const _expCritFlat = ps.t2Flat.sword.executioner;
  const boosted = room._computeAttackDamage(ps, 'melee', false);
  // Max-variance, max-channel roll must stay under the anti-cheat ceiling.
  ps.weaponSpecs = { sword: { edge: 99, executioner: 99 } };
  ps.t2Flat = _replay(ps);
  Math.random = () => 0.999999;
  const maxRoll = room._computeAttackDamage(ps, 'melee', false);
  Math.random = origRandom;
  check('critDmg: helper reads executioner points', room._wpnCritDmgPts(ps, 'sword') === 99);
  check('critDmg: both rolls crit under a forced roll', plain.isCrit === true && boosted.isCrit === true);
  const delta = boosted.dmg - plain.dmg;
  check('critDmg: 99 executioner pts add exactly their banked flat on the crit', Math.abs(delta - _expCritFlat) <= 1, { delta, expected: _expCritFlat });
  check('critDmg: maxed edge+executioner crit clears the anti-cheat ceiling',
    maxRoll.dmg <= room._maxDmgForAttacker(ps, false),
    { roll: maxRoll.dmg, cap: room._maxDmgForAttacker(ps, false) });
}

// ── 6e. v2.3.1343 (kid-simple reprice): damage channel is FLAT
// +1/pt added POST-tier POST-variance — "+N damage on every swing".
// Unlike the pre-v2.3.1153 flat (inside the tierMult product), the
// bonus must NOT scale with tier: the delta is the same +99 at tier
// 3.24 as at tier 1.  The anti-cheat ceiling carries the same +100
// flat (maxed channel) — forgetting it would reject legit hits.
{
  const ps = { power: 200, weapon: { type: 'sword', tierMult: 3.24 }, activeSlot: 'melee', weaponSpecs: {} };
  const origRandom = Math.random;
  Math.random = () => 0.5;   // fixed mid variance; 0.5 > 20% crit chance -> no crit
  const plain = room._computeAttackDamage(ps, 'melee', false);
  // v2.3.1451 (bench-locked): the roll adds the BANKED flat, still
  // post-tier post-variance — the tier-independence contract holds.
  ps.weaponSpecs = { sword: { edge: 99 } };
  ps.t2Flat = _replay(ps);
  const _edgeFlat = ps.t2Flat.sword.edge;
  const priced = room._computeAttackDamage(ps, 'melee', false);
  ps.weapon.tierMult = 1;
  const pricedT1 = room._computeAttackDamage(ps, 'melee', false);
  ps.weaponSpecs = {}; ps.t2Flat = undefined;
  const plainT1 = room._computeAttackDamage(ps, 'melee', false);
  ps.weapon.tierMult = 3.24;
  Math.random = origRandom;
  check('reprice: 99 edge pts add exactly their banked flat (post-tier)',
    Math.abs((priced.dmg - plain.dmg) - _edgeFlat) <= 1, { delta: priced.dmg - plain.dmg, _edgeFlat });
  check('reprice: the banked flat is tier-independent (same delta at tier 1)',
    Math.abs((pricedT1.dmg - plainT1.dmg) - _edgeFlat) <= 1, pricedT1.dmg - plainT1.dmg);
  // Ceiling guard: a maxed-channel roll must clear the weapon bound.
  ps.weaponSpecs = { sword: { edge: 100 } };
  ps.t2Flat = _replay(ps);
  Math.random = () => 0.999999;
  const maxFlatRoll = room._computeAttackDamage(ps, 'melee', false);
  Math.random = origRandom;
  check('reprice: maxed flat-channel roll clears the anti-cheat weapon ceiling',
    maxFlatRoll.dmg <= room._maxDmgForAttacker(ps, false),
    { roll: maxFlatRoll.dmg, cap: room._maxDmgForAttacker(ps, false) });
  ps.weaponSpecs = {}; ps.t2Flat = undefined;
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

// ── 8. v2.3.1159: unequip_request + active-slot repair ──
// The loadout menu now mirrors unequips to the worker.  Assert the
// server contract end to end: weapon moves to stash, the dangling
// activeSlot pointer is repaired to melee, and the damage roll falls
// back to fists instead of the phantom bow (the live playtest bug).
{
  const sessA = room.sessions.get(wsA);
  psA.dead = false; psA.dying = false;
  psA.weapon = null;
  psA.rangedWeapon = { type: 'bow', tierMult: 2, name: 'test bow' };
  psA.weaponStash = [];
  psA.activeSlot = 'ranged';
  room._handleUnequipRequest(sessA, { slot: 'rangedWeapon' });
  check('unequip: rangedWeapon nulled + moved to stash',
    psA.rangedWeapon === null && psA.weaponStash.length === 1
    && psA.weaponStash[0].name === 'test bow',
    { slot: psA.rangedWeapon, stash: psA.weaponStash });
  check('unequip: dangling activeSlot repaired to melee',
    psA.activeSlot === 'melee', psA.activeSlot);
  // Damage resolution after the unequip: activeSlot melee + empty
  // weapon slot = the fists fallback (greatsword-type base, tierMult 1),
  // NOT the stashed bow's tierMult 2 / agility scaling.
  psA.power = 0; psA.agility = 200; psA.weaponSpecs = {};
  const rolls = [];
  for (let i = 0; i < 12; i++) rolls.push(room._computeAttackDamage(psA, undefined, false).dmg);
  const fistMax = Math.ceil(room._weaponEffBase('greatsword', null) * 1.25 * 2); // variance top + crit headroom
  check('unequip: damage roll uses the fists fallback, not the stashed bow',
    rolls.every((d) => d <= fistMax), { rolls, fistMax });
  // Unequipping the MELEE slot needs no repair: empty melee IS fists.
  psA.weapon = { type: 'sword', tierMult: 1 };
  room._handleUnequipRequest(sessA, { slot: 'weapon' });
  check('unequip: melee slot unequips without touching activeSlot',
    psA.weapon === null && psA.activeSlot === 'melee', psA.activeSlot);
  // Staff slot unequip while active repairs too.
  psA.staffWeapon = { type: 'staff', tierMult: 1 };
  psA.activeSlot = 'staff';
  room._handleUnequipRequest(sessA, { slot: 'staffWeapon' });
  check('unequip: staff slot repair to melee',
    psA.staffWeapon === null && psA.activeSlot === 'melee', psA.activeSlot);
  // Non-active slot unequip must NOT touch activeSlot.
  psA.rangedWeapon = { type: 'bow', tierMult: 1 };
  psA.weapon = { type: 'sword', tierMult: 1 };
  psA.activeSlot = 'melee';
  room._handleUnequipRequest(sessA, { slot: 'rangedWeapon' });
  check('unequip: non-active slot leaves activeSlot alone',
    psA.rangedWeapon === null && psA.activeSlot === 'melee', psA.activeSlot);
}

// ── v2.3.1314: Resilience + Last Stand (HP grid goes fully live) ──
{
  // v2.3.1451 (bench-locked): Resilience soaks its BANKED flat off
  // hits ABOVE 20% of maxHp; small hits untouched.
  const ps = { hp: 200, maxHp: 200, agility: 0, z: 'meadow', hpSpec: { resilience: 100 } };
  ps.t2Flat = _replay(ps);
  const _resFlat = ps.t2Flat.hp.resilience;
  const _bigHit = Math.max(_resFlat, Math.ceil(0.20 * ps.maxHp) + 1); // above the 20% gate, fully soakable
  const big = room._applyDamage(ps, _bigHit, false);
  check('resilience: big hit soaked to the floor by the banked flat',
    big.dmgTaken === Math.max(1, _bigHit - _resFlat) && ps.hp === 200 - big.dmgTaken, { big, _resFlat, _bigHit });
  const _hpAfterBig = ps.hp;
  const small = room._applyDamage(ps, 30, false); // 30 <= 40 -> untouched
  check('resilience: small hit untouched', small.dmgTaken === 30 && ps.hp === _hpAfterBig - 30, small);

  // Last Stand: a killing blow leaves exactly 1 HP, once per cooldown.
  const ps2 = { hp: 50, maxHp: 100, agility: 0, z: 'meadow', hpSpec: { laststand: 100 } };
  const saved = room._applyDamage(ps2, 500, false);
  check('last stand: lethal hit leaves 1 HP', saved.lastStand === true && ps2.hp === 1, { hp: ps2.hp, saved });
  check('last stand: cooldown armed (20s floor at 100 pts, v2.3.1343)',
    ps2._lastStandReadyAt > Date.now() + 15000 && ps2._lastStandReadyAt <= Date.now() + 20000, ps2._lastStandReadyAt - Date.now());
  const dead = room._applyDamage(ps2, 500, false);
  check('last stand: second lethal inside cooldown kills', !dead.lastStand && ps2.hp === 0, { hp: ps2.hp, dead });

  // Zero points = no save.
  const ps3 = { hp: 10, maxHp: 100, agility: 0, z: 'meadow', hpSpec: {} };
  const plain = room._applyDamage(ps3, 500, false);
  check('last stand: no points, no save', !plain.lastStand && ps3.hp === 0, plain);

  // Server sanitize accepts the laststand key (v2.3.1314 HP_CHANNEL_KEYS).
  const psS = { vitality: 100 };
  const spec = room._sanitizeHpSpec({ vigor: 10, laststand: 20 }, psS);
  check('sanitize: laststand key stored', spec && spec.laststand === 20, spec);
}

/* ── v2.3.1562: stuck-at-zero death recovery (owner: "I just died and it
   didn't return me to town — stuck at 0 HP, could still mine") ── */
{
  const ws = fakeWs('stuck');
  room._wsBySessionId = (id) => (id === 'stuck1' || id === 'stuck2' ? ws : null);

  // A live player sitting at 0 HP that the damage-time death check never
  // saw: the respawn tick must start the death flow for them.
  room.playerState['stuck1'] = { hp: 0, maxHp: 100, z: 'frost', inventory: { ore: 3 }, x: 10, y: 10 };
  room._tickPlayerRespawn();
  const ps1 = room.playerState['stuck1'];
  check('stuck-at-zero: respawn tick starts the death flow',
    ps1.dying === true && ps1.respawnAt > Date.now(), { dying: ps1.dying, respawnAt: ps1.respawnAt });
  check('stuck-at-zero: player_died reaches the client',
    msgsOfType(ws, 'player_died').length === 1, ws.sent.map((m) => m.type));

  // ...and the respawn itself still lands once the window elapses.
  ps1.respawnAt = Date.now() - 1;
  room._tickPlayerRespawn();
  check('stuck-at-zero: respawn returns the player to town',
    ps1.dying === false && ps1.hp === ps1.maxHp && ps1.z === 'town',
    { dying: ps1.dying, hp: ps1.hp, z: ps1.z });

  // A healthy player is never swept.
  room.playerState['well'] = { hp: 50, maxHp: 100, z: 'frost' };
  room._tickPlayerRespawn();
  check('stuck-at-zero: a living player is left alone', !room.playerState['well'].dying);

  // A throwing optional hook must not cost the player their death
  // notification — that was the shape of the original outage.
  const pileOrig = room._spawnDeathPile;
  room._spawnDeathPile = () => { throw new Error('boom'); };
  ws.sent.length = 0;
  room.playerState['stuck2'] = { hp: 0, maxHp: 100, z: 'frost', inventory: { ore: 1 }, x: 1, y: 1 };
  room._tickPlayerRespawn();
  const ps2b = room.playerState['stuck2'];
  check('death flow: a throwing hook still sends player_died',
    msgsOfType(ws, 'player_died').length === 1 && ps2b.dying === true,
    { sent: ws.sent.map((m) => m.type), dying: ps2b.dying });
  check('death flow: inventory still wiped after a failing pile spawn',
    Object.keys(ps2b.inventory || {}).length === 0, ps2b.inventory);
  room._spawnDeathPile = pileOrig;
  delete room.playerState['stuck1'];
  delete room.playerState['stuck2'];
  delete room.playerState['well'];
}

// ── 11. v2.3.1607: the regen tick coalesces its DURABLE writes ──
// The regen loop runs every ~670 ms and used to _saveRpg on every
// player whose pools moved — measured at 5,855 storage writes per
// player-hour, 93% of them from that one line.  Cloudflare bills those
// as rows written (100k/day free, $1.00/M paid), so it was the single
// most expensive thing the server did.  It now writes at most once per
// REGEN_SAVE_MS.  These assertions pin BOTH halves of the deal: far
// fewer storage writes, and an unchanged wire cadence.
{
  const puts = [];
  const origPut = mockState.storage.put;
  mockState.storage.put = async (k, v) => { puts.push([k, v]); return origPut(k, v); };
  const rpgPuts = (id) => puts.filter(([k]) => k === 'rpg:' + id);

  // Park every other player so only 'pa' can produce a regen write.
  const others = Object.keys(room.playerState).filter((k) => k !== 'pa');
  const parked = Object.create(null);
  for (const k of others) { parked[k] = room.playerState[k]; delete room.playerState[k]; }

  psA.z = 'town'; psA.dying = false; psA.dead = false; psA.disconnected = false;
  psA.maxHp = 100; psA.maxStamina = 100; psA.maxMana = 100; psA.blocking = false;
  psA._arenaMatch = null; psA._regenSaveAt = 0; psA._regenDirty = false;
  room.pendingPlayerStateFlush.clear();

  // 20 regen ticks (~13 s of game time) crammed into one window.
  for (let i = 0; i < 20; i++) { psA.hp = 50; room._tickPlayerRegen(); }
  check('regen throttle: 20 regen ticks inside the window write storage ONCE',
    rpgPuts('pa').length === 1, rpgPuts('pa').length);
  check('regen throttle: the WIRE cadence is untouched — still queued every tick',
    room.pendingPlayerStateFlush.has('pa'), [...room.pendingPlayerStateFlush]);
  check('regen throttle: the skipped ticks are remembered as dirty',
    psA._regenDirty === true, psA._regenDirty);
  check('regen throttle: the scratch bookkeeping never reaches storage',
    !!rpgPuts('pa')[0] && !('_regenSaveAt' in rpgPuts('pa')[0][1]) && !('_regenDirty' in rpgPuts('pa')[0][1]),
    rpgPuts('pa')[0] && Object.keys(rpgPuts('pa')[0][1]).filter((k) => k.startsWith('_regen')));

  // Past the window, writes resume — this is a throttle, not a mute.
  puts.length = 0;
  psA._regenSaveAt = Date.now() - room.REGEN_SAVE_MS - 1;
  psA.hp = 50; room._tickPlayerRegen();
  check('regen throttle: a tick past REGEN_SAVE_MS writes again',
    rpgPuts('pa').length === 1, puts.map(([k]) => k));
  check('regen throttle: that write clears the dirty flag',
    psA._regenDirty === false, psA._regenDirty);

  // A value-bearing save inside the window already persisted the pools
  // (_saveRpg rewrites the whole blob), so the regen tick must not add
  // a second, redundant one.
  puts.length = 0;
  psA.coins = (psA.coins || 0) + 5;
  await room._saveRpg('pa', psA);
  psA.hp = 50; room._tickPlayerRegen();
  check('regen throttle: a value-bearing save inside the window blocks a redundant regen write',
    rpgPuts('pa').length === 1, puts.map(([k]) => k));

  // Disconnect flush: pools that moved inside the window must not roll
  // back on the next join.  This is the ONE place coalescing could be
  // felt by a player, so it is closed explicitly.
  const wsZ = fakeWs('dirty-leaver');
  room.sessions.set(wsZ, { ...baseSession(), id: 'pz' });
  room.playerState['pz'] = { hp: 40, maxHp: 100, z: 'town', coins: 7, _regenDirty: true };
  puts.length = 0;
  await room.webSocketClose(wsZ);
  check('regen throttle: disconnect flushes coalesced regen',
    rpgPuts('pz').length === 1, puts.map(([k]) => k));
  check('regen throttle: the flushed blob carries the regenerated pools',
    rpgPuts('pz')[0] && rpgPuts('pz')[0][1].hp === 40, rpgPuts('pz')[0] && rpgPuts('pz')[0][1].hp);

  // …and a clean disconnect stays free: no write amplification on the
  // common path, where the last save was value-bearing anyway.
  const wsY = fakeWs('clean-leaver');
  room.sessions.set(wsY, { ...baseSession(), id: 'py' });
  room.playerState['py'] = { hp: 40, maxHp: 100, z: 'town', coins: 7, _regenDirty: false };
  puts.length = 0;
  await room.webSocketClose(wsY);
  check('regen throttle: a clean disconnect writes nothing',
    rpgPuts('py').length === 0, puts.map(([k]) => k));

  mockState.storage.put = origPut;
  for (const k of others) room.playerState[k] = parked[k];
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
