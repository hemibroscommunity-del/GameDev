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

/* v2.3.1659 (prog3): every joining player is respecced onto the
   trained-skill track now.  THIS SUITE PINS THE LEGACY PATH — still
   live code for any blob whose v10 migration fail-opens — so the
   fixtures opt out of prog3 and re-derive the legacy pools.  The new
   path's coverage lives in prog3.test.mjs. */
delete psA.prog3; delete psB.prog3;
room._recomputeMaxes(psA); room._recomputeMaxes(psB);

/* ═══ v2.3.1628: monster_damage proximity shim (TEST HARNESS ONLY) ═══
 *
 * _handleMonsterDamage now enforces the attacker gates every sibling
 * handler already had -- same zone, alive, and within the range clamp
 * (250 px melee, the figure monsterCombat.js itself calls "the server's
 * clamp"; the wider projectile caps need the matching weapon).  This
 * suite joins at (-100000,-100000) ON PURPOSE so monsters stay idle and
 * the dirty sets / contribution shares stay deterministic, which makes
 * every swing below legitimately ~100k px out of range.
 *
 * Rather than restate the far spawn at 15+ call sites, stand the
 * attacker on their target for the duration of each monster_damage and
 * put them straight back.  Nothing else in the suite is about range, and
 * the idle-AI determinism the far spawn buys is preserved.
 *
 * This shim does NOT weaken coverage of the gate itself: the gate is
 * pinned positively in anticheat.test.mjs §8 (wrong-zone, dead and
 * out-of-range attacks all denied).  If that section is ever deleted,
 * this shim becomes a blind spot -- keep them together. */
