/* No man's land (v2.3.3058, server/src/nomansland.js).
 *
 * Owner, 2026-10-05: "Add a new 'No man's land' notification when you cross
 * into zones with lvl 6+ monsters.  It'll start at 1.  This means any other
 * player 1 level above or below you can attack you.  If you die by another
 * player you lose all the things in your inventory except what you have
 * actively equipped.  The player who attacks you gets a red skull above their
 * head for 20 minutes based on time in the game and the timer resets each time
 * they attack a player.  Players who get attacked have a white skull above
 * their head.  If the red skull player dies they lose everything (all
 * equipment, gold, etc)."
 *
 *   1. the rings are the plan's; the level at a spot (0 on the commons and in
 *      the Lv 1-5 tier, 1 from Lv 6-10, ...), and only in the Wheel;
 *   2. who may hit whom: both in it, levels within the LOWER of the two, not
 *      one party; the master switch stays off everywhere else;
 *   3. a landed hit: red skull for the attacker, white for the one hit (and
 *      who gave it), both 20 minutes, on the tick for others, `nml_skull` for
 *      yourself; hitting back the one who attacked you is no new red skull;
 *   4. the skulls count down only while connected, are stored, and come back
 *      on join;
 *   5. a death under the rule: the bag's items in a pile that is the KILLER's
 *      for its owner window, the spare weapons and gear credited to the
 *      killer (gear with its provenance row), nothing worn and no gold taken,
 *      the tools kept, `nml_loss` told;
 *   6. a red skull's death: the worn weapons, the worn gear and the gold too
 *      -- to the killer, or (killed by a monster) to nobody, the items in a
 *      pile anyone may take at once;
 *   7. a forfeited piece offered again on the next join is refused;
 *   8. the kill switch: no hit, no skull, nothing taken; caps advertise it.
 */
import { GameRoom } from '../src/index.js';
import { NML, nmlTierAt, nmlLevelAt, NML_KEY } from '../src/nomansland.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';
import { PLAN } from '../../public/tools/world/plan.js';

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
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const msgs = (ws, type) => ws.sent.filter((m) => m.type === type);
const settle = () => new Promise((r) => setTimeout(r, 20));

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, name, data) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name, phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town', ...(data || {}) } }));
  room.sessions.get(ws).name = name;
}
/* a spot in the Wheel at radius r, on the line due east of the centre */
const at = (r, dy = 0) => ({ x: WHEEL_CENTRE[0] + r, y: WHEEL_CENTRE[1] + dy });
const RING = (t) => NML.HUB + (t - 0.5) * NML.TIER;   /* the middle of tier t */
const place = (ps, p, level) => {
  ps.z = WHEEL_ZONE; ps.x = p.x; ps.y = p.y; ps.dead = false; ps.dying = false; ps.disconnected = false;
  ps.hp = ps.maxHp = 1000; ps._zoneEntryGraceUntil = 0;
  if (typeof level === 'number') ps.level = level;
};
const attack = (ws, fromPs, toId, toPs, special) => room.webSocketMessage(ws, JSON.stringify({ type: 'player_attack', payload: {
  kind: 'melee', range: 200, arc: 2.5, angle: Math.atan2(toPs.y - fromPs.y, toPs.x - fromPs.x), dmgBase: 10, critChance: 0, target: toId, special: !!special,
} }));

const ids = { a: 'bp_nml_a', b: 'bp_nml_b', c: 'bp_nml_c', d: 'bp_nml_d' };
const ws = {};
for (const k of Object.keys(ids)) { ws[k] = fakeWs(k); await join(ws[k], ids[k], 'Nml' + k.toUpperCase()); }
const ps = (k) => room.playerState[ids[k]];

