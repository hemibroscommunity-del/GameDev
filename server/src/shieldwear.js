/* ═══ v2.3.3082: THE WORKER LEARNS WHICH SHIELD IS ON YOUR ARM ═══
 *
 * Asked "Shields and outfits in no man's land?" -- No man's land's open
 * question (docs/specs/no-mans-land.md, "Decisions for the owner"): a spare
 * shield stayed in your bag on an ordinary loss there because nothing told
 * the worker which shield you WEAR -- the owner said "Yes".
 *
 * Until now the shield was the one piece of gear the worker could not place.
 * Equipping one is a purely local move in the game (ItemDetailPopup,
 * equipActions.js: R.shield <-> R.shieldStash), and `ps.shield` was the
 * worker's OWNERSHIP record (quests.js v2.3.1683: "not a statement about
 * what is strapped to the arm").  So a worn shield and a spare looked alike
 * here, and No man's land took neither.
 *
 * Now the game says so, the way it says which armour you wear: whenever the
 * shield on your arm changes (and once on every join) it sends
 *
 *     shield_wear { gid }        -- a recorded piece, named by its id
 *     shield_wear { sig }        -- a piece from before the ledger (no id),
 *                                   by the signature both sides already use
 *                                   (name|gearBase|tierMult|tier)
 *     shield_wear { none: true } -- nothing on the arm
 *
 * and `ps.shield` becomes the shield you WEAR, `ps.shieldStash` the ones you
 * carry -- the armour's own model (grids.js armorRef), so No man's land's
 * loss treats a spare shield exactly as a spare torso (nomansland.js).
 *
 * ONLY A SHIELD YOU OWN.  The named piece must be one the worker already
 * holds for you: on your arm, in its copy of your bag (gearstash.js adopts
 * the bag at join, the auction house and the mail credit into it), or -- by
 * id -- in your provenance ledger.  Nothing is described on the wire, so
 * nothing can be inflated.  A piece the worker does not know leaves
 * everything as it was and marks the arm UNKNOWN for the session, and No
 * man's land then takes no shield (the fail-safe it always had).
 *
 * NO GATES.  Blocking is computed by the game (R._shieldBonus) and the
 * worker never refused a shield before; refusing one now would only make
 * the two disagree about which shield is spare -- the one thing this
 * message exists to settle.
 *
 * WHAT MOVES.  The piece you now wear leaves the bag list (that ONE copy)
 * and the one you wore goes into it, unless a copy of it is already there
 * (bagIt says why).  Nothing is ever deleted: a stale copy
 * the bag list may still carry from an earlier join (a piece put on since)
 * stays, and No man's land already treats such a copy as the piece you
 * wear (same id, or the same signature for a piece with none).
 *
 * `ps._shieldKnown` (runtime only, never saved: rule 1) says the game has
 * told this session which shield it wears.  A game too old to say leaves it
 * unset, and No man's land takes no shield from that player.
 *
 * DEPLOY ORDER (rule 19): the game sends shield_wear only when the worker
 * advertises caps.shieldwear -- an older worker would rebroadcast an unknown
 * type to the room.  An older game never sends it, and keeps every shield in
 * No man's land, as before.  KILL SWITCH (lower case, TRAPS §117):
 * `shieldwear: false` in liveflags un-advertises it, ignores every report,
 * and No man's land takes no shield on an ordinary loss again. */
import { GEAR_PROV_FIELD } from './gearprov.js';

export const SHIELD_WEAR = Object.freeze({
  /* the longest id or signature the worker reads */
  GID_MAX: 40,
  SIG_MAX: 200,
});

/* the shield's signature: wsClient.js `_shSig`, gearstash.js stashSig and
   nomansland.js sigOf all spell it this way */
export function shieldSig(p) {
  return p && typeof p === 'object' ? [p.name || '', p.gearBase || '', p.tierMult == null ? '' : p.tierMult, p.tier || ''].join('|') : '';
}

const gidOf = (p) => (p && typeof p === 'object' && typeof p.gid === 'string' && p.gid ? p.gid : null);
/* one piece, as both sides count pieces: by id, or by signature for two
   pieces neither of which has one */
const samePiece = (a, b) => {
  const ga = gidOf(a), gb = gidOf(b);
  if (ga || gb) return ga === gb;
  return shieldSig(a) === shieldSig(b);
};
/* the shield you took off goes into the bag list -- unless a copy of it is
   already there (an earlier join's): the bag is re-offered and merged on every
   join (gearstash.js, the larger count wins), so one copy too few here is
   made up then, and one too many would be a second shield for whoever takes
   the bag in No man's land */
function bagIt(bag, piece) {
  if (piece && !bag.some((p) => p && typeof p === 'object' && samePiece(p, piece))) bag.push(piece);
}

export const shieldWearMethods = {
  _shieldWearOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'shieldwear') && !f.shieldwear);
  },

  /* shield_wear: which shield is on the arm.  Returns 'worn' | 'none' |
     'same' | 'unknown' | null (refused outright) -- for the tests; the game
     is answered by the player_state echo, as for armour. */
  _handleShieldWear(session, payload) {
    if (this._shieldWearOff() || !session || !session.id) return null;
    const ps = this.playerState[session.id];
    if (!ps || !payload || typeof payload !== 'object') return null;
    const field = GEAR_PROV_FIELD.shield;
    if (!Array.isArray(ps[field])) ps[field] = [];
    const bag = ps[field];
    const worn = ps.shield && typeof ps.shield === 'object' ? ps.shield : null;

    if (payload.none === true) {
      bagIt(bag, worn);
      ps.shield = null;
      ps._shieldKnown = true;
      if (worn) this._shieldWearSaved(session.id, ps);
      return 'none';
    }

    const gid = typeof payload.gid === 'string' && payload.gid && payload.gid.length <= SHIELD_WEAR.GID_MAX ? payload.gid : null;
    const sig = !gid && typeof payload.sig === 'string' && payload.sig && payload.sig.length <= SHIELD_WEAR.SIG_MAX ? payload.sig : null;
    if (!gid && !sig) return null;
    const same = (p) => (gid ? gidOf(p) === gid : !gidOf(p) && shieldSig(p) === sig);

    /* already on the arm: nothing moves */
    if (worn && same(worn)) {
      ps._shieldKnown = true;
      return 'same';
    }
    /* from the bag: that ONE copy leaves it */
    let piece = null;
    const at = bag.findIndex((p) => p && typeof p === 'object' && same(p));
    if (at >= 0) piece = bag.splice(at, 1)[0];
    /* by id, a piece the ledger says is yours though no list holds it */
    else if (gid && this._gearProvPieceByRef) piece = this._gearProvPieceByRef(session.id, 'shield', gid);
    if (!piece) {
      /* a shield the worker does not hold for you: nothing moves, and the
         arm is unknown -- No man's land takes no shield this session */
      ps._shieldKnown = false;
      return 'unknown';
    }
    bagIt(bag, worn);
    ps.shield = piece;
    ps._shieldKnown = true;
    this._shieldWearSaved(session.id, ps);
    return 'worn';
  },

  _shieldWearSaved(id, ps) {
    if (this._saveRpg) {
      try {
        const p = this._saveRpg(id, ps);
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) { /* the next save carries it */ }
    }
  },
};
