/* ═══ v2.3.3187: THE SHIELD'S GEM, PUT IN BY THE WORKER ═══
 *
 * The owner, on the overnight hunt's report: "Go recommended fixes" (its
 * decision 11).  The Enchanter's shield gem slot was this browser's alone:
 * it took a gem off its own count, which the worker's next player_state put
 * back (the worker owns lifeSkills.gems since v2.3.1198), and the
 * Blacksmith's Take out then found no gem on the worker's shield.
 *
 * Against a worker that advertises caps.shieldgem the slot is ASKED for
 * (server/src/shieldgem.js):
 *
 *   shield_gem { gem, gid }   the shield on the arm, by its id
 *   shield_gem { gem, sig }   one from before the ledger, by its signature
 *
 * and nothing changes here until the worker answers `shield_gem_result`:
 * then the shield it names (by id, or by its signature) takes the gem and the
 * name the worker gave it -- a shield it made is renamed "<metal> <Element>
 * Shield", one from before the ledger keeps its name, as that name is part of
 * the signature both sides know it by (server/src/shieldgem.js says why) --
 * and the gem count and the Enchanting XP arrive on the player_state that
 * follows.  A refusal changes nothing; its reason is the line the Enchanter
 * shows.
 *
 * And because the worker's copy is now the one that holds a shield's gem,
 * the player_state's shield adopts its gem onto this browser's copy of the
 * same piece (`adoptShieldGem`): by id for a shield the worker made (its name
 * too), by signature for one from before the ledger.  That is what shows a
 * Take out, mends an answer lost to a reconnect, and clears a gem this
 * browser once put into a shield the worker made, alone, that the worker
 * never took (the count already showed that gem as unspent).
 *
 * Against an older worker, or with the kill switch on, the Enchanter keeps
 * its old local slot (EnchantPanel.jsx). */
import { BLACKSMITH_TIERS, BT_AUDIO, ELEMENTS, SHIELD_GEM_STATS, recalcDerived } from '@/data/index.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { shieldSig, shieldWearPayload } from '@/game/shieldWear.js';
import { cue } from '@/game/eventSounds.js'; /* v2.3.3343: a gem set in a shield, heard */

/* how long an unanswered ask holds the gem buttons */
export const SHIELD_GEM_WAIT_MS = 4000;

let _last = null;
let _pending = null;
const _listeners = new Set();
const emit = () => { for (const fn of _listeners) { try { fn(); } catch (e) { /* one dead listener must not starve the rest */ } } };

/** The last answer: {ok, reason?, gem, name?, at}, and the ask in flight. */
export const shieldGemBus = {
  get() { return _last; },
  pending() { return _pending && Date.now() - _pending.at < SHIELD_GEM_WAIT_MS ? _pending : null; },
  subscribe(fn) { _listeners.add(fn); return () => _listeners.delete(fn); },
};

/** Does the worker put shield gems in?  (else the Enchanter's old local slot) */
export function shieldGemOnServer(S) {
  return !!(S && S._serverCaps && S._serverCaps.shieldgem && S.channel);
}

const REASON = Object.freeze({
  off: 'Shield gems are closed for now',
  down: 'Not while you are down',
  bad_gem: 'That gem does not fit a shield',
  locked: 'Your gear is locked for now',
  not_held: 'The server has no record of this shield',
  no_gem: 'No polished gem of that kind left',
  bad: 'Could not slot the gem',
});
export function shieldGemReasonText(reason) {
  return REASON[reason] || REASON.bad;
}

/** The value a gem gives this shield, as the Enchanter's buttons preview it. */
export function shieldGemPreview(shield, gem) {
  const st = SHIELD_GEM_STATS[gem];
  if (!st || !Object.prototype.hasOwnProperty.call(SHIELD_GEM_STATS, gem)) return null;
  const bt = shield && Object.prototype.hasOwnProperty.call(BLACKSMITH_TIERS, shield.gearBase) ? BLACKSMITH_TIERS[shield.gearBase] : null;
  return { ...st, value: Math.round((st.base + st.perPower * ((bt && bt.tierMult) || 1)) * 10) / 10 };
}

