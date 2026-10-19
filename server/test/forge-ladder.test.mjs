/* ═══ v2.3.3488: THE FORGE'S LADDER (server/src/forgeladder.js) ═══
 *
 * The owner's playtest notes at the Blacksmith (2026-10-19, spec:
 * docs/specs/blacksmith-2026-10-19.md):
 *   "Also 'wood greatsword' is not an actual weapon in the game.  Make the
 *    beginning weapon a copper greatsword (requiring smithing lvl 1)"
 *   "Copper 1, iron 5, black steel 10 for smithing lvl req"
 *   "Hardening should only require the same smithing level as it takes to
 *    smithing that item tier"
 * Checks, against a real room, through the real messages:
 *   1. caps.forgeladder advertised, a name the flags route can throw;
 *   2. the wood tier is not forged (nothing minted, nothing taken);
 *   3. the Smithing levels: copper at 1, iron refused at 4 and forged at 5,
 *      black steel refused at 9 and forged at 10; a tier past it at its new
 *      level from its ore; the XP each pays unchanged (copper 800, titanium
 *      105 -- its old level x 5, pinned);
 *   4. the forge's Melee gate is the WEAR gate: copper and iron at Melee 1,
 *      black steel refused at Melee 9 and forged at 10 -- what wearing it asks
 *      (_prog3EquipOk), which the old gate (5 x the place: copper 5) was not;
 *   5. an older page's one-handed sword is still forged;
 *   6. hardening asks the level that makes the tier: a copper greatsword
 *      Smithing 1, iron refused at 4 and taken at 5, black steel refused at 9;
 *      a pine bow Woodworking 1, a softwood bow refused at Woodworking 5 and
 *      taken at 6; a legacy blade with no gearBase ranked by its tierMult;
 *   7. the kill switch `forgeladder: false`: the cap off at join, the wood
 *      tier forged again, copper back at Smithing 6 and Melee 5, hardening
 *      back at 5 x the tier (a copper greatsword Smithing 10);
 *   8. a prototype tierKey still mints nothing, on either ladder.
 */
