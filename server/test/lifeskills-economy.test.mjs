/* Life-skills economy test (v2.3.1142, PR "core test safety net").
 * Forge / cook / shop / harvest are the coin-and-material faucets and
 * sinks of the whole non-combat economy, and none of them had a single
 * dedicated assertion.  Every rejection case asserts the state is
 * UNTOUCHED -- a half-consumed rejection is itself an economy bug.
 * Checks:
 *   1.  Forge happy path: exact ore + gold debits, mint shape
 *       (tierMult / gearBase / quality fields), old weapon swapped to
 *       stash, minLvl*5 crafting XP.
 *   2.  Forge rejections (each leaves state untouched): skill gate,
 *       stat gate, insufficient ore, insufficient gold, stash full
 *       with a current weapon, woodwork/weapon-type mismatch, threat
 *       gear lock.
 *   2b. sell_weapon (v2.3.1169): pays the server-computed value,
 *       removes the stash entry; out-of-range/negative idx no-ops.
 *   3.  cook_request: consumes exactly one raw fish; 'cooked' mints
 *       cooked_<fish> + 8 cooking XP, 'burnt' mints burnt_dust; the
 *       20/min rate limit drops the request WITHOUT consuming.
 *   3a. cook physics floor (v2.3.1167): consecutive cooks below the
 *       minigame's own open-window minimum are dropped without
 *       consuming; a full-window gap cooks normally.
 *   3b. eat_request (v2.3.1166): consumes exactly one cooked fish and
 *       heals by the tier amount; raw fish inedible; consume-at-full-HP
 *       anti-race posture; zero-held is a clean no-op.
 *   4.  cook_recipe: dry-run-then-consume (a failed recipe consumes
 *       nothing), buff timer set on ps._buffs, tier*25 cooking XP.
 *   5.  shop_purchase: exact debit, trap lands in inventory,
 *       influence discount (0.2%/pt cap 20%), insufficient coins is a
 *       clean no-op.
 *   6.  Harvest: extraction_start records the timing window; a strike
 *       BEFORE earliestOpen is rejected (node alive, reject counter);
 *       a strike inside the window (backdated startedAt) harvests --
 *       inventory + XP + node depleted with a future respawnAt +
 *       harvest_credit; out-of-range strike rejected; a strike with NO
 *       extraction state falls through permissively (legacy-client
 *       posture -- pins current behavior deliberately).
 * Uses the shared harness pattern (map storage, fakeWs, direct join
 * via webSocketMessage); never starts startTickLoop. */
import { GameRoom } from '../src/index.js';
import { BLACKSMITH_TIERS, COOKING_RECIPES, SHOP_ITEMS } from '../src/data.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
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

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: -100000, y: -100000, z: 'town' } }));
}
const send = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
// Rejection helper: snapshot the economy-relevant state, run the
// action, and require a byte-identical snapshot afterward.
const econSnap = (ps) => JSON.stringify({
  coins: ps.coins, inventory: ps.inventory, weapon: ps.weapon,
  stash: ps.weaponStash, ls: ps.lifeSkills,
});

const ws = fakeWs('e');
await join(ws, 'bp_ls_a');
const ps = room.playerState['bp_ls_a'];

// ── 1. forge happy path (iron sword: minLvl 11, 4 ore, 35g) ──
const IRON = BLACKSMITH_TIERS.iron;
// Governing stat comes from EQUIP_STAT_MAP (sword -> agility, NOT
// power -- only greatswords gate on power); resolve it dynamically so
// the test can't drift from the map.
const SWORD_STAT = room._equipStatFor('sword');
ps.lifeSkills = { blacksmithing: { level: 11, xp: 0 } };
ps[SWORD_STAT] = IRON.statReq; // exactly meets the stat gate
ps.coins = 1000;
ps.inventory = { ore_iron_ore: 5 };
ps.weapon = { type: 'sword', tierMult: 1, _old: true };
ps.weaponStash = [];
await send(ws, 'forge_weapon', { weaponType: 'sword', tierKey: 'iron', isWoodwork: false });
check('forge mints the tier shape (tierMult/gearBase/quality/H0)',
  ps.weapon && ps.weapon.tierMult === IRON.tierMult && ps.weapon.gearBase === 'iron'
  && typeof ps.weapon.quality === 'string' && ps.weapon.hardness === 0 && ps.weapon.hardenBonus === null,
  ps.weapon);
