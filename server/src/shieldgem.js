/* ═══ v2.3.3187: A GEM GOES INTO A SHIELD ON THE WORKER ═══
 *
 * The owner, on the overnight hunt's report: "Go recommended fixes" -- its
 * decision 11.  The Enchanter's "slot a gem in your shield" button was the
 * last gem act the game did alone (ARCHITECTURE-HANDOFF backlog A; the amulet
 * slot moved here in v2.3.1192, extraction in v2.3.1209), and both halves of
 * that showed:
 *
 *   - THE GEM WAS NEVER TAKEN.  The game took one off its own count, but the
 *     worker owns `lifeSkills.gems` (v2.3.1198) and echoes it, so the next
 *     player_state put the gem back: a shield gem cost nothing, for anyone.
 *   - "TAKE OUT" COULD NOT WORK.  The Blacksmith's Take out (amulet.js
 *     op:'extract', target 'shield') strips the WORKER's shield, which never
 *     had the gem, so it ended in "Could not remove the gem".  And an old
 *     shield the worker took from a join's claim kept whatever gem the claim
 *     said -- free polished gems, closed separately (#866: only a shield the
 *     worker made gives its gem back).
 *
 * Now the game asks, and the worker does it:
 *
 *     shield_gem { gem, gid }   -- a shield the worker made, by its id
 *     shield_gem { gem, sig }   -- one from before the ledger (no id), by the
 *                                  signature both sides already use for it
 *                                  (name|gearBase|tierMult|tier, shieldwear.js)
 *
 * The worker finds THAT shield among the ones it holds for you -- on the arm
 * (ps.shield), else in its copy of your bag (ps.shieldStash) -- takes one
 * polished gem of that element from its own count, puts the gem in, pays the
 * Enchanting XP the game always paid (20), and answers
 *
 *     shield_gem_result { ok: true, gem, name, gid, sig, worn }
 *     shield_gem_result { ok: false, reason, gem }
 *
 * A shield the worker MADE is renamed as the game always named it ("<metal>
 * <Element> Shield"): its id is what both sides know it by, so a new name
 * changes nothing about which piece it is.  A shield from before the ledger
 * KEEPS ITS NAME: both sides know it only by its signature, which holds the
 * name, and a rename the game never heard of (a lost answer, a reconnect at
 * the wrong moment) would turn the worker's copy into a piece the game does
 * not have -- the join's echo would then hand the game a second copy, and
 * the next join's bag would hand it back to the worker (gearstash.js merges
 * by signature).  So its `sig` in the answer is the one it always had, and
 * the game takes the gem by it, from this answer or from any later echo.
 *
 * A gem already in the shield is replaced and lost, as the game's "Slot new
 * gem to replace" always said.  The row in the gear ledger follows the change
 * (_gearProvTouch), so a shield the worker made keeps its gem through a
 * reconnect -- and gives it back at the Blacksmith's Take out.
 *
 * WHAT IS NOT CHANGED.  The shield's bonus is still the game's to compute
 * (blocking is client-side, R._shieldBonus); nothing here feeds a damage
 * roll.  No price, no XP, no gem table moved: one polished gem and 20
 * Enchanting XP a slot, as before -- the gem is now really spent.
 *
 * Nothing is described on the wire: the shield is named, never sent, so
 * nothing about it can be inflated (the shield_wear posture).  A shield the
 * worker does not hold for you is refused ('not_held').
 *
 * DEPLOY ORDER (rule 19): the game sends shield_gem only when the worker
 * advertises caps.shieldgem -- an older worker has no case for the type and
 * would rebroadcast it to the room.  Against such a worker, or with the kill
 * switch on, the game keeps its old local slot.  KILL SWITCH (lower case,
 * TRAPS §117): `shieldgem: false` in liveflags un-advertises it and refuses
 * every ask ('off'). */
import { AMULET_GEMS, BLACKSMITH_TIER_LABELS } from './data.js';
import { GEAR_PROV_FIELD } from './gearprov.js';
import { shieldSig } from './shieldwear.js';

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

export const SHIELD_GEM = Object.freeze({
  /* Enchanting XP a slot pays -- the game's own literal at its slot site
     (EnchantPanel: addLifeSkillXp(sk, 'enchanting', 20)), the amulet's too */
  XP: 20,
  /* the longest id or signature read, as shield_wear reads them */
  GID_MAX: 40,
  SIG_MAX: 200,
});

