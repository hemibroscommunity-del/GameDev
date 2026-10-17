/* ═══ v2.3.3318: INTO THE WHEEL WITH ONLY THE MONSTERS AROUND YOU ═══
 * (docs/specs/wheel-arrival.md; the 5x Wheel's first "not in this PR",
 * docs/specs/wheel-5x.md; the owner, 2026-10-17: "Push all these to main then
 * keep going")
 *
 * A phone that walked into the Wheel was sent EVERY monster in it, whole --
 * the zone_state's monsters list (spawnscale.js _zoneSnapshotWire), and the
 * same list in state_sync for a join that lands in it.  On the five-times
 * Wheel that is 1,920 monsters, about 480 KB of the 580 KB zone_state, on
 * every trip in: a login, a death's way back, a dungeon's, the farm's.  The
 * phone keeps a copy of each, though the worker tells it about only the ones
 * within WHEEL.INTEREST_R (tick.js, wheelzone.js _wheelInterest), and the
 * renderer draws only those near the screen.
 *
 * It was all sent because the tick cannot bring a monster in: a tick's monster
 * says where it is and how it is doing (tick.js monsterWire), not what it is,
 * and the phone updates only monsters it already has (wsClient.js, the tick's
 * monsters).  So a phone that says it can take it (`wn: 1` in its join, beside
 * `protocolVersion: 2`) is now sent:
 *   - on the way in, only the monsters within WHEEL_NEAR.R of where it stands
 *     (_wheelNearPick), the zone_state marked `mnear: 1` and a join's
 *     state_sync `monstersNear: 1` -- so an EMPTY list (the town square: the
 *     nearest monsters are a stretch away) still means "the worker runs the
 *     monsters here", where an empty list used to mean it does not, and the
 *     phone would make its own;
 *   - and, on the tick that first brings a monster into its reach, that
 *     monster whole (`mw`, the snapshot's own wire, monsterSnapWire), in that
 *     phone's copy of the tick only, read by the phone BEFORE the tick's
 *     monsters, so the tick that first shows it shows it whole.  Once: a
 *     session keeps the ids it holds whole (`_wheelWhole`) until it leaves
 *     the Wheel, as the phone keeps its copies; a monster that walks out of
 *     reach and back comes back by the tick alone.
 * The arrival's monsters are also what the tick's interest has heard
 * (`_wheelSeen`, seeded here), so the first tick after it sends none of them
 * again -- the old way in sent them twice, the list and then the first tick.
 *
 * WHAT A PLAYER SEES: nothing new on the screen or the minimap.  Every
 * monster they can show is within INTEREST_R (wheelzone.js: wider than any
 * view's half-diagonal plus FAR_MARGIN).  The world map, zoomed in, draws the
 * monsters the phone holds -- "the monsters near you", as it was written to
 * (v2.3.3057) -- so a land you have not been to this visit shows no monster
 * dots there, where the whole list put one at every far monster's starting
 * place (docs/specs/wheel-arrival.md).  A far one's death is still told to
 * every phone in the Wheel (monster_kill, eventplace.js): a phone that does
 * not hold it ignores it, as every handler already did for an id it did not
 * hold (gameEvents.js).
 *
 * Deploy-order safe both ways: an old phone sends no `wn` and gets every list
 * and tick byte for byte as before; a new phone against an old worker gets the
 * whole list, no marker and no `mw`, and needs neither.  Nothing else moves:
 * the nodes and the loot still come whole (the nodes are about 100 KB of the
 * way in; a node has no interest yet).  Kill switch: `wheelnear: false` in
 * the live flags -- every arrival after it gets the whole list again (and
 * caps.wheelnear false); a phone already holding a near list keeps getting
 * its `mw`s, which it needs, until it leaves the Wheel.
 */

import { WHEEL, WHEEL_ZONE } from './wheelzone.js';

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

export const WHEEL_NEAR = Object.freeze({
  /* an arrival's monsters: the circle the tick's interest takes a monster in
     at (WHEEL.INTEREST_R), so the arrival and the first tick agree on what is
     around you */
  R: WHEEL.INTEREST_R,
});

export const wheelNearMethods = {
  /* `wheelnear: false` in the live flags (the note above) */
  _wheelNearOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && own(f, 'wheelnear') && !f.wheelnear);
  },

  /* join.js: does this phone take a near arrival?  A v2 phone that says it
     can (`wn: 1`).  Fixed for the session; the switch is asked at each
     arrival (_wheelNearArrival). */
  _wheelNearFor(session, msg) {
    return !!(session && session.protocolVersion === 2 && msg && msg.wn === 1);
  },

  /* Is this arrival (a zone change into the Wheel, or a join that lands in
     it) a near one: the phone takes it, it stands at a place, and the switch
     is not thrown. */
  _wheelNearArrival(session, ps) {
    return !!(session && session.wheelNear && ps && ps.z === WHEEL_ZONE
      && Number.isFinite(ps.x) && Number.isFinite(ps.y) && !this._wheelNearOff());
  },

  /* The monsters within WHEEL_NEAR.R of `ps`, in the list's order -- and the
     session now holds them whole and has heard them (tick.js) */
  _wheelNearPick(session, ps, monsters) {
    const R2 = WHEEL_NEAR.R * WHEEL_NEAR.R, px = ps.x, py = ps.y;
    const near = [];
    for (const m of monsters) {
      const dx = m.x - px, dy = m.y - py;
      if (dx * dx + dy * dy <= R2) near.push(m);
    }
    const held = new Set();
    for (const m of near) held.add(m.id);
    session._wheelWhole = held;
    session._wheelSeen = new Set(held);
    return near;
  },

  /* tick.js: the monsters this tick brings into session `s`'s reach that it
     does not hold whole, as `{"<zone>":[...]}` (the tick's own shape for its
     monsters), each in the snapshot's wire (`wholeJsonOf`, made once a tick
     however many phones it goes to) -- or null.  Only for a session that
     holds a near list; marks them held. */
  _wheelNearWholeJson(s, zone, interest, wholeJsonOf) {
    const held = s._wheelWhole;
    if (!held || !interest || !interest.entered || interest.entered.size === 0) return null;
    let parts = null;
    for (const m of interest.list) {
      if (!interest.entered.has(m.id) || held.has(m.id)) continue;
      held.add(m.id);
      (parts || (parts = [])).push(wholeJsonOf(m));
    }
    return parts ? '{' + JSON.stringify(zone) + ':[' + parts.join(',') + ']}' : null;
  },
};
