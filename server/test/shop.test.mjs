/* SHOPKEEPER BRO'S PUBLIC PILE (v2.3.2047).
 *
 * Owner: "His inventory is public so other players who sell monster remains
 * (etc) can see it and buy from him. The more quantity he has of a thing the
 * cheaper he's willing to buy from you."
 *
 * The price rule IS the design, so most of this file is about it. What it has
 * to prove is not "a price came back" but that the price MOVES the way the
 * owner described, that a bulk sale cannot dodge the movement, and that the
 * pile one player fills is the pile another player sees.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { SHOP } from '../src/shop.js';
import { SHOP_ITEMS } from '../src/data.js';   /* v2.3.2063: his staple shelf */

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
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}

const A = fakeWs('A'), B = fakeWs('B');
await join(A, 'seller');
await join(B, 'buyer');
const psA = room.playerState.seller, psB = room.playerState.buyer;

/* ── THE PRICE FALLS AS THE PILE GROWS ── */
const p0 = room._shopBuyPrice('slime-remnants', 0);
/* Read at SOFTEN itself rather than at a hardcoded number. The first version
   of this line asserted "about half" at a literal 12, which was only true
   while SOFTEN happened to be 12 -- so widening the curve (a change to the
   GAME) turned this into a failure about nothing. A constant's own value is
   what a claim about that constant should be measured against. */
const pSoft = room._shopBuyPrice('slime-remnants', SHOP.SOFTEN);
const pMany = room._shopBuyPrice('slime-remnants', SHOP.SOFTEN * 8);
check('he pays most for a thing he has none of', p0 > pSoft && pSoft > pMany, { p0, pSoft, pMany });
check('...and the fall is real, not a rounding wobble: at SOFTEN he offers about half',
  pSoft <= Math.ceil(p0 / 2) && pSoft >= Math.floor(p0 / 2) - 1,
  { p0, pSoft, SOFTEN: SHOP.SOFTEN });
check('...but he never offers nothing, however much he is holding',
  room._shopBuyPrice('slime-remnants', 100000) >= SHOP.MIN_BUY, room._shopBuyPrice('slime-remnants', 100000));

/* What he CHARGES must NOT fall with stock, or a glut would be cheap to buy
   and cheap to sell and the two would cancel out. */
check('what he charges does not move with his stock',
  room._shopSellPrice('slime-remnants') === room._shopSellPrice('slime-remnants'), null);
check('...and he charges more than he pays, so buy-then-sell-back is a loss',
  room._shopSellPrice('slime-remnants') > room._shopBuyPrice('slime-remnants', 0),
  { sell: room._shopSellPrice('slime-remnants'), buy: p0 });

/* ── A BULK SALE CANNOT DODGE THE DECAY ──
   The one that matters: if a stack were priced at the opening offer, selling
   100 at once would beat selling 1 a hundred times and the rule would be
   decorative. */
psA.inventory = { 'slime-remnants': 100 };
psA.coins = 0;
const bulk = await room._shopSell(psA, 'slime-remnants', 100);
check('a hundred-unit sale settles', bulk.ok && bulk.sold === 100, bulk);
check('...and pays LESS than a hundred times the opening offer, because each '
    + 'unit is priced against the pile as it grows',
  bulk.paid < p0 * 100, { paid: bulk.paid, naive: p0 * 100 });
check('...and the coins actually reached the player', psA.coins === bulk.paid, { coins: psA.coins, paid: bulk.paid });
check('...and the goods actually left the bag', !psA.inventory['slime-remnants'], psA.inventory);
check('...and his next offer is lower than his first', bulk.nextBuy < p0, { nextBuy: bulk.nextBuy, p0 });

/* ── THE PILE IS PUBLIC ── */
const listB = await room._shopList();
const boneLine = listB.items.find((i) => i.key === 'slime-remnants');
check('another player sees the pile the first one filled', !!boneLine && boneLine.qty === 100, listB.items);
check('...with both prices on the line, so a seller can see why the offer moved',
  !!boneLine && boneLine.buy > 0 && boneLine.sell > 0, boneLine);

/* ── BUYING DRAINS IT AND RECOVERS THE PRICE ── */
psB.coins = 10000;
psB.inventory = {};
const buy = await room._shopBuy(psB, 'slime-remnants', 40);
check('a second player can buy out of the pile', buy.ok && buy.bought === 40, buy);
check('...paying his asking price, not the seller offer',
  buy.cost === room._shopSellPrice('slime-remnants') * 40, buy);
