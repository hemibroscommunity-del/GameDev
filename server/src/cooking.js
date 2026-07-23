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

import { FISH_TIERS, COOKING_RECIPES, SHOP_ITEMS } from './data.js';

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
    if (!tier) return 20; // default for unmapped cooked fish
    return Math.ceil(15 + tier.lvl * 8);
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
    if (!ps._buffs) ps._buffs = {};
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
      ps._buffs.damage = endsAt;
    } else if (recipe.buff === 'all') {
      // 'all' buff sets all four sub-buffs.  Mirrors the client at
      // BroTown.jsx ~29766: damage + spd + hp + mana all extended.
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

    return SHOP_ITEMS[itemId] || null;
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
    // Apply effect.  Pool restores clamp to max; trap grants inventory;
    // dmgBuff is transient client-only (server doesn't track buff timers).
    if (item.effect === 'healFish') {
      // v2.3.1126: no healing during an arena match (GDD §43).  The
      // coins were already spent above -- matching the eat_request
      // consume-anyway posture would be wrong here, so refund.
      if (ps._arenaMatch) { ps.coins += finalCost; return; }
      if (typeof ps.maxHp !== 'number') ps.maxHp = 100;
      if (typeof ps.hp !== 'number') ps.hp = ps.maxHp;
      ps.hp = Math.min(ps.maxHp, ps.hp + (item.power || 23));
    } else if (item.effect === 'stamina') {
      if (typeof ps.maxStamina !== 'number') ps.maxStamina = 100;
      if (typeof ps.stamina !== 'number') ps.stamina = ps.maxStamina;
      ps.stamina = Math.min(ps.maxStamina, ps.stamina + (item.power || 60));
    } else if (item.effect === 'mana') {
      if (typeof ps.maxMana !== 'number') ps.maxMana = 100;
      if (typeof ps.mana !== 'number') ps.mana = ps.maxMana;
      ps.mana = Math.min(ps.maxMana, ps.mana + (item.power || 40));
    } else if (item.effect === 'trap') {
      if (!ps.inventory) ps.inventory = {};
      ps.inventory.basic_trap = (ps.inventory.basic_trap || 0) + 1;
    }
    // dmgBuff: no-op server-side (transient buff state).
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
      this._addLifeSkillXp(ps, 'cooking', 8);
    } else {
      ps.inventory.burnt_dust = (ps.inventory.burnt_dust || 0) + 1;
    }
    this._saveRpg(session.id, ps);
    const ws = this._wsBySessionId(session.id);
    if (ws) this._sendPlayerState(ws, session.id);
  },
};
