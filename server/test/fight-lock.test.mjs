/* ONE FIGHT-LOCK TABLE (v2.3.4510, server/src/fightlock.js).
 *
 * In No man's land a player killed by another player loses what they carry
 * to the killer.  The fight lock (v2.3.3183) stops a losing player emptying
 * the bag first, but it guarded six roads, and the state-machine sweep (V21)
 * found more open: forging, the amulet forge, the jackpot, a duel's stake,
 * arena stakes, the gambles, and a dungeon mouth an honest tap walks through
 * with the bag.  This suite, on the real GameRoom over its socket door:
 *
 *   1. THE TABLE IS CLOSED: every case of index.js _onMessage and every type
 *      relay.js relays has a row in FIGHT_LOCK or a reason in FIGHT_OPEN, so a
 *      new handler that spends gold or goods fails here until it is placed;
 *      every row a handler asks names a function that exists and asks the
 *      lock; every row the router refuses has a case below.
 *   2. IN A FIGHT with a player in No man's land: every row's message, sent
 *      with a payload that works out of a fight, moves nothing for either
 *      player -- not the bag, the gold, the stashes, what is worn, nor a byte
 *      of storage -- and is answered with its handler's own refusal;
 *   3. OUT OF THE FIGHT (ten seconds after the last hit) the same messages
 *      work;
 *   4. the place: on the safe ground the new rows are open (the old lock
 *      still holds there, as it did);
 *   5. the duel's accept, the leader's party pull through a mouth, a forged
 *      shield report that would clear the arm, the arena's HTTP join;
 *   6. the switches: `fightlocktable`, `fightlockdoor`, `fightlockequip`
 *      written false give back today's behaviour row by row, and
 *      `fightlock: false` still opens everything.
 *   9. (v2.3.4607) armour: a spare put on (stats_update) and armour taken off
 *      (unequip_request) are refused in the fight, the worn pieces sent back;
 *      out of a fight and with `fightlockarmor: false` they work as before.
 *   8. (v2.3.4606) the character restart, on both roads (Settings over the
 *      socket, the picker over HTTP): refused in the fight with its own
 *      `character_reset_refused` / `reason: 'fight'`, the character whole;
 *      `fightlockreset: false` lets it through; out of a fight it works. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { NML } from '../src/nomansland.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_LONG } from '../src/wheelspawns.js';
import { RELAY } from '../src/relay.js';
import { SHARD_CRACK } from '../src/shardcrack.js';
import { EVENT_CAPES } from '../src/eventcapes.js';
import { gemGive } from '../src/gems.js';
import { shieldSig } from '../src/shieldwear.js';
import { petHousePrice } from '../src/petbook.js';

/* the table, read lazily: on a worker without it, §1 fails and the rest
   still runs, so the open roads show as what they are */
let FL = null;
try { FL = await import('../src/fightlock.js'); } catch (e) { FL = null; }

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const msgs = (ws, type) => ws.sent.filter((m) => m.type === type);
const settle = () => new Promise((r) => setTimeout(r, 15));
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
/* the tier's rule (one step every five levels), as the nomansland suite's §10 */
state._store.set('liveflags', { nmlsteps: false });
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, name) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name, phrase: 'p-' + id, ws: [1, 5], protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  room.sessions.get(ws).name = name;
}
const send = async (ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await settle(); };

/* a spot in the Wheel at radius r, due east of the centre; the middle of No
   man's land 1; a spot on the safe ground */
const at = (r, dy = 0) => ({ x: WHEEL_CENTRE[0] + r, y: WHEEL_CENTRE[1] + dy });
const TIER = NML.TIER * WHEEL_LONG;
const NML1 = NML.HUB + (NML.FIRST_TIER - 0.5) * TIER;
const SAFE_IN = NML.SAFE_R - 60;
const place = (ps, p, level) => {
  ps.z = WHEEL_ZONE; ps.x = p.x; ps.y = p.y; ps.dead = false; ps.dying = false; ps.disconnected = false;
  ps.hp = ps.maxHp = 1000; ps._zoneEntryGraceUntil = 0;
  if (typeof level === 'number') ps.level = level;
};

const ids = { v: 'bp_fl_victim', k: 'bp_fl_killer', f: 'bp_fl_friend' };
const ws = { v: fakeWs('v'), k: fakeWs('k'), f: fakeWs('f') };
for (const k of Object.keys(ids)) await join(ws[k], ids[k], 'Fl' + k.toUpperCase());
const V = room.playerState[ids.v], K = room.playerState[ids.k], F = room.playerState[ids.f];

/* the killer hits the victim under the rule: the room's player-fight clock
   for both (cooking.js _notePvpExchange), the same blow a real fight lands */