// ── 1. the rings and the level at a spot ─────────────────────────────────────
{
  const W = PLAN.wheel;
  check('the rings are the plan\'s: hub, tier, tiers, levels a tier', NML.HUB === W.hub * W.zonePx && NML.TIER === W.tierZones * W.zonePx
    && NML.TIERS === W.tiers && NML.LEVELS_PER_TIER === W.levelsPerTier, { NML, plan: W });
  check('the commons and the Lv 1-5 tier are not No man\'s land; Lv 6-10 is 1, Lv 11-15 is 2',
    nmlLevelAt(WHEEL_ZONE, WHEEL_CENTRE[0], WHEEL_CENTRE[1]) === 0 && nmlLevelAt(WHEEL_ZONE, at(RING(1)).x, at(RING(1)).y) === 0
    && nmlLevelAt(WHEEL_ZONE, at(RING(2)).x, at(RING(2)).y) === 1 && nmlLevelAt(WHEEL_ZONE, at(RING(3)).x, at(RING(3)).y) === 2,
    [0, 1, 2, 3].map((t) => (t ? nmlLevelAt(WHEEL_ZONE, at(RING(t)).x, at(RING(t)).y) : 0)));
  check('...out to 15 at the last tier, and only in the Wheel', nmlLevelAt(WHEEL_ZONE, at(RING(16)).x, at(RING(16)).y) === 15
    && nmlLevelAt('frost', at(RING(3)).x, at(RING(3)).y) === 0 && nmlTierAt(NaN, 0) === 0);
  check('...the line where it starts is exact (the end of tier 1)', nmlLevelAt(WHEEL_ZONE, at(NML.HUB + NML.TIER - 1).x, WHEEL_CENTRE[1]) === 0
    && nmlLevelAt(WHEEL_ZONE, at(NML.HUB + NML.TIER + 1).x, WHEEL_CENTRE[1]) === 1);
}

// ── 2. who may hit whom ──────────────────────────────────────────────────────
{
  place(ps('a'), at(RING(2)), 6); place(ps('b'), at(RING(2), 60), 7);
  check('both in No man\'s land 1, levels 6 and 7: allowed', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === true && room._pvpAllowed(ids.b, ids.a, WHEEL_ZONE) === true);
  ps('b').level = 8;
  check('...levels 6 and 8 in No man\'s land 1: refused', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === false);
  place(ps('a'), at(RING(3)), 6); place(ps('b'), at(RING(3), 60), 8);
  check('...both in No man\'s land 2, levels 6 and 8: allowed', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === true);
  place(ps('b'), at(RING(2), 60), 8);
  check('...one in 2 and the other in 1, two levels apart: refused (the lower of the two rules)', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === false);
  place(ps('a'), at(RING(1)), 7); place(ps('b'), at(RING(2), 60), 7);
  check('...one still in the Lv 1-5 tier: refused', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === false);
  check('the master switch stays off everywhere else (town, an old lawless zone)', room.OPEN_PVP === false
    && room._pvpAllowed(ids.a, ids.b, 'town') === false && room._pvpAllowed(ids.a, ids.b, 'frost') === false);
  /* one party */
  place(ps('a'), at(RING(2)), 7);
  const keepParty = room._partyOf;
  room._partyOf = (id) => (id === ids.a || id === ids.b ? { id: 'p1' } : null);
  check('...one party: refused', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === false);
  room._partyOf = keepParty;
}

