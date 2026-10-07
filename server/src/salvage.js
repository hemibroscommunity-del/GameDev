/* ═══ v2.3.3141: SALVAGE AND ESSENCES AT THE BLACKSMITH ═══
 *
 * Owner, 2026-10-06: "I'm thinking all items like iron armor, bronze armor,
 * etc should be salvageable at the blacksmith for 50% of the bars it took to
 * make them.  So maybe chest, legs, and sword each take 4 bars to make (5 ore
 * makes 1 bar).  If you salvage them you get 2 bars back.  I'm planning to
 * have bars required for the chance at hardening your blade ... and also
 * considering other uses within various skills.  This prevents flooding of
 * cheap bars and armor for lower level players at the auction house and
 * should give them a pretty good source of income from higher level richer
 * players."  And: "Maybe if you salvage the rare, elite, and godly armor you
 * can get back that tier's 'essence' and use it on whatever same tier armor
 * or weapon you want."
 *
 * THE METALS ARE THE ONES WITH BARS: copper, iron and black steel (smelting.js
 * SMELT.RECIPES).  A torso or greaves of one (its `mat`, armour's own ladder)
 * and a sword or greatsword forged from one (its `gearBase`, the blacksmith's
 * tier key -- black steel's is still 'steel', data.js BLACKSMITH_TIERS) each
 * take FOUR bars to make now (armorforge.js, data.js), and SALVAGING one gives
 * back TWO: half.  Wood, the dropped weapons (no `gearBase`, no metal) and the
 * metals past black steel (no bar yet) are not salvaged; a metal joins
 * METALS the day its bar does.
 *
 * ESSENCES.  A Rare, Elite or Godly piece also gives back its grade's ESSENCE
 * of its metal -- `essence_<grade>_<metal>`, a bag item ("Rare Iron Essence").
 * "That tier's essence" is the GRADE (rare, elite, godly), and "same tier
 * armor or weapon" its METAL: an essence turns any piece of the same metal
 * you carry whose grade is LOWER into that grade.  So a lucky roll can move
 * from the piece it landed on to the piece you wanted -- a rare iron greaves
 * into a rare iron sword -- but never up a metal, and never into two pieces:
 * one rare piece salvaged makes one rare piece again.  Nothing new is minted
 * that the quality roll did not already make (hardening.js
 * _rollWeaponQuality: rare 9%, elite 0.9%, godly 1 in 2,000,000; the
 * armour forge rolls it on every piece, armorforge.js).
 *
 * ONLY WHAT THE SERVER CAN PROVE YOU HOLD.  Salvaging turns a piece into bars
 * someone can sell, so it asks exactly what selling one asks:
 *   - ARMOUR (torso / greaves): the piece's server id (`gid`), resolved
 *     against YOUR provenance ledger by `_gearSellable` (gearprov.js) --
 *     minted for you, still yours, not on your body, not in your mail --
 *     and taken with `_gearProvTake`, the auction house's own escrow step.
 *     A piece made before the ledger existed (`legacy`) cannot be salvaged,
 *     as it cannot be sold; it stays usable.
 *   - WEAPONS: `ps.weaponStash` IS the authoritative list (storegear.js
 *     section 1), addressed by index; the client sends the piece's
 *     signature too and a mismatch is refused ('changed'), so a list that
 *     moved under the tap never salvages the wrong sword.  The weapon in
 *     your hand is never salvaged -- put it in the weapon bag first.
 * An essence is applied by the same two names, on the same gate: a piece in
 * the post, on your body or not yours is refused with its reason.
 *
 * CRASH SHAPE (rule 5's "credit first" has no second party here).  Both acts
 * are one input-gated event with no await: the piece leaves, the bars and
 * the essence arrive, `_saveRpg` -- the shape of smelt_bar and forge_armor.
 * `_gearProvTake` writes the ledger fire-and-forget before the blob, so a
 * room that dies between the two leaves the piece out of the ledger and the
 * bars unpaid: the player's browser still holds its copy, which the next join
 * re-adopts as `legacy` -- usable, worn, not salvageable again.  Never a
 * duplicate (storegear.js walks the same shape for a listing).
 *
 * WIRE.  smith_salvage {field, gid} | {field: 'weaponStash', idx, sig}
 *       -> smith_salvage_result {ok, field, gid|idx, bar, bars, essence, grade, metal}
 *       essence_apply {essence, field, gid} | {essence, field: 'weaponStash', idx, sig}
 *       -> essence_result {ok, field, gid|idx, essence, grade, piece}
 *   A refusal answers {ok: false, reason} so the panel can say why; both
 *   result types are PRIVILEGED (index.js).  The player_state that follows
 *   carries the bag, the weapon bag and the server's stashes.
 *
 * DEPLOY ORDER (rule 19): caps.salvage gates the Blacksmith's Salvage tab --
 * an older worker has no case for either request and would rebroadcast it.
 * KILL SWITCH (lower case, TRAPS §117): `salvage: false` in liveflags
 * un-advertises the cap and refuses both acts; pieces, bars and essences
 * already held are untouched. */

