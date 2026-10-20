/* A gem goes into a weapon on the worker, and the monsters' hold rule --
 * v2.3.3513 (server/src/weapongem.js, elemental.js HOLD; docs/GEM-PLAN.md,
 * its Phase 1: the owner took every recommended answer, 2026-10-20).
 *
 *   1. The flags: caps.weapongem and caps.monsterhold, under kill-switch
 *      names; the receipt is privileged; 400 XP a gem (decision 11).
 *   2. A gem into the weapon in hand: one polished gem off the worker's own
 *      count, the gem in, the colour tier and the name, the metal's damage
 *      untouched (decision 9), 400 Enchanting XP, a player_state after the
 *      receipt, saved.
 *   3. It lasts: a rejoin keeps it (the stored copy, through the sanitizer).
 *   4. Refused, nothing taken: every reason, and a full weapon is never
 *      overwritten (decision 10).
 *   5. The second slot (a two-slot base): Enchanting 20, another element, a
 *      volatile pair only in a base made for it.
 *   6. One gem is spent once: two asks, one gem.
 *   7. The fight reads the worker's copy, never the claim: the status, a
 *      special's element, no gem no element; `weapongem: false` puts the
 *      claim back.
 *   8. What a real gem switches on: the Element Burst, the flame amulet.
 *   9. Take out gives it back, owed no XP: set again pays none; a salvaged
 *      weapon gives its gem back too.  (v2.3.3516: the XP is for gems a
 *      player MADE -- 9b: one gem passed between two players pays once.)
 *  10. The sanitizer: elements are status-table own keys, a lone second
 *      moves up, a pair is not twice one element, isVolatile is the pair's;
 *      an old drop's gems stay.  v2.3.3516: the join moves an old pouch into
 *      the bag and owes its polished gems their XP, less those come back.
 *  11. A sell order lists the gems its weapon really holds.
 *  12. The hold rule: 1.5 s stopped, then chilled (freeze) or walking
 *      (root), not again for 3 s, half for a boss; the tick reads it; the
 *      old lock with `monsterhold: false`; a respawn starts clean.
 *  13. One row written a gem set; a refusal writes none.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
let WG = {};
try { WG = await import('../src/weapongem.js'); } catch (e) { WG = {}; }
const WEAPON_GEM = WG.WEAPON_GEM || {};
const weaponGemName = WG.weaponGemName || (() => null);
const weaponGemSlots = WG.weaponGemSlots || (() => null);
import * as EL from '../src/elemental.js';
import { LIVEOPS } from '../src/liveops.js';
import { GEM_EXTRACT_BASE_COST, BLACKSMITH_TIERS, WEAPON_GEMS, GEM_SET_XP } from '../src/data.js';
import { weaponSig } from '../src/salvage.js';

let NOW = 1_770_000_000_000;
Date.now = () => NOW;

function makeState() {
  const store = new Map();
  const writes = [];
  return {
    _store: store, writes,
    storage: {
      get: async (k) => (Array.isArray(k) ? new Map(k.filter((x) => store.has(x)).map((x) => [x, store.get(x)])) : store.get(k)),
      put: async (k, v) => {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { writes.push(kk); store.set(kk, JSON.parse(JSON.stringify(vv))); } return; }
        writes.push(String(k)); store.set(k, JSON.parse(JSON.stringify(v)));
      },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { writes.push(String(k)); store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, z) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: -100000, y: -100000, z: z || 'meadow' } }));
}
const PID = 'bp_weapongem_a';
let ws = fakeWs();
await join(ws, PID);
const ps = () => room.playerState[PID];
/* v2.3.3516: gems live in the BAG (gems.js: `gem_raw_<e>`, `gem_<e>`); these
   checks read and set them in the old pouch's names -- the bag and any pouch
   left, as `raw_<e>` / `polished_<e>` */
