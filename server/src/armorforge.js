/* ═══ v2.3.3092: BARS INTO ARMOUR ═══
 *
 * Asked "Should smelted bars make armour?", the owner said "Yes".  It is the
 * second half of the loop they asked for when smelting shipped ("Make ore
 * smelt in to bars.  Bars into armor.", smelting.js): until now a bar was
 * only worth its vendor price.
 *
 * The blacksmith's Armour tab (SmithyPanel.jsx) forges a TORSO or GREAVES in
 * the metal of the bars it takes -- copper, iron or black steel -- each the
 * same piece a monster drops, the daily chest pays or a quest grants
 * (`{name, mat, slot, tierMult, quality}`), on the armour's own ladder of
 * whole steps (copper 1, iron 2, black steel 3; docs/specs/monster-drops.md,
 * "Two ladders, one metal").  So nothing new has to learn to draw, wear or
 * price it: black steel asks for 5 Defense through armorDefReq like any
 * third-tier piece, and its quality is rolled as every piece's is
 * (_rollWeaponQuality: rare, elite, the 1-in-2,000,000 godly).
 *
 * NO gearBase AND NO type on the piece: either one moves it off the armour
 * ladder (data.js isArmourLadderPiece) and prices it from the weapon table.
 *
 * SERVER-SETTLED (rule 20).  The client sends `forge_armor { recipe }` -- a
 * key, nothing else -- and does not touch its own bag.  The worker takes the
 * bars from ITS copy, mints the piece into the provenance ledger (src
 * 'forge', as the amulet bench does), pays the Smithing XP, saves, and
 * answers `forge_armor_result { recipe, piece, xp, leveled, fromLevel,
 * newLevel }`; the game puts the piece in its bag (wsClient
 * _applyLootCredit, the daily chest's own path) and the worker adopts it by
 * its id at the next join (gearstash.js), as it does a dropped piece.
 *
 * ONE KEY, OWN-PROPERTY.  RECIPES is looked up with hasOwnProperty, so
 * '__proto__' / 'constructor' forge nothing (TRAPS #6).  Synchronous, one
 * mutation, so no opId -- the shape of smelt_bar and forge_weapon.
 *
 * DEPLOY ORDER (rule 19).  caps.armorforge gates the client's Armour tab:
 * an older worker has no case for forge_armor and would rebroadcast it to the
 * room.  KILL SWITCH (lower case, TRAPS §117): `armorforge: false` in
 * liveflags refuses every forge and un-advertises the cap; bars and armour
 * already made are untouched. */

export const ARMOR_FORGE = Object.freeze({
  /* recipe key -> what it takes and what it makes.  `bar` is a SMELT.RECIPES
     key (smelting.js); `slot` the gear slot the piece is worn in; `mat` the
     metal it is drawn and iconed in (the material ids of
     src/rendering/traits/materialTints.js -- 'blacksteel', not the forge's
     'steel' or the ore's 'black_steel'); `tierMult` the armour ladder's step.
     Smithing 1, 5 and 10: the owner's "levels of 5", the bars' own gates
     (each metal's armour opens with its bar).  XP is 200 / 300 / 400 a bar
     used -- half what smelting that bar paid.
     v2.3.3110: FOUR bars a piece, torso and greaves alike (was five and
     three) -- the owner: "maybe chest, legs, and sword each take 4 bars to
     make (5 ore makes 1 bar).  If you salvage them you get 2 bars back"
     (salvage.js).  The XP moves with the bars (800 / 1,200 / 1,600). */
  RECIPES: Object.freeze({
    copper_torso: Object.freeze({ bar: 'bar_copper', bars: 4, slot: 'armor', mat: 'copper', tierMult: 1, minLvl: 1, xp: 800, name: 'Copper Torso' }),
    copper_greaves: Object.freeze({ bar: 'bar_copper', bars: 4, slot: 'legsArmor', mat: 'copper', tierMult: 1, minLvl: 1, xp: 800, name: 'Copper Greaves' }),
    iron_torso: Object.freeze({ bar: 'bar_iron', bars: 4, slot: 'armor', mat: 'iron', tierMult: 2, minLvl: 5, xp: 1200, name: 'Iron Torso' }),
    iron_greaves: Object.freeze({ bar: 'bar_iron', bars: 4, slot: 'legsArmor', mat: 'iron', tierMult: 2, minLvl: 5, xp: 1200, name: 'Iron Greaves' }),
    blacksteel_torso: Object.freeze({ bar: 'bar_black_steel', bars: 4, slot: 'armor', mat: 'blacksteel', tierMult: 3, minLvl: 10, xp: 1600, name: 'Black Steel Torso' }),
    blacksteel_greaves: Object.freeze({ bar: 'bar_black_steel', bars: 4, slot: 'legsArmor', mat: 'blacksteel', tierMult: 3, minLvl: 10, xp: 1600, name: 'Black Steel Greaves' }),
  }),
});

export const armorForgeMethods = {
  _armorForgeOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'armorforge') && !f.armorforge);
  },

  /* forge_armor { recipe }.  Returns the result sent, or null when refused
     (silently, as every blacksmith refusal is: the panel says "Could not
     forge" when no receipt comes). */
  _handleForgeArmor(session, payload) {
    if (!session || !session.id || this._armorForgeOff()) return null;
    const key = payload && payload.recipe;
    if (typeof key !== 'string' || !Object.prototype.hasOwnProperty.call(ARMOR_FORGE.RECIPES, key)) return null;
    const r = ARMOR_FORGE.RECIPES[key];
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected || !ps.inventory) return null;

    const lvl = (ps.lifeSkills && ps.lifeSkills.blacksmithing && ps.lifeSkills.blacksmithing.level) || 1;
    if (lvl < r.minLvl) return null;
    const have = Math.floor(Number(ps.inventory[r.bar]) || 0);
    if (have < r.bars) return null;

    ps.inventory[r.bar] = have - r.bars;
    if (ps.inventory[r.bar] <= 0) delete ps.inventory[r.bar];

    /* minted into the ledger before it leaves -- the daily chest's and the
       loot pickup's order (dailychest.js, index.js) */
    const piece = this._gearProvRecord(session.id, r.slot,
      { name: r.name, mat: r.mat, slot: r.slot, tierMult: r.tierMult, quality: this._rollWeaponQuality() }, 'forge');

    const res = this._addLifeSkillXp(ps, 'blacksmithing', r.xp);
    this._saveRpg(session.id, ps);
    const result = { recipe: key, piece, xp: r.xp, leveled: !!res.leveled, fromLevel: lvl, newLevel: res.newLevel };
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try { ws.send(JSON.stringify({ type: 'forge_armor_result', payload: result })); } catch (e) { /* the forge is saved */ }
      this._sendPlayerState(ws, session.id);
    }
    return result;
  },
};
