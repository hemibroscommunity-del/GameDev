/* ═══ v2.3.3951: A MYSTERY PIECE WAITS IN YOUR BAG UNTIL YOU REVEAL IT ═══
 * Spec: docs/specs/reveal-in-bag.md
 *
 * The owner, 2026-11-01: "Mystery item launched automatically. Should go to
 * inventory then have reveal option."
 *
 * Until now a rare-or-better armour piece or Iron Great Sword played its
 * reveal (src/ui/reveal/RevealOverlay.jsx) the moment it was picked up: the
 * grade rode the private loot_credit's `reveals` (index.js _revealsFor).  Now
 * the piece goes into the bag still a "?" and the player opens it themselves,
 * with the same ceremony, when they tap Reveal on its card.
 *
 * WHERE THE SECRET LIVES.  The grade is committed at the kill, as it always
 * was, and it stays ON THE SERVER'S OWN COPIES beside a mark, `unrevealed: 1`:
 *   - a weapon: the server's `ps.weaponStash` entry (the phone mirrors that
 *     list from the player_state echo);
 *   - armour: the provenance row's `p` (`gear_prov:<pid>`, gearprov.js -- the
 *     copy every inbound path rebuilds from) and the server's stash copy with
 *     the same `gid` (`rpg:<pid>` armorStash / legsStash).
 * The phone's bag holds the piece WITHOUT `quality`, with `unrevealed: true`.
 * `revealPublic` below is the one function that makes a piece public: every
 * message this change touches that carries a piece the holder owns goes
 * through it.  Written as a STRIP, not a pick, for _mysteryPiece's reason
 * (index.js): a field added later leaks in the harmless direction, and the
 * grade never leaks through being left off a list.
 *
 * THE MARK IS THE SERVER'S.  It is set in ONE place, the monster pile's
 * pickup (_handleLootPickup), and only for a phone that said at its join that
 * it can show one (`rb: 1`, read into `session.revealBag`): the worker and
 * Pages deploy apart, and an old tab handed a piece with no grade would show
 * it as a plain Normal (deploy-order safety, handoff rules 19/20).  It is
 * CLEARED in one function, `_revealBagOpen`, and stripped from every claim a
 * phone makes (gearprov.js stripProv, gear.js _sanitizeWeapon's strict
 * branch), so a phone can neither re-seal an opened piece nor forge a "?".
 *
 * OPENING.  `reveal_item` (deny by default: handled on purpose in index.js
 * _onMessage, paced) names a piece the holder has; the worker clears the mark
 * in one synchronous run of writes (the ledger row, the stash copy, the
 * achievement the grade earns, then the saves: handoff rules 5/7/10) and
 * answers `item_reveal` with the piece and the ladder the overlay plays --
 * the same `reveals` shape loot_credit carries, so the phone feeds the same
 * revealBus.  Opening an open piece answers `already` with the piece and no
 * ceremony (two tabs share one `bp_` id).  Nothing is paid, so no opId: it is
 * idempotent by its nature.
 *
 * WEARING OPENS IT.  Putting an unrevealed piece on (stats_update's armour,
 * grids.js _gridsApplyArmor; equip_request's weapon, gear.js) opens it first,
 * with its ceremony: a worn grade shows on your body (`eqg`) and changes the
 * fight's numbers, so nothing worn is ever a secret.  The phone asks for the
 * reveal before the equip so the overlay plays first; this is the server's
 * own guarantee for any phone that does not.
 *
 * THE SWITCH.  `revealbag: false` in the live flags (lower case, liveops.test
 * §8) un-advertises caps.revealbag AND brings back today's at-once reveal:
 * pickups play the ceremony on the spot again, and every piece a player still
 * holds unrevealed is opened, with its ceremony, at their next join.  Opening
 * is the safe direction and ALWAYS works, switch or no switch: nobody is ever
 * left holding a "?" they cannot open.
 *
 * WHAT THIS DOES NOT DO (docs/specs/sealed-gear.md is the plan that does).
 * A "?" cannot be sold, traded, salvaged or given an essence from the phone:
 * its card offers Reveal and Equip only, and the trade, salvage and market
 * pickers leave it out.  The server's own doors for those (store.js,
 * trade2.js, market.js, salvage.js) are NOT changed here: a modified phone
 * that forces one through learns only the grade of its own piece, which
 * Reveal would have shown it anyway, and the piece keeps its mark wherever it
 * goes, so whoever then holds it can still open it.
 *
 * (The only `type:` object literals in this file are the two events it sends,
 * `item_reveal` and the test lever's `loot_credit`, both in PRIVILEGED_EVENTS:
 * the wire-audit and hardening suites read them as emittable event names.)
 */
