/* FOOD THAT COUNTS IN A FIGHT -- v2.3.3108 (docs/specs/fight-food.md).
 *
 * Owner: "Farming needs a purpose. I think the best purpose it can serve are
 * temporary buffs (boss fights, PvP, dueling, etc) and source of income."
 *
 *   1. The damage brew is read in ONE place (combat.js _brewMul): 1 with no
 *      brew, the cooked food's 1.2 without a number of its own, the brew's
 *      own number (the Fury Tonic's 2), bounded, gone when its time is up.
 *   2. In a fight with a player the BREW IS THE WORKER'S: a claim marked
 *      `nb: 1` is multiplied by the brew the worker holds, AFTER the clamp; a
 *      claim without it is honoured as before; `pvpbrew: false` stops it.
 *   3. The Root Stew cuts small hits too: 5% of every hit on average, at any
 *      size (it was a ceil, which gave the whole cut back under 20).
 *   4. ONE BITE AT A TIME in a fight with a player: a heal eaten at once (the
 *      Garden Stew, a cooked fish, the minnow bottle) once per GAP_MS while in
 *      a duel or within WINDOW_MS of a hit between players; meals and brews
 *      never held back; fighting monsters untouched; `pvpheal: false`.
 *   5. The caps say both, and the kill switches un-advertise them.
 *
 * (The Element Burst's room for a brew is pinned in burst.test.mjs, beside
 * the ceiling it widens.)
 */
import { GameRoom } from '../src/index.js';
import { PVP_HEAL, DISHES } from '../src/data.js';
import * as FF from '../../src/game/fightFood.js';   /* the page's half */
import { dishFor as clientDishFor } from '../../src/data/dishes.js';

function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(makeState(), mockEnv);
const settle = () => new Promise((r) => setTimeout(r, 10));
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
}
async function send(ws, type, payload) {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  await settle();
}
const now = () => Date.now();
/* v2.3.3108 (review): the one-bite clock is the room's, keyed by player id. */
const clk = (id) => room._pvpHealClock(id);

const wsA = fakeWs(), wsB = fakeWs();
await join(wsA, 'bp_ff_a');
await join(wsB, 'bp_ff_b');
const A = room.playerState.bp_ff_a, B = room.playerState.bp_ff_b;
check('both players joined (guard)', !!A && !!B);

// ── 5 (first, off the join). the caps say both ──
{
  const sync = wsA.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.pvpbrew is advertised', !!sync && sync.caps.pvpbrew === true, sync && sync.caps && sync.caps.pvpbrew);
  check('caps.pvpheal is advertised', !!sync && sync.caps.pvpheal === true, sync && sync.caps && sync.caps.pvpheal);
}

// ── 1. the brew, read in one place ──
{
  const p = { _buffs: {} };
  check('no brew: x1', room._brewMul(p) === 1);
  p._buffs = { damage: now() + 60000 };
  check('the cooked food with no number of its own: x1.2', room._brewMul(p) === 1.2);
  p._buffs = { damage: now() + 60000, damageMul: 2 };
  check('the Fury Tonic: its own x2', room._brewMul(p) === 2);
  p._buffs = { damage: now() + 60000, damageMul: 99 };
  check('a number past the bound is not a multiplier (x1.2)', room._brewMul(p) === 1.2);
  p._buffs = { damage: now() + 60000, damageMul: 'x' };
  check('nor is a corrupted one', room._brewMul(p) === 1.2);
  p._buffs = { damage: now() - 1, damageMul: 2 };
  check('a brew whose time is up: x1', room._brewMul(p) === 1);
  check('no player: x1', room._brewMul(null) === 1);
}

// ── 2. in a fight with a player, the brew is the worker's ──
const CLAIM = 40;
/* One clean exchange: consent, fresh lanes, nobody blocking, dodging or
   graced, no def, plenty of HP.  Returns the pvp_hit, or null. */
