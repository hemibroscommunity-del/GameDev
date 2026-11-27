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
import { SHOP, isShopPotion, isCookhouseDish, isCookedFood, TOOL_SHELF, isToolKey, toolEarned } from '../src/shop.js';
import { SHIELD_KEY, SHIELD_PRICE, SHIELD_ITEM, shieldEarned, shieldWhyNot } from '../src/shop.js';   /* v2.3.6800 */
import { questShieldMint } from '../src/quests.js';   /* v2.3.6800: the one mint */
import { goldLogOf } from '../src/gold.js';   /* v2.3.6800: which road the coins left by */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { SHOP_ITEMS } from '../src/data.js';   /* v2.3.2063: his staple shelf */
/* v2.3.3184: every key the game mints, read out of the tables that mint them */
import * as DATA from '../src/data.js';
import { SMELT } from '../src/smelting.js';
import { HARDENED_WOOD } from '../src/hardenedwood.js';
import { TRAPPING } from '../src/trapping.js';
import { FARM } from '../src/farm.js';
import { SALVAGE, essenceKey } from '../src/salvage.js';
import { CHEST } from '../src/dailychest.js';
import { GEM_ELEMENTS, gemRawKey, gemCutKey } from '../src/gems.js';   /* v2.3.3516: gems are bag items */
import { SHARD_CRACK, shardCrackChance } from '../src/shardcrack.js';
import { EVENT_CAPES, capeItemKey } from '../src/eventcapes.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      /* v2.3.3137: a COPY, as Durable Object storage keeps (it structured-clones
         on put).  By reference, a saved record went on changing with the live
         player, and a check of what storage holds could not fail. */
      put: async (k, v) => { store.set(k, structuredClone(v)); },
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
   Owner, then: the consumables go, and "his inventory can just start with a
   few cooked fish" -- a SEED of six cooked trout, ordinary decaying stock.
   v2.3.3132: NOTHING.  Owner: "Remove all of Diego's potions. I want food and
   drink to come exclusively from farming and recipes."  The trout came from
   nowhere, and his staple shelf (DIEGO_SHELF) is empty. */
const fresh = makeState();
const room3 = new GameRoom(fresh, mockEnv);
const seeded = await room3._shopList();
/* v2.3.3316: ...but the three gathering tools he sells back (TOOL_SHELF), no
   count, never a staple */
/* v2.3.6800: ...and the Pine Shield he sells back (SHIELD_KEY), the same way */
check('a brand-new world finds nothing on him but the tools and the shield he sells back: no seeded fish and no staples (v2.3.3132; the tools v2.3.3316; the shield v2.3.6800)',
  seeded.items.every((i) => (i.tool === true ? isToolKey(i.key) : i.shield === true && i.key === 'pine_shield') && !i.staple && i.qty === null)
    && seeded.items.map((i) => i.key).join(',') === 'fishing_pole,mining_pickaxe,pine_shield,woodcutting_axe' && Object.keys(SHOP.SEED).length === 0, seeded.items);
/* A world whose pile took its six trout before v2.3.3132 still has them
   stored: they must neither show nor sell. */
const oldPile = await room3._shopStock();
oldPile.cooked_fish_trout = 6;
await room3._shopSaveStock(oldPile);
const oldList = await room3._shopList();
const psC = { coins: 10000, inventory: Object.create(null) };
const boughtOld = await room3._shopBuy(psC, 'cooked_fish_trout', 6);
check('...and an old pile\'s cooked trout are neither listed nor sold',
  !oldList.items.some((i) => i.key === 'cooked_fish_trout') && !boughtOld.ok
  && psC.coins === 10000 && !psC.inventory.cooked_fish_trout, { listed: oldList.items, boughtOld });
/* He buys no cooked food -- it would go back on his shelf -- but still buys
   the raw catch, as he buys the farm's crops. */
const cook = { coins: 0, inventory: Object.assign(Object.create(null), { cooked_fish_trout: 2, fish_trout: 2 }) };
const rCooked = await room3._shopSell(cook, 'cooked_fish_trout', 1);
const qCooked = await room3._shopQuote('cooked_fish_trout', 1, 'sell');
const rRaw = await room3._shopSell(cook, 'fish_trout', 1);
check('he buys no cooked fish (refused, quoted at nothing) but still buys the raw catch',
  !rCooked.ok && cook.inventory.cooked_fish_trout === 2 && qCooked.qty === 0
  && rRaw.ok && cook.inventory.fish_trout === 1 && cook.coins > 0, { rCooked, qCooked, rRaw, coins: cook.coins });

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
/* v2.3.3184: a real key -- 'ok_key' has no price now, and he quotes nothing
   he has no price for */
const junk = await room._shopList([123, null, {}, 'x'.repeat(500), 'ore_iron_ore']);
check('a malformed quote list is filtered rather than trusted',
  junk.items.some((i) => i.key === 'ore_iron_ore')
  && !junk.items.some((i) => typeof i.key !== 'string' || i.key.length > 64), junk.items.length);
const many = await room._shopList(Array.from({ length: 500 }, (_, i) => 'k' + i));
check('...and a huge one is capped', many.items.length < 100, many.items.length);

