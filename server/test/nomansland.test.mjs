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
 *   5. a death under the rule: EVERYTHING CARRIED (v2.3.3316) -- the whole
 *      bag, the tools, ores, cooked fish and quest remains with it, in a pile
 *      that is the KILLER's for its owner window; the gold, the spare
 *      weapons and gear credited to the killer (gear with its provenance
 *      row); nothing worn; `nml_loss` told, and the killer told (`nml_take`);
 *   6. a red skull's death: killed by a player, the worn weapons and gear too
 *      -- to the killer; killed by a monster (v2.3.3316) everything carried
 *      to nobody (the items in a pile anyone may take at once) and what they
 *      WEAR kept;
 *   7. a forfeited piece offered again on the next join is refused;
 *   8. the kill switch: no hit, no skull, nothing taken; caps advertise it;
 *  11. v2.3.3316: the spare amulets, a status tick's kill, the respawn wipe,
 *      a red skull a monster killed with the arm known and unknown;
 *  12. v2.3.3530: a group attacks you -- every attacker's right to be hit
 *      back is kept (no red skull for hitting back any of them), counted
 *      down on its own, stored, sent as `bys`; the kill switch `nmlgroup`;
 *  13. v2.3.3530: the window's Attack is the attack (`nml_attack`): both
 *      skulls at once, before any blow, no kill stamped by it; the one
 *      attacked who hits first stays white; refused cases; the rate; the
 *      kill switch `nmlchoice` as a mutation; the caps.
 */
import { GameRoom } from '../src/index.js';
import { NML, nmlTierAt, nmlLevelAt, NML_KEY } from '../src/nomansland.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_LONG, WHEEL_SAFE_R } from '../src/wheelspawns.js';   /* v2.3.3315: the live Wheel, WHEEL_LONG times longer; v2.3.3690: + its safe ground */
import { WHEEL_SAFE_R as WHEEL_SAFE_R_1 } from '../src/wheelspawns1.js';   /* v2.3.3690: the short Wheel's safe ground */
import { PLAN, PLAN5 } from '../../public/tools/world/plan.js';

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
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name, phrase: 'p-' + id, ws: [1, 5], data: { x: 0, y: 0, z: 'town', ...(data || {}) } }));
  room.sessions.get(ws).name = name;
}
/* a spot in the Wheel at radius r, on the line due east of the centre */
const at = (r, dy = 0) => ({ x: WHEEL_CENTRE[0] + r, y: WHEEL_CENTRE[1] + dy });
const TIER = NML.TIER * WHEEL_LONG;   /* v2.3.3315: the live Wheel's tier */
const RING = (t) => NML.HUB + (t - 0.5) * TIER;   /* the middle of tier t */
/* v2.3.3690: the middle of No man's land n (its tier n + FIRST_TIER - 1: the
   Lv 1-5 tier is 1 now), and a spot on the safe ground just inside its edge,
   whose tier is 1 but which is never under the rule */
const NMLR = (n) => RING(n + NML.FIRST_TIER - 1);
const SAFE_IN = NML.SAFE_R - 60;
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
  const W = PLAN.wheel, W5 = PLAN5.wheel;
  check('the rings are the plan\'s: hub, tier, tiers, levels a tier', NML.HUB === W.hub * W.zonePx && NML.TIER === W.tierZones * W.zonePx
    && NML.TIERS === W.tiers && NML.LEVELS_PER_TIER === W.levelsPerTier, { NML, plan: W });
  /* v2.3.3315: the live Wheel's tiers are WHEEL_LONG times as long (plan.js PLAN5) */
  check('...and the live Wheel\'s: its tiers WHEEL_LONG times as long, the hub the same', WHEEL_LONG === W5.tierZones && TIER === W5.tierZones * W5.zonePx
    && NML.HUB === W5.hub * W5.zonePx, { WHEEL_LONG, TIER, plan: W5 });
  /* v2.3.3690: the owner, 2026-10-28: "No man's land should begin just
     outside of town where you can fight the lvl 1 monsters" */
  check('the commons are not No man\'s land; the Lv 1-5 tier is 1, Lv 6-10 is 2, Lv 11-15 is 3',
    NML.FIRST_TIER === 1 && nmlLevelAt(WHEEL_ZONE, WHEEL_CENTRE[0], WHEEL_CENTRE[1], WHEEL_LONG) === 0
    && nmlLevelAt(WHEEL_ZONE, at(RING(1)).x, at(RING(1)).y, WHEEL_LONG) === 1
    && nmlLevelAt(WHEEL_ZONE, at(RING(2)).x, at(RING(2)).y, WHEEL_LONG) === 2 && nmlLevelAt(WHEEL_ZONE, at(RING(3)).x, at(RING(3)).y, WHEEL_LONG) === 3,
    [0, 1, 2, 3].map((t) => (t ? nmlLevelAt(WHEEL_ZONE, at(RING(t)).x, at(RING(t)).y, WHEEL_LONG) : 0)));
  check('...out to 16 at the last tier, and only in the Wheel', nmlLevelAt(WHEEL_ZONE, at(RING(16)).x, at(RING(16)).y, WHEEL_LONG) === 16
    && nmlLevelAt('frost', at(RING(3)).x, at(RING(3)).y, WHEEL_LONG) === 0 && nmlTierAt(NaN, 0, WHEEL_LONG) === 0);
  /* the first tier begins at HUB, a little inside the safe ground: the safe
     ground's edge is where it starts, on both Wheels */
  check('...the safe ground\'s radius is the bake\'s, on both Wheels', NML.SAFE_R === WHEEL_SAFE_R && NML.SAFE_R === WHEEL_SAFE_R_1 && NML.SAFE_R > NML.HUB,
    { SAFE_R: NML.SAFE_R, WHEEL_SAFE_R, WHEEL_SAFE_R_1, HUB: NML.HUB });
  check('...the line where it starts is the safe ground\'s edge, exact: tier 1 on the safe ground is not No man\'s land',
    nmlTierAt(at(SAFE_IN).x, WHEEL_CENTRE[1], WHEEL_LONG) === 1 && nmlLevelAt(WHEEL_ZONE, at(NML.SAFE_R - 1).x, WHEEL_CENTRE[1], WHEEL_LONG) === 0
    && nmlLevelAt(WHEEL_ZONE, at(NML.SAFE_R + 1).x, WHEEL_CENTRE[1], WHEEL_LONG) === 1
    && nmlLevelAt(WHEEL_ZONE, WHEEL_CENTRE[0], WHEEL_CENTRE[1] - (NML.SAFE_R - 1), WHEEL_LONG) === 0
    && nmlLevelAt(WHEEL_ZONE, WHEEL_CENTRE[0], WHEEL_CENTRE[1] - (NML.SAFE_R + 1), WHEEL_LONG) === 1);
  check('...and the safe ground agrees: the spot just outside it is no longer sheltered, just inside it is',
    room._wheelSafeAt(at(NML.SAFE_R - 1).x, WHEEL_CENTRE[1]) === true && room._wheelSafeAt(at(NML.SAFE_R + 1).x, WHEEL_CENTRE[1]) === false);
  check('...from the first tier to the second, one level on: the line between them exact',
    nmlLevelAt(WHEEL_ZONE, at(NML.HUB + TIER - 1).x, WHEEL_CENTRE[1], WHEEL_LONG) === 1
    && nmlLevelAt(WHEEL_ZONE, at(NML.HUB + TIER + 1).x, WHEEL_CENTRE[1], WHEEL_LONG) === 2);
  /* the old rule, the kill switch's (and an older worker's): from the Lv 6-10 tier */
  check('`first` 2 (the rule as it was): the Lv 1-5 tier not, Lv 6-10 is 1, out to 15',
    nmlLevelAt(WHEEL_ZONE, at(RING(1)).x, at(RING(1)).y, WHEEL_LONG, NML.WAS_FIRST_TIER) === 0
    && nmlLevelAt(WHEEL_ZONE, at(RING(2)).x, at(RING(2)).y, WHEEL_LONG, NML.WAS_FIRST_TIER) === 1
    && nmlLevelAt(WHEEL_ZONE, at(RING(16)).x, at(RING(16)).y, WHEEL_LONG, NML.WAS_FIRST_TIER) === 15);
  const keepF = room._liveFlags;
  place(ps('a'), at(RING(1)), 3);
  const nowLvl = room._nmlLevelOf(ps('a'));
  room._liveFlags = { ...(keepF || {}), nmlnear: false };
  const offLvl = room._nmlLevelOf(ps('a'));
  place(ps('a'), at(RING(2)), 3);
  const offLvl2 = room._nmlLevelOf(ps('a'));
  room._liveFlags = keepF;
  check('`nmlnear: false` in the live flags: the worker\'s own rule from the Lv 6-10 tier again',
    nowLvl === 1 && offLvl === 0 && offLvl2 === 1 && room._nmlLevelOf(ps('a')) === 2, { nowLvl, offLvl, offLvl2 });
}