function hit(payload) {
  if (!room._pvpConsent) room._pvpConsent = new Map();
  room._pvpConsent.set(room._pvpPairKey('bp_ff_a', 'bp_ff_b'), now() + 600000);
  room._pvpHitLanes = new Map();
  A.x = 0; A.y = 0; A.weapon = { type: 'sword', tierMult: 1 }; A.dying = false; A.dead = false;
  B.x = 40; B.y = 0; B.agility = 0; B.def = 0; B.dodging = false; B.blocking = false;
  B.dead = false; B.dying = false; B._zoneEntryGraceUntil = 0; B.maxHp = 100000; B.hp = 100000;
  B._buffs = {};
  room.stateHistory.bp_ff_b = [];
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(room.sessions.get(wsA), Object.assign({ range: 200, arc: 3, angle: 0, critChance: 0 }, payload));
  return room.eventBuffer.find((e) => e.type === 'pvp_hit') || null;
}
const taken = (ev) => ev && ev.payload ? ev.payload.dmgTaken : -1;
{
  /* B rolls no dodge at all (guard), or every comparison below is noise. */
  check('the target cannot dodge here (guard)', room._prog3DodgePct ? room._prog3DodgePct(B) === 0 : true,
    room._prog3DodgePct && room._prog3DodgePct(B));

  A._buffs = {};
  const plain = taken(hit({ dmgBase: CLAIM }));
  check('a plain hit lands (guard)', plain > 0, plain);

  A._buffs = { damage: now() + 60000, damageMul: 2 };
  const oldPage = taken(hit({ dmgBase: CLAIM }));
  check('a claim WITHOUT nb is honoured as it came -- never multiplied (an old page folds its own brew in)',
    oldPage === plain, { oldPage, plain });

  const ev = hit({ dmgBase: CLAIM, nb: 1 });
  const brewed = taken(ev);
  check('a claim marked nb:1 is multiplied by the brew the WORKER holds (Fury Tonic x2)',
    Math.abs(brewed - plain * 2) <= 1, { brewed, plain });
  check('...and the pvp_hit says the brewed number', ev && ev.payload.dmgBase === CLAIM * 2, ev && ev.payload.dmgBase);

  A._buffs = { damage: now() + 60000 };
  const cooked = taken(hit({ dmgBase: CLAIM, nb: 1 }));
  check('...the cooked food\'s x1.2 the same way', Math.abs(cooked - plain * 1.2) <= 1, { cooked, plain });

  A._buffs = {};
  const none = taken(hit({ dmgBase: CLAIM, nb: 1 }));
  check('nb:1 with no brew running is the plain hit', none === plain, { none, plain });

  A._buffs = { damage: now() - 5, damageMul: 2 };
  const spent = taken(hit({ dmgBase: CLAIM, nb: 1 }));
  check('nb:1 after the brew ran out is the plain hit (the worker\'s clock, not the page\'s)', spent === plain, { spent, plain });

  A._buffs = { damage: now() + 60000, damageMul: 2 };
  const loose = taken(hit({ dmgBase: CLAIM, nb: '1' }));
  check('only nb === 1 asks (a string is not the flag)', loose === plain, { loose, plain });

  /* AFTER the clamp: a claim past the ceiling is cut to it and THEN doubled --
     a Fury Tonic is never clipped by a ceiling that was never sized for it. */
  const cap = room._maxDmgForAttacker(A, false);
  const big = hit({ dmgBase: cap * 10, nb: 1 });
  check('the brew multiplies the CLAMPED claim: a forged huge claim is the ceiling x the brew, no more',
    big && big.payload.dmgBase === cap * 2, { dmgBase: big && big.payload.dmgBase, cap });

  /* The kill switch: the page that joined while it was on still sends nb:1;
     the worker stops multiplying it. */
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { pvpbrew: false });
  const off = taken(hit({ dmgBase: CLAIM, nb: 1 }));
  check('pvpbrew:false -- the worker stops multiplying a claim marked nb:1', off === plain, { off, plain });
  delete room._liveFlags.pvpbrew;

  /* The exchange starts a fight for both sides, for the eating rule. */
  clk('bp_ff_a').pvpAt = 0; clk('bp_ff_b').pvpAt = 0;
  hit({ dmgBase: CLAIM });
  check('a hit between players stamps BOTH as in a fight (the eating rule\'s clock)',
    now() - clk('bp_ff_a').pvpAt < 1000 && now() - clk('bp_ff_b').pvpAt < 1000, { a: clk('bp_ff_a').pvpAt, b: clk('bp_ff_b').pvpAt });
  A._buffs = {};
}