const gemsOf = (p) => {
  const out = {};
  const add = (k, n) => { n = Math.floor(Number(n) || 0); if (n > 0) out[k] = (out[k] || 0) + n; };
  const inv = (p && p.inventory) || {};
  for (const k of Object.keys(inv)) {
    if (k.startsWith('gem_raw_')) add('raw_' + k.slice(8), inv[k]);
    else if (k.startsWith('gem_')) add('polished_' + k.slice(4), inv[k]);
  }
  const pouch = (p && p.lifeSkills && p.lifeSkills.gems) || {};
  for (const k of Object.keys(pouch)) add(k, pouch[k]);
  return out;
};
const gems = () => gemsOf(ps());
const setGems = (g) => {
  const p = ps();
  if (!p.inventory || typeof p.inventory !== 'object') p.inventory = {};
  for (const k of Object.keys(p.inventory)) if (k.startsWith('gem_')) delete p.inventory[k];
  p.lifeSkills = p.lifeSkills || {};
  p.lifeSkills.gems = {};
  /* ...and the cut ones stand for gems the player MADE: owed their XP
     (weapongem.js "THE XP, ONCE A GEM", v2.3.3516) */
  p.lifeSkills.gemsUnpaid = {};
  for (const k of Object.keys(g)) {
    if (k.startsWith('raw_')) p.inventory['gem_raw_' + k.slice(4)] = g[k];
    else if (k.startsWith('polished_')) { p.inventory['gem_' + k.slice(9)] = g[k]; p.lifeSkills.gemsUnpaid[k.slice(9)] = g[k]; }
  }
};
const ench = () => { const e = (ps().lifeSkills || {}).enchanting; return e && typeof e === 'object' ? e : { level: 1, xp: 0 }; };
const enchTotal = () => { const e = ench(); return (e.xp || 0) + 1e6 * ((e.level || 1) - 1); };
const copperSword = (extra) => ({ type: 'greatsword', tier: 'common', tierMult: 1.12, element1: null, element2: null, isVolatile: false, name: 'copper greatsword', gearBase: 'copper', reforgeBonus: null, hardenBonus: null, quality: 'normal', hardness: 0, temper: 0, ...(extra || {}) });
const ask = async (payload) => {
  ws.sent.length = 0;
  NOW += 50;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'weapon_gem', payload }));
  const m = ws.sent.filter((x) => x.type === 'weapon_gem_result');
  return m.length ? m[m.length - 1].payload : null;
};

// ── 1. The flags ──
{
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.weapongem is advertised', !!sync && sync.caps.weapongem === true, sync && sync.caps.weapongem);
  check('caps.monsterhold is advertised', !!sync && sync.caps.monsterhold === true, sync && sync.caps.monsterhold);
  check('...both under names the liveflags route accepts (lower case: kill switches)', LIVEOPS.FLAG_NAME_RE.test('weapongem') && LIVEOPS.FLAG_NAME_RE.test('monsterhold'));
  check('the receipt is privileged (a client cannot forge it on another screen)', PRIVILEGED_EVENTS.has('weapon_gem_result'));
  check('a gem set pays 400 Enchanting XP (GEM_SET_XP, the owner\'s decision 11)', WEAPON_GEM.XP === 400 && GEM_SET_XP === 400, WEAPON_GEM.XP);
  check('the weapon gems are the eight lands\' elements: no Dark or Light', WEAPON_GEMS.size === 8 && WEAPON_GEMS.has('flora') && !WEAPON_GEMS.has('dark') && !WEAPON_GEMS.has('light'), [...WEAPON_GEMS]);
  check('...and every one is an element the status table has', [...WEAPON_GEMS].every((e) => Object.prototype.hasOwnProperty.call(EL.ELEMENT_STATUS, e)));
}

// ── 2. A gem into the weapon in hand ──
{
  ps().weapon = copperSword();
  setGems({ polished_flame: 2, raw_flame: 3 });
  ps().lifeSkills.enchanting = { level: 1, xp: 0 };
  const x0 = enchTotal();
  const r = await ask({ slot: 'weapon', gem: 'flame' });
  const w = ps().weapon;
  check('a gem goes into the weapon in hand: answered ok, naming the slot and the gem', !!r && r.ok === true && r.slot === 'weapon' && r.gem === 'flame', r);
  check('...ONE polished gem is taken from the worker\'s own count (the raw ones untouched)', gems().polished_flame === 1 && gems().raw_flame === 3, gems());
  check('...the worker\'s weapon holds it, as its first gem', w.element1 === 'flame' && !w.element2 && w.isVolatile === false, w);
  check('...coloured elemental (the rarity tier, a colour only)', w.tier === 'elemental');
  check('...its metal\'s damage untouched (decision 9: tierMult stays 1.12, never 1.5)', w.tierMult === 1.12, w.tierMult);
  check('...named "<metal> <Element> <type>" (the shield\'s rule)', w.name === 'Copper Flame Great Sword' && r.name === 'Copper Flame Great Sword', w.name);
  check('...400 Enchanting XP, and the receipt says so', enchTotal() - x0 === 400 && r.xp === 400, { got: enchTotal() - x0, r: r && r.xp });
  check('...a player_state follows the receipt (the weapon, the gem count, the XP)',
    ws.sent.findIndex((m) => m.type === 'player_state') > ws.sent.findIndex((m) => m.type === 'weapon_gem_result'));
  const pst = ws.sent.find((m) => m.type === 'player_state');
  check('...and that player_state carries the gemmed weapon', !!pst && pst.payload.weapon && pst.payload.weapon.element1 === 'flame', pst && pst.payload.weapon);
  const stored = state._store.get('rpg:' + PID);
  check('...saved before the answer: the stored weapon has the gem, the stored count is one', !!stored && stored.weapon && stored.weapon.element1 === 'flame'
    && gemsOf(stored).polished_flame === 1, stored && { w: stored.weapon, gems: gemsOf(stored) });
  /* a level: the receipt carries what the game celebrates */
  ps().rangedWeapon = { type: 'bow', tier: 'common', tierMult: 1, gearBase: 'ww_pine', name: 'pine bow', element1: null, element2: null };
  setGems({ polished_frost: 1 });
  ps().lifeSkills.enchanting = { level: 1, xp: 800 };
  const lv = await ask({ slot: 'rangedWeapon', gem: 'frost' });
  check('a set that crosses a level says so (leveled, newLevel, fromLevel): the game celebrates it', !!lv && lv.ok && lv.leveled === true && lv.newLevel === 2 && lv.fromLevel === 1, lv);
  check('...the bow is "Pine Frost Bow"', ps().rangedWeapon.name === 'Pine Frost Bow', ps().rangedWeapon.name);
}