/** Ask the worker to put `gem` into the shield on the arm.  The payload sent,
 *  or null (no shield, an ask already waiting, or a worker that does not). */
export function askShieldGem(S, gem) {
  if (!shieldGemOnServer(S) || !S.rpg || !S.rpg.shield || shieldGemBus.pending()) return null;
  const named = shieldWearPayload(S.rpg);
  if (!named || named.none) return null;
  const payload = { gem, ...named };
  try { S.channel.send({ type: 'shield_gem', payload }); } catch (e) { return null; }
  _pending = { at: Date.now(), gem };
  emit();
  return payload;
}

function say(S, text, color) {
  try { const P = S && S.player; if (P) pushDmgPopup(S, P.x, P.y - 30, text, color || '#D8AA58'); } catch (e) { /* popup only */ }
}

/** shield_gem_result */
export function applyShieldGemResult(S, payload, save) {
  if (!payload || typeof payload !== 'object') return;
  const R = S && S.rpg;
  _pending = null;
  if (payload.ok && R && typeof payload.gem === 'string' && typeof payload.name === 'string') {
    const gid = typeof payload.gid === 'string' && payload.gid ? payload.gid : null;
    const sig = typeof payload.sig === 'string' ? payload.sig : null;
    const same = (p) => !!p && typeof p === 'object' && (gid ? p.gid === gid : (!p.gid && sig !== null && shieldSig(p) === sig));
    let piece = same(R.shield) ? R.shield : null;
    if (!piece && Array.isArray(R.shieldStash)) piece = R.shieldStash.find(same) || null;
    if (piece) {
      piece.gem = payload.gem;
      piece.name = payload.name;
      try { recalcDerived(R); } catch (e) { /* the bonus refreshes on the next derive */ }
      try { if (typeof save === 'function') save(S); } catch (e) { /* the worker holds the truth */ }
      const pv = shieldGemPreview(piece, payload.gem);
      const el = ELEMENTS[payload.gem];
      if (pv) say(S, pv.label + ' +' + pv.value + pv.unit, el && el.color);
    }
    cue('gemSet');   /* v2.3.3343: collect() is a beep(), silent (SOUND-GAPS) */
  } else if (!payload.ok) {
    say(S, shieldGemReasonText(payload.reason), '#E58C7A');
  }
  _last = { ok: !!payload.ok, reason: payload.reason || null, gem: payload.gem || null, name: payload.name || null, at: Date.now() };
  try { if (typeof window !== 'undefined' && window.__btProbe) (window.__btShieldGemLog || (window.__btShieldGemLog = [])).push(_last); } catch (e) { /* probe only */ }
  emit();
}

/** The player_state's shield (`sv`, the worker's copy) onto this browser's
 *  copy of the same piece: what is in it.  By id for a shield the worker made
 *  (and its name, which only the worker changes), else by signature -- the
 *  arm's copy first, else ONE in the bag, as the echo is one piece.  True
 *  when something changed (the caller re-derives the shield's bonus). */
export function adoptShieldGem(R, sv) {
  if (!R || !sv || typeof sv !== 'object') return false;
  const gem = typeof sv.gem === 'string' && sv.gem ? sv.gem : null;
  const bag = Array.isArray(R.shieldStash) ? R.shieldStash : [];
  const isPiece = (p) => !!p && typeof p === 'object';
  let changed = false;
  const setGem = (p) => { if ((p.gem || null) !== gem) { p.gem = gem; changed = true; } };
  if (typeof sv.gid === 'string' && sv.gid) {
    const name = typeof sv.name === 'string' && sv.name ? sv.name : null;
    const fix = (p) => {
      if (!isPiece(p) || p.gid !== sv.gid) return;
      setGem(p);
      if (name && p.name !== name) { p.name = name; changed = true; }
    };
    fix(R.shield);
    bag.forEach(fix);
    return changed;
  }
  const sig = shieldSig(sv);
  const same = (p) => isPiece(p) && !p.gid && shieldSig(p) === sig;
  const piece = same(R.shield) ? R.shield : bag.find(same);
  if (piece) setGem(piece);
  return changed;
}
