/* ═══ v2.3.3253: ATTACKING A PLAYER IS A CHOICE ═══
 *
 * Owner, 2026-10-14: "I don't necessarily want stray projectiles to hit
 * another player and have a red skull appear above the player just for that.
 * I want attacking other players to be intentional.  Maybe if a stray
 * projectile hits a player a one time window pops up asking if you want to
 * attack the player with a red skull appearing on the window and a tiny
 * information icon next to it.  I want the window itself to be small.  The
 * window can say attack, party, or ignore.  The window won't pop up again.
 * Tapping on the player while they're in the no man's land can still have the
 * party and attack (with red skull) options there."
 *
 * A STRAY SHOT ALREADY HURT NOBODY.  Only the player you AIM at is ever sent
 * to the worker as an attack: the shot's hit test (projectiles.js, v2.3.1302)
 * and the swing's (monsterCombat.js §19) both report a hit on a player only
 * when that player is your lock or your duel, and the worker skips everyone
 * but the declared `target` (v2.3.1306).  What was not a choice was the AIM:
 * a tap within 25 px of a player in No man's land locked onto them at once
 * (v2.3.3058), so a tap meant for the monster beside them, or the ground,
 * started a fight and the first hit gave you a red skull.
 *
 * NOW THE WINDOW ASKS (src/ui/mobile/NmlAskCard.jsx, small, just above the No
 * man's land badge): "Attack <name>?", the red skull with a tiny (i) beside it
 * (the badge's own explainer), and Attack / Party / Ignore.
 *   - A STRAY SHOT: one of your arrows, bolts or specials passes through a
 *     player you could fight here who is not your aim (projectiles.js
 *     _nmlStrayShot, the real hit test's own capsule and radius).  It still
 *     does nothing to them; it asks ONCE per player -- the owner's "won't pop
 *     up again" -- never over an open window, never in a duel.
 *   - A TAP on such a player you are not already aiming at (BroTown.jsx)
 *     asks every time, replacing a window about someone else.  A tap on the
 *     one you aim at keeps the aim, as before (on a computer the attack IS a
 *     click on them).
 *   - Attack aims (nmlAim): No man's land's lock, `nml`, the old tap's exact
 *     lock and "TARGET", and the worker decides every hit as before -- the
 *     red skull comes with the first one that lands.  Party sends the party
 *     invite the player card sends.  Ignore, or nothing for NML_ASK_MS, lets
 *     it go.  The window also goes the moment they can no longer be fought.
 *
 * HITTING BACK STAYS ONE TAP.  The player who gave you your white skull (the
 * worker's `by` on nml_skull, v2.3.3253), while you carry no red one, is aimed
 * at by a tap at once and never asked about by a stray shot: hitting them back
 * gives you no red skull (nomansland.js _nmlOnHit), so the window's warning
 * would be wrong, and a window in the middle of being attacked would cost you
 * the fight.  An older worker sends no `by`, and every tap asks.
 *
 * `?nmlask=0` is the game as it was (the tap aims, a stray shot asks
 * nothing).  Only against a worker with caps.nomansland, like everything of
 * No man's land's.
 */
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { nmlLive, nmlCanAttack } from '@/game/noMansLand.js';
import { chooseFoe } from '@/game/sparTargets.js'; /* v2.3.3268: Attack is a choice that lasts */

/* how long an unanswered window stays (it is an Ignore after this) */
export const NML_ASK_MS = 10000;

let _ask = null;   /* { id, name, lv, why: 'shot' | 'tap', at } | null */
const _subs = new Set();
function emit() {
  for (const fn of _subs) {
    try { fn(); } catch (e) { /* one listener never stops the others */ }
  }
}

function urlOff() {
  try { return typeof location !== 'undefined' && /[?&]nmlask=0(?:&|$)/.test(location.search || ''); } catch (e) { return false; }
}
const OFF = urlOff();

/** Is the asking on?  (No man's land live, and not ?nmlask=0.) */
export function nmlAskOn(S) {
  return !OFF && nmlLive(S);
}

/** How long a window waits (?nmlaskms=, or the QA handle's setMs, for a
 *  test: 1-60 s). */
let _msOverride = 0;
export function nmlAskMs() {
  if (_msOverride) return _msOverride;
  try {
    const m = typeof location !== 'undefined' && /[?&]nmlaskms=(\d+)/.exec(location.search || '');
    if (m) return Math.max(1000, Math.min(60000, Number(m[1]) || NML_ASK_MS));
  } catch (e) { /* the default */ }
  return NML_ASK_MS;
}

export function nmlAskCurrent() { return _ask; }
export function nmlAskSubscribe(fn) {
  _subs.add(fn);
  return () => { _subs.delete(fn); };
}