// ── 3. It lasts ──
{
  ws = fakeWs();
  await join(ws, PID);
  check('a rejoin keeps the gem (the stored copy, through the sanitizer)', !!ps().weapon && ps().weapon.element1 === 'flame' && ps().weapon.tier === 'elemental', ps().weapon);
  check('...and the bow\'s', !!ps().rangedWeapon && ps().rangedWeapon.element1 === 'frost', ps().rangedWeapon);
}

// ── 4. Refused, nothing taken ──
{
  ps().weapon = copperSword();
  ps().staffWeapon = null;
  setGems({ polished_venom: 1, polished_dark: 1 });
  ps().lifeSkills.enchanting = { level: 1, xp: 0 };
  const snap = () => JSON.stringify([gems(), ps().weapon, ench()]);
  const before = snap();
  const cases = [
    ['no gem of that element', { slot: 'weapon', gem: 'storm' }, 'no_gem'],
    ['a realm\'s element (Dark is an amulet\'s gem, not a weapon\'s)', { slot: 'weapon', gem: 'dark' }, 'bad_gem'],
    ['an element that is not a gem', { slot: 'weapon', gem: 'plasma' }, 'bad_gem'],
    ['a prototype key for the gem', { slot: 'weapon', gem: '__proto__' }, 'bad_gem'],
    ['a slot that is not a weapon slot', { slot: 'shield', gem: 'venom' }, 'bad_slot'],
    ['a prototype key for the slot', { slot: '__proto__', gem: 'venom' }, 'bad_slot'],
    ['an empty slot', { slot: 'staffWeapon', gem: 'venom' }, 'no_weapon'],
  ];
  for (const [what, payload, reason] of cases) {
    const r = await ask(payload);
    check('refused, ' + what + ' ("' + reason + '")', !!r && r.ok === false && r.reason === reason, r);
  }
  check('...and none of those took a gem, changed the weapon or paid XP', snap() === before, { before, after: snap() });
  ps().dying = true;
  let r = await ask({ slot: 'weapon', gem: 'venom' });
  check('refused while down ("down")', !!r && r.reason === 'down' && gems().polished_venom === 1, r);
  ps().dying = false;
  ps()._gearLockUntil = Date.now() + 60000; ps()._gearLockNotifAt = 0;
  r = await ask({ slot: 'weapon', gem: 'venom' });
  check('refused under a guard\'s gear lock ("locked"), the lock telling the game itself', !!r && r.reason === 'locked'
    && ws.sent.some((m) => m.type === 'gear_locked') && gems().polished_venom === 1, r);
  ps()._gearLockUntil = 0;
  ps().weapon = { name: 'Iron Torso', slot: 'chest', mat: 'iron', tierMult: 2, gid: 'g_torso', prov: 'minted' };   /* gear carries a ledger id (gear.js _isGearNotWeapon) */
  r = await ask({ slot: 'weapon', gem: 'venom' });
  check('refused for a piece of armour in a weapon slot ("no_weapon")', !!r && r.reason === 'no_weapon', r);
  ps().weapon = copperSword();
  r = await ask({ slot: 'weapon', gem: 'venom' });
  check('...and with nothing in the way, it goes in', !!r && r.ok === true && ps().weapon.element1 === 'venom', r);
  setGems({ polished_flame: 3 });
  const full0 = JSON.stringify(ps().weapon);
  r = await ask({ slot: 'weapon', gem: 'flame' });
  check('a full one-slot weapon is NOT overwritten ("full", decision 10): Take out first', !!r && r.reason === 'full' && JSON.stringify(ps().weapon) === full0 && gems().polished_flame === 3, r);
  room._liveFlags = { ...(room._liveFlags || {}), weapongem: false };
  ps().weapon = copperSword();
  r = await ask({ slot: 'weapon', gem: 'flame' });
  check('kill switch: weapongem:false refuses ("off"), nothing taken', !!r && r.reason === 'off' && gems().polished_flame === 3 && !ps().weapon.element1, r);
  const ws2 = fakeWs();
  await join(ws2, PID);
  const sync = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and the next join is told it is off (the game keeps its old slot)', !!sync && sync.caps.weapongem === false, sync && sync.caps.weapongem);
  ws = ws2;
  delete room._liveFlags.weapongem;
}