check('...the goods land in the buyer bag', psB.inventory['slime-remnants'] === 40, psB.inventory);
check('...the coins leave the buyer purse', psB.coins === 10000 - buy.cost, { coins: psB.coins });
check('...and draining the pile RAISES what he will pay the next seller',
  buy.nextBuy > bulk.nextBuy, { after: buy.nextBuy, before: bulk.nextBuy });

/* ── REFUSALS ── */
psB.coins = 1;
check('he will not sell to an empty purse', !(await room._shopBuy(psB, 'slime-remnants', 40)).ok);
check('he will not sell what he has not got', !(await room._shopBuy(psB, 'nothing_at_all', 1)).ok);
psA.inventory = { 'slime-remnants': 2 };
check('you cannot sell more than you carry', !(await room._shopSell(psA, 'slime-remnants', 5)).ok);
check('a zero or negative quantity is refused', !(await room._shopSell(psA, 'slime-remnants', 0)).ok
  && !(await room._shopSell(psA, 'slime-remnants', -3)).ok);
check('a single action is capped, so a fat-fingered quantity cannot empty a bag',
  !(await room._shopSell(psA, 'slime-remnants', SHOP.MAX_QTY_PER_OP + 1)).ok);

/* ── THE STOCK RECORD SURVIVES A RESTART ──
   It is one shared record; if it lived only in memory the pile would vanish on
   every deploy and every player's sales with it. */
const room2 = new GameRoom(state, mockEnv);
const after = await room2._shopList();
check('the pile survives a room restart (it is storage, not memory)',
  !!after.items.find((i) => i.key === 'slime-remnants' && i.qty === 60), after.items);

/* ── '__proto__' IS AN ITEM KEY LIKE ANY OTHER ──
   CLAUDE.md rule 4: a plain {} silently no-ops on it, and the keys here come
   straight from a client. Three incidents in one day is why this is checked. */
psA.inventory = { __proto__: 5 };
const proto = await room._shopSell(psA, '__proto__', 1);
const protoList = await room._shopList();
check("a '__proto__' item key does not corrupt the pile",
  !protoList.items.some((i) => i.key !== '__proto__' && i.qty === undefined), { proto: proto.ok, items: protoList.items.length });

/* ── THE ANSWERS ARE SERVER-ONLY ──
   Both carry money: shop_result names coins paid, shop_state is the pile
   everyone prices against. */
check('shop_state cannot be forged by a client', PRIVILEGED_EVENTS.has('shop_state'));
check('shop_result cannot be forged by a client', PRIVILEGED_EVENTS.has('shop_result'));

/* ═══ v2.3.2053: WHAT HE STARTS WITH ═══
   Owner: the consumables go, and "his inventory can just start with a few
   cooked fish". A SEED, not a staple: it is ordinary stock, priced by the same
   decay, and it runs out. */
const fresh = makeState();
const room3 = new GameRoom(fresh, mockEnv);
const seeded = await room3._shopList();
const fish = seeded.items.find((i) => i.key === 'cooked_fish_trout');
check('a brand-new world finds a few cooked fish on him', !!fish && fish.qty > 0,
  seeded.items);
check('...priced above the raw fish they were made from',
  room3._shopBaseValue('cooked_fish_trout') > room3._shopBaseValue('fish_trout'),
  { cooked: room3._shopBaseValue('cooked_fish_trout'), raw: room3._shopBaseValue('fish_trout') });
/* ═══ v2.3.2063: THE PILE AND THE SHELF ARE DIFFERENT THINGS ═══
   This used to read "and nothing else, so the retired consumables are really
   gone". The consumables came back at the owner's request ("These potions
   should be purchasable there") -- but as STAPLES, which is a different list:
   fixed price, always there, no decay, and buying one never moves the pile.
   So the claim worth making is not "no consumables" but "no consumable is in
   the PILE": a potion in the pile would be a finite stock nobody can restock,
   because no player can sell him one. */
const pile = seeded.items.filter((i) => !i.staple);
check('the seeded PILE is the fish and nothing else',
  pile.length === 1 && pile[0].key === 'cooked_fish_trout', pile.map((i) => i.key));
check('...and the potions are on his staple shelf instead, where they cannot '
    + 'run out', seeded.items.some((i) => i.staple && i.key === 'manaShard')
  && seeded.items.some((i) => i.staple && i.key === 'swiftDraught'),
  seeded.items.filter((i) => i.staple).map((i) => i.key));
check('...priced at what the vendor charges, so the two shelves cannot drift',
  seeded.items.find((i) => i.key === 'swiftDraught').sell === SHOP_ITEMS.swiftDraught.cost,
  seeded.items.find((i) => i.key === 'swiftDraught'));

