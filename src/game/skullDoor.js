/* ═══ v2.3.5533: THE FIGHT'S PAGE DOOR -- ONE WRITER OF YOUR SKULL ON THE PHONE (card L PR 5) ═══
 * (docs/specs/fight-page-door.md; held by server/test/fight-page-door.test.mjs
 * and the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * The skull the phone shows over you is one field, `S._pvpSkullType`: none,
 * red (you threatened, or No man's land's red skull) or white (you were
 * threatened and may answer); its time, `S._pvpSkullUntil`, is written beside
 * it by the same call (0 with none).  Three files wrote them in eight places;
 * now only skullTo does, by a way of SKULL_WAYS:
 *   threat  gameEvents.js pvp_threat, threat_response, threat_penalty,
 *           threat_expired (the worker's word on a threat)
 *   issue   InspectPlayerPanel.jsx (your own threat, shown at once)
 *   nml     noMansLand.js (the worker's No man's land skull)
 * The rule is the callers' own: red, white or none, with a time when it is
 * one.  Nothing a player sees changes.  `?skulldoor=0` writes what a caller
 * asks, as the lines before the door.
 *
 * Beside the door: the fight's own clock (S._pvpAt, fightFood.js: the last
 * blow given or taken), the threat's record on the save (S.rpg._threatState)
 * and its cooldown (S._pvpThreatCdUntil), No man's land's own record
 * (S._nmlSelf).
 *
 * One import, the page's switch reader (game/switches.js, of no imports),
 * by a relative path: node tests it without the game. */
import { sw } from './switches.js';

export const SKULL_WAYS = Object.freeze({ threat: 'threat', issue: 'issue', nml: 'nml' });
const KINDS = Object.freeze(['red', 'white']);

export function skullDoorOff() {
  return sw('skulldoor');
}

/* THE ONE WRITER.  `type`: 'red', 'white' or null; `until`: when it runs
   out (with a skull).  True when it wrote. */
export function skullTo(S, type, until, way) {
  if (!S || typeof S !== 'object' || !Object.prototype.hasOwnProperty.call(SKULL_WAYS, way)) return false;
  const off = skullDoorOff();
  if (type == null) {
    S._pvpSkullType = null;
    S._pvpSkullUntil = 0;
    return true;
  }
  if (!off && (!KINDS.includes(type) || !Number.isFinite(until))) return false;
  S._pvpSkullType = type;
  S._pvpSkullUntil = until;
  return true;
}

/* the skull's phase on this phone (the phase table's words) */
export function skullPhase(S) {
  return S && KINDS.includes(S._pvpSkullType) ? S._pvpSkullType : 'free';
}
