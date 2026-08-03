/* Anti-cheat validation test — runs the GameRoom with mocked Durable
 * Object state and fake sessions, and checks the server-side gates that
 * were previously untested (2026-07-01 optimization roadmap, P1):
 *   1. Movement anti-teleport: oversized position deltas are dropped
 *      (position AND flags), zone changes bypass the gate.
 *   2. PvP attack clamping: range/arc/dmgBase/critChance are bounded,
 *      dead attackers can't fire, blocked hits deal 0.
 *   3. stats_update: T1 stats clamp to the per-level cap, T2 stats cap
 *      at 99, client-pushed maxHp is ignored, armor tierMult clamps.
 *   4. Harvest "perfect" rate limit: 10/min, excess downgrades to good.
 *   5. Loot pickup gates: recipient, range, zone, dead, double-claim,
 *      contribution shares, first-picker inventory.
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

const wsA = fakeWs('attacker');
const wsB = fakeWs('victim');
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
room.sessions.set(wsA, baseSession());
room.sessions.set(wsB, baseSession());

// Join far from any spawn so monster AI stays idle (same trick as the
// protocol test) and the players don't take incidental damage.
const joinData = { x: -100000, y: -100000, z: 'meadow' };
await room.webSocketMessage(wsA, JSON.stringify({ type: 'join', id: 'pa', name: 'Attacker', protocolVersion: 2, data: { ...joinData } }));
await room.webSocketMessage(wsB, JSON.stringify({ type: 'join', id: 'pb', name: 'Victim', protocolVersion: 2, data: { ...joinData } }));

const psA = room.playerState.pa;
const psB = room.playerState.pb;

// ── 1. Movement anti-teleport gate ──
{
  // First move is always accepted (no prior lastMoveAt to delta from).
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 1000, y: 1000, z: 'meadow' }));
  check('first move accepted', psA.x === 1000 && psA.y === 1000, { x: psA.x, y: psA.y });

  // Immediate 5000 px jump: far beyond 500 px/s * dt + 80 px burst.
  // The cheat move also tries to flip blocking/dead — on reject the
  // server must drop EVERYTHING, not just the position.
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 6000, y: 1000, z: 'meadow', blocking: true, dead: true }));
  check('teleport move rejected (position kept)', psA.x === 1000 && psA.y === 1000, { x: psA.x, y: psA.y });
  check('teleport move rejected (flags not flipped)', !psA.blocking && !psA.dead,
    { blocking: psA.blocking, dead: psA.dead });

  // Small step within the burst allowance is accepted even back-to-back.
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 1050, y: 1000, z: 'meadow' }));
  check('legit small move accepted', psA.x === 1050, { x: psA.x });

  // Zone change bypasses the delta gate (players legitimately jump to
  // the new zone's spawn coords).
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 90000, y: 90000, z: 'frost' }));
  check('zone-change move bypasses gate', psA.z === 'frost' && psA.x === 90000, { z: psA.z, x: psA.x });

  // Move back to meadow for the rest of the suite.
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'move', x: 1000, y: 1000, z: 'meadow' }));
}

// ── 2. PvP attack clamping ──
{
  // Give the attacker a real weapon so the damage cap is weapon-based.
  psA.weapon = { type: 'sword', tierMult: 1 };
  psA.rangedWeapon = null; psA.staffWeapon = null;
  psA.power = 0; psA.mind = 0; psA.ferocity = 0; psA.weaponSpecs = {};
  psB.agility = 0;           // no passive dodge -> deterministic hit
  psB.blocking = false; psB.dodging = false; psB.dead = false;
  psB._zoneEntryGraceUntil = 0;
  psB.maxHp = 1000000; psB.hp = 1000000;   // survive the hit; death flow tested elsewhere
  psB.z = psA.z = 'meadow';
  psA.dying = false; psA.dead = false;
  room.stateHistory.pb = [];               // force current-state resolution

  const dmgCap = room._maxDmgForAttacker(psA, false);

  // Victim at 500 px: inside the cheater's claimed 99999 range but
  // outside the 250 px server cap -> no hit at all.
  psA.x = 0; psA.y = 0; psB.x = 500; psB.y = 0;
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(room.sessions.get(wsA), { range: 99999, arc: 99, angle: 0, dmgBase: 99999, critChance: 99999 });
  check('pvp: 99999-px range claim clamped (no hit at 500 px)',
    room.eventBuffer.filter((e) => e.type === 'pvp_hit').length === 0, room.eventBuffer);

  // Victim at 200 px: inside both the claim and the cap -> hit lands,
  // but dmgBase is clamped to the attacker's weapon-aware cap and
  // critChance 99999 clamps to 100 (guaranteed crit, 1.5x+).
  psB.x = 200;
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(room.sessions.get(wsA), { range: 99999, arc: 99, angle: 0, dmgBase: 99999, critChance: 99999 });
  const hit = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  check('pvp: hit lands at 200 px with clamped dmgBase', !!hit && hit.payload.dmgBase <= dmgCap,
    hit && { dmgBase: hit.payload.dmgBase, cap: dmgCap });
  check('pvp: critChance clamps to 100 (hit is a crit)', !!hit && hit.payload.isCrit === true, hit && hit.payload);
  check('pvp: damage taken bounded by cap * 1.5 crit', !!hit && hit.payload.dmgTaken <= Math.ceil(dmgCap * 1.5),
    hit && { dmgTaken: hit.payload.dmgTaken, bound: Math.ceil(dmgCap * 1.5) });

  // Blocking victim takes zero.
  psB.blocking = true;
  room.eventBuffer.length = 0;
  room._pvpHitLanes = new Map(); // v2.3.1306: cadence floor would drop this back-to-back hit
  room._resolvePvPAttack(room.sessions.get(wsA), { range: 250, arc: 3, angle: 0, dmgBase: 50, critChance: 0 });
  const blockedHit = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  check('pvp: blocked hit deals 0', !!blockedHit && blockedHit.payload.blocked === true && blockedHit.payload.dmgTaken === 0,
    blockedHit && blockedHit.payload);
  psB.blocking = false;

  // Dead attackers can't fire.
  psA.dead = true;
  room.eventBuffer.length = 0;
  room._pvpHitLanes = new Map(); // v2.3.1306: isolate from the cadence floor — this check is about the dead gate
  room._resolvePvPAttack(room.sessions.get(wsA), { range: 250, arc: 3, angle: 0, dmgBase: 50, critChance: 0 });
  check('pvp: dead attacker rejected', room.eventBuffer.filter((e) => e.type === 'pvp_hit').length === 0);
  psA.dead = false;
}

// ── 3. stats_update clamping ──
{
  const lvl = psA.level || 1;
  const cap = room._statCap(lvl);   // max(20, level*10+20)
  const maxHpBefore = psA.maxHp;

  room._handleStatsUpdate(room.sessions.get(wsA), { vitality: 99999, maxHp: 99999 });
  check('stats_update: T1 stat clamps to level*10+20 cap', psA.vitality === cap, { vitality: psA.vitality, cap });
  check('stats_update: client-pushed maxHp ignored (server recomputes)',
    psA.maxHp !== 99999 && psA.maxHp === room._calcMaxHp(psA.level, psA.vitality),
    { maxHp: psA.maxHp, before: maxHpBefore });

  // v2.3.1155: the retired T2 keys are IGNORED (never stored) — old
  // clients still send them in every stats_update, and the message's
  // T1 fields must keep landing.  (An earlier section pins
  // psA.ferocity = 0 directly; the claim here is the spoofed value
  // never lands, not that the property was never created.)
  const feroBefore = psA.ferocity;
  room._handleStatsUpdate(room.sessions.get(wsA), { ferocity: 99999, restoration: -5, power: 3 });
  check('stats_update: retired T2 keys ignored, never stored',
    psA.ferocity === feroBefore && psA.restoration === undefined, { f: psA.ferocity, r: psA.restoration });
  check('stats_update: T1 fields in the same message still land', psA.power === 3, psA.power);

  // Armor: tierMult clamps to 8, Leather Armor rejected outright.
  room._handleStatsUpdate(room.sessions.get(wsA), { armor: { name: 'Forged Blob', tierMult: 999 } });
  check('stats_update: armor tierMult clamps to 8', psA.armor && psA.armor.tierMult === 8, psA.armor);
  room._handleStatsUpdate(room.sessions.get(wsA), { armor: { name: 'Leather Armor', tierMult: 1 } });
  check('stats_update: Leather Armor rejected (v2.3.249 removal)', psA.armor === null, psA.armor);
}

// ── 4. Harvest "perfect" rate limit (10/min, excess -> good) ──
{
  const ps = { _perfectHistory: [] };
  let perfects = 0;
  for (let i = 0; i < 12; i++) {
    if (room._ratedHarvestAccuracy(ps, 'perfect') === 'perfect') perfects++;
  }
  check('harvest: only 10 perfect claims per minute accepted', perfects === 10, perfects);
  check('harvest: 11th+ claim downgrades to good', room._ratedHarvestAccuracy(ps, 'perfect') === 'good');
  check('harvest: non-perfect claims pass through untouched', room._ratedHarvestAccuracy(ps, 'good') === 'good'
    && room._ratedHarvestAccuracy(ps, undefined) === 'ok');
}

// ── 5. Loot pickup gates ──
{
  // Hand-crafted monster-kill pile: pa has a 70% share, pb 30%.
  const pile = {
    lootId: 'test-pile-1', zone: 'meadow', x: 1000, y: 1000,
    coins: 100, skull: 'mummy', shard: null,
    recipients: ['pa', 'pb'], shares: { pa: 0.7, pb: 0.3 },
    killerName: 'Attacker', ts: Date.now(), inventoryClaimed: false, claimedBy: {},
  };
  if (!room.loot.meadow) room.loot.meadow = [];
  room.loot.meadow.push(pile);

  const rejectedReasons = (ws) => msgsOfType(ws, 'loot_pickup_rejected').map((m) => m.payload.reason);

  psA.z = 'meadow'; psA.dead = false; psA.disconnected = false;
  psB.z = 'meadow'; psB.dead = false; psB.disconnected = false;

  // Out of range (LOOT_PICKUP_RANGE = 160 px since v2.3.1161).
  psA.x = pile.x + 200; psA.y = pile.y;
  wsA.sent.length = 0;
  room._handleLootPickup(room.sessions.get(wsA), { lootId: pile.lootId, zone: 'meadow' });
  check('loot: out-of-range pickup rejected', rejectedReasons(wsA).includes('out-of-range'), rejectedReasons(wsA));

  // Wrong zone.
  psA.x = pile.x; psA.z = 'frost';
  wsA.sent.length = 0;
  room._handleLootPickup(room.sessions.get(wsA), { lootId: pile.lootId, zone: 'meadow' });
  check('loot: wrong-zone pickup rejected', rejectedReasons(wsA).includes('wrong-zone'), rejectedReasons(wsA));
  psA.z = 'meadow';

  // Dead players can't loot.
  psA.dead = true;
  wsA.sent.length = 0;
  room._handleLootPickup(room.sessions.get(wsA), { lootId: pile.lootId, zone: 'meadow' });
  check('loot: dead pickup rejected', rejectedReasons(wsA).includes('dead'), rejectedReasons(wsA));
  psA.dead = false;

  // Non-recipient can't loot someone else's kill.
  const wsC = fakeWs('outsider');
  room.sessions.set(wsC, { ...baseSession(), id: 'pc', name: 'Outsider' });
  room.playerState.pc = { x: pile.x, y: pile.y, z: 'meadow', dead: false, disconnected: false, coins: 0 };
  room._handleLootPickup(room.sessions.get(wsC), { lootId: pile.lootId, zone: 'meadow' });
  check('loot: non-recipient rejected', rejectedReasons(wsC).includes('not-recipient'), rejectedReasons(wsC));

  // Legit pickup: pa gets 70 coins + the skull (first picker).
  psA.x = pile.x; psA.y = pile.y;
  const coinsBeforeA = psA.coins || 0;
  wsA.sent.length = 0;
  room._handleLootPickup(room.sessions.get(wsA), { lootId: pile.lootId, zone: 'meadow' });
  const creditA = msgsOfType(wsA, 'loot_credit')[0];
  check('loot: share-weighted coin credit (70%)', (psA.coins || 0) - coinsBeforeA === 70
    && creditA && creditA.payload.coins === 70, creditA && creditA.payload);
  check('loot: first picker gets the skull', creditA && creditA.payload.skull === 'mummy', creditA && creditA.payload);

  // Double-claim by the same player is rejected.
  wsA.sent.length = 0;
  room._handleLootPickup(room.sessions.get(wsA), { lootId: pile.lootId, zone: 'meadow' });
  check('loot: double-claim rejected', rejectedReasons(wsA).includes('already-claimed'), rejectedReasons(wsA));

  // Second recipient gets their 30% share but NOT the claimed skull.
  psB.x = pile.x; psB.y = pile.y;
  const coinsBeforeB = psB.coins || 0;
  wsB.sent.length = 0;
  room._handleLootPickup(room.sessions.get(wsB), { lootId: pile.lootId, zone: 'meadow' });
  const creditB = msgsOfType(wsB, 'loot_credit')[0];
  check('loot: second recipient gets 30% coins, no skull', (psB.coins || 0) - coinsBeforeB === 30
    && creditB && creditB.payload.coins === 30 && !creditB.payload.skull, creditB && creditB.payload);

  // v2.3.1161 range boundary: piles spawn at the MONSTER's center, so a
  // big-sprite kill (snowman) + client magnetism + move-throttle lag
  // legitimately stacks ~150 px between the server's player position
  // and the pile.  150 must be accepted; past 160 stays rejected.
  const pile2 = {
    lootId: 'test-pile-range', zone: 'meadow', x: 2000, y: 2000,
    coins: 10, skull: null, shard: null,
    recipients: ['pa'], shares: { pa: 1 },
    killerName: 'Attacker', ts: Date.now(), inventoryClaimed: false, claimedBy: {},
  };
  room.loot.meadow.push(pile2);
  psA.x = pile2.x + 150; psA.y = pile2.y;
  wsA.sent.length = 0;
  room._handleLootPickup(room.sessions.get(wsA), { lootId: pile2.lootId, zone: 'meadow' });
  check('loot: pickup accepted at 150 px (big-monster + magnetism + lag geometry)',
    msgsOfType(wsA, 'loot_credit').length === 1 && rejectedReasons(wsA).length === 0,
    rejectedReasons(wsA));
  const pile3 = { ...pile2, lootId: 'test-pile-range2', claimedBy: {} };
  room.loot.meadow.push(pile3);
  psA.x = pile3.x + 170;
  wsA.sent.length = 0;
  room._handleLootPickup(room.sessions.get(wsA), { lootId: pile3.lootId, zone: 'meadow' });
  check('loot: pickup rejected past 160 px', rejectedReasons(wsA).includes('out-of-range'), rejectedReasons(wsA));
}

// ── 6. v2.3.1104 weapon-blob sanitation (roadmap P2) ──
// Since v2.3.912 the server's own damage roll and the sell value both
// multiply by tierMult, so a forged blob at first connect inflates
// AUTHORITATIVE numbers.  Bootstrap and stored-load now sanitize.
{
  const wsZ = fakeWs('forger');
  room.sessions.set(wsZ, baseSession());
  await room.webSocketMessage(wsZ, JSON.stringify({
    type: 'join', id: 'pz', name: 'Forger', protocolVersion: 2, data: {
      x: -100000, y: -100000, z: 'meadow',
      rpgWeapon: { type: 'greatsword', tierMult: 9999 },
      rpgWeaponStash: [{ type: 'sword', tierMult: 500 }, 'junk', null, { type: 'bow' }],
    },
  }));
  const psZ = room.playerState.pz;
  check('sanitize: bootstrap weapon tierMult clamps to 8 (max forge tier 7.84)',
    psZ.weapon && psZ.weapon.tierMult === 8, psZ.weapon);
  check('sanitize: bootstrap stash clamps tiers, drops non-object junk',
    Array.isArray(psZ.weaponStash) && psZ.weaponStash.length === 2
    && psZ.weaponStash[0].tierMult === 8 && psZ.weaponStash[1].type === 'bow'
    && psZ.weaponStash[1].tierMult === 1, psZ.weaponStash);

  // Sell overpay: a stale stored blob (persisted before the clamp
  // existed) can't cash out at forged value — _weaponSellValue clamps
  // again defensively.  ceil(8 * 6.67 * 0.5) = 27 coins, not ~33k.
  psZ.weaponStash = [{ type: 'sword', tierMult: 9999 }];
  psZ.coins = 0; psZ.dead = false; psZ.dying = false; psZ.disconnected = false;
  room._handleSellWeapon(room.sessions.get(wsZ), { stashIdx: 0 });
  check('sanitize: sell value clamped to legit tier range', psZ.coins === 27
    && psZ.weaponStash.length === 0, { coins: psZ.coins, stash: psZ.weaponStash.length });
}

// ── 7. v2.3.1104 cook_request rate limit (20/min, roadmap P2) ──
// The pan-minigame outcome is client-trusted; the server bounds the
// CADENCE so a script can't convert a fish stockpile + farm cooking XP
// at inhuman speed.  Excess requests drop without consuming the fish.
// v2.3.1167: each iteration backdates _lastCookAt so the physics floor
// (which would otherwise drop everything after the first instant
// request -- covered in lifeskills-economy §3a) doesn't mask the
// 20/min limit under test here.
{
  const ps = room.playerState.pz;
  ps.inventory = { fish_minnow: 30 };
  ps._cookHistory = [];
  const wsZ = [...room.sessions.entries()].find(([, s]) => s.id === 'pz')[0];
  for (let i = 0; i < 25; i++) {
    ps._lastCookAt = 0; // isolate the rate limit from the v2.3.1167 floor
    await room.webSocketMessage(wsZ, JSON.stringify({ type: 'cook_request', payload: { fishKey: 'fish_minnow', kind: 'cooked' } }));
  }
  check('cook: only 20 requests per minute consume fish', ps.inventory.fish_minnow === 10, ps.inventory.fish_minnow);
  check('cook: cooked output matches the 20 accepted', ps.inventory.cooked_fish_minnow === 20, ps.inventory.cooked_fish_minnow);

  // History persists via _saveRpg so cycling the WS connection can't
  // reset the 60-second window (same posture as _perfectHistory).
  let saved = null;
  const origPut = room.state.storage.put;
  room.state.storage.put = async (k, v) => { if (k === 'rpg:pz') saved = v; };
  await room._saveRpg('pz', ps);
  room.state.storage.put = origPut;
  check('cook: rate-limit history persisted in the rpg blob',
    saved && Array.isArray(saved._cookHistory) && saved._cookHistory.length === 20,
    saved && saved._cookHistory && saved._cookHistory.length);
}

// ── 8. v2.3.1182 first-connect bootstrap NUMERIC caps ──
// Section 6 covers the weapon half of the bootstrap; this covers the
// numeric half (join.js BOOTSTRAP_* caps).  A localStorage tamper
// before the first ever connect is the one moment the server trusts
// client numbers — without these clamps the forged values would
// persist forever in DO storage.  Fresh ids so _loadRpg misses and
// the bootstrap branch (not stored-wins) runs.
//
// Coins and level are asserted on the FIRST persisted rpg blob (the
// bootstrap _saveRpg), captured with the section-7 put-intercept
// trick, because the join tail legitimately mutates the live values
// afterwards: _cadenceLoginReward credits the daily gold on every
// first-join-of-a-day (the mock storage has no cadence record), and
// _recomputeMaxes re-derives ps.level from the stat sum (v2.3.910).
// The captured blob is exactly what a cap regression would persist.
{
  // Forged join: every numeric field oversized, inventory 200 keys of
  // quantity 9999 (caps: 100 keys, 50 per item).
  const bigInv = {};
  for (let i = 0; i < 200; i++) bigInv['item_' + i] = 9999;
  const wsN = fakeWs('numeric-forger');
  room.sessions.set(wsN, baseSession());
  let bootN = null; // first rpg:pn write = the bootstrap save
  const origPutN = room.state.storage.put;
  room.state.storage.put = async (k, v) => { if (k === 'rpg:pn' && !bootN) bootN = v; };
  await room.webSocketMessage(wsN, JSON.stringify({
    type: 'join', id: 'pn', name: 'NumForger', protocolVersion: 2, data: {
      x: -100000, y: -100000, z: 'meadow',
      rpgCoins: 999999,
      rpgLevel: 9999,
      rpgXp: 9e9,
      rpgUnspentT2: 999,
      rpgBuildPointsThisLvl: 99,
      rpgInventory: bigInv,
    },
  }));
  room.state.storage.put = origPutN;
  const psN = room.playerState.pn;
  check('bootstrap: coins clamp to BOOTSTRAP_COINS_CAP (2000)', bootN && bootN.coins === 2000, bootN && bootN.coins);
  // v2.3.1342: cap 500 -> 1000 (level-is-build; max level 1000).
  check('bootstrap: level clamps to BOOTSTRAP_LEVEL_CAP (1000)', bootN && bootN.level === 1000, bootN && bootN.level);
  check('bootstrap: xp clamps to BOOTSTRAP_XP_CAP (50000)', bootN && bootN.xp === 50000, bootN && bootN.xp);
  check('bootstrap: unspentT2 clamps to BOOTSTRAP_UT2_CAP (75)', bootN && bootN.unspentT2 === 75, bootN && bootN.unspentT2);
  check('bootstrap: buildPointsThisLvl clamps to 4 (build_point_earned flurry max)',
    bootN && bootN.buildPointsThisLvl === 4, bootN && bootN.buildPointsThisLvl);
  // xp / unspentT2 / buildPointsThisLvl / inventory aren't touched by
  // the join tail — assert the LIVE state too, so a regression that
  // re-injects the raw payload after the bootstrap save also fails.
  check('bootstrap: live xp/unspentT2/buildPoints hold the clamped values',
    psN.xp === 50000 && psN.unspentT2 === 75 && psN.buildPointsThisLvl === 4,
    { xp: psN.xp, ut2: psN.unspentT2, bp: psN.buildPointsThisLvl });
  const invKeys = Object.keys(psN.inventory || {});
  check('bootstrap: inventory truncated to 100 keys', invKeys.length === 100, invKeys.length);
  check('bootstrap: every inventory quantity clamped to 50 per item',
    invKeys.length > 0 && invKeys.every((k) => psN.inventory[k] === 50),
    invKeys.slice(0, 3).map((k) => psN.inventory[k]));

  // Garbage join: negative / non-number values must floor to the sane
  // defaults, never go below zero or store junk.  JSON can't carry
  // NaN — JSON.stringify turns it into null — so the wire-realistic
  // forgery for "not a number" is null / a string, both of which fail
  // the typeof === 'number' guard in join.js and take the default.
  const wsG = fakeWs('garbage-forger');
  room.sessions.set(wsG, baseSession());
  let bootG = null;
  const origPutG = room.state.storage.put;
  room.state.storage.put = async (k, v) => { if (k === 'rpg:pg' && !bootG) bootG = v; };
  await room.webSocketMessage(wsG, JSON.stringify({
    type: 'join', id: 'pg', name: 'GarbageForger', protocolVersion: 2, data: {
      x: -100000, y: -100000, z: 'meadow',
      rpgCoins: -500,
      rpgLevel: null,            // what a client-side NaN becomes on the wire
      rpgXp: -12345,
      rpgUnspentT2: '999',       // fails the typeof === 'number' guard
      rpgBuildPointsThisLvl: -3,
      rpgInventory: { potion: -5, rock: 'lots', fish: 0 },
    },
  }));
  room.state.storage.put = origPutG;
  const psG = room.playerState.pg;
  check('bootstrap: negative coins floor to 0', bootG && bootG.coins === 0, bootG && bootG.coins);
  check('bootstrap: null (wire NaN) level defaults to 1', bootG && bootG.level === 1, bootG && bootG.level);
  check('bootstrap: negative xp floors to 0', psG.xp === 0, psG.xp);
  check('bootstrap: string unspentT2 defaults to 0', psG.unspentT2 === 0, psG.unspentT2);
  check('bootstrap: negative buildPointsThisLvl floors to 0', psG.buildPointsThisLvl === 0, psG.buildPointsThisLvl);
  check('bootstrap: non-finite / non-positive inventory quantities dropped',
    psG.inventory && Object.keys(psG.inventory).length === 0, psG.inventory);
}

// ── 7. `track` is cosmetics-only (v2.3.1465) ──
//
// The handler used to Object.assign the raw client blob into
// authoritative playerState.  One crafted track forged coins/stats/
// level/weapon and teleported the sender, and _saveRpg persisted it —
// while the SAME jump sent as `move` was correctly rejected by §1's
// cap above.  Pins the allowlist (TRACK_COSMETIC_KEYS) and the
// position exclusion (TRACK_STATE_EXCLUDED) in index.js.
{
  const wsT = fakeWs('tracker');
  room.sessions.set(wsT, baseSession());
  await room.webSocketMessage(wsT, JSON.stringify({
    type: 'join', id: 'pt', name: 'Tracker', protocolVersion: 2,
    data: { x: -100000, y: -100000, z: 'meadow' },
  }));
  const psT = room.playerState.pt;
  psT.coins = 25; psT.level = 7; psT.power = 3;
  const honestMaxHp = psT.maxHp;
  const honestX = psT.x, honestY = psT.y;
  const honestWeapon = psT.weapon;

  // The forgery: every one of these must bounce.
  await room.webSocketMessage(wsT, JSON.stringify({
    type: 'track',
    data: {
      coins: 999999999, power: 99999, maxHp: 999999, hp: 999999,
      level: 500, unspentT2: 9999, xp: 1e9,
      inventory: { 'dragon-scale': 9999 },
      weaponStash: [{ name: 'Dupe' }],
      weapon: { name: 'God Blade', type: 'greatsword', tierMult: 99 },
      x: 9000, y: 9000,
      // honest cosmetics riding along must still land
      name: 'Tracker', color: '#abc', rpgLv: 500,
    },
  }));

  check('track: coins not forgeable', psT.coins === 25, psT.coins);
  check('track: power not forgeable', psT.power === 3, psT.power);
  check('track: level not forgeable', psT.level === 7, psT.level);
  check('track: maxHp not forgeable', psT.maxHp === honestMaxHp, psT.maxHp);
  check('track: unspentT2 not forgeable', psT.unspentT2 !== 9999, psT.unspentT2);
  check('track: inventory not forgeable',
    !psT.inventory || psT.inventory['dragon-scale'] === undefined, psT.inventory);
  check('track: weapon blob cannot bypass _sanitizeWeapon',
    psT.weapon === honestWeapon, psT.weapon);
  check('track: position not merged (move owns it behind the cap)',
    psT.x === honestX && psT.y === honestY, { x: psT.x, y: psT.y });
  check('track: honest cosmetics still land', psT.name === 'Tracker' && psT.rpgLv === 500,
    { name: psT.name, rpgLv: psT.rpgLv });

  // A forged rpgLv is fine as a DISPLAY value (above) but must never
  // become the player's rank on the global board — v2.3.1178 closed
  // this same forge on the public HTTP route; the WS path kept it.
  let lbBody = null;
  const RealRequest = globalThis.Request;
  globalThis.Request = class extends RealRequest {
    constructor(u, i) { super(u, i); this.__body = i && i.body; }
  };
  const origLb = room.env.LEADERBOARD;
  room.env = { ...room.env, LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async (r) => { lbBody = JSON.parse(r.__body); return {}; } }) } };
  /* v2.3.1620: the join above already reported (force=true), and the
     track path is throttled now, so clear the stamp to let THIS report
     through. The property under test — that a report carries the SERVER's
     level and not the client's claim — is orthogonal to the throttle;
     this just guarantees a report actually happens to inspect. */
  room.sessions.get(wsT)._lbAt = 0;
  await room.webSocketMessage(wsT, JSON.stringify({ type: 'track', data: { rpgLv: 500 } }));
  globalThis.Request = RealRequest;
  room.env = { ...room.env, LEADERBOARD: origLb };
  check('track: leaderboard rank comes from server level, not the claim',
    lbBody && lbBody.level === 7, lbBody && lbBody.level);

  // TRAPS #6 — iterating the fixed allowlist means '__proto__' can
  // never be a written key, structurally.
  await room.webSocketMessage(wsT, JSON.stringify({
    type: 'track', data: JSON.parse('{"__proto__":{"polluted":"yes"}}'),
  }));
  check('track: __proto__ payload is inert',
    ({}).polluted === undefined && psT.polluted === undefined, ({}).polluted);

  // A non-object payload stays the no-op it always was.
  const beforeName = psT.name;
  await room.webSocketMessage(wsT, JSON.stringify({ type: 'track' }));
  await room.webSocketMessage(wsT, JSON.stringify({ type: 'track', data: 'nope' }));
  check('track: missing / non-object data is a no-op', psT.name === beforeName, psT.name);
}

