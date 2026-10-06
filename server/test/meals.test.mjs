/* MEALS AND BREWS YOU CARRY -- v2.3.3105 (docs/specs/meals.md).
 *
 * The farming plan's Phase 2 (docs/FARMING-PLAN.md, "What farming pays"):
 * the Cookhouse makes things you carry, one meal and one brew may run at
 * once, and Diego's three tonics are brewed from farm herbs instead of sold.
 *
 *   1. A cook with `carry` puts the dish in the bag: the herbs go, the
 *      Cooking XP is paid, nothing runs yet.  An old client's cook (no
 *      `carry`) is the dish made and used at once.
 *   2. A meal is eaten (eat_request), a brew drunk (potion_drink); neither
 *      the other way round.  Effect before decrement: a refusal uses nothing.
 *   3. ONE MEAL AND ONE BREW: each replaces only its own kind, and a slot
 *      takes its magnitudes with its timers (nothing stranded).
 *   4. The three tonics brew from herbs, at their Cooking levels.
 *   5. The Herb Bread doubles the out-of-combat healing -- never mid-fight,
 *      never in a duel or an arena match -- under its own `rest` timer, never
 *      `regen` (a rollback to v2.3.3102 reads `regen` as 2% a second).
 *   6. The kill switch (`meals: false`) un-advertises and refuses a carry
 *      cook before anything is used; dishes in bags still eat and drink.
 *   7. Diego sells his two staples, not the tonics, and buys no tonic and no
 *      dish -- a dish's own pile would pay more than its herbs' (review).
 *   8. Forged keys: '__proto__', unknown dishes, a brew through eat, a meal
 *      through drink, an empty bag -- nothing applies, nothing is used.
 *   9. The buffs survive a save; the dish is in the saved bag.
 */
import { GameRoom } from '../src/index.js';
import { COOKING_RECIPES, DISHES, SHOP_ITEMS, DIEGO_SHELF } from '../src/data.js';

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

const st = makeState();
const room = new GameRoom(st, mockEnv);
const settle = () => new Promise((r) => setTimeout(r, 10));
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
}
async function send(ws, type, payload) {
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  await settle();
}
const idx = (makes) => COOKING_RECIPES.findIndex((r) => r.makes === makes);
const now = () => Date.now();

const PID = 'bp_meals_a';
const ws = fakeWs();
await join(ws, PID);
const P = room.playerState[PID];
const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
check('caps.meals is advertised', !!sync && sync.caps.meals === true, sync && sync.caps && sync.caps.meals);
P.lifeSkills.cooking = { level: 10, xp: 0 };
P.inventory = Object.assign(P.inventory || {}, { herb_firebloom: 20, herb_rock_vine: 10, herb_cloudpetal: 10 });
P._buffs = {};

// ── 1. a cook with `carry` puts the dish in the bag ──
{
  await send(ws, 'cook_recipe', { recipeIdx: idx('meal_herb_bread'), carry: true });
  check('a carried cook makes a Herb Bread in the bag', P.inventory.meal_herb_bread === 1, P.inventory);
  check('...uses its Firebloom', P.inventory.herb_firebloom === 19, P.inventory.herb_firebloom);
  check('...pays the Cooking XP (tier x 25)', P.lifeSkills.cooking.xp === 25, P.lifeSkills.cooking);
  check('...and runs NOTHING yet -- the bread waits in the bag', !room._buffActive(P, 'rest') && Object.keys(P._buffs || {}).length === 0, P._buffs);
  check('...and the bag is echoed', ws.sent.some((m) => m.type === 'player_state'));
  check('...and saved', ((st._store.get('rpg:' + PID) || {}).inventory || {}).meal_herb_bread === 1, (st._store.get('rpg:' + PID) || {}).inventory);
  for (const k of ['meal_root_stew', 'brew_firebloom_tea']) await send(ws, 'cook_recipe', { recipeIdx: idx(k), carry: true });
  check('Root Stew and Firebloom Tea cook into the bag too', P.inventory.meal_root_stew === 1 && P.inventory.brew_firebloom_tea === 1, P.inventory);
  /* An OLD client's cook (no `carry`): the dish, made and used at once. */
  const before = P.inventory.meal_herb_bread;
  await send(ws, 'cook_recipe', { recipeIdx: idx('meal_herb_bread') });
  check('an old client\'s cook is the dish made and eaten at once -- nothing extra in the bag',
    room._buffActive(P, 'rest') && P.inventory.meal_herb_bread === before, { buffs: P._buffs, bread: P.inventory.meal_herb_bread });
  P._buffs = {};
}