// ── 2. who may hit whom ──────────────────────────────────────────────────────
{
  place(ps('a'), at(NMLR(1)), 6); place(ps('b'), at(NMLR(1), 60), 7);
  check('both in No man\'s land 1, levels 6 and 7: allowed', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === true && room._pvpAllowed(ids.b, ids.a, WHEEL_ZONE) === true);
  ps('b').level = 8;
  check('...levels 6 and 8 in No man\'s land 1: refused', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === false);
  place(ps('a'), at(NMLR(2)), 6); place(ps('b'), at(NMLR(2), 60), 8);
  check('...both in No man\'s land 2, levels 6 and 8: allowed', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === true);
  place(ps('b'), at(NMLR(1), 60), 8);
  check('...one in 2 and the other in 1, two levels apart: refused (the lower of the two rules)', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === false);
  place(ps('a'), at(SAFE_IN), 7); place(ps('b'), at(NMLR(1), 60), 7);
  check('...one still on the safe ground: refused', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === false);
  check('the master switch stays off everywhere else (town, an old lawless zone)', room.OPEN_PVP === false
    && room._pvpAllowed(ids.a, ids.b, 'town') === false && room._pvpAllowed(ids.a, ids.b, 'frost') === false);
  /* one party */
  place(ps('a'), at(NMLR(1)), 7);
  const keepParty = room._partyOf;
  room._partyOf = (id) => (id === ids.a || id === ids.b ? { id: 'p1' } : null);
  check('...one party: refused', room._pvpAllowed(ids.a, ids.b, WHEEL_ZONE) === false);
  room._partyOf = keepParty;
}

// ── 3. a landed hit: the skulls ──────────────────────────────────────────────
{
  const A = ps('a'), B = ps('b');
  place(A, at(NMLR(1)), 7); place(B, at(NMLR(1) + 60), 7);
  ws.a.sent.length = 0; ws.b.sent.length = 0; room.eventBuffer.length = 0;
  await attack(ws.a, A, ids.b, B);
  const hit = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  check('a hit lands in No man\'s land', !!hit && hit.payload.target === ids.b && B.hp < 1000, hit && hit.payload);
  check('...the attacker gets a RED skull for 20 minutes', room._nmlSkullOf(A) === 'r' && A._nml.red === NML.SKULL_MS, A._nml);
  check('...the one hit a WHITE skull for 20 minutes, remembering who', room._nmlSkullOf(B) === 'w' && B._nml.white === NML.SKULL_MS && B._nml.whiteBy === ids.a, B._nml);
  const sa = msgs(ws.a, 'nml_skull').pop(), sb = msgs(ws.b, 'nml_skull').pop();
  check('...each told their own (nml_skull, ms left)', !!sa && sa.payload.red === NML.SKULL_MS && !!sb && sb.payload.white === NML.SKULL_MS && sb.payload.red === 0, { sa, sb });
  /* v2.3.3253: the one hit is told WHO, so its game can tell hitting back
     from attacking (src/game/nmlAsk.js nmlHitBack); no `by` without a white */
  check('...the white skull says who gave it (`by`), the red alone says no one', sb.payload.by === ids.a && !('by' in sa.payload), { sa: sa.payload, sb: sb.payload });
  check('...and both are dirty, so the tick carries them to everyone else', room.dirtyPlayers.has(ids.a) && room.dirtyPlayers.has(ids.b));
  /* the tick's wire */
  const wireA = { ...(A._nml.red > 0 ? { sk: 'r' } : {}) };
  check('...as `sk` on the tick\'s player wire (r)', wireA.sk === 'r');
  /* hitting back */
  room._pvpHitLanes && room._pvpHitLanes.clear();
  await attack(ws.b, B, ids.a, A);
  check('hitting back the one who attacked you is no red skull', room._nmlSkullOf(B) === 'w' && !(B._nml.red > 0), B._nml);
  check('...but marks them white too (red still shows)', A._nml.white === NML.SKULL_MS && A._nml.whiteBy === ids.b && room._nmlSkullOf(A) === 'r');
  const saBack = msgs(ws.a, 'nml_skull').pop();
  check('...and the attacker is told who hit them back (`by`, beside their red)', !!saBack && saBack.payload.by === ids.b && saBack.payload.red > 0, saBack && saBack.payload);
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
  check('...with no `by` once the white skull is gone (v2.3.3253)', !('by' in msgs(ws.c, 'nml_skull')[0].payload), msgs(ws.c, 'nml_skull')[0].payload);
  /* back on join */
  room._nmlSave(ids.a, A);
  const ws2 = fakeWs('a2');
  await join(ws2, ids.a, 'NmlA');
  const A2 = ps('a');
  check('it comes back on join, with its time left, and you are told', !!A2._nml && A2._nml.red > NML.SKULL_MS - 5000 && msgs(ws2, 'nml_skull').length >= 1, A2._nml);
  const joinSkull = msgs(ws2, 'nml_skull').pop();
  check('...the white skull\'s giver too (`by`, from nml_state\'s whiteBy)', A2._nml.white > 0 && A2._nml.whiteBy === ids.b && !!joinSkull && joinSkull.payload.by === ids.b,
    { white: A2._nml.white, whiteBy: A2._nml.whiteBy, sent: joinSkull && joinSkull.payload });
  ws.a = ws2;
}