// ── 7b. v2.3.1620: the leaderboard report is throttled ──
//
// `track` arrives every 2 s and used to drive one cross-DO fetch AND one
// unconditional Leaderboard storage.put per message — 1,800 billed rows
// and 1,800 billed requests per player-hour to mostly rewrite the same
// record. This pins the gate: identical records don't report, real
// changes do (once past the floor), and lastSeen still gets refreshed.
{
  const wsL = fakeWs('lb');
  room.sessions.set(wsL, baseSession());
  let reports = 0;
  const RealRequest = globalThis.Request;
  globalThis.Request = class extends RealRequest {
    constructor(u, i) { super(u, i); this.__body = i && i.body; }
  };
  const origLb = room.env.LEADERBOARD;
  room.env = { ...room.env, LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => { reports++; return {}; } }) } };

  await room.webSocketMessage(wsL, JSON.stringify({
    type: 'join', id: 'plb', name: 'Board', protocolVersion: 2,
    data: { x: -100000, y: -100000, z: 'meadow' },
  }));
  check('lb throttle: join reports immediately (force)', reports === 1, reports);

  // 30 identical tracks — a full minute of real client cadence.
  const sess = room.sessions.get(wsL);
  for (let i = 0; i < 30; i++) {
    await room.webSocketMessage(wsL, JSON.stringify({ type: 'track', data: { name: 'Board', color: '#abc' } }));
  }
  check('lb throttle: 30 identical tracks report ZERO times', reports === 1, reports);

  // A real change still has to wait out the floor…
  await room.webSocketMessage(wsL, JSON.stringify({
    type: 'track', data: { name: 'Board', color: '#abc', rpgData: { kills: 5 } },
  }));
  check('lb throttle: a change inside the floor is deferred, not lost', reports === 1, reports);

  // …and lands on the next track once the floor has passed.
  sess._lbAt = Date.now() - room.LEADERBOARD_MIN_MS - 1;
  await room.webSocketMessage(wsL, JSON.stringify({
    type: 'track', data: { name: 'Board', color: '#abc', rpgData: { kills: 5 } },
  }));
  check('lb throttle: a changed record reports once past the floor', reports === 2, reports);

  // Unchanged again: the floor alone must NOT let it through.
  sess._lbAt = Date.now() - room.LEADERBOARD_MIN_MS - 1;
  await room.webSocketMessage(wsL, JSON.stringify({
    type: 'track', data: { name: 'Board', color: '#abc', rpgData: { kills: 5 } },
  }));
  check('lb throttle: unchanged record does not report on the floor alone', reports === 2, reports);

  // The heartbeat is what keeps lastSeen fresh vs getTop's 7-day filter.
  sess._lbAt = Date.now() - room.LEADERBOARD_HEARTBEAT_MS - 1;
  await room.webSocketMessage(wsL, JSON.stringify({
    type: 'track', data: { name: 'Board', color: '#abc', rpgData: { kills: 5 } },
  }));
  check('lb throttle: heartbeat reports an unchanged record', reports === 3, reports);

  // Fields the Leaderboard DO does not persist must not trigger a write.
  sess._lbAt = Date.now() - room.LEADERBOARD_MIN_MS - 1;
  await room.webSocketMessage(wsL, JSON.stringify({
    type: 'track', data: { name: 'Board', color: '#abc', avatar: 'changed-every-time', rpgData: { kills: 5 } },
  }));
  check('lb throttle: churn in a non-leaderboard field does not report', reports === 3, reports);

  globalThis.Request = RealRequest;
  room.env = { ...room.env, LEADERBOARD: origLb };
}