const hit = async () => {
  room._pvpHitLanes && room._pvpHitLanes.clear();
  K._lastAttackAt = 0; K.lastAttackAt = 0;
  await room.webSocketMessage(ws.k, JSON.stringify({ type: 'player_attack', payload: {
    kind: 'melee', range: 200, arc: 2.5, angle: Math.atan2(V.y - K.y, V.x - K.x), dmgBase: 1, critChance: 0, target: ids.v, special: false,
  } }));
  V.hp = V.maxHp;
};
const fightOn = async () => {
  place(V, at(NML1), 7); place(K, at(NML1 + 60), 7);
  await hit();
};
const fightOff = () => {
  for (const id of [ids.v, ids.k]) {
    const c = room._pvpHealClocks && room._pvpHealClocks.get(id);
    if (c) c.pvpAt -= 11000;
  }
};
const lockedNow = () => !!room._bagLockedByFight && room._bagLockedByFight(ids.v);

/* everything a loss could take, or a stake hold, for one player */
const goods = (p) => JSON.stringify({
  coins: p.coins || 0, inv: p.inventory || {}, goldBars: p.goldBars || 0, goldNuggets: p.goldNuggets || 0,
  weapon: p.weapon || null, rangedWeapon: p.rangedWeapon || null, staffWeapon: p.staffWeapon || null, weaponStash: p.weaponStash || [],
  armor: p.armor || null, legsArmor: p.legsArmor || null, shield: p.shield || null, shieldStash: p.shieldStash || [],
  amulet: p.amulet || null, armorStash: p.armorStash || [], legsStash: p.legsStash || [], amuletStash: p.amuletStash || [],
  shieldKnown: p._shieldKnown === true,
});
const storeSnap = () => JSON.stringify([...state._store.entries()].filter(([k]) => !k.startsWith('rpg:') && !k.startsWith('nml')).sort((a, b) => (a[0] < b[0] ? -1 : 1)));

/* ── the base each case starts from ─────────────────────────────────────── */
const sword = (name, base) => ({ type: 'greatsword', tier: 'common', tierMult: 1.12, element1: null, element2: null, isVolatile: false,
  name: name || 'copper greatsword', gearBase: base || 'copper', reforgeBonus: null, hardenBonus: null, quality: 'normal', hardness: 0, temper: 0 });
const SHIELD_A = { name: 'Pine Shield', gearBase: 'pine', tierMult: 1, tier: 'common', gid: 'g_shield_a' };
const SHIELD_B = { name: 'Copper Shield', gearBase: 'copper', tierMult: 1.12, tier: 'common', gid: 'g_shield_b' };
const LAND = Object.keys(SHARD_CRACK.LANDS)[0];
const TICKET = EVENT_CAPES[Object.keys(EVENT_CAPES)[0]].ticket;
const base = (p) => {
  p.coins = 50000;
  p.inventory = { bar_copper: 30, crop_carrot: 10, ['shard_' + LAND]: 5, [TICKET]: 1 };
  gemGive(p, 'flame', false, 3);   /* elemental gems in the bag */
  gemGive(p, 'flame', true, 6);    /* raw gems */
  p.goldBars = 5; p.goldNuggets = 0;
  p.weapon = sword(); p.rangedWeapon = null; p.staffWeapon = null; p.activeSlot = 'melee';
  p.weaponStash = [sword('iron greatsword', 'iron')];
  p.amulet = { tier: 'simple', gem: null, name: 'Simple Gold Amulet' };
  p.shield = { ...SHIELD_A }; p.shieldStash = [{ ...SHIELD_B }]; p._shieldKnown = true;
  if (!p.lifeSkills) p.lifeSkills = {};
  p.lifeSkills.blacksmithing = { level: 30, xp: 0 };
  p.lifeSkills.gemCutting = { level: 30, xp: 0 };
  p.lifeSkills.enchanting = { level: 30, xp: 0 };
  p._lastGambleAt = 0; p._lastAceFlipAt = 0;
};

/* an arena tournament with one open match, the victim its sponsor */
const arenaOn = () => {
  room._arena = { id: 't_fl', status: 'running', queue: [], round: 1, players: [], champion: null,
    matches: [{ id: 'm_fl', round: 1, a: 'bp_fl_ga', b: 'bp_fl_gb', aName: 'GA', bName: 'GB', winner: null }] };
};
/* the friend's listing on the auction house, made before any fight */
let listingId = null;
const listingOn = async () => {
  if (listingId) return;
  await room._stEnsureIndex();
  F.inventory = { crop_carrot: 10 };
  const r = await room._stCreateListing({ playerId: ids.f, kind: 'item', invKey: 'crop_carrot', qty: 5, price: 1000 });
  listingId = r && r.ok ? (r.listing ? r.listing.id : r.id) : null;
  if (!listingId) for (const [id, rec] of (room._stIndex || new Map())) if (rec && rec.sellerId === ids.f) listingId = id;
};
/* a trade window between the victim and the friend */
const windowOn = async () => {
  if (room._t2SessionFor && room._t2SessionFor(ids.v)) return;
  place(F, at(NML1 + 30), 7);
  await send(ws.v, 'trade2_open', { target: ids.f });
  await send(ws.f, 'trade2_open', { target: ids.v });
};
const door = () => room._wheelDoor('hollows');