import { GameRoom } from '../src/index.js';
import { BLACKSMITH_TIERS } from '../src/data.js';
import { FORGE_LADDER, forgeLevelFor, forgeOffered } from '../src/forgeladder.js';

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
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(makeState(), mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Smith', protocolVersion: 2, phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const realRandom = Math.random;

const ws = fakeWs('f');
await join(ws, 'bp_fl_a');
const ps = room.playerState.bp_fl_a;

/* a known-good bench: plenty of gold and makings, an empty hand, a level */
function bench(smith, melee) {
  ps.coins = 100000;
  ps.inventory = { bar_copper: 40, bar_iron: 40, bar_black_steel: 40, wood_pine_log: 40, ore_titanium_ore: 40 };
  ps.weapon = null;
  ps.weaponStash = [];
  ps._gearLockUntil = 0;
  ps.lifeSkills = { blacksmithing: { level: smith, xp: 0 }, woodworking: { level: 1, xp: 0 } };
  if (ps.prog3 && ps.prog3.sk) ps.prog3.sk.sword = { ...(ps.prog3.sk.sword || {}), level: melee };
}
const forge = (tierKey, weaponType = 'greatsword') => room.webSocketMessage(ws, JSON.stringify({ type: 'forge_weapon', payload: { weaponType, tierKey, isWoodwork: false } }));
const snap = () => JSON.stringify({ coins: ps.coins, inv: ps.inventory, w: ps.weapon, stash: ps.weaponStash, ls: ps.lifeSkills });
/* forge with the quality roll pinned, so the mint is deterministic */
async function forged(tierKey, weaponType) {
  Math.random = () => 0.5;
  try { await forge(tierKey, weaponType); } finally { Math.random = realRandom; }
  return ps.weapon;
}

// ── 1. caps ──
{
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  check('1a state_sync advertises caps.forgeladder', !!sync && sync.caps && sync.caps.forgeladder === true, sync && sync.caps && sync.caps.forgeladder);
  check('1b ...a name the admin flags route can throw (lower case, TRAPS §117)', /^[a-z0-9_]{1,32}$/.test('forgeladder'));
  check('1c the player is a trained (prog3) character, so the Melee gate is the one under test (guard)', !!(ps.prog3 && ps.prog3.sk && ps.prog3.sk.sword), ps.prog3);
}

// ── 2. the wood tier is not forged ──
{
  bench(99, 99);
  const before = snap();
  await forge('wood');
  check('2a a wood greatsword is not forged: nothing minted, no logs or gold taken', ps.weapon === null && snap() === before, { w: ps.weapon });
  check('2b ...by the table: wood carries forge:false and is the only tier that does',
    BLACKSMITH_TIERS.wood.forge === false && Object.keys(BLACKSMITH_TIERS).filter((k) => BLACKSMITH_TIERS[k].forge === false).join() === 'wood'
      && forgeOffered('wood') === false && forgeOffered('copper') === true);
}

// ── 3. the Smithing levels ──
{
  check('3a the ladder: copper 1, iron 5, black steel 10, then five more a tier (worldbreaker 90)',
    ['copper', 'iron', 'steel', 'titanium', 'obsidian', 'worldbreaker'].map((k) => forgeLevelFor(k)).join() === '1,5,10,15,20,90',
    Object.keys(BLACKSMITH_TIERS).map((k) => k + ':' + forgeLevelFor(k)));
  bench(1, 1);
  const cu = await forged('copper');
  check('3b a copper greatsword at Smithing 1 (and Melee 1): forged from four bars and 20 gold',
    !!cu && cu.gearBase === 'copper' && cu.type === 'greatsword' && ps.inventory.bar_copper === 36 && ps.coins === 100000 - 20, { cu, inv: ps.inventory });
  check('3c ...paying its 800 Smithing XP, as before', ps.lifeSkills.blacksmithing.xp + (ps.lifeSkills.blacksmithing.level > 1 ? 1000 : 0) === 800, ps.lifeSkills.blacksmithing);
  bench(4, 99);
  let before = snap();
  await forge('iron');
  check('3d an iron greatsword refused at Smithing 4, nothing taken', ps.weapon === null && snap() === before);
  bench(5, 1);
  const fe = await forged('iron');
  check('3e ...and forged at Smithing 5 (and Melee 1: iron asks nothing to wear)', !!fe && fe.gearBase === 'iron' && ps.inventory.bar_iron === 36, fe);
  bench(9, 99);
  before = snap();
  await forge('steel');
  check('3f a black steel greatsword refused at Smithing 9', ps.weapon === null && snap() === before);
  bench(10, 10);
  const bs = await forged('steel');
  check('3g ...and forged at Smithing 10', !!bs && bs.gearBase === 'steel' && ps.inventory.bar_black_steel === 36, bs);
  bench(14, 99);
  before = snap();
  await forge('titanium');
  check('3h titanium refused at Smithing 14 (15 now; it was 21)', ps.weapon === null && snap() === before);
  bench(15, 99);
  const xp0 = ps.lifeSkills.blacksmithing.xp;
  const ti = await forged('titanium');
  check('3i ...forged at 15 from its five ore, paying the 105 XP it paid at its old level 21 (pinned)',
    !!ti && ti.gearBase === 'titanium' && ps.inventory.ore_titanium_ore === 35 && ps.lifeSkills.blacksmithing.xp - xp0 === 105 && BLACKSMITH_TIERS.titanium.xp === 105, { ti, ls: ps.lifeSkills });
}

// ── 4. the Melee gate is the wear gate ──
{
  bench(99, 1);
  const cu = await forged('copper');
  check('4a copper at Melee 1: forged (the old gate asked Melee 5 of it)', !!cu && cu.gearBase === 'copper');
  bench(99, 9);
  const before = snap();
  await forge('steel');
  check('4b black steel at Melee 9: refused, nothing taken', ps.weapon === null && snap() === before);
  check('4c ...exactly what wearing it asks: _prog3EquipOk refuses it at 9 and takes it at 10',
    room._prog3EquipOk(ps, 'weapon', { type: 'greatsword', gearBase: 'steel', tierMult: BLACKSMITH_TIERS.steel.tierMult }) === false
      && room._prog3EquipOk({ ...ps, prog3: { ...ps.prog3, sk: { ...ps.prog3.sk, sword: { level: 10 } } } }, 'weapon', { type: 'greatsword', gearBase: 'steel', tierMult: 1.4 }) === true);
  bench(99, 10);
  const bs = await forged('steel');
  check('4d ...and forged at Melee 10', !!bs && bs.gearBase === 'steel', bs);
}

// ── 5. an older page's sword ──
{
  bench(1, 1);
  const sw = await forged('copper', 'sword');
  check('5a the worker still forges a one-handed sword for an older page (the game forges greatswords only)', !!sw && sw.type === 'sword' && sw.gearBase === 'copper', sw);
}

// ── 6. hardening asks the level that makes the tier ──
const harden = (slot) => room.webSocketMessage(ws, JSON.stringify({ type: 'harden_weapon', payload: { slot } }));
const lastHR = () => { const r = ws.sent.filter((m) => m.type === 'harden_result'); return r.length ? r[r.length - 1].payload : null; };
async function tryHarden(slot, w, skill, lvl) {
  ps.coins = 100000;
  ps.inventory = { bar_copper: 20, bar_iron: 20, bar_black_steel: 20, hardened_pine: 20, hardened_softwood: 20 };
  ps._gearLockUntil = 0;
  ps.lifeSkills = { blacksmithing: { level: skill === 'blacksmithing' ? lvl : 1, xp: 0 }, woodworking: { level: skill === 'woodworking' ? lvl : 1, xp: 0 } };
  ps[slot] = { ...w, quality: 'normal', hardness: 0, temper: 0 };
  ws.sent.length = 0;
  Math.random = () => 0.0;   /* a sure success, if it is let through */
  try { await harden(slot); } finally { Math.random = realRandom; }
  return lastHR();
}
{
  let r = await tryHarden('weapon', { type: 'greatsword', gearBase: 'copper', tierMult: 1.12, name: 'Copper Greatsword' }, 'blacksmithing', 1);
  check('6a a copper greatsword hardens at Smithing 1 (it asked 10: 5 x its tier)', !!r && r.success === true && ps.weapon.hardness === 1, r);
  r = await tryHarden('weapon', { type: 'greatsword', gearBase: 'iron', tierMult: 1.25, name: 'Iron Greatsword' }, 'blacksmithing', 4);
  check('6b an iron greatsword at Smithing 4: refused "Need Blacksmithing Lv5", nothing taken',
    !!r && r.error === 'skill-gate' && /Need Blacksmithing Lv5 /.test(r.message) && ps.coins === 100000 && ps.inventory.bar_iron === 20, r);
  r = await tryHarden('weapon', { type: 'greatsword', gearBase: 'iron', tierMult: 1.25, name: 'Iron Greatsword' }, 'blacksmithing', 5);
  check('6c ...and hardened at Smithing 5', !!r && r.success === true && ps.inventory.bar_iron === 19, r);
  r = await tryHarden('weapon', { type: 'greatsword', gearBase: 'steel', tierMult: 1.4, name: 'Black Steel Greatsword' }, 'blacksmithing', 9);
  check('6d a black steel greatsword at Smithing 9: refused "Lv10"', !!r && r.error === 'skill-gate' && /Lv10 /.test(r.message), r);
  r = await tryHarden('rangedWeapon', { type: 'bow', gearBase: 'ww_pine', tierMult: 1, name: 'Pine Bow' }, 'woodworking', 1);
  check('6e a pine bow hardens at Woodworking 1 (the level that makes pine; it asked 5)', !!r && r.success === true && ps.inventory.hardened_pine === 19, r);
  r = await tryHarden('rangedWeapon', { type: 'bow', gearBase: 'ww_softwood', tierMult: 1.12, name: 'Softwood Bow' }, 'woodworking', 5);
  check('6f a softwood bow at Woodworking 5: refused "Need Woodworking Lv6" (the Woodworker\'s own level for softwood)',
    !!r && r.error === 'skill-gate' && /Need Woodworking Lv6 /.test(r.message), r);
  r = await tryHarden('rangedWeapon', { type: 'bow', gearBase: 'ww_softwood', tierMult: 1.12, name: 'Softwood Bow' }, 'woodworking', 6);
  check('6g ...and hardened at Woodworking 6', !!r && r.success === true && ps.inventory.hardened_softwood === 19, r);
  check('6h a legacy blade with no gearBase is ranked by its tierMult: 1.25 asks iron\'s 5, 1.0 the wood tier\'s 1, a bow by the Woodworker\'s table',
    room._hardenLevelFor({ type: 'sword', tierMult: 1.25 }, 'weapon') === 5 && room._hardenLevelFor({ type: 'sword', tierMult: 1 }, 'weapon') === 1
      && room._hardenLevelFor({ type: 'bow', tierMult: 1.25 }, 'rangedWeapon') === 11 && room._hardenLevelFor({ gearBase: '__proto__' }, 'weapon') === 1,
    [room._hardenLevelFor({ type: 'sword', tierMult: 1.25 }, 'weapon'), room._hardenLevelFor({ type: 'bow', tierMult: 1.25 }, 'rangedWeapon')]);
  check('6i the tier index that picks the material did not move: an iron blade still takes iron bars, tier 3',
    room._weaponTierIndex({ gearBase: 'iron' }) === 3 && room._weaponTierIndex({ gearBase: 'wood' }) === 1);
}

// ── 7. the kill switch ──
{
  room._liveFlags = { forgeladder: false };
  const wsK = fakeWs('k');
  await join(wsK, 'bp_fl_k');
  const syncK = wsK.sent.find((m) => m.type === 'state_sync');
  check('7a `forgeladder: false`: caps.forgeladder goes false at join', !!syncK && syncK.caps && syncK.caps.forgeladder === false, syncK && syncK.caps && syncK.caps.forgeladder);
  room.sessions.delete(wsK);
  delete room.playerState.bp_fl_k;
  check('7b ...the old ladder: wood 1, copper 6, iron 11, black steel 16 ... worldbreaker 96',
    ['wood', 'copper', 'iron', 'steel', 'worldbreaker'].map((k) => FORGE_LADDER.OLD_LEVELS[k]).join() === '1,6,11,16,96');
  bench(1, 1);
  const wd = await forged('wood');
  check('7c the wood tier is forged again (three pine logs, 8 gold)', !!wd && wd.gearBase === 'wood' && ps.inventory.wood_pine_log === 37 && ps.coins === 100000 - 8, wd);
  bench(5, 99);
  let before = snap();
  await forge('copper');
  check('7d copper refused at Smithing 5 (its old 6)', ps.weapon === null && snap() === before);
  bench(6, 4);
  before = snap();
  await forge('copper');
  check('7e copper refused at Melee 4 with Smithing 6: the old gate, 5 x its place', ps.weapon === null && snap() === before);
  bench(6, 5);
  const cu = await forged('copper');
  check('7f ...and forged at Smithing 6 and Melee 5', !!cu && cu.gearBase === 'copper', cu);
  let r = await tryHarden('weapon', { type: 'greatsword', gearBase: 'copper', tierMult: 1.12, name: 'Copper Greatsword' }, 'blacksmithing', 9);
  check('7g hardening back at 5 x the tier: a copper greatsword refused at Smithing 9 "Lv10"', !!r && r.error === 'skill-gate' && /Need Blacksmithing Lv10 /.test(r.message), r);
  r = await tryHarden('rangedWeapon', { type: 'bow', gearBase: 'ww_pine', tierMult: 1, name: 'Pine Bow' }, 'woodworking', 4);
  check('7h ...a pine bow refused at Woodworking 4 "Lv5", as v2.3.3481 asked', !!r && r.error === 'skill-gate' && /Need Woodworking Lv5 /.test(r.message), r);
  room._liveFlags = {};
}

// ── 8. prototype keys ──
for (const old of [false, true]) {
  room._liveFlags = old ? { forgeladder: false } : {};
  bench(99, 99);
  const before = snap();
  for (const k of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) await forge(k);
  check('8' + (old ? 'b' : 'a') + ' a prototype tierKey mints nothing and takes nothing' + (old ? ' (the old ladder too)' : ''),
    ps.weapon === null && snap() === before && !Number.isNaN(ps.coins));
}
room._liveFlags = {};

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) { console.log(failures + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