// ── 5. The second slot ──
{
  check('slots: a copper or pine weapon has one, mythril and crystal wood two, a drop with no base one',
    weaponGemSlots(copperSword()) === 1 && weaponGemSlots({ gearBase: 'ww_pine' }) === 1 && weaponGemSlots({ gearBase: 'mythril' }) === 2
    && weaponGemSlots({ gearBase: 'ww_crystalwood' }) === 2 && weaponGemSlots({ type: 'sword' }) === 1 && weaponGemSlots({ gearBase: '__proto__' }) === 1);
  ps().weapon = copperSword({ gearBase: 'mythril', tierMult: 1.94, name: 'mythril greatsword', element1: 'flame', tier: 'elemental' });
  setGems({ polished_storm: 2, polished_water: 1, polished_flame: 1 });
  ps().lifeSkills.enchanting = { level: 19, xp: 0 };
  let r = await ask({ slot: 'weapon', gem: 'storm' });
  check('a second gem needs Enchanting 20 ("level")', !!r && r.reason === 'level' && !ps().weapon.element2, r);
  ps().lifeSkills.enchanting = { level: 20, xp: 0 };
  r = await ask({ slot: 'weapon', gem: 'flame' });
  check('...and another element than the first ("same")', !!r && r.reason === 'same', r);
  r = await ask({ slot: 'weapon', gem: 'water' });
  check('...a volatile pair (flame + water) only in a base made for it ("volatile")', !!r && r.reason === 'volatile' && !ps().weapon.element2 && gems().polished_water === 1, r);
  r = await ask({ slot: 'weapon', gem: 'storm' });
  const w = ps().weapon;
  check('flame + storm goes in: a fusion weapon, not volatile, "Mythril Flamestorm Great Sword"', !!r && r.ok && w.element1 === 'flame' && w.element2 === 'storm'
    && w.tier === 'fusion' && w.isVolatile === false && w.name === 'Mythril Flamestorm Great Sword', w);
  r = await ask({ slot: 'weapon', gem: 'storm' });
  check('...and then it is full', !!r && r.reason === 'full', r);
  ps().weapon = copperSword({ gearBase: 'worldbreaker', tierMult: 7.84, name: 'worldbreaker greatsword', element1: 'flame', tier: 'elemental' });
  r = await ask({ slot: 'weapon', gem: 'water' });
  check('a Worldbreaker takes the volatile pair, and is volatile', !!r && r.ok && ps().weapon.isVolatile === true && ps().weapon.element2 === 'water', ps().weapon);
}

// ── 6. One gem is spent once ──
{
  ps().weapon = copperSword();
  ps().staffWeapon = { type: 'staff', tier: 'common', tierMult: 1, gearBase: 'ww_pine', name: 'pine staff', element1: null, element2: null };
  setGems({ polished_wind: 1 });
  const a = await ask({ slot: 'weapon', gem: 'wind' });
  const b = await ask({ slot: 'staffWeapon', gem: 'wind' });
  check('two asks with one gem: one goes in, the other is "no_gem"', !!a && a.ok === true && !!b && b.reason === 'no_gem'
    && ps().weapon.element1 === 'wind' && !ps().staffWeapon.element1 && !('polished_wind' in gems()), { a, b, gems: gems() });
}

// ── 7. The fight reads the worker's copy ──
const meadow = room.monsters.meadow || [];
const target = (i) => {
  const m = meadow[i];
  m.alive = true; m.hp = 5000; m.maxHp = 5000; m.dmgByPlayer = Object.create(null); m.statuses = undefined;
  m._wanderPausedUntil = NOW + 600000; m._holdUntil = 0; m._holdImmuneUntil = 0; m.element = null;
  return m;
};
const hit = async (m, extra) => {
  NOW += 1000;
  if (ps()._monHitCad) ps()._monHitCad.clear();
  ps().x = m.x; ps().y = m.y; ps().z = 'meadow';
  await room.webSocketMessage(ws, JSON.stringify({ type: 'monster_damage', payload: { monsterId: m.id, zone: 'meadow', slot: 'melee', ...(extra || {}) } }));
};
{
  check('(the meadow has monsters to hit)', meadow.length >= 4, meadow.length);
  ps().weapon = copperSword({ element1: 'flame', tier: 'elemental' });
  ps().activeSlot = 'melee';
  let m = target(0);
  await hit(m, { element: 'frost' });
  check('a hit carries the WORKER\'S gem: a flame weapon burns, though the claim said frost', !!m.statuses && !!m.statuses.burn && !m.statuses.freeze, m.statuses && Object.keys(m.statuses));
  ps().weapon = copperSword();
  m = target(1);
  await hit(m, { element: 'flame' });
  check('...a weapon with no gem carries nothing, whatever the claim says', !m.statuses || Object.keys(m.statuses).length === 0, m.statuses && Object.keys(m.statuses));
  ps().weapon = copperSword({ element1: 'venom', tier: 'elemental' });
  m = target(2);
  ps()._pveSpec = undefined;
  if (typeof room._pveSpecialPaid === 'function') room._pveSpecialPaid(ps(), NOW + 1000);
  await hit(m, { special: true });
  check('...a special with one gem carries that gem (the phone used to send none)', !!m.statuses && !!m.statuses.root, m.statuses && Object.keys(m.statuses));
  room._liveFlags = { ...(room._liveFlags || {}), weapongem: false };
  ps().weapon = copperSword();
  m = target(3);
  await hit(m, { element: 'flame' });
  check('weapongem:false puts the claim back: a gemless weapon\'s claimed flame burns, as before', !!m.statuses && !!m.statuses.burn, m.statuses && Object.keys(m.statuses));
  delete room._liveFlags.weapongem;
  check('the element helper: the first gem, the second on a special, an own key or none',
    WG.weaponHitElement({ element1: 'flame' }, false) === 'flame' && WG.weaponHitElement({ element1: 'flame' }, true) === 'flame'
    && WG.weaponHitElement({ element1: 'flame', element2: 'storm' }, true) === 'storm' && WG.weaponHitElement({ element1: 'constructor' }, false) === null
    && WG.weaponHitElement(null, false) === null);
}