/* ── the cases: one for every row the router refuses ────────────────────
   payload, any setup, what the handler's own refusal looks like on the
   victim's socket, and what working out of a fight looks like */
const resent = (fields) => (w) => w.sent.some((m) => m.type === 'player_state' && fields.every((f) => own(m.payload, f)));
const CASES = {
  forge_armor: { payload: { recipe: 'copper_torso' }, refused: resent(['inventory']),
    worked: () => V.inventory.bar_copper === 25 && msgs(ws.v, 'forge_armor_result').length === 1 },
  forge_weapon: { payload: { weaponType: 'greatsword', tierKey: 'copper', isWoodwork: false }, refused: resent(['inventory', 'coins', 'weapon', 'weaponStash']),
    worked: () => V.inventory.bar_copper === 25 && V.weaponStash.length === 2 },
  harden_weapon: { payload: { slot: 'weapon' },
    refused: (w) => msgs(w, 'harden_result').some((m) => m.payload.success === false && m.payload.error === 'not-now'),
    worked: () => V.coins < 50000 && msgs(ws.v, 'harden_result').some((m) => typeof m.payload.hardness === 'number') },
  amulet_forge_request: { payload: { op: 'craft', tierKey: 'simple' }, refused: resent(['coins', 'goldBars', 'amulet']),
    worked: () => V.goldBars === 4 && V.coins === 50000 - 50 },
  'amulet_forge_request gem': { type: 'amulet_forge_request', payload: { op: 'gem', gem: 'flame' }, refused: resent(['amulet', 'inventory']),
    worked: () => V.amulet && V.amulet.gem === 'flame' },
  weapon_gem: { payload: { slot: 'weapon', gem: 'flame' },
    refused: (w) => msgs(w, 'weapon_gem_result').some((m) => m.payload.ok === false && m.payload.reason === 'locked' && m.payload.slot === 'weapon' && m.payload.gem === 'flame'),
    worked: () => msgs(ws.v, 'weapon_gem_result').some((m) => m.payload.ok === true) },
  shield_gem: { payload: { gid: SHIELD_A.gid, gem: 'flame' },
    refused: (w) => msgs(w, 'shield_gem_result').some((m) => m.payload.ok === false && m.payload.reason === 'locked'),
    worked: () => msgs(ws.v, 'shield_gem_result').some((m) => m.payload.ok === true) && V.shield.gem === 'flame' },
  gem_cut_request: { payload: { gem: 'flame' }, flags: { shardcrack: false }, refused: resent(['inventory', 'lifeSkills']),
    worked: () => msgs(ws.v, 'gem_cut_result').length === 1 },
  shard_crack: { payload: { land: LAND, count: 1 },
    refused: (w) => msgs(w, 'shard_crack_result').some((m) => m.payload.ok === false && m.payload.reason === 'fight' && m.payload.land === LAND),
    worked: () => V.inventory['shard_' + LAND] === 4 },
  gem_combine: { payload: { element: 'flame' },
    refused: (w) => msgs(w, 'gem_combine_result').some((m) => m.payload.ok === false && m.payload.reason === 'fight' && m.payload.element === 'flame'),
    worked: () => msgs(ws.v, 'gem_combine_result').some((m) => m.payload.ok === true) },
  cape_redeem: { payload: { invKey: TICKET }, refused: resent(['inventory']),
    worked: () => !own(V.inventory, TICKET) },
  pet_house_buy: { payload: () => ({ confirm: true, cap: room._petbookOf(ids.v).rec.cap }),
    refused: (w) => msgs(w, 'pets_state').some((m) => m.payload.op === 'house' && m.payload.error === 'not-now'),
    worked: (cap0) => room._petbookOf(ids.v).rec.cap > cap0 && V.coins === 50000 - petHousePrice(cap0),
    before: () => room._petbookOf(ids.v).rec.cap },
  jackpot_deposit: { payload: { amount: 100 }, refused: resent(['coins']),
    worked: () => V.coins === 50000 - 100 },
  gamble_request: { payload: { wager: 100 }, refused: resent(['coins']),
    worked: () => V.coins !== 50000 },
  ace_flip_request: { payload: { stake: 100 }, refused: resent(['coins']),
    worked: () => V.coins !== 50000 },
  ace_item_flip_request: { payload: { items: { crop_carrot: 5 } }, refused: resent(['inventory']),
    worked: () => V.inventory.crop_carrot !== 10 },
  arena_sponsor: { payload: { targetId: 'bp_fl_ga', amount: 100 }, setup: arenaOn,
    refused: (w) => msgs(w, 'arena_stake_error').some((m) => m.payload.code === 'fight' && m.payload.targetId === 'bp_fl_ga'),
    worked: () => msgs(ws.v, 'arena_stake_placed').length === 1 && V.coins === 50000 - 100 },
  store_offer: { payload: () => ({ listingId, gold: 300 }), setup: listingOn,
    refused: (w) => msgs(w, 'store_offer_error').some((m) => m.payload.listingId === listingId && /fight/i.test(m.payload.error)),
    worked: () => msgs(ws.v, 'store_offer_state').length === 1 && V.coins === 50000 - 300 },
  trade2_stage_weapon: { payload: { stashIdx: 0 }, setup: windowOn, refused: resent(['weaponStash']),
    worked: () => V.weaponStash.length === 0 },
  dungeon_start: { payload: { entrance: 'hollows' }, setup: () => { const d = door(); V.x = d.at[0]; V.y = d.at[1]; },
    refused: (w) => msgs(w, 'dungeon_error').some((m) => m.payload.code === 'not-now'),
    worked: () => msgs(ws.v, 'dungeon_started').length === 1 },
  equip_request: { payload: { stashIdx: 0, slot: 'weapon' }, refused: resent(['weapon', 'weaponStash']),
    worked: () => V.weapon && V.weapon.gearBase === 'iron' },
};
const typeOf = (name) => CASES[name].type || name;
const payloadOf = (name) => (typeof CASES[name].payload === 'function' ? CASES[name].payload() : CASES[name].payload);