/* ══════════════════════════════════════════════════════════════════
 * §8 — v2.3.1624-1610 audit fixes (docs/AUDIT-2026-08-03.md)
 * ══════════════════════════════════════════════════════════════════ */
{
  const wsJ = fakeWs('joinAllow');
  room.sessions.set(wsJ, baseSession());

  /* ── C-1: join is an ALLOWLIST, not a raw spread ──────────────────
     A forged _zoneEntryGraceUntil used to buy permanent immunity to
     every damage source, because _applyDamage short-circuits on it.
     The field must reach NEITHER playerState NOR session.data (the
     latter is spread LAST over playerState by getAllPlayerData, so it
     would still ship in every joiner's state_sync). */
  await room.webSocketMessage(wsJ, JSON.stringify({
    type: 'join', id: 'p_allow', name: 'Allow', protocolVersion: 2,
    data: {
      x: 10, y: 20, z: 'meadow', name: 'Allow', sk: 'pale',
      _zoneEntryGraceUntil: 4102444800000,
      bro: { tokenId: '999', address: '0xdead' },
      _evadeAcc: 999, coins: 999999999, level: 500, power: 99999,
      rpgCoins: 42,
    },
  }));
  const psJ = room.playerState.p_allow;
  check('join: forged _zoneEntryGraceUntil is dropped from playerState',
    psJ && psJ._zoneEntryGraceUntil === undefined, psJ && psJ._zoneEntryGraceUntil);
  check('join: forged _zoneEntryGraceUntil is dropped from session.data',
    room.sessions.get(wsJ).data._zoneEntryGraceUntil === undefined);
  const allData = room.getAllPlayerData();
  check('join: forged field cannot ride session.data into state_sync',
    allData.p_allow && allData.p_allow._zoneEntryGraceUntil === undefined,
    allData.p_allow && allData.p_allow._zoneEntryGraceUntil);
  check('join: forged bro badge is dropped (broverify is server-owned)',
    psJ && psJ.bro === undefined, psJ && psJ.bro);
  check('join: unknown internal (_evadeAcc) is dropped',
    psJ && psJ._evadeAcc === undefined, psJ && psJ._evadeAcc);
  check('join: allowlisted cosmetics + presence still land',
    psJ && psJ.sk === 'pale' && psJ.x === 10 && psJ.z === 'meadow',
    psJ && { sk: psJ.sk, x: psJ.x, z: psJ.z });
  /* The damage short-circuit must actually be gone. */
  const dmgRes = room._applyDamage(psJ, 500, false);
  check('join: a forged grace stamp no longer zeroes incoming damage',
    dmgRes.dmgTaken > 0 && !dmgRes.graced, dmgRes);

  /* ── C-3: an unlisted zone id never reaches the zone-keyed maps ───
     z:'__proto__' made _ensureZoneMonsters return Object.prototype,
     whose .length is undefined, so _tickMonsters' `length === 0`
     guard fell through into a for-of on a non-iterable -- a throw
     every tick, swallowed by guard(), killing monster AI room-wide. */
  check('zone: __proto__ is rejected by _validZone', room._validZone('__proto__') === false);
  check('zone: constructor is rejected by _validZone', room._validZone('constructor') === false);
  check('zone: an invented zone is rejected', room._validZone('nowhere') === false);
  check('zone: real zones and hubs are accepted',
    room._validZone('meadow') && room._validZone('town')
    && room._validZone('shadow') && room._validZone('worldview'));
  /* v2.3.1631: dungeon zones are accepted BY SHAPE, not by liveness.
     Requiring a live instance froze every player who was mid-dungeon
     when a deploy wiped this._dungeons (rule 11) -- their client keeps
     claiming the dead id and every move became a no-op.  The shape
     regex still bounds charset and length, so the prototype hazard
     stays closed; a dead id costs at most an empty zone-keyed entry. */
  check('zone: a well-formed dungeon id is accepted even with no live instance',
    room._validZone('dungeon:deadbeef') === true);
  check('zone: a malformed dungeon id is still rejected',
    room._validZone('dungeon:a:b') === false
    && room._validZone('dungeon:') === false
    && room._validZone('dungeon:../../x') === false
    && room._validZone('dungeon:' + 'x'.repeat(33)) === false);
  /* 'dungeon:__proto__' DOES pass the shape check, and that is fine:
     the key that reaches the zone-keyed maps is the whole prefixed
     string, which is an ordinary own property.  The prototype hazard
     needs the key to BE '__proto__', which the prefix makes impossible. */
  check('zone: a prefixed proto-looking dungeon id is harmless',
    room._validZone('dungeon:__proto__') === true);
  room._ensureZoneMonsters('dungeon:__proto__');
  check('zone: ...and it creates a normal own key, not a prototype write',
    Object.prototype.hasOwnProperty.call(room.monsters, 'dungeon:__proto__')
    && Object.getPrototypeOf(room.monsters) === null
    && ({}).polluted === undefined);

  const zonesBefore = Object.keys(room.monsters).length;
  await room.webSocketMessage(wsJ, JSON.stringify({
    type: 'move', x: 12, y: 22, z: '__proto__',
  }));
  check('zone: a __proto__ move leaves ps.z on the last good zone',
    psJ.z === 'meadow', psJ.z);
  check('zone: a __proto__ move creates no zone-keyed entry',
    Object.keys(room.monsters).length === zonesBefore
    && !Object.prototype.hasOwnProperty.call(room.monsters, '__proto__'));
  check('zone: this.monsters is null-prototype (TRAPS #6 defence in depth)',
    Object.getPrototypeOf(room.monsters) === null);
  /* The whole point: the tick must survive it. */
  let tickThrew = false;
  try { room._tickMonsters(); } catch { tickThrew = true; }
  check('zone: _tickMonsters does not throw after a forged zone attempt', !tickThrew);

  /* ── C-6: ORDINARY ZONE TRAVEL MUST NEVER BE REJECTED ────────────
     v2.3.1625 tried to close the zone-flip position bypass with a
     per-zone re-entry speed budget.  Adversarial review showed it
     rejected ordinary play -- the town<->worldview hub bounce covers
     528-720 px in 0.5-1.0 s against a 330-580 px budget, and a dungeon
     exit re-enters at a fixed tile unrelated to where the player left
     -- so v2.3.1629 removed it (see the long note in movement.js).
     C-6 is therefore MITIGATED, NOT CLOSED: the zone-validation half
     stands, the position bypass does not.  These assertions pin the
     property that actually matters for players -- that legitimate
     travel always lands -- so a future attempt at C-6 cannot
     reintroduce the freeze without going red here. */
  psJ.x = 100; psJ.y = 100; psJ.z = 'meadow'; psJ.lastMoveAt = Date.now() - 50;
  await room.webSocketMessage(wsJ, JSON.stringify({ type: 'move', x: 100, y: 100, z: 'tidal' }));
  await room.webSocketMessage(wsJ, JSON.stringify({ type: 'move', x: 130, y: 120, z: 'meadow' }));
  check('move: an honest leave-and-return transition still lands',
    psJ.z === 'meadow' && psJ.x === 130, { x: psJ.x, z: psJ.z });
  /* The hub bounce the removed budget used to reject: ~620 px of
     displacement inside ~0.6 s, which is the map's own geometry. */
  psJ.x = 640; psJ.y = 400; psJ.z = 'town'; psJ.lastMoveAt = Date.now() - 50;
  await room.webSocketMessage(wsJ, JSON.stringify({ type: 'move', x: 300, y: 900, z: 'worldview' }));
  await room.webSocketMessage(wsJ, JSON.stringify({ type: 'move', x: 640, y: 400, z: 'town' }));
  check('move: the town<->worldview hub bounce is never rejected',
    psJ.z === 'town' && psJ.x === 640 && psJ.y === 400, { x: psJ.x, y: psJ.y, z: psJ.z });
  /* An unlisted zone id must neither FREEZE the player (v2.3.1629's
     early return) nor write the foreign coordinates into the current
     zone (the first v2.3.1631 attempt).  It drops the zone, skips the
     position, and arms the next move to bypass the cap so the client
     resynchronises in one message. */
  psJ.x = 640; psJ.y = 400; psJ.z = 'town'; psJ.lastMoveAt = Date.now() - 50;
  await room.webSocketMessage(wsJ, JSON.stringify({ type: 'move', x: 9000, y: 9000, z: 'nowhere' }));
  check('move: a rejected zone never writes its foreign coordinates',
    psJ.x === 640 && psJ.y === 400 && psJ.z === 'town', { x: psJ.x, y: psJ.y, z: psJ.z });
  await room.webSocketMessage(wsJ, JSON.stringify({ type: 'move', x: 660, y: 410, z: 'town' }));
  check('move: a rejected zone id does not pin the player',
    psJ.x === 660 && psJ.y === 410 && psJ.z === 'town', { x: psJ.x, y: psJ.y, z: psJ.z });
  /* And the post-deploy dungeon case that started all this: the
     instance is gone from memory, the client still claims it. */
  psJ.z = 'town'; psJ.x = 100; psJ.y = 100; psJ.lastMoveAt = Date.now() - 50;
  await room.webSocketMessage(wsJ, JSON.stringify({ type: 'move', x: 220, y: 100, z: 'dungeon:abcd1234' }));
  check('move: a player whose dungeon died in a deploy is not frozen',
    psJ.z === 'dungeon:abcd1234' && psJ.x === 220, { x: psJ.x, z: psJ.z });
}

