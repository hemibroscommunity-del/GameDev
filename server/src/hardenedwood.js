/* ═══ v2.3.3139: HARDENED WOOD -- LOGS INTO WHAT HARDENS A BOW ═══
 *
 * The owner, after hardening was put on metal bars (hardening.js): "Maybe 5
 * logs of the raw material can make one 'hardened (name) wood' raw material
 * so it mirrors the same structure.  Also for the number required and gold
 * too".
 *
 * So the Woodworker gets smelting's shape (smelting.js): five logs of one tree
 * become one HARDENED WOOD of that tree, paying Woodworking XP the way a bar
 * pays Smithing XP, each wood gated at its own Woodworking level, five apart
 * like the ores' and the bars' ("levels of 5").  And a bow or a staff is
 * hardened with its OWN wood's hardened wood -- a pine bow with Hardened Pine
 * Wood -- as a sword is with its metal's bars: the attempt at H(n) takes n of
 * them and the same doubling gold (hardening.js hardenMaterialFor).
 *
 * SERVER-SETTLED (rule 20).  The client sends
 * `make_hardened_wood { key, count }` and does NOT touch its own bag: the
 * worker takes the logs out of ITS copy, pays the hardened wood and the XP,
 * saves, answers `hardened_wood_result`, and the player_state that follows
 * carries the totals.
 *
 * ONE KEY, OWN-PROPERTY.  RECIPES is looked up with hasOwnProperty, so
 * '__proto__' / 'constructor' resolve to nothing (TRAPS #6).
 *
 * THE KEYS ARE NOT `wood_`.  Every `wood_` key is a LOG to the rest of the
 * game: the campfire burns one (cooking.js), the bag files it with the logs,
 * the shop prices it as one.  A hardened wood is `hardened_<tier>`, so none
 * of those can take it for a log.
 *
 * COUNT.  "All" is one message: count is clamped to [1, MAX_PER_REQUEST] and
 * then to what the logs on hand pay for.
 *
 * DEPLOY ORDER (rule 19).  caps.hardenedwood gates the Woodworker's Harden
 * tab, and with caps.hardenmats it is what puts a bow's hardening on hardened
 * wood.  KILL SWITCH: `hardenedwood: false` in liveflags refuses every make
 * and un-advertises the cap, with no deploy -- and bows and staffs go back to
 * hardening for gold alone (hardening.js), so nothing asks for a material
 * that can no longer be made.  Logs and hardened wood held are untouched. */

export const HARDENED_WOOD = {
  /* hardened invKey -> recipe.  `log` is the exact key gathering.js
     _harvestInvKey mints for the tree (its TREE names); `tier` the
     WOODWORKING_TIERS key whose bows and staffs it hardens, in that table's
     order -- HARDEN_WOOD_BY_TIER (hardening.js) is read off it.  The levels
     and XP are the bars' (copper 1 / 400, iron 5 / 600, black steel 10 / 800),
     carried on two more steps for the two woods past them.  The names are the
     owner's "hardened (name) wood", the tree's own bag name in the middle:
     Softwood and Hardwood already say wood. */
  RECIPES: {
    hardened_pine: { log: 'wood_pine_log', logCost: 5, minLvl: 1, xp: 400, tier: 'pine', name: 'Hardened Pine Wood' },
    hardened_softwood: { log: 'wood_softwood', logCost: 5, minLvl: 5, xp: 600, tier: 'softwood', name: 'Hardened Softwood' },
    hardened_hardwood: { log: 'wood_hardwood', logCost: 5, minLvl: 10, xp: 800, tier: 'hardwood', name: 'Hardened Hardwood' },
    hardened_cedar: { log: 'wood_cedar_wood', logCost: 5, minLvl: 15, xp: 1000, tier: 'cedar', name: 'Hardened Cedar Wood' },
    hardened_maple: { log: 'wood_maple_wood', logCost: 5, minLvl: 20, xp: 1200, tier: 'maple', name: 'Hardened Maple Wood' },
  },
  MAX_PER_REQUEST: 50,
};

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const hardenedWoodMethods = {
  /* The kill switch, read the smelting way (smelting.js _smeltOff). */
  _hardenedWoodOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'hardenedwood') && !f.hardenedwood);
  },

  _handleMakeHardenedWood(session, payload) {
    if (!session || !session.id) return null;
    const ws = this._wsBySessionId(session.id);
    const reply = (p) => { if (ws) { try { ws.send(JSON.stringify({ type: 'hardened_wood_result', payload: p })); } catch (e) { /* the make is saved */ } } };
    const key = payload && typeof payload.key === 'string' ? payload.key : '';
    if (this._hardenedWoodOff()) { reply({ error: 'off', key }); return null; }
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return null;
    if (!has(HARDENED_WOOD.RECIPES, key)) { reply({ error: 'bad-key' }); return null; }
    const r = HARDENED_WOOD.RECIPES[key];

    const ls = ps.lifeSkills && typeof ps.lifeSkills === 'object' ? ps.lifeSkills : null;
    const lvl = (ls && has(ls, 'woodworking') && ls.woodworking && ls.woodworking.level) || 1;
    if (lvl < r.minLvl) { reply({ error: 'skill', key, need: r.minLvl }); return null; }

    if (!ps.inventory || typeof ps.inventory !== 'object') ps.inventory = {};
    const held = has(ps.inventory, r.log) ? Math.max(0, Math.floor(Number(ps.inventory[r.log]) || 0)) : 0;
    let want = Math.floor(Number(payload && payload.count) || 1);
    if (!(want >= 1)) want = 1;
    const count = Math.min(want, HARDENED_WOOD.MAX_PER_REQUEST, Math.floor(held / r.logCost));
    if (count < 1) { reply({ error: 'no-logs', key, need: r.logCost, have: held }); return null; }

    ps.inventory[r.log] = held - count * r.logCost;
    if (ps.inventory[r.log] <= 0) delete ps.inventory[r.log];
    ps.inventory[key] = (has(ps.inventory, key) ? Math.floor(Number(ps.inventory[key]) || 0) : 0) + count;

    /* Per piece, not one lump: the level curve is per level, as smelting's. */
    const fromLevel = lvl;
    let leveled = false, newLevel = lvl;
    try {
      if (!ps.lifeSkills || typeof ps.lifeSkills !== 'object') ps.lifeSkills = {};
      if (!ps.lifeSkills.woodworking || typeof ps.lifeSkills.woodworking !== 'object') ps.lifeSkills.woodworking = { level: 1, xp: 0 };
      for (let i = 0; i < count; i++) {
        const res = this._addLifeSkillXp(ps, 'woodworking', r.xp);
        if (res && res.leveled) leveled = true;
        if (res && res.newLevel) newLevel = res.newLevel;
      }
    } catch (e) { /* the wood is made; an XP fault must not undo it */ }

    this._saveRpg(session.id, ps);
    const result = { key, count, xp: r.xp * count, leveled, fromLevel, newLevel, have: ps.inventory[key] };
    reply(result);
    if (ws) this._sendPlayerState(ws, session.id);
    return result;
  },
};
