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
  check('bootstrap: level clamps to BOOTSTRAP_LEVEL_CAP (500)', bootN && bootN.level === 500, bootN && bootN.level);
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

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