/* The seed is written ONCE. A pile players have emptied is a stored {}, which
   is not the same as "never seeded" -- if that distinction were missed he
   would silently restock every time someone cleared him out, which is a money
   printer rather than a shop. */
const psC = { coins: 10000, inventory: {} };
const bought = await room3._shopBuy(psC, 'cooked_fish_trout', fish.qty);
check('the seeded fish can all be bought', bought.ok && bought.bought === fish.qty, bought);
const room4 = new GameRoom(fresh, mockEnv);
const after2 = await room4._shopList();
check('...and he does NOT restock them on the next read (the seed is once, '
    + 'not a respawn)',
  !after2.items.some((i) => i.key === 'cooked_fish_trout'), after2.items);

/* ═══ v2.3.2055: HE QUOTES FOR THINGS HE HOLDS NONE OF ═══
   Without this the Sell button on anything new read as a bare "Sell" with no
   number -- which is the commonest row there is, since the point of him is
   selling him something he has not got. The client cannot fill that in (it
   computes no prices, deliberately), so the ask carries the keys. */
/* v2.3.2063: keyed on ORE and WOOD rather than the two potions this used to
   name. Those are staples now -- he sells them and never buys them -- so
   quoting them as things-he-holds-none-of asked the wrong question and got a
   0 back. Ore and logs are the real case: player-gathered, sellable, and he
   starts with none. */
const quoted = await room._shopList(['ore_copper', 'wood_oak', 'not_a_real_thing']);
const qw = quoted.items.find((i) => i.key === 'ore_copper');
check('he quotes for an item he holds none of', !!qw && qw.qty === 0 && qw.buy > 0, quoted.items);
check('...at a price that reflects what the item is worth, not a flat default',
  qw.buy !== quoted.items.find((i) => i.key === 'wood_oak').buy,
  { ore: qw.buy, wood: quoted.items.find((i) => i.key === 'wood_oak').buy });
check('...and below what he charges for it, so flipping is a loss',
  qw.buy < room._shopSellPrice('ore_copper'), { buy: qw.buy, sell: room._shopSellPrice('ore_copper') });
/* The key list arrives from a client, so it is bounded and type-checked. */
const junk = await room._shopList([123, null, {}, 'x'.repeat(500), 'ok_key']);
check('a malformed quote list is filtered rather than trusted',
  junk.items.some((i) => i.key === 'ok_key')
  && !junk.items.some((i) => typeof i.key !== 'string' || i.key.length > 64), junk.items.length);
const many = await room._shopList(Array.from({ length: 500 }, (_, i) => 'k' + i));
check('...and a huge one is capped', many.items.length < 100, many.items.length);

/* ═══ v2.3.2056: THE TONIC ACTUALLY DOES SOMETHING ═══
   Owner: "Make it worthwhile to buy a potion."

   It did nothing. The purchase path used to carry the line "dmgBuff: no-op
   server-side (transient buff state)" -- and the server is authoritative for
   damage, so the tonic set a timer on the CLIENT, the client drew bigger
   numbers, and the damage the room applied was unchanged. This is the test
   that would have caught that, and it is written against the DAMAGE, not
   against the timer, because a timer that no combat path reads is exactly
   the bug being fixed. */
const psD = room.playerState.buyer;
psD.coins = 1000;
delete psD._buffs;
check('no damage buff before buying one', !room._buffActive(psD, 'damage'));
room._handleShopPurchase({ id: 'buyer' }, { itemId: 'whetstone' });
check('buying the Fury Tonic sets a REAL server-side damage buff',
  room._buffActive(psD, 'damage'), psD._buffs);
check('...and the combat path is the one that reads it',
  psD._buffs.damage > Date.now() + 2.5 * 60 * 1000,
  { remainingMs: psD._buffs.damage - Date.now() });
check('...and it cost the listed coins', psD.coins === 1000 - 35, psD.coins);
/* Two in a row must EXTEND from now, not stack into a bigger multiplier --
   there is one damage flag and combat reads it as a boolean. */
const firstEnd = psD._buffs.damage;
room._handleShopPurchase({ id: 'buyer' }, { itemId: 'whetstone' });
check('a second tonic re-arms the timer rather than stacking the effect',
  psD._buffs.damage >= firstEnd && typeof psD._buffs.damage === 'number', psD._buffs);