// ── 5. a death under the rule ────────────────────────────────────────────────
{
  const A = ps('a'), B = ps('b');
  place(A, at(NMLR(1)), 7); place(B, at(NMLR(1) + 60), 7);
  B._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 };
  /* v2.3.3316: every carve-out the death had -- a tool, a quest's remains
     (snowman), an ore and a cooked fish (life_1/life_2's objective families) */
  B.inventory = { snowman: 3, fish_minnow: 5, mining_pickaxe: 1, ore_iron: 7, cooked_fish_trout: 2 };
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
  ws.a.sent.length = 0;
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
  /* v2.3.3316: "Opponents do not drop all of their items except what they
     have equipped" -- the death's carve-outs went with them */
  const pileHas = (k, q) => !!pile && pile.deathItems.some((i) => i.key === k && i.qty === q);
  check('...ALL of it: the tool, the quest\'s remains, the ore and the cooked fish too (v2.3.3316: no carve-out in No man\'s land)',
    pileHas('mining_pickaxe', 1) && pileHas('snowman', 3) && pileHas('ore_iron', 7) && pileHas('cooked_fish_trout', 2), pile && pile.deathItems);
  check('...and the bag is empty', Object.keys(B.inventory || {}).length === 0, B.inventory);
  check('...the spare weapon goes to the killer', (B.weaponStash || []).length === 0 && (A.weaponStash || []).length === aStash0 + 1 && A.weaponStash.some((w) => w && w.type === 'bow'), { b: B.weaponStash, a: A.weaponStash });
  check('...the spare armour too, with its provenance row', !(B.armorStash || []).some((g) => g && g.gid === minted.gid) && (A.armorStash || []).length === aArmor0 + 1
    && (A.armorStash || []).some((g) => g && g.gid === minted.gid)
    && (room._gearProvOf(ids.a) || { list: [] }).list.some((r) => r.id === minted.gid), { a: A.armorStash, b: B.armorStash });
  check('...nothing worn is taken', !!B.weapon && B.weapon.type === 'greatsword' && !!B.armor && B.armor.gid === wornPlate.gid && !!B.legsArmor && !!B.shield);
  check('...the gold goes to the killer (v2.3.3316, the owner: "Lose their gold too")', B.coins === 0 && (A.coins || 0) === aCoins0 + 250, { b: B.coins, a: A.coins, a0: aCoins0 });
  check('...the stash copy of the plate B WEARS (same id) is not taken, and its id not forfeited -- the killer gets no second plate',
    (B.armorStash || []).length === 1 && B.armorStash[0].gid === wornPlate.gid && B._nml.forfeit.indexOf(wornPlate.gid) < 0
    && !(A.armorStash || []).some((g) => g && g.gid === wornPlate.gid)
    && (room._gearProvOf(ids.b) || { list: [] }).list.some((r) => r.id === wornPlate.gid), { b: B.armorStash, forfeit: B._nml.forfeit });
  check('...nor a stash copy with no id that matches what B wears (greaves)', (B.legsStash || []).length === 1, B.legsStash);
  check('...no shield is taken (B\'s game never said which shield is on its arm, shield_wear: a worn one cannot be told from a spare), and no outfit piece',
    (B.shieldStash || []).length === 1 && (A.shieldStash || []).length === aShield0 && (B.gearStash || []).length === 1 && (A.gearStash || []).length === aGear0,
    { bShields: B.shieldStash, aShields: (A.shieldStash || []).length, bGear: B.gearStash });
  const loss = msgs(ws.b, 'nml_loss').pop();
  check('...and the dead player\'s game is told exactly what went (nml_loss: the spare weapon, the one plate by its id, the gold)', !!loss && loss.payload.by === 'NmlA' && loss.payload.weapons === 1
    && loss.payload.gear.length === 1 && loss.payload.gear[0].field === 'armorStash' && loss.payload.gear[0].gid === minted.gid && loss.payload.red === false
    && loss.payload.coins === 250 && loss.payload.named === true && loss.payload.keepWorn === false, loss && loss.payload);
  const take = msgs(ws.a, 'nml_take').pop();
  check('...and the killer is told what they took (nml_take: who, the 18 things in the pile, the gold, the spare weapon and plate)', !!take && take.payload.from === 'NmlB'
    && take.payload.items === 18 && take.payload.coins === 250 && take.payload.weapons === 1 && take.payload.gear === 1 && take.payload.lootId === pile.lootId, take && take.payload);
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
  place(A, at(NMLR(1)), 7); place(C, at(NMLR(1) + 60), 7);
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
  C.inventory = { fish_minnow: 2, woodcutting_axe: 1, ore_copper: 4 };
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
  const pileC = (room.loot[WHEEL_ZONE] || []).find((p) => p.isDeathDrop && p.lootId.startsWith('dd-' + ids.c));
  check('...and the whole bag, the axe and the ore too, in the killer\'s pile (v2.3.3316)', !!pileC && pileC.recipients[0] === ids.a
    && pileC.deathItems.some((i) => i.key === 'woodcutting_axe') && pileC.deathItems.some((i) => i.key === 'ore_copper' && i.qty === 4)
    && Object.keys(C.inventory || {}).length === 0, { pile: pileC && pileC.deathItems, inv: C.inventory });
  const lossC = msgs(ws.c, 'nml_loss').pop();
  check('...and is told so (red, the worn fields, the gold, nothing worn kept)', !!lossC && lossC.payload.red === true && lossC.payload.coins === 400
    && ['weapon', 'staffWeapon', 'armor'].every((f) => lossC.payload.worn.includes(f)) && lossC.payload.keepWorn === false, lossC && lossC.payload);
  /* a red skull killed by a monster: everything CARRIED to nobody, and --
     v2.3.3316, the owner: "If they're killed by a monster then make it so
     they just lose everything except their equipped items" -- what it WEARS
     kept */
  const D = ps('d');
  place(D, at(NMLR(1) + 300), 7);
  room._nmlState(D).red = 60000;
  D.coins = 90;
  D.weapon = { type: 'greatsword', gearBase: 'copper', tierMult: 1.12, quality: 'normal', name: 'Copper Greatsword' };
  D.rangedWeapon = { type: 'bow', gearBase: 'wood', tierMult: 1, quality: 'normal', name: 'Pine Bow' };
  D.weaponStash = [{ type: 'staff', gearBase: 'wood', tierMult: 1, quality: 'normal', name: 'Spare Staff' }];
  D.armor = room._gearProvRecord(ids.d, 'armor', { name: 'Copper Plate', gearBase: 'copper', tierMult: 2, tier: 't2', def: 7 }, 'test');
  const spareD = room._gearProvRecord(ids.d, 'armor', { name: 'Iron Plate', gearBase: 'iron', tierMult: 3, tier: 't3', def: 11 }, 'test');
  D.armorStash = [{ ...D.armor }, spareD];
  D.inventory = { fish_minnow: 4, fishing_pole: 1, cooked_fish_minnow: 3 };
  D._nmlLastHitBy = null;
  const wsD = ws.d; wsD.sent.length = 0;
  room._handlePlayerDeath(D, ids.d, 'monster:wm-frost-1');
  await settle();
  const pileD = (room.loot[WHEEL_ZONE] || []).find((p) => p.isDeathDrop && p.lootId.startsWith('dd-' + ids.d));
  check('a red skull killed by a monster loses everything it CARRIES to nobody: the gold, the spare weapon and the spare plate gone, the whole bag (the rod, the cooked fish) in a pile anyone may take at once',
    D.coins === 0 && (D.weaponStash || []).length === 0 && !(D.armorStash || []).some((g) => g && g.gid === spareD.gid) && D._nml.forfeit.indexOf(spareD.gid) >= 0
    && !!pileD && pileD.recipients.length === 0 && pileD.ownerOnlyUntil <= Date.now() + 5
    && pileD.deathItems.some((i) => i.key === 'fishing_pole') && pileD.deathItems.some((i) => i.key === 'cooked_fish_minnow' && i.qty === 3),
    { coins: D.coins, stash: D.weaponStash, armor: D.armorStash, pile: pileD && { r: pileD.recipients, until: pileD.ownerOnlyUntil, items: pileD.deathItems } });
  check('...and KEEPS what it wears (v2.3.3316): both weapons in hand, the plate and its stale stash copy',
    !!D.weapon && D.weapon.name === 'Copper Greatsword' && !!D.rangedWeapon && D.rangedWeapon.name === 'Pine Bow'
    && !!D.armor && (D.armorStash || []).length === 1 && D.armorStash[0].gid === D.armor.gid && D._nml.forfeit.indexOf(D.armor.gid) < 0,
    { weapon: D.weapon, ranged: D.rangedWeapon, armor: D.armor, stash: D.armorStash });
  const lossD = msgs(wsD, 'nml_loss').pop();
  check('...and its game is told to keep what it wears (keepWorn, nothing worn listed), by no player', !!lossD && lossD.payload.red === true && lossD.payload.keepWorn === true
    && lossD.payload.worn.length === 0 && lossD.payload.by === null && lossD.payload.coins === 90 && lossD.payload.weapons === 1
    && lossD.payload.gear.length === 1 && lossD.payload.gear[0].gid === spareD.gid, lossD && lossD.payload);
  /* an ordinary death (no skull, a monster) is unchanged */
  const B = ps('b');
  place(B, at(NMLR(1) + 400), 7);
  B._nml = { red: 0, white: 0, whiteBy: null, forfeit: B._nml ? B._nml.forfeit : [], savedAt: 0 };
  B.weaponStash = [{ type: 'bow', gearBase: 'wood', tierMult: 1, quality: 'normal', name: 'Pine Bow' }];
  B.coins = 70;
  B.inventory = { fish_minnow: 1, mining_pickaxe: 1, ore_iron: 2 };
  room._handlePlayerDeath(B, ids.b, 'monster:wm-frost-1');
  const pileB = (room.loot[WHEEL_ZONE] || []).find((p) => p.isDeathDrop && p.lootId.startsWith('dd-' + ids.b) && p.recipients[0] === ids.b);
  check('an ordinary death keeps its old rules: the spare weapon and the gold stay, the pile is the dead player\'s', B.weaponStash.length === 1 && B.coins === 70 && !!pileB);
  check('...and its carve-outs: the pickaxe and the ore stay in the bag, only the minnow falls (only No man\'s land takes them)',
    B.inventory.mining_pickaxe === 1 && B.inventory.ore_iron === 2 && !B.inventory.fish_minnow
    && pileB.deathItems.length === 1 && pileB.deathItems[0].key === 'fish_minnow', { inv: B.inventory, pile: pileB.deathItems });
}