{
  /* ── C-4 / C-5: prototype keys in config-table lookups ───────────
     Same class handoff item H closed in quests.js / amulet.js; these
     four tables were missed by that sweep. */
  check('gear: _weaponBase("constructor") returns the fists number, not a function',
    typeof room._weaponBase('constructor') === 'number'
    && !Number.isNaN(room._weaponBase('constructor') * 2), room._weaponBase('constructor'));
  check('gear: _weaponBase("toString") is NaN-free',
    !Number.isNaN(room._weaponBase('toString') * 2));
  check('gear: _wpnCat("constructor") falls back to sword',
    room._wpnCat('constructor') === 'sword', room._wpnCat('constructor'));
  check('gear: _sanitizeAmulet drops a prototype tier',
    room._sanitizeAmulet({ tier: 'constructor' }) === null);
  check('gear: _sanitizeAmulet still accepts a real tier',
    room._sanitizeAmulet({ tier: 'mythic' }) !== null
    || room._sanitizeAmulet({ tier: 'common' }) !== null);
  check('cooking: _getShopItem("constructor") is not a shop item',
    room._getShopItem('constructor') === null);

  /* forge_weapon with a prototype tierKey used to pass EVERY gate,
     because each compared against undefined. */
  const wsF = fakeWs('forge');
  room.sessions.set(wsF, baseSession());
  await room.webSocketMessage(wsF, JSON.stringify({
    type: 'join', id: 'p_forge', name: 'Forge', protocolVersion: 2,
    data: { x: 0, y: 0, z: 'town' },
  }));
  const psF = room.playerState.p_forge;
  psF.coins = 0;
  const stashBefore = (psF.weaponStash || []).length;
  await room.webSocketMessage(wsF, JSON.stringify({
    type: 'forge_weapon', payload: { tierKey: 'constructor', weaponType: 'sword' },
  }));
  await room.webSocketMessage(wsF, JSON.stringify({
    type: 'forge_weapon', payload: { tierKey: '__proto__', weaponType: 'sword' },
  }));
  check('forge: a prototype tierKey mints nothing',
    (psF.weaponStash || []).length === stashBefore
    && !psF.weapon, { stash: (psF.weaponStash || []).length });
  check('forge: a prototype tierKey does not NaN the coin balance',
    !Number.isNaN(psF.coins), psF.coins);
}