// ── 2. a meal is eaten, a brew drunk ──
{
  await send(ws, 'eat_request', { invKey: 'meal_herb_bread' });
  check('eating a Herb Bread runs it for half an hour', room._buffActive(P, 'rest')
    && P._buffs.rest > now() + 29 * 60000 && P._buffs.rest <= now() + 30 * 60000, P._buffs);
  /* v2.3.3102's worker heals 2% of max HP a second, in or out of a fight,
     while a `regen` timer runs -- its bread's, for 60 s.  A rollback to it
     must not find a half-hour one there (review: three finders proved it). */
  check('...on its OWN timer, `rest` -- no `regen` for an older worker to misread', P._buffs.regen === undefined, P._buffs);
  check('...and uses it up', !P.inventory.meal_herb_bread, P.inventory);
  await send(ws, 'potion_drink', { invKey: 'brew_firebloom_tea' });
  check('drinking a Firebloom Tea is +20% damage for half an hour', room._buffActive(P, 'damage')
    && P._buffs.damageMul === 1.2 && P._buffs.damage > now() + 29 * 60000, P._buffs);
  check('...and uses it up', !P.inventory.brew_firebloom_tea, P.inventory);
  P.inventory.brew_firebloom_tea = 1;
  P.inventory.meal_root_stew = 1;
  const b0 = JSON.stringify(P._buffs);
  await send(ws, 'eat_request', { invKey: 'brew_firebloom_tea' });
  await send(ws, 'potion_drink', { invKey: 'meal_root_stew' });
  check('a brew is not eaten and a meal is not drunk: nothing used, nothing changed',
    P.inventory.brew_firebloom_tea === 1 && P.inventory.meal_root_stew === 1 && JSON.stringify(P._buffs) === b0, { inv: P.inventory, buffs: P._buffs });
}

// ── 3. one meal and one brew ──
{
  await send(ws, 'eat_request', { invKey: 'meal_root_stew' });
  check('a Root Stew REPLACES the Herb Bread (both meals)', room._buffActive(P, 'resist') && !room._buffActive(P, 'rest'), P._buffs);
  check('...and runs BESIDE the tea (a brew)', room._buffActive(P, 'damage') && P._buffs.damageMul === 1.2, P._buffs);
  P.inventory.whetstone = 1;
  await send(ws, 'potion_drink', { invKey: 'whetstone' });
  check('a Fury Tonic replaces the tea (both brews) at its OWN x2', room._buffActive(P, 'damage') && P._buffs.damageMul === 2, P._buffs);
  check('...and the stew keeps going', room._buffActive(P, 'resist'), P._buffs);
  P.inventory.swiftDraught = 1;
  await send(ws, 'potion_drink', { invKey: 'swiftDraught' });
  check('a Swift Draught replaces the tonic, its multiplier gone with its timer (nothing stranded)',
    room._buffActive(P, 'spd') && P._buffs.spdMul === 1.5 && !P._buffs.damage && P._buffs.damageMul === undefined, P._buffs);
  check('...and the stew still keeps going', room._buffActive(P, 'resist'), P._buffs);
  P.inventory.brew_firebloom_tea = 1;
  await send(ws, 'potion_drink', { invKey: 'brew_firebloom_tea' });
  check('a tea replaces the Swift Draught, speed multiplier and all', room._buffActive(P, 'damage') && !P._buffs.spd && P._buffs.spdMul === undefined, P._buffs);
  /* Damage is only ever a brew, so the highest it can stack is one brew's. */
  const dmgMeals = Object.values(DISHES).filter((d) => d.slot === 'meal' && d.buff === 'damage');
  check('no meal raises damage -- the most a player can run is ONE brew\'s multiplier (combat.js\'s ceiling)', dmgMeals.length === 0, dmgMeals);
}