/* the dungeons a case started, ended (the mouth case leaves one per run) */
const endRuns = () => {
  for (const inst of [...(room._dungeons || new Map()).values()]) room._dungeonCleanup && room._dungeonCleanup(inst);
};

// ── 1. the table is closed ──────────────────────────────────────────────────
{
  check('the table exists (server/src/fightlock.js)', !!FL && !!FL.FIGHT_LOCK && !!FL.FIGHT_OPEN);
  const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  const a = src.indexOf('  async _onMessage(ws, session, msg) {');
  const b = src.indexOf('\n  }\n', src.indexOf('    switch (msg.type) {', a));
  const body = a > 0 && b > a ? src.slice(a, b) : '';
  const cases = [...body.matchAll(/^\s*case '([a-z0-9_]+)':/gm)].map((m) => m[1]);
  check('setup: the router\'s cases are read (over a hundred)', cases.length > 100, cases.length);
  const all = [...new Set([...cases, ...RELAY.TYPES])];
  const L = (FL && FL.FIGHT_LOCK) || {}, O = (FL && FL.FIGHT_OPEN) || {};
  const missing = all.filter((t) => !own(L, t) && !own(O, t));
  check('every router case and relayed type has a row (a gate) or a reason (open): a new handler that spends gold or goods must be placed', missing.length === 0, missing);
  const both = Object.keys(O).filter((t) => own(L, t));
  check('...and is in one list, never both', both.length === 0, both);
  const stale = [...Object.keys(O), ...Object.keys(L).filter((k) => !k.startsWith('http:'))].filter((t) => !all.includes(t));
  check('...and names only types the router takes', stale.length === 0, stale);
  check('the router asks the table before its switch', /FIGHT_GATED\.has\(msg\.type\) && this\._fightLockGate\(session, msg\)\) return;\s*\n\s*switch \(msg\.type\)/.test(body));
  /* a row a handler asks: the function exists in its file and asks the lock */
  const badAt = [];
  for (const [t, row] of Object.entries(L)) {
    if (!row.at) continue;
    const [file, fn] = row.at.split(' ');
    let f = '';
    try { f = readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'); } catch (e) { badAt.push(t + ': no ' + file); continue; }
    const i = f.search(new RegExp('\\n  (async )?' + fn + '\\('));
    if (i < 0) { badAt.push(t + ': no ' + fn); continue; }
    const j = f.indexOf('\n  },', i);
    const fnBody = f.slice(i, j > i ? j : undefined);
    const asks = row.sw === 'fightlock' ? /_bagLockedByFight|_farmOrderInFight/ : new RegExp("_fightLockHolds\\([^)]*'" + row.sw + "'");
    if (!asks.test(fnBody)) badAt.push(t + ': ' + fn + ' never asks ' + (row.sw === 'fightlock' ? '_bagLockedByFight' : row.sw));
  }
  check('every row a handler asks names a function that exists and asks the lock under the row\'s switch', badAt.length === 0, badAt);
  const gated = FL ? [...FL.FIGHT_GATED] : [];
  const covered = new Set(Object.keys(CASES).map(typeOf));
  const untested = gated.filter((t) => !covered.has(t));
  check('every row the router refuses has a case in this suite', gated.length > 0 && untested.length === 0, untested);
  const sws = new Set(Object.values(L).map((r) => r.sw));
  check('the switches: the old `fightlock` and the three new lower-case ones', [...sws].every((s) => /^[a-z0-9_]{1,32}$/.test(s))
    && ['fightlock', 'fightlocktable', 'fightlockdoor', 'fightlockequip', 'fightlockreset', 'fightlockarmor'].every((s) => sws.has(s)), [...sws]);
}

