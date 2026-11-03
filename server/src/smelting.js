/* ═══ v2.3.2822: SMELTING -- ORE INTO BARS ═══
 *
 * Owner, 2026-09-24 (with the bar art): "Add this for the metal bar (that you
 * can recolor for different metal tiers).  You can recolor this one to copper
 * for smelting the copper ore into.  Make one bar require 5 copper ore.  You
 * get xp for each time you smelt it into a bar."
 *
 * The first half of the loop the owner asked for ("Make ore smelt in to bars.
 * Bars into armor.").  Mining has paid `ore_copper_ore` since the node system
 * shipped, and until now the only thing ore did was feed the forge's weapon
 * rows directly.  A bar is the processed step between them: the blacksmith
 * takes SMELT.RECIPES[bar].oreCost of the ore and gives one bar, and the
 * smelt pays Smithing XP -- the missing early XP source the demo audit found
 * (the forge's own XP is minLvl * 5, so the wood tier paid 5 XP a craft and
 * reaching the copper tier took hundreds of crafts).
 *
 * SERVER-SETTLED (rule 20).  The client sends `smelt_bar { barKey, count }`
 * and does NOT touch its own bag: the worker takes the ore out of ITS copy,
 * pays the bars and the XP, saves, answers `smelt_result`, and the
 * player_state that follows carries the totals.  The daily chest
 * (dailychest.js) and the golden ticket (eventcapes.js) are the same shape.
 *
 * ONE KEY, OWN-PROPERTY.  RECIPES is looked up with hasOwnProperty, so
 * '__proto__' / 'constructor' resolve to nothing (TRAPS #6 -- the forge's
 * 'constructor' free-mint, gear.js v2.3.1626).
 *
 * COUNT.  "Smelt all" is one message, not a burst of them: count is clamped
 * to [1, MAX_PER_REQUEST] and then to what the ore on hand pays for, so a
 * forged count can never smelt more than the bag holds.
 *
 * DEPLOY ORDER (rule 19).  caps.smelting gates the client's Smelting rows.
 * KILL SWITCH: `smelting: false` in liveflags refuses every smelt and
 * un-advertises the cap, with no deploy; ore and bars are untouched.
 *
 * ═══ v2.3.3912: ONE ORE MAKES ONE BAR ═══
 * The owner, 2026-11-02 (his "yes" to the Oct 26 list's row 11): "Remove all
 * references to 5 resources requiring 25 of its inputs.  I just want 5 raw to
 * turn into 5 processed.  So still wood to hardened wood but only require 5
 * instead of 25."  A gear piece still takes five bars, so it is five ore now,
 * not twenty-five.  RECIPES is the one-to-one table; each bar's XP is the
 * old bar's divided by five (80 / 120 / 160), so Smithing levels at the same
 * pace per ore mined (docs/OWNER-LIST-2026-10-26.md: "keep each bar's XP tied
 * to the ore it took").  FIVE is the old five-to-one rows, brought back by
 * `onetoone: false` in liveflags (_oneToOneOff), which also takes back
 * caps.onetoone (join.js spreads the flags over the caps) so the game draws
 * the old rows too; hardened wood (hardenedwood.js), Diego's prices
 * (shop.js) and the daily smelt quest (dailyrewards.js) follow the same
 * switch.  The worker settles from _smeltRecipe, never from the phone's
 * numbers: an old phone that still thinks five ore a bar asks for fewer bars
 * than the ore pays for and is given exactly what it asked
 * (docs/specs/smelting.md "One ore, one bar"). */