/* ═══ v2.3.2058: TWO TIMES, FOR THREE MINUTES ═══
   Owner: "make it 2x and 3 minutes."

   x1.20 in combat.js is the COOKED-FOOD magnitude, shared by every recipe in
   the game, so the tonic could not simply raise that constant -- doing so
   would have silently doubled every meal too. The magnitude now rides on
   _buffs.damageMul beside the timer, and these assertions are written against
   the DAMAGE THE ROOM ACTUALLY COMPUTES, not against the field, because a
   field nothing reads is the shape of the v2.3.2056 bug.

   Math.random is pinned so _computeAttackDamage is deterministic: variance
   resolves to a fixed roll and, at 0.99, no crit branch fires (crit chance
   caps at 0.30, and a bare test player has no crit channel to accumulate). */
const _realRandom = Math.random;
Math.random = () => 0.99;
const swing = (ps) => room._computeAttackDamage(ps, 'primary', false).dmg;
/* Compared as an ABSOLUTE distance, not a ratio: the damage is rounded to a
   whole number and the test player's baseline is small, so one rounding step
   on a 14 shows up as a 7% ratio error while still being exactly right. +-1.5
   is a rounding step and change, and 1.20 vs 2.0 stay far apart even at 14
   (17 vs 28), so the tolerance cannot let the wrong multiplier through. */
const times = (got, base, mul) => Math.abs(got - base * mul) <= 1.5;

const psM = room.playerState.buyer;
delete psM._buffs;
const plainDmg = swing(psM);
check('a swing with no damage buff is the baseline', plainDmg > 0, plainDmg);

/* Cooked food: sets the timer and states NO magnitude -> the 1.20 fallback. */
psM._buffs = { damage: Date.now() + 60000 };
const foodDmg = swing(psM);
check('a cooked meal is still exactly the x1.20 it always was',
  times(foodDmg, plainDmg, 1.20), { plainDmg, foodDmg });

/* The tonic: bought through the real purchase path, not hand-set. */
psM.coins = 1000;
delete psM._buffs;
room._handleShopPurchase({ id: 'buyer' }, { itemId: 'whetstone' });
const tonicDmg = swing(psM);
check('the Fury Tonic doubles the damage the room applies',
  times(tonicDmg, plainDmg, 2.0), { plainDmg, tonicDmg, buffs: psM._buffs });

/* The regression that nearly shipped: _pruneBuffs read every key in _buffs as
   an endsAt, and `damageMul: 2` is a number that is very much <= now -- so the
   _saveRpg on the line after the purchase deleted the multiplier and the
   tonic quietly degraded to a cooked fish. */
room._pruneBuffs(psM);
check('...and the multiplier survives a save (it is not an expiring timer)',
  times(swing(psM), plainDmg, 2.0), psM._buffs);

/* The other half, and it goes through the REAL cook handler rather than a
   hand-written mimic of it -- recipe 2 is the game's damage-buff meal
   (2x herb_firebloom, 90s). A test that re-implements the line it is
   checking passes no matter what cooking.js does. */
psM.inventory = Object.assign(Object.create(null), psM.inventory, { herb_firebloom: 2 });
room._handleCookRecipe({ id: 'buyer' }, { recipeIdx: 2 });
check('the meal really was cooked (or the next check is vacuous)',
  psM._buffs.damage > Date.now(), psM._buffs);
check('a meal eaten during a tonic does NOT inherit the x2',
  times(swing(psM), plainDmg, 1.20), psM._buffs);

/* Persisted state is attacker-controlled once a blob is restored, so the read
   is bounded rather than trusted. */
psM._buffs = { damage: Date.now() + 60000, damageMul: 9999 };
check('an absurd stored multiplier is rejected, not applied',
  times(swing(psM), plainDmg, 1.20), { got: swing(psM), plainDmg });
Math.random = _realRandom;
delete psM._buffs;

/* ═══ v2.3.2127: BUYING A POTION PUTS A BOTTLE IN YOUR BAG ═══
   Owner: "Also work on putting a potions to inventory after buying."

   This REPLACES the v2.3.2063 assertions, and the reason they were right and
   are now wrong is worth keeping: what you bought used to be the EFFECT,
   applied at the counter, because "the bag has no way to open one (cooked fish
   is its only usable consumable)". _handleDrinkRequest is that way, so the
   bottle can be carried. The effect itself is unchanged -- it now runs on the
   drink instead of on the sale, through the same _applyShopItem. */
const buyer2 = { coins: 200, inventory: Object.create(null), maxMana: 100, mana: 10,
  maxHp: 100, hp: 100, maxStamina: 100, stamina: 100 };
const beforeCoins = buyer2.coins;
const rBuy = await room._shopBuy(buyer2, 'swiftDraught', 1);
check('a staple can be bought off his shelf', rBuy.ok && rBuy.staple === true, rBuy);
check('...for the vendor\'s price', beforeCoins - buyer2.coins === SHOP_ITEMS.swiftDraught.cost,
  { spent: beforeCoins - buyer2.coins });