/* The name a shield takes with a gem in it: EnchantPanel's own rule,
   `(BLACKSMITH_TIERS[gearBase]?.label || 'Basic') + ' ' + Elem + ' Shield'`,
   on the label table mirror-audit pins to the client's.  Own-property read:
   a gearBase of '__proto__' is 'Basic', as the game's optional chain makes it
   (TRAPS #6). */
export function shieldGemName(gearBase, gem) {
  const label = typeof gearBase === 'string' && hasOwn(BLACKSMITH_TIER_LABELS, gearBase) ? BLACKSMITH_TIER_LABELS[gearBase] : 'Basic';
  return label + ' ' + gem.charAt(0).toUpperCase() + gem.slice(1) + ' Shield';
}

const gidOf = (p) => (p && typeof p === 'object' && typeof p.gid === 'string' && p.gid ? p.gid : null);
const isPiece = (p) => !!p && typeof p === 'object' && !Array.isArray(p);

export const shieldGemMethods = {
  _shieldGemOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && hasOwn(f, 'shieldgem') && !f.shieldgem);
  },

  _shieldGemSend(pid, payload, withState) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'shield_gem_result', payload })); } catch (e) { /* the act is saved; the state carries it */ }
    if (withState) this._sendPlayerState(ws, pid);
  },

  /* The shield the ask names, among the ones the worker holds for this
     player: on the arm first, then in its copy of the bag.  By id, or -- for
     a piece with no id -- by signature (the same piece as shield_wear and
     the join's bag merge count it). */
  _shieldGemPiece(ps, payload) {
    const gid = typeof payload.gid === 'string' && payload.gid && payload.gid.length <= SHIELD_GEM.GID_MAX ? payload.gid : null;
    const sig = !gid && typeof payload.sig === 'string' && payload.sig && payload.sig.length <= SHIELD_GEM.SIG_MAX ? payload.sig : null;
    if (!gid && !sig) return { reason: 'bad' };
    const same = (p) => isPiece(p) && (gid ? gidOf(p) === gid : !gidOf(p) && shieldSig(p) === sig);
    if (same(ps.shield)) return { piece: ps.shield, worn: true };
    const bag = ps[GEAR_PROV_FIELD.shield];
    if (Array.isArray(bag)) {
      const piece = bag.find(same);
      if (piece) return { piece, worn: false };
    }
    return { reason: 'not_held' };
  },

  /* shield_gem { gem, gid | sig }.  Returns the answer sent (the tests), or
     null when dropped unanswered (no player). */
  _handleShieldGem(session, payload) {
    if (!session || !session.id) return null;
    const pid = session.id;
    const ps = this.playerState[pid];
    if (!ps) return null;
    const p = payload && typeof payload === 'object' ? payload : {};
    const gem = typeof p.gem === 'string' && AMULET_GEMS.has(p.gem) ? p.gem : null;
    const refuse = (reason) => {
      const r = { ok: false, reason, gem };
      this._shieldGemSend(pid, r, false);
      return r;
    };
    if (this._shieldGemOff()) return refuse('off');
    if (ps.dying || ps.dead) return refuse('down');
    if (!gem) return refuse('bad_gem');
    /* the amulet slot's gate: slotting changes gear, and a guard's lock
       holds gear (threat.js; it tells the game itself) */
    if (this._threatGearLocked(pid, ps)) return refuse('locked');
    const at = this._shieldGemPiece(ps, p);
    if (!at.piece) return refuse(at.reason);
    const gems = ps.lifeSkills && typeof ps.lifeSkills === 'object' && ps.lifeSkills.gems && typeof ps.lifeSkills.gems === 'object'
      ? ps.lifeSkills.gems : null;
    const key = 'polished_' + gem;
    const have = gems ? Math.floor(Number(gems[key]) || 0) : 0;
    if (have < 1) return refuse('no_gem');

    const piece = at.piece;
    const made = !!gidOf(piece);
    gems[key] = have - 1;
    if (gems[key] <= 0) delete gems[key];
    piece.gem = gem;
    /* only a shield known by its id takes the new name (see the header) */
    if (made) piece.name = shieldGemName(piece.gearBase, gem);
    /* the row follows the piece (gearprov.js): a shield the worker made is
       rebuilt from its row on some paths, and without this the gem would go
       on the far side of a reconnect -- and Take out would find none.  A
       no-op for a piece with no id. */
    this._gearProvTouch(pid, piece);
    this._addLifeSkillXp(ps, 'enchanting', SHIELD_GEM.XP);
    this._saveRpg(pid, ps);
    const r = { ok: true, gem, name: piece.name, gid: gidOf(piece), sig: made ? null : shieldSig(piece), worn: at.worn };
    this._shieldGemSend(pid, r, true);
    return r;
  },
};