// ── 4. the three tonics brew from herbs ──
{
  P._buffs = {};
  const want = { whetstone: { herb_firebloom: 3 }, manaShard: { herb_rock_vine: 2 }, swiftDraught: { herb_cloudpetal: 2 } };
  for (const [k, herbs] of Object.entries(want)) {
    const r = COOKING_RECIPES[idx(k)];
    check(k + ' is brewed from ' + JSON.stringify(herbs), !!r && JSON.stringify(r.ingredients) === JSON.stringify(herbs), r);
    P.inventory[k] = 0;
    await send(ws, 'cook_recipe', { recipeIdx: idx(k), carry: true });
    check('...and a brew puts the very bottle Diego used to sell in the bag', P.inventory[k] === 1 && Object.prototype.hasOwnProperty.call(SHOP_ITEMS, k), P.inventory[k]);
  }
  /* The level gates are the worker's (v2.3.3102's rule, kept). */
  P.lifeSkills.cooking = { level: 4, xp: 0 };
  const fb = P.inventory.herb_firebloom;
  await send(ws, 'cook_recipe', { recipeIdx: idx('whetstone'), carry: true });
  await send(ws, 'cook_recipe', { recipeIdx: idx('manaShard'), carry: true });
  check('below their Cooking levels (10, 5) a tonic is refused: nothing used, the bag echoed',
    P.inventory.herb_firebloom === fb && P.inventory.whetstone === 1 && P.inventory.manaShard === 1
    && ws.sent.some((m) => m.type === 'player_state'), { fb: P.inventory.herb_firebloom, w: P.inventory.whetstone, m: P.inventory.manaShard });
  P.lifeSkills.cooking = { level: 10, xp: 0 };
}

// ── 5. the Herb Bread doubles the out-of-combat healing ──
{
  P._buffs = {};
  P.inventory.meal_herb_bread = 1;
  await send(ws, 'eat_request', { invKey: 'meal_herb_bread' });
  P.z = 'wheel'; P.maxHp = 300; P.dead = false; P.dying = false;
  const plain = Math.round(300 * room.SPOKE_REGEN_PCT);
  const tick = (fightMs) => { P.hp = 100; P.lastDamageAt = now() - fightMs; P._lastDealtAt = now() - fightMs; room._tickPlayerRegen(); return P.hp - 100; };
  check('out of a fight it heals twice the trickle (' + 2 * plain + ' a tick, not ' + plain + ')', tick(10000) === 2 * plain, { got: P.hp - 100, plain });
  check('...never mid-fight', tick(0) === 0, P.hp);
  P._arenaMatch = 't1';
  check('...never in an arena match', tick(10000) === 0, P.hp);
  delete P._arenaMatch;
  /* duel.js _duelFor: an ACTIVE duel naming the player */
  const duels0 = room._duels;
  room._duels = new Map([['d1', { status: 'active', a: PID, b: 'bp_meals_rival' }]]);
  check('...never in a duel', tick(10000) === 0, P.hp);
  room._duels = duels0;
  /* An older worker's 60 s `regen` timer (v2.3.3102) doubles nothing here. */
  P._buffs = { regen: now() + 60000 };
  check('...and an old `regen` timer is not the bread', tick(10000) === plain, P.hp);
  P._buffs = {};
  check('...and without it, the plain trickle', tick(10000) === plain, P.hp);
}

