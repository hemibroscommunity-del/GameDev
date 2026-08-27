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
  async _shopList() {
    const stock = await this._shopStock();
    const items = [];
    for (const k in stock) {
      items.push({
        key: k,
        qty: stock[k],
        buy: this._shopBuyPrice(k, stock[k]),    /* he pays you this */
        sell: this._shopSellPrice(k),            /* you pay him this */
        full: stock[k] >= SHOP.MAX_STOCK,
      });
    }
    items.sort((a, b) => b.qty - a.qty || a.key.localeCompare(b.key));
    return { ok: true, items, settled: true };
  },

  /** Sell player stock TO him. Each unit is priced against the pile as it
   *  grows, not all at his opening offer -- otherwise a hundred-unit sale
   *  would dodge the decay entirely, which is the rule's whole point. */
  async _shopSell(ps, key, qty) {
    if (!ps || typeof key !== 'string' || !key) return { ok: false, error: 'Bad request' };
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