// ── 2-3. every row in a fight, and out of it ────────────────────────────────
const keepFlags = room._liveFlags;
const flagsFor = (name) => ({ ...(keepFlags || {}), nmlsteps: false, ...(CASES[name].flags || {}) });
{
  base(V); base(F); base(K);
  await fightOn();
  check('setup: a hit between players in No man\'s land -- the lock holds, and the victim stands where the loss applies',
    lockedNow() && room._nmlLevelOf(V) >= 1 && room._nmlLevelOf(K) >= 1, { locked: lockedNow(), lv: room._nmlLevelOf(V) });
  const d = door();
  check('setup: the hollows\' mouth is in No man\'s land (every mouth is, v2.3.3690)', !!d && (() => { const x = V.x, y = V.y; V.x = d.at[0]; V.y = d.at[1]; const l = room._nmlLevelOf(V); V.x = x; V.y = y; return l >= 1; })());
}
for (const name of Object.keys(CASES)) {
  const c = CASES[name];
  /* in the fight */
  room._liveFlags = flagsFor(name);
  base(V); base(F); place(F, at(NML1 + 30), 7);
  await fightOn();
  if (c.setup) await c.setup();
  await settle();
  const before = { v: goods(V), f: goods(F), k: goods(K), store: storeSnap() };
  ws.v.sent.length = 0; ws.f.sent.length = 0;
  await send(ws.v, typeOf(name), payloadOf(name));
  await settle();
  const after = { v: goods(V), f: goods(F), k: goods(K), store: storeSnap() };
  check('in a fight: ' + name + ' moves nothing, for anyone, nowhere (memory and storage)',
    before.v === after.v && before.f === after.f && before.k === after.k && before.store === after.store,
    before.v !== after.v ? { v: [before.v, after.v] } : before.store !== after.store ? 'storage changed' : 'friend or killer changed');
  check('...and is answered with its handler\'s own refusal', c.refused(ws.v), ws.v.sent.map((m) => m.type + ':' + JSON.stringify(m.payload).slice(0, 120)));
  endRuns();
  /* out of the fight: the same message works */
  base(V); base(F); place(F, at(NML1 + 30), 7);
  fightOff();
  if (c.setup) await c.setup();
  const b0 = c.before ? c.before() : null;
  ws.v.sent.length = 0;
  check('setup (' + name + '): ten seconds after the last hit the lock is let go', !lockedNow());
  await send(ws.v, typeOf(name), payloadOf(name));
  await settle();
  check('out of the fight: ' + name + ' works as before', !!c.worked(b0), ws.v.sent.map((m) => m.type + ':' + JSON.stringify(m.payload).slice(0, 160)));
  endRuns();
  if (room._t2SessionFor && room._t2SessionFor(ids.v)) { const s2 = room._t2SessionFor(ids.v); room._t2Cancel && room._t2Cancel(s2, 'test'); }
  if (name === 'arena_sponsor') room._arena = null;
  room._liveFlags = keepFlags;
}

// ── 4. the place: only where the loss applies ──────────────────────────────
{
  room._liveFlags = { ...(keepFlags || {}), nmlsteps: false };
  base(V);
  await fightOn();
  place(V, at(SAFE_IN), 7);
  check('setup: on the safe ground, the old lock still holds (a hit 0 s ago)', lockedNow() && room._nmlLevelOf(V) === 0);
  ws.v.sent.length = 0;
  await send(ws.v, 'forge_armor', { recipe: 'copper_torso' });
  check('on the safe ground the new rows are open: the forge forges (no rule blow lands there; the Bank is there too)', V.inventory.bar_copper === 25, V.inventory);
  base(V);
  await send(ws.v, 'jackpot_deposit', { amount: 100 });
  check('...and the jackpot takes the deposit', V.coins === 50000 - 100);
  /* the Arena: its own zone, never No man's land */
  base(V);
  await fightOn();
  V.z = 'arena';
  check('...and in a zone that is not the Wheel (the Arena, a dungeon) too', room._fightLockHolds && room._fightLockHolds(ids.v, 'fightlocktable') === false);
  V.z = WHEEL_ZONE;
  room._liveFlags = keepFlags;
}

