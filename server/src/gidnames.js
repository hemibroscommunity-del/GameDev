/* A WEAPON NAMED BY ITS ID, NEVER BY ITS PLACE -- v2.3.5196 (grand plan step
 * 11.3, step 3; card K PR 11; docs/specs/gid-names.md).
 *
 * A phone named a weapon in its stash by its place (`stashIdx`, `idx`,
 * `stashIndex`).  A place moves: a weapon sold, picked up, or taken in another
 * tab shifts the rest, and the request then acts on the NEXT weapon (SHAPES
 * part 2's "Things a phone names by their place today").  Card R's weapon id
 * (`gid`, v2.3.5282) names it for good.
 *
 * `_gidPlace(ps, place, gid)` is the one reading, for the nine handlers that
 * take a weapon from the stash (sell_weapon, equip_request, the market's place,
 * the store's list, amulet_forge_request, trade2_stage_weapon, smith_salvage,
 * essence_apply, reveal_item):
 *   - a request that carries `gid`: the place the weapon with that id is at
 *     now.  If it also carries a place and the two disagree, or no weapon has
 *     that id, the answer is one past the end of the stash -- every handler's
 *     own "no weapon there" refusal, which answers the phone;
 *   - a request with no `gid` (an older phone): its place, as before.
 * The page sends `gid` beside the place against a worker that says it reads it
 * (`caps.gidnames`).  `gidnames: false` in the live flags: the place only, as
 * before (and the cap goes).
 */
import { GID_RE } from './gearprov.js';   /* a weapon's id is gear's form (stash.js weaponIdOk) */

export const gidNamesMethods = {
  _gidNamesOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'gidnames') && !f.gidnames);
  },

  /* the weapon's place now (see the header), or the place sent */
  _gidPlace(ps, place, gid) {
    if (typeof gid !== 'string' || !GID_RE.test(gid) || this._gidNamesOff()) return place;
    const list = ps && Array.isArray(ps.weaponStash) ? ps.weaponStash : [];
    const at = list.findIndex((w) => w && typeof w === 'object' && w.gid === gid);
    if (at < 0) return list.length;
    const n = Number(place);
    if (place !== undefined && place !== null && Number.isFinite(n) && Math.floor(n) !== at) return list.length;
    return at;
  },
};