/* ═══ v2.3.3184: A FAMILY PRICES ITS OWN, AND NOTHING ELSE HAS A PRICE ═══
   His pricer matched a family ANYWHERE in a key (`k.indexOf(pre)`), so a key
   merely containing `essence_godly_` priced at 250,000 and `crowbar_` as a
   bar; and anything matching no family fell to a 20-coin default -- a golden
   ticket he bought for 10 was one of the contest's ten capes for whoever paid
   20, a quest's pickaxe skipped its quest, the old daily chest paid more to
   open than 20.  Now a family matches as a family (shop.js shopFamilyMatch),
   and a key with no price is neither bought nor sold.  Every key the game
   mints keeps its exact price, but the five kinds that had only the default. */
{
  const keys = new Map();
  const add = (k, src) => { if (typeof k === 'string' && k && !keys.has(k)) keys.set(k, src); };
  for (const t of ['tree', 'rock', 'fishSpot']) for (const tier of [1, 6, 11, 16, 21]) {
    const k = room._harvestInvKey(t, tier);
    add(k, 'gathering');
    if (t === 'fishSpot') add('cooked_' + k, 'cooked');
  }
  add('burnt_dust', 'burnt');
  for (const [bar, r] of Object.entries(SMELT.RECIPES)) { add(bar, 'smelt'); add(r.ore, 'gathering'); }
  for (const [hw, r] of Object.entries(HARDENED_WOOD.RECIPES)) { add(hw, 'hardened wood'); add(r.log, 'gathering'); }
  add(TRAPPING.TRAP, 'traps'); add(TRAPPING.LEGACY_TRAP, 'legacy trap');
  for (const g of SALVAGE.ESSENCE_GRADES) for (const m of Object.keys(SALVAGE.METALS)) add(essenceKey(g, m), 'salvage');
  for (const c of Object.values(FARM.CROPS)) { add(c.seed, 'seed'); add(c.item, 'crop'); }
  add(FARM.COMPOST, 'compost');
  for (const r of DATA.COOKING_RECIPES) add(r.makes, 'cooking');
  for (const k of Object.keys(DATA.DISHES)) add(k, 'dish');
  for (const k of Object.keys(DATA.SHOP_ITEMS)) add(k, 'shop item');
  for (const k of Object.values(room._GATHER_TOOL_FOR_SKILL)) add(k, 'tool');
  for (const k of ['fire-goblin-remnants', 'skeleton-remnants', 'slime-remnants', 'snowman']) add(k, 'remains');
  for (const z of Object.keys(DATA.ZONES)) add('shard_' + z, 'shard');
  add(DATA.RARE_GEM_KEY, 'rare gem');
  for (const e of GEM_ELEMENTS) { add(gemRawKey(e), 'raw gem'); add(gemCutKey(e), 'gem'); }   /* v2.3.3516 */
  add(CHEST.KEY, 'daily chest');
  for (const [id, def] of Object.entries(EVENT_CAPES)) { add(def.ticket, 'ticket'); add(capeItemKey(id), 'cape'); }
  for (const q of Object.values(DATA.QUEST_REWARDS)) {
    for (const it of [].concat(q.item || [], q.grantOnAccept || [])) if (it && it.kind === 'inv') add(it.key, 'quest');
  }
  /* the old rule, to compare against */
  const oldBase = (key) => {
    const k = key.toLowerCase();
    let best = 0, val = SHOP.BASE_DEFAULT;
    for (const pre in SHOP.BASE) if (k.indexOf(pre) !== -1 && pre.length > best) { best = pre.length; val = SHOP.BASE[pre]; }
    return val;
  };
  const NO_PRICE = new Set(['ticket', 'cape', 'tool', 'daily chest', 'legacy trap']);
  const moved = [], kept = [], dropped = [];
  for (const [k, src] of keys) {
    const now = room._shopBaseValue(k);
    if (NO_PRICE.has(src)) { if (now !== null) dropped.push([k, now]); continue; }
    if (isShopPotion(k) || isCookhouseDish(k) || isCookedFood(k)) continue;   /* food and drink: refused before any price is read */
    if (now !== oldBase(k)) moved.push([k, src, oldBase(k), now]); else kept.push(k);
  }
  check('every key the game mints keeps its exact price (' + kept.length + ' keys)', moved.length === 0 && kept.length > 80, moved);
  check('...the golden tickets, cape trophies, quest tools, old daily chest and legacy trap have NO price (they had the 20 default)',
    dropped.length === 0 && [...keys.values()].filter((v) => NO_PRICE.has(v)).length >= 6, dropped);
  check('...and the box trap and burnt dust keep that 20 as their own price',
    room._shopBaseValue('trap_box') === 20 && room._shopBaseValue('burnt_dust') === 20);
  /* v2.3.3516: THE GEMS' PRICES (the gem plan, Phase 2).  The Rare Gem cuts
     into any of the eight elemental gems now (shardcrack.js), so it is worth
     one; a raw gem is about ten shards' cracking and an elemental gem three
     raw gems, each priced above what went into it, so cracking and combining
     never lose money against selling the shards. */
  {
    const raw = room._shopBaseValue('gem_raw_flame'), cut = room._shopBaseValue('gem_flame');
    check('a raw gem is 1,200 and an elemental gem 4,000 (every element, Flora too)',
      [...GEM_ELEMENTS].every((e) => room._shopBaseValue(gemRawKey(e)) === 1200 && room._shopBaseValue(gemCutKey(e)) === 4000)
        && raw === 1200 && cut === 4000, { raw, cut, flora: room._shopBaseValue('gem_flora') });
    check('...the Rare Gem is an elemental gem\'s price (one becomes the other: no buying one cheap to sell the gem)',
      room._shopBaseValue('rare_gem') === cut, room._shopBaseValue('rare_gem'));
    const shard = room._shopBaseValue('shard_frost');
    const shardsPerRaw = SHARD_CRACK.SIDES / shardCrackChance(1);
    check('...a raw gem is worth more than the shards it takes at Gem Cutting 1 (10 x 110), a gem more than its three raw gems',
      raw > shardsPerRaw * shard && cut > SHARD_CRACK.RAW_PER_GEM * raw, { raw, shard, shardsPerRaw, cut });
    check('...and only as a family: no price for a look-alike or a bare "gem"',
      ['gem', 'gems_flame', 'xgem_flame', 'my_gem_raw_frost', 'gemraw_flame'].every((k) => room._shopBaseValue(k) === null),
      ['gem', 'gems_flame', 'xgem_flame', 'my_gem_raw_frost', 'gemraw_flame'].map((k) => [k, room._shopBaseValue(k)]));
  }
  /* look-alikes: a family only as a family */
  const lookalikes = ['xessence_godly_mithril', 'my_essence_elite_thing', 'crowbar_', 'hardened', 'shard', 'ore', 'bat-wing', 'not_a_real_thing', 'cratebar_iron'];
  check('a key that only CONTAINS a family has no price (was 250,000 for xessence_godly_..., a bar for crowbar_)',
    lookalikes.every((k) => room._shopBaseValue(k) === null), lookalikes.map((k) => [k, room._shopBaseValue(k)]));
  check('...while the families still price their own: a prefix, a remains suffix, a camelCase exact',
    room._shopBaseValue('essence_godly_iron') === 250000 && room._shopBaseValue('bar_iron') === 48 /* v2.3.3981: was 240 */ && room._shopBaseValue('slime-remnants') === 18
      && room._shopBaseValue('manaShard') === 18 && room._shopBaseValue('cooked_fish_trout') === 45 && room._shopBaseValue('crop_carrot') === 8);

  /* he neither buys nor sells what has no price */
  const tk = Object.values(EVENT_CAPES)[0].ticket;
  const seller = { coins: 0, inventory: { [tk]: 1, mining_pickaxe: 1 } };
  const r1 = await room._shopSell(seller, tk, 1);
  const r2 = await room._shopSell(seller, 'mining_pickaxe', 1);
  check('he buys no golden ticket and no quest tool (paid 10 each before)', !r1.ok && !r2.ok && seller.coins === 0 && seller.inventory[tk] === 1 && seller.inventory.mining_pickaxe === 1, { r1, r2 });
  const q1 = await room._shopQuote(tk, 1, 'sell');
  check('...quotes nothing for one', q1.ok && q1.total === 0 && q1.qty === 0, q1);
  /* a pile that took a ticket in under the old default keeps it, unsold */
  const st = await room._shopStock();
  st[tk] = 2; st.mining_pickaxe = 1;
  await room._shopSaveStock(st);
  const shelf = await room._shopList([tk]);
  /* v2.3.3316: the pickaxe is on his shelf now as a TOOL he sells back, a row
     with no count -- never as pile stock */
  check('...lists none from his pile (two tickets and a pickaxe bought at the old default)', !shelf.items.some((i) => i.key === tk || (i.key === 'mining_pickaxe' && !i.tool)), shelf.items.map((i) => i.key + (i.tool ? '(tool)' : '')));
  const buyer = { coins: 1000, inventory: {} };
  const r3 = await room._shopBuy(buyer, tk, 1);
  const r4 = await room._shopBuy(buyer, 'mining_pickaxe', 1);
  check('...and sells none of them: a cape for 20, a pickaxe without the quest', !r3.ok && !r4.ok && buyer.coins === 1000 && !buyer.inventory[tk] && (await room._shopStock())[tk] === 2, { r3, r4 });
  const gemSeller = { coins: 0, inventory: { rare_gem: 1 } };
  const r5 = await room._shopSell(gemSeller, 'rare_gem', 1);
  /* v2.3.3516: an elemental gem's price, half of it paid (shop.js) */
  check('...the rare gem sells for 2,000 now (half its 4,000: it cuts into a gem)', r5.ok && gemSeller.coins === 2000, r5);
}