// ── 5a. the duel's accept: a stake, or a duel at all, mid-fight ─────────────
{
  room._liveFlags = { ...(keepFlags || {}), nmlsteps: false };
  const duelPair = async (wager) => {
    room.eventBuffer.length = 0;
    place(F, at(NML1 + 30), 7);
    await send(ws.f, wager ? 'duel_wager_request' : 'duel_request', { target: ids.v, wager });
    await send(ws.v, 'duel_accept', { target: ids.f, wager });
  };
  const endDuels = () => { for (const d of [...(room._duels || new Map()).values()]) room._resolveDuel && room._resolveDuel(d, d.a, d.b, 'test'); room._duels && room._duels.clear(); };
  base(V); base(F);
  await fightOn();
  const s0 = storeSnap(), v0 = V.coins, f0 = F.coins;
  await duelPair(500);
  const declines = room.eventBuffer.filter((e) => e.type === 'duel_decline');
  check('in a fight: a stake duel the victim accepts is declined to BOTH, before any gold moves (V21-new-2)',
    !(room._duelFor && room._duelFor(ids.v)) && V.coins === v0 && F.coins === f0 && storeSnap() === s0
    && declines.some((e) => e.payload.target === ids.v) && declines.some((e) => e.payload.target === ids.f), { declines, v: V.coins, f: F.coins });
  await duelPair(0);
  check('...and a duel with no stake too: a duel kill skips the No man\'s land loss, so a friend\'s duel would end the fight with the bag kept',
    !(room._duelFor && room._duelFor(ids.v)));
  fightOff();
  await duelPair(500);
  check('out of the fight the stake duel starts as before, both stakes in escrow', !!(room._duelFor && room._duelFor(ids.v)) && V.coins === v0 - 500 && F.coins === f0 - 500);
  endDuels();
  room._liveFlags = keepFlags;
}

// ── 5b. the leader's party pull through a mouth ─────────────────────────────
{
  room._liveFlags = { ...(keepFlags || {}), nmlsteps: false };
  base(V); base(F);
  /* the friend leads a party with the victim in it */
  await send(ws.f, 'party_invite', { target: ids.v });
  await send(ws.v, 'party_accept', { target: ids.f });
  const p = room._partyOf && room._partyOf(ids.f);
  check('setup: the friend leads a party with the victim in it', !!p && p.leader === ids.f && p.members.includes(ids.v), p);
  const d = door();
  await fightOn();
  place(F, { x: d.at[0], y: d.at[1] }, 7);
  place(V, { x: d.at[0] + 40, y: d.at[1] }, 7);
  ws.v.sent.length = 0; ws.f.sent.length = 0;
  await send(ws.f, 'dungeon_start', { entrance: 'hollows' });
  check('in a fight: the leader goes in, the member who is fighting stays at the mouth, as their own tap would',
    msgs(ws.f, 'dungeon_started').length === 1 && msgs(ws.v, 'dungeon_started').length === 0, { f: ws.f.sent.map((m) => m.type), v: ws.v.sent.map((m) => m.type) });
  endRuns();
  fightOff();
  ws.v.sent.length = 0; ws.f.sent.length = 0;
  await send(ws.f, 'dungeon_start', { entrance: 'hollows' });
  check('...out of the fight both go in together, as before', msgs(ws.f, 'dungeon_started').length === 1 && msgs(ws.v, 'dungeon_started').length === 1);
  endRuns();
  await send(ws.v, 'party_leave', {});
  room._liveFlags = keepFlags;
}

// ── 5c. the shield on the arm ──────────────────────────────────────────────
{
  room._liveFlags = { ...(keepFlags || {}), nmlsteps: false };
  base(V);
  await fightOn();
  const r1 = room._handleShieldWear({ id: ids.v }, { sig: 'forged|nothing|9|x' });
  check('in a fight: a report naming a shield the worker does not hold leaves the arm known (unknown takes NO spare shield in the loss)',
    r1 === 'fight' && V._shieldKnown === true && V.shield.gid === SHIELD_A.gid && V.shieldStash.length === 1, { r1, known: V._shieldKnown });
  const r2 = room._handleShieldWear({ id: ids.v }, { gid: SHIELD_A.gid });
  check('...the shield already worn is still "same"', r2 === 'same');
  const r3 = room._handleShieldWear({ id: ids.v }, { gid: SHIELD_B.gid });
  check('...a held spare still goes on: the phone owns which shield is worn and would keep showing a refused swap (reported, not gated)',
    r3 === 'worn' && V.shield.gid === SHIELD_B.gid, { r3, shield: V.shield });
  const r4 = room._handleShieldWear({ id: ids.v }, { none: true });
  check('...and taking it off goes: it puts the shield in the bag the loss takes', r4 === 'none' && V.shield === null && V.shieldStash.length === 2);
  base(V);
  fightOff();
  const r5 = room._handleShieldWear({ id: ids.v }, { sig: 'forged|nothing|9|x' });
  check('out of the fight an unknown shield clears the arm, as before', r5 === 'unknown' && V._shieldKnown === false);
  room._liveFlags = keepFlags;
}

// ── 5d. the arena's HTTP join ───────────────────────────────────────────────
{
  room._liveFlags = { ...(keepFlags || {}), nmlsteps: false };
  room._arena = null;
  base(V);
  await fightOn();
  const req = (path, body) => room.fetch(new Request('https://x' + path, { method: 'POST', body: JSON.stringify(body) }));
  const j1 = await (await req('/api/arena/join', { playerId: ids.v, playerName: 'FlV' })).json();
  check('in a fight: the arena takes no entry fee into its escrow, refused as the join refuses', j1.ok === false && j1.settled === true && /fight/i.test(j1.error || '') && V.coins === 50000, { j1, coins: V.coins });
  fightOff();
  const j2 = await (await req('/api/arena/join', { playerId: ids.v, playerName: 'FlV' })).json();
  check('out of the fight it does, as before', j2.ok === true && V.coins === 50000 - 100, { j2, coins: V.coins });
  await req('/api/arena/leave', { playerId: ids.v });
  room._arena = null;
  room._liveFlags = keepFlags;
}