check('forge debits EXACTLY the ore + gold costs',
  ps.inventory.ore_iron_ore === 5 - IRON.oreCost && ps.coins === 1000 - IRON.goldCost,
  { ore: ps.inventory.ore_iron_ore, coins: ps.coins });
check('forge swaps the old weapon into the stash (never destroys it)',
  ps.weaponStash.length === 1 && ps.weaponStash[0]._old === true);
check('forge grants minLvl*5 crafting XP',
  ps.lifeSkills.blacksmithing.xp === IRON.minLvl * 5, ps.lifeSkills.blacksmithing);

// ── 2. forge rejections: state must be UNTOUCHED ──
const rejectCase = async (name, mutate, payload) => {
  // Reset to a known-good forgeable state, apply the case's mutation,
  // snapshot, attempt, compare.
  ps.lifeSkills = { blacksmithing: { level: 11, xp: 0 } };
  ps[SWORD_STAT] = IRON.statReq;
  ps.coins = 1000;
  ps.inventory = { ore_iron_ore: 5 };
  ps.weapon = { type: 'sword', tierMult: 1 };
  ps.weaponStash = [];
  ps._gearLockUntil = 0;
  mutate();
  const before = econSnap(ps);
  await send(ws, 'forge_weapon', payload || { weaponType: 'sword', tierKey: 'iron', isWoodwork: false });
  check('forge rejection leaves state untouched: ' + name, econSnap(ps) === before, { before, after: econSnap(ps) });
};
await rejectCase('skill gate (mythril needs Lv31)', () => {}, { weaponType: 'sword', tierKey: 'mythril', isWoodwork: false });
await rejectCase('stat gate (governing stat below statReq)', () => { ps[SWORD_STAT] = IRON.statReq - 1; });
await rejectCase('insufficient ore', () => { ps.inventory = { ore_iron_ore: IRON.oreCost - 1 }; });
await rejectCase('insufficient gold', () => { ps.coins = IRON.goldCost - 1; });
await rejectCase('stash full with a current weapon equipped', () => {
  ps.weaponStash = Array.from({ length: room.WEAPON_STASH_CAP }, () => ({ type: 'sword', tierMult: 1 }));
});
await rejectCase('woodwork/weapon-type mismatch (bow via blacksmith)', () => {}, { weaponType: 'bow', tierKey: 'iron', isWoodwork: false });
await rejectCase('threat gear lock', () => { ps._gearLockUntil = Date.now() + 60000; });
ps._gearLockUntil = 0;

// ── 2b. sell_weapon (v2.3.1169: first wire-level coverage, added with
// the gear.js extraction; the tierMult sell-value clamp is covered
// direct-call in anticheat §6) ──
ps.coins = 100;
ps.weaponStash = [{ type: 'sword', tierMult: 2 }, { type: 'bow', tierMult: 1 }];
const expectedSell = room._weaponSellValue(ps.weaponStash[0]);
await send(ws, 'sell_weapon', { stashIdx: 0 });
check('sell: pays the server-computed value and removes the stash entry',
  ps.coins === 100 + expectedSell && ps.weaponStash.length === 1
  && ps.weaponStash[0].type === 'bow',
  { coins: ps.coins, expectedSell, stash: ps.weaponStash });
const preSell = econSnap(ps);
await send(ws, 'sell_weapon', { stashIdx: 5 });
check('sell: out-of-range stashIdx is a clean no-op', econSnap(ps) === preSell);
await send(ws, 'sell_weapon', { stashIdx: -1 });
check('sell: negative stashIdx is a clean no-op', econSnap(ps) === preSell);