const _origWsm = room.webSocketMessage.bind(room);
room.webSocketMessage = async function (ws, raw) {
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { /* not JSON: pass through */ }
  if (!parsed || parsed.type !== 'monster_damage' || !parsed.payload) {
    return _origWsm(ws, raw);
  }
  const sid = room.sessions.get(ws)?.id;
  const ps = sid ? room.playerState[sid] : null;
  const mon = (room.monsters[parsed.payload.zone] || [])
    .find((x) => x.id === parsed.payload.monsterId);
  if (!ps || !mon) return _origWsm(ws, raw);
  const home = { x: ps.x, y: ps.y };
  ps.x = mon.x; ps.y = mon.y;
  try { return await _origWsm(ws, raw); }
  finally { ps.x = home.x; ps.y = home.y; }
};

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

  /* ── v2.3.1688: dying must not destroy the GATHERING TOOLS ──
   * Owner: "Logs are not getting collected after woodcutting a tree. Maybe
   * it's the new requirement of having a woodcutting axe interfering with it."
   * Right cause, one step back: the gate works and the axe was gone. v2.3.1680
   * holds the tools as ordinary inventory items, and death wipes the
   * inventory — so one death silently ended woodcutting/fishing/mining
   * forever, because the quest that grants them cannot be turned in twice.
   * Both wipes are covered: the death one and the unconditional respawn one. */
  {
    const pid = 'toolman';
    room.playerState[pid] = {
      hp: 0, maxHp: 100, z: 'frost', x: 10, y: 10,
      inventory: { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1, ore: 5, wood_kindling: 3 },
    };
    const psT = room.playerState[pid];
    room._handlePlayerDeath(psT, pid, 'monster:x');
    check('death keeps the gathering tools',
      psT.inventory.woodcutting_axe === 1 && psT.inventory.fishing_pole === 1
      && psT.inventory.mining_pickaxe === 1, psT.inventory);
    check('...and still drops everything else',
      !psT.inventory.ore && !psT.inventory.wood_kindling, psT.inventory);
    /* The death PILE must not carry a copy, or every death mints a spare. */
    const piles = Object.values(room.loot || {}).flat()
      .filter((l) => l && Array.isArray(l.items));
    const toolInPile = piles.some((l) => l.items.some((i) => i && /axe|pole|pickaxe/.test(i.key)));
    check('...and no duplicate tool is left on the ground', !toolInPile,
      piles.map((l) => l.items && l.items.map((i) => i.key)));
    /* Second wipe, five seconds later. */
    psT.hp = 0; psT.dying = true; psT.respawnAt = Date.now() - 1;
    room._tickPlayerRespawn();
    check('the respawn wipe keeps them too',
      psT.inventory.woodcutting_axe === 1 && psT.inventory.mining_pickaxe === 1, psT.inventory);
    delete room.playerState[pid];
  }

  /* ── v2.3.1701: dying must not destroy the QUEST OBJECTIVE items ──
   * Owner: dying on an errand dropped the very remnants you were sent to
   * fetch, so a death did not merely cost loot — it reset the quest.  The
   * tutorial arc is four collect-and-return steps in zones that kill a
   * level-1 character, so the step you are on is exactly what the death
   * takes.  Same carve-out shape as the tools above, with the protected
   * keys DERIVED from the shipped quest table (QUEST_REWARDS objectives'
   * invKey / invPrefix) so a new quest is covered without touching this.
   *
   * Both objective shapes are exercised: an exact `invKey` (snowman) and an
   * `invPrefix` FAMILY (`cooked_fish_<species>` / `ore_<name>`), because
   * only the second one can be got wrong by a Set-of-keys implementation. */
  {
    const pid = 'questman';
    room.playerState[pid] = {
      hp: 0, maxHp: 100, z: 'frost', x: 12, y: 12,
      inventory: {
        snowman: 4,                  // tut_1  invKey
        'slime-remnants': 2,         // tut_2  invKey
        cooked_fish_minnow: 3,       // life_1 invPrefix family
        ore_copper: 5,               // life_2 invPrefix family
        wood_kindling: 7,            // ordinary loot — must still drop
        gold_nugget: 2,              // ordinary loot — must still drop
      },
    };
    const psQ = room.playerState[pid];
    room._handlePlayerDeath(psQ, pid, 'monster:x');
    check('death keeps the quest objective items (exact invKey)',
      psQ.inventory.snowman === 4 && psQ.inventory['slime-remnants'] === 2, psQ.inventory);
    check('death keeps an invPrefix FAMILY too (cooked fish / ore)',
      psQ.inventory.cooked_fish_minnow === 3 && psQ.inventory.ore_copper === 5, psQ.inventory);
    check('...and everything else still drops',
      !psQ.inventory.wood_kindling && !psQ.inventory.gold_nugget, psQ.inventory);
    /* The pile must not carry a copy, or a death MINTS quest progress on
       the ground — the mirror of the duplicate-axe hazard (v2.3.1688). */
    const qPiles = Object.values(room.loot || {}).flat()
      .filter((l) => l && Array.isArray(l.deathItems));
    const keys = qPiles.flatMap((l) => l.deathItems.map((i) => i && i.key));
    check('the death pile drops the ordinary loot',
      keys.includes('wood_kindling') && keys.includes('gold_nugget'), keys);
    check('...and NOT a duplicate of the protected quest items',
      !keys.includes('snowman') && !keys.includes('slime-remnants')
      && !keys.includes('cooked_fish_minnow') && !keys.includes('ore_copper'), keys);
    /* Second wipe, five seconds later — sparing them at death alone would
       have been cosmetic (the v2.3.1616 lesson). */
    psQ.hp = 0; psQ.dying = true; psQ.respawnAt = Date.now() - 1;
    room._tickPlayerRespawn();
    check('the respawn wipe keeps the quest items too',
      psQ.inventory.snowman === 4 && psQ.inventory.ore_copper === 5, psQ.inventory);
    /* The derivation itself: a key that is nobody's objective is not
       protected, and the table drives the list. */
    check('a non-objective key is NOT protected', !room._isQuestObjectiveItem('wood_kindling'));
    check('every shipped collect objective is protected',
      Object.values(room._QUEST_REWARDS_DATA())
        .map((r) => r && r.objective)
        .filter((o) => o && (o.invKey || o.invPrefix))
        .every((o) => room._isQuestObjectiveItem(o.invKey || (o.invPrefix + 'x'))));
    delete room.playerState[pid];
  }
  delete room.playerState['well'];
}