// ── 3. a landed hit: the skulls ──────────────────────────────────────────────
{
  const A = ps('a'), B = ps('b');
  place(A, at(RING(2)), 7); place(B, at(RING(2) + 60), 7);
  ws.a.sent.length = 0; ws.b.sent.length = 0; room.eventBuffer.length = 0;
  await attack(ws.a, A, ids.b, B);
  const hit = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  check('a hit lands in No man\'s land', !!hit && hit.payload.target === ids.b && B.hp < 1000, hit && hit.payload);
  check('...the attacker gets a RED skull for 20 minutes', room._nmlSkullOf(A) === 'r' && A._nml.red === NML.SKULL_MS, A._nml);
  check('...the one hit a WHITE skull for 20 minutes, remembering who', room._nmlSkullOf(B) === 'w' && B._nml.white === NML.SKULL_MS && B._nml.whiteBy === ids.a, B._nml);
  const sa = msgs(ws.a, 'nml_skull').pop(), sb = msgs(ws.b, 'nml_skull').pop();
  check('...each told their own (nml_skull, ms left)', !!sa && sa.payload.red === NML.SKULL_MS && !!sb && sb.payload.white === NML.SKULL_MS && sb.payload.red === 0, { sa, sb });
  check('...and both are dirty, so the tick carries them to everyone else', room.dirtyPlayers.has(ids.a) && room.dirtyPlayers.has(ids.b));
  /* the tick's wire */
  const wireA = { ...(A._nml.red > 0 ? { sk: 'r' } : {}) };
  check('...as `sk` on the tick\'s player wire (r)', wireA.sk === 'r');
  /* hitting back */
  room._pvpHitLanes && room._pvpHitLanes.clear();
  await attack(ws.b, B, ids.a, A);
  check('hitting back the one who attacked you is no red skull', room._nmlSkullOf(B) === 'w' && !(B._nml.red > 0), B._nml);
  check('...but marks them white too (red still shows)', A._nml.white === NML.SKULL_MS && A._nml.whiteBy === ids.b && room._nmlSkullOf(A) === 'r');
  /* a fresh attack resets the red */
  const first = state._store.get(NML_KEY(ids.a));
  check('a skull is stored when it starts (nml_state:)', !!first && first.red === NML.SKULL_MS, first);
  A._nml.red = 5000;
  state._store.set(NML_KEY(ids.a), { ...first, red: 5000 });
  A._nml.savedAt = Date.now();
  room._pvpHitLanes && room._pvpHitLanes.clear();
  await attack(ws.a, A, ids.b, B);
  check('another attack resets the red skull to 20 minutes', A._nml.red === NML.SKULL_MS, A._nml.red);
  check('...not written on every hit (the skull did not change colour)', state._store.get(NML_KEY(ids.a)).red === 5000, state._store.get(NML_KEY(ids.a)));
  A._nml.savedAt = Date.now() - NML.SAVE_EVERY_MS;
  room._nmlTickAt = Date.now() - 50;
  room._tickNml(Date.now());
  const stored = state._store.get(NML_KEY(ids.a));
  check('...but within SAVE_EVERY_MS (the tick\'s save), so a restart keeps the reset', !!stored && stored.red > NML.SKULL_MS - 1000, stored);
}

// ── 4. time in the game ──────────────────────────────────────────────────────
{
  const A = ps('a');
  A._nml.red = NML.SKULL_MS;   /* a full skull to count down (section 3's tick took a little off) */
  const now = Date.now();
  room._nmlTickAt = now - 1000;
  room._tickNml(now);
  check('the tick takes the time off while you are connected', A._nml.red === NML.SKULL_MS - 1000, A._nml.red);
  room._nmlTickAt = now - 60000;
  room._tickNml(now + 1);
  check('...never more than STEP_CAP_MS at once (a stalled tick)', A._nml.red >= NML.SKULL_MS - 1000 - NML.STEP_CAP_MS - 5, A._nml.red);
  A.disconnected = true;
  const before = A._nml.red;
  room._nmlTickAt = Date.now() - 1000;
  room._tickNml(Date.now());
  check('...and none while you are away', A._nml.red === before, { before, after: A._nml.red });
  A.disconnected = false;
  /* a white skull runs out */
  const C = ps('c');
  room._nmlState(C).white = 500; C._nml.whiteBy = ids.a;
  room._nmlTickAt = Date.now() - 1000;
  ws.c.sent.length = 0;
  room._tickNml(Date.now());
  check('a skull that runs out is gone, and you are told', room._nmlSkullOf(C) === null && C._nml.whiteBy === null && msgs(ws.c, 'nml_skull').length === 1);
  /* back on join */
  room._nmlSave(ids.a, A);
  const ws2 = fakeWs('a2');
  await join(ws2, ids.a, 'NmlA');
  const A2 = ps('a');
  check('it comes back on join, with its time left, and you are told', !!A2._nml && A2._nml.red > NML.SKULL_MS - 5000 && msgs(ws2, 'nml_skull').length >= 1, A2._nml);
  ws.a = ws2;
}