{
  /* ── C-2: T1 raw stats must be ECHOED, and a client 0 must not
     overwrite a stored non-zero (the new-device character wipe). ── */
  const wsS = fakeWs('stats');
  room.sessions.set(wsS, baseSession());
  await room.webSocketMessage(wsS, JSON.stringify({
    type: 'join', id: 'p_stats', name: 'Stats', protocolVersion: 2,
    data: { x: 0, y: 0, z: 'town' },
  }));
  const psS = room.playerState.p_stats;
  psS.level = 40; psS.power = 55; psS.vitality = 44;
  psS.endurance = 33; psS.agility = 22; psS.mind = 11;
  wsS.sent.length = 0;
  room.sessions.get(wsS).lastPlayerStateSent = {};
  room._sendPlayerState(wsS, 'p_stats');
  const echo = msgsOfType(wsS, 'player_state').pop();
  check('player_state: the five T1 raw stats are echoed',
    echo && echo.payload.power === 55 && echo.payload.vitality === 44
    && echo.payload.endurance === 33 && echo.payload.agility === 22
    && echo.payload.mind === 11, echo && echo.payload);

  /* An old cached client with no localStorage copy reports zeros. */
  room._handleStatsUpdate(room.sessions.get(wsS), {
    power: 0, vitality: 0, endurance: 0, agility: 0, mind: 0,
  });
  check('stats_update: a reported 0 never overwrites a stored non-zero stat',
    psS.power === 55 && psS.vitality === 44 && psS.mind === 11,
    { power: psS.power, vitality: psS.vitality, mind: psS.mind });
  /* ...but a real change still lands. */
  room._handleStatsUpdate(room.sessions.get(wsS), { power: 60 });
  check('stats_update: a genuine stat change still applies', psS.power === 60, psS.power);
}