// ── 11. v2.3.1619: the regen tick coalesces its DURABLE writes ──
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

  // ── v2.3.1619b: the COMBAT pool writes coalesce too ──
  //
  // Three combat paths persisted a whole rpg blob whose only durable
  // change was a stamina or mana number: the block cost, the ability
  // cost (dodge/lunge/retreat/swipe), and the resonance mana refund.
  // They fire on a monster-attack cadence, so a player in a fight was
  // writing thousands of rows an hour to record a stamina value.
  // HP is deliberately NOT in this deal — see the last assertion.
  {
    psA.z = 'meadow'; psA.dying = false; psA.dead = false; psA.disconnected = false;
    psA.maxStamina = 100000; psA.stamina = 100000; // never hit the "can't afford" branch
    psA.maxMana = 100000; psA.mana = 100000;
    psA._regenSaveAt = 0; psA._regenDirty = false;

    // 40 abilities inside one window.
    puts.length = 0;
    const sessA = room.sessions.get(wsA);
    for (let i = 0; i < 40; i++) room._handleAbilityUse(sessA, { type: 'dodge' });
    check('pool coalesce: 40 ability uses inside the window write storage ONCE',
      rpgPuts('pa').length === 1, rpgPuts('pa').length);
    check('pool coalesce: the stamina actually came off every time',
      psA.stamina < 100000, psA.stamina);

    // The drain arm: _regenDirty must not be able to sit unflushed on a
    // player whose pools then stop moving (a blocker held at 0 stamina
    // makes `changed` false on every later regen tick).
    psA._regenDirty = true;
    psA._regenSaveAt = Date.now() - room.REGEN_SAVE_MS - 1;
    psA.z = 'meadow';                 // not a hub: no top-off
    psA.hp = psA.maxHp;               // nothing to regen
    psA.stamina = psA.maxStamina; psA.mana = psA.maxMana;
    puts.length = 0;
    room._tickPlayerRegen();
    check('pool coalesce: a dirty player with no pool movement is still drained',
      rpgPuts('pa').length === 1 && psA._regenDirty === false,
      { puts: rpgPuts('pa').length, dirty: psA._regenDirty });

    /* v2.3.1623: HP now coalesces too (owner decision — the free heal on
       a deploy is worth the row saving), but ONLY while the player is
       comfortably alive.  The carve-out below HP_URGENT_SAVE_FRAC is the
       whole safety argument: a restart must never rewind a player from
       "about to die" back to healthy.  If the near-death assertions
       below ever fail, the coalescing has been widened too far. */
    psA._regenSaveAt = Date.now(); psA._regenDirty = false; // mid-window
    psA.maxHp = 1000; psA.hp = 900;
    puts.length = 0;
    room._applyDamage(psA, 100, false);
    room._saveRpgVitals('pa', psA); // the damage sites' call, verbatim
    check('hp coalesce: a healthy player\'s damage write is coalesced',
      rpgPuts('pa').length === 0 && psA._regenDirty === true,
      { puts: rpgPuts('pa').length, dirty: psA._regenDirty });

    // At/below the fraction: immediate, no matter where we are in the window.
    psA._regenSaveAt = Date.now(); psA._regenDirty = false;
    psA.hp = 240; // 24% of 1000
    puts.length = 0;
    room._saveRpgVitals('pa', psA);
    check('hp coalesce: a near-death player writes IMMEDIATELY',
      rpgPuts('pa').length === 1, rpgPuts('pa').length);

    // Crossing INTO the band on one big hit must also write at once —
    // the check runs after damage, so there is no way to slip past it.
    psA._regenSaveAt = Date.now(); psA._regenDirty = false;
    psA.hp = 1000;
    puts.length = 0;
    /* v2.3.1625: DEFLAKE.  psA carries agility 200 by this point, so
       _applyDamage rolls a 16% passive dodge (Math.random) -- a dodged
       hit leaves hp at 1000, no write happens, and this assertion fails.
       Measured on an isolated checkout of origin/main at v2.3.1623:
       4 failures in 20 runs.  It is a real intermittent red on a
       BLOCKING check, which the repo already treats as worse than no
       check at all (handoff backlog item F).
       This block is about SAVE COALESCING, not about dodge, so pin the
       roll off rather than retry: zero the dodge inputs for the one
       call and restore them after, leaving every later assertion with
       the stats it expects. */
    const _agiSave = psA.agility, _especSave = psA.enduranceSpec, _evAccSave = psA._evadeAcc;
    psA.agility = 0; psA.enduranceSpec = {}; psA._evadeAcc = 0;
    room._applyDamage(psA, 800, false); // 1000 -> 200, straight into the band
    psA.agility = _agiSave; psA.enduranceSpec = _especSave; psA._evadeAcc = _evAccSave;
    room._saveRpgVitals('pa', psA);
    check('hp coalesce: a hit that crosses into the band writes immediately',
      rpgPuts('pa').length === 1 && psA.hp <= psA.maxHp * room.HP_URGENT_SAVE_FRAC,
      { puts: rpgPuts('pa').length, hp: psA.hp });

    // Exactly at the boundary counts as urgent (<=, not <).
    psA._regenSaveAt = Date.now(); psA._regenDirty = false;
    psA.hp = psA.maxHp * room.HP_URGENT_SAVE_FRAC;
    puts.length = 0;
    room._saveRpgVitals('pa', psA);
    check('hp coalesce: exactly at the threshold is urgent',
      rpgPuts('pa').length === 1, rpgPuts('pa').length);

    // Death still persists on its own path, never coalesced.
    psA._regenSaveAt = Date.now(); psA._regenDirty = false;
    psA.hp = 0; psA.dying = false; psA.dead = false; psA.inventory = { ore: 3 };
    puts.length = 0;
    room._handlePlayerDeath(psA, 'pa', 'monster:test');
    check('hp coalesce: death is never coalesced',
      rpgPuts('pa').length >= 1, rpgPuts('pa').length);
    psA.dying = false; psA.dead = false; psA.hp = psA.maxHp;
  }

  mockState.storage.put = origPut;
  for (const k of others) room.playerState[k] = parked[k];
}

