/* ═══ v2.3.2047: SHOPKEEPER BRO'S STOCK ═══
 *
 * Owner: "Make it so you can buy and sell things from him. His inventory is
 * public so other players who sell monster remains (etc) can see it and buy
 * from him. The more quantity he has of a thing the cheaper he's willing to
 * buy from you."
 *
 * ── WHAT MAKES THIS DIFFERENT FROM THE MARKETPLACE ──
 * market.js is an ORDER BOOK: players set their own prices and trade with each
 * other, and the room only matches and settles. This is a MERCHANT: he has one
 * shared pile of goods, he names the price himself, and the price is a pure
 * function of how much of the thing he is already holding. Two different
 * economies, deliberately -- an order book needs a counterparty and a merchant
 * does not, so the merchant is what makes a slime tooth worth picking up at
 * 3am when nobody else is online.
 *
 * ── THE PRICE RULE, AND WHY IT IS THE WHOLE DESIGN ──
 * The owner's rule ("the more he has of a thing the less he'll pay") is a
 * self-balancing sink and it needs no tuning table to stay sane: the first
 * player to sell a stack of bones gets a good price, the tenth gets very
 * little, and the price recovers as players buy the pile back down. Nobody has
 * to nerf anything by hand when a farm becomes popular.
 *
 * It decays HYPERBOLICALLY (base / (1 + stock/SOFTEN)) rather than linearly:
 * a linear decay hits zero at some stock level and then has to be clamped,
 * which produces a cliff where one more sale is worth nothing. This curve
 * approaches a floor and never reaches it, so there is always a reason to
 * bring one more, just less of one.
 *
 * ONLY THE BUY SIDE DECAYS. What he CHARGES stays flat, which is what makes
 * the pile worth buying from: if his asking price fell with his stock too,
 * a glut would be cheap to buy and cheap to sell and the two would cancel.
 *
 * ── STORAGE ──
 *   shop_stock   {  <itemKey>: qty  }  -- ONE global record, not per item.
 * A bare key rather than a prefix family (precedent: harden_h5_log) because it
 * is read whole on every listing and there is exactly one shopkeeper. It is
 * the same record for everyone, which is the "public inventory" the owner
 * asked for: what you sell him is immediately what someone else can buy.
 *
 * ── SETTLEMENT ──
 * Both sides run as synchronous mutations of the player blob and this record
 * inside ONE Durable Object, under the same input gates as everything else --
 * so, exactly as market.js documents for its placement path, there is no
 * cross-object window to journal an opId against. The authoritative
 * player_state echo is the tiebreaker (handoff rule 20).
 */

import { SHOP_ITEMS } from './data.js';   /* v2.3.2063: his staple shelf */

/* ═══ v2.3.2063: THE THINGS HE ALWAYS HAS ═══
 *
 * Owner: "These potions should be purchasable there" -- there being
 * Shopkeeper Bro, not the vendor building.
 *
 * A STAPLE is not part of the pile, and the distinction is the whole reason
 * this is a separate list. The pile is public and player-driven: what someone
 * sells him is what you can buy, and his offer decays as it grows. Nobody can
 * sell him a potion, so a potion in the pile would be a finite stock that
 * drains once and never refills -- the shelf would work for a week and then
 * quietly stop selling potions forever. Staples sit outside that: fixed
 * price, always available, no decay, and buying one never moves the pile.
 *
 * THE ITEMS ARE THE VENDOR'S OWN, read out of SHOP_ITEMS rather than
 * re-listed, so the two shelves cannot drift into selling the same potion at
 * two prices with two effects. That table is already the one the server
 * applies effects from and the one mirror-audit pins the client against.
 *
 * BOUGHT ONE AT A TIME, because what you get is an EFFECT and only one runs
 * at a time (owner: "Only 1 effect active at a time though") -- so a stack of
 * five would charge for five and give you one. The quantity stepper is hidden
 * for staples in the drawer for the same reason. */