// ── 6. the kill switch ──
{
  room._liveFlags = { ...(room._liveFlags || {}), meals: false };
  const fb = P.inventory.herb_firebloom;
  const xp = P.lifeSkills.cooking.xp;
  await send(ws, 'cook_recipe', { recipeIdx: idx('meal_herb_bread'), carry: true });
  check('meals:false refuses a carry cook BEFORE anything is used -- herbs, XP and bag untouched, the bag echoed',
    P.inventory.herb_firebloom === fb && P.lifeSkills.cooking.xp === xp && !P.inventory.meal_herb_bread
    && ws.sent.some((m) => m.type === 'player_state'), { fb: P.inventory.herb_firebloom, inv: P.inventory });
  P.inventory.meal_root_stew = 1;
  await send(ws, 'eat_request', { invKey: 'meal_root_stew' });
  check('...a meal already in a bag still eats', room._buffActive(P, 'resist') && !P.inventory.meal_root_stew, P._buffs);
  const ws2 = fakeWs();
  await join(ws2, 'bp_meals_off');
  const s2 = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('...and a joiner is told caps.meals is off', !!s2 && s2.caps.meals === false, s2 && s2.caps.meals);
  /* A forged OLD-style cook (no `carry`) of a recipe an old worker never had
     must not brew a tonic past the switch either (review finding). */
  P._buffs = {};
  const fb2 = P.inventory.herb_firebloom;
  await send(ws, 'cook_recipe', { recipeIdx: idx('whetstone') });
  check('...and an old-style cook of a tonic is refused too: no x2, the herbs kept',
    !room._buffActive(P, 'damage') && P.inventory.herb_firebloom === fb2, { buffs: P._buffs, fb: P.inventory.herb_firebloom });
  await send(ws, 'cook_recipe', { recipeIdx: idx('meal_herb_bread') });
  check('...while the old three still cook the old way (an old client\'s Cookhouse keeps working)',
    room._buffActive(P, 'rest') && P.inventory.herb_firebloom === fb2 - 1, { buffs: P._buffs, fb: P.inventory.herb_firebloom });
  room._liveFlags = { ...room._liveFlags, meals: true };
}

// ── 7. Diego ──
{
  const list = await room._shopList(['whetstone', 'meal_herb_bread']);
  check('his shelf is the two staples -- the tonics are brewed, not sold',
    JSON.stringify(list.items.filter((i) => i.staple).map((i) => i.key)) === JSON.stringify([...DIEGO_SHELF]), list.items.filter((i) => i.staple).map((i) => i.key));
  check('...he quotes no buy price for a tonic', !list.items.some((i) => i.key === 'whetstone'), list.items.map((i) => i.key));
  const buyer = { coins: 500, inventory: Object.create(null) };
  for (const k of ['whetstone', 'manaShard', 'swiftDraught']) {
    const r = await room._shopBuy(buyer, k, 1);
    check('he does not sell a ' + k, !r.ok && !buyer.inventory[k] && buyer.coins === 500, r);
  }
  P.coins = 500;
  P.inventory.whetstone = 1;
  room._handleShopPurchase({ id: PID }, { itemId: 'whetstone' });
  check('...nor does the vendor building (shop_purchase): no coins taken, no tonic run', P.coins === 500 && !(room._buffActive(P, 'damage') && P._buffs.damageMul === 2), { coins: P.coins, buffs: P._buffs });
  const seller = { coins: 0, inventory: Object.assign(Object.create(null), { whetstone: 1 }) };
  const rs = await room._shopSell(seller, 'whetstone', 1);
  check('he buys no tonic back', !rs.ok && seller.inventory.whetstone === 1 && seller.coins === 0, rs);
  /* A pile that took tonics in before his staples existed (review finding):
     they must not come back on sale out of it. */
  const pile = await room._shopStock();
  pile.whetstone = 4; pile.manaShard = 2;
  await room._shopSaveStock(pile);
  const relisted = await room._shopList([]);
  const rPile = await room._shopBuy({ coins: 500, inventory: Object.create(null) }, 'whetstone', 1);
  const qPile = await room._shopQuote('whetstone', 1, 'buy');
  check('...and an old pile of tonics is not back on sale: not listed, not sold, quoted at nothing',
    !relisted.items.some((i) => i.key === 'whetstone' || i.key === 'manaShard') && !rPile.ok && qPile.qty === 0,
    { listed: relisted.items.map((i) => i.key), rPile, qPile });
  /* He buys no dish (review): a dish's pile of its own started at the top of
     his curve while its herbs' piles sat low, so ten Root Stews paid ten times
     what their herbs did once the herb piles had filled. */
  for (const k of Object.keys(DISHES)) {
    const cook = { coins: 0, inventory: Object.assign(Object.create(null), { [k]: 3 }) };
    const sold = await room._shopSell(cook, k, 1);
    const q = await room._shopQuote(k, 1, 'sell');
    const offered = (await room._shopList([k])).items.some((i) => i.key === k);
    check('he buys no ' + k + ': refused, quoted at nothing, offered no price', !sold.ok && cook.inventory[k] === 3 && cook.coins === 0
      && q.qty === 0 && q.total === 0 && !offered, { sold, q, offered });
  }
  /* ...and none comes out of a pile, should one ever hold a dish */
  const pile2 = await room._shopStock();
  pile2.meal_root_stew = 5;
  await room._shopSaveStock(pile2);
  const dishBuy = await room._shopBuy({ coins: 500, inventory: Object.create(null) }, 'meal_root_stew', 1);
  check('...nor sells one out of a pile', !dishBuy.ok && !(await room._shopList([])).items.some((i) => i.key === 'meal_root_stew')
    && (await room._shopQuote('meal_root_stew', 1, 'buy')).qty === 0, dishBuy);
  /* The auction house files food with the potions -- the bag's Consumable
     chip -- not under Crafting. */
  check('the auction house files a meal, a cooked fish and a brew with the potions (Consumable)',
    room._stCategory('meal_root_stew') === 'potion' && room._stCategory('cooked_fish_trout') === 'potion'
    && room._stCategory('brew_firebloom_tea') === 'potion' && room._stCategory('whetstone') === 'potion',
    ['meal_root_stew', 'cooked_fish_trout', 'brew_firebloom_tea', 'whetstone'].map((k) => room._stCategory(k)));
}