/* ═══ v2.3.2056: THE TONIC ACTUALLY DOES SOMETHING ═══
   Owner: "Make it worthwhile to buy a potion."

   It did nothing. The purchase path used to carry the line "dmgBuff: no-op
   server-side (transient buff state)" -- and the server is authoritative for
   damage, so the tonic set a timer on the CLIENT, the client drew bigger
   numbers, and the damage the room applied was unchanged. This is the test
   that would have caught that, and it is written against the DAMAGE, not
   against the timer, because a timer that no combat path reads is exactly
   the bug being fixed. */
/* v2.3.3130: the tonic is a BOTTLE now -- brewed at the Cookhouse, or one
   bought from him before he stopped selling them -- so it is drunk from the
   bag (potion_drink) rather than bought through the vendor building's
   shop_purchase, which now sells only his shelf. */
const psD = room.playerState.buyer;
psD.coins = 1000;
delete psD._buffs;
psD.inventory = Object.assign(Object.create(null), psD.inventory, { whetstone: 2 });
check('no damage buff before drinking one', !room._buffActive(psD, 'damage'));
room._handleShopPurchase({ id: 'buyer' }, { itemId: 'whetstone' });
check('the vendor building no longer sells the Fury Tonic (off his shelf)',
  !room._buffActive(psD, 'damage') && psD.coins === 1000, { coins: psD.coins, buffs: psD._buffs });
room._handleDrinkRequest({ id: 'buyer' }, { invKey: 'whetstone' });
check('drinking the Fury Tonic sets a REAL server-side damage buff',
  room._buffActive(psD, 'damage'), psD._buffs);
check('...and the combat path is the one that reads it',
  psD._buffs.damage > Date.now() + 2.5 * 60 * 1000,
  { remainingMs: psD._buffs.damage - Date.now() });
check('...and it used up one bottle', psD.inventory.whetstone === 1, psD.inventory);
/* Two in a row must EXTEND from now, not stack into a bigger multiplier --
   there is one damage flag and combat reads it as a boolean. */
const firstEnd = psD._buffs.damage;
room._handleDrinkRequest({ id: 'buyer' }, { invKey: 'whetstone' });
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

/* The tonic: drunk through the real drink path, not hand-set (v2.3.3130: from
   the bag, now that he no longer sells it). */
delete psM._buffs;
psM.inventory = Object.assign(Object.create(null), psM.inventory, { whetstone: 1 });
room._handleDrinkRequest({ id: 'buyer' }, { invKey: 'whetstone' });
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
   hand-written mimic of it -- recipe 2 is the game's damage drink, the
   Firebloom Tea (2x herb_firebloom). A test that re-implements the line it is
   checking passes no matter what cooking.js does.  v2.3.3130: an OLD client's
   cook (no `carry`) -- the tea is made and drunk at once, in the brew slot,
   so it replaces the tonic. */
psM.inventory = Object.assign(Object.create(null), psM.inventory, { herb_firebloom: 2 });
psM.lifeSkills = Object.assign(psM.lifeSkills || {}, { cooking: { level: 6, xp: 0 } });   /* v2.3.3127: the Tea asks Cooking 6 (cooking.js) */
room._handleCookRecipe({ id: 'buyer' }, { recipeIdx: 2 });
/* v2.3.3127: and the herbs went -- the tonic's own damage timer satisfied
   the first half alone, so a refused cook passed this guard. */
check('the meal really was cooked (or the next check is vacuous)',
  psM._buffs.damage > Date.now() && !psM.inventory.herb_firebloom, { buffs: psM._buffs, inv: psM.inventory });
check('a tea drunk during a tonic does NOT inherit the x2',
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
/* v2.3.3132: there is no bottle to buy from him any more -- the last two,
   the Cooked Minnow and the Stamina Salts, came off his shelf ("Remove all of
   Diego's potions"); the salts are brewed at the Cookhouse as the Stamina
   Tonic.  What stays true is the rest of this section: a bottle in a bag is
   drunk from it (below), and he never takes one back. */
const buyer2 = { coins: 200, inventory: Object.create(null), maxMana: 100, mana: 10,
  maxHp: 100, hp: 100, maxStamina: 100, stamina: 40 };
const beforeCoins = buyer2.coins;
for (const k of ['staminaSalts', 'cookedMinnow']) {
  const rStaple = await room._shopBuy(buyer2, k, 1);
  check('he no longer sells ' + k + ' (v2.3.3132): refused, no coins taken, nothing in the bag',
    !rStaple.ok && buyer2.coins === beforeCoins && !buyer2.inventory[k] && buyer2.stamina === 40, { rStaple, bag: buyer2.inventory });
  const qStaple = await room._shopQuote(k, 1, 'buy');
  check('...and quotes nothing for it', qStaple.qty === 0 && qStaple.total === 0, qStaple);
}
check('...and nothing on his list is a staple any more',
  !(await room._shopList()).items.some((i) => i.staple), (await room._shopList()).items.filter((i) => i.staple));
/* The vendor building's shop_purchase sells his shelf, which is empty. */
const vb = room.playerState.buyer;
vb.coins = 500;
vb.stamina = 10; vb.maxStamina = 100;
room._handleShopPurchase({ id: 'buyer' }, { itemId: 'staminaSalts' });
room._handleShopPurchase({ id: 'buyer' }, { itemId: 'cookedMinnow' });
check('...nor does the vendor building (shop_purchase): no coins taken, no stamina given',
  vb.coins === 500 && vb.stamina === 10, { coins: vb.coins, stamina: vb.stamina });

/* ═══ v2.3.3130: THE TONICS ARE OFF HIS SHELF, AND STILL NOT BOUGHT BACK ═══ */
const rTonic = await room._shopBuy(buyer2, 'swiftDraught', 1);
check('a tonic can no longer be bought from him (brewed at the Cookhouse now)',
  !rTonic.ok && !buyer2.inventory.swiftDraught && buyer2.coins === beforeCoins, { rTonic, bag: buyer2.inventory });
const seller = { coins: 0, inventory: Object.assign(Object.create(null), { whetstone: 2, staminaSalts: 1 }) };
const rBack = await room._shopSell(seller, 'whetstone', 1);
const rBack2 = await room._shopSell(seller, 'staminaSalts', 1);
check('...and he does not buy one back either -- the bottles stay, no coins move',
  !rBack.ok && !rBack2.ok && seller.inventory.whetstone === 2 && seller.inventory.staminaSalts === 1 && seller.coins === 0, { rBack, rBack2, seller });
const qBack = await room._shopQuote('whetstone', 1, 'sell');
check('...and his quote for it says so (nothing), so the drawer offers no Sell',
  qBack.ok && qBack.qty === 0 && qBack.total === 0, qBack);
const listed = await room._shopList(['whetstone', 'ore_copper']);
check('...and he quotes no buy price for a tonic in your bag',
  !listed.items.some((i) => i.key === 'whetstone'), listed.items.map((i) => i.key));

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

/* ═══ v2.3.3137: A TRADE WITH DIEGO IS SAVED ═══
   Through the real message path, storage must hold the trade. Before this,
   neither shop_sell nor shop_buy saved the player: a sale followed by a
   reconnect came undone (coins gone, goods back in the bag) while Diego's
   pile, which WAS saved, kept the goods too. */
{
  const tick = () => new Promise((r) => setTimeout(r, 10));
  const send = async (ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload })); await tick(); };
  const S1 = fakeWs('saver');
  await join(S1, 'saver');
  const p = room.playerState.saver;
  /* v2.3.3184: a real key (it was 'bat-wing', priced only because 'bat'
     was a SUBSTRING of it -- shop.js shopFamilyMatch) */
  p.inventory = { 'slime-remnants': 10 };
  p.coins = 100;
  room._saveRpg('saver', p);
  await tick();
  const pileBefore = ((await room._shopStock())['slime-remnants']) || 0;
  await send(S1, 'shop_sell', { key: 'slime-remnants', qty: 10 });
  const r1 = S1.sent.filter((m) => m.type === 'shop_result').pop();
  const st1 = state._store.get('rpg:saver');
  check('a sale to Diego is SAVED: storage holds the coins it paid and the bag without the goods',
    !!r1 && r1.payload.ok && p.coins > 100 && st1.coins === p.coins && !st1.inventory['slime-remnants'],
    { r1: r1 && r1.payload, mem: p.coins, stored: st1 && { coins: st1.coins, inv: st1.inventory } });
  check('...in the same batch as his pile', ((await room._shopStock())['slime-remnants'] || 0) === pileBefore + 10);
  /* the reconnect that used to undo it */
  room.sessions.delete(S1);
  delete room.playerState.saver;
  const S2 = fakeWs('saver2');
  await join(S2, 'saver');
  const q = room.playerState.saver;
  check('...so a reconnect keeps the sale: the coins stay and the goods do not come back',
    q.coins === st1.coins && !q.inventory['slime-remnants'], { coins: q.coins, inv: q.inventory });
  /* buying back from his pile */
  const c0 = q.coins;
  await send(S2, 'shop_buy', { key: 'slime-remnants', qty: 2 });
  const st2 = state._store.get('rpg:saver');
  check('a purchase from his pile is SAVED: storage holds the goods and the coins they cost',
    st2.inventory['slime-remnants'] === 2 && st2.coins < c0 && st2.coins === q.coins, { c0, stored: { coins: st2.coins, inv: st2.inventory } });
  /* (a staple bought off his shelf was checked here too; since v2.3.3132
     his shelf is empty -- DIEGO_SHELF, food and drink come from farming --
     so the purchase from his pile above is the purchase there is) */
}