// ── 3. cook_request ──
ps.inventory = { fish_minnow: 2 };
ps.lifeSkills = { cooking: { level: 1, xp: 0 } };
ps._cookHistory = [];
await send(ws, 'cook_request', { fishKey: 'fish_minnow', kind: 'cooked' });
check('cook: consumes ONE raw fish, mints cooked_<fish>, +8 cooking XP',
  ps.inventory.fish_minnow === 1 && ps.inventory.cooked_fish_minnow === 1 && ps.lifeSkills.cooking.xp === 8,
  ps.inventory);
ps._lastCookAt = Date.now() - 60000; // v2.3.1167: clear the physics floor
await send(ws, 'cook_request', { fishKey: 'fish_minnow', kind: 'burnt' });
check('cook: burnt outcome mints burnt_dust, no XP',
  ps.inventory.fish_minnow === undefined && ps.inventory.burnt_dust === 1 && ps.lifeSkills.cooking.xp === 8,
  ps.inventory);
// Rate limit: 20 in the rolling minute -> the 21st is dropped WITHOUT
// consuming (the fish stockpile conversion throttle, v2.3.1104).
ps.inventory = { fish_minnow: 1 };
ps._cookHistory = Array.from({ length: 20 }, () => Date.now());
ps._lastCookAt = Date.now() - 60000;
await send(ws, 'cook_request', { fishKey: 'fish_minnow', kind: 'cooked' });
check('cook: rate limit drops the request without consuming the fish',
  ps.inventory.fish_minnow === 1 && (ps.inventory.cooked_fish_minnow || 0) === 0,
  ps.inventory);
ps._cookHistory = [];

// ── 3a. cook physics floor (v2.3.1167): a cook can't complete faster
// than the minigame's own open window ──
ps.inventory = { fish_minnow: 3 };
ps.lifeSkills = { cooking: { level: 1, xp: 0 } };
ps._cookHistory = [];
ps._lastCookAt = 0;
await send(ws, 'cook_request', { fishKey: 'fish_minnow', kind: 'cooked' });
check('floor: first cook lands normally', ps.inventory.fish_minnow === 2, ps.inventory);
// Immediate follow-up: humanly impossible (window is >= ~1.7s even at
// max skill) -> dropped WITHOUT consuming, no XP.
await send(ws, 'cook_request', { fishKey: 'fish_minnow', kind: 'cooked' });
check('floor: instant second cook is dropped without consuming',
  ps.inventory.fish_minnow === 2 && ps.inventory.cooked_fish_minnow === 1
  && ps.lifeSkills.cooking.xp === 8,
  { inv: ps.inventory, xp: ps.lifeSkills.cooking.xp });
// A sub-floor gap (1s < the 1200ms flat floor) still fails even with
// an empty rate-limit history.
ps._cookHistory = [];
ps._lastCookAt = Date.now() - 1000;
await send(ws, 'cook_request', { fishKey: 'fish_minnow', kind: 'cooked' });
check('floor: 1s-gap cook is dropped (below the flat 1200ms floor)',
  ps.inventory.fish_minnow === 2, ps.inventory);
// v2.3.1432: a 1.4s gap used to be eaten by the lvl-1 minnow curve
// floor (~3.4s) -- the owner's "minnow still isn't cooking" class of
// silent drop.  With the flat 1200ms floor it lands.
ps._cookHistory = [];
ps._lastCookAt = Date.now() - 1400;
await send(ws, 'cook_request', { fishKey: 'fish_minnow', kind: 'cooked' });
check('floor: 1.4s-gap cook lands (v2.3.1432 flat floor; curve floor ate this)',
  ps.inventory.fish_minnow === 1 && ps.inventory.cooked_fish_minnow === 2, ps.inventory);