// ── 5. a death under the rule ────────────────────────────────────────────────
{
  const A = ps('a'), B = ps('b');
  place(A, at(RING(2)), 7); place(B, at(RING(2) + 60), 7);
  B._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 };
  B.inventory = { snowman: 3, fish_minnow: 5, mining_pickaxe: 1 };
  B.coins = 250;
  B.weapon = { type: 'greatsword', gearBase: 'copper', tierMult: 1.12, quality: 'normal', name: 'Copper Greatsword' };
  B.weaponStash = [{ type: 'bow', gearBase: 'wood', tierMult: 1, quality: 'normal', name: 'Pine Bow' }];
  const minted = room._gearProvRecord(ids.b, 'armor', { name: 'Copper Plate', gearBase: 'copper', tierMult: 2, tier: 't2', def: 7 }, 'test');
  /* the plate B WEARS, put on since the join: the stash still holds its
     adoption-time copy under the same id (storegear.js §2) */
  const wornPlate = room._gearProvRecord(ids.b, 'armor', { name: 'Pine Plate', gearBase: 'wood', tierMult: 1, tier: 't1', def: 3 }, 'test');
  B.armor = wornPlate;
  B.armorStash = [minted, { ...wornPlate }];
  /* worn greaves with no id, and a stash copy that looks the same */
  B.legsArmor = { name: 'Pine Greaves', gearBase: 'wood', tierMult: 1, tier: 't1', def: 2 };
  B.legsStash = [{ name: 'Pine Greaves', gearBase: 'wood', tierMult: 1, tier: 't1', def: 2 }];
  /* a shield (the ownership record) and a spare one, and an outfit piece */
  B.shield = room._gearProvRecord(ids.b, 'shield', { name: 'Pine Shield', gearBase: 'wood', tierMult: 1, tier: 'common' }, 'test');
  B.shieldStash = [room._gearProvRecord(ids.b, 'shield', { name: 'Copper Shield', gearBase: 'copper', tierMult: 2, tier: 'common' }, 'test')];
  B.gearStash = [{ slot: 'hat', gearId: 'cowboy_hat', name: 'Cowboy Hat' }];
  const aStash0 = (A.weaponStash || []).length, aArmor0 = (A.armorStash || []).length, aCoins0 = A.coins || 0;
  const aShield0 = (A.shieldStash || []).length, aGear0 = (A.gearStash || []).length;
  B.hp = 1;
  ws.b.sent.length = 0; room.eventBuffer.length = 0;
  room._pvpHitLanes && room._pvpHitLanes.clear();
  await attack(ws.a, A, ids.b, B);
  await settle();
  check('killed under the rule', B.dying === true, { hp: B.hp, dying: B.dying });
  const pile = (room.loot[WHEEL_ZONE] || []).find((p) => p.isDeathDrop && p.lootId.startsWith('dd-' + ids.b));
  check('...the bag\'s items fall in a pile that is the KILLER\'s for its owner window', !!pile && pile.recipients.length === 1 && pile.recipients[0] === ids.a
    && pile.deathItems.some((i) => i.key === 'fish_minnow' && i.qty === 5) && pile.ownerOnlyUntil > Date.now(), pile && { recipients: pile.recipients, items: pile.deathItems });
  check('...the tools and the quest\'s own items stay in the bag (the death\'s carve-outs)', (B.inventory.mining_pickaxe || 0) === 1 && (B.inventory.snowman || 0) === 3 && !(B.inventory.fish_minnow > 0), B.inventory);
  check('...the spare weapon goes to the killer', (B.weaponStash || []).length === 0 && (A.weaponStash || []).length === aStash0 + 1 && A.weaponStash.some((w) => w && w.type === 'bow'), { b: B.weaponStash, a: A.weaponStash });
  check('...the spare armour too, with its provenance row', !(B.armorStash || []).some((g) => g && g.gid === minted.gid) && (A.armorStash || []).length === aArmor0 + 1
    && (A.armorStash || []).some((g) => g && g.gid === minted.gid)
    && (room._gearProvOf(ids.a) || { list: [] }).list.some((r) => r.id === minted.gid), { a: A.armorStash, b: B.armorStash });
  check('...nothing worn is taken, and no gold', !!B.weapon && B.weapon.type === 'greatsword' && !!B.armor && B.armor.gid === wornPlate.gid && !!B.legsArmor && !!B.shield && B.coins === 250 && (A.coins || 0) === aCoins0);
  check('...the stash copy of the plate B WEARS (same id) is not taken, and its id not forfeited -- the killer gets no second plate',
    (B.armorStash || []).length === 1 && B.armorStash[0].gid === wornPlate.gid && B._nml.forfeit.indexOf(wornPlate.gid) < 0
    && !(A.armorStash || []).some((g) => g && g.gid === wornPlate.gid)
    && (room._gearProvOf(ids.b) || { list: [] }).list.some((r) => r.id === wornPlate.gid), { b: B.armorStash, forfeit: B._nml.forfeit });
  check('...nor a stash copy with no id that matches what B wears (greaves)', (B.legsStash || []).length === 1, B.legsStash);
  check('...no shield is taken (B\'s game never said which shield is on its arm, shield_wear: a worn one cannot be told from a spare), and no outfit piece',
    (B.shieldStash || []).length === 1 && (A.shieldStash || []).length === aShield0 && (B.gearStash || []).length === 1 && (A.gearStash || []).length === aGear0,
    { bShields: B.shieldStash, aShields: (A.shieldStash || []).length, bGear: B.gearStash });
  const loss = msgs(ws.b, 'nml_loss').pop();
  check('...and the dead player\'s game is told exactly what went (nml_loss: the spare weapon, the one plate by its id)', !!loss && loss.payload.by === 'NmlA' && loss.payload.weapons === 1
    && loss.payload.gear.length === 1 && loss.payload.gear[0].field === 'armorStash' && loss.payload.gear[0].gid === minted.gid && loss.payload.red === false, loss && loss.payload);
  check('...the forfeited piece\'s id is remembered', B._nml.forfeit.indexOf(minted.gid) >= 0 && (state._store.get(NML_KEY(ids.b)) || { forfeit: [] }).forfeit.indexOf(minted.gid) >= 0);
  /* 7. offered again on the next join: refused */
  B.dying = false; B.dead = false;
  const wsB2 = fakeWs('b2');
  await join(wsB2, ids.b, 'NmlB', { gearArmorStash: [minted], armorStash: [minted] });
  const B2 = ps('b');
  check('a forfeited piece offered again on the next join is not taken back', !(B2.armorStash || []).some((g) => g && (g.gid === minted.gid || g.name === 'Copper Plate')), B2.armorStash);
  ws.b = wsB2;
}