/* ═══ v2.3.3163: NOT WITH THE DEAD, AND A REFUSAL IS NOBODY ELSE'S NEWS ═══
   Reproduced on main: a dying player bought 5 bars for 1,200 gold and the
   respawn wiped them; and every refused sale sent the whole pile to every
   player in the room (200 refusals, 200 copies to each bystander). */
{
  const tick = () => new Promise((r) => setTimeout(r, 10));
  const send = async (ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload })); await tick(); };
  const D = fakeWs('dead1');
  const W = fakeWs('watcher');
  await join(D, 'deadbro');
  await join(W, 'watcher');
  const d = room.playerState.deadbro;
  d.inventory = { 'slime-remnants': 10 };
  d.coins = 5000;
  room._saveRpg('deadbro', d);
  await tick();
  const results = () => D.sent.filter((m) => m.type === 'shop_result').map((m) => m.payload);
  for (const flag of ['dying', 'dead', 'disconnected']) {
    d[flag] = true;
    D.sent.length = 0;
    const pile0 = ((await room._shopStock())['slime-remnants']) || 0;
    await send(D, 'shop_sell', { key: 'slime-remnants', qty: 5 });
    await send(D, 'shop_buy', { key: 'slime-remnants', qty: 1 });
    const rs = results();
    check('a ' + flag + ' player can neither sell to Diego nor buy from him, and nothing moves',
      rs.length === 2 && rs.every((r) => !r.ok) && d.coins === 5000 && d.inventory['slime-remnants'] === 10
        && (((await room._shopStock())['slime-remnants']) || 0) === pile0,
      { rs, coins: d.coins, inv: d.inventory });
    d[flag] = false;
  }
  W.sent.length = 0;
  D.sent.length = 0;
  await send(D, 'shop_sell', { key: 'slime-remnants', qty: 0 });   /* refused: no quantity */
  await send(D, 'shop_buy', { key: 'no-such-thing', qty: 1 });   /* refused: nothing to buy */
  check('a refused sale or purchase sends the pile to its own player only, not to everyone',
    W.sent.filter((m) => m.type === 'shop_state').length === 0 && D.sent.filter((m) => m.type === 'shop_state').length === 2,
    { watcher: W.sent.filter((m) => m.type === 'shop_state').length, asker: D.sent.filter((m) => m.type === 'shop_state').length });
  W.sent.length = 0;
  await send(D, 'shop_sell', { key: 'slime-remnants', qty: 1 });
  check('...while a sale that changed the pile still reaches every player',
    W.sent.filter((m) => m.type === 'shop_state').length === 1 && results().pop().ok === true);
}