// ── 8. forged keys ──
{
  P._buffs = {};
  P.inventory = Object.assign(P.inventory, { meal_herb_bread: 0 });
  delete P.inventory.meal_herb_bread;
  const inv0 = JSON.stringify(P.inventory);
  for (const k of ['__proto__', 'constructor', 'meal_not_a_dish', 'brew_', 'meal_herb_bread']) {
    await send(ws, 'eat_request', { invKey: k });
    await send(ws, 'potion_drink', { invKey: k });
  }
  check('forged and absent keys eat and drink nothing, and use nothing', JSON.stringify(P.inventory) === inv0
    && Object.keys(P._buffs).length === 0 && ({}).regen === undefined && Object.prototype.damageMul === undefined, { buffs: P._buffs });
  await send(ws, 'cook_recipe', { recipeIdx: 99, carry: true });
  await send(ws, 'cook_recipe', { recipeIdx: '0', carry: true });
  await send(ws, 'cook_recipe', { recipeIdx: -1, carry: true });
  check('a forged recipe index cooks nothing', JSON.stringify(P.inventory) === inv0, P.inventory);
  P.dead = true;
  P.inventory.meal_root_stew = 1;
  await send(ws, 'eat_request', { invKey: 'meal_root_stew' });
  check('the dead eat nothing', P.inventory.meal_root_stew === 1 && !room._buffActive(P, 'resist'), P._buffs);
  P.dead = false;
}

