/* ═══ v2.3.1166 (P4 decomposition): COOKING / EATING / NPC SHOP
 * extracted from index.js ═══
 *
 * Behavior-frozen move of the life-skills consumables cluster out of
 * the GameRoom class body (same mixin pattern as market.js): eating
 * cooked fish (eat_request), multi-ingredient recipes (cook_recipe),
 * the buff-timer helper (_buffActive -- read by the combat and regen
 * paths in index.js via `this`, definitions-only move), the NPC
 * consumables shop (shop_purchase), and the pan-minigame cook
 * (cook_request, rate-limited v2.3.1104 + anti-bot v2.3.1146).
 *
 * FISH_TIERS / COOKING_RECIPES / SHOP_ITEMS mirrors move with their
 * only consumers (mirror-audit still pins them against the client
 * tables).  Original section comments preserved on each method. */

import { FISH_TIERS, COOKING_RECIPES, SHOP_ITEMS, manaSurgePerTick } from './data.js';
import { PROG3 } from './prog3.js';        /* v2.3.2062: the special's mana cost */
import { REGEN_TICKS } from './tick.js';   /* v2.3.2062: the regen cadence */

export const cookingMethods = {
  // ═══ Eating cooked fish (server-authoritative HP heal) ═══
  //
  // Client sends eat_request { invKey } when the player clicks Eat on
  // a cooked_fish_* inventory item.  Server validates the player owns
  // at least one of the item, looks up the heal amount from the
  // hardcoded fish-tier table (mirrors client getFishHealAmount in
  // gameSystems.js), decrements inventory, increments hp (clamped to
  // maxHp), persists, and emits player_state.
  //
  // Closes the "eat to heal beyond what server thinks" cheat: server
  // applies the heal, so a modified client that bypasses inventory
  // decrement still gets stomped on the next player_state.  Mirrors
  // FISHING_TIERS from src/data/lifeSkills.js -- keep in sync if new
  // fish tiers ship to the client.
  _fishHealAmount(invKey) {
    if (typeof invKey !== 'string') return 0;
    if (!invKey.startsWith('cooked_fish_') && !invKey.startsWith('fish_')) return 0;
    // Strip 'fish_' or 'cooked_fish_' prefix to get the species name.
    const species = invKey.replace(/^(cooked_)?fish_/, '').toLowerCase();

    const tier = FISH_TIERS.find((t) => species.includes(t.name));
    if (!tier) return 100; // default for unmapped cooked fish (v2.3.1765)
/* v2.3.1765 (owner: "Fish heal needs to be closer to 100").  The base was 15,
   so the first cooked fish healed 23 against a ~106 HP character — a bite, not
   a meal, which is why nobody ate.  Base lifted so tier one lands on 100; the
   PER-TIER slope (+8) is untouched, so the ladder above it keeps its shape. */
    return Math.ceil(92 + tier.lvl * 8);
  },

  // v2.3.1167: fish tier level for the cook physics floor -- same
  // species substring match as _fishHealAmount.  Unmapped keys count
  // as tier 1 (the permissive default; the floor still applies).
  _fishTierLvl(fishKey) {
    const species = String(fishKey).replace(/^(cooked_)?fish_/, '').toLowerCase();
    const tier = FISH_TIERS.find((t) => species.includes(t.name));
    return tier ? tier.lvl : 1;
  },

  _handleEatRequest(session, payload) {
    if (!session || !session.id) return;
    const { invKey } = payload || {};
    if (typeof invKey !== 'string') return;
    // Only cooked_fish_* keys are edible this slice; raw fish goes
    // through cook_request first.
    if (!invKey.startsWith('cooked_fish_')) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    if (ps._arenaMatch) return; // v2.3.1126: no healing during an arena match (GDD §43)
    if (!ps.inventory) ps.inventory = {}; // proto-ok: invKey guarded by startsWith cooked_fish_ above
    if ((ps.inventory[invKey] || 0) <= 0) return;
    // v2.3.1154: × HP-grid Recovery (+1%/pt on discrete heals, cap +50%).
    const heal = Math.ceil(this._fishHealAmount(invKey)) + this._recoveryFlat(ps); // v2.3.1345: flat recovery bonus
    if (heal <= 0) return;
    // Decrement inventory + apply heal.  Heal is "wasted" if at max;
    // we still consume the item to match client semantics (the click
    // handler returns early at full, but a race-condition cheater
    // could trigger this server-side -- consume anyway).
    ps.inventory[invKey] -= 1;
    if (ps.inventory[invKey] <= 0) delete ps.inventory[invKey];
    if (typeof ps.maxHp !== 'number') ps.maxHp = 100;
    if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
    ps.hp = Math.min(ps.maxHp, ps.hp + heal);
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  /* ═══ v2.3.1702: FIREMAKING BURNS A REAL LOG ═══
   *
   * Tapping a wood_* log in the Bag lights the campfire you cook at
   * (client v2.3.853, the firemakingBus effect in BroTown.jsx).  That
   * handler deleted the log from R.inventory and sent NOTHING -- there
   * was no wire message for it at all -- so the worker still held the
   * log, and its next player_state echo (inventory rides every one)
   * handed it straight back.  Light a fire, gain a fire, keep the log:
   * one log lit unlimited campfires.  Headless: a character with a
   * single wood_oak lit three fires in a row and the worker's blob
   * still read `{ wood_oak: 1 }`.
   *
   * Same shape as _handleEatRequest above -- validate ownership,
   * consume one, persist, echo -- because it is the same kind of
   * action: a client-initiated consume of a stackable bag item.  The
   * campfire itself stays client-side (it is a 45s local prop with no
   * server state); only the LOG is server-owned, and the log is the
   * part that duplicates.
   *
   * Deploy-order safe in both directions: an old worker ignores the
   * unknown message type and the client behaves exactly as it does
   * today (log refunded), while a new worker simply never hears from
   * an old client. */
  _handleFiremakingRequest(session, payload) {
    if (!session || !session.id) return;
    const { invKey } = payload || {};
    if (typeof invKey !== 'string') return;
    /* Also the __proto__ guard (rule 4): ps.inventory is a plain object
       and invKey is client-supplied, so the prefix test is what keeps a
       crafted key off Object.prototype. */
    if (!invKey.startsWith('wood_')) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    if (!ps.inventory) ps.inventory = {};
    if ((ps.inventory[invKey] || 0) <= 0) return;
    ps.inventory[invKey] -= 1;
    if (ps.inventory[invKey] <= 0) delete ps.inventory[invKey];
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  /* ═══ v2.3.2127: THE DRINK ACTION THE BOTTLE WAS WAITING FOR ═══
   *
   * Owner: "Also work on putting a potions to inventory after buying."
   *
   * v2.3.2063 deliberately did NOT put them there, and its reason was sound:
   * "a potion in your bag would need a Drink action, and there is none --
   * cooked fish is the only consumable the bag can use. Selling a bottle
   * nobody can open would be worse than not selling it." This is that action,
   * so the reason expires rather than being overruled.
   *
   * SAME SHAPE AS _handleEatRequest, on purpose: validate ownership, consume
   * one, persist, echo. It is the same kind of act -- a client-initiated
   * consume of a stackable bag item -- and the two bugs that shape exists to
   * prevent are both live here. The firemaking note above records the first
   * (delete client-side, send nothing, and the next player_state hands the
   * item straight back: one log lit unlimited fires). The second is the
   * inverse: consume server-side without echoing and the bag keeps drawing a
   * bottle that is gone.
   *
   * THE GUARD IS AN OWN-PROPERTY TEST, NOT A PREFIX. Eating and firemaking
   * can use `startsWith` because their keys are namespaced (`cooked_fish_`,
   * `wood_`); a potion's key is its SHOP_ITEMS id -- `staminaSalts`,
   * `manaDraught` -- which shares no prefix with anything. hasOwnProperty
   * against our own table is both stricter and the same rule-4 protection:
   * SHOP_ITEMS['__proto__'] is not an own property, so a crafted key cannot
   * reach Object.prototype through ps.inventory (the v2.3.1626 note on
   * _getShopItem is this same guard, for this same table).
   *
   * REFUSAL DOES NOT CONSUME. _applyShopItem returns false when the effect
   * cannot run (mid-arena healing, GDD §43). The buy path refunds coins there;
   * here the equivalent is to put the bottle back -- so the check happens
   * BEFORE the decrement and a refused drink costs nothing. Getting that
   * ordering wrong would be a potion that vanishes and does nothing, which is
   * strictly worse than the sale this replaces.
   *
   * Deploy-order safe both ways (rule 19): the client gates its Drink button
   * and this send on the `potionBag` cap, so against an OLD worker no bottle
   * can be in the bag to drink and nothing is sent that would be rebroadcast
   * to the room as an unknown type; against a NEW worker an old client simply
   * never drinks. */
  _handleDrinkRequest(session, payload) {
    if (!session || !session.id) return;
    const { invKey } = payload || {};
    if (typeof invKey !== 'string') return;
    const item = this._getShopItem(invKey);      /* own-property gated */
    if (!item) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    if (!ps.inventory) ps.inventory = {};
    if ((ps.inventory[invKey] || 0) <= 0) return;
    /* Before the decrement -- see REFUSAL DOES NOT CONSUME above. */
    if (!this._applyShopItem(ps, item)) return;
    ps.inventory[invKey] -= 1;
    if (ps.inventory[invKey] <= 0) delete ps.inventory[invKey];
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  // ═══ Cooking recipes (multi-ingredient -> buff or heal) ═══
  //
  // Mirrors COOKING_RECIPES in src/data/gameSystems.js.  Client sends
  // cook_recipe { recipeIdx } when the player triggers a recipe from
  // either of the two onClick sites (cooking panel + farm food kiosk
  // -- BroTown.jsx ~18981 / ~29762).  Server validates ingredient
  // ownership via substring match (same as client), consumes the
  // ingredients, and applies the buff or heal.
  //
  // Buff state is tracked on ps._buffs as { regen: endsAt, resist:
  // endsAt, damage: endsAt, all: endsAt, hp: endsAt, mana: endsAt }
  // -- only the buffs that affect server-computed values get applied
  // server-side (regen in _tickPlayerRegen, resist in _applyDamage,
  // hp overheal cap in _tickPlayerRegen).  damage / all / spd buffs
  // affect outgoing damage + move speed which the server doesn't
  // currently enforce -- those flags are tracked for future use and
  // emitted in player_state so the client can render correctly.
  //
  // Closes the cheat surface for when recipe buffs get wired up:
  // currently no recipe has buff:'heal' so the heal path is dead
  // code on the client, but if it gets added later the worker
  // already handles it safely.
  _getCookingRecipe(idx) {
    // Mirror of COOKING_RECIPES from src/data/gameSystems.js.  Keep
    // in sync when new recipes ship.  The indices must match the
    // client's array order since the client sends the index.

    if (!Number.isInteger(idx) || idx < 0 || idx >= COOKING_RECIPES.length) return null;
    return COOKING_RECIPES[idx];
  },

  // Match-then-consume helper.  Mirrors the CLIENT's behavior but with
  // a stricter matcher: client uses bare k.includes(type), which would
  // unintentionally match unrelated inventory keys that happen to
  // contain the type string as a substring (e.g. "shard_herb_firebloom"
  // would be consumed by a "herb_firebloom" ingredient).  We restrict
  // matches to k === type OR k === ('cooked_' + type) so only the
  // canonical inventory key (and its cooked variant) is consumed.
  // Client matches more loosely; the divergence means the server may
  // refuse some recipes the client would accept, but that's safer than
  // the inverse.
  _ingredientMatches(invKey, type) {
    return invKey === type || invKey === ('cooked_' + type);
  },

  _consumeIngredient(ps, type, count) {
    if (!ps.inventory) return false;
    let remaining = count;
    // First pass: count availability across matching keys.
    let total = 0;
    for (const [k, v] of Object.entries(ps.inventory)) {
      if (this._ingredientMatches(k, type) && v > 0) total += v;
    }
    if (total < count) return false;
    // Second pass: consume from matching keys until satisfied.
    for (const k of Object.keys(ps.inventory)) {
      if (remaining <= 0) break;
      if (!this._ingredientMatches(k, type) || ps.inventory[k] <= 0) continue;
      const take = Math.min(ps.inventory[k], remaining);
      ps.inventory[k] -= take;
      remaining -= take;
      if (ps.inventory[k] <= 0) delete ps.inventory[k];
    }
    return true;
  },

  _handleCookRecipe(session, payload) {
    if (!session || !session.id) return;
    const { recipeIdx } = payload || {};
    const recipe = this._getCookingRecipe(recipeIdx);
    if (!recipe) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    if (!ps.inventory) ps.inventory = {}; // proto-ok: recipe-index path; inventory keys server-validated

    // First-pass dry-run: confirm ALL ingredients are available
    // before consuming any (so we don't half-consume on a failure).
    for (const [type, count] of Object.entries(recipe.ingredients)) {
      let total = 0;
      for (const [k, v] of Object.entries(ps.inventory)) {
        if (this._ingredientMatches(k, type) && v > 0) total += v;
      }
      if (total < count) return;
    }
    // Second pass: actually consume.
    for (const [type, count] of Object.entries(recipe.ingredients)) {
      this._consumeIngredient(ps, type, count);
    }

    // Apply the recipe effect.  Buffs go onto ps._buffs as endsAt
    // timestamps; heal modifies hp directly.  Duration is seconds
    // in the recipe table, ms on the wire.
    /* ═══ v2.3.2063: A MEAL IS AN EFFECT TOO ═══
       Owner: "Only 1 effect active at a time though." Applied HERE as well as
       on the potion path, or the rule would only be half true -- a player
       could drink a Swift Draught and then eat a damage meal and be running
       two. Clearing here also makes the per-key `delete ps._buffs.spdMul` /
       `damageMul` lines below redundant; they are kept because they are the
       statement of intent for each writer, and a future granter that forgets
       to clear is then still correct. */
    this._clearTimedBuffs(ps);
    const dur = (recipe.duration || 0) * 1000;
    const endsAt = Date.now() + dur;
    if (recipe.buff === 'heal') {
      // v2.3.1126: dead data today (no recipe carries buff:'heal') but
      // gated anyway -- arena matches disable healing (GDD §43).
      if (ps._arenaMatch) return;
      if (typeof ps.maxHp !== 'number') ps.maxHp = 100;
      ps.hp = Math.min(ps.maxHp, (ps.hp || 0) + (recipe.power || 0));
    } else if (recipe.buff === 'regen') {
      ps._buffs.regen = endsAt;
    } else if (recipe.buff === 'resist') {
      ps._buffs.resist = endsAt;
    } else if (recipe.buff === 'damage') {
      /* v2.3.2058: CLEARED, not left. A potion may have set damageMul to 2.0,
         and a meal eaten before it expired would otherwise inherit the
         potion's multiplier -- a cooked fish quietly worth double. Every
         writer of _buffs.damage must state its own magnitude. */
      delete ps._buffs.damageMul;
      ps._buffs.damage = endsAt;
    } else if (recipe.buff === 'all') {
      // 'all' buff sets all four sub-buffs.  Mirrors the client at
      // BroTown.jsx ~29766: damage + spd + hp + mana all extended.
      delete ps._buffs.damageMul;   /* v2.3.2058: see the note above */
      /* v2.3.2062: and the same for the two magnitudes this recipe's OTHER
         sub-buffs would otherwise inherit -- a meal must not carry a Swift
         Draught's x1.5 or a Mana Draught's regen floor just because it happens
         to set the same timers. Every writer states its own strength. */
      delete ps._buffs.spdMul;
      delete ps._buffs.manaFlat;
      ps._buffs.damage = endsAt;
      ps._buffs.spd = endsAt;
      ps._buffs.hp = endsAt;
      ps._buffs.mana = endsAt;
    }

    // Cooking XP grant -- mirrors addLifeSkillXp on the client.
    this._addLifeSkillXp(ps, 'cooking', (recipe.tier || 1) * 25);

    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  // Buff-active helpers used in regen + damage paths.  Treat undefined
  // / 0 / past timestamps as inactive.
  _buffActive(ps, name) {
    return !!(ps && ps._buffs && ps._buffs[name] && Date.now() < ps._buffs[name]);
  },

  // ═══ NPC consumables shop (server-authoritative purchase) ═══
  //
  // Client sends shop_purchase { itemId } when the player clicks Buy
  // on the NPC vendor.  Server mirrors the 5-item table (see client at
  // BroTown.jsx ~17905), validates ps.coins >= cost (v2.3.1155: the §2.6
  // influence discount retired with the stat), deducts coins,
  // applies the effect to the appropriate playerState field, persists,
  // and emits player_state.
  //
  // Closes the "buy infinite potions" + "buy without spending coins"
  // cheats: server is the only writer for coins/inventory/pools after
  // a purchase.  The dmgBuff effect is transient client-only (_dmgBuff
  // timer); no server tracking needed for that one.
  _getShopItem(itemId) {

    /* v2.3.1626: own-property gate.  SHOP_ITEMS['constructor'] is a
       truthy inherited member, so a crafted itemId returned a "shop
       item" whose cost was undefined -- `(ps.coins||0) < item.cost`
       is false against undefined, so the purchase passed the coin gate
       and then `ps.coins -= undefined` set the buyer's PERSISTED gold
       to NaN.  Self-inflicted, but it destroys a real balance and
       _saveRpg writes it (TRAPS #6). */
    if (!Object.prototype.hasOwnProperty.call(SHOP_ITEMS, itemId)) return null;
    return SHOP_ITEMS[itemId] || null;
  },

  /* ═══ v2.3.2063: ONE EFFECT AT A TIME ═══
   * Owner: "Only 1 effect active at a time though."
   *
   * ps._buffs holds every timed effect in the game -- the potions' damage /
   * spd / mana and the cooked recipes' regen / resist / damage -- so the rule
   * is enforced in one place by clearing the whole record before anything new
   * is written. Every granter calls this, which is what makes the rule true
   * rather than true-for-potions: drinking replaces a meal, eating replaces a
   * drink, and a second potion replaces the first.
   *
   * WHOLESALE, not key by key, and that is deliberate: the magnitudes
   * (damageMul, spdMul, manaFlat) live in this same record beside their
   * timers, so clearing by name would strand a multiplier belonging to an
   * effect that is no longer running -- exactly the bug BUFF_MAGNITUDES was
   * added to stop. Nothing else is stored in _buffs; see _pruneBuffs. */
  _clearTimedBuffs(ps) {
    if (ps) ps._buffs = {};
  },

  /* The EFFECT half of a shop purchase, without the coin handling.
   * v2.3.2063: extracted so Shopkeeper Bro's shelf and the vendor's shelf
   * apply an item the same way. Two copies of this branch chain is how one
   * shop ends up with a potion the other one does not, or applies it
   * differently -- and the owner has now asked for these to be sold in both
   * places. Returns false when the purchase must be refunded. */
  _applyShopItem(ps, item) {
    if (!ps || !item) return false;
    if (item.effect === 'healFish') {
      /* v2.3.1126: no healing during an arena match (GDD §43). Reported as
         a refusal now rather than refunding inline, so the caller owns the
         coins -- there are two callers since v2.3.2063 and each takes them
         its own way. */
      if (ps._arenaMatch) return false;
      if (typeof ps.maxHp !== 'number') ps.maxHp = 100;
      if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
      ps.hp = Math.min(ps.maxHp, ps.hp + (item.power || 23));
    } else if (item.effect === 'stamina') {
      if (typeof ps.maxStamina !== 'number') ps.maxStamina = 100;
      if (typeof ps.stamina !== 'number') ps.stamina = ps.maxStamina;
      ps.stamina = Math.min(ps.maxStamina, ps.stamina + (item.power || 60));
    } else if (item.effect === 'mana') {
      /* The old one-shot top-up. No live item uses it since v2.3.2062 turned
         the Mana Draught into a surge, but the branch stays: `power` items are
         a shape the table still supports and deleting the handler would make
         re-adding one silently do nothing. */
      if (typeof ps.maxMana !== 'number') ps.maxMana = 100;
      if (typeof ps.mana !== 'number') ps.mana = ps.maxMana;
      ps.mana = Math.min(ps.maxMana, ps.mana + (item.power || 40));
    } else if (item.effect === 'manaSurge') {
      /* ═══ v2.3.2062: DRINK, THEN KEEP CASTING ═══
         Owner: "refill at a quick rate so you can just do special attacks
         constantly for 3 mins."

         Two halves, and both are needed. The pool is FILLED on the drink, so
         the first special lands immediately rather than after a wait; and the
         timer arms a per-tick regen FLOOR in _tickPlayerRegen that outpaces
         the cost of casting without pause (see MANA_SURGE in data.js).

         _buffs.mana already existed as the cooked-food x1.3 regen multiplier
         and is REUSED as the timer, with the potion's own magnitude carried
         beside it -- the same pattern the Fury Tonic set at v2.3.2058, so a
         meal and a potion can both buff mana without either one inheriting
         the other's strength. */
      if (typeof ps.maxMana !== 'number') ps.maxMana = 100;
      this._clearTimedBuffs(ps);   /* v2.3.2063: one effect at a time */
      ps.mana = ps.maxMana;
      ps._buffs.manaFlat = manaSurgePerTick(PROG3.SPECIAL_MANA_COST, REGEN_TICKS * this.TICK_RATE);
      const durMs = Math.max(1, Math.floor(item.duration || 180)) * 1000;
      ps._buffs.mana = Date.now() + durMs;
    } else if (item.effect === 'spdBuff') {
      /* ═══ v2.3.2062: 1.5x FOR THREE MINUTES ═══
         Owner: "a speed potion that lets you run 1.5x speed 3 mins."

         _buffs.spd was ALREADY BEING SET by the cooked 'all' recipe and read
         by nobody on the server -- the same dead-buff shape the Fury Tonic
         had before v2.3.2058. The client read it at a hardcoded x1.15; the
         magnitude now travels with the timer so this potion is its own thing.

         THE ANTICHEAT HAS TO KNOW. movement.js rejects moves that imply more
         than a fixed px/sec, and that bound was set against the fastest legal
         build -- 1.5x puts a maxed character over it, so a player who bought
         this would have been rubber-banded by the server for using the thing
         the server sold them. The cap reads this same buff. */
      this._clearTimedBuffs(ps);   /* v2.3.2063: one effect at a time */
      ps._buffs.spdMul = Number(item.mult) > 0 ? Number(item.mult) : 1.5;
      const durMs = Math.max(1, Math.floor(item.duration || 180)) * 1000;
      ps._buffs.spd = Date.now() + durMs;
    } else if (item.effect === 'trap') {
      if (!ps.inventory) ps.inventory = {};
      ps.inventory.basic_trap = (ps.inventory.basic_trap || 0) + 1;
    } else if (item.effect === 'dmgBuff') {
      /* ═══ v2.3.2056: THE BUFF IS REAL NOW ═══
       * Owner: "Make it worthwhile to buy a potion."
       *
       * It was not worth anything AT ALL. The line that used to sit here said
       * "dmgBuff: no-op server-side (transient buff state)" -- and the server
       * is authoritative for damage (CLAUDE.md wire section: client damage
       * popups are prediction, `monster_hit` is the truth). So the tonic set a
       * timer on the CLIENT, the client drew bigger numbers, and the damage
       * the room actually applied was unchanged. Thirty-five coins for a
       * visual effect.
       *
       * Nothing new is needed to fix it: ps._buffs.damage already exists for
       * cooked food and combat.js already reads it at x1.20. This is the one
       * line that was missing. */
      this._clearTimedBuffs(ps);   /* v2.3.2063: one effect at a time */
      /* v2.3.2058: the magnitude rides WITH the timer. combat.js reads
         _buffs.damageMul when it is set and falls back to its own 1.20, so a
         cooked meal is untouched and this potion is its own thing. */
      ps._buffs.damageMul = Number(item.mult) > 0 ? Number(item.mult) : 1.20;
      const durMs = Math.max(1, Math.floor(item.duration || 60)) * 1000;
      /* Extend from NOW rather than stacking: two tonics in a row give you
         six minutes of x2, not a x2 that quietly became x4. */
      ps._buffs.damage = Date.now() + durMs;
    }
    return true;
  },

  _handleShopPurchase(session, payload) {
    if (!session || !session.id) return;
    const { itemId } = payload || {};
    if (typeof itemId !== 'string') return;
    const item = this._getShopItem(itemId);
    if (!item) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (ps.dying || ps.dead || ps.disconnected) return;
    // v2.3.1155: the §2.6 Influence discount is RETIRED with the stat
    // (owner decision 2026-07-03: delete outright, don't freeze).  Its
    // live value has been 0 for every player since v2.3.910, so removal
    // changes no observable price; a future reputation system can add
    // its own discount hook.
    const finalCost = Math.max(1, Math.floor(item.cost));
    if ((ps.coins || 0) < finalCost) return;
    ps.coins -= finalCost;
    /* v2.3.2063: the coins go back if the item refused to apply (an arena
       match blocks healing). The apply half reports rather than refunding,
       because it has two callers now and each holds the purse differently. */
    if (!this._applyShopItem(ps, item)) { ps.coins += finalCost; return; }
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },

  // ═══ Cooking (raw fish -> cooked / burnt) ═══
  //
  // Client sends cook_request { fishKey, kind } when the cooking
  // minigame finishes.  Server validates the player actually holds the
  // raw fish, consumes 1, and applies the outcome:
  //   kind === 'cooked' -> +1 cooked_<fishKey>, +8 cooking XP
  //   kind === 'burnt'  -> +1 burnt_dust
  // Then persists + emits player_state so the client overwrites its
  // inventory + lifeSkills with the authoritative values.
  //
  // Trust posture on `kind` (v2.3.1167, spec in docs/specs/cooking.md):
  // the minigame outcome is PLAYER TIMING, not a skill roll -- the fish
  // cooks iff the flip-swipe lands inside the open window (BroTown.jsx
  // extraction tick; 'burnt' fires when the window closes unflipped).
  // A server-side dice roll would therefore burn fish for players who
  // flipped correctly -- worse than the cheat it closes.  What the
  // server CAN verify without a client handshake is PHYSICS: no cook
  // can complete faster than the minigame's own open delay, which the
  // server already computes for harvest validation
  // (_computeOpenDelayBase, same skill-vs-tier curve as the client's
  // computeOpenDelay).  _handleCookRequest enforces that floor between
  // consecutive cooks; sub-window claims are dropped WITHOUT consuming
  // and snapped by player_state.  Full outcome validation (server
  // observes the flip timing itself) needs a cook-start handshake --
  // future caps.cookSim slice.
  //
  // v2.3.1104: rate-limited (P2 of docs/OPTIMIZATION-ROADMAP.md), same
  // posture as the Slice-18 harvest limit: the server can't simulate
  // the pan minigame, but it CAN bound the cadence.  Each cook takes
  // several seconds of minigame; 20/min (one per 3 s) is well above
  // legit play, so a script hammering cook_request to convert a fish
  // stockpile + farm cooking XP at inhuman speed gets throttled.
  // Excess requests are dropped WITHOUT consuming the fish, and we
  // echo player_state so the client's optimistic local outcome snaps
  // back to the authoritative inventory.
  _cookRateOk(ps) {
    const now = Date.now();
    if (!Array.isArray(ps._cookHistory)) ps._cookHistory = [];
    ps._cookHistory = ps._cookHistory.filter((t) => (now - t) < 60000);
    if (ps._cookHistory.length >= 20) return false;
    ps._cookHistory.push(now);
    return true;
  },

  _handleCookRequest(session, payload) {
    if (!session || !session.id) return;
    const { fishKey, kind } = payload || {};
    if (typeof fishKey !== 'string' || !fishKey.startsWith('fish_')) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    if (!this._cookRateOk(ps)) {
      const ws = this._wsBySessionId(session.id);
      if (ws) this._sendPlayerState(ws, session.id);
      return;
    }
    // v2.3.1146: anti-bot hourly cap + flip-gesture replay/presence
    // bookkeeping (botfp.js).  drop mirrors _cookRateOk's posture: the
    // fish is NOT consumed (we return before the decrement) and
    // player_state snaps the client's optimistic outcome back.
    const bot = this._botfpOnCook(session, ps, payload);
    if (bot.drop) {
      const ws = this._wsBySessionId(session.id);
      if (ws) this._sendPlayerState(ws, session.id);
      return;
    }
    // v2.3.1167: physics floor -- a legit cook can't complete faster
    // than the minigame's own open delay.  Dropped WITHOUT consuming
    // (same snap-back posture as the rate limit).  ps._lastCookAt is
    // in-memory only (like _lastGambleAt -- NOT persisted; _cookHistory
    // rides the rpg blob and still binds at 20/min across reconnects,
    // so cycling the WS to reset the floor's anchor buys at most one
    // instant cook per reconnect).
    // v2.3.1432 (owner: "the minnow still isn't cooking"): the floor
    // used to be the full skill-vs-tier openDelay curve, which SILENTLY
    // ate legit cooks whenever the server's view of the player's
    // cooking level lagged the client's (level desync -> server floor
    // seconds longer than the client's actual wind-up).  The curve
    // floor is replaced by a flat 1200ms -- still far below any human
    // cook cycle (wind-up alone is >=2s), still blocks instant-convert
    // scripts, immune to level/tier desync.  The 20/min rate limit and
    // botfp caps stay as the real farming bounds.
    const nowCk = Date.now();
    const COOK_FLOOR_MS = 1200;
    if (ps._lastCookAt && (nowCk - ps._lastCookAt) < COOK_FLOOR_MS) {
      const ws = this._wsBySessionId(session.id);
      if (ws) this._sendPlayerState(ws, session.id);
      return;
    }
    if (!ps.inventory) ps.inventory = {};
    if ((ps.inventory[fishKey] || 0) <= 0) {
      // v2.3.1432: this was a SILENT return -- if the server blob lacks
      // the raw fish the client thinks it has (drift), the client's
      // 'Cooked!' celebration played and nothing changed, with no
      // correction ever arriving.  Echo authoritative state so the bag
      // reconciles instead of quietly lying.
      const ws = this._wsBySessionId(session.id);
      if (ws) this._sendPlayerState(ws, session.id);
      return;
    }
    ps._lastCookAt = nowCk;
    ps.inventory[fishKey] -= 1;
    if (ps.inventory[fishKey] <= 0) delete ps.inventory[fishKey];
    if (kind === 'cooked') {
      const cookedKey = 'cooked_' + fishKey;
      ps.inventory[cookedKey] = (ps.inventory[cookedKey] || 0) + 1;
      /* v2.3.1435: life-skill XP x5 (was 8).
         v2.3.1765 (owner: "Lifeskills xp is far too slow.  I think you should
         increase it by about 5x"): x5 again, 25x the original — the same
         multiplier the gathering harvest just took (gathering.js
         _harvestXpForTier), and the same pair of skills v2.3.1435 moved
         together, because cooking fish and swinging at nodes are the two
         loops a player repeats.  Client mirror: lifeSkillRewards.js ~473.
         NOT scaled here, deliberately, and named so the omission is a choice
         rather than an oversight: the multi-ingredient recipe payout
         (tier*25, _handleCookRecipe), the forge/woodwork craft (gear.js),
         enchanting, gem cutting and trapping.  Those are separate skills with
         their own economies, they were outside v2.3.1435's scope too, and the
         owner's report is about the grind — say the word and they follow. */
      this._addLifeSkillXp(ps, 'cooking', 200);
    } else {
      ps.inventory.burnt_dust = (ps.inventory.burnt_dust || 0) + 1;
    }
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },
};