import { findProvRow, GEAR_PROV_FIELD } from './gearprov.js';
import { PACE } from './flood.js';
import { MONSTER_ARMOR_DROPS } from './data.js';

const has = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

export const REVEAL_BAG = Object.freeze({
  /* the lists a reveal may name, matched by value (TRAPS #6) */
  FIELDS: Object.freeze(['armorStash', 'legsStash', 'weaponStash']),
  /* armour list -> its provenance slot */
  SLOT: Object.freeze({ armorStash: 'armor', legsStash: 'legsArmor' }),
  /* the worn slots that can never hold a secret */
  WORN_ARMOUR: Object.freeze(['armor', 'legsArmor']),
  WORN_WEAPONS: Object.freeze(['weapon', 'rangedWeapon', 'staffWeapon']),
  /* the dev lever's grades */
  GRADES: Object.freeze(['rare', 'elite', 'godly']),
});

/* Is this piece one the player has not opened yet? */
export function isUnrevealed(p) {
  return !!(p && typeof p === 'object' && !Array.isArray(p) && p.unrevealed);
}

/* ═══ THE PUBLIC FACE ═══ a COPY without the grade, marked `unrevealed:
   true`; an open piece comes back unchanged (the same object).  The field is
   ABSENT, not blanked, so a rare and a godly are the same length on the
   wire. */
export function revealPublic(p) {
  if (!isUnrevealed(p)) return p;
  const out = { ...p };
  delete out.quality;
  out.unrevealed = true;
  return out;
}

export function revealPublicList(list) {
  return Array.isArray(list) ? list.map(revealPublic) : list;
}