export const SALVAGE = Object.freeze({
  /* metal id (the armour's `mat`, materialTints.js) -> its bar (smelting.js),
     the forge tier key its weapons carry as `gearBase` (data.js
     BLACKSMITH_TIERS), and its name for the essence. */
  METALS: Object.freeze({
    copper: Object.freeze({ bar: 'bar_copper', gearBase: 'copper', name: 'Copper' }),
    iron: Object.freeze({ bar: 'bar_iron', gearBase: 'iron', name: 'Iron' }),
    blacksteel: Object.freeze({ bar: 'bar_black_steel', gearBase: 'steel', name: 'Black Steel' }),
  }),
  /* what a torso, greaves or sword of a metal takes to make (armorforge.js
     RECIPES, data.js BLACKSMITH_TIERS -- the salvage suite pins both) */
  COST_BARS: 4,
  /* what salvaging one gives back: half */
  BARS: 2,
  /* the grades, low to high (hardening.js / data.js QUALITY_GRADES) */
  GRADES: Object.freeze(['normal', 'rare', 'elite', 'godly']),
  /* the grades that leave an essence behind */
  ESSENCE_GRADES: Object.freeze(['rare', 'elite', 'godly']),
  /* the blacksmith's weapons: the two his forge makes (gear.js forge_weapon) */
  WEAPON_TYPES: Object.freeze(['sword', 'greatsword']),
  COOLDOWN_MS: 250,
});

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** The bag key of a grade's essence of a metal: essence_rare_iron. */
export function essenceKey(grade, metal) { return 'essence_' + grade + '_' + metal; }

/** {grade, metal} of an essence key, or null for anything else. */
export function parseEssenceKey(key) {
  if (typeof key !== 'string' || key.length > 40) return null;
  const m = /^essence_([a-z]+)_([a-z]+)$/.exec(key);
  if (!m || SALVAGE.ESSENCE_GRADES.indexOf(m[1]) < 0 || !hasOwn(SALVAGE.METALS, m[2])) return null;
  return { grade: m[1], metal: m[2] };
}

/** A grade's place on the ladder (anything unknown is normal: 0). */
export function gradeRank(q) {
  const i = SALVAGE.GRADES.indexOf(q);
  return i < 0 ? 0 : i;
}

/** The metal of a piece of body armour, or null. */
export function armourMetal(piece) {
  if (!piece || typeof piece !== 'object') return null;
  const m = typeof piece.mat === 'string' ? piece.mat : (typeof piece.material === 'string' ? piece.material : null);
  return m && hasOwn(SALVAGE.METALS, m) ? m : null;
}

/** The metal of a forged sword or greatsword, or null (a dropped weapon has
    no gearBase; wood, the woodworker's and the metals past black steel have
    no bar). */
export function weaponMetal(w) {
  if (!w || typeof w !== 'object' || SALVAGE.WEAPON_TYPES.indexOf(w.type) < 0) return null;
  const gb = typeof w.gearBase === 'string' ? w.gearBase : '';
  for (const metal of Object.keys(SALVAGE.METALS)) {
    if (SALVAGE.METALS[metal].gearBase === gb) return metal;
  }
  return null;
}