// ── 8. the kill switch, and the caps ─────────────────────────────────────────
{
  const A = ps('a'), C = ps('c');
  place(A, at(NMLR(1)), 7); place(C, at(NMLR(1) + 60), 7);
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
  place(A, at(NMLR(1)), 7); place(F, at(NMLR(1) + 60), 7);
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

// ── 10. v2.3.3183: nothing leaves the bag in a fight with a player ─────────
// A modified game could empty a losing bag in the last seconds of a fight --
// to Diego, the auction house, a market order, a trade, the farm's beds -- so
// the killer's pile was empty, and cancel the orders afterwards.  Every road
// out of the bag now refuses on the order board's test: a duel, or a hit
// between players in the last 10 s.
{
  const idH = 'bp_nml_h', idI = 'bp_nml_i', idJ = 'bp_nml_j';
  const wsH = fakeWs('h'), wsI = fakeWs('i'), wsJ = fakeWs('j');
  await join(wsH, idH, 'NmlH'); await join(wsI, idI, 'NmlI'); await join(wsJ, idJ, 'NmlJ');
  const H = room.playerState[idH], I = room.playerState[idI], J = room.playerState[idJ];
  const fill = () => {
    H.inventory = { crop_carrot: 10, seed_carrot: 4, compost: 3 };
    H.coins = 5000;
    H.weaponStash = [{ type: 'sword', tier: 'common', tierMult: 1.4, name: 'Spare Sword', gearBase: 'iron', quality: 'normal', hardness: 0, temper: 0 }];
  };
  fill();
  const lockFn = typeof room._bagLockedByFight === 'function';
  const locked = () => (lockFn ? room._bagLockedByFight(idH) : false);
  check('setup: before any fight, nothing holds the bag', lockFn && locked() === false);
  /* the farm before the fight: two beds dug, one of them planted (a seed
     spent), so a plant and a compost mid-fight would really happen */
  const farmCmd = async (payload) => { await room.webSocketMessage(wsH, JSON.stringify({ type: 'farm_act', payload })); await settle(); };
  await farmCmd({ op: 'dig', beds: [0, 1] });
  if (room._farmRate) room._farmRate.delete(idH);
  await farmCmd({ op: 'plant', crop: 'carrot', beds: [1] });
  if (room._farmRate) room._farmRate.delete(idH);
  check('setup: two beds dug and one planted before the fight (a seed spent: 3 left)', H.inventory.seed_carrot === 3, H.inventory);
  place(H, at(NMLR(1)), 7); place(I, at(NMLR(1) + 60), 7);
  room._pvpHitLanes && room._pvpHitLanes.clear();
  await attack(wsI, I, idH, H);
  check('setup: a hit between players in No man\'s land (I hits H)', !!room.eventBuffer.find((e) => e.type === 'pvp_hit' && e.payload.target === idH) && locked() === true, locked());

  // Diego
  const sell = await room._shopSell(H, 'crop_carrot', 5, idH);
  check('Diego buys nothing from a player in a fight', !!sell && sell.ok === false && /fight/i.test(sell.error || '') && H.inventory.crop_carrot === 10 && H.coins === 5000, { sell, inv: H.inventory, coins: H.coins });
  // the auction house: listing (its index loaded, as its HTTP route does)
  await room._stEnsureIndex();
  const lst = await room._stCreateListing({ playerId: idH, kind: 'item', invKey: 'crop_carrot', qty: 5, price: 100 });
  check('...the auction house lists nothing', !!lst && lst.ok === false && /fight/i.test(lst.error || '') && H.inventory.crop_carrot === 10, { lst, inv: H.inventory });
  // ...buying or bidding (gold to another player, or into an escrow)
  const sreq = (path, body) => room.fetch(new Request('https://x' + path, { method: 'POST', body: JSON.stringify(body) }));
  const buyBody = await (await sreq('/api/store/buy', { playerId: idH, listingId: 'nope' })).json();
  const bidBody = await (await sreq('/api/store/bid', { playerId: idH, listingId: 'nope', amount: 50 })).json();
  check('...nor buys or bids there', buyBody.ok === false && /fight/i.test(buyBody.error || '') && bidBody.ok === false && /fight/i.test(bidBody.error || '') && H.coins === 5000, { buyBody, bidBody });
  // the market (its index loaded, as its HTTP route does)
  await room._mktEnsureIndex();
  const sellOrder = await room._mktPlaceOrder({ type: 'sell', category: 'weapon', subtype: 'sword', tierKey: 'iron', price: 100, tierLabel: 'Iron', playerName: 'H', playerId: idH, stashIndex: 0 });
  const buyOrder = await room._mktPlaceOrder({ type: 'buy', category: 'weapon', subtype: 'sword', tierKey: 'iron', price: 4000, tierLabel: 'Iron', playerName: 'H', playerId: idH });
  check('...the market takes no order, a weapon or gold (a red skull\'s gold hid there)', sellOrder.ok === false && buyOrder.ok === false && /fight/i.test(buyOrder.error || '')
    && H.weaponStash.length === 1 && H.coins === 5000, { sellOrder, buyOrder, stash: H.weaponStash.length, coins: H.coins });
  // the farm
  wsH.sent.length = 0;
  await farmCmd({ op: 'plant', crop: 'carrot', beds: [0] });
  await farmCmd({ op: 'feed', beds: [1] });
  const farmErrs = msgs(wsH, 'farm_state').map((m) => m.payload && m.payload.err);
  check('...the farm plants no seed and spreads no compost', farmErrs.filter((e) => e === 'fight').length === 2 && H.inventory.seed_carrot === 3 && H.inventory.compost === 3, { farmErrs, inv: H.inventory });
  // a trade with a friend (J, not in the fight)
  const cmd = (w, type, payload) => room.webSocketMessage(w, JSON.stringify({ type, payload: payload || {} }));
  place(J, at(NMLR(1) + 30), 7);
  await cmd(wsH, 'trade2_open', { target: idJ });
  await cmd(wsJ, 'trade2_open', { target: idH });
  await cmd(wsH, 'trade2_set', { offer: { crop_carrot: 10 } });
  await cmd(wsH, 'trade2_ready', { ready: true });
  await cmd(wsJ, 'trade2_ready', { ready: true });
  for (const s2 of (room._trades2 || new Map()).values()) s2.changedAt = Date.now() - 999999;
  wsH.sent.length = 0;
  await cmd(wsH, 'trade2_confirm');
  await cmd(wsJ, 'trade2_confirm');
  const t2 = msgs(wsH, 'trade2_state').pop();
  check('...and no trade goes through, the window staying open ("fight")', !!t2 && t2.payload.state === 'open' && t2.payload.reason === 'fight' && H.inventory.crop_carrot === 10 && !((J.inventory || {}).crop_carrot), t2 && t2.payload);

  // ten seconds after the last hit, all of it is open again
  const clock = room._pvpHealClocks && room._pvpHealClocks.get(idH);
  if (clock) clock.pvpAt -= 11000;
  check('ten seconds after the last hit the bag is free again', locked() === false);
  const sell2 = await room._shopSell(H, 'crop_carrot', 5, idH);
  check('...Diego buys again', !!sell2 && sell2.ok === true && H.inventory.crop_carrot === 5, sell2);
  const buy2 = await room._mktPlaceOrder({ type: 'buy', category: 'weapon', subtype: 'sword', tierKey: 'iron', price: 100, tierLabel: 'Iron', playerName: 'H', playerId: idH });
  check('...the market takes the order', buy2.ok === true, buy2);

  // the kill switch
  const keep = room._liveFlags;
  room._pvpHitLanes && room._pvpHitLanes.clear();
  await attack(wsI, I, idH, H);
  check('setup: fighting again', locked() === true);
  room._liveFlags = { ...(keep || {}), fightlock: false };
  check('kill switch: fightlock:false lets the bag go mid-fight', locked() === false);
  const sell3 = await room._shopSell(H, 'crop_carrot', 1, idH);
  check('...Diego buying as before', !!sell3 && sell3.ok === true, sell3);
  room._liveFlags = keep;
  for (const s2 of (room._trades2 || new Map()).values()) room._t2Cancel && room._t2Cancel(s2, 'test');
}

// ── 11. v2.3.3316: the rest of "everything but what you wear" ──────────────
{
  const idK = 'bp_nml_k', idL = 'bp_nml_l';
  const wsK = fakeWs('k'), wsL = fakeWs('l');
  await join(wsK, idK, 'NmlK'); await join(wsL, idL, 'NmlL');
  const K = room.playerState[idK], L = room.playerState[idL];
  const fresh = (P) => { P._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 }; P.dying = false; P.dead = false; };
  /* the spare amulets go to the killer; the one worn stays */
  place(K, at(NMLR(1)), 7); place(L, at(NMLR(1) + 60), 7);
  fresh(K); fresh(L);
  L.amulet = room._gearProvRecord(idL, 'amulet', { name: 'Simple Amulet', tier: 'simple', gem: null }, 'test');
  const spareAm = room._gearProvRecord(idL, 'amulet', { name: 'Ornate Amulet', tier: 'ornate', gem: 'frost' }, 'test');
  L.amuletStash = [spareAm];
  L.inventory = { fish_minnow: 1 };
  L.coins = 0;
  const kAm0 = (K.amuletStash || []).length;
  L.hp = 1;
  room._pvpHitLanes && room._pvpHitLanes.clear();
  await attack(wsK, K, idL, L);
  await settle();
  check('a spare amulet goes to the killer with its row (v2.3.3316: a red skull\'s only before); the one worn stays',
    L.dying === true && (L.amuletStash || []).length === 0 && (K.amuletStash || []).length === kAm0 + 1
    && K.amuletStash.some((a) => a && a.gid === spareAm.gid) && !!L.amulet && L.amulet.gid !== spareAm.gid,
    { l: L.amuletStash, k: (K.amuletStash || []).map((a) => a && a.gid), worn: L.amulet });
  /* the respawn wipe keeps nothing the death took (it re-reads the carve-outs) */
  L.inventory = {};
  L.respawnAt = Date.now() - 1;
  room._tickPlayerRespawn();
  check('...and the respawn five seconds later gives nothing back (no carve-out reappears)', !L.dying && Object.keys(L.inventory || {}).length === 0, L.inventory);

  /* a status's tick kills after the blow's 5 s: still the setter's kill */
  place(K, at(NMLR(1)), 7); place(L, at(NMLR(1) + 60), 7);
  fresh(K); fresh(L);
  L.inventory = { ore_iron: 3, woodcutting_axe: 1 };
  L.coins = 40;
  L.hp = 1000;
  room._pvpHitLanes && room._pvpHitLanes.clear();
  await attack(wsK, K, idL, L);
  L._nmlLastHitAt = Date.now() - NML.KILL_BLOW_MS - 1500;   /* the blow was 6.5 s ago */
  L.hp = 2;
  const kCoins0 = K.coins || 0;
  const r = room._strikePlayer(idK, K, idL, L, 50, { ability: 'poison', elemental: true, noBlock: true, dot: true, elem: 'venom' });
  await settle();
  const pileL = (room.loot[WHEEL_ZONE] || []).filter((p) => p.isDeathDrop && p.lootId.startsWith('dd-' + idL)).pop();
  check('a poison\'s tick that kills after the blow\'s 5 s is still the poisoner\'s kill (v2.3.3316): the whole bag in their pile, the gold theirs',
    !!r && L.dying === true && !!pileL && pileL.recipients[0] === idK && pileL.deathItems.some((i) => i.key === 'woodcutting_axe')
    && (K.coins || 0) === kCoins0 + 40 && L.coins === 0, { r: !!r, dying: L.dying, pile: pileL && { r: pileL.recipients, items: pileL.deathItems }, k: K.coins });
  check('...and the tick started no skull of its own (the poisoner\'s red is the blow\'s)', room._nmlSkullOf(K) === 'r' && room._nmlSkullOf(L) === 'w');

  /* a red skull a monster kills: its shields -- the arm known, the spares go
     and the one worn stays; the arm unknown, every shield stays (which is
     worn cannot be told) */
  for (const known of [true, false]) {
    place(L, at(NMLR(1) + 200), 7);
    fresh(L);
    room._nmlState(L).red = 60000;
    L.inventory = {};
    L.coins = 0;
    const worn = room._gearProvRecord(idL, 'shield', { name: 'Pine Shield', gearBase: 'wood', tierMult: 1, tier: 'common' }, 'test');
    const spare = room._gearProvRecord(idL, 'shield', { name: 'Copper Shield', gearBase: 'copper', tierMult: 2, tier: 'common' }, 'test');
    L.shield = worn;
    L.shieldStash = [spare, { ...worn }];
    L._shieldKnown = known ? true : undefined;
    L._nmlLastHitBy = null;
    room._handlePlayerDeath(L, idL, 'monster:wm-frost-1');
    const left = (L.shieldStash || []).map((p) => p.gid);
    check(known
      ? 'a red skull a monster kills, the arm known: the spare shield goes, the one on the arm and its stale copy stay'
      : '...the arm unknown: every shield stays (a worn one cannot be told from a spare)',
      !!L.shield && L.shield.gid === worn.gid && (known ? JSON.stringify(left) === JSON.stringify([worn.gid]) : left.length === 2),
      { shield: L.shield && L.shield.gid, left });
    L.dying = false; L.dead = false; L.hp = L.maxHp;
  }
}