// Backdated well past the floor -> accepted.
ps._cookHistory = [];
ps._lastCookAt = Date.now() - 10000;
await send(ws, 'cook_request', { fishKey: 'fish_minnow', kind: 'cooked' });
check('floor: full-gap cook cooks normally (last fish key deleted at 0)',
  ps.inventory.fish_minnow === undefined && ps.inventory.cooked_fish_minnow === 3, ps.inventory);
// v2.3.1432: cooking a fish the server blob does NOT hold used to be a
// SILENT return -- the client's optimistic celebration played and no
// correction ever arrived.  Now the drop echoes player_state so the
// client bag reconciles.
ps._cookHistory = [];
ps._lastCookAt = Date.now() - 10000;
ws.sent.length = 0;
await send(ws, 'cook_request', { fishKey: 'fish_trout', kind: 'cooked' });
check('missing-fish cook echoes player_state (no silent drop)',
  msgsOfType(ws, 'player_state').length >= 1 && (ps.inventory.cooked_fish_trout || 0) === 0,
  ws.sent.map((m) => m.type));

// ── 3b. eat_request (v2.3.1166: first direct coverage, added with the
// cooking.js extraction) ──
ps.inventory = { cooked_fish_minnow: 2, fish_minnow: 1 };
ps.maxHp = 100; ps.hp = 50;
ps.hpSpec = {}; // no Recovery grid points -> 1.0 heal multiplier
await send(ws, 'eat_request', { invKey: 'cooked_fish_minnow' });
const minnowHeal = room._fishHealAmount('cooked_fish_minnow');
check('eat: consumes one cooked fish and heals by the tier amount',
  ps.inventory.cooked_fish_minnow === 1 && ps.hp === Math.min(100, 50 + minnowHeal),
  { hp: ps.hp, heal: minnowHeal, inv: ps.inventory });
await send(ws, 'eat_request', { invKey: 'fish_minnow' });
check('eat: RAW fish is not edible (inventory untouched)',
  ps.inventory.fish_minnow === 1, ps.inventory);
ps.hp = ps.maxHp;
await send(ws, 'eat_request', { invKey: 'cooked_fish_minnow' });
check('eat: at full HP the fish is still consumed (anti-race posture)',
  ps.inventory.cooked_fish_minnow === undefined && ps.hp === ps.maxHp, ps.inventory);
await send(ws, 'eat_request', { invKey: 'cooked_fish_minnow' });
check('eat: eating with zero held is a clean no-op',
  ps.inventory.cooked_fish_minnow === undefined && ps.hp === ps.maxHp, ps.inventory);

// ── 4. cook_recipe (dry-run-then-consume) ──
const R0 = COOKING_RECIPES[0]; // { herb_firebloom: 1 } -> regen buff
ps.inventory = { herb_firebloom: 2 };
ps.lifeSkills = { cooking: { level: 1, xp: 0 } };
ps._buffs = {};
await send(ws, 'cook_recipe', { recipeIdx: 0 });
check('recipe: ingredient consumed, buff timer set, tier*25 cooking XP',
  ps.inventory.herb_firebloom === 1 && ps._buffs.regen > Date.now()
  && ps.lifeSkills.cooking.xp === (R0.tier || 1) * 25,
  { inv: ps.inventory, buffs: ps._buffs, xp: ps.lifeSkills.cooking.xp });
// Recipe 1 needs rock_vine + cloudpetal; holding only one of the two
// must consume NEITHER (the dry-run pass).
ps.inventory = { herb_rock_vine: 1 };
const preRecipe = econSnap(ps);
await send(ws, 'cook_recipe', { recipeIdx: 1 });
check('recipe: missing one ingredient consumes NOTHING (dry-run rule)', econSnap(ps) === preRecipe);

// ── 5. shop_purchase ──
const TRAP = SHOP_ITEMS.basicTrap;
ps.coins = 100; ps.inventory = {};
await send(ws, 'shop_purchase', { itemId: 'basicTrap' });
check('shop: exact debit + trap in inventory',
  ps.coins === 100 - TRAP.cost && ps.inventory.basic_trap === 1, { coins: ps.coins, inv: ps.inventory });