// ── 6. a red skull's death ───────────────────────────────────────────────────
{
  const A = ps('a'), C = ps('c');
  /* C attacks A (C red), then A kills C */
  place(A, at(RING(2)), 7); place(C, at(RING(2) + 60), 7);
  A._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 };
  C._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 };
  room._pvpHitLanes && room._pvpHitLanes.clear();
  await attack(ws.c, C, ids.a, A);
  check('(the attacker is red)', room._nmlSkullOf(C) === 'r');
  C.coins = 400;
  C.weapon = { type: 'greatsword', gearBase: 'copper', tierMult: 1.12, quality: 'normal', name: 'Copper Greatsword' };
  C.staffWeapon = { type: 'staff', gearBase: 'wood', tierMult: 1, quality: 'normal', name: 'Pine Staff' };
  C.armor = room._gearProvRecord(ids.c, 'armor', { name: 'Copper Plate', gearBase: 'copper', tierMult: 2, tier: 't2', def: 7 }, 'test');
  /* its stale stash copy (same id), and a real spare */
  const spareC = room._gearProvRecord(ids.c, 'armor', { name: 'Iron Plate', gearBase: 'iron', tierMult: 3, tier: 't3', def: 11 }, 'test');
  C.armorStash = [{ ...C.armor }, spareC];
  C.shield = room._gearProvRecord(ids.c, 'shield', { name: 'Pine Shield', gearBase: 'wood', tierMult: 1, tier: 'common' }, 'test');
  C.shieldStash = [room._gearProvRecord(ids.c, 'shield', { name: 'Copper Shield', gearBase: 'copper', tierMult: 2, tier: 'common' }, 'test')];
  C.gearStash = [{ slot: 'hat', gearId: 'cowboy_hat', name: 'Cowboy Hat' }];
  C.inventory = { fish_minnow: 2 };
  const aCoins0 = A.coins || 0, aW0 = (A.weaponStash || []).length;
  const aArmor0 = (A.armorStash || []).length, aShield0 = (A.shieldStash || []).length;
  const wornGid = C.armor.gid;
  C.hp = 1;
  room._pvpHitLanes && room._pvpHitLanes.clear();
  await attack(ws.a, A, ids.c, C);
  await settle();
  check('a red skull killed by a player loses the worn weapons, the worn gear and the gold -- to the killer',
    C.dying && !C.weapon && !C.staffWeapon && !C.armor && C.coins === 0 && (A.coins || 0) === aCoins0 + 400 && (A.weaponStash || []).length === aW0 + 2,
    { c: { weapon: C.weapon, armor: C.armor, coins: C.coins }, a: { coins: A.coins, w: (A.weaponStash || []).length } });
  const aArmorGids = (A.armorStash || []).map((g) => g && g.gid).filter(Boolean);
  check('...every piece of armour once: the plate worn and the spare, never the worn plate\'s stale copy as a second',
    (A.armorStash || []).length === aArmor0 + 2 && aArmorGids.filter((g) => g === wornGid).length === 1 && aArmorGids.includes(spareC.gid)
    && (C.armorStash || []).length === 0, { a: aArmorGids, c: C.armorStash });
  check('...and every shield (a red skull loses them all), but no outfit piece',
    !C.shield && (C.shieldStash || []).length === 0 && (A.shieldStash || []).length === aShield0 + 2 && (C.gearStash || []).length === 1,
    { cShield: C.shield, cShields: C.shieldStash, aShields: (A.shieldStash || []).length, cGear: C.gearStash });
  const lossC = msgs(ws.c, 'nml_loss').pop();
  check('...and is told so (red, the worn fields, the gold)', !!lossC && lossC.payload.red === true && lossC.payload.coins === 400
    && ['weapon', 'staffWeapon', 'armor'].every((f) => lossC.payload.worn.includes(f)), lossC && lossC.payload);
  /* a red skull killed by a monster: to nobody */
  const D = ps('d');
  place(D, at(RING(2) + 300), 7);
  room._nmlState(D).red = 60000;
  D.coins = 90;
  D.weapon = { type: 'greatsword', gearBase: 'copper', tierMult: 1.12, quality: 'normal', name: 'Copper Greatsword' };
  D.inventory = { fish_minnow: 4 };
  D._nmlLastHitBy = null;
  room._handlePlayerDeath(D, ids.d, 'monster:wm-frost-1');
  await settle();
  const pileD = (room.loot[WHEEL_ZONE] || []).find((p) => p.isDeathDrop && p.lootId.startsWith('dd-' + ids.d));
  check('a red skull killed by a monster loses it all to nobody: the gold and the weapon gone, the items in a pile anyone may take at once',
    D.coins === 0 && !D.weapon && !!pileD && pileD.recipients.length === 0 && pileD.ownerOnlyUntil <= Date.now() + 5, { coins: D.coins, weapon: D.weapon, pile: pileD && { r: pileD.recipients, until: pileD.ownerOnlyUntil } });
  /* an ordinary death (no skull, a monster) is unchanged */
  const B = ps('b');
  place(B, at(RING(2) + 400), 7);
  B._nml = { red: 0, white: 0, whiteBy: null, forfeit: B._nml ? B._nml.forfeit : [], savedAt: 0 };
  B.weaponStash = [{ type: 'bow', gearBase: 'wood', tierMult: 1, quality: 'normal', name: 'Pine Bow' }];
  B.coins = 70;
  B.inventory = { fish_minnow: 1 };
  room._handlePlayerDeath(B, ids.b, 'monster:wm-frost-1');
  const pileB = (room.loot[WHEEL_ZONE] || []).find((p) => p.isDeathDrop && p.lootId.startsWith('dd-' + ids.b) && p.recipients[0] === ids.b);
  check('an ordinary death keeps its old rules: the spare weapon and the gold stay, the pile is the dead player\'s', B.weaponStash.length === 1 && B.coins === 70 && !!pileB);
}