// ── 12. v2.3.3530: a group attacks you -- you may hit back every one ────────
/* The owner: "If you get attacked simultaneously by a group of people you
   don't need additional windows to approve.  If the 2nd, 3rd, etc people
   already approved "attack" at you you can immediately hit back at each of
   them after that."  The white skull remembered one giver, the LAST: with two
   attackers, hitting back the first gave you a red skull. */
{
  const idV = 'bp_nml_gv', idG = 'bp_nml_gg', idH = 'bp_nml_gh', idI = 'bp_nml_gi';
  const wsV = fakeWs('gv'), wsG = fakeWs('gg'), wsH = fakeWs('gh'), wsI = fakeWs('gi');
  await join(wsV, idV, 'NmlV'); await join(wsG, idG, 'NmlG'); await join(wsH, idH, 'NmlH'); await join(wsI, idI, 'NmlI');
  const V = room.playerState[idV], G = room.playerState[idG], H = room.playerState[idH], I = room.playerState[idI];
  const fresh = (P) => { P._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 }; P.dying = false; P.dead = false; };
  const hit = async (wsFrom, from, toId, to) => { room._pvpHitLanes && room._pvpHitLanes.clear(); await attack(wsFrom, from, toId, to); };
  const setup = () => {
    place(V, at(NMLR(1)), 7); place(G, at(NMLR(1) + 60), 7); place(H, at(NMLR(1), 60), 7); place(I, at(NMLR(1), -60), 7);
    fresh(V); fresh(G); fresh(H); fresh(I);
  };
  setup();
  wsV.sent.length = 0;
  await hit(wsG, G, idV, V);   /* G attacks V */
  await hit(wsH, H, idV, V);   /* then H */
  check('a group attacks: both attackers red, the one attacked white, the LAST giver its whiteBy',
    room._nmlSkullOf(G) === 'r' && room._nmlSkullOf(H) === 'r' && room._nmlSkullOf(V) === 'w' && V._nml.whiteBy === idH, { g: G._nml, h: H._nml, v: V._nml });
  check('...and BOTH givers\' rights kept, a skull\'s time each (from)', V._nml.from instanceof Map && V._nml.from.get(idG) === NML.SKULL_MS && V._nml.from.get(idH) === NML.SKULL_MS,
    V._nml.from && [...V._nml.from]);
  const toV = msgs(wsV, 'nml_skull').pop();
  const bysIds = toV && Array.isArray(toV.payload.bys) ? toV.payload.bys.map((e) => e[0]).sort() : [];
  check('...the one attacked is told them all (`bys`: [id, ms left]), `by` still the last',
    !!toV && toV.payload.by === idH && JSON.stringify(bysIds) === JSON.stringify([idG, idH].sort())
    && toV.payload.bys.every((e) => e[1] > 0 && e[1] <= NML.SKULL_MS), toV && toV.payload);
  await hit(wsV, V, idG, G);   /* V hits back the FIRST attacker */
  check('hitting back the FIRST of the group is no red skull (the bug: whiteBy was the second)', room._nmlSkullOf(V) === 'w' && !(V._nml.red > 0), V._nml);
  await hit(wsV, V, idH, H);
  check('...nor the second', room._nmlSkullOf(V) === 'w' && !(V._nml.red > 0), V._nml);
  await hit(wsV, V, idI, I);
  check('...but a bystander who never hit you: that is an attack (red)', room._nmlSkullOf(V) === 'r', V._nml);

  /* the mutation: the switch off is the old rule -- the last giver alone */
  setup();
  await hit(wsG, G, idV, V); await hit(wsH, H, idV, V);
  const keep = room._liveFlags;
  room._liveFlags = { ...(keep || {}), nmlgroup: false };
  wsV.sent.length = 0;
  await hit(wsH, H, idV, V);   /* one more blow, to see what V is told with the switch off */
  const offMsg = msgs(wsV, 'nml_skull').pop();
  await hit(wsV, V, idG, G);
  check('mutation: nmlgroup: false is the old rule -- hitting back the first of two is a red skull (the checks above catch it)',
    room._nmlSkullOf(V) === 'r', V._nml);
  check('...and no `bys` is sent with it off, `by` alone', !!offMsg && offMsg.payload.by === idH && !('bys' in offMsg.payload), offMsg && offMsg.payload);
  room._liveFlags = keep;

  /* each giver's right counts down, and goes, on its own */
  setup();
  await hit(wsG, G, idV, V); await hit(wsH, H, idV, V);
  V._nml.from.set(idG, 500);   /* G's blow long ago, H's just now */
  room._nmlTickAt = Date.now() - 1000;
  room._tickNml(Date.now());
  check('the tick counts each right down: G\'s gone, H\'s still runs', !V._nml.from.has(idG) && V._nml.from.get(idH) > NML.SKULL_MS - 2000, [...V._nml.from]);
  await hit(wsV, V, idG, G);
  check('...so hitting G now is an attack (red), as G\'s right ran out', room._nmlSkullOf(V) === 'r', V._nml);
  setup();
  await hit(wsG, G, idV, V);
  V._nml.white = 500; V._nml.from.set(idG, 500);
  room._nmlTickAt = Date.now() - 1000;
  room._tickNml(Date.now());
  check('...and the white skull running out takes every right with it', room._nmlSkullOf(V) === null && V._nml.from.size === 0 && V._nml.whiteBy === null, V._nml);

  /* stored, and back on join */
  setup();
  await hit(wsG, G, idV, V); await hit(wsH, H, idV, V);
  room._nmlSave(idV, V);
  const rec = state._store.get(NML_KEY(idV));
  check('every right is stored (nml_state: `from`, [id, ms])', !!rec && Array.isArray(rec.from) && rec.from.length === 2
    && rec.from.every((e) => (e[0] === idG || e[0] === idH) && e[1] > 0), rec);
  const wsV2 = fakeWs('gv2');
  await join(wsV2, idV, 'NmlV');
  const V2 = room.playerState[idV];
  const back = msgs(wsV2, 'nml_skull').pop();
  check('...and back on join: both rights, and `bys` sent', V2._nml.from instanceof Map && V2._nml.from.has(idG) && V2._nml.from.has(idH)
    && !!back && Array.isArray(back.payload.bys) && back.payload.bys.length === 2, { from: V2._nml.from && [...V2._nml.from], back: back && back.payload });
  /* a record from before v2.3.3530: whiteBy alone, still a right */
  state._store.set(NML_KEY(idV), { red: 0, white: 60000, whiteBy: idG, forfeit: [] });
  const wsV3 = fakeWs('gv3');
  await join(wsV3, idV, 'NmlV');
  const V3 = room.playerState[idV];
  place(V3, at(NMLR(1)), 7); V3.dying = false;
  await hit(wsV3, V3, idG, G);
  check('a record from before it (whiteBy, no from) loads, and its giver is still yours to hit back', room._nmlSkullOf(V3) === 'w' && !(V3._nml.red > 0), V3._nml);

  /* FROM_CAP: a mob is kept to the cap, the one with the least time left giving way */
  setup();
  V._nml.white = NML.SKULL_MS;
  for (let k = 0; k < NML.FROM_CAP; k++) { room._nmlFromSet(V._nml, 'bp_mob_' + k); V._nml.from.set('bp_mob_' + k, NML.SKULL_MS - (k + 1) * 1000); }
  room._nmlFromSet(V._nml, 'bp_mob_new');
  check('a mob past FROM_CAP keeps the cap: the right with the least time left gives way', V._nml.from.size === NML.FROM_CAP
    && V._nml.from.has('bp_mob_new') && !V._nml.from.has('bp_mob_' + (NML.FROM_CAP - 1)) && V._nml.from.has('bp_mob_0'), [...V._nml.from.keys()]);

  /* the caps */
  const wsJ = fakeWs('gj');
  await join(wsJ, 'bp_nml_gj', 'NmlJ');
  const sync = wsJ.sent.find((m) => m.type === 'state_sync');
  check('caps.nmlgroup is advertised', !!sync && sync.caps && sync.caps.nmlgroup === true, sync && sync.caps && sync.caps.nmlgroup);
  room._liveFlags = { ...(keep || {}), nmlgroup: false };
  const wsK2 = fakeWs('gk');
  await join(wsK2, 'bp_nml_gk', 'NmlK2');
  const sync2 = wsK2.sent.find((m) => m.type === 'state_sync');
  check('...and nmlgroup: false un-advertises it', !!sync2 && sync2.caps && sync2.caps.nmlgroup === false, sync2 && sync2.caps && sync2.caps.nmlgroup);
  room._liveFlags = keep;
}