export function shopStaples() {
  return Object.keys(SHOP_ITEMS).map((id) => ({
    key: id,
    cost: Math.max(1, Math.floor(SHOP_ITEMS[id].cost)),
  }));
}
export function isShopStaple(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(SHOP_ITEMS, key);
}

export const SHOP = {
  /* Coins he pays for the FIRST unit of something he has none of, before the
     stock decay applies. Keyed by a family SUBSTRING of the inventory key,
     because the game mints keys like `wood_pine_log`, `slime-remnants` and
     `shard_ember` -- matching on family means a new tier or a new monster is
     priced sensibly on the day it ships rather than falling to the default
     and looking broken.
     THESE ARE THE GAME'S REAL KEYS. The first cut of this table priced
     `bone`, `hide`, `tooth`, `claw`, `pelt` and `feather` -- none of which
     exist in this game. Every one of them would have matched nothing and every
     real item would have fallen to BASE_DEFAULT, so the whole table would have
     been decoration and every price identical. Read out of remnantInvKey
     (monsterVariants.js), _harvestInvKey (gathering.js), ZONE_SHARDS
     (shards.js) and the legacy SHOP_PRICES, rather than imagined. */
  /* The numbers are large enough for the DECAY TO BE VISIBLE, which is not a
     cosmetic concern -- it is the owner's whole rule. The first cut priced a
     bone at 6, which made his opening offer 3 and put him on the 1-coin floor
     after a dozen of them: the curve existed in the arithmetic and was
     invisible in the game, because there is nothing between 3 and 1 to fall
     through. Measured, not guessed -- the suite asserts the offer at an empty
     pile is meaningfully above the offer at a full one, and that is what
     caught it.
     Scale check against the rest of the economy: a player starts with 75
     coins and the daily reward is 25, so a bone at 24 makes an afternoon of
     hunting worth a few hundred -- and the decay is what stops the tenth
     afternoon being worth as much as the first. */
  BASE: {
    /* Monster remains. remnantInvKey (src/data/monsterVariants.js) resolves
       every variant down to a handful of these, so matching on 'remnants'
       covers slime-remnants, skeleton-remnants and fire-goblin-remnants at
       once -- and covers whatever the next monster resolves to on the day it
       ships, which is the point of matching on family rather than on a list. */
    remnants: 18, snowman: 26,
    /* Gathered materials. The keys are built as <resType>_<name> by
       gathering.js _harvestInvKey, so these three prefixes catch every tier
       of every node: wood_pine_log, ore_copper, fish_trout and their
       successors. */
    ore_: 40, wood_: 24, fish_: 28,
    /* Longer than 'fish_', so the longest-match rule below prefers it: a
       cooked fish is worth more than the raw one it came from. */
    cooked_fish: 45,
    /* Zone shards (ZONE_SHARDS, all 'shard_<zone>'). Rare -- one roll per
       kill -- so they are worth an order more than the remains beside them. */
    shard_: 110,
    /* v2.3.2055: the vendor building's consumables, priced at THEIR OWN COST
       (SHOP_ITEMS, server/src/data.js). Without these they all fell to
       BASE_DEFAULT and he offered a flat 10g for a 35g tonic and a 12g salt
       alike -- not an exploit, since his half-of-cost spread keeps every one
       a loss to flip, but flat pricing that makes the expensive thing feel
       worthless. Lowercased-exact: the keys are camelCase, and 'whetstone'
       is caught by no family rule at all. */
    whetstone: 35, manashard: 18, staminasalts: 12, basictrap: 20, cookedminnow: 8,
    /* The legacy town shop's own keys, priced in the same family so the two
       cannot disagree about what a slime is worth while they both exist. */
    slime: 14, bat: 16, skeleton: 22, crab: 16, golem: 40,
    logs: 20, rawfish: 20, cookedfish: 34, rarefish: 90,
  },
  BASE_DEFAULT: 20,
  /* He buys at half his asking price before decay -- the ordinary shopkeeper
     spread, and the thing that stops buy-then-sell-back being a money loop. */
  BUY_RATE: 0.5,
  /* How many of a thing he needs before his offer HALVES. Big enough that the
     curve still has somewhere to fall at a realistic pile size: at 12 the
     offer reached the 1-coin floor by about a hundred units, and past that
     point buying the pile back down could not raise the price again because
     it was already floored -- the rule silently stopped working at exactly the
     stock levels a popular farm produces. Caught by the assertion that
     draining a pile raises the next offer, which is the half of the owner's
     rule that is easy to forget to check.
     At 40, on an 18-coin item: 9 coins at an empty pile, 7 after ten sold,
     4 after forty, 2 after a hundred. Visible movement across the range a
     player actually generates, and still above the floor. */
  SOFTEN: 40,
  /* He never offers zero: a price of 0 reads as "broken", not as "worthless",
     and an item you cannot give away clutters a bag forever. */
  MIN_BUY: 1,
  /* A ceiling per item so one player cannot grind his pile into millions of
     units and make the listing unreadable. At the cap he stops buying and
     says so, rather than silently paying the minimum. */
  MAX_STOCK: 999,
  /* Most a player can move in one action, so a fat-fingered quantity cannot
     empty a bag or a purse in a single tap. */
  MAX_QTY_PER_OP: 100,

  /* ═══ v2.3.2053: WHAT HE HAS ON HIM WHEN THE WORLD IS NEW ═══
   * Owner: "I don't have any use for those items yet you can remove them...
   * He's mainly there to buy extra remnants from the players. So actually his
   * inventory can just start with a few cooked fish."
   *
   * v2.3.2051 gave him the retired town shop's three consumables as
   * always-in-stock staples, on the reasoning that shop was their only source.
   * That was over-cautious: the VENDOR BUILDING (VendorPanel) still sells
   * whetstones at 35g and they still carry their dmgBuff effect
   * (server/src/data.js), so that one was never at risk. Traps and antidotes
   * genuinely were only in the retired shop -- and the owner does not want
   * them, so they go rather than being preserved for their own sake.
   *
   * A SEED, NOT A STAPLE. The distinction matters: a staple never runs out and
   * has no price movement, which made him a vending machine. These are just
   * stock, priced by the same decay as everything else, and when players buy
   * them they are gone. He is a man who buys remains and happens to have had
   * lunch on him, not a shop with a permanent shelf.
   *
   * Written ONCE, on the first read of a world that has never had a pile. A
   * pile that has been emptied is a written record of {}, which is not the
   * same as no record -- so clearing him out does not quietly restock him. */
  SEED: { cooked_fish_trout: 6 },
};