// v2.3.1155: the influence discount retired with the stat — even a blob
// carrying a stale influence value pays full price.
ps.coins = 100; ps.influence = 50;
await send(ws, 'shop_purchase', { itemId: 'basicTrap' });
check('shop: retired influence discount no longer applies (full price)',
  ps.coins === 100 - TRAP.cost, { coins: ps.coins });
delete ps.influence;
ps.coins = 3;
const preShop = econSnap(ps);
await send(ws, 'shop_purchase', { itemId: 'basicTrap' });
check('shop: insufficient coins is a clean no-op', econSnap(ps) === preShop);

// ── 6. harvest (extraction window + node_strike) ──
ps.z = 'meadow';
const nodes = room._ensureZoneNodes('meadow');
const n0 = nodes[0];
n0.alive = true; n0.respawnAt = 0;
ps.x = n0.x; ps.y = n0.y;
ps.inventory = {};
ps.lifeSkills = {};
const skillName = room._harvestSkillName(n0.nodeType);
const invKey = room._harvestInvKey(n0.nodeType, n0.tierLvl);
const session = room.sessions.get(ws);

// 6a. impossibly-fast strike: before earliestOpen -> rejected, node
// stays alive, reject counter increments, nothing granted.
await send(ws, 'extraction_start', { nodeId: n0.id, zone: 'meadow', skill: skillName });
await send(ws, 'node_strike', { id: n0.id, zone: 'meadow', accuracy: 'good' });
check('harvest: strike before the open window is rejected (node alive, counter bumped)',
  n0.alive === true && session._extractionRejects === 1 && (ps.inventory[invKey] || 0) === 0,
  { rejects: session._extractionRejects, inv: ps.inventory });

// 6b. strike inside the window (backdate startedAt past the delay).
const ex = room.extractions['bp_ls_a'];
ex.startedAt = Date.now() - ex.openDelayBase - 500;
ws.sent.length = 0;
await send(ws, 'node_strike', { id: n0.id, zone: 'meadow', accuracy: 'good' });
const credit = msgsOfType(ws, 'harvest_credit')[0];
check('harvest: in-window strike grants inventory + skill XP',
  (ps.inventory[invKey] || 0) >= 1 && ps.lifeSkills[skillName] && ps.lifeSkills[skillName].xp > 0,
  { inv: ps.inventory, ls: ps.lifeSkills });
check('harvest: node depleted with a future respawnAt',
  n0.alive === false && n0.respawnAt > Date.now());
check('harvest: private harvest_credit carries the skill + XP',
  !!credit && credit.payload.skillName === skillName && credit.payload.xpAmt > 0, credit && credit.payload);

// 6c. out-of-range strike: rejected before any timing logic.
n0.alive = true; n0.respawnAt = 0;
const invBefore = ps.inventory[invKey] || 0;
ps.x = n0.x + room.NODE_STRIKE_RANGE + 50; ps.y = n0.y;
await send(ws, 'extraction_start', { nodeId: n0.id, zone: 'meadow', skill: skillName });
await send(ws, 'node_strike', { id: n0.id, zone: 'meadow', accuracy: 'good' });
check('harvest: out-of-range strike rejected (node alive, nothing granted)',
  n0.alive === true && (ps.inventory[invKey] || 0) === invBefore);

// 6d. no extraction state: permissive fallthrough (legacy clients /
// DO restart mid-attempt).  Pins CURRENT behavior deliberately -- if
// the posture ever tightens to reject, update this assertion in the
// same PR that changes it.
delete room.extractions['bp_ls_a'];
ps.x = n0.x; ps.y = n0.y;
await send(ws, 'node_strike', { id: n0.id, zone: 'meadow', accuracy: 'good' });
check('harvest: strike with NO extraction state still harvests (legacy posture) + counter bumped',
  n0.alive === false && (ps.inventory[invKey] || 0) === invBefore + 1 && session._extractionMissing === 1,
  { missing: session._extractionMissing, inv: ps.inventory[invKey] });

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