/* ═══ v2.3.3316: A LOST TOOL, BOUGHT BACK ═══
   A death in No man's land takes the axe, the rod and the pickaxe now; the
   owner: "Drop them, sell replacements" -- "the General Store sells a
   replacement to anyone who already earned that tool from the quest". */
{
  const tick = () => new Promise((r) => setTimeout(r, 10));
  const send = async (ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload })); await tick(); };
  const T = fakeWs('tools');
  await join(T, 'toolbro');
  const t = room.playerState.toolbro;
  const result = () => T.sent.filter((m) => m.type === 'shop_result').map((m) => m.payload).pop();
  const quote = () => T.sent.filter((m) => m.type === 'shop_quoted').map((m) => m.payload).pop();
  check('the tool shelf: an axe, a rod and a pickaxe, a flat price each', Object.keys(TOOL_SHELF).length === 3
    && ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe'].every((k) => isToolKey(k) && TOOL_SHELF[k] > 0) && !isToolKey('__proto__') && !isToolKey('ore_iron'));
  /* earned: read off the quest table the way the quests pay */
  check('...earned the way the quest pays it: the axe and the rod once life_1 is accepted, the pickaxe once it is turned in',
    toolEarned({ life_1: 'active' }, 'woodcutting_axe') && toolEarned({ life_1: 'active' }, 'fishing_pole') && !toolEarned({ life_1: 'active' }, 'mining_pickaxe')
    && toolEarned({ life_1: 'turnedIn' }, 'mining_pickaxe') && !toolEarned({}, 'woodcutting_axe') && !toolEarned({ life_1: 'available' }, 'fishing_pole')
    && !toolEarned(null, 'fishing_pole') && !toolEarned({ life_1: 'turnedIn' }, 'ore_iron'));
  /* a player no quest gave one */
  t._quests = Object.create(null);
  t.inventory = {};
  t.coins = 1000;
  T.sent.length = 0;
  await send(T, 'shop_quote', { key: 'woodcutting_axe', qty: 1, mode: 'buy' });
  await send(T, 'shop_buy', { key: 'woodcutting_axe', qty: 1 });
  check('a player the quest never gave one: the quote says why (quest), the buy is refused, nothing moves',
    quote().tool === true && quote().qty === 0 && quote().why === 'quest' && result().ok === false && /Mayor Bro/.test(result().error)
      && t.coins === 1000 && !t.inventory.woodcutting_axe, { q: quote(), r: result(), coins: t.coins });
  /* one who has one */
  t._quests.life_1 = 'active';
  t.inventory = { woodcutting_axe: 1 };
  await send(T, 'shop_quote', { key: 'woodcutting_axe', qty: 1, mode: 'buy' });
  await send(T, 'shop_buy', { key: 'woodcutting_axe', qty: 1 });
  check('...one who holds one: "have", refused -- a replacement, never a second', quote().why === 'have' && result().ok === false
    && /already/.test(result().error) && t.inventory.woodcutting_axe === 1 && t.coins === 1000, { q: quote(), r: result() });
  /* lost it */
  t.inventory = {};
  await send(T, 'shop_quote', { key: 'woodcutting_axe', qty: 5, mode: 'buy' });
  check('...one who lost it: quoted ONE at the shelf\'s price, whatever the quantity asked', quote().qty === 1 && quote().total === TOOL_SHELF.woodcutting_axe && !quote().why, quote());
  await send(T, 'shop_buy', { key: 'woodcutting_axe', qty: 5 });
  const st = state._store.get('rpg:toolbro');
  check('...bought: one axe in the bag, the price off the purse, and SAVED', result().ok === true && result().bought === 1 && t.inventory.woodcutting_axe === 1
    && t.coins === 1000 - TOOL_SHELF.woodcutting_axe && !!st && st.inventory.woodcutting_axe === 1 && st.coins === t.coins, { r: result(), coins: t.coins, st: st && { inv: st.inventory, coins: st.coins } });
  await send(T, 'shop_buy', { key: 'woodcutting_axe', qty: 1 });
  check('...and not a second one straight after', result().ok === false && t.inventory.woodcutting_axe === 1);
  /* the pickaxe waits for the turn-in */
  await send(T, 'shop_buy', { key: 'mining_pickaxe', qty: 1 });
  check('the pickaxe waits for life_1\'s turn-in', result().ok === false && !t.inventory.mining_pickaxe);
  t._quests.life_1 = 'turnedIn';
  t.coins = 50;
  await send(T, 'shop_buy', { key: 'mining_pickaxe', qty: 1 });
  check('...and for the gold', result().ok === false && /coins/i.test(result().error) && !t.inventory.mining_pickaxe && t.coins === 50, result());
  t.coins = 500;
  await send(T, 'shop_buy', { key: 'mining_pickaxe', qty: 1 });
  check('...turned in and paid: the pickaxe', result().ok === true && t.inventory.mining_pickaxe === 1 && t.coins === 500 - TOOL_SHELF.mining_pickaxe);
  /* he never buys one back */
  await send(T, 'shop_sell', { key: 'mining_pickaxe', qty: 1 });
  check('he never buys a tool back (no gold for a tool taken off the dead)', result().ok === false && t.inventory.mining_pickaxe === 1, result());
  /* the dead buy nothing */
  t.inventory = {};
  t.dying = true;
  await send(T, 'shop_buy', { key: 'mining_pickaxe', qty: 1 });
  check('the dying buy no tool', result().ok === false && !t.inventory.mining_pickaxe);
  t.dying = false;
  /* the kill switch */
  const keep = room._liveFlags;
  room._liveFlags = { ...(keep || {}), toolshop: false };
  const offList = await room._shopList();
  await send(T, 'shop_buy', { key: 'mining_pickaxe', qty: 1 });
  check('kill switch: toolshop:false takes them off his shelf and refuses a buy', !offList.items.some((i) => i.tool) && result().ok === false && !t.inventory.mining_pickaxe);
  room._liveFlags = keep;
}