export const shopMethods = {
  /** One event to one player, by session id. Mirrors _sendInboxDelivered:
   *  a dead socket is not an error here -- the stock and the coins are
   *  already committed, and the next shop_list rebuilds the view. */
  _shopSend(playerId, type, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) { /* dead socket */ }
  },

  /** Base worth of one unit, by longest matching family prefix. Longest wins
   *  so a specific key beats a general one when both would match. */
  _shopBaseValue(key) {
    if (typeof key !== 'string' || !key) return SHOP.BASE_DEFAULT;
    const k = key.toLowerCase();
    let best = 0, val = SHOP.BASE_DEFAULT;
    for (const pre in SHOP.BASE) {
      if (k.indexOf(pre) !== -1 && pre.length > best) { best = pre.length; val = SHOP.BASE[pre]; }
    }
    return val;
  },

  /** What he PAYS for one more unit, given how many he already holds.
   *  The decay is the owner's rule; see the module note for why it is
   *  hyperbolic rather than linear. */
  _shopBuyRaw(key, stock) {
    const base = this._shopBaseValue(key);
    const held = Math.max(0, Number(stock) || 0);
    return (base * SHOP.BUY_RATE) / (1 + held / SHOP.SOFTEN);
  },
  _shopBuyPrice(key, stock) {
    return Math.max(SHOP.MIN_BUY, Math.floor(this._shopBuyRaw(key, stock)));
  },

  /** What he CHARGES for one unit. Flat -- see the module note. */
  _shopSellPrice(key) {
    return Math.max(1, Math.ceil(this._shopBaseValue(key)));
  },

  async _shopStock() {
    /* Object.create(null): the keys are inventory ids that originate from
       clients, and a plain {} silently no-ops on '__proto__' (CLAUDE.md rule
       4 -- three incidents in one day). */
    let raw = await this.state.storage.get('shop_stock');
    /* UNDEFINED, not falsy: a pile players have emptied is a stored {}, and
       treating that as "never seeded" would restock him every time someone
       cleared him out. See SHOP.SEED. */
    if (raw === undefined) {
      raw = { ...SHOP.SEED };
      await this.state.storage.put('shop_stock', raw);
    }
    const out = Object.create(null);
    for (const k in raw) {
      const n = Math.floor(Number(raw[k]) || 0);
      if (n > 0) out[k] = n;
    }
    return out;
  },

  async _shopSaveStock(stock) {
    const clean = {};
    for (const k in stock) {
      const n = Math.floor(Number(stock[k]) || 0);
      if (n > 0) clean[k] = Math.min(SHOP.MAX_STOCK, n);
    }
    await this.state.storage.put('shop_stock', clean);
  },

  /** The public listing: every line carries BOTH prices, because a player
   *  deciding whether to sell needs to see what he is already holding -- that
   *  is the number that sets their offer. */
  /** @param keys optional item keys the asking player is CARRYING. He quotes
   *  for those too, at qty 0.
   *
   *  Without this the panel showed a bare "Sell" with no number on anything
   *  he did not already hold -- which is the commonest case by far, since the
   *  whole point of him is selling him something new. The client cannot fill
   *  that number in itself (it computes no prices, deliberately), so the ask
   *  has to carry the keys and the answer has to carry the quotes. */
  async _shopList(keys) {
    const stock = await this._shopStock();
    const items = [];
    /* v2.3.2063: HIS STAPLES LEAD THE SHELF. They are the things he always
       has, so they never move and they are where a player looks first. `qty`
       is null rather than a number -- the drawer draws no count badge for
       them, because "6" on a potion he can never run out of is a lie. */
    for (const st of shopStaples()) {
      items.push({ key: st.key, qty: null, staple: true,
        buy: 0,          /* he does not buy his own stock back */
        base: 0,
        sell: st.cost, full: false });
    }
    if (Array.isArray(keys)) {
      /* Bounded and type-checked: this list arrives from a client. 60 is well
         past a full bag and far short of anything worth flooding us with. */
      const seen = Object.create(null);   /* CLAUDE.md rule 4 */
      for (const k of keys.slice(0, 60)) {
        if (typeof k !== 'string' || !k || k.length > 64) continue;
        if (seen[k] || stock[k]) continue;      /* held keys are listed below */
        if (isShopStaple(k)) continue;         /* v2.3.2063: already on the shelf above */
        seen[k] = 1;
        items.push({ key: k, qty: 0, buy: this._shopBuyPrice(k, 0),
          base: this._shopBuyPrice(k, 0),
          sell: this._shopSellPrice(k), full: false, quote: true });
      }
    }
    for (const k in stock) {
      items.push({
        key: k,
        qty: stock[k],
        buy: this._shopBuyPrice(k, stock[k]),    /* he pays you this */
        /* v2.3.2059: what he WOULD pay with an empty pile. The bag's per-slot
           quote shows an arrow -- "he is paying under the odds for this" vs
           "he wants this" -- and the only honest way to draw it is to compare
           against a number the SERVER computed. Deriving the baseline on the
           client would mean shipping a copy of the price table, which is the
           one thing this whole feature is built to avoid. */
        base: this._shopBuyPrice(k, 0),
        sell: this._shopSellPrice(k),            /* you pay him this */
        full: stock[k] >= SHOP.MAX_STOCK,
      });
    }
    /* v2.3.2063: staples first, THEN the pile by size. Sorting them together
       would have compared `null` against a number -- b.qty - a.qty is NaN for
       every staple, which is not "sorts last", it is an inconsistent
       comparator and the order it produces is undefined. They lead by intent
       anyway: they are the shelf that is always there. */
    items.sort((a, b) => {
      if (!!a.staple !== !!b.staple) return a.staple ? -1 : 1;
      if (a.staple) return a.key.localeCompare(b.key);
      return b.qty - a.qty || a.key.localeCompare(b.key);
    });
    return { ok: true, items, settled: true };
  },

  /** What a whole STACK is worth, without moving anything.
   *
   *  The panel needs this because a stack is not unit-price times N: his offer
   *  decays as the pile grows, so selling ten is worth less than ten times the
   *  first one. The client cannot work that out -- it holds no price table,
   *  deliberately -- and multiplying the unit price on screen would show a
   *  number the settlement then disagrees with, which is the one thing a shop
   *  must never do.
   *
   *  Walks the same per-unit loop the real sale does rather than a closed form,
   *  so the quote and the settlement cannot drift apart: if one is wrong they
   *  are both wrong in the same direction, and the test that compares them
   *  catches it. */
  async _shopQuote(key, qty, mode) {
    if (typeof key !== 'string' || !key) return { ok: false, error: 'Bad request' };
    const want = Math.floor(Number(qty) || 0);
    if (!(want >= 1 && want <= SHOP.MAX_QTY_PER_OP)) return { ok: false, error: 'Bad quantity' };
    const stock = await this._shopStock();
    if (mode === 'buy') {
      /* v2.3.2063: a staple has no pile to be limited by and is always one --
         quoting it against `held` would answer 0 for everything on his shelf
         that he never runs out of, and the drawer would grey out the buy
         button for every potion. */
      if (isShopStaple(key)) {
        const it = this._getShopItem(key);
        return { ok: true, key, qty: 1, mode, staple: true,
          total: it ? Math.max(1, Math.floor(it.cost)) : 0, settled: true };
      }
      const held = stock[key] || 0;
      const take = Math.min(want, held);
      return { ok: true, key, qty: take, mode,
        total: this._shopSellPrice(key) * take, settled: true };
    }
    let held = stock[key] || 0;
    let total = 0, n = 0;
    for (let i = 0; i < want; i++) {
      if (held >= SHOP.MAX_STOCK) break;
      total += this._shopBuyRaw(key, held);
      held++; n++;
    }
    return { ok: true, key, qty: n, mode: 'sell',
      total: n ? Math.max(n * SHOP.MIN_BUY, Math.floor(total)) : 0, settled: true };
  },

  /** Sell player stock TO him. Each unit is priced against the pile as it
   *  grows, not all at his opening offer -- otherwise a hundred-unit sale
   *  would dodge the decay entirely, which is the rule's whole point. */
  async _shopSell(ps, key, qty) {
    if (!ps || typeof key !== 'string' || !key) return { ok: false, error: 'Bad request' };
    /* v2.3.2063: he does not buy his own stock back. Two reasons, and the
       second is the load-bearing one: his staple price is fixed, so buying at
       a decayed price and selling back at the fixed one would be a coin
       printer; and a staple sold INTO the pile would then be listed twice on
       his shelf, once as a staple and once as stock. */
    if (isShopStaple(key)) return { ok: false, error: "He only sells those" };
    const want = Math.floor(Number(qty) || 0);
    if (!(want >= 1 && want <= SHOP.MAX_QTY_PER_OP)) return { ok: false, error: 'Bad quantity' };
    if (!ps.inventory) ps.inventory = {};
    const have = Math.floor(Number(ps.inventory[key]) || 0);
    if (have < want) return { ok: false, error: "You don't have that many" };

    const stock = await this._shopStock();
    let held = stock[key] || 0;
    let paid = 0, sold = 0;
    for (let i = 0; i < want; i++) {
      if (held >= SHOP.MAX_STOCK) break;      /* he is full; stop, do not pay 0 */
      /* Accumulated as a REAL and floored ONCE at the end, not floored per
         unit. Flooring every unit quietly robs the seller of up to a coin on
         each one -- down the tail of the curve on a hundred-unit sale that is
         most of the payment, and it is invisible because every individual
         price still looks right. */
      paid += this._shopBuyRaw(key, held);
      held++; sold++;
    }
    if (!sold) return { ok: false, error: "He's full of those" };
    paid = Math.max(sold * SHOP.MIN_BUY, Math.floor(paid));

    ps.inventory[key] = have - sold;
    if (ps.inventory[key] <= 0) delete ps.inventory[key];
    ps.coins = Math.max(0, Math.floor(Number(ps.coins) || 0) + paid);
    stock[key] = held;
    await this._shopSaveStock(stock);
    return { ok: true, sold, paid, coins: ps.coins, stock: held,
      nextBuy: this._shopBuyPrice(key, held), settled: true };
  },

  /** Buy FROM his pile. Priced flat, so buying does not get cheaper as you
   *  clear him out -- but every unit you take raises what he will pay the next
   *  seller, which is how the pile drains and the price recovers. */
  async _shopBuy(ps, key, qty) {
    if (!ps || typeof key !== 'string' || !key) return { ok: false, error: 'Bad request' };
    const want = Math.floor(Number(qty) || 0);
    if (!(want >= 1 && want <= SHOP.MAX_QTY_PER_OP)) return { ok: false, error: 'Bad quantity' };

    /* ═══ v2.3.2063: A STAPLE IS DRUNK, NOT CARRIED ═══
       Owner: "These potions should be purchasable there."

       What you buy here is an EFFECT, applied on the spot, exactly as the
       vendor's own shelf applies it -- through the same _applyShopItem, so
       the two shops cannot disagree about what a potion does. It is NOT
       granted as an inventory item, and that is not a shortcut: a potion in
       your bag would need a Drink action, and there is none -- cooked fish is
       the only consumable the bag can use. Selling a bottle nobody can open
       would be worse than not selling it.

       ALWAYS ONE. The effect does not stack (owner: "Only 1 effect active at
       a time"), so charging for five and running one is the only thing a
       quantity could mean here. The pile is untouched: no decay, no restock,
       nothing to run out of. */
    if (isShopStaple(key)) {
      const item = this._getShopItem(key);
      if (!item) return { ok: false, error: "He hasn't got any" };
      const cost = Math.max(1, Math.floor(item.cost));
      const purse = Math.floor(Number(ps.coins) || 0);
      if (purse < cost) return { ok: false, error: 'Not enough coins' };
      ps.coins = purse - cost;
      if (!this._applyShopItem(ps, item)) {
        ps.coins = purse;                        /* refused (arena): refund */
        return { ok: false, error: 'Not while you are fighting' };
      }
      return { ok: true, bought: 1, cost, coins: ps.coins, staple: true, settled: true };
    }

    const stock = await this._shopStock();
    const held = stock[key] || 0;
    if (held <= 0) return { ok: false, error: "He hasn't got any" };
    const take = Math.min(want, held);
    const unit = this._shopSellPrice(key);
    const cost = unit * take;
    const purse = Math.floor(Number(ps.coins) || 0);
    if (purse < cost) return { ok: false, error: 'Not enough coins' };

    ps.coins = purse - cost;
    if (!ps.inventory) ps.inventory = {};
    ps.inventory[key] = (Math.floor(Number(ps.inventory[key]) || 0)) + take;
    stock[key] = held - take;
    await this._shopSaveStock(stock);
    return { ok: true, bought: take, cost, coins: ps.coins, stock: stock[key],
      nextBuy: this._shopBuyPrice(key, stock[key]), settled: true };
  },
};