// ── 3. the Root Stew cuts small hits too ──
{
  const p = room.playerState.bp_ff_b;
  p._buffs = { resist: now() + 60000 };
  p._zoneEntryGraceUntil = 0; p.agility = 0;
  const N = 4000;
  let sum = 0, odd = 0;
  for (let i = 0; i < N; i++) {
    const d = room._applyDamage(p, 10, false).dmgTaken;
    sum += d;
    if (d !== 9 && d !== 10) odd++;
  }
  const mean = sum / N;
  check('a 10-damage hit under the Root Stew is 9.5 on average (a ceil kept it at 10)',
    Math.abs(mean - 9.5) < 0.06, { mean });
  check('...always one of its two neighbours, 9 or 10', odd === 0, { odd });
  /* 19 x 0.95 = 18.05: 18 nineteen times in twenty, 19 the twentieth.
     Counted, not averaged -- a floor (always 18) and a ceil (always 19)
     must both fail here (review: an average within 0.06 let the floor by). */
  const N19 = 20000;
  let n18 = 0, n19 = 0;
  for (let i = 0; i < N19; i++) { const d = room._applyDamage(p, 19, false).dmgTaken; if (d === 18) n18++; else if (d === 19) n19++; }
  check('a 19-damage hit loses its 5% too: 18 nineteen times in twenty, 19 the twentieth (the ceil gave back all of it)',
    n18 + n19 === N19 && n19 / N19 > 0.035 && n19 / N19 < 0.065, { n18, n19 });
  /* ...and in armour (review): a torso's x0.7 rounds again, and with the
     stew applied first both 18 and 19 became 13 -- the cut lost a second
     time.  Applied after the percentage cuts, 19 -> 13 -> 12.35 on average. */
  room._armorDrMult = () => 0.7;   /* a torso's first step (armorforge.js) */
  let armoured = 0;
  for (let i = 0; i < N19; i++) armoured += room._applyDamage(p, 19, false).dmgTaken;
  delete room._armorDrMult;   /* the prototype's reader again */
  check('in a 0.7 armour, a 19-damage hit still loses the stew\'s 5% (13 -> 12.35 on average, not 13 every time)',
    Math.abs(armoured / N19 - 12.35) < 0.02, { mean: armoured / N19 });
  let ones = true;
  for (let i = 0; i < 200; i++) if (room._applyDamage(p, 1, false).dmgTaken !== 1) ones = false;
  check('...and a 1-damage hit stays 1 (the floor)', ones);
  let big = true;
  for (let i = 0; i < 200; i++) if (room._applyDamage(p, 100, false).dmgTaken !== 95) big = false;
  check('a whole 5% is exact: 100 is always 95', big);
  p._buffs = {};
  let plain = true;
  for (let i = 0; i < 200; i++) if (room._applyDamage(p, 10, false).dmgTaken !== 10) plain = false;
  check('without the stew a 10 is a 10', plain);
}