// ── 8. the kill switch, and the caps ─────────────────────────────────────────
{
  const A = ps('a'), C = ps('c');
  place(A, at(RING(2)), 7); place(C, at(RING(2) + 60), 7);
  A._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 };
  const keep = room._liveFlags;
  room._liveFlags = { ...(keep || {}), nomansland: false };
  check('kill switch: nomansland:false refuses every No man\'s land hit', room._pvpAllowed(ids.a, ids.c, WHEEL_ZONE) === false);
  room._pvpHitLanes && room._pvpHitLanes.clear();
  room.eventBuffer.length = 0;
  await attack(ws.a, A, ids.c, C);
  check('...no hit lands, no skull starts', !room.eventBuffer.some((e) => e.type === 'pvp_hit') && room._nmlSkullOf(A) === null);
  room._nmlState(C).red = 1000;
  check('...and a death takes nothing', room._nmlOnDeath(C, ids.c, 'monster:x') === null);
  room._liveFlags = keep;
  const wsE = fakeWs('e');
  await join(wsE, 'bp_nml_e', 'NmlE');
  const sync = wsE.sent.find((m) => m.type === 'state_sync');
  check('caps.nomansland is advertised', !!sync && !!sync.caps && sync.caps.nomansland === true, sync && sync.caps && sync.caps.nomansland);
}