{
  /* ── H-1: monster_damage attacker gates.  This section is what keeps
     combat-lifecycle.test.mjs's proximity shim honest -- if you delete
     this, that shim becomes a blind spot. ── */
  const wsM = fakeWs('mdmg');
  room.sessions.set(wsM, baseSession());
  await room.webSocketMessage(wsM, JSON.stringify({
    type: 'join', id: 'p_mdmg', name: 'MD', protocolVersion: 2,
    data: { x: 0, y: 0, z: 'town' },
  }));
  const psM = room.playerState.p_mdmg;
  const mons = room._ensureZoneMonsters('meadow');
  const tgt = mons[0];
  tgt.alive = true; tgt.hp = tgt.maxHp; tgt.x = 400; tgt.y = 400;

  /* Standing in town, hitting a meadow monster. */
  const hp0 = tgt.hp;
  await room.webSocketMessage(wsM, JSON.stringify({
    type: 'monster_damage', payload: { monsterId: tgt.id, zone: 'meadow', slot: 'melee' },
  }));
  check('monster_damage: an out-of-zone attacker is denied', tgt.hp === hp0, tgt.hp);

  /* In the right zone but across the map. */
  psM.z = 'meadow'; psM.x = 40000; psM.y = 40000;
  await room.webSocketMessage(wsM, JSON.stringify({
    type: 'monster_damage', payload: { monsterId: tgt.id, zone: 'meadow', slot: 'melee' },
  }));
  check('monster_damage: an out-of-range attacker is denied', tgt.hp === hp0, tgt.hp);

  /* In range but SERVER-dead.  v2.3.1629: the gate reads ps.dying, not
     ps.dead -- ps.dead is written straight from the client's own move
     payload, so gating on it let a client whose LOCAL hp hit 0 (while
     the server still had it alive) silently lose all PvE combat. */
  psM.x = tgt.x; psM.y = tgt.y; psM.dying = true;
  await room.webSocketMessage(wsM, JSON.stringify({
    type: 'monster_damage', payload: { monsterId: tgt.id, zone: 'meadow', slot: 'melee' },
  }));
  check('monster_damage: a server-dead (dying) attacker is denied', tgt.hp === hp0, tgt.hp);

  /* ...and the converse: a client-claimed `dead` must NOT lock a player
     out of combat the server believes they are alive for. */
  psM.dying = false; psM.dead = true; psM.disconnected = false;
  delete psM._monHitCad;
  await room.webSocketMessage(wsM, JSON.stringify({
    type: 'monster_damage', payload: { monsterId: tgt.id, zone: 'meadow', slot: 'melee' },
  }));
  check('monster_damage: a client-claimed dead flag does not deny a live attacker',
    tgt.hp < hp0, tgt.hp);
  tgt.hp = hp0;

  /* Alive, in zone, in range -- must still work. */
  psM.dead = false; psM.dying = false; psM.disconnected = false;
  delete psM._monHitCad;
  await room.webSocketMessage(wsM, JSON.stringify({
    type: 'monster_damage', payload: { monsterId: tgt.id, zone: 'meadow', slot: 'melee' },
  }));
  check('monster_damage: a legitimate in-range hit still lands', tgt.hp < hp0, tgt.hp);

  /* ── v2.3.1629 (adversarial-review fixes to the v2.3.1628 gate) ──
     The first version reused PVP_TUNING.RANGE_CAP, so ranged capped at
     950 px.  A maxed Longshot bow legitimately connects at 1350
     (projectiles.js plants at 675 * bowRangeMult; bowRangeMult caps at
     x2.0), and the bow special's stuck-arrow chips every 500 ms for 4 s
     while the player kites away -- so the distance at TICK time is
     unbounded relative to firing distance and no static cap can be
     right.  Ranged/staff therefore have no proximity gate; the ZONE
     gate is what closed the reported exploit. */
  psM.dead = false; psM.dying = false; psM.disconnected = false;
  psM.z = 'meadow'; psM.x = tgt.x + 1300; psM.y = tgt.y;
  psM.rangedWeapon = { type: 'bow', tierMult: 1 };
  tgt.hp = hp0; delete psM._monHitCad;
  await room.webSocketMessage(wsM, JSON.stringify({
    type: 'monster_damage', payload: { monsterId: tgt.id, zone: 'meadow', slot: 'ranged' },
  }));
  check('monster_damage: a 1300px Longshot bow hit still lands (no ranged cap)',
    tgt.hp < hp0, { hp: tgt.hp, hp0 });

  /* A far-away chip tick from a stuck arrow, after the player kited. */
  psM.x = tgt.x + 2600; tgt.hp = hp0; delete psM._monHitCad;
  await room.webSocketMessage(wsM, JSON.stringify({
    type: 'monster_damage', payload: { monsterId: tgt.id, zone: 'meadow', slot: 'ranged', noKb: true },
  }));
  check('monster_damage: a stuck-arrow chip tick from far away still lands',
    tgt.hp < hp0, { hp: tgt.hp, hp0 });

  /* Melee still bounded -- the one job proximity keeps. */
  psM.x = tgt.x + 900; tgt.hp = hp0; delete psM._monHitCad;
  await room.webSocketMessage(wsM, JSON.stringify({
    type: 'monster_damage', payload: { monsterId: tgt.id, zone: 'meadow', slot: 'melee' },
  }));
  check('monster_damage: cross-map MELEE is still denied', tgt.hp === hp0, tgt.hp);
}