// ── 4. one bite at a time in a fight with a player ──
const wsC = fakeWs();
await join(wsC, 'bp_ff_c');
const C = room.playerState.bp_ff_c;
const stock = () => {
  C.inventory = Object.assign(C.inventory || {}, {
    meal_garden_stew: 10, cooked_fish_minnow: 10, cookedMinnow: 10,
    meal_root_stew: 3, brew_firebloom_tea: 3,
  });
};
const hurt = () => { C.maxHp = 5000; C.hp = 100; C.dead = false; C.dying = false; C._arenaMatch = null; };
const resent = (ws) => ws.sent.some((m) => m.type === 'player_state' && m.payload && m.payload.inventory);
const eat = (key) => send(wsC, 'eat_request', { invKey: key });
const drink = (key) => send(wsC, 'potion_drink', { invKey: key });
{
  check('the rule\'s numbers (guard): a 10 s fight window, 15 s between bites',
    PVP_HEAL.WINDOW_MS === 10000 && PVP_HEAL.GAP_MS === 15000, PVP_HEAL);
  check('the Garden Stew is a heal eaten at once (guard)', DISHES.meal_garden_stew.slot === 'now');

  /* Out of any fight with a player: eat as fast as you like. */
  stock(); hurt(); clk('bp_ff_c').pvpAt = 0; clk('bp_ff_c').healAt = 0;
  for (let i = 0; i < 3; i++) await eat('meal_garden_stew');
  check('out of a fight with a player, three stews in a row all heal',
    C.inventory.meal_garden_stew === 7 && C.hp > 100 + 3 * 140, { left: C.inventory.meal_garden_stew, hp: C.hp });

  /* In one -- and the last bite counts wherever it was eaten. */
  hurt(); clk('bp_ff_c').pvpAt = now();
  await eat('meal_garden_stew');
  check('a hit between players in the last 10 s: the next bite waits 15 s from the LAST one (eaten just now)',
    C.inventory.meal_garden_stew === 7 && C.hp === 100, { left: C.inventory.meal_garden_stew, hp: C.hp });
  check('...and the refusal sends the bag back to the phone (it took one already)', resent(wsC));

  clk('bp_ff_c').healAt = now() - PVP_HEAL.GAP_MS - 1;
  await eat('meal_garden_stew');
  check('15 s after the last bite, one stew goes down', C.inventory.meal_garden_stew === 6 && C.hp > 100, { hp: C.hp });
  hurt();
  await eat('meal_garden_stew');
  check('...and the next one right after it does not', C.inventory.meal_garden_stew === 6 && C.hp === 100, { hp: C.hp });
  await eat('cooked_fish_minnow');
  check('a cooked fish is a bite too', C.inventory.cooked_fish_minnow === 10 && C.hp === 100, { hp: C.hp });
  check('...its refusal resent (the phone took one already)', resent(wsC));
  await drink('cookedMinnow');
  check('...and so is the old minnow bottle', C.inventory.cookedMinnow === 10 && C.hp === 100, { hp: C.hp });
  check('...its refusal resent too', resent(wsC));

  await eat('meal_root_stew');
  check('a half-hour MEAL is not a heal and is never held back', C.inventory.meal_root_stew === 2 && C._buffs.resist > now());
  await drink('brew_firebloom_tea');
  check('nor is a BREW', C.inventory.brew_firebloom_tea === 2 && C._buffs.damage > now());

  /* The fight ends WINDOW_MS after the last exchange. */
  clk('bp_ff_c').pvpAt = now() - PVP_HEAL.WINDOW_MS - 1; clk('bp_ff_c').healAt = now() - 5000;   /* a bite 5 s ago: inside the gap */
  await eat('cooked_fish_minnow');
  check('10 s after the last hit between players the rule lets go', C.inventory.cooked_fish_minnow === 9 && C.hp > 100, { hp: C.hp });
  /* Every bite starts the clock, out of a fight too -- or a fish eaten just
     before the first blow would buy a second bite at once. */
  check('...and that fish starts the clock (counted wherever it is eaten)', now() - clk('bp_ff_c').healAt < 1000, clk('bp_ff_c').healAt);
  clk('bp_ff_c').healAt = 0;
  hurt();
  await drink('cookedMinnow');
  check('the minnow bottle starts it too', C.inventory.cookedMinnow === 9 && now() - clk('bp_ff_c').healAt < 1000, { left: C.inventory.cookedMinnow, at: clk('bp_ff_c').healAt });
  clk('bp_ff_c').healAt = 0;
  await drink('brew_firebloom_tea');
  check('a brew does not (it is no heal)', clk('bp_ff_c').healAt === 0, clk('bp_ff_c').healAt);

  /* A duel is a fight from its first second to its last, hit or no hit. */
  hurt(); clk('bp_ff_c').pvpAt = 0; clk('bp_ff_c').healAt = now();
  if (!room._duels) room._duels = new Map();
  room._duels.set('ff-duel', { id: 'ff-duel', status: 'active', a: 'bp_ff_c', b: 'bp_ff_a', away: Object.create(null) });
  await eat('cooked_fish_minnow');
  check('in an active DUEL the rule holds with no hit at all', C.inventory.cooked_fish_minnow === 9 && C.hp === 100, { hp: C.hp });
  room._duels.get('ff-duel').status = 'done';
  await eat('cooked_fish_minnow');
  check('...and lets go when the duel is over (derived, nothing to clear)', C.inventory.cooked_fish_minnow === 8, C.inventory);
  room._duels.delete('ff-duel');

  /* A monster fight is no fight with a player. */
  hurt(); clk('bp_ff_c').pvpAt = 0; clk('bp_ff_c').healAt = now(); C.lastDamageAt = now();
  await eat('cooked_fish_minnow');
  check('a fight with MONSTERS is untouched: eat as you always could', C.inventory.cooked_fish_minnow === 7, C.inventory);

  /* The kill switch. */
  hurt(); clk('bp_ff_c').pvpAt = now(); clk('bp_ff_c').healAt = now();
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { pvpheal: false });
  await eat('cooked_fish_minnow');
  check('pvpheal:false lifts the rule', C.inventory.cooked_fish_minnow === 6, C.inventory);
  delete room._liveFlags.pvpheal;

  /* An exchange really does start it: C hit by A (the stamp from combat.js). */
  hurt(); clk('bp_ff_c').pvpAt = 0; clk('bp_ff_c').healAt = now();
  if (!room._pvpConsent) room._pvpConsent = new Map();
  room._pvpConsent.set(room._pvpPairKey('bp_ff_a', 'bp_ff_c'), now() + 600000);
  room._pvpHitLanes = new Map();
  A.x = 0; A.y = 0; C.x = 40; C.y = 0; C.agility = 0; C.def = 0; C.dodging = false; C.blocking = false;
  C._zoneEntryGraceUntil = 0; room.stateHistory.bp_ff_c = [];
  room._resolvePvPAttack(room.sessions.get(wsA), { range: 200, arc: 3, angle: 0, critChance: 0, dmgBase: 5, target: 'bp_ff_c' });
  const hpAfterHit = C.hp;
  await eat('cooked_fish_minnow');
  check('a real pvp hit puts the target in the fight: the bite right after waits',
    C.inventory.cooked_fish_minnow === 6 && C.hp === hpAfterHit, { left: C.inventory.cooked_fish_minnow, hp: C.hp });
  check('...and _pvpHealWait says how long (just under 15 s)',
    room._pvpHealWait('bp_ff_c', C) > PVP_HEAL.GAP_MS - 2000, room._pvpHealWait('bp_ff_c', C));
}