// ── 9. v2.3.3091: the shield on the arm (shieldwear.js), and the spares ─────
// The owner's "Yes" to "Shields and outfits in no man's land?": the game
// says which shield it wears (shield_wear), ps.shield is the one WORN and
// ps.shieldStash the spares -- and a loss under the rule takes the spares.
{
  const idF = 'bp_nml_f', wsF = fakeWs('f');
  await join(wsF, idF, 'NmlF');
  const F = room.playerState[idF];
  const sF = room.sessions.get(wsF);
  const rec = (p) => room._gearProvRecord(idF, 'shield', p, 'test');
  const P = rec({ name: 'Pine Shield', gearBase: 'wood', tierMult: 1, tier: 'common' });
  const S1 = rec({ name: 'Copper Shield', gearBase: 'copper', tierMult: 2, tier: 'common' });
  const L = { name: 'Old Buckler', gearBase: 'wood', tierMult: 1, tier: 'common' };   /* from before the ledger: no id */
  const sigL = 'Old Buckler|wood|1|common';
  const setUp = () => { F.shield = P; F.shieldStash = [S1, { ...L }, { ...P }]; F._shieldKnown = undefined; };
  setUp();
  const gids = () => (F.shieldStash || []).map((p) => p.gid || p.name);
  check('shield_wear: the caps advertise it (caps.shieldwear)', (wsF.sent.find((m) => m.type === 'state_sync') || { caps: {} }).caps.shieldwear === true);
  check('...a game too old to say leaves the arm unknown', F._shieldKnown === undefined);
  await room.webSocketMessage(wsF, JSON.stringify({ type: 'shield_wear', payload: { gid: P.gid } }));
  check('...the router hears it: the shield already on the arm -- nothing moves, the arm is known',
    F.shield === P && F._shieldKnown === true && JSON.stringify(gids()) === JSON.stringify([S1.gid, 'Old Buckler', P.gid]), gids());
  let r = room._handleShieldWear(sF, { gid: S1.gid });
  check('...a spare by its id goes on the arm, its one copy leaves the bag, and the one worn goes in -- unless a copy is already there (no second Pine Shield)',
    r === 'worn' && F.shield.gid === S1.gid && JSON.stringify(gids()) === JSON.stringify(['Old Buckler', P.gid]), { r, worn: F.shield, bag: gids() });
  r = room._handleShieldWear(sF, { sig: sigL });
  check('...a piece with no id, by its signature', r === 'worn' && F.shield.name === 'Old Buckler' && !F.shield.gid
    && JSON.stringify(gids()) === JSON.stringify([P.gid, S1.gid]), { r, worn: F.shield, bag: gids() });
  r = room._handleShieldWear(sF, { none: true });
  check('...nothing on the arm: the shield goes into the bag', r === 'none' && F.shield === null
    && JSON.stringify(gids()) === JSON.stringify([P.gid, S1.gid, 'Old Buckler']), { r, bag: gids() });
  const before = JSON.stringify(gids());
  r = room._handleShieldWear(sF, { gid: 'g_not_mine' });
  check('...a shield the worker does not hold for you: nothing moves, and the arm is unknown again',
    r === 'unknown' && F.shield === null && JSON.stringify(gids()) === before && F._shieldKnown === false, { r, known: F._shieldKnown });
  const junk = [{ gid: '__proto__' }, { gid: 'constructor' }, { gid: 'x'.repeat(41) }, { sig: '' }, { gid: 5 }, {}, null, 'none'];
  const outs = junk.map((p) => room._handleShieldWear(sF, p));
  check('...junk names nothing: an inherited name, a too-long id, an empty or a wrong-typed one, no payload',
    outs.every((o) => o === null || o === 'unknown') && F.shield === null && JSON.stringify(gids()) === before, outs);
  /* another player's shield, by its id: not yours */
  const theirs = room._gearProvRecord(ids.a, 'shield', { name: 'Iron Shield', gearBase: 'iron', tierMult: 3, tier: 'common' }, 'test');
  check('...another player\'s shield, by its id, is not yours', room._handleShieldWear(sF, { gid: theirs.gid }) === 'unknown' && F.shield === null);
  F.shieldStash = [];
  r = room._handleShieldWear(sF, { gid: P.gid });
  check('...a piece your ledger holds though no list does is yours, by its id', r === 'worn' && F.shield && F.shield.gid === P.gid, { r, worn: F.shield });

  /* the death under the rule, the arm known: the spares go, the worn one and its stale copy stay */
  const A = ps('a');
  setUp();
  room._handleShieldWear(sF, { gid: P.gid });
  place(A, at(RING(2)), 7); place(F, at(RING(2) + 60), 7);
  F._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 };
  A._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 };
  F.inventory = {};
  F.weaponStash = [];
  F.armorStash = [];
  F.legsStash = [];
  const aSh0 = (A.shieldStash || []).length;
  F.hp = 1;
  wsF.sent.length = 0;
  room._pvpHitLanes && room._pvpHitLanes.clear();
  await attack(ws.a, A, idF, F);
  await settle();
  check('a loss under the rule, the arm known: killed', F.dying === true, { hp: F.hp });
  check('...the spare shields go to the killer -- the recorded one with its provenance row, the old one too',
    (A.shieldStash || []).length === aSh0 + 2 && A.shieldStash.some((p) => p && p.gid === S1.gid) && A.shieldStash.some((p) => p && p.name === 'Old Buckler')
    && (room._gearProvOf(ids.a) || { list: [] }).list.some((row) => row.id === S1.gid) && F._nml.forfeit.indexOf(S1.gid) >= 0,
    { a: (A.shieldStash || []).map((p) => p.gid || p.name), forfeit: F._nml.forfeit });
  check('...the shield on the arm stays, and so does its stale copy in the bag (same id): the killer gets no second Pine Shield',
    !!F.shield && F.shield.gid === P.gid && (F.shieldStash || []).length === 1 && F.shieldStash[0].gid === P.gid
    && !(A.shieldStash || []).some((p) => p && p.gid === P.gid) && F._nml.forfeit.indexOf(P.gid) < 0, { worn: F.shield, bag: gids() });
  const lossF = msgs(wsF, 'nml_loss').pop();
  const shGear = lossF ? lossF.payload.gear.filter((g) => g.field === 'shieldStash') : [];
  check('...and the game is told which two went (nml_loss: one by its id, one by its signature)',
    shGear.length === 2 && shGear.some((g) => g.gid === S1.gid) && shGear.some((g) => !g.gid && g.sig === sigL), lossF && lossF.payload);

  /* the kill switch: reports ignored, and a loss takes no shield again */
  F.dying = false; F.dead = false; F.hp = F.maxHp;
  const keep = room._liveFlags;
  room._liveFlags = { ...(keep || {}), shieldwear: false };
  F.shield = P; F.shieldStash = [S1]; F._shieldKnown = true;
  check('kill switch: shieldwear:false ignores the report', room._handleShieldWear(sF, { none: true }) === null && F.shield === P);
  F._nmlLastHitBy = ids.a; F._nmlLastHitAt = Date.now();
  F._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 };
  room._nmlOnDeath(F, idF, 'pvp:' + ids.a);
  check('...and a loss under the rule takes no shield', (F.shieldStash || []).length === 1 && F.shieldStash[0].gid === S1.gid, gids());
  const wsG = fakeWs('g');
  await join(wsG, 'bp_nml_g', 'NmlG');
  const syncG = wsG.sent.find((m) => m.type === 'state_sync');
  check('...and the next join is told it is off', !!syncG && syncG.caps.shieldwear === false, syncG && syncG.caps.shieldwear);
  room._liveFlags = keep;
}

if (failures) { console.log(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log('\nnomansland: all passed');