/* the players a window has been up for, this visit (a Set: ids are the
   other players', never a plain object's keys) */
function askedSet(S) {
  if (!(S._nmlAsked instanceof Set)) S._nmlAsked = new Set();
  return S._nmlAsked;
}
export function nmlAsked(S, id) {
  return !!(S && S._nmlAsked instanceof Set && S._nmlAsked.has(String(id)));
}

/** Did `id` give you your white skull, and you carry no red one?  Then a hit
 *  on them is hitting back, which the worker gives no red skull for. */
export function nmlHitBack(S, id, now) {
  const o = S && S._nmlSelf;
  if (!o || o.by == null || id == null || String(o.by) !== String(id)) return false;
  const gone = Math.max(0, (typeof now === 'number' ? now : Date.now()) - (o.at || 0));
  const red = (Number(o.red) || 0) - gone, white = (Number(o.white) || 0) - gone;
  return white > 0 && !(red > 0);
}

/** Aim at them: No man's land's lock -- what a tap did before v2.3.3253.
 *  ═══ v2.3.3268: AND THE CHOICE LASTS ═══
 *  The owner: "I want attacks against real players to hit them even when not
 *  locked on target but only if you select the attack option that pops up on
 *  the window".  Every road here is that choice -- the window's Attack, or a
 *  tap on the one who attacked you (hitting back needs no window) -- so it is
 *  recorded (game/sparTargets.js chooseFoe): your swings, arrows and bolts hit
 *  them whatever you have locked, while No man's land still lets you fight
 *  them. */
export function nmlAim(S, id) {
  const o = S && S.others && id != null ? S.others[id] : null;
  if (!o) return false;
  chooseFoe(S, id);
  S.lockedTarget = { type: 'player', id, ref: o, nml: true };
  try { pushDmgPopup(S, o.x, o.y - 70, 'TARGET', '#ff6b5e', { ts: Date.now() }); } catch (e) { /* the reticle says it */ }
  return true;
}

/** The player card's party invite (InspectPlayerPanel), for this window. */
export function nmlPartyInvite(S, id) {
  if (!S || !S.channel || !(S._serverCaps && S._serverCaps.party) || id == null) return false;
  S.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: id } });
  try { if (S.player) pushDmgPopup(S, S.player.x, S.player.y - 30, 'Party invite sent', '#fbbf24'); } catch (e) { /* sent all the same */ }
  return true;
}

/** Raise the window about `id`.  why 'shot': a stray shot passed through
 *  them -- once per player, never over an open window, never your attacker.
 *  why 'tap': you tapped them -- every time, replacing a window about
 *  someone else.  True when the window is up about them. */
export function nmlAsk(S, id, why) {
  if (!S || id == null || !nmlAskOn(S) || S._inDuel) return false;
  const key = String(id);
  if (!S.others || !S.others[key] || !nmlCanAttack(S, key)) return false;
  if (why === 'shot') {
    if (_ask || nmlAsked(S, key) || nmlHitBack(S, key)) return false;
  } else if (_ask && _ask.id === key) {
    return true;
  }
  const o = S.others[key];
  askedSet(S).add(key);
  _ask = { id: key, name: (o && o.name) || 'Player', lv: Number(o && o.rpgLv) || 1, why: why === 'shot' ? 'shot' : 'tap', at: Date.now() };
  emit();
  return true;
}

/** Let the window go without an answer (Ignore, its time up, or they can no
 *  longer be fought). */
export function nmlAskClose() {
  if (!_ask) return;
  _ask = null;
  emit();
}

/** The window's three buttons: 'attack' | 'party' | 'ignore'. */
export function nmlAskAnswer(S, choice) {
  const a = _ask;
  if (!a) return false;
  _ask = null;
  emit();
  if (choice === 'attack') return nmlCanAttack(S, a.id) ? nmlAim(S, a.id) : false;
  if (choice === 'party') return nmlPartyInvite(S, a.id);
  return true;
}

/* QA handle, the house style (__btNmlBadge, __btInfoPopup) */
try {
  if (typeof window !== 'undefined') {
    window.__btNmlAsk = {
      current: () => (_ask ? Object.assign({}, _ask) : null),
      asked: () => {
        const S = window._gameState && window._gameState.current;
        return S && S._nmlAsked instanceof Set ? Array.from(S._nmlAsked) : [];
      },
      off: OFF,
      setMs: (ms) => { _msOverride = ms ? Math.max(1000, Math.min(60000, Number(ms) || NML_ASK_MS)) : 0; },
    };
  }
} catch (e) { /* no window */ }
