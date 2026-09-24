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
 * un-advertises the cap, with no deploy; ore and bars are untouched. */

export const SMELT = {
  /* bar invKey -> recipe.  `ore` is the exact inventory key gathering.js
     _harvestInvKey mints for the tier's rock.  Higher metals join this table
     as their ore becomes obtainable (gathering's node tier is still 1). */
  RECIPES: {
    bar_copper: { ore: 'ore_copper_ore', oreCost: 5, minLvl: 1, xp: 400 },
  },
  /* One smelt pays `xp` Smithing XP.  400 for five ore: a cooked fish pays
     200 for one catch (cooking.js), and a bar is five trips to a rock.  At
     400 a player reaches the copper forge tier (Smithing 6, ~2,900 XP) in
     eight bars -- forty copper ore -- instead of hundreds of wood crafts. */
  MAX_PER_REQUEST: 50,
};

export const smeltingMethods = {
  /* The kill switch, read the storeGear way (storegear.js _stGearOff). */
  _smeltOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'smelting') && !f.smelting);
  },

  _handleSmeltBar(session, payload) {
    if (!session || !session.id) return null;
    if (this._smeltOff()) return null;
    const { barKey } = payload || {};
    if (typeof barKey !== 'string' || !Object.prototype.hasOwnProperty.call(SMELT.RECIPES, barKey)) return null;
    const r = SMELT.RECIPES[barKey];
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
