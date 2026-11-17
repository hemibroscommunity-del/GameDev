/* ═══ v2.3.5525: THE LOADING DOOR -- ONE WRITER OF THE WORLD'S VEILS (card L PR 5) ═══
 * (docs/specs/loading-door.md; held by server/test/loading-door.test.mjs and
 * the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * The world is veiled (the zone-loading screen up, your bro held still) for
 * any of several reasons at once, each a hold of its own that its readers
 * read by its old name.  They are ONE field now, `S._veils`: a Map from the
 * reason to its hold (none: the world is in), written only by veilTo, which
 * also writes each reason's old field for its readers, so nothing a player
 * sees changes (the planner's reading, 2026-11-17: a door's one field is the
 * set of reasons).  The reasons, VEIL_WHYS, each with its old field and its
 * writers:
 *   zone    S._zoneLoading    zoneTransitions.js handleZoneTransitions: a
 *                             zone's own art loading behind its overlay
 *   trip    S._wheelTripVeil  zoneTransitions.js veilWheelTrip,
 *                             syncTownScenery, _liftTownVeil: a trip to
 *                             the Wheel veiled until its town is in
 *   town    S._townArtHold    zoneTransitions.js syncTownScenery,
 *                             _liftTownVeil: the town's townsfolk loading
 *   farm    S._farmArtHold    farmTrip.js: your farm's art loading
 *   avatar  S._avatarArtHold  avatarHold.js: your bro's pictures being made
 *   net     S._netHold        wsClient.js (state_sync's readiness, the socket's
 *                             close) and serverReady.js: waiting for the server
 *                             (v2.3.5527)
 * A hold is any value but null, false and undefined (the old fields carry
 * a record, a number or true); a lift is null (false for the trip and the
 * net, as their old lines wrote).  The phase (the phase
 * table's words): `veiled` while any reason holds, else `in`.
 *
 * `?veildoor=0` writes the old fields alone, as the lines before the door
 * (S._veils is then not kept).  The overlay itself (zoneLoading.js show /
 * hide) is the callers' still: the door writes state, never a screen.
 *
 * Notes beside the door, not folded here: the
 * dungeon's opening (`S._wheelDungeonOpening`, the dungeon row's), and the
 * first loading screen's gate (ui/loadingGate.js: its own read of the
 * overlay, `_up`, a one-way `_worldIn` and the queue `_waiting`).
 *
 * One import, the page's switch reader (game/switches.js, of no imports),
 * by a relative path: node tests it without the game. */
import { sw } from './switches.js';

export const VEIL_WHYS = Object.freeze({
  zone: '_zoneLoading',
  trip: '_wheelTripVeil',
  town: '_townArtHold',
  farm: '_farmArtHold',
  avatar: '_avatarArtHold',
  net: '_netHold',   /* v2.3.5527: the server's veil (wsClient.js, serverReady.js), folded in once card K freed wsClient.js */
});
/* what each reason's old field holds when lifted (as its old lines wrote) */
const LIFT = Object.freeze({ zone: null, trip: false, town: null, farm: null, avatar: null, net: false });
const has = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/* `?veildoor=0` -- through the page's one reader, so a test can set it */
export function veilDoorOff() {
  return sw('veildoor');
}

/* THE ONE WRITER.  `hold`: the reason's hold (its old field's value), or
   null to lift it.  True when it wrote. */
export function veilTo(S, why, hold) {
  if (!S || typeof S !== 'object' || !has(VEIL_WHYS, why)) return false;
  const on = hold !== null && hold !== undefined && hold !== false;
  S[VEIL_WHYS[why]] = on ? hold : LIFT[why];
  if (veilDoorOff()) return true;
  if (!(S._veils instanceof Map)) S._veils = new Map();
  if (on) S._veils.set(why, hold);
  else S._veils.delete(why);
  return true;
}

/* the loading phase (the phase table's words) */
export function veilPhase(S) {
  return S && S._veils instanceof Map && S._veils.size ? 'veiled' : 'in';
}