export const revealBagMethods = {
  /* `revealbag: false` in the live flags -- an OWN property set false. */
  _revealBagOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && has(f, 'revealbag') && !f.revealbag);
  },

  /* Does a pickup by this session keep a mystery piece unrevealed? */
  _revealBagHolds(session) {
    return !!(session && session.revealBag) && !this._revealBagOff();
  },

  /* The pickup's mark: a mystery grade, for a phone that can show one, is
     marked; anything else has any mark taken off (a piece cannot arrive on a
     pile still marked today, but the pile must never decide it). */
  _revealBagMark(session, piece) {
    if (!piece || typeof piece !== 'object') return piece;
    if (this._revealBagHolds(session) && this._isMysteryGrade(piece.quality)) piece.unrevealed = 1;
    else delete piece.unrevealed;
    return piece;
  },

  /* The test lever's one grade for the next mystery-capable drop (the dev
     lever below): taken once, then gone.  Room-wide on purpose -- it only
     exists for the owner's test runs. */
  _revealBagDevGrade() {
    const g = this._revealBagNextGrade;
    if (!g) return null;
    this._revealBagNextGrade = null;
    return g;
  },

  /* ═══ THE OPEN ═══
     Clear the mark on a piece this player holds.  `ref` is
       { field: 'armorStash' | 'legsStash', gid }
       { field: 'weaponStash', idx, name }     (a weapon has no gid)
       { worn: '<slot>' }                      (the equip paths and the join)
     Returns { ok, field, gid | idx, piece, reveals, already } or
     { ok: false, reason }.  ONE synchronous run: every copy cleared, the
     achievement the grade earns granted, the ledger and the record saved,
     no await anywhere -- the output gate then commits them together before
     the answer goes (handoff rules 5, 7, 10).  `opts.save === false` leaves
     the record's save to a caller about to save it anyway (the join). */
  _revealBagOpen(pid, ps, ref, opts) {
    const o = opts || {};
    if (!pid || !ps || !ref || typeof ref !== 'object') return { ok: false, reason: 'bad' };
    const field = typeof ref.field === 'string' && REVEAL_BAG.FIELDS.indexOf(ref.field) >= 0 ? ref.field : null;
    const wornSlot = typeof ref.worn === 'string'
      && (REVEAL_BAG.WORN_ARMOUR.indexOf(ref.worn) >= 0 || REVEAL_BAG.WORN_WEAPONS.indexOf(ref.worn) >= 0) ? ref.worn : null;
    if (!field && !wornSlot) return { ok: false, reason: 'bad' };

    /* ── a weapon: the server's own entry IS the piece ── */
    if (field === 'weaponStash' || (wornSlot && REVEAL_BAG.WORN_WEAPONS.indexOf(wornSlot) >= 0)) {
      let w = null;
      let idx = null;
      if (wornSlot) w = ps[wornSlot];
      else {
        idx = ref.idx;
        if (!Number.isInteger(idx) || idx < 0 || !Array.isArray(ps.weaponStash) || idx >= ps.weaponStash.length) return { ok: false, reason: 'not_held' };
        w = ps.weaponStash[idx];
        /* the trade's tiebreak (trade2.js expectName): a list that moved
           since the phone drew it names a different weapon */
        if (w && typeof ref.name === 'string' && ref.name && w.name !== ref.name) return { ok: false, reason: 'changed' };
      }
      if (!w || typeof w !== 'object') return { ok: false, reason: 'not_held' };
      const base = { ok: true, field: field || wornSlot, ...(idx !== null ? { idx } : {}), name: typeof w.name === 'string' ? w.name.slice(0, 40) : null };
      if (!w.unrevealed) return { ...base, piece: w, reveals: null, already: true };
      delete w.unrevealed;
      const achv = this._revealBagAchv(pid, ps, w);
      if (o.save !== false) this._saveRpg(pid, ps);
      return { ...base, piece: w, reveals: this._revealsFor(w, null), achv };
    }

    /* ── armour: the ledger row is the proof, the stash copy follows ── */
    const slot = wornSlot || REVEAL_BAG.SLOT[field];
    const listField = GEAR_PROV_FIELD[slot];
    let gid = null;
    if (wornSlot) gid = ps[wornSlot] && typeof ps[wornSlot].gid === 'string' ? ps[wornSlot].gid : null;
    else gid = typeof ref.gid === 'string' && ref.gid.length > 0 && ref.gid.length <= 40 ? ref.gid : null;
    const ledger = this._gearProvOf ? this._gearProvOf(pid) : null;
    const row = gid && ledger ? findProvRow(ledger, gid) : null;
    const rowOk = !!(row && row.slot === slot && row.p && typeof row.p === 'object');
    /* every copy the server holds of this piece: the worn slot and the stash
       entries carrying its id (or, worn with no id, the worn piece itself) */
    const copies = [];
    if (gid) {
      if (ps[slot] && ps[slot].gid === gid) copies.push(ps[slot]);
      if (listField && Array.isArray(ps[listField])) for (const g of ps[listField]) if (g && g.gid === gid) copies.push(g);
    } else if (wornSlot && ps[wornSlot]) copies.push(ps[wornSlot]);
    if (!rowOk && !copies.length) return { ok: false, reason: 'not_held' };
    const marked = (rowOk && !!row.p.unrevealed) || copies.some((c) => !!c.unrevealed);
    const pieceNow = () => (rowOk ? this._gearProvPieceByRef(pid, slot, gid) : { ...copies[0] });
    const base = { ok: true, field: listField || field, ...(gid ? { gid } : {}) };
    if (!marked) return { ...base, piece: pieceNow(), reveals: null, already: true };
    if (rowOk) delete row.p.unrevealed;
    for (const c of copies) delete c.unrevealed;
    const piece = pieceNow();
    const achv = this._revealBagAchv(pid, ps, piece);
    if (rowOk) this._gearProvSave(pid, ledger);
    if (o.save !== false) this._saveRpg(pid, ps);
    return { ...base, piece, reveals: this._revealsFor(null, [piece]), achv };
  },

  /* The achievements the grade earns, granted QUIETLY: the grant would tell
     the phone at once, before the answer that starts the ceremony, and
     "Elite piece!" would then pop while the "?" still spins.  The ids come
     back; `_revealBagSend` tells the phone after the answer, and the phone
     holds the banner until the overlay lands (game/revealBag.js). */
  _revealBagAchv(pid, ps, piece) {
    try { return (this._achvOnPiece && this._achvOnPiece(pid, ps, piece, 'reveal', { quiet: true })) || []; } catch (e) { return []; }
  },

  /* The answer, to the holder only.  A refusal says why and changes nothing;
     its reason never depends on the grade. */
  _revealBagSend(pid, res, achv) {
    const ws = this._wsBySessionId && this._wsBySessionId(pid);
    if (!ws || !res) return;
    try { ws.send(JSON.stringify({ type: 'item_reveal', payload: res })); } catch (e) { /* the record is saved; the next echo carries it */ }
    /* ...and only THEN what the grade earned (see _revealBagAchv) */
    if (Array.isArray(achv) && achv.length && this._achvSend) this._achvSend(pid, { new: achv });
  },

  /* reveal_item { field, gid } | { field: 'weaponStash', idx, name }.
     Returns the answer sent (tests), or null when dropped unanswered. */
  _handleRevealItem(session, payload) {
    if (!session || !session.id) return null;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps || ps.disconnected) return null;
    /* a player's own tap, paced like an equip (flood.js); past the burst the
       ask is answered `busy` and nothing changes */
    if (this._paceTake && !this._paceTake('reveal', pid, PACE.RPG)) {
      const r = { ok: false, reason: 'busy' };
      this._revealBagSend(pid, r);
      return r;
    }
    const p = payload && typeof payload === 'object' ? payload : Object.create(null);
    const res = this._revealBagOpen(pid, ps, { field: p.field, gid: p.gid, idx: p.idx, name: p.name });
    if (!res.ok) {
      const r = { ok: false, reason: res.reason, field: typeof p.field === 'string' ? p.field.slice(0, 16) : null,
        ...(typeof p.gid === 'string' ? { gid: p.gid.slice(0, 40) } : {}), ...(Number.isInteger(p.idx) ? { idx: p.idx } : {}) };
      this._revealBagSend(pid, r);
      return r;
    }
    const pub = this._revealBagAnswer(res);
    this._revealBagSend(pid, pub, res.achv);
    /* the weapon bag is the phone's mirror of ours: the echo carries the
       open blade (and, v2 delta, only because it changed) */
    if (res.field === 'weaponStash' || REVEAL_BAG.WORN_WEAPONS.indexOf(res.field) >= 0) {
      const ws = this._wsBySessionId(pid);
      if (ws) this._sendPlayerState(ws, pid);
    }
    return pub;
  },

  /* The answer's wire shape: the opened piece (its grade now the holder's to
     see), the ladder to play, or `already`. */
  _revealBagAnswer(res) {
    return {
      ok: true, field: res.field,
      ...(res.gid ? { gid: res.gid } : {}), ...(Number.isInteger(res.idx) ? { idx: res.idx } : {}),
      ...(res.name ? { name: res.name } : {}),
      piece: res.piece || null,
      reveals: res.reveals || null,
      ...(res.already ? { already: true } : {}),
    };
  },

  /* ═══ THE EQUIP PATHS: WEARING OPENS IT ═══
     Called with the piece about to go on, after the path's own gates said
     yes.  Opens every copy, plays the ceremony on the holder's phone, and
     returns the piece to wear (now open).  An open piece comes straight back. */
  _revealBagOnWear(pid, ps, slot, piece) {
    if (!isUnrevealed(piece) || !ps) return piece;
    let res = null;
    if (REVEAL_BAG.WORN_WEAPONS.indexOf(slot) >= 0) {
      /* the weapon IS the stash entry about to move: clear it in place */
      delete piece.unrevealed;
      const achv = this._revealBagAchv(pid, ps, piece);
      res = { ok: true, field: slot, name: typeof piece.name === 'string' ? piece.name.slice(0, 40) : null, piece, reveals: this._revealsFor(piece, null), achv };
      /* the equip path saves at the player's pace; the open is saved now,
         before its answer goes (handoff rule 10) */
      this._saveRpg(pid, ps);
    } else {
      /* the piece to wear is the path's own copy (the ledger's rebuild, or
         the resolved claim), its grade already the server's: the row and the
         stash copies are opened, and the copy put on carries no mark */
      const gid = typeof piece.gid === 'string' ? piece.gid : null;
      const field = slot === 'legsArmor' ? 'legsStash' : 'armorStash';
      res = gid ? this._revealBagOpen(pid, ps, { field, gid }) : null;
      piece = { ...piece };
      delete piece.unrevealed;
      if (res && res.ok) res = { ...res, field };
    }
    if (res && res.ok) this._revealBagSend(pid, this._revealBagAnswer(res), res.achv);
    return piece;
  },

  /* ═══ THE JOIN ═══
     Called from _handleJoin once the worn slots, the stashes, the ledger, the
     post and the achievements' record are in.  Opens:
       - anything WORN that is still marked (a phone that wore it locally, or
         a record from a rolled-back worker): a worn piece is never a secret;
       - EVERYTHING still marked, when this phone cannot show a "?" (an old
         tab: `rb` absent) or the switch is off -- today's at-once reveal.
     Returns the answers to send once the phone has its world (join.js sends
     them after player_state).  One record save, only when something opened
     (rare: an old tab, or the switch thrown); the ledger is saved by each
     open. */
  _revealBagOnJoin(pid, ps, session) {
    const out = [];
    if (!pid || !ps) return out;
    try {
      for (const s of REVEAL_BAG.WORN_WEAPONS.concat(REVEAL_BAG.WORN_ARMOUR)) {
        if (!isUnrevealed(ps[s])) continue;
        const r = this._revealBagOpen(pid, ps, { worn: s }, { save: false });
        if (r.ok && !r.already) out.push({ ...this._revealBagAnswer(r), _achv: r.achv });
      }
      if (!this._revealBagHolds(session)) {
        if (Array.isArray(ps.weaponStash)) {
          for (let i = 0; i < ps.weaponStash.length; i++) {
            if (!isUnrevealed(ps.weaponStash[i])) continue;
            const r = this._revealBagOpen(pid, ps, { field: 'weaponStash', idx: i }, { save: false });
            if (r.ok && !r.already) out.push({ ...this._revealBagAnswer(r), _achv: r.achv });
          }
        }
        const ledger = this._gearProvOf ? this._gearProvOf(pid) : null;
        const gids = [];
        if (ledger && Array.isArray(ledger.list)) {
          for (const row of ledger.list) {
            if (row && row.p && row.p.unrevealed && (row.slot === 'armor' || row.slot === 'legsArmor')) gids.push([row.slot, row.id]);
          }
        }
        for (const s of REVEAL_BAG.WORN_ARMOUR) {
          const f = GEAR_PROV_FIELD[s];
          for (const g of (Array.isArray(ps[f]) ? ps[f] : [])) {
            if (isUnrevealed(g) && typeof g.gid === 'string' && !gids.some((x) => x[1] === g.gid)) gids.push([s, g.gid]);
            else if (isUnrevealed(g) && typeof g.gid !== 'string') delete g.unrevealed;   /* no id, no proof, no secret to keep */
          }
        }
        for (const [s, gid] of gids) {
          const r = this._revealBagOpen(pid, ps, { field: GEAR_PROV_FIELD[s], gid }, { save: false });
          if (r.ok && !r.already) out.push({ ...this._revealBagAnswer(r), _achv: r.achv });
        }
      }
    } catch (e) { /* a join must never fail on a reveal; the next join tries again */ }
    if (out.length) this._saveRpg(pid, ps);
    return out;
  },

  _revealBagSendJoin(ws, list) {
    if (!ws || !Array.isArray(list) || !list.length) return;
    const achv = [];
    for (const r0 of list) {
      const r = { ...r0 };
      if (Array.isArray(r._achv)) for (const id of r._achv) if (achv.indexOf(id) < 0) achv.push(id);
      delete r._achv;
      try { ws.send(JSON.stringify({ type: 'item_reveal', payload: r })); } catch (e) { /* the record is saved */ }
    }
    /* what the grades earned, after the answers (see _revealBagAchv) */
    const pid = this.sessions && this.sessions.get(ws) && this.sessions.get(ws).id;
    if (achv.length && pid && this._achvSend) this._achvSend(pid, { new: achv });
  },

  /* ═══ THE TEST LEVER (devtools.js /dev/revealbag) ═══
     { grade } -- the next mystery-capable drop at a kill rolls this grade (a
       1-in-11 drop cannot be waited for; the phone test then kills the real
       way, through /dev/killroll);
     { grade, give: 'armor' | 'legsArmor' | 'weapon' } -- one such piece put
       in this player's bag now, through the pickup's own mark and the pickup's
       own credit shape, so the UI review can draw a "?" without a kill. */
  _revealBagDev(playerId, body) {
    const ps = this.playerState[playerId];
    if (!ps) return { ok: false, error: 'not online' };
    const b = body && typeof body === 'object' ? body : Object.create(null);
    const grade = typeof b.grade === 'string' && REVEAL_BAG.GRADES.indexOf(b.grade) >= 0 ? b.grade : null;
    if (!grade) return { ok: false, error: 'grade: rare, elite or godly' };
    if (b.give == null) {
      this._revealBagNextGrade = grade;
      return { ok: true, next: grade };
    }
    const session = this._sessionById ? this._sessionById(playerId) : null;
    const ws = this._wsBySessionId(playerId);
    if (b.give === 'weapon') {
      const w = this._rollIronWeaponForKill(1, true);
      if (!w) return { ok: false, error: 'no blade' };
      w.quality = grade;
      this._revealBagMark(session, w);
      if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
      if (ps.weaponStash.length >= this.WEAPON_STASH_CAP) return { ok: false, error: 'weapon bag full' };
      ps.weaponStash.push(w);
      this._saveRpg(playerId, ps);
      if (ws) this._sendPlayerState(ws, playerId);
      return { ok: true, give: 'weapon', unrevealed: !!w.unrevealed, idx: ps.weaponStash.length - 1 };
    }
    const d = MONSTER_ARMOR_DROPS.find((x) => x.slot === b.give);
    if (!d) return { ok: false, error: 'give: armor, legsArmor or weapon' };
    const piece = this._revealBagMark(session, { name: d.name, mat: d.mat, slot: d.slot, tierMult: d.tierMult, quality: grade });
    this._gearProvRecord(playerId, d.slot, piece, 'drop');
    const pub = revealPublic(piece);
    if (ws) {
      try {
        ws.send(JSON.stringify({ type: 'loot_credit', payload: {
          lootId: 'dev-reveal', zone: ps.z || null, coins: 0, skull: null, shard: null, gem: null,
          armor: [pub], reveals: piece.unrevealed ? null : this._revealsFor(null, [piece]),
          weapon: null, weaponStashed: false, weaponSoldFor: null, viaPet: false,
        } }));
      } catch (e) { /* the row is recorded; a rejoin's adoption has it */ }
    }
    return { ok: true, give: d.slot, gid: piece.gid, unrevealed: !!piece.unrevealed };
  },
};