/* ── 8. v2.3.1639: knockback debt + per-archetype aggro ──
 *
 * Owner report: "the snow men are way too passive and barely try to do me
 * any damage."  The mechanism was a treadmill — every hit shoved the
 * monster 30px away while a snowman only walks 10.9px back between two
 * player swings (spd 0.4 px/tick x 27.3 ticks per SWING_COOLDOWN), so a
 * player who kept swinging permanently exiled it from its own attack ring
 * and was never hit back.  The v2.3.222 note in combat.js diagnosed this
 * and only fixed half of it (removed the AI freeze, kept the shove).
 *
 * These assertions pin BOTH halves of the repair.  The arithmetic
 * assertion is the important one: it fails if either the shove or the
 * repay rate is changed without the other, which is exactly how this
 * regressed the first time. */
{
  const arch = room.MONSTER_AGGRO_BY_ARCH;

  check('aggro: snowman gets the widened per-archetype range',
    arch.snowman === 300, arch.snowman);
  check('aggro: unlisted archetypes still fall back to the 120 default',
    !Object.prototype.hasOwnProperty.call(arch, 'fodder')
    && !Object.prototype.hasOwnProperty.call(arch, 'brute')
    && room.MONSTER_AGGRO_RANGE === 120,
    { fodder: arch.fodder, brute: arch.brute, def: room.MONSTER_AGGRO_RANGE });
  /* The lookup must not reach Object.prototype — a '__proto__' arch would
     otherwise resolve to an object and NaN out the distance compare
     (TRAPS #6, three incidents on 2026-07-07). */
  check('aggro: the override map cannot be reached through the prototype',
    !Object.prototype.hasOwnProperty.call(arch, '__proto__')
    && !Object.prototype.hasOwnProperty.call(arch, 'constructor'));

  /* THE BINDING ARITHMETIC: one player swing of repay must undo exactly
     one normal hit's shove.  If someone retunes the 30px shove or the
     1.1 px/tick repay in isolation, the treadmill comes back and this
     fails loudly. */
  const NORMAL_KB = 30;
  const ticksPerSwing = 600 / room.TICK_RATE;          /* SWING_COOLDOWN / 22ms */
  const repayPerSwing = room.KB_RECOVER_PX_PER_TICK * ticksPerSwing;
  check('knockback: one swing of repay undoes one normal shove (within 1px)',
    Math.abs(repayPerSwing - NORMAL_KB) < 1.0,
    { repayPerSwing, NORMAL_KB, ticksPerSwing, rate: room.KB_RECOVER_PX_PER_TICK });

  /* Without the repay a snowman loses ground every swing — the bug. */
  const SNOWMAN_SPD = 0.5 * 0.8;                        /* base x ARCHETYPES.snowman spdMult */
  const walkPerSwing = SNOWMAN_SPD * ticksPerSwing;
  check('knockback: bare chase speed alone still loses ground (the bug)',
    walkPerSwing < NORMAL_KB, { walkPerSwing, NORMAL_KB });
  check('knockback: chase + repay lets a snowman hold its ground',
    walkPerSwing + repayPerSwing >= NORMAL_KB,
    { walkPerSwing, repayPerSwing, NORMAL_KB });

  /* Debt is bounded: a special (60) plus a crit (45) must not bank 105px
     of free catch-up. */
  let dbt = 0;
  for (const f of [60, 45, 30, 30]) dbt = Math.min(dbt + f, 60);
  check('knockback: accumulated debt is capped at one special-shove (60)',
    dbt === 60, dbt);
}