// ── 6. the switches ─────────────────────────────────────────────────────────
{
  const mid = async (flags) => {
    room._liveFlags = { ...(keepFlags || {}), nmlsteps: false, ...flags };
    base(V); base(F);
    await fightOn();
  };
  await mid({ fightlocktable: false });
  await send(ws.v, 'forge_armor', { recipe: 'copper_torso' });
  await send(ws.v, 'jackpot_deposit', { amount: 100 });
  check('`fightlocktable: false`: the forge and the jackpot take what they took before this version', V.inventory.bar_copper === 25 && V.coins === 50000 - 100, { inv: V.inventory, coins: V.coins });
  const sell = await room._shopSell(V, 'crop_carrot', 5, ids.v);
  check('...while the six old roads stay guarded (Diego buys nothing)', !!sell && sell.ok === false && V.inventory.crop_carrot === 10, sell);
  ws.v.sent.length = 0;
  const d = door(); V.x = d.at[0]; V.y = d.at[1];
  await send(ws.v, 'dungeon_start', { entrance: 'hollows' });
  check('...and the mouth, under its own switch, still refuses', msgs(ws.v, 'dungeon_error').some((m) => m.payload.code === 'not-now'));
  endRuns();

  await mid({ fightlockdoor: false });
  ws.v.sent.length = 0;
  V.x = d.at[0]; V.y = d.at[1];
  await send(ws.v, 'dungeon_start', { entrance: 'hollows' });
  check('`fightlockdoor: false`: the mouth lets a fighting player in, as before', msgs(ws.v, 'dungeon_started').length === 1);
  endRuns();
  await fightOn();
  await send(ws.v, 'forge_armor', { recipe: 'copper_torso' });
  check('...and the table\'s other rows hold', V.inventory.bar_copper === 30);

  await mid({ fightlockequip: false });
  await send(ws.v, 'equip_request', { stashIdx: 0, slot: 'weapon' });
  check('`fightlockequip: false`: a spare weapon goes into the hand mid-fight, as before', V.weapon.gearBase === 'iron');
  check('...and an unknown shield report clears the arm', room._handleShieldWear({ id: ids.v }, { sig: 'forged|nothing|9|x' }) === 'unknown' && V._shieldKnown === false);

  await mid({ fightlock: false });
  await send(ws.v, 'forge_armor', { recipe: 'copper_torso' });
  ws.v.sent.length = 0;
  V.x = d.at[0]; V.y = d.at[1];
  await send(ws.v, 'dungeon_start', { entrance: 'hollows' });
  check('`fightlock: false` still opens everything, as it always did', V.inventory.bar_copper === 25 && msgs(ws.v, 'dungeon_started').length === 1);
  endRuns();
  room._liveFlags = keepFlags;
}

// ── 9. v2.3.4607: armour put on or taken off ───────────────────────────────
/* STATE-MACHINES.md, "what is left" after #1523: "armour, legs and the amulet
   put on mid-fight are not locked".  The loss takes the spares and leaves what
   you wear: a spare put on mid-fight was saved, and what it replaced went to the
   phone's bag, out of the worker's view; a piece taken off went there too. */
{
  const PLATE_A = { name: 'Copper Chestplate', gearBase: 'copper', tierMult: 1.12, tier: 'common', slot: 'armor' };
  const PLATE_B = { name: 'Copper Chestplate of the Bear', gearBase: 'copper', tierMult: 1.2, tier: 'common', slot: 'armor' };
  const dress = () => { V.armor = { ...PLATE_A }; V.armorStash = [{ ...PLATE_B }]; };
  const swap = async () => { ws.v.sent.length = 0; await send(ws.v, 'stats_update', { armor: { ...PLATE_B } }); };
  room._liveFlags = { ...(keepFlags || {}), nmlsteps: false };
  base(V); base(K);
  dress();
  await fightOn();
  check('9. setup: the victim is in a fight with a player in No man\'s land', lockedNow() && room._nmlLevelOf(V) >= 1);
  await swap();
  const back = ws.v.sent.filter((m) => m.type === 'player_state' && m.payload && 'armor' in m.payload);
  check('9a. a spare chest piece put on mid-fight is refused: the worker keeps the one worn, and tells the phone what it is',
    !!V.armor && V.armor.name === PLATE_A.name && back.length >= 1 && back[back.length - 1].payload.armor.name === PLATE_A.name,
    { worn: V.armor && V.armor.name, sent: ws.v.sent.map((m) => m.type) });
  ws.v.sent.length = 0;
  await send(ws.v, 'unequip_request', { slot: 'armor' });
  check('9b. the chest piece taken off mid-fight is refused too, the slot sent back', !!V.armor && V.armor.name === PLATE_A.name
    && ws.v.sent.some((m) => m.type === 'player_state' && m.payload && m.payload.armor && m.payload.armor.name === PLATE_A.name));
  ws.v.sent.length = 0;
  await send(ws.v, 'unequip_request', { slot: 'weapon' });
  check('9c. ...but a weapon taken off still goes into the stash, which the loss takes anyway', !V.weapon && Array.isArray(V.weaponStash) && V.weaponStash.length >= 1);
  /* the switch: as before this version */
  room._liveFlags = { ...(keepFlags || {}), nmlsteps: false, fightlockarmor: false };
  await hit();
  await swap();
  check('9d. `fightlockarmor: false`: the swap goes through mid-fight, as before', !!V.armor && V.armor.name === PLATE_B.name, V.armor && V.armor.name);
  /* out of the fight it works */
  room._liveFlags = { ...(keepFlags || {}), nmlsteps: false };
  dress();
  fightOff();
  check('9e. setup: ten seconds later the lock is off', !lockedNow());
  await swap();
  check('9f. out of a fight the swap works as before', !!V.armor && V.armor.name === PLATE_B.name, V.armor && V.armor.name);
  await send(ws.v, 'unequip_request', { slot: 'armor' });
  check('9g. ...and so does taking it off', !V.armor);
  room._liveFlags = keepFlags;
}