// ── 8. What a real gem switches on ──
{
  ps().weapon = copperSword();
  ps().activeSlot = 'melee';
  ps().mana = ps().maxMana = 500;
  ps()._burstCdUntil = 0;
  check('no gem: the Element Burst is refused ("no_element")', room._burstRefusal(ps(), NOW) === 'no_element', room._burstRefusal(ps(), NOW));
  ps().weapon = copperSword({ element1: 'storm', tier: 'elemental' });
  check('a gem the worker holds: the Element Burst may go', room._burstRefusal(ps(), NOW) === null, room._burstRefusal(ps(), NOW));
  const realRandom = Math.random;
  Math.random = () => 0.42;
  ps().amulet = { tier: 'mythic', gem: 'flame', name: 'Mythic Flame Amulet' };
  ps().weapon = copperSword();
  const plain = room._computeAttackDamage(ps(), 'melee', false).dmg;
  ps().weapon = copperSword({ element1: 'flame', tier: 'elemental' });
  const gemmed = room._computeAttackDamage(ps(), 'melee', false).dmg;
  Math.random = realRandom;
  ps().amulet = null;
  check('the flame amulet\'s bonus counts on a weapon with a gem (it never did on a phone-only gem)', gemmed > plain, { plain, gemmed });
}

// ── 9. Take out gives it back, owed no XP (v2.3.3516: the XP is for gems you made) ──
{
  ps().weapon = copperSword();
  setGems({ polished_flame: 1 });
  ps().lifeSkills.enchanting = { level: 1, xp: 0 };
  let r = await ask({ slot: 'weapon', gem: 'flame' });
  check('(set: 400 XP)', !!r && r.ok && r.xp === 400, r);
  ps().coins = 5000;
  const c0 = ps().coins;
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'amulet_forge_request', payload: { op: 'extract', target: 'weapon' } }));
  check('Take out gives the gem back to the count', gems().polished_flame === 1, gems());
  check('...for the Blacksmith\'s price (the tierMult x the base)', c0 - ps().coins === Math.ceil(GEM_EXTRACT_BASE_COST * 1.12), c0 - ps().coins);
  check('...the weapon bare again, common, its plain name', !ps().weapon.element1 && ps().weapon.tier === 'common' && ps().weapon.name === 'Copper Great Sword', ps().weapon);
  check('...and owed no XP (the set spent the one made; a gem taken out adds none)', !((ps().lifeSkills.gemsUnpaid || {}).flame), ps().lifeSkills.gemsUnpaid);
  const x0 = enchTotal();
  r = await ask({ slot: 'weapon', gem: 'flame' });
  check('setting it again pays NO XP (it paid when it first went in; take out and set again must not buy levels with gold)',
    !!r && r.ok && r.xp === 0 && enchTotal() === x0, { r, xp: enchTotal() - x0, owed: ps().lifeSkills.gemsUnpaid });
  setGems({ polished_flame: 1 });
  ps().weapon = copperSword();
  r = await ask({ slot: 'weapon', gem: 'flame' });
  check('...while a new gem pays its 400 again', !!r && r.ok && r.xp === 400, r);
  /* a salvaged weapon */
  ps().weaponStash = [copperSword({ type: 'sword', element1: 'stone', tier: 'elemental' })];
  setGems({});
  ps().inventory = ps().inventory || {};
  const bars0 = ps().inventory.bar_copper || 0;
  ws.sent.length = 0;
  NOW += 1000;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'smith_salvage', payload: { field: 'weaponStash', idx: 0, sig: weaponSig(ps().weaponStash[0]) } }));
  const sr = (ws.sent.find((m) => m.type === 'smith_salvage_result') || {}).payload;
  check('salvaging a gemmed sword gives its bars AND its gem back', !!sr && sr.ok && (ps().inventory.bar_copper || 0) === bars0 + 2 && gems().polished_stone === 1
    && Array.isArray(sr.gems) && sr.gems[0] === 'gem_stone', { sr, gems: gems() });
  check('...owed no XP (a gem out of a salvage was set before)', !((ps().lifeSkills.gemsUnpaid || {}).stone), ps().lifeSkills.gemsUnpaid);
}