/* ═══ v2.3.6800 (card SHOP): A LOST SHIELD, BOUGHT BACK ═══
   The owner, 2026-11-26: "make the store keeper sell shield I lost mine".
   Diego sells the Pine Shield tut_1 mints, 100 coins burnt, ONE, to a player
   a quest gave one who owns none (worn or spare).  In a running room, on a
   v1 and a v2 phone both.  The planted mistakes this section was seen red
   against: the give before the take with an await between (the "one run"
   check), the take's road named shop_tool (the gold log), the owns-one check
   reading only the arm (the spare), the price read from the message (a
   `price: 1` buy), the switch read as "true is on" (the absent flag), and the
   cap put on the old long line (the syntax tree of join.js). */
{
  const tick = () => new Promise((r) => setTimeout(r, 10));
  const send = async (ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload })); await tick(); };
  const joinV = async (ws, id, v) => {
    room.sessions.set(ws, baseSession());
    await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, ...(v === 2 ? { protocolVersion: 2 } : null), data: { x: 0, y: 0, z: 'town' } }));
  };
  /* the rule, pure */
  check('shield: the shelf sells tut_1\'s own Pine Shield, at the tools\' price', !!SHIELD_ITEM && SHIELD_ITEM.kind === 'shield' && SHIELD_ITEM.name === 'Pine Shield'
    && SHIELD_PRICE === 100 && SHIELD_KEY === 'pine_shield'
    && DATA.QUEST_REWARDS.tut_1.grantOnAccept.some((it) => it.kind === 'shield' && it.name === SHIELD_ITEM.name && it.gearBase === SHIELD_ITEM.gearBase && it.tierMult === SHIELD_ITEM.tierMult), SHIELD_ITEM);
  check('...earned the way the quest pays it: tut_1 accepted or turned in, never before',
    shieldEarned({ tut_1: 'active' }) && shieldEarned({ tut_1: 'turnedIn' }) && !shieldEarned({ tut_1: 'available' }) && !shieldEarned({}) && !shieldEarned(null));
  const given = { tut_1: 'active' };
  check('...the reasons, in lower case: off, have (worn), have (spare), quest, and none',
    shieldWhyNot({ _quests: given }, true) === 'off' && shieldWhyNot(null, false) === 'off'
    && shieldWhyNot({ _quests: given, shield: { name: 'x' } }, false) === 'have'
    && shieldWhyNot({ _quests: given, shield: null, shieldStash: [{ name: 'x' }] }, false) === 'have'
    && shieldWhyNot({ _quests: {}, shieldStash: [] }, false) === 'quest'
    && shieldWhyNot({ _quests: given, shield: null, shieldStash: [] }, false) === null);

  for (const v of [1, 2]) {
    const S = fakeWs('shield' + v), id = 'shieldbro' + v;
    await joinV(S, id, v);
    const p = room.playerState[id];
    const result = () => S.sent.filter((m) => m.type === 'shop_result').map((m) => m.payload).pop();
    const quote = () => S.sent.filter((m) => m.type === 'shop_quoted').map((m) => m.payload).pop();
    const nothing = (c0) => p.coins === c0 && !p.shield && (!Array.isArray(p.shieldStash) || p.shieldStash.length === 0);
    const tag = 'shield (v' + v + '): ';
    /* never given one */
    p._quests = Object.create(null);
    p.shield = null; p.shieldStash = []; p.coins = 150;
    S.sent.length = 0;
    await send(S, 'shop_quote', { key: SHIELD_KEY, qty: 1, mode: 'buy' });
    await send(S, 'shop_buy', { key: SHIELD_KEY, qty: 1 });
    check(tag + 'never given one: quoted "quest", refused, no coin taken, no shield given',
      quote().shield === true && quote().qty === 0 && quote().total === 0 && quote().why === 'quest' && result().ok === false && result().why === 'quest' && /Mayor Bro/.test(result().error) && nothing(150), { q: quote(), r: result() });
    /* one worn */
    p._quests.tut_1 = 'active';
    p.shield = questShieldMint(SHIELD_ITEM);
    await send(S, 'shop_buy', { key: SHIELD_KEY, qty: 1 });
    check(tag + 'one worn: refused "have", nothing moves', result().ok === false && result().why === 'have' && /already/.test(result().error) && p.coins === 150 && p.shieldStash.length === 0, result());
    /* one spare */
    p.shield = null; p.shieldStash = [questShieldMint(SHIELD_ITEM)];
    await send(S, 'shop_quote', { key: SHIELD_KEY, qty: 1, mode: 'buy' });
    await send(S, 'shop_buy', { key: SHIELD_KEY, qty: 1 });
    check(tag + 'one spare in the bag: quoted and refused "have", nothing moves', quote().why === 'have' && result().ok === false && result().why === 'have'
      && p.coins === 150 && p.shieldStash.length === 1 && !p.shield, { q: quote(), r: result() });
    /* 99 coins */
    p.shieldStash = []; p.coins = 99;
    await send(S, 'shop_buy', { key: SHIELD_KEY, qty: 1 });
    check(tag + '99 coins: refused "coins", nothing moves', result().ok === false && result().why === 'coins' && nothing(99), result());
    /* the switch off */
    p.coins = 150;
    const keep = room._liveFlags;
    room._liveFlags = { ...(keep || {}), shieldshop: false };
    const offList = await room._shopList();
    await send(S, 'shop_quote', { key: SHIELD_KEY, qty: 1, mode: 'buy' });
    await send(S, 'shop_buy', { key: SHIELD_KEY, qty: 1 });
    check(tag + 'shieldshop:false: off his shelf, quoted and refused "off", nothing moves', !offList.items.some((i) => i.shield) && quote().why === 'off'
      && result().ok === false && result().why === 'off' && nothing(150), { q: quote(), r: result() });
    /* the flag ABSENT is on (present and false is off), and true is on */
    room._liveFlags = { ...(keep || {}) }; delete room._liveFlags.shieldshop;
    const onList = await room._shopList();
    room._liveFlags = { ...(keep || {}), shieldshop: true };
    const onList2 = await room._shopList();
    room._liveFlags = keep;
    const row = onList.items.find((i) => i.key === SHIELD_KEY);
    check(tag + 'the flag absent (or true): on his shelf, one row at 100, no count', !!row && row.shield === true && row.sell === 100 && row.qty === null && row.name === 'Pine Shield'
      && onList2.items.some((i) => i.key === SHIELD_KEY), row);
    /* sold, with a price the message names that is never read */
    S.sent.length = 0;
    const log0 = goldLogOf(p).length;
    await send(S, 'shop_quote', { key: SHIELD_KEY, qty: 3, mode: 'buy' });
    check(tag + 'quoted ONE at 100, whatever the quantity asked', quote().qty === 1 && quote().total === 100 && !quote().why, quote());
    await send(S, 'shop_buy', { key: SHIELD_KEY, qty: 3, price: 1, cost: 1, sell: 1 });
    const r = result();
    const st = state._store.get('rpg:' + id);
    const sh = p.shieldStash[0];
    const ref = { _quests: { tut_1: 'active' } };
    room._grantQuestItem(ref, SHIELD_ITEM, null);
    const same = (a, b) => ['tier', 'tierMult', 'gearBase', 'name'].every((k) => a && b && a[k] === b[k]) && Object.keys(a).filter((k) => k !== 'gid' && k !== 'prov').sort().join() === Object.keys(b).filter((k) => k !== 'gid' && k !== 'prov').sort().join();
    check(tag + 'sold: coins fall by exactly 100, ONE Pine Shield in the bag, the quest\'s piece field for field, with its own id',
      r.ok === true && r.bought === 1 && r.cost === 100 && p.coins === 50 && !p.shield && p.shieldStash.length === 1 && same(sh, ref.shield)
        && typeof sh.gid === 'string' && !!sh.gid && r.shield && r.shield.gid === sh.gid && same(r.shield, sh), { r, coins: p.coins, sh, ref: ref.shield });
    const lg = goldLogOf(p).slice(log0);
    check(tag + '...the coins left by the road shop_shield, -100 (never shop_tool)', lg.length === 1 && lg[0].road === 'shop_shield' && lg[0].d === -100, lg);
    check(tag + '...and SAVED with the shield before the answer went', !!st && st.coins === 50 && Array.isArray(st.shieldStash) && st.shieldStash.length === 1 && st.shieldStash[0].gid === sh.gid,
      st && { coins: st.coins, ss: st.shieldStash });
    const iRes = S.sent.findIndex((m) => m.type === 'shop_result');
    const echo = S.sent.slice(iRes + 1).some((m) => m.type === 'player_state' || m.type === 'player_delta');
    check(tag + '...the answer first, then the purse\'s echo', iRes >= 0 && echo, S.sent.map((m) => m.type));
    /* the same buy again (the same opId), and again straight after */
    await send(S, 'shop_buy', { key: SHIELD_KEY, qty: 1, opId: 'shield-op-' + v });
    await send(S, 'shop_buy', { key: SHIELD_KEY, qty: 1, opId: 'shield-op-' + v });
    check(tag + 'the same buy twice: ONE shield, 100 taken once', p.shieldStash.length === 1 && p.coins === 50 && result().ok === false && result().why === 'have', result());
    /* he never buys one back */
    await send(S, 'shop_sell', { key: SHIELD_KEY, qty: 1 });
    check(tag + 'he never buys a shield back (no gold for a shield)', result().ok === false && p.coins === 50 && p.shieldStash.length === 1, result());
  }

  /* ONE RUN: the take, the give and the save happen before _shopBuy's first
     await -- read synchronously, before its promise is awaited */
  {
    const S = fakeWs('shieldsync'), id = 'shieldsync';
    await joinV(S, id, 2);
    const p = room.playerState[id];
    p._quests = { tut_1: 'active' }; p.shield = null; p.shieldStash = []; p.coins = 100;   /* exactly the price: buys, to 0 */
    const pr = room._shopBuy(p, SHIELD_KEY, 1, id);
    const st = state._store.get('rpg:' + id);
    const sync = p.coins === 0 && p.shieldStash.length === 1 && !!st && st.coins === 0 && st.shieldStash.length === 1;
    const r = await pr;
    check('shield: the take, the give and the save are one synchronous run (no await between)', sync && r.ok === true, { coins: p.coins, st: st && { coins: st.coins, n: (st.shieldStash || []).length } });
  }

  /* THE CAP ON ITS OWN LINE (TRAPS §316), read off join.js's syntax tree:
     `shieldshop` is a property of the caps literal, on a line of its own,
     not the literal's first (long) line, and above `accuracy` (TRAPS §333) */
  {
    const req = createRequire(import.meta.url);
    const { parse } = req('@babel/parser');
    const src = readFileSync(new URL('../src/join.js', import.meta.url), 'utf8');
    const ast = parse(src, { sourceType: 'module', plugins: ['jsx', 'classProperties', 'optionalChaining'], errorRecovery: true });
    let caps = null;
    const walk = (n) => {
      if (!n || typeof n !== 'object' || caps) return;
      if (n.type === 'ObjectProperty' && n.key && (n.key.name === 'caps' || n.key.value === 'caps') && n.value && n.value.type === 'ObjectExpression'
        && n.value.properties.some((q) => q.key && q.key.name === 'accuracy')) { caps = n.value; return; }
      for (const k of Object.keys(n)) { if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue; const c = n[k]; if (Array.isArray(c)) c.forEach(walk); else if (c && typeof c.type === 'string') walk(c); }
    };
    walk(ast.program);
    const props = caps ? caps.properties : [];
    const at = props.findIndex((q) => q.key && q.key.name === 'shieldshop');
    const me = props[at], first = props[0], acc = props.findIndex((q) => q.key && q.key.name === 'accuracy');
    const alone = !!me && me.loc.start.line !== first.loc.start.line
      && props.every((q, i) => i === at || (q.loc.start.line !== me.loc.start.line && q.loc.end.line !== me.loc.start.line));
    check('shield: the cap `shieldshop` is on its own line of join.js\'s caps, never the old long first line, and above `accuracy`', alone && at < acc,
      { found: !!caps, at, acc, line: me && me.loc.start.line, first: first && first.loc.start.line });
  }
}