// ── 8. v2.3.4606: the character restart, both roads ─────────────────────────
/* STATE-MACHINES.md, "what is left" after #1523: "`character_reset` mid-fight
   (and its web twin, `_accountReset`) wipes the loser's own character: spite,
   the killer gets nothing."  The wipe drops the state before the socket closes,
   so neither the lingering body nor the loss finds anything to take. */
{
  room._liveFlags = { ...(keepFlags || {}), nmlsteps: false };
  base(V); base(K);
  await fightOn();
  check('8. setup: the victim is in a fight with a player in No man\'s land', lockedNow() && room._nmlLevelOf(V) >= 1);
  const before = goods(V);
  ws.v.sent.length = 0;
  await send(ws.v, 'character_reset', { confirm: true });
  const rr = msgs(ws.v, 'character_reset_refused');
  check('8a. Settings\' restart mid-fight is refused with its own message, and nothing of the character goes',
    rr.length === 1 && rr[0].payload.reason === 'fight' && msgs(ws.v, 'character_reset_done').length === 0
    && room.playerState[ids.v] === V && goods(V) === before && room.sessions.has(ws.v), { sent: ws.v.sent.map((m) => m.type) });
  /* the picker's road: a bro played on another device; the Login Key check is
     its own suite's (account-reset), stood in for here */
  const keepLogin = room._accountLogin;
  room._accountLogin = async () => ({ ok: true, settled: true, exists: true, id: ids.v, device: 'ok' });
  const r1 = await room._accountReset('a key', true, '1.2.3.4', 'dev');
  check('8b. the picker\'s restart of a bro in a fight is refused (reason \'fight\'), and nothing goes',
    !!r1 && r1.ok === false && r1.reason === 'fight' && room.playerState[ids.v] === V && goods(V) === before, r1);
  check('8c. both roads are rows of the table under `fightlockreset`', !!FL && !!FL.FIGHT_LOCK.character_reset
    && FL.FIGHT_LOCK.character_reset.sw === 'fightlockreset' && FL.FIGHT_LOCK['http:/api/account/reset'].sw === 'fightlockreset' && !own(FL.FIGHT_OPEN, 'character_reset'));
  /* the switch: today's behaviour back -- the picker's road wipes it */
  room._liveFlags = { ...(keepFlags || {}), nmlsteps: false, fightlockreset: false };
  await hit();
  const r2 = await room._accountReset('a key', true, '1.2.3.4', 'dev');
  check('8d. `fightlockreset: false`: the restart goes through mid-fight, as before this version', !!r2 && r2.ok === true && r2.reset === true && !room.playerState[ids.v], r2);
  room._accountLogin = keepLogin;
  room._liveFlags = { ...(keepFlags || {}), nmlsteps: false };
  /* out of a fight it works, as it always did: the friend, never in one */
  ws.f.sent.length = 0;
  await send(ws.f, 'character_reset', { confirm: true });
  check('8e. out of a fight the restart works as before (done, the character gone)', msgs(ws.f, 'character_reset_done').length === 1 && msgs(ws.f, 'character_reset_refused').length === 0 && !room.playerState[ids.f]);
  room._liveFlags = keepFlags;
}

// ── 7. never test mode: it protects the killer ─────────────────────────────
{
  const src = FL ? readFileSync(new URL('../src/fightlock.js', import.meta.url), 'utf8') : '';
  check('the lock never asks _testMode (it protects another player)', !!src && !/_testMode\(/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
}

Date.now = Date.now;
if (failures) { console.log('\n' + failures + ' FAILED'); process.exit(1); }
console.log('\nALL PASS');
process.exit(0);