// ── 9b. v2.3.3516: ONE GEM PASSED BETWEEN TWO PLAYERS PAYS ONCE ──
// Gems trade now (they are bag items), and the v2.3.3513 rule counted only
// the gems that came back to a player: a gem taken out by one player and
// handed to another was a "new" gem there -- two players passing one gem (or
// one gemmed sword) back and forth were paid 400 a round.  The XP is owed by
// what cannot change hands: the gems a player MADE.
{
  const PB = 'bp_wgem_b';
  let wsb = fakeWs();
  await join(wsb, PB);
  const pb = () => room.playerState[PB];
  const askAs = async (sock, payload) => {
    sock.sent.length = 0;
    await room.webSocketMessage(sock, JSON.stringify({ type: 'weapon_gem', payload }));
    const m = sock.sent.filter((x) => x.type === 'weapon_gem_result');
    return m.length ? m[m.length - 1].payload : null;
  };
  ps().weapon = copperSword();
  setGems({ polished_venom: 1 });                     /* A made one venom gem */
  pb().weapon = copperSword();
  pb().inventory = {};
  pb().lifeSkills.gemsUnpaid = {};
  pb().coins = 5000; ps().coins = 5000;
  const a1 = await ask({ slot: 'weapon', gem: 'venom' });
  /* A's sword goes to B (a trade); B takes the gem out; the gem goes back to A */
  pb().weapon = ps().weapon; ps().weapon = copperSword();
  await room.webSocketMessage(wsb, JSON.stringify({ type: 'amulet_forge_request', payload: { op: 'extract', target: 'weapon' } }));
  const bHas = (pb().inventory || {}).gem_venom === 1;
  delete pb().inventory.gem_venom; ps().inventory.gem_venom = 1;
  const a2 = await ask({ slot: 'weapon', gem: 'venom' });
  /* and the other way: A takes it out, hands the bare gem to B, B sets it */
  await room.webSocketMessage(ws, JSON.stringify({ type: 'amulet_forge_request', payload: { op: 'extract', target: 'weapon' } }));
  delete ps().inventory.gem_venom; pb().inventory.gem_venom = 1;
  pb().weapon = copperSword();
  const b1 = await askAs(wsb, { slot: 'weapon', gem: 'venom' });
  check('one gem passed between two players pays its 400 once: A\'s first set 400, A again after B took it out 0, B setting the gem A handed over 0',
    bHas && !!a1 && a1.ok && a1.xp === 400 && !!a2 && a2.ok && a2.xp === 0 && !!b1 && b1.ok && b1.xp === 0, { bHas, a1: a1 && a1.xp, a2: a2 && a2.xp, b1: b1 && b1.xp });
  /* B makes a gem of its own: three raw gems combined -- that one pays */
  pb().inventory.gem_raw_venom = 3;
  pb().weapon = copperSword();
  await room.webSocketMessage(wsb, JSON.stringify({ type: 'gem_combine', payload: { element: 'venom' } }));
  const b2 = await askAs(wsb, { slot: 'weapon', gem: 'venom' });
  check('...while a gem B made itself (three raw gems combined) pays B its 400',
    !!b2 && b2.ok && b2.xp === 400 && !((pb().lifeSkills.gemsUnpaid || {}).venom), { b2, owed: pb().lifeSkills.gemsUnpaid });
}