// ── 4b. v2.3.3108 (review): the rule's roads, its reply, and its clock ──
{
  const COOK_IDX = (await import('../src/data.js')).COOKING_RECIPES.findIndex((r) => r.makes === 'meal_garden_stew');
  check('the Garden Stew has a recipe row (guard)', COOK_IDX >= 0, COOK_IDX);

  /* The reply: a held bite says so, with the wait -- the page's clock is the
     worker's then, in a lull of a duel or after a reconnect. */
  hurt(); stock(); clk('bp_ff_c').pvpAt = now(); clk('bp_ff_c').healAt = now() - 3000;
  await eat('meal_garden_stew');
  const reply = wsC.sent.find((m) => m.type === 'eat_refused');
  check('a bite held back by the rule is told why: eat_refused with the wait (~12 s)',
    !!reply && reply.payload.wait > 11000 && reply.payload.wait <= 12000, reply && reply.payload);
  clk('bp_ff_c').pvpAt = 0;
  C._arenaMatch = { id: 'x' };
  await eat('meal_garden_stew');
  check('...and only by the rule: an arena refusal says nothing of the kind', !wsC.sent.some((m) => m.type === 'eat_refused'));
  C._arenaMatch = null;

  /* The old-style cook (no `carry`), which only a forged message sends since
     caps.meals: in a fight its stew is held back -- into the bag, uneaten. */
  hurt(); C.lifeSkills = Object.assign(C.lifeSkills || {}, { cooking: { level: 10, xp: 0 } });
  C.inventory = Object.assign(C.inventory || {}, { crop_carrot: 20, crop_potato: 10 });
  clk('bp_ff_c').pvpAt = now(); clk('bp_ff_c').healAt = now();
  const stews0 = C.inventory.meal_garden_stew || 0;
  for (let i = 0; i < 3; i++) await send(wsC, 'cook_recipe', { recipeIdx: COOK_IDX });
  check('a forged old-style cook of a Garden Stew in a fight heals NOTHING (it went past the rule, three times)',
    C.hp === 100, { hp: C.hp });
  check('...the stews it makes land in the bag instead, never lost', (C.inventory.meal_garden_stew || 0) === stews0 + 3, C.inventory.meal_garden_stew);
  clk('bp_ff_c').pvpAt = 0; clk('bp_ff_c').healAt = 0;
  await send(wsC, 'cook_recipe', { recipeIdx: COOK_IDX });
  check('...out of a fight it is eaten at once, as an old client expects', C.hp > 100 && (C.inventory.meal_garden_stew || 0) === stews0 + 3, { hp: C.hp });
  check('...and starts the clock like every bite', now() - clk('bp_ff_c').healAt < 1000, clk('bp_ff_c').healAt);

  /* The clock survives a rejoin: a fresh playerState used to reset it. */
  hurt(); clk('bp_ff_c').pvpAt = now(); clk('bp_ff_c').healAt = now();
  const wsC2 = fakeWs();
  await join(wsC2, 'bp_ff_c');
  const C2 = room.playerState.bp_ff_c;
  C2.maxHp = 5000; C2.hp = 100; C2.inventory = Object.assign(C2.inventory || {}, { cooked_fish_minnow: 5 });
  await send(wsC2, 'eat_request', { invKey: 'cooked_fish_minnow' });
  check('a reconnect does not hand out a bite: the rule holds across a rejoin', C2.hp === 100 && C2.inventory.cooked_fish_minnow === 5, { hp: C2.hp });
  check('...the clock is not on playerState (a join rebuilds that)', !('_healAt' in C2) && !('_pvpAt' in C2) && !('healAt' in C2));
  const all = room.getAllPlayerData ? JSON.stringify(room.getAllPlayerData()) : '';
  check('...nor in what every joiner is sent about the room\'s players', !/healAt|pvpAt/.test(all));

  /* Pruned, never unbounded. */
  const stale = now() - 60000;
  for (let i = 0; i < 600; i++) { const c = clk('bp_prune_' + i); c.pvpAt = stale; c.healAt = stale; }
  check('the clocks are pruned of those that can hold nobody back', room._pvpHealClocks.size <= 520, room._pvpHealClocks.size);
  check('...never the live ones', room._pvpHealClocks.has('bp_ff_c'));
}