/* ═══ v2.3.6800 (the mend of sitting 71's hold): A LOST ANSWER LOSES NOTHING ═══
   The gatekeeper: the phone learned of the bought shield ONLY from
   `shop_result.shield`, so a lost answer (or a phone that lost its copy of
   the bag) left the player 100 coins down, the shield unseen, and every buy
   refused "You already have one".  THE PHONE here is the page's own rule
   (src/game/shieldAdopt.js, called by gameEvents.js and wsClient.js with
   caps.shieldshop): every frame it RECEIVES goes through shieldsInFrame and
   adoptHeldShields, exactly as the page's handlers do; a frame it LOST never
   reaches it.  Three ways to lose the answer, on a v1 and a v2 phone: (a) the
   buy's answer is lost and the same reqId is sent again; (b) the phone
   rejoins after a buy whose answer it never got; (c) a phone with no copy of
   the piece opens the shelf (the quote) and asks to buy again (the refusal).
   In each the player SEES the shield they paid for, and paid once.  Seen RED
   on c36704eb (the phone adopting shop_result.shield alone, the worker's
   "have" carrying no piece). */
{
  const { adoptHeldShields, shieldsInFrame } = await import('../../src/game/shieldAdopt.js');
  const tick = () => new Promise((r) => setTimeout(r, 10));
  const send = async (ws, type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload })); await tick(); };
  const joinV = async (ws, id, v) => {
    room.sessions.set(ws, baseSession());
    await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, ws: [1, 5], ...(v === 2 ? { protocolVersion: 2 } : null), data: { x: 0, y: 0, z: 'town' } }));
    await tick();
  };
  /* the phone: its caps from state_sync, then each frame it got, through the page's rule */
  const newPhone = () => ({ caps: null, rpg: { shield: null, shieldStash: [] } });
  const receive = (phone, frames) => {
    for (const m of frames) {
      if (m.type === 'state_sync') phone.caps = m.caps || (m.payload && m.payload.caps) || phone.caps;
      if (!phone.caps || !phone.caps.shieldshop) continue;
      if (m.type === 'player_state' || m.type === 'shop_result' || m.type === 'shop_quoted') adoptHeldShields(phone.rpg, shieldsInFrame(m.type, m.payload));
    }
  };
  const sees = (phone, gid) => [phone.rpg.shield, ...phone.rpg.shieldStash].filter((x) => x && x.gid === gid).length;
  const ready = (p) => { p._quests = Object.create(null); p._quests.tut_1 = 'active'; p.shield = null; p.shieldStash = []; p.coins = 150; };

  for (const v of [1, 2]) {
    const tag = 'lost answer (v' + v + '): ';
    /* (a) the answer lost, the same reqId sent again on the same socket */
    {
      const ws = fakeWs('lostA' + v), id = 'lostabro' + v, phone = newPhone();
      await joinV(ws, id, v);
      receive(phone, ws.sent);
      const p = room.playerState[id];
      ready(p);
      ws.sent.length = 0;
      await send(ws, 'shop_buy', { key: SHIELD_KEY, qty: 1, reqId: 'rq-lost-a' + v });
      const bought = p.shieldStash[0];
      const paid = p.coins;
      ws.sent.length = 0;   /* every frame of the first answer: LOST */
      await send(ws, 'shop_buy', { key: SHIELD_KEY, qty: 1, reqId: 'rq-lost-a' + v });
      receive(phone, ws.sent);
      check(tag + '(a) the same reqId again: paid once (150 to 50), ONE shield on the worker, and the phone SEES it (by its id, once)',
        !!bought && paid === 50 && p.coins === 50 && p.shieldStash.length === 1 && sees(phone, bought.gid) === 1,
        { coins: p.coins, n: p.shieldStash.length, phone: phone.rpg.shieldStash, sent: ws.sent.map((m) => m.type) });
    }
    /* (b) a rejoin after a buy whose answer never came */
    {
      const ws = fakeWs('lostB' + v), id = 'lostbbro' + v, phone = newPhone();
      await joinV(ws, id, v);
      receive(phone, ws.sent);
      const p = room.playerState[id];
      ready(p);
      await send(ws, 'shop_buy', { key: SHIELD_KEY, qty: 1, reqId: 'rq-lost-b' + v });   /* its answer: LOST */
      const bought = p.shieldStash[0];
      const ws2 = fakeWs('lostB2' + v);
      phone.caps = null;   /* a new socket learns its caps again */
      await joinV(ws2, id, v);
      receive(phone, ws2.sent);
      const p2 = room.playerState[id];
      check(tag + '(b) the rejoin: paid once (50 left), and the phone SEES the shield it paid for (by its id, once)',
        !!bought && p2.coins === 50 && Array.isArray(p2.shieldStash) && p2.shieldStash.length === 1 && sees(phone, bought.gid) === 1,
        { coins: p2.coins, phone: phone.rpg.shieldStash, sent: ws2.sent.map((m) => m.type) });
      /* ...and a second rejoin adds nothing twice */
      const ws3 = fakeWs('lostB3' + v);
      await joinV(ws3, id, v);
      receive(phone, ws3.sent);
      check(tag + '(b) ...and every later state adds it never twice', sees(phone, bought.gid) === 1 && phone.rpg.shieldStash.length === 1, phone.rpg.shieldStash);
    }
    /* (c) a phone with no copy: it opens the shelf, then asks to buy again */
    {
      const ws = fakeWs('lostC' + v), id = 'lostcbro' + v;
      await joinV(ws, id, v);
      const p = room.playerState[id];
      ready(p);
      await send(ws, 'shop_buy', { key: SHIELD_KEY, qty: 1 });
      const bought = p.shieldStash[0];
      /* the quote: the row it may not buy carries what it owns */
      const q = newPhone();
      receive(q, ws.sent.filter((m) => m.type === 'state_sync'));
      ws.sent.length = 0;
      await send(ws, 'shop_quote', { key: SHIELD_KEY, qty: 1, mode: 'buy' });
      receive(q, ws.sent.filter((m) => m.type === 'shop_quoted'));
      const quoted = ws.sent.filter((m) => m.type === 'shop_quoted').pop();
      check(tag + '(c) a phone with no copy opens the shelf: quoted "have", and it SEES the shield it owns',
        !!bought && !!quoted && quoted.payload.why === 'have' && sees(q, bought.gid) === 1, { q: quoted && quoted.payload, phone: q.rpg.shieldStash });
      /* the buy: refused "You already have one", and that refusal shows it */
      const b = newPhone();
      b.caps = q.caps;   /* the same socket's caps */
      ws.sent.length = 0;
      await send(ws, 'shop_buy', { key: SHIELD_KEY, qty: 1 });
      receive(b, ws.sent.filter((m) => m.type === 'shop_result'));
      const res = ws.sent.filter((m) => m.type === 'shop_result').pop();
      check(tag + '(c) ...asks to buy again: refused "You already have one", NO coin taken, and it SEES the shield it owns',
        !!res && res.payload.ok === false && res.payload.why === 'have' && /already/.test(res.payload.error) && p.coins === 50 && p.shieldStash.length === 1 && sees(b, bought.gid) === 1,
        { r: res && res.payload, coins: p.coins, phone: b.rpg.shieldStash });
    }
  }

  /* (c) when the worker holds it on the ARM (the quest's grant puts a shield
     there): the "have" carries that piece too */
  {
    const ws = fakeWs('lostArm'), id = 'lostarmbro';
    await joinV(ws, id, 2);
    const caps = (ws.sent.find((m) => m.type === 'state_sync') || {}).caps;
    const p = room.playerState[id];
    ready(p);
    p.shield = { ...questShieldMint(SHIELD_ITEM), gid: 'arm-gid-1' };
    ws.sent.length = 0;
    await send(ws, 'shop_quote', { key: SHIELD_KEY, qty: 1, mode: 'buy' });
    await send(ws, 'shop_buy', { key: SHIELD_KEY, qty: 1 });
    const q = newPhone(); q.caps = caps;
    receive(q, ws.sent.filter((m) => m.type === 'shop_quoted'));
    const b = newPhone(); b.caps = caps;
    receive(b, ws.sent.filter((m) => m.type === 'shop_result'));
    check('lost answer: (c) the worker holds it on the arm: its "have" quote and refusal both carry it, the phone SEES it, no coin taken',
      sees(q, 'arm-gid-1') === 1 && sees(b, 'arm-gid-1') === 1 && p.coins === 150, { q: q.rpg, b: b.rpg });
  }

  /* the page's rule, pure: add, never take; never twice; an old copy with no
     id and the same signature counts as held; a piece with no id is never
     adopted; a quote's `shield: true` is no piece */
  {
    const P = (gid, name) => ({ tier: 'common', tierMult: 1, gearBase: 'wood', name: name || 'Pine Shield', ...(gid ? { gid } : null) });
    const r1 = { shield: P('g1'), shieldStash: [P('g2')] };
    const n1 = adoptHeldShields(r1, [P('g1'), P('g2'), P('g3'), P(null)]);
    const r2 = { shield: null, shieldStash: [P(null)] };
    const n2 = adoptHeldShields(r2, [P('g9')]);
    const n2b = adoptHeldShields(r2, [P('g8', 'Oak Shield')]);
    const r3 = { shield: null, shieldStash: [P('keep')] };
    adoptHeldShields(r3, []);
    check('shieldAdopt: adds only the piece held nowhere (by id), once; an old id-less copy of the same piece counts as held; never takes',
      n1 === 1 && r1.shieldStash.length === 2 && r1.shieldStash[1].gid === 'g3' && n2 === 0 && n2b === 1 && r2.shieldStash.length === 2 && r2.shieldStash[1].gid === 'g8' && r3.shieldStash.length === 1
        && adoptHeldShields(r1, [P('g3')]) === 0,
      { r1, r2, n1, n2, n2b });
    check('shieldAdopt: what a frame carries -- a state\'s shieldStash, a buy\'s shield, a "have"\'s held; a quote\'s `shield: true` and any other frame, none',
      shieldsInFrame('player_state', { shieldStash: [P('a')] }).length === 1 && shieldsInFrame('shop_result', { shield: P('b') }).length === 1
        && shieldsInFrame('shop_quoted', { shield: true, held: [P('c'), P('d')] }).length === 2 && shieldsInFrame('shop_quoted', { shield: true }).length === 0
        && shieldsInFrame('store_result', { shield: P('e') }).length === 0 && shieldsInFrame('player_state', null).length === 0);
  }
}