// ── 13. v2.3.3530: the window's Attack is the attack ─────────────────────────
/* The owner: "Whenever someone attacks you in no man's land you always get a
   white skull above your head.  You only keep what you have equipped.
   Doesn't matter if you attack back or not."  The skulls waited for the first
   blow the worker resolved: an attacker whose opening shots all missed (or
   were rolled through) left the one attacked with no white skull, and their
   hitting back was, to the worker, the first attack -- a red skull for the
   one attacked. */
{
  const idV = 'bp_nml_cv', idG = 'bp_nml_cg', idI = 'bp_nml_ci';
  const wsV = fakeWs('cv'), wsG = fakeWs('cg'), wsI = fakeWs('ci');
  await join(wsV, idV, 'NmlCV'); await join(wsG, idG, 'NmlCG'); await join(wsI, idI, 'NmlCI');
  const V = room.playerState[idV], G = room.playerState[idG], I = room.playerState[idI];
  const fresh = (P) => { P._nml = { red: 0, white: 0, whiteBy: null, forfeit: [], savedAt: 0 }; P.dying = false; P.dead = false; P._nmlChoiceAt = 0; P._nmlLastHitBy = null; P._nmlLastHitAt = 0; };
  const setup = () => {
    place(V, at(NMLR(1)), 7); place(G, at(NMLR(1) + 60), 7); place(I, at(NMLR(1), 60), 7);
    fresh(V); fresh(G); fresh(I);
    room._pvpEngage = new Map(); room._pvpNmlStruck = new Map();
  };
  const choose = async (wsFrom, fromPs, toId) => { fromPs._nmlChoiceAt = 0; await room.webSocketMessage(wsFrom, JSON.stringify({ type: 'nml_attack', target: toId })); };
  const hit = async (wsFrom, from, toId, to) => { room._pvpHitLanes && room._pvpHitLanes.clear(); await attack(wsFrom, from, toId, to); };

  setup();
  wsV.sent.length = 0; wsG.sent.length = 0; room.eventBuffer.length = 0;
  await choose(wsG, G, idV);
  check('the window\'s Attack starts both skulls at once, before any blow: the attacker red, the one attacked white',
    room._nmlSkullOf(G) === 'r' && G._nml.red === NML.SKULL_MS && room._nmlSkullOf(V) === 'w' && V._nml.whiteBy === idG
    && V._nml.from instanceof Map && V._nml.from.get(idG) === NML.SKULL_MS && !room.eventBuffer.some((e) => e.type === 'pvp_hit'), { g: G._nml, v: V._nml });
  const toV = msgs(wsV, 'nml_skull').pop(), toG = msgs(wsG, 'nml_skull').pop();
  check('...each told at once (nml_skull): the one attacked by whom (`by`, `bys`)', !!toV && toV.payload.by === idG && Array.isArray(toV.payload.bys)
    && toV.payload.bys.some((e) => e[0] === idG) && !!toG && toG.payload.red === NML.SKULL_MS, { toV: toV && toV.payload, toG: toG && toG.payload });
  check('...a choice is no blow: no kill is stamped with it (a death in the next seconds is no No man\'s land kill)',
    !V._nmlLastHitBy && room._nmlOnDeath(V, idV, 'pvp:' + idG) === null, { last: V._nmlLastHitBy });
  check('...but it is the chooser\'s engagement: their area moves reach the one chosen, not the other way round',
    room._pvpEngaged(idG, idV, Date.now()) === true && room._pvpEngaged(idV, idG, Date.now()) === false);

  /* THE INVERSION: the attacker's opening shots missed, and the one attacked
     hits first */
  await hit(wsV, V, idG, G);
  check('the one attacked hits first (the attacker\'s shots all missed): still white -- hitting back, no red skull', room._nmlSkullOf(V) === 'w' && !(V._nml.red > 0), V._nml);
  await hit(wsG, G, idV, V);
  check('...and the one who started it stays red when their blows land at last', room._nmlSkullOf(G) === 'r' && G._nml.red === NML.SKULL_MS, G._nml);
  /* the mutation: with the choice ignored, it is the old inversion */
  setup();
  const keep = room._liveFlags;
  room._liveFlags = { ...(keep || {}), nmlchoice: false };
  await choose(wsG, G, idV);
  const noSkull = room._nmlSkullOf(G) === null && room._nmlSkullOf(V) === null;
  await hit(wsV, V, idG, G);
  const vRed = room._nmlSkullOf(V) === 'r';
  await hit(wsG, G, idV, V);
  const gWhite = room._nmlSkullOf(G) === 'w';
  room._liveFlags = keep;
  check('mutation: nmlchoice: false ignores the choice -- the one attacked hitting first takes the RED skull, the one who started it ends WHITE (the checks above catch it)',
    noSkull && vRed && gWhite, { noSkull, vRed, gWhite, v: V._nml, g: G._nml });

  /* refused: never a skull on anyone for these */
  const refusedCase = async (label, prep, toId, fromWs, fromPs) => {
    setup();
    if (prep) prep();
    await choose(fromWs || wsG, fromPs || G, toId);
    const any = [V, G, I].some((P) => room._nmlSkullOf(P) !== null);
    check('a choice is refused ' + label + ' -- no skull on anyone', !any, { v: V._nml, g: G._nml, i: I._nml });
  };
  await refusedCase('at yourself', null, idG);
  await refusedCase('at nobody (an unknown id)', null, 'bp_nobody');
  await refusedCase('at "__proto__"', null, '__proto__');
  await refusedCase('when the one chosen is out of No man\'s land (the safe ground)', () => place(V, at(SAFE_IN), 7), idV);
  await refusedCase('when the levels are too far apart for its rule', () => { V.level = 9; }, idV);
  await refusedCase('past CHOOSE_R', () => place(V, at(NMLR(1) + NML.CHOOSE_R + 200), 7), idV);
  await refusedCase('for a duel or arena pair (their consent rules)', () => {
    if (!room._pvpConsent) room._pvpConsent = new Map();
    room._pvpConsent.set(room._pvpPairKey(idG, idV), Date.now() + 60000);
  }, idV);
  room._pvpConsent && room._pvpConsent.delete(room._pvpPairKey(idG, idV));
  await refusedCase('at a player who is dying', () => { V.dying = true; }, idV);
  V.dying = false;
  /* the rate: one choice a CHOOSE_GAP_MS */
  setup();
  await choose(wsG, G, idV);
  await room.webSocketMessage(wsG, JSON.stringify({ type: 'nml_attack', target: idI }));   /* at once, no reset */
  check('one choice a CHOOSE_GAP_MS: a second at once is ignored (the bystander stays unmarked)', room._nmlSkullOf(I) === null && room._nmlSkullOf(V) === 'w', { i: I._nml });

  /* the kill switch and the caps */
  const wsJ = fakeWs('cj');
  await join(wsJ, 'bp_nml_cj', 'NmlCJ');
  const sync = wsJ.sent.find((m) => m.type === 'state_sync');
  check('caps.nmlchoice is advertised', !!sync && sync.caps && sync.caps.nmlchoice === true, sync && sync.caps && sync.caps.nmlchoice);
  room._liveFlags = { ...(keep || {}), nmlchoice: false };
  const wsK = fakeWs('ck');
  await join(wsK, 'bp_nml_ck', 'NmlCK');
  const sync2 = wsK.sent.find((m) => m.type === 'state_sync');
  check('...and nmlchoice: false un-advertises it', !!sync2 && sync2.caps && sync2.caps.nmlchoice === false, sync2 && sync2.caps && sync2.caps.nmlchoice);
  room._liveFlags = keep;
  check('...and the choice is never rebroadcast to the room (its own router case)', !wsI.sent.some((m) => m.type === 'nml_attack' || (m.payload && m.payload.type === 'nml_attack')));
}

if (failures) { console.log(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log('\nnomansland: all passed');
