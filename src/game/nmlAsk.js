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
 * (GONE in v2.3.3528, below: the owner wants the window's Attack before any
 * blow, for both players -- it now says "Hit back", with the white skull.)
 *
 * `?nmlask=0` is the game as it was (the tap aims, a stray shot asks
 * nothing).  Only against a worker with caps.nomansland, like everything of
 * No man's land's.
 *
 * ═══ v2.3.3316: A SWING ASKS TOO, AND AN UNANSWERED WINDOW CAN COME BACK ═══
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
 *
 * ═══ v2.3.3528: HITTING BACK GOES THROUGH THE WINDOW TOO ═══
 * The owner, 2026-10-20: "If a red skull player (first to attack in
 * wilderness) attacks, the other player can't attack back unless they lock on
 * target (tap the enemy player).  You recently made a fix where registering
 * hits doesn't require the lock on target (wanted behavior).  Apply that there
 * too.  But keep the behavior of needing to confirm the "attack" button that
 * pops up in the window first before any damage is registered to either
 * player in the wilderness."
 *   The one who attacked you was the window's one exception (v2.3.3253's
 * "HITTING BACK STAYS ONE TAP", above): a shot or a swing at them asked
 * nothing and, as they were no foe of yours, did nothing -- so the only way to
 * fight back was a tap, and that tap aimed at once, with no window at all.
 * There is no exception now:
 *   - a swing, a shot or a tap at the player who attacked you asks like any
 *     other, the window saying so (`back`: "Hit back <name>?" and the WHITE
 *     skull you carry -- hitting them back gives you no red one, so the red
 *     skull's warning would be wrong), and its Attack makes them your foe:
 *     every blow of yours lands on them, locked or not (v2.3.3268's choice).
 *     For BOTH players the window's Attack comes before any blow of theirs;
 *   - their attack RE-OPENS the question once a bout (`nmlAttackedSince`): an
 *     earlier answer about them -- Ignore, a window let go, or an Attack whose
 *     fight has gone quiet -- holds for shots and swings only until a new bout
 *     of their attacking begins (a blow after a quiet minute,
 *     sparTargets.js pvpBoutAt).  Else a player who once waved a passer-by
 *     off (a stray shot's window), or whose fight with them lapsed, could not
 *     answer that player's next attack except by a tap -- the owner's very
 *     complaint.  An answer given during a bout holds for the rest of it;
 *   - the BOW asks too (projectiles.js nmlSightAsk): it looses only when its
 *     line is on something, and a player you have not chosen is nothing to
 *     it, so held at them it waited -- no arrow through them, so no window.
 * The worker's half: an area move (a whirlwind, the burst, a splash, a blast)
 * reaches only players YOU have struck, not ones who struck you
 * (server/src/pvpextras.js _pvpEngaged), so being attacked never turns your
 * whirlwind on the attacker before you choose.
 *
 * ═══ v2.3.3530: A GROUP ATTACKS YOU: ONE WINDOW ═══
 * The owner, 2026-10-20: "If you get attacked simultaneously by a group of
 * people you don't need additional windows to approve.  If the 2nd, 3rd, etc
 * people already approved "attack" at you you can immediately hit back at
 * each of them after that."
 *   One window still comes first: no blow of yours lands on anyone in No
 * man's land before its Attack.  But once you have chosen a fight -- a live
 * foe of yours -- every player attacking you joins it with no window of their
 * own (`nmlJoinFight`).  Their attack was their choice (a blow of theirs
 * lands only after their own window's Attack), so they become your foes too,
 * and your swings, shots and bow land on each of them, locked or not:
 *   - the moment you choose (nmlAim: the window's Attack), everyone who struck
 *     you within FIGHT_QUIET_MS joins (sparTargets.js attackersNow);
 *   - while you fight, anyone whose blow lands on you joins as it lands
 *     (gameEvents.js pvp_hit);
 *   - a window up about one of them goes: they are your foe now.
 * An earlier Ignore or Party on one of them does not hold them out: they are
 * attacking you, and you have chosen to fight.  Only against a worker that
 * says caps.nmlgroup: it keeps every attacker's right to be hit back (an
 * older worker gave a red skull for hitting back any but the LAST to hit you:
 * server/src/nomansland.js _nmlHitsBack, and `bys`, which nmlHitBack reads),
 * and lets your area moves reach the group once you fight (pvpextras.js
 * _pvpEngaged).
 */
import { pushDmgPopup } from '@/game/combatHelpers.js';
import { nmlLive, nmlCanAttack, nmlHere } from '@/game/noMansLand.js';
import { chooseFoe, isLiveFighter, pvpBoutAt, isLiveFoe, liveFoes, hitMeAt, attackersNow, FIGHT_QUIET_MS } from '@/game/sparTargets.js'; /* v2.3.3268: Attack is a choice that lasts; v2.3.3316: + who a swing already hits; v2.3.3528: + when a bout began; v2.3.3530: + who attacks you (a group joins your fight) */

/* how long an unanswered window stays */
export const NML_ASK_MS = 10000;
/* v2.3.3316: and how long after one goes with no answer the same player may
   be asked about again by a shot or a swing (a tap asks every time) */
export const NML_ASK_AGAIN_MS = 15000;

let _ask = null;   /* { id, name, lv, why: 'shot' | 'swing' | 'aim' | 'tap', back, at } | null -- v2.3.3528: + 'aim' (the bow's line), `back` (hitting back) */
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
/* v2.3.3528: and WHEN each came up (a Map, ids off the wire), for
   nmlAttackedSince: kept short, and a cleared one only asks again */
function askedAtMap(S) {
  if (!(S._nmlAskedAt instanceof Map)) S._nmlAskedAt = new Map();
  return S._nmlAskedAt;
}

/** Did `id` give you your white skull, and you carry no red one?  Then a hit
 *  on them is hitting back, which the worker gives no red skull for.
 *  v2.3.3530: `id` the last to hit you (`by`), or any player whose right to
 *  be hit back still runs (`bys`, each counted down on its own) -- a group's
 *  every member, as the worker reads it (nomansland.js _nmlHitsBack). */
export function nmlHitBack(S, id, now) {
  const o = S && S._nmlSelf;
  if (!o || id == null) return false;
  const key = String(id);
  const gone = Math.max(0, (typeof now === 'number' ? now : Date.now()) - (o.at || 0));
  const red = (Number(o.red) || 0) - gone, white = (Number(o.white) || 0) - gone;
  if (!(white > 0) || red > 0) return false;
  if (o.by != null && String(o.by) === key) return true;
  return o.bys instanceof Map && (Number(o.bys.get(key)) || 0) - gone > 0;
}

/** v2.3.3528: has `id` attacked you SINCE you were last asked about them?
 *  Hitting them back is open to you (nmlHitBack: they gave you your white
 *  skull), and the BOUT between you began after that window came up
 *  (sparTargets.js pvpBoutAt: the first blow after FIGHT_QUIET_MS with none,
 *  the very gap a choice to fight lapses by).  Their attack is a new question:
 *  an answer given before it -- Ignore, a window let go, or an Attack whose
 *  fight has since gone quiet -- does not hold for it, and a shot or a swing
 *  at them asks again, once a bout; an answer given DURING the bout holds for
 *  the rest of it. */
export function nmlAttackedSince(S, id, now) {
  if (!nmlHitBack(S, id, now)) return false;
  const m = S._nmlAskedAt;
  const at = m instanceof Map ? (m.get(String(id)) || 0) : 0;
  return pvpBoutAt(S, id) > at;
}

/** Aim at them: No man's land's lock -- what a tap did before v2.3.3253.
 *  ═══ v2.3.3268: AND THE CHOICE LASTS ═══
 *  The owner: "I want attacks against real players to hit them even when not
 *  locked on target but only if you select the attack option that pops up on
 *  the window".  Every road here is that choice -- the window's Attack (v2.3.3528:
 *  for the one who attacked you too: hitting back no longer skips the window)
 *  -- so it is recorded (game/sparTargets.js chooseFoe): your swings, arrows
 *  and bolts hit them whatever you have locked, while No man's land still lets
 *  you fight them. */
export function nmlAim(S, id) {
  const o = S && S.others && id != null ? S.others[id] : null;
  if (!o) return false;
  chooseFoe(S, id);
  S.lockedTarget = { type: 'player', id, ref: o, nml: true };
  try { pushDmgPopup(S, o.x, o.y - 70, 'TARGET', '#ff6b5e', { ts: Date.now() }); } catch (e) { /* the reticle says it */ }
  /* v2.3.3530: and everyone attacking you joins the fight you just chose */
  try { joinAttackers(S, Date.now()); } catch (e) { /* the next blow on you asks again */ }
  return true;
}

/* v2.3.3530: is a group's joining on?  The asking, and a worker that keeps
   every attacker's right to be hit back (caps.nmlgroup). */
function nmlGroupOn(S) {
  return nmlAskOn(S) && !!(S && S._serverCaps && S._serverCaps.nmlgroup === true);
}

const _joins = [];   /* the last few joins, for the QA handle: { id, at } */

/** ═══ v2.3.3530: ONE OF A GROUP JOINS THE FIGHT YOU CHOSE ═══
 *  `id` struck you within FIGHT_QUIET_MS (sparTargets.js hitMeAt) while you
 *  are fighting another player you chose -- a live foe -- and No man's land
 *  lets you fight them: they become your foe too, with no window of their own
 *  (one up about them goes).  The first window stays: with no fight of your
 *  choosing nobody joins.  True when they joined. */
export function nmlJoinFight(S, id, now) {
  if (!S || id == null || S._inDuel || !nmlGroupOn(S)) return false;
  const key = String(id);
  if (S.myId != null && key === String(S.myId)) return false;
  const t = typeof now === 'number' ? now : Date.now();
  if (!(t - hitMeAt(S, key) < FIGHT_QUIET_MS)) return false;
  if (isLiveFoe(S, key, t)) return false;
  if (!liveFoes(S, t).some((f) => String(f.id) !== key)) return false;
  if (!S.others || !S.others[key] || !nmlCanAttack(S, key)) return false;
  chooseFoe(S, key, t);
  if (_ask && String(_ask.id) === key) { _ask = null; emit(); }
  _joins.push({ id: key, at: t });
  if (_joins.length > 16) _joins.shift();
  return true;
}

/* v2.3.3530: everyone attacking you now joins (nmlAim, as you choose) */
function joinAttackers(S, now) {
  if (!nmlGroupOn(S)) return 0;
  let n = 0;
  for (const id of attackersNow(S, now)) if (nmlJoinFight(S, id, now)) n++;
  return n;
}

/** The player card's party invite (InspectPlayerPanel), for this window. */
export function nmlPartyInvite(S, id) {
  if (!S || !S.channel || !(S._serverCaps && S._serverCaps.party) || id == null) return false;
  S.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: id } });
  try { if (S.player) pushDmgPopup(S, S.player.x, S.player.y - 30, 'Party invite sent', '#fbbf24'); } catch (e) { /* sent all the same */ }
  return true;
}

/** Raise the window about `id`.  why 'shot': a stray shot passed through
 *  them; why 'swing' (v2.3.3316): your swing reached them; why 'aim'
 *  (v2.3.3528): your bow's line is on them and nothing else -- each once per
 *  player until it is answered (an unanswered window may ask again
 *  NML_ASK_AGAIN_MS after it went), never over an open window; and since
 *  v2.3.3528 your attacker too, an earlier answer about them holding only
 *  until they attack you after it (nmlAttackedSince).  why 'tap': you tapped
 *  them -- every time, replacing a window about someone else.  True when the
 *  window is up about them.  `back` on it: hitting them back (nmlHitBack). */
export function nmlAsk(S, id, why) {
  if (!S || id == null || !nmlAskOn(S) || S._inDuel) return false;
  const key = String(id);
  if (!S.others || !S.others[key] || !nmlCanAttack(S, key)) return false;
  const quiet = why === 'shot' || why === 'swing' || why === 'aim';
  if (quiet) {
    if (_ask) return false;
    /* v2.3.3528: not "never your attacker" any more -- and their attack since
       your last answer about them is a new question */
    const fresh = nmlAttackedSince(S, key);
    if (nmlAsked(S, key) && !fresh) return false;
    const again = S._nmlAskAgain instanceof Map ? (S._nmlAskAgain.get(key) || 0) : 0;
    if (again && Date.now() < again && !fresh) return false;
  } else if (_ask && _ask.id === key) {
    return true;
  }
  const o = S.others[key];
  const now = Date.now();
  askedSet(S).add(key);
  const at = askedAtMap(S);
  if (at.size >= 64 && !at.has(key)) at.clear();
  at.set(key, now);
  _ask = { id: key, name: (o && o.name) || 'Player', lv: Number(o && o.rpgLv) || 1, why: quiet ? why : 'tap', back: nmlHitBack(S, key, now), at: now };
  emit();
  return true;
}

/** Let the window go WITHOUT an answer: its time up, or they can no longer be
 *  fought.  v2.3.3316: so it is not "asked" -- a later shot or swing may ask
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

/** ═══ v2.3.3316: YOUR SWING REACHED A PLAYER YOU HAVE NOT CHOSEN ═══
 *  The swing's own reach and arc from (px, py) toward `ang` (monsterCombat.js
 *  hands in what its claims use, `slack` a stride as theirs): the first player
 *  in it you could fight here -- not your lock, not one you chose or your
 *  sparring clone (the swing already lands on those), not drawn-away; since
 *  v2.3.3528 the one who attacked you too -- is asked about, as a stray
 *  shot's is.  The swing does them nothing.  Called on
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
      /* v2.3.3530: the attackers who joined a fight you chose, no window */
      joins: () => _joins.map((j) => Object.assign({}, j)),
      setMs: (ms) => { _msOverride = ms ? Math.max(1000, Math.min(60000, Number(ms) || NML_ASK_MS)) : 0; },
    };
  }
} catch (e) { /* no window */ }