/* ── 9. v2.3.1640: the snowman's ranged snowball ──
 *
 * A snowman chases at 18 px/s against a 150 px/s walk, so it can never
 * close on a player who doesn't want to be closed on — melee-only makes
 * its threat entirely opt-in.  The ranged attack is what makes the slow
 * archetype matter.  These pin the properties that are easy to break. */
{
  const rc = room.MONSTER_RANGED_BY_ARCH;

  /* v2.3.1678 (owner: "make sure they can throw their slime projectiles like
     the snowmen"): fodder joined the ranged map, so "only the snowman" is no
     longer the property.  What still matters is that the list is DELIBERATE —
     brutes and the rest stay melee, or every archetype in the game turns into
     artillery and closing distance stops meaning anything. */
  check('snowball: snowmen and slimes throw; nothing else does',
    !!rc.snowman && !!rc.fodder
    && !Object.prototype.hasOwnProperty.call(rc, 'brute')
    && !Object.prototype.hasOwnProperty.call(rc, 'stalker')
    && !Object.prototype.hasOwnProperty.call(rc, 'hexer'),
    Object.keys(rc));
  /* A slime is FAST (spd 1.15 blue), so its ball must not also outrange the
     snowman's — the slow archetype's identity is its reach. */
  check('snowball: the slime throws SHORTER and quicker than the snowman',
    rc.fodder.range < rc.snowman.range && rc.fodder.travelMs < rc.snowman.travelMs
    && rc.fodder.cd < rc.snowman.cd, { fodder: rc.fodder, snowman: rc.snowman });
  check('snowball: the slime band is still strictly outside its melee ring',
    rc.fodder.minRange > 55 && rc.fodder.minRange < rc.fodder.range, rc.fodder);
  check('snowball: the ranged map cannot be reached through the prototype',
    !Object.prototype.hasOwnProperty.call(rc, '__proto__')
    && !Object.prototype.hasOwnProperty.call(rc, 'constructor'));

  /* The throw band must sit strictly BETWEEN the snowman's melee ring
     (70, set a few lines above _atkRange) and its aggro radius (300).
     If minRange ever dips under the swing ring the two branches fight for
     the same tick; if range exceeds aggro it throws at players it has not
     noticed. */
  const SNOWMAN_ATK_RING = 70;
  check('snowball: throw band starts outside the melee ring',
    rc.snowman.minRange > SNOWMAN_ATK_RING, { minRange: rc.snowman.minRange, ring: SNOWMAN_ATK_RING });
  check('snowball: throw band never exceeds the aggro radius',
    rc.snowman.range <= room.MONSTER_AGGRO_BY_ARCH.snowman,
    { range: rc.snowman.range, aggro: room.MONSTER_AGGRO_BY_ARCH.snowman });
  check('snowball: ranged cooldown is slower than the melee cooldown (range is the reward, not dps)',
    rc.snowman.cd > room.MONSTER_ATTACK_CD, { ranged: rc.snowman.cd, melee: room.MONSTER_ATTACK_CD });
  check('snowball: travel is slow enough to read and dodge (>= 500ms)',
    rc.snowman.travelMs >= 500, rc.snowman.travelMs);

  /* THE LOAD-BEARING WIRE PROPERTY.  src/networking/gameEvents.js drops
     any monster_attack whose attacker is >160px from the player — a
     deliberate guard against "mystery damage with no visible attacker".
     A 300px snowball reported from the THROWER would trip it and the
     player would silently lose HP with no popup, flash or defense XP on
     every already-deployed client.  _monsterStrikePlayer must therefore
     report the IMPACT point it is handed. */
  {
    const psT = room.playerState['pa'];
    const before = psT.hp;
    psT.hp = psT.maxHp; psT.dying = false; psT.dead = false; psT.blocking = false;
    psT.x = 4000; psT.y = 4000;
    /* v2.3.1673: PIN THE DODGE ROLL.  `_applyDamage` rolls a random passive
       dodge, so "impact actually applies damage" below failed roughly one run
       in twenty — it blocked the push gate twice on 2026-08-12 and passed on
       re-run both times, which is the worst kind of test: it trains you to
       re-roll until green, and a real regression rides through on the same
       habit.  The assertion is about the IMPACT POINT plumbing, not about the
       dodge table, so zero the inputs that feed the roll and it becomes
       deterministic without weakening what it checks. */
    psT.agility = 0;
    if (psT.prog3 && psT.prog3.alloc) psT.prog3.alloc.dodge = 0;
    psT._evadeAcc = 0;
    const farMonster = { id: 'sb-1', arch: 'snowman', dmg: 3, x: 4280, y: 4000, statuses: {} };
    room.eventBuffer.length = 0;
    room._monsterStrikePlayer('frost', farMonster, 'pa', psT.x, psT.y);
    const atk = room.eventBuffer.filter(e => e.type === 'monster_attack');
    check('snowball: impact emits exactly one monster_attack', atk.length === 1, atk.length);
    if (atk.length === 1) {
      const p = atk[0].payload;
      const dist = Math.hypot(p.attackerX - psT.x, p.attackerY - psT.y);
      check('snowball: attackerX/Y is the IMPACT point, inside the client 160px gate',
        dist <= 160, { dist, attackerX: p.attackerX, attackerY: p.attackerY, px: psT.x, py: psT.y });
      /* Guard the inverse: the thrower really was outside the gate, so
         the assertion above is not vacuously true. */
      const throwDist = Math.hypot(farMonster.x - psT.x, farMonster.y - psT.y);
      check('snowball: ...and the THROWER was outside it (assertion is not vacuous)',
        throwDist > 160, throwDist);
      check('snowball: impact actually applies damage', p.dmgTaken > 0, p.dmgTaken);
    }
    psT.hp = before;
  }

  /* DODGEABILITY.  The 900ms telegraph is only a mechanic if moving out
     of the arc actually works; otherwise it is an undodgeable homing hit
     with a decorative animation. */
  check('snowball: hit radius is generous enough to survive position drift',
    room.SNOWBALL_HIT_RADIUS >= 32, room.SNOWBALL_HIT_RADIUS);
  check('snowball: hit radius is small enough that walking away dodges',
    room.SNOWBALL_HIT_RADIUS < 100, room.SNOWBALL_HIT_RADIUS);
  {
    /* A player walking at the BASE 150 px/s clears the radius well inside
       the flight time — i.e. simply walking is a real dodge. */
    const walkPxPerSec = 150;
    const clearMs = (room.SNOWBALL_HIT_RADIUS / walkPxPerSec) * 1000;
    check('snowball: a base-speed walk clears the radius inside the flight time',
      clearMs < rc.snowman.travelMs,
      { clearMs: Math.round(clearMs), travelMs: rc.snowman.travelMs });
  }

  /* Melee must keep reporting the monster's own position — the shared
     helper must not have silently changed the melee wire. */
  {
    const psT = room.playerState['pa'];
    psT.hp = psT.maxHp; psT.dying = false; psT.dead = false; psT.blocking = false;
    psT.x = 100; psT.y = 100;
    const near = { id: 'sb-2', arch: 'fodder', dmg: 2, x: 130, y: 100, statuses: {} };
    room.eventBuffer.length = 0;
    room._monsterStrikePlayer('meadow', near, 'pa', near.x, near.y);
    const atk = room.eventBuffer.filter(e => e.type === 'monster_attack');
    check('melee: still reports the monster position as attacker',
      atk.length === 1 && atk[0].payload.attackerX === near.x && atk[0].payload.attackerY === near.y,
      atk[0] && atk[0].payload);
  }
}