/* ═══ v2.3.3981: ONE ORE A BAR, ONE LOG A HARDENED WOOD -- NO GOLD TAP ═══
   The owner's one-to-one (smelting.js, hardenedwood.js) took a bar from five
   ore to one, and Diego's bar from 240 to 48 (hardened wood 144 to 29).  At
   the old prices a 40-coin ore smelted into a bar he paid 120 for.  For every
   bar and every hardened wood, with the switch on and with `onetoone: false`
   (five again, and the old prices with it):
     - buying the raw items from him and selling him what they make LOSES
       (his empty-pile offer for one is under his price for the raw it takes);
     - making it before selling is still worth a little, never a loss (his
       offer for one is above his offers for the raw it takes);
     - and he never offers more for one than he asks for it. */
{
  const rows = [
    ...Object.keys(SMELT.RECIPES).map((k) => ['smelt', k]),
    ...Object.keys(HARDENED_WOOD.RECIPES).map((k) => ['hardened', k]),
  ];
  const was = room._liveFlags;
  const bad = [];
  const seen = [];
  for (const off of [false, true]) {
    room._liveFlags = off ? { onetoone: false } : {};
    for (const [kind, k] of rows) {
      const r = kind === 'smelt' ? room._smeltRecipe(k) : room._hardenedWoodRecipe(k);
      const raw = kind === 'smelt' ? r.ore : r.log, n = kind === 'smelt' ? r.oreCost : r.logCost;
      const offer = room._shopBuyPrice(k, 0), ask = room._shopSellPrice(k);
      const rawAsk = room._shopSellPrice(raw), rawOffer = room._shopBuyPrice(raw, 0);
      seen.push([off ? 'off' : 'on', k, n, ask, offer, rawAsk, rawOffer]);
      if (!(offer < rawAsk * n)) bad.push(['buy raw, sell made: a profit', off, k, { offer, rawAsk, n }]);
      if (!(offer > rawOffer * n)) bad.push(['making it is a loss', off, k, { offer, rawOffer, n }]);
      if (!(ask > offer)) bad.push(['offer over ask', off, k, { ask, offer }]);
    }
  }
  room._liveFlags = was;
  check('no gold tap: for every bar and hardened wood, buying the ore or logs from Diego to sell him what they make loses, and making it before selling still earns a little (switch on and off)',
    bad.length === 0 && seen.length === 2 * rows.length, bad.length ? bad : seen);
  check('...the prices: a bar 48 and a hardened wood 29 at one ore or log each, 240 and 144 at five',
    seen.filter((x) => x[0] === 'on').every((x) => x[2] === 1 && x[3] === (/^bar_/.test(x[1]) ? 48 : 29))
      && seen.filter((x) => x[0] === 'off').every((x) => x[2] === 5 && x[3] === (/^bar_/.test(x[1]) ? 240 : 144)), seen);
  check('...and the switch moves only those two families (an ore, a log, an essence keep their price)',
    (() => { room._liveFlags = { onetoone: false }; const o = [room._shopBaseValue('ore_iron_ore'), room._shopBaseValue('wood_maple_wood'), room._shopBaseValue('essence_rare_copper'), room._shopBaseValue('crowbar_')]; room._liveFlags = was;
      return o[0] === 40 && o[1] === 24 && o[2] === 1500 && o[3] === null; })());
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