// ── 10. The sanitizer; the come-back count at the join ──
{
  const s = (w) => room._sanitizeWeapon(w);
  check('an element that is not an own key of the status table is none', s(copperSword({ element1: '__proto__', element2: 'constructor' })).element1 === null
    && s(copperSword({ element1: '__proto__' })).element2 === null);
  const up = s(copperSword({ element1: null, element2: 'flame' }));
  check('a second gem with no first moves up', up.element1 === 'flame' && up.element2 === null, up);
  const twice = s(copperSword({ element1: 'flame', element2: 'flame' }));
  check('the same element twice is one gem', twice.element1 === 'flame' && twice.element2 === null, twice);
  check('isVolatile is the pair\'s answer, never a stored flag\'s', s(copperSword({ element1: 'flame', isVolatile: true })).isVolatile === false
    && s(copperSword({ element1: 'flame', element2: 'water' })).isVolatile === true);
  const drop = s({ type: 'sword', tier: 'fusion', tierMult: 2.25, element1: 'frost', element2: 'storm', name: 'Froststorm Sword', isVolatile: true });
  check('an old server drop\'s gems stay (frost + storm, volatile)', drop.element1 === 'frost' && drop.element2 === 'storm' && drop.isVolatile === true && drop.tierMult === 2.25, drop);
  check('a weapon with no element fields gets none added', !('element1' in s({ type: 'sword', tierMult: 1, name: 'x' })));
  /* v2.3.3516: an OLD pouch (a record from before this version) at the join:
     every gem into the bag, and each polished one owed its XP -- the pouch
     never traded, so its owner made them -- less the ones v2.3.3513 counted
     as come back (they paid going in) */
  setGems({});
  ps().lifeSkills.gems = { polished_flame: 3, polished_frost: 1, raw_storm: 2, polished_water: 2 };
  ps().lifeSkills.gemsBack = { flame: 1, frost: 4, venom: 3 };
  ps().lifeSkills.gemsUnpaid = { stone: 2, plasma: 2, __proto__: 4, wind: -1, water: 'x' };
  await room._saveRpg(PID, ps());
  ws = fakeWs();
  await join(ws, PID);
  const owed = ps().lifeSkills.gemsUnpaid || {};
  check('the join moves an old pouch into the bag, one for one, raw and cut', ps().inventory.gem_flame === 3 && ps().inventory.gem_frost === 1
    && ps().inventory.gem_raw_storm === 2 && ps().inventory.gem_water === 2 && Object.keys(ps().lifeSkills.gems || {}).length === 0, { inv: ps().inventory, pouch: ps().lifeSkills.gems });
  check('...owes each polished gem its XP, less the ones that came back (flame 3-1, water 2, frost 1-4 none; raw ones when combined)',
    owed.flame === 2 && owed.water === 2 && !('frost' in owed) && !('storm' in owed), owed);
  check('...keeps what was already owed, and heals the rest: own elements only, whole numbers of 1 or more',
    owed.stone === 2 && !('plasma' in owed) && !('wind' in owed) && !Object.prototype.hasOwnProperty.call(owed, '__proto__') && Object.keys(owed).length === 3, owed);
  check('...and the came-back count goes with the move', !('gemsBack' in ps().lifeSkills), ps().lifeSkills.gemsBack);
  const ws2 = fakeWs();
  await join(ws2, PID);
  check('a second join moves and owes nothing more (the pouch is empty)', JSON.stringify(ps().lifeSkills.gemsUnpaid) === JSON.stringify(owed) && ps().inventory.gem_flame === 3,
    { owed: ps().lifeSkills.gemsUnpaid, inv: ps().inventory });
  ws = ws2;
}

// ── 11. A sell order lists the gems its weapon holds ──
{
  await room._mktEnsureIndex();
  ps().weaponStash = [copperSword()];
  const res = await room._mktPlaceOrder({ type: 'sell', category: 'weapon', subtype: 'greatsword', tierKey: 'copper', element1: 'flame', price: 100, tierLabel: 'Copper', playerName: 'T', playerId: PID, stashIndex: 0 });
  check('a plain blade listed as "flame" is listed as what it is: no element', !!res && res.ok && res.order && res.order.element1 === null && res.order.element2 === null, res && res.order && { e1: res.order.element1 });
  ps().weaponStash = [copperSword({ element1: 'venom', tier: 'elemental' })];
  const res2 = await room._mktPlaceOrder({ type: 'sell', category: 'weapon', subtype: 'greatsword', tierKey: 'copper', price: 120, tierLabel: 'Copper', playerName: 'T', playerId: PID, stashIndex: 0 });
  check('...and a venom blade listed with no element is listed as venom', !!res2 && res2.ok && res2.order && res2.order.element1 === 'venom', res2 && res2.order && { e1: res2.order.element1 });
}