// ── 5. the kill switches un-advertise ──
{
  room._liveFlags = Object.assign({}, room._liveFlags || {}, { pvpbrew: false, pvpheal: false });
  const wsD = fakeWs();
  await join(wsD, 'bp_ff_d');
  const sync = wsD.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('pvpbrew:false un-advertises caps.pvpbrew (a new page folds its brew in as before)',
    !!sync && sync.caps.pvpbrew === false, sync && sync.caps && sync.caps.pvpbrew);
  check('pvpheal:false un-advertises caps.pvpheal (a new page stops holding bites back)',
    !!sync && sync.caps.pvpheal === false, sync && sync.caps && sync.caps.pvpheal);
  delete room._liveFlags.pvpbrew; delete room._liveFlags.pvpheal;
}

// ── 6. the page's half (src/game/fightFood.js) ──
{
  /* The brew, read the worker's way on the worker's echo. */
  const t = 1000000;
  check('page: no brew x1', FF.brewMulNow({}, t) === 1);
  check('page: the cooked food x1.2', FF.brewMulNow({ _dmgBuff: t + 5 }, t) === 1.2);
  check('page: the Fury Tonic x2', FF.brewMulNow({ _dmgBuff: t + 5, _dmgBuffMul: 2 }, t) === 2);
  check('page: past the bound x1.2, as the worker', FF.brewMulNow({ _dmgBuff: t + 5, _dmgBuffMul: 9 }, t) === 1.2);
  check('page: run out x1', FF.brewMulNow({ _dmgBuff: t, _dmgBuffMul: 2 }, t) === 1);
  /* The page agrees with the worker on every case (one rule, two copies). */
  const cases = [undefined, 0, 1, 1.2, 2, 4, 4.01, -1, 'x'];
  let agree = true;
  for (const m of cases) {
    const p = { _buffs: { damage: now() + 60000 } };
    if (m !== undefined) p._buffs.damageMul = m;
    const s2 = { _dmgBuff: now() + 60000 };
    if (m !== undefined) s2._dmgBuffMul = m;
    if (room._brewMul(p) !== FF.brewMulNow(s2)) agree = false;
  }
  check('page and worker read the same multiplier from the same brew, every case', agree);

  /* The claim: the brew comes out (and nb says so) ONLY for a pvpbrew worker. */
  const oldW = { _serverCaps: {} };
  const newW = { _serverCaps: { pvpbrew: true } };
  const c1 = FF.pvpClaim(oldW, 80, 2);
  check('page: against an older worker the claim keeps its brew and sends no nb',
    c1.dmgBase === 80 && c1.nb === undefined, c1);
  const c2 = FF.pvpClaim(newW, 80, 2);
  check('page: against a pvpbrew worker the brew comes out and nb is 1', c2.dmgBase === 40 && c2.nb === 1, c2);
  const c3 = FF.pvpClaim(newW, 80, undefined);
  check('page: a shot with no brew tag is claimed as it is (never divided by nothing)', c3.dmgBase === 80 && c3.nb === 1, c3);
  const c4 = FF.pvpClaim(newW, 80, 99);
  check('page: a tag past the bound is ignored, not divided by', c4.dmgBase === 80, c4);
  /* And end to end: the page's claim, the worker's multiply = the brewed hit. */
  A._buffs = { damage: now() + 60000, damageMul: 2 };
  const ev = hit({ dmgBase: FF.pvpClaim(newW, CLAIM * 2, 2).dmgBase, nb: FF.pvpClaim(newW, CLAIM * 2, 2).nb });
  check('page + worker: a brewed claim taken apart and put back is the brewed hit, exactly once',
    ev && ev.payload.dmgBase === CLAIM * 2, ev && ev.payload.dmgBase);
  A._buffs = {};

  /* The bite timer. */
  const capsOn = { pvpheal: true };
  const S = { myId: 'me', _serverCaps: capsOn };
  check('page: out of a fight, no wait', FF.pvpHealWaitMs(S, t) === 0);
  check('page: a pvp_hit naming me starts the fight', FF.notePvpHit(S, { attacker: 'x', target: 'me' }, t) && S._pvpAt === t);
  check('page: ...and one I threw', FF.notePvpHit(S, { attacker: 'me', target: 'x' }, t + 1) && S._pvpAt === t + 1);
  check('page: ...but not one between two others', !FF.notePvpHit(S, { attacker: 'x', target: 'y' }, t + 2) && S._pvpAt === t + 1);
  FF.noteInstantHeal(S, t);
  check('page: in the fight, right after a bite: wait 15 s', FF.pvpHealWaitMs(S, t + 1) === PVP_HEAL.GAP_MS - 1, FF.pvpHealWaitMs(S, t + 1));
  check('page: 15 s on, no wait', FF.pvpHealWaitMs(S, t + PVP_HEAL.GAP_MS) === 0);
  check('page: the fight ends 10 s after the last hit', FF.pvpHealWaitMs(S, t + 1 + PVP_HEAL.WINDOW_MS) === 0);
  /* v2.3.3108 (review): the duel flag alone holds nothing on the page -- it
     can outlive its duel and held every bite back against monsters until a
     reload.  A duel's lull is the worker's to call, and it says so. */
  const D = { myId: 'me', _serverCaps: capsOn, _inDuel: { opponent: 'x' }, _instantHealAt: t };
  check('page: a stale duel flag alone holds no bite back (the worker calls a duel\'s lull)', FF.pvpHealWaitMs(D, t + 1000) === 0);
  const W = { myId: 'me', _serverCaps: capsOn };
  check('page: the worker\'s eat_refused sets the page\'s clock to its wait', FF.noteEatRefused(W, 9000, t) === 9000 && FF.pvpHealWaitMs(W, t) === 9000);
  check('page: ...the next tap is held for that long, then let go', FF.pvpHealWaitMs(W, t + 8999) === 1 && FF.pvpHealWaitMs(W, t + 9000) === 0);
  check('page: ...a wait past the gap or garbage is bounded', FF.noteEatRefused({}, 1e9, t) === PVP_HEAL.GAP_MS && FF.noteEatRefused({}, 'x', t) === 0);
  const O = { myId: 'me', _serverCaps: {}, _inDuel: { opponent: 'x' }, _instantHealAt: t };
  check('page: against a worker without pvpheal the page never holds a bite back', FF.pvpHealWaitMs(O, t + 1000) === 0);
  check('page: the words', FF.pvpHealWaitText(14001) === 'Eat again in 15s' && FF.pvpHealWaitText(1) === 'Eat again in 1s');

  /* Which bites count -- the same three the worker holds back. */
  check('page: the Garden Stew is a bite', FF.isInstantHeal('meal_garden_stew', clientDishFor('meal_garden_stew')));
  check('page: a cooked fish is a bite', FF.isInstantHeal('cooked_fish_trout', null));
  check('page: the minnow bottle is a bite', FF.isInstantHeal('cookedMinnow', null));
  check('page: a meal is not', !FF.isInstantHeal('meal_root_stew', clientDishFor('meal_root_stew')));
  check('page: a brew is not', !FF.isInstantHeal('brew_firebloom_tea', clientDishFor('brew_firebloom_tea')));
  check('page: a tonic is not', !FF.isInstantHeal('whetstone', null) && !FF.isInstantHeal('staminaSalts', null));
  /* Every 'now' dish on the worker is a bite on the page. */
  const nowDishes = Object.keys(DISHES).filter((k) => DISHES[k].slot === 'now');
  check('page: every dish the worker eats at once is a bite on the page too',
    nowDishes.length > 0 && nowDishes.every((k) => FF.isInstantHeal(k, clientDishFor(k))), nowDishes);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
