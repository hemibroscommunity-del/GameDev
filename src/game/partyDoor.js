/* ═══ v2.3.5529: THE PARTY'S PAGE DOOR -- ONE WRITER OF THE PHONE'S PARTY (card L PR 5) ═══
 * (docs/specs/party-page-door.md; held by server/test/party-page-door.test.mjs
 * and the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * The phone's copy of its party is one field, `S._party`: none, or the
 * worker's last party_state (the renderer's nameplate marker reads it each
 * frame).  Two files wrote it in three places; now only partyTo does, by a
 * way of PARTY_PAGE_WAYS:
 *   state   gameEvents.js party_state     the worker's roster (member)
 *   gone    gameEvents.js party_state     left, kicked, disbanded (none)
 *   rejoin  wsClient.js state_sync        cleared until the worker says it
 *                                         again (REJOIN_SLOTS' `party` row)
 * The door's rule is the callers' own: `state` writes a party record (an
 * object), the others write none, so nothing a player sees changes.
 * `?partydoor=0` writes what a caller asks, as the lines before the door.
 * The party's HUD (setParty, React's own state) is the callers' still.
 *
 * One import, the page's switch reader (game/switches.js, of no imports),
 * by a relative path: node tests it without the game. */
import { sw } from './switches.js';

export const PARTY_PAGE_WAYS = Object.freeze({ state: 'member', gone: 'none', rejoin: 'none' });
const has = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/* `?partydoor=0` -- through the page's one reader, so a test can set it */
export function partyDoorOff() {
  return sw('partydoor');
}

/* THE ONE WRITER.  True when it wrote. */
export function partyTo(S, party, way) {
  if (!S || typeof S !== 'object' || !has(PARTY_PAGE_WAYS, way)) return false;
  const into = PARTY_PAGE_WAYS[way] === 'member';
  if (!partyDoorOff() && (into ? !(party && typeof party === 'object') : party != null)) return false;
  S._party = into || partyDoorOff() ? party : null;
  return true;
}

/* the party's phase on this phone (the phase table's words) */
export function partyPhase(S) {
  return S && S._party && typeof S._party === 'object' ? 'member' : 'none';
}