check('...and what you get is a BOTTLE IN THE BAG',
  buyer2.inventory.swiftDraught === 1, buyer2.inventory);
/* The buy must NOT run the effect any more -- a potion that fires at the
   counter AND stacks in the bag is one purchase paying twice. */
check('...and the effect has NOT fired yet -- it waits for the drink',
  !room._buffActive(buyer2, 'spd'), buyer2._buffs);

/* The pile is untouched by a staple sale -- no decay, nothing to run out. */
const stockBefore = JSON.stringify(await room._shopStock());
await room._shopBuy(buyer2, 'manaShard', 1);
check('buying a staple does not move the public pile',
  JSON.stringify(await room._shopStock()) === stockBefore, stockBefore);
check('...and it is still on the shelf afterwards, at the same price',
  (await room._shopList()).items.some((i) => i.key === 'manaShard' && i.staple
    && i.sell === SHOP_ITEMS.manaShard.cost), null);

/* v2.3.2127: five now means five. "Always one" was forced by the effect not
   stacking; five BOTTLES stack perfectly well and are drunk one at a time. */
const buyer3 = { coins: 1000, inventory: Object.create(null), maxMana: 100, mana: 0,
  maxHp: 100, hp: 100, maxStamina: 100, stamina: 100 };
const r5 = await room._shopBuy(buyer3, 'whetstone', 5);
check('asking for five staples buys five bottles, at five times the price',
  r5.ok && r5.bought === 5 && buyer3.inventory.whetstone === 5
  && 1000 - buyer3.coins === SHOP_ITEMS.whetstone.cost * 5,
  { r5, spent: 1000 - buyer3.coins, bag: buyer3.inventory });

/* ═══ v2.3.2127: AND THE BOTTLE OPENS ═══
   The half v2.3.2063 said did not exist. Four properties, and the last two are
   the ones that would ship broken quietly. */
const drinker = { coins: 0, inventory: { swiftDraught: 2 }, maxMana: 100, mana: 0,
  maxHp: 100, hp: 100, maxStamina: 100, stamina: 100 };
const dSess = { id: 'p_drink' };
room.playerState[dSess.id] = drinker;
room._handleDrinkRequest(dSess, { invKey: 'swiftDraught' });
check('drinking a potion runs its effect',
  room._buffActive(drinker, 'spd') && drinker._buffs.spdMul === 1.5, drinker._buffs);
check('...and consumes exactly one of them', drinker.inventory.swiftDraught === 1,
  drinker.inventory);
/* A key that is not a shop item must not reach ps.inventory at all -- the
   guard is hasOwnProperty against SHOP_ITEMS, which is also the rule-4
   protection ('__proto__' is not an own property of it). */
const forged = { coins: 0, inventory: { swiftDraught: 1 }, maxHp: 100, hp: 100 };
const fSess = { id: 'p_forge' };
room.playerState[fSess.id] = forged;
room._handleDrinkRequest(fSess, { invKey: '__proto__' });
room._handleDrinkRequest(fSess, { invKey: 'cooked_fish_trout' });
check('a forged or non-shop key drinks nothing and pollutes nothing',
  forged.inventory.swiftDraught === 1 && ({}).spdMul === undefined
  && Object.prototype.spdMul === undefined, forged.inventory);
/* Refused mid-arena: _applyShopItem returns false, and the bottle must still
   be there. Consuming on a refusal is strictly worse than the sale it replaced
   -- the potion vanishes and does nothing. */
const fighter = { coins: 0, inventory: { cookedMinnow: 1 }, maxHp: 100, hp: 10,
  _arenaMatch: 't1' };
const gSess = { id: 'p_arena' };
room.playerState[gSess.id] = fighter;
room._handleDrinkRequest(gSess, { invKey: 'cookedMinnow' });
check('a refused drink keeps the bottle and heals nothing',
  fighter.inventory.cookedMinnow === 1 && fighter.hp === 10, fighter);

/* Broke is refused, and costs nothing. */
const skint = { coins: 1, inventory: Object.create(null), maxMana: 100, mana: 0,
  maxHp: 100, hp: 100, maxStamina: 100, stamina: 100 };
const rNo = await room._shopBuy(skint, 'whetstone', 1);
check('a player who cannot afford it is refused, and keeps their coin',
  !rNo.ok && skint.coins === 1 && !room._buffActive(skint, 'damage'), { rNo, skint });

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