// ── 12. The hold rule ──
{
  const H = EL.HOLD || {};
  check('HOLD: 1.5 s held, 3 s immune, bosses half, a frozen monster past its hold at half speed', H.MS === 1500 && H.IMMUNE_MS === 3000 && H.BOSS_K === 0.5 && H.CHILL_MULT === 0.5, H);
  const T = 2_000_000;
  const mon = { statuses: Object.create(null), level: 5 };
  EL.applyElementStatus(mon, 'frost', 'x', 10, T, 1);
  check('a freeze that lands stops the monster', EL.elementMoveMult(mon, T + 100, true) === 0 && mon._holdUntil === T + 1500, mon._holdUntil);
  check('...for 1.5 s, then it is chilled (the freeze still on it: half speed, and it may attack)', EL.elementMoveMult(mon, T + 1600, true) === 0.5 && !!mon.statuses.freeze);
  EL.applyElementStatus(mon, 'frost', 'x', 10, T + 2000, 1);
  check('...a freeze inside the immune time starts no new stop', EL.elementMoveMult(mon, T + 2100, true) === 0.5 && mon._holdUntil === T + 1500);
  EL.applyElementStatus(mon, 'frost', 'x', 10, T + 4600, 1);
  check('...and once 3 s have passed after the stop, a freeze stops it again', EL.elementMoveMult(mon, T + 4700, true) === 0 && mon._holdUntil === T + 6100, mon._holdUntil);
  const rooted = { statuses: Object.create(null), level: 5 };
  EL.applyElementStatus(rooted, 'venom', 'x', 10, T, 1);
  check('a root stops it 1.5 s, then it walks (1) while the root\'s poison is still on it',
    EL.elementMoveMult(rooted, T + 1000, true) === 0 && EL.elementMoveMult(rooted, T + 1600, true) === 1 && !!rooted.statuses.root);
  const ticks = EL.tickElementStatuses(rooted, 1, T + 2600);
  check('...and the poison keeps ticking past the stop', ticks.some((t) => t.statusId === 'root'), ticks);
  const boss = { statuses: Object.create(null), level: 30, _dungeonBoss: true };
  EL.applyElementStatus(boss, 'frost', 'x', 10, T, 1);
  check('a dungeon boss is stopped half as long (0.75 s)', boss._holdUntil === T + 750 && EL.elementMoveMult(boss, T + 800, true) === 0.5, boss._holdUntil);
  const slowed = { statuses: Object.create(null) };
  EL.applyElementStatus(slowed, 'frost', 'x', 10, T, 1);
  EL.applyElementStatus(slowed, 'wind', 'x', 10, T, 1);
  check('chilled and slowed: the stronger of the two (0.4), never both multiplied', EL.elementMoveMult(slowed, T + 1600, true) === 0.4);
  check('a caller that does not say gets the OLD lock (the monsterhold:false behaviour)', EL.elementMoveMult(mon, T + 1600) === 0 && EL.elementMoveMult(rooted, T + 1600) === 0);
  check('slow alone is 0.4 and nothing is 1, either way', EL.elementMoveMult({ statuses: { slow: {} } }, T, true) === 0.4 && EL.elementMoveMult({ statuses: {} }, T, true) === 1);
  check('a player\'s holder is never read for the stop (players keep their own rule)', typeof room._pvpHold === 'function');
  room._liveFlags = { ...(room._liveFlags || {}), monsterhold: false };
  check('monsterhold:false: the switch reads off', room._monsterHoldOff() === true);
  delete room._liveFlags.monsterhold;
  check('...and on by default', room._monsterHoldOff() === false);
  /* the tick: a frozen monster chasing a player stands for the stop, then moves */
  const m = target(4);
  m.x = 3000; m.y = 3000; m.spawnX = 3000; m.spawnY = 3000;
  ps().x = 3090; ps().y = 3000; ps().z = 'meadow'; ps().dead = false; ps().dying = false;
  m.targetId = PID; m.aggro = true; m._wanderPausedUntil = 0;
  const realRandom = Math.random;
  Math.random = () => 0.5;   /* the tick's dice, held still */
  EL.applyElementStatus(m, 'frost', PID, 10, NOW, 1);
  const x0 = m.x, y0 = m.y;
  NOW += 100; room._tickMonsters(); NOW += 600; room._tickMonsters(); NOW += 600; room._tickMonsters();
  const heldStill = m.x === x0 && m.y === y0;
  NOW += 300; room._tickMonsters(); NOW += 50; room._tickMonsters(); NOW += 50; room._tickMonsters();
  const movedAfter = m.x !== x0 || m.y !== y0;
  Math.random = realRandom;
  check('the tick: a frozen monster stays put for its 1.5 s stop, then moves (chilled)', heldStill && movedAfter, { x0, y0, after: [m.x, m.y] });
}

// ── 13. One row a gem set ──
{
  ps().weapon = copperSword();
  setGems({ polished_frost: 1 });
  const w0 = state.writes.length;
  await ask({ slot: 'weapon', gem: 'frost' });
  const rows = state.writes.slice(w0).filter((k) => k === 'rpg:' + PID).length;
  check('a gem set writes the character\'s record once', rows === 1, state.writes.slice(w0));
  const w1 = state.writes.length;
  await ask({ slot: 'weapon', gem: 'frost' });
  check('...a refusal writes nothing', state.writes.slice(w1).filter((k) => k.indexOf(PID) >= 0).length === 0, state.writes.slice(w1));
}

check('weaponGemName: an unknown base names no metal ("Flame Sword", the old drop\'s own name)', weaponGemName({ type: 'sword', element1: 'flame' }) === 'Flame Sword', weaponGemName({ type: 'sword', element1: 'flame' }));
check('...and a prototype key is unknown, not an inherited member', weaponGemName({ type: 'sword', gearBase: '__proto__', element1: 'wind' }) === 'Wind Sword');
check('...every forge metal names its label', Object.keys(BLACKSMITH_TIERS).every((k) => weaponGemName({ type: 'greatsword', gearBase: k, element1: 'stone' }).endsWith('Stone Great Sword')));

console.log(failures ? `\n${failures} FAILED` : '\nall weapon-gem checks passed');
process.exit(failures ? 1 : 0);