// ── 9. a save keeps the buffs and the bag ──
{
  P._buffs = {};
  P.inventory.meal_root_stew = 2;
  P.inventory.brew_firebloom_tea = 1;
  await send(ws, 'eat_request', { invKey: 'meal_root_stew' });
  await send(ws, 'potion_drink', { invKey: 'brew_firebloom_tea' });
  room._pruneBuffs(P);
  check('a save keeps the meal and the brew -- timers and the brew\'s magnitude',
    room._buffActive(P, 'resist') && room._buffActive(P, 'damage') && P._buffs.damageMul === 1.2, P._buffs);
  const rec = st._store.get('rpg:' + PID) || {};
  check('...and the stored record holds them, and the stew still in the bag',
    rec._buffs && rec._buffs.resist > now() && rec._buffs.damageMul === 1.2 && rec.inventory && rec.inventory.meal_root_stew === 1, { buffs: rec._buffs, inv: rec.inventory });
  P.inventory.meal_herb_bread = 1;
  await send(ws, 'eat_request', { invKey: 'meal_herb_bread' });
  const rec2 = st._store.get('rpg:' + PID) || {};
  check('...a bread is stored as `rest`, never `regen` (what a rollback would read)',
    rec2._buffs && rec2._buffs.rest > now() + 29 * 60000 && rec2._buffs.regen === undefined, rec2._buffs);
}

// ── 12. a refusal's echo reaches a v2 client (every live client is one) ──
{
  /* v2's player_state sends only the fields that changed, and a refusal
     changes nothing -- so the echo meant to undo a client's prediction sent
     nothing at all.  The review proved it on the kill switch; it is resent
     now (persistence.js _resendPlayerState). */
  const ws2 = fakeWs();
  room.sessions.set(ws2, baseSession());
  await room.webSocketMessage(ws2, JSON.stringify({ type: 'join', id: 'bp_meals_v2', name: 'V', phrase: 'p-v2', protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await settle();
  const Q = room.playerState['bp_meals_v2'];
  Q.lifeSkills.cooking = { level: 10, xp: 0 };
  Q.inventory = Object.assign(Q.inventory || {}, { herb_firebloom: 3 });
  /* one ordinary emit first, so the v2 cache holds this bag */
  await send(ws2, 'cook_recipe', { recipeIdx: idx('meal_herb_bread'), carry: true });
  const echoed = (w) => w.sent.filter((m) => m.type === 'player_state' && m.payload && m.payload.inventory);
  check('(guard) a v2 cook sends the changed bag', echoed(ws2).length === 1, ws2.sent.map((m) => m.type));
  room._liveFlags = { ...(room._liveFlags || {}), meals: false };
  await send(ws2, 'cook_recipe', { recipeIdx: idx('meal_herb_bread'), carry: true });
  check('a v2 client\'s refused cook (the kill switch) is sent its bag back', echoed(ws2).length === 1
    && echoed(ws2)[0].payload.inventory.meal_herb_bread === 1, ws2.sent.map((m) => m.type));
  room._liveFlags = { ...room._liveFlags, meals: true };
  Q.lifeSkills.cooking = { level: 1, xp: 0 };
  await send(ws2, 'cook_recipe', { recipeIdx: idx('brew_firebloom_tea'), carry: true });
  check('...and a refused cook below its level', echoed(ws2).length === 1, ws2.sent.map((m) => m.type));
  Q.lifeSkills.cooking = { level: 10, xp: 0 };
  /* Two Firebloom left, and the Fury Tonic asks three: the bag is not
     touched here, so only a resend can carry it. */
  await send(ws2, 'cook_recipe', { recipeIdx: idx('whetstone'), carry: true });
  check('...and a cook the worker finds the herbs short for', echoed(ws2).length === 1 && Q.inventory.herb_firebloom === 2 && !Q.inventory.whetstone, ws2.sent.map((m) => m.type));
  await send(ws2, 'eat_request', { invKey: 'meal_root_stew' });
  check('...and a meal it does not hold (the phone took one it drew)', echoed(ws2).length === 1, ws2.sent.map((m) => m.type));
  await send(ws2, 'potion_drink', { invKey: 'brew_firebloom_tea' });
  const drank = ws2.sent.filter((m) => m.type === 'player_state' && m.payload && m.payload.inventory && m.payload._buffs);
  check('...and a brew it does not hold (the phone drew its effect too)', drank.length === 1, ws2.sent.map((m) => m.type));
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nall meals checks passed');
process.exit(failures ? 1 : 0);