export const SMELT = {
  /* bar invKey -> recipe.  `ore` is the exact inventory key gathering.js
     _harvestInvKey mints for the tier's rock.  Higher metals join this table
     as their ore becomes obtainable.
     v2.3.3092: iron and black steel join it -- the Wheel has grown both since
     v2.3.3012 (iron at its levels 1-10, black steel at 11-20) -- because the
     owner said "Yes" to "Should smelted bars make armour?" and each metal's
     armour is forged from its own bars (armorforge.js).  Smithing 5 and 10:
     the owner's "levels of 5" (the ores' own Mining gates, gathering.js
     GATHER_REQ_LVL), each bar paying more as its metal gets harder to reach. */
  /* v2.3.3912: one ore a bar (the header); the XP a fifth of the old bar's */
  RECIPES: {
    bar_copper: { ore: 'ore_copper_ore', oreCost: 1, minLvl: 1, xp: 80 },
    bar_iron: { ore: 'ore_iron_ore', oreCost: 1, minLvl: 5, xp: 120 },
    bar_black_steel: { ore: 'ore_black_steel_ore', oreCost: 1, minLvl: 10, xp: 160 },
  },
  /* One smelt pays `xp` Smithing XP.  It was 400 for five ore: a cooked fish
     pays 200 for one catch (cooking.js), and a bar was five trips to a rock.
     At 400 a player reached the copper forge tier (Smithing 6, ~2,900 XP) in
     eight bars -- forty copper ore -- instead of hundreds of wood crafts.
     v2.3.3912: 80 for one ore, the same forty ore to the same level.
     FIVE: the rows `onetoone: false` lays over RECIPES (the old five-to-one,
     as they were until v2.3.3912; the game's SMELT_FIVE, mirror-audit). */
  FIVE: {
    bar_copper: { oreCost: 5, xp: 400 },
    bar_iron: { oreCost: 5, xp: 600 },
    bar_black_steel: { oreCost: 5, xp: 800 },
  },
  MAX_PER_REQUEST: 50,
};

export const smeltingMethods = {
  /* The kill switch, read the storeGear way (storegear.js _stGearOff). */
  _smeltOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'smelting') && !f.smelting);
  },

  /* v2.3.3912: the one-to-one switch (the header).  On unless written false,
     read the same way; shared by hardenedwood.js, shop.js and
     dailyrewards.js, whose rows it also puts back. */
  _oneToOneOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'onetoone') && !f.onetoone);
  },

  /* v2.3.3912: the recipe the worker settles a smelt from -- RECIPES, or with
     the switch off the old five-to-one rows laid over it.  null for a key
     that is not the table's own. */
  _smeltRecipe(barKey) {
    if (typeof barKey !== 'string' || !Object.prototype.hasOwnProperty.call(SMELT.RECIPES, barKey)) return null;
    const r = SMELT.RECIPES[barKey];
    return this._oneToOneOff() ? { ...r, ...SMELT.FIVE[barKey] } : r;
  },

  _handleSmeltBar(session, payload) {
    if (!session || !session.id) return null;
    if (this._smeltOff()) return null;
    const { barKey } = payload || {};
    const r = this._smeltRecipe(barKey);   /* v2.3.3912: one ore a bar, or five with onetoone off */
    if (!r) return null;
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return null;
    if (!ps.inventory) return null;

    const lvl = (ps.lifeSkills && ps.lifeSkills.blacksmithing && ps.lifeSkills.blacksmithing.level) || 1;
    if (lvl < r.minLvl) return null;

    const want = Math.max(1, Math.min(SMELT.MAX_PER_REQUEST, Math.floor(Number(payload.count) || 1)));
    const have = Math.floor(Number(ps.inventory[r.ore]) || 0);
    const count = Math.min(want, Math.floor(have / r.oreCost));
    if (count <= 0) return null;

    ps.inventory[r.ore] = have - count * r.oreCost;
    if (ps.inventory[r.ore] <= 0) delete ps.inventory[r.ore];
    ps.inventory[barKey] = (Math.floor(Number(ps.inventory[barKey]) || 0)) + count;

    const fromLevel = lvl;
    let leveled = false;
    let newLevel = lvl;
    /* Per bar, not one lump: the level curve is per-level, and paying each
       smelt separately is what "xp for each time you smelt" means. */
    for (let i = 0; i < count; i++) {
      const res = this._addLifeSkillXp(ps, 'blacksmithing', r.xp);
      if (res.leveled) leveled = true;
      newLevel = res.newLevel;
    }
    /* v2.3.3140: every bar counts for "Smelt 2 bars" (dailyrewards.js) */
    this._drSignal(session.id, 'smelt', barKey, count);

    this._saveRpg(session.id, ps);
    const result = { barKey, count, xp: r.xp * count, leveled, fromLevel, newLevel };
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try { ws.send(JSON.stringify({ type: 'smelt_result', payload: result })); } catch (e) { /* the smelt is saved */ }
      this._sendPlayerState(ws, session.id);
    }
    return result;
  },
};