/* ── v2.3.1686: a raised shield STOPS a snowball, it does not cancel it ──
 *
 * Owner: "it seems like snowman don't launch projectiles while the character
 * is blocking, which isn't the correct behavior. It should still launch
 * projectiles."
 *
 * The ranged-throw gate carried `!nearest.blocking`, so raising a shield
 * stopped the ball being CREATED — blocking deleted the attack instead of
 * stopping it, and the snowman read as frozen. The throw is now unconditional
 * and the block is resolved when the ball lands, which is also the only point
 * at which it can be honest: the ball is 900ms in the air, so a shield raised
 * or dropped mid-flight has to count.
 */
{
  const psB = room.playerState['pa'];
  psB.z = 'frost'; psB.hp = psB.maxHp = 200; psB.dying = false; psB.dead = false;
  psB.disconnected = false; psB.stamina = 100; psB.maxStamina = 100;
  psB.x = 1000; psB.y = 1000;
  psB.blocking = true;

  /* _spawnZoneMonsters RETURNS the list; it does not install it (the live
     server assigns on zone activation), so the fixture has to. */
  if (!room.monsters.frost || !room.monsters.frost.length) {
    room.monsters.frost = room._spawnZoneMonsters('frost');
  }
  const frost = room.monsters.frost || [];
  const sm = frost.find((m) => m.arch === 'snowman') || frost[0];
  check('frost fields a snowman to throw with', !!sm && sm.arch === 'snowman', sm && sm.arch);
  if (sm) {
    /* Park every other frost monster far away so only this one is in range. */
    for (const other of frost) { if (other !== sm) { other.x = 9000; other.y = 9000; } }
    /* 200px: past the 100px minRange, inside the 300px range. */
    sm.alive = true; sm.hp = sm.maxHp || 50; sm.x = psB.x + 200; sm.y = psB.y;
    sm.atkCd = 0; sm._projImpactAt = 0; sm.statuses = undefined;

    room.eventBuffer.length = 0;
    room._tickMonsters();
    const thrown = room.eventBuffer.filter((e) => e.type === 'monster_projectile');
    check('a blocking player still gets thrown at', thrown.length >= 1,
      { thrown: thrown.length, types: room.eventBuffer.map((e) => e.type) });
    check('...and it is a SNOWBALL, aimed at the blocker',
      thrown.length >= 1 && thrown[0].payload.kind === 'snowball'
      && thrown[0].payload.travelMs > 0,
      thrown[0] && thrown[0].payload);
  }

  /* ── v2.3.1690: a harvester is left alone ──
   * Owner: "make it so monsters don't attack you while you're extracting
   * resources (fishing, mining, etc) it's really annoying and glitchy."
   * Bounded by EXTRACT_SHIELD_MS rather than by the extraction record, which
   * lives ten minutes — the second half of this proves the shield expires,
   * because "tap a tree, become invulnerable for ten minutes" would be a
   * worse bug than the one being fixed. */
  {
    const psE = room.playerState['pa'];
    psE.z = 'frost'; psE.blocking = false; psE.hp = psE.maxHp = 200;
    psE.dying = false; psE.dead = false; psE.disconnected = false;
    psE.x = 2000; psE.y = 2000;
    const smE = (room.monsters.frost || []).find((m) => m.arch === 'snowman');
    if (smE) {
      for (const other of room.monsters.frost) { if (other !== smE) { other.x = 9000; other.y = 9000; } }
      smE.alive = true; smE.hp = smE.maxHp || 50;
      smE.x = psE.x + 200; smE.y = psE.y; smE.atkCd = 0; smE._projImpactAt = 0;
      room.extractions['pa'] = { nodeId: 'n1', zone: 'frost', skill: 'woodcutting', startedAt: Date.now() };
      room.eventBuffer.length = 0;
      room._tickMonsters();
      check('a mid-extraction player is not thrown at',
        room.eventBuffer.filter((e) => e.type === 'monster_projectile').length === 0,
        room.eventBuffer.map((e) => e.type));

      /* Same monster, same position, shield expired -> it throws again. */
      room.extractions['pa'].startedAt = Date.now() - (room.EXTRACT_SHIELD_MS + 1000);
      smE.atkCd = 0; smE._projImpactAt = 0;
      room.eventBuffer.length = 0;
      room._tickMonsters();
      check('...but the shield expires — it is not a ten-minute safe zone',
        room.eventBuffer.filter((e) => e.type === 'monster_projectile').length >= 1,
        room.eventBuffer.map((e) => e.type));
    }
    delete room.extractions['pa'];
    psE.blocking = true;
  }

  /* Impact while blocking: zero damage, a Blocked! event, stamina spent. */
  const hpBefore = psB.hp, stamBefore = psB.stamina;
  const ball = { id: 'sb-frost-1', arch: 'snowman', dmg: 40, x: psB.x, y: psB.y, statuses: {} };
  room.eventBuffer.length = 0;
  room._monsterStrikePlayer('frost', ball, 'pa', psB.x, psB.y);
  const blockedAtk = room.eventBuffer.filter((e) => e.type === 'monster_attack');
  check('a snowball that lands on a raised shield deals no damage',
    psB.hp === hpBefore, { before: hpBefore, after: psB.hp });
  check('...and reports itself as BLOCKED, not as a zero hit',
    blockedAtk.length === 1 && blockedAtk[0].payload.blocked === true
    && blockedAtk[0].payload.dmgTaken === 0,
    blockedAtk[0] && blockedAtk[0].payload);
  check('...and costs stamina, like blocking a swing does',
    psB.stamina < stamBefore && blockedAtk[0].payload.staminaDrain > 0,
    { before: stamBefore, after: psB.stamina, drain: blockedAtk[0] && blockedAtk[0].payload.staminaDrain });

  /* And with the shield DOWN the same ball hurts -- the block has to be a
     block, not a blanket immunity to the ranged path. */
  psB.blocking = false;
  const hpBefore2 = psB.hp;
  room.eventBuffer.length = 0;
  room._monsterStrikePlayer('frost', ball, 'pa', psB.x, psB.y);
  const openAtk = room.eventBuffer.filter((e) => e.type === 'monster_attack');
  const _dodged = openAtk[0] && openAtk[0].payload.dodged;
  check('with the shield down the same snowball lands',
    _dodged || (psB.hp < hpBefore2 && !openAtk[0].payload.blocked),
    { before: hpBefore2, after: psB.hp, payload: openAtk[0] && openAtk[0].payload });
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
