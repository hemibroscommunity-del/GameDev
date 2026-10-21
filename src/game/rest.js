/* ═══ v2.3.3539: A REAL REST, ON THIS PHONE ═══
 *
 * The owner, 2026-10-21: "I value SIMPLICITY and INTELLIGIBILITY" -- the
 * after-review list's fifth item.  The farm's bed rested you on this phone
 * alone: it set the phone's own bars (the worker's next echo put them back)
 * and a "Well Rested" timer that only the phone's retired XP popups read.  So
 * the Hotel stayed shut.
 *
 * THE WORKER PAYS THE REST NOW (server/src/rest.js): `rest_request {where}`,
 * 'hotel' or 'farm', is answered by `rest_result` -- {ok, until, ms} with full
 * bars and Well Rested (+10% of a fight's XP for 30 minutes, the worker's
 * `_buffs.wellRested`, which wsClient mirrors onto S.rpg._wellRestedUntil for
 * the buff chip) or {ok: false, err}.  This module asks and says what came
 * back; nothing here fills a bar or starts a timer.
 *
 * Only against a worker that says caps.rest: against an older one the Hotel
 * stays shut (game/wheelTownDoors.js) and the farm's bed rests on this phone
 * as it always did (BroTown.jsx).
 *
 * No imports (the sound and the words over your bro are handed in by
 * wsClient), so a node test reads its rules: server/test/rest.test.mjs.
 */

/* the worker's rules, for the words (server/src/rest.js REST) */
export const REST_MS = 30 * 60 * 1000;
export const REST_XP_PCT = 10;
/* how long a rest asked for waits for its answer before Rest may be pressed
   again (one round trip; the worker answers every ask) */
const ASK_MS = 4000;

/** Does the worker pay a rest?  (caps.rest; `rest: false` in its live flags
 *  un-advertises it) */
export function restOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.rest);
}

/** wsClient: mirror the worker's Well Rested onto S.rpg only against a worker
 *  that rests -- against an older one the farm's bed's own timer stands. */
export function restMapsBuffs(S) {
  return restOn(S) && !!(S && S.rpg);
}

/** Ms of Well Rested left (0: not rested), as the worker last said it. */
export function wellRestedLeft(S, now) {
  const until = S && S.rpg ? Number(S.rpg._wellRestedUntil) || 0 : 0;
  const t = typeof now === 'number' ? now : Date.now();
  return until > t ? until - t : 0;
}

/** "23 min" -- the half hour in minutes, rounded up; a last minute in seconds */
export function restLeftWords(ms) {
  if (!(ms > 0)) return '';
  return ms >= 60000 ? Math.ceil(ms / 60000) + ' min' : Math.ceil(ms / 1000) + ' s';
}

/** Ask the worker for a rest, 'hotel' or 'farm'.  False when it does not rest,
 *  an ask is already waiting, or there is no socket to ask on. */
export function requestRest(S, where, now) {
  if (!S || !S.channel || !restOn(S)) return false;
  if (where !== 'hotel' && where !== 'farm') return false;
  const t = typeof now === 'number' ? now : Date.now();
  if (S._restAsked && t - S._restAsked < ASK_MS) return false;
  S._restAsked = t;
  try { S.channel.send({ type: 'rest_request', payload: { where } }); } catch (e) { S._restAsked = 0; return false; }
  return true;
}

/* what a refusal says over your bro, in the worker's own terms */
const REFUSED = {
  fight: "Can't rest in a fight",
  soon: 'You just rested',
  where: 'Rest at the Hotel or on your farm',
  off: "Can't rest right now",
};

/** The lines a rest_result shows over your bro: [{text, color, dy}]. */
export function restResultLines(p) {
  if (p && p.ok) {
    return [
      { text: 'Fully Rested!', color: '#59BF91', dy: 40 },
      { text: '+' + REST_XP_PCT + '% combat XP for ' + Math.round((Number(p.ms) || REST_MS) / 60000) + ' min', color: '#D8A94D', dy: 25 },
    ];
  }
  const err = p && typeof p.err === 'string' && Object.prototype.hasOwnProperty.call(REFUSED, p.err) ? p.err : 'off';
  return [{ text: REFUSED[err], color: '#D95C54', dy: 30 }];
}

/** wsClient's direct switch: the worker's answer.  `out.say(text, color,
 *  dy)` puts a line over your bro (combatHelpers.pushDmgPopup) and
 *  `out.sound(name)` plays a cue (game/eventSounds.js cue). */
export function onRestResult(S, p, out) {
  if (!S) return;
  S._restAsked = 0;
  const say = out && typeof out.say === 'function' ? out.say : null;
  if (say) for (const l of restResultLines(p)) { try { say(l.text, l.color, l.dy); } catch (e) { /* display only */ } }
  if (p && p.ok) {
    /* the worker's own until (the player_state beside it carries it too) */
    if (S.rpg && typeof p.until === 'number') S.rpg._wellRestedUntil = p.until;
    /* a slow breath and a warm shimmer: the farm's bed's own (v2.3.3434) */
    if (out && typeof out.sound === 'function') { try { out.sound('rested'); } catch (e) { /* display only */ } }
  }
}
