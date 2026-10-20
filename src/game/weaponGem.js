/* ═══ v2.3.3513: THE WEAPON'S GEM, PUT IN BY THE WORKER ═══
 *
 * The owner, 2026-10-20, on docs/GEM-PLAN.md: "All of that sounds good" --
 * its Phase 1.  The Enchanter's weapon slot was this browser's alone: it took
 * a gem off its own count and wrote its own copy of the weapon, and the
 * worker -- which owns the gem count (v2.3.1198) and sends its own weapons --
 * put both back: the gem was never spent, the weapon came back plain, the
 * Element Burst was refused and the flame amulet never counted.
 *
 * Against a worker that advertises caps.weapongem the gem is ASKED for
 * (server/src/weapongem.js):
 *
 *   weapon_gem { slot, gem }   slot 'weapon' | 'rangedWeapon' | 'staffWeapon'
 *
 * and nothing changes here until the worker answers.  The player_state that
 * follows `weapon_gem_result` carries the weapon (wsClient takes weapons
 * wholesale from it), the gem count and the Enchanting XP; the answer itself
 * says what was paid, so a level is celebrated and a refusal is put in words.
 * Taking a gem out is the Blacksmith's own ask (amulet_forge_request
 * op 'extract', caps.gemExtract), offered on the Enchanter's weapon too.
 *
 * Against an older worker, or with the kill switch on, the Enchanter keeps
 * its old local slot (EnchantPanel.jsx). */
import { ELEMENTS } from '@/data/index.js';
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { cue } from '@/game/eventSounds.js';
import { celebrateLifeSkillLevel } from '@/game/levelCelebration.js';

/* how long an unanswered ask holds the gem buttons */
export const WEAPON_GEM_WAIT_MS = 4000;

let _last = null;
let _pending = null;
const _listeners = new Set();
const emit = () => { for (const fn of _listeners) { try { fn(); } catch (e) { /* one dead listener must not starve the rest */ } } };

/** The last answer {ok, reason?, slot, gem, at}, and the ask in flight
 *  ({slot, gem, at}, or a take-out: {slot, out: true, at}). */
export const weaponGemBus = {
  get() { return _last; },
  pending() { return _pending && Date.now() - _pending.at < WEAPON_GEM_WAIT_MS ? _pending : null; },
  subscribe(fn) { _listeners.add(fn); return () => _listeners.delete(fn); },
};

/** Does the worker put weapon gems in?  (else the Enchanter's old local slot) */
export function weaponGemOnServer(S) {
  return !!(S && S._serverCaps && S._serverCaps.weapongem && S.channel);
}

/** Is the monsters' hold rule on?  (the Enchanter's words for frost and venom) */
export function monsterHoldOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.monsterhold);
}

const REASON = Object.freeze({
  off: 'Weapon gems are closed for now',
  down: 'Not while you are down',
  bad_slot: 'Could not set the gem',
  bad_gem: 'That gem does not fit a weapon',
  locked: 'Your gear is locked for now',
  no_weapon: 'No weapon in that slot',
  full: 'Take the gem out first',
  level: 'A second gem needs Enchanting 20',
  same: 'The second gem must be another element',
  volatile: 'That pair needs Fusion-ready gear',
  no_gem: 'No polished gem of that kind left',
  bad: 'Could not set the gem',
});
export function weaponGemReasonText(reason) {
  return Object.prototype.hasOwnProperty.call(REASON, reason) ? REASON[reason] : REASON.bad;
}

/** Ask the worker to put `gem` into the weapon in `slot`.  The payload sent,
 *  or null (no weapon, an ask already waiting, or a worker that does not). */
export function askWeaponGem(S, slot, gem) {
  if (!weaponGemOnServer(S) || !S.rpg || !S.rpg[slot] || weaponGemBus.pending()) return null;
  const payload = { slot, gem };
  try { S.channel.send({ type: 'weapon_gem', payload }); } catch (e) { return null; }
  _pending = { at: Date.now(), slot, gem };
  emit();
  return payload;
}

/** Take the gem(s) out of the weapon in `slot`: the Blacksmith's own ask
 *  (server/src/amulet.js op 'extract', caps.gemExtract) -- it has no answer of
 *  its own, so the ask is let go when the weapon comes back bare (the
 *  player_state, `noteWeaponsArrived`) or after the wait. */
export function askWeaponGemOut(S, slot) {
  if (!S || !S._serverCaps || !S._serverCaps.gemExtract || !S.channel || !S.rpg || !S.rpg[slot] || weaponGemBus.pending()) return null;
  const payload = { op: 'extract', target: slot };
  try { S.channel.send({ type: 'amulet_forge_request', payload }); } catch (e) { return null; }
  _pending = { at: Date.now(), slot, out: true };
  emit();
  return payload;
}

/** The player_state brought weapons: a take-out waiting on a weapon that is
 *  bare now is done. */
export function noteWeaponsArrived(S) {
  if (!_pending || !_pending.out || !S || !S.rpg) return;
  const w = S.rpg[_pending.slot];
  if (w && (w.element1 || w.element2)) return;
  const slot = _pending.slot;
  _pending = null;
  _last = { ok: true, out: true, slot, at: Date.now() };
  try { cue('gemSet'); } catch (e) { /* sound only */ }
  emit();
}

function say(S, text, color) {
  try { const P = S && S.player; if (P) pushDmgPopup(S, P.x, P.y - 30, text, color || '#D8AA58'); } catch (e) { /* popup only */ }
}

/** weapon_gem_result */
export function applyWeaponGemResult(S, payload) {
  if (!payload || typeof payload !== 'object') return;
  _pending = null;
  const R = S && S.rpg;
  if (payload.ok) {
    const el = ELEMENTS[payload.gem];
    say(S, (typeof payload.gem === 'string' ? payload.gem : 'Gem') + ' set!', el && el.color);
    if (R) {
      /* the quests that ask for a gem set read these (the browser's own
         flags, rule 18: the worker never writes them mid-session) */
      if (!R._questFlags) R._questFlags = {};
      R._questFlags.enchantedWeapon = true;
      R._questFlags.slottedGem = true;
    }
    if (payload.leveled && typeof payload.newLevel === 'number') {
      try { celebrateLifeSkillLevel(S, 'enchanting', payload.newLevel, typeof payload.fromLevel === 'number' ? payload.fromLevel : payload.newLevel - 1); } catch (e) { /* the bar still shows it */ }
    }
    try { cue('gemSet'); } catch (e) { /* sound only */ }
  } else {
    say(S, weaponGemReasonText(payload.reason), '#E58C7A');
  }
  _last = { ok: !!payload.ok, reason: payload.reason || null, slot: payload.slot || null, gem: payload.gem || null, xp: payload.xp || 0, at: Date.now() };
  try { if (typeof window !== 'undefined' && window.__btProbe) (window.__btWeaponGemLog || (window.__btWeaponGemLog = [])).push(_last); } catch (e) { /* probe only */ }
  emit();
}