{
  /* ── v2.3.1629: the three join-allowlist findings from review ── */
  /* A peer that is ALREADY in the room, so broadcastExcept delivers the
     player_join relay to it (the relay is the third consumer of the raw
     blob that v2.3.1627 missed). */
  const wsPeer = fakeWs('joinPeer');
  room.sessions.set(wsPeer, baseSession());
  await room.webSocketMessage(wsPeer, JSON.stringify({
    type: 'join', id: 'p_peer', name: 'Peer', protocolVersion: 2,
    data: { x: 0, y: 0, z: 'town' },
  }));
  wsPeer.sent.length = 0;
  const wsV = fakeWs('joinFix');
  room.sessions.set(wsV, baseSession());
  const AVATAR = 'https://wsrv.nl/?url=https%3A%2F%2Fexample.test%2Fbros%2F' + '9'.repeat(120) + '.png&w=128&h=128&fit=cover';
  /* Sized to slip UNDER the v2.3.1618 16 KB frame gate (index.js
     MAX_INBOUND_BYTES) while exceeding the 8 KB per-value bound -- if
     it were bigger the frame gate would drop the whole join and this
     would assert nothing. */
  const bigStash = new Array(200).fill({ type: 'sword', tierMult: 1, name: 'junk-padding-value' });
  await room.webSocketMessage(wsV, JSON.stringify({
    type: 'join', id: 'p_jf', name: 'JF', protocolVersion: 2,
    data: { x: 1, y: 2, z: 'town', avatar: AVATAR, rpgWeaponStash: bigStash, rpgCoins: 7 },
  }));
  const psV = room.playerState.p_jf;
  /* avatar is a ~150-250 char proxy URL; the flat 64-char DROP removed
     it outright for every Hemi Bro holder.  Truncate, never drop. */
  check('join: a long avatar URL survives (truncated, not dropped)',
    typeof psV.avatar === 'string' && psV.avatar.length > 64, psV.avatar && psV.avatar.length);
  /* rpg* values were copied with no size check -- a phraseless join
     could park megabytes on playerState, which is spread into the
     state_sync EVERY later joiner receives. */
  check('join: an oversized rpg* container is dropped',
    psV.rpgWeaponStash === undefined,
    psV.rpgWeaponStash && psV.rpgWeaponStash.length);
  check('join: a normal rpg* scalar still lands', psV.rpgCoins === 7, psV.rpgCoins);
  /* The THIRD consumer: player_join relayed the RAW blob to peers. */
  const relay = wsPeer.sent.filter((m) => m.type === 'player_join' && m.id === 'p_jf').pop();
  check('join: the player_join relay carries the SANITIZED data',
    !!relay && relay.data && relay.data._zoneEntryGraceUntil === undefined
      && relay.data.rpgWeaponStash === undefined,
    relay && Object.keys(relay.data || {}).length);
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
