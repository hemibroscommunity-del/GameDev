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
 *
 * ═══ v2.3.3290: A SWING ASKS TOO, AND AN UNANSWERED WINDOW CAN COME BACK ═══
 * The owner, 2026-10-17: "Attacks without locking on target did not pop up
 * the window for attack ignore etc."  Only a SHOT asked: an arrow, a bolt or
 * a special through a player (projectiles.js _nmlStrayShot).  A sword's swing
 * at a player you had not chosen -- the game's first weapon, and the one the
 * owner swung -- did nothing to them and asked nothing (monsterCombat.js sends
 * a swing's claim only for a lock, a duel or a chosen foe).  Now a swing whose
 * arc reaches such a player asks too (`nmlSwingAsk`), by the same rules as a
 * shot and the same reach and arc the swing's own claims use.
 *   And "once per player" now means once per ANSWER: a window that went with
 * no answer -- its 10 s ran out, or they stopped being someone you could
 * fight -- may ask again, a quiet NML_ASK_AGAIN_MS after it went
 * (`nmlAskClose`).  Before, a window that timed out unseen in the middle of a
 * fight was the only one that player would ever raise, until the page was
 * reloaded; Ignore still means never again.
 */
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { nmlLive, nmlCanAttack, nmlHere } from '@/game/noMansLand.js';
import { chooseFoe, isLiveFighter } from '@/game/sparTargets.js'; /* v2.3.3268: Attack is a choice that lasts; v2.3.3290: + who a swing already hits */

/* how long an unanswered window stays */
export const NML_ASK_MS = 10000;
/* v2.3.3290: and how long after one goes with no answer the same player may
   be asked about again by a shot or a swing (a tap asks every time) */
export const NML_ASK_AGAIN_MS = 15000;

let _ask = null;   /* { id, name, lv, why: 'shot' | 'swing' | 'tap', at } | null */
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
 *  them; why 'swing' (v2.3.3290): your swing reached them -- each once per
 *  player until it is answered (an unanswered window may ask again
 *  NML_ASK_AGAIN_MS after it went), never over an open window, never your
 *  attacker.  why 'tap': you tapped them -- every time, replacing a window
 *  about someone else.  True when the window is up about them. */
export function nmlAsk(S, id, why) {
  if (!S || id == null || !nmlAskOn(S) || S._inDuel) return false;
  const key = String(id);
  if (!S.others || !S.others[key] || !nmlCanAttack(S, key)) return false;
  if (why === 'shot' || why === 'swing') {
    if (_ask || nmlAsked(S, key) || nmlHitBack(S, key)) return false;
    const again = S._nmlAskAgain instanceof Map ? (S._nmlAskAgain.get(key) || 0) : 0;
    if (again && Date.now() < again) return false;
  } else if (_ask && _ask.id === key) {
    return true;
  }
  const o = S.others[key];
  askedSet(S).add(key);
  _ask = { id: key, name: (o && o.name) || 'Player', lv: Number(o && o.rpgLv) || 1, why: why === 'shot' || why === 'swing' ? why : 'tap', at: Date.now() };
  emit();
  return true;
}

/** Let the window go WITHOUT an answer: its time up, or they can no longer be
 *  fought.  v2.3.3290: so it is not "asked" -- a later shot or swing may ask
 *  again, NML_ASK_AGAIN_MS from now (Ignore is an answer: nmlAskAnswer). */
export function nmlAskClose(S) {
  if (!_ask) return;
  const a = _ask;
  _ask = null;
  if (S && a && a.id != null) {
    if (S._nmlAsked instanceof Set) S._nmlAsked.delete(String(a.id));
    if (!(S._nmlAskAgain instanceof Map)) S._nmlAskAgain = new Map();
    if (S._nmlAskAgain.size >= 32) S._nmlAskAgain.clear();
    S._nmlAskAgain.set(String(a.id), Date.now() + NML_ASK_AGAIN_MS);
  }
  emit();
}

/** ═══ v2.3.3290: YOUR SWING REACHED A PLAYER YOU HAVE NOT CHOSEN ═══
 *  The swing's own reach and arc from (px, py) toward `ang` (monsterCombat.js
 *  hands in what its claims use, `slack` a stride as theirs): the first player
 *  in it you could fight here -- not your lock, not one you chose or your
 *  sparring clone (the swing already lands on those), not drawn-away -- is
 *  asked about, as a stray shot's is.  The swing does them nothing.  Called on
 *  every frame of a swing's sweep: a window up, or none of this in No man's
 *  land, and it is gone at once.  True when it raised the window. */
export function nmlSwingAsk(S, px, py, ang, reach, arc, slack) {
  if (!S || !S.others || S._inDuel || _ask || !nmlAskOn(S) || !nmlHere(S)) return false;
  if (typeof px !== 'number' || typeof py !== 'number' || !isFinite(ang)) return false;
  const lt = S.lockedTarget && S.lockedTarget.type === 'player' && S.lockedTarget.id != null ? String(S.lockedTarget.id) : null;
  const R = (Number(reach) || 0) + (Number(slack) || 0);
  const half = (Number(arc) || 0) / 2;
  if (!(R > 0) || !(half > 0)) return false;
  const notDrawn = S._peersNotDrawn;
  for (const id of Object.keys(S.others)) {
    if (id === lt || (notDrawn && notDrawn.has(id))) continue;
    if (isLiveFighter(S, id)) continue;
    const o = S.others[id];
    if (!o) continue;
    const x = typeof o.renderX === 'number' ? o.renderX : o.x;
    const y = typeof o.renderY === 'number' ? o.renderY : o.y;
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    const dx = x - px, dy = y - py;
    if (dx * dx + dy * dy > R * R) continue;
    const a = Math.atan2(dy, dx);
    if (Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang))) > half) continue;
    if (nmlAsk(S, id, 'swing')) return true;
  }
  return false;
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