/** What names one weapon in the weapon bag, so an index that moved under the
    tap is refused rather than salvaging its neighbour.  The client builds the
    same string (src/data/salvage.js weaponSig). */
export function weaponSig(w) {
  if (!w || typeof w !== 'object') return '';
  return [w.gearBase || '', w.type || '', w.quality || 'normal', Math.floor(Number(w.hardness) || 0), Number(w.tierMult) || 0].join('|');
}

const ARMOUR_FIELDS = Object.freeze({ armorStash: 'armor', legsStash: 'legsArmor' });

export const salvageMethods = {
  _salvageOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && hasOwn(f, 'salvage') && !f.salvage);
  },

  /* The player, if this act may go ahead at all; every refusal past this
     point is answered.  Stamped for EVERY ask that gets this far, so a
     client can not have the worker scan its ledger as fast as it can send. */
  _salvageWho(session) {
    if (!session || !session.id || this._salvageOff()) return null;
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return null;
    const now = Date.now();
    if (ps._lastSalvageAt && now - ps._lastSalvageAt < SALVAGE.COOLDOWN_MS) return null;
    ps._lastSalvageAt = now;
    if (!ps.inventory || typeof ps.inventory !== 'object') ps.inventory = {};
    return ps;
  },

  _salvageSend(pid, type, payload, withState) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) { /* the act is saved; the state carries it */ }
    if (withState) this._sendPlayerState(ws, pid);
  },

  /* A weapon in the weapon bag by index AND signature, or a reason. */
  _salvageWeaponAt(ps, payload) {
    const idx = payload && payload.idx;
    if (!Number.isInteger(idx) || idx < 0) return { reason: 'bad' };
    const list = Array.isArray(ps.weaponStash) ? ps.weaponStash : [];
    const w = list[idx];
    if (!w || typeof w !== 'object') return { reason: 'gone' };
    if (typeof payload.sig !== 'string' || payload.sig !== weaponSig(w)) return { reason: 'changed' };
    const metal = weaponMetal(w);
    if (!metal) return { reason: 'not_metal' };
    return { w, idx, metal };
  },

  /* A piece of armour by its server id: the ledger's own copy, after the
     gate selling uses.  Refuses with the gate's reason. */
  _salvageArmourOf(pid, field, payload) {
    const slot = ARMOUR_FIELDS[field];
    const gid = payload && payload.gid;
    if (typeof gid !== 'string' || !gid || gid.length > 40) return { reason: 'legacy' };
    const verdict = this._gearSellable(pid, slot, gid);
    if (!verdict.ok) return { reason: verdict.reason };
    const piece = this._gearProvPieceByRef(pid, slot, verdict.gid);
    if (!piece) return { reason: 'not_held' };
    const metal = armourMetal(piece);
    if (!metal) return { reason: 'not_metal' };
    return { slot, gid: verdict.gid, piece, metal };
  },

  /* smith_salvage {field, gid} | {field: 'weaponStash', idx, sig}.
     Returns the result sent (tests), or null when dropped unanswered. */
  _handleSmithSalvage(session, payload) {
    const ps = this._salvageWho(session);
    if (!ps) return null;
    const pid = session.id;
    const field = payload && payload.field;
    const refuse = (reason, ref) => {
      const r = { ok: false, field: typeof field === 'string' ? field.slice(0, 16) : null, reason, ...(ref || {}) };
      this._salvageSend(pid, 'smith_salvage_result', r, false);
      return r;
    };
    let metal;
    let grade;
    let ref;
    if (field === 'weaponStash') {
      const at = this._salvageWeaponAt(ps, payload || {});
      if (!at.w) return refuse(at.reason, { idx: payload && Number.isInteger(payload.idx) ? payload.idx : null });
      ps.weaponStash.splice(at.idx, 1);
      metal = at.metal;
      grade = SALVAGE.GRADES.indexOf(at.w.quality) >= 0 ? at.w.quality : 'normal';
      ref = { idx: at.idx, name: typeof at.w.name === 'string' ? at.w.name.slice(0, 40) : null };
    } else if (hasOwn(ARMOUR_FIELDS, field)) {
      const at = this._salvageArmourOf(pid, field, payload);
      if (!at.piece) return refuse(at.reason, { gid: payload && typeof payload.gid === 'string' ? payload.gid.slice(0, 40) : null });
      const took = this._gearProvTake(pid, at.slot, at.gid);
      /* the gate said yes a moment ago and nothing can interleave (no await) */
      if (!took || !took.piece) return refuse('not_held', { gid: at.gid });
      metal = at.metal;
      grade = SALVAGE.GRADES.indexOf(took.piece.quality) >= 0 ? took.piece.quality : 'normal';
      ref = { gid: at.gid, name: typeof took.piece.name === 'string' ? took.piece.name.slice(0, 40) : null };
    } else {
      return refuse('bad');
    }

    const bar = SALVAGE.METALS[metal].bar;
    ps.inventory[bar] = Math.floor(Number(ps.inventory[bar]) || 0) + SALVAGE.BARS;
    let essence = null;
    if (SALVAGE.ESSENCE_GRADES.indexOf(grade) >= 0) {
      essence = essenceKey(grade, metal);
      ps.inventory[essence] = Math.floor(Number(ps.inventory[essence]) || 0) + 1;
    }
    this._saveRpg(pid, ps);
    const result = { ok: true, field, ...ref, bar, bars: SALVAGE.BARS, essence, grade, metal };
    this._salvageSend(pid, 'smith_salvage_result', result, true);
    return result;
  },

  /* essence_apply {essence, field, gid} | {essence, field: 'weaponStash', idx, sig}.
     The piece takes the essence's grade; one essence is used. */
  _handleEssenceApply(session, payload) {
    const ps = this._salvageWho(session);
    if (!ps) return null;
    const pid = session.id;
    const field = payload && payload.field;
    const key = payload && payload.essence;
    const refuse = (reason, ref) => {
      const r = { ok: false, field: typeof field === 'string' ? field.slice(0, 16) : null, essence: typeof key === 'string' ? key.slice(0, 40) : null, reason, ...(ref || {}) };
      this._salvageSend(pid, 'essence_result', r, false);
      return r;
    };
    const ess = parseEssenceKey(key);
    if (!ess) return refuse('bad');
    if (Math.floor(Number(ps.inventory[key]) || 0) < 1) return refuse('no_essence');

    let piece;
    let ref;
    if (field === 'weaponStash') {
      const at = this._salvageWeaponAt(ps, payload || {});
      if (!at.w) return refuse(at.reason, { idx: payload && Number.isInteger(payload.idx) ? payload.idx : null });
      if (at.metal !== ess.metal) return refuse('wrong_metal', { idx: at.idx });
      if (gradeRank(at.w.quality) >= gradeRank(ess.grade)) return refuse('not_lower', { idx: at.idx });
      at.w.quality = ess.grade;
      piece = at.w;
      ref = { idx: at.idx };
    } else if (hasOwn(ARMOUR_FIELDS, field)) {
      const at = this._salvageArmourOf(pid, field, payload);
      if (!at.piece) return refuse(at.reason, { gid: payload && typeof payload.gid === 'string' ? payload.gid.slice(0, 40) : null });
      if (at.metal !== ess.metal) return refuse('wrong_metal', { gid: at.gid });
      if (gradeRank(at.piece.quality) >= gradeRank(ess.grade)) return refuse('not_lower', { gid: at.gid });
      piece = this._gearProvSetQuality(pid, at.slot, at.gid, ess.grade);
      if (!piece) return refuse('not_held', { gid: at.gid });
      ref = { gid: at.gid };
    } else {
      return refuse('bad');
    }

    ps.inventory[key] = Math.floor(Number(ps.inventory[key]) || 0) - 1;
    if (ps.inventory[key] <= 0) delete ps.inventory[key];
    this._saveRpg(pid, ps);
    const result = { ok: true, field, ...ref, essence: key, grade: ess.grade, metal: ess.metal, piece };
    this._salvageSend(pid, 'essence_result', result, true);
    return result;
  },
};
