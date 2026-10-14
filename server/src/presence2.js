/* ═══ v2.3.3250: FAR PLAYERS ONLY WHILE YOUR WORLD MAP IS OPEN ═══
 * (presence v2, the server split plan's Phase 0b, its second step; the owner,
 * 2026-10-14: "Go recommended and keep working autonomously")
 *
 * The roster (tick.js, about once a second) carried every player in the room
 * to every phone: near ones whole, far ones slim since v2.3.3246.  A far
 * player is on no screen and no minimap (the minimap is 3,200 px across,
 * inside FAR_PLAYERS.NEAR_R 2,400 of you), so only the WORLD MAP draws them,
 * and only while it is open.  A phone that says it can live without them
 * (`pres: 2` in its join) now gets, in the Wheel:
 *   - the players near it, whole, as before;
 *   - its party, whole, wherever they are (as before: they were near or slim);
 *   - far players ONLY while its world map is open: the map sends map_watch
 *     on opening and every MAP_HEARTBEAT_MS while open, and each keeps far
 *     players coming for MAP_WATCH_MS, so a map that closes without saying so
 *     (a dropped socket, a killed tab) stops them within a few seconds.  The
 *     first roster after a watch starts carries EVERY far player, so the map
 *     fills at once rather than over FAR_STILL_MS;
 *   - every ONLINE_EVERY_MS, `on`: everyone in the room, id -> zone.  The
 *     phone no longer forgets a player it has not heard from in 10 s (the
 *     v2.3.1112 ghost sweep, which far players' silence would now trip); it
 *     forgets one missing from this list instead -- the same job, for a tab
 *     that slept through someone's player_leave -- and learns a far player's
 *     zone from it (a friend gone into a dungeon), which their copy no longer
 *     hears of;
 *   - on its roster, `nr` (not while its map is open): every player near it
 *     is in this roster, whole, so one missing from it is far or elsewhere.
 *     The phone PARKS that copy out of sight (src/game/presence2.js).  Without
 *     it a far player's last copy stood frozen where they were last seen, and
 *     a phone that walked that way drew a ghost there -- found writing this
 *     change's phone test, before it shipped.
 *
 * Deploy-order safe both ways: an old client sends no `pres` and gets the
 * v2.3.3246 roster; a new client against an old worker sees no
 * `caps.presence2`, keeps its ghost sweep and never sends map_watch (an old
 * worker would REBROADCAST an unknown type to the room -- the default branch
 * in index.js).  Kill switch: `presence2: false` in the live flags --
 * un-advertised to new joins (join.js spreads the live flags over the caps)
 * and every pres-2 phone back on the v2.3.3246 roster from the next tick.
 * A phone that already has the caps keeps its no-sweep rule; the online
 * list stops with the switch, and the phone's own fallback
 * (ONLINE_STALE_MS on the client) brings its ghost sweep back.
 */

export const PRESENCE2 = Object.freeze({
  /* how often a pres-2 phone is told everyone in the room */
  ONLINE_EVERY_MS: 30000,
  /* how long one map_watch keeps far players coming */
  MAP_WATCH_MS: 8000,
  /* how often an open map repeats it (the client's copy, src/game/presence2.js) */
  MAP_HEARTBEAT_MS: 4000,
});

export const presence2Methods = {
  /* `presence2: false` in the live flags (PRESENCE2 above) */
  _presence2Off() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'presence2') && !f.presence2);
  },

  /* map_watch {on}: the world map opened (or is still open), or closed.
     Only a boolean is read; anything else is ignored.  A watch that starts
     asks the next roster for every far player (`_mapWatchFresh`). */
  _presence2Watch(session, msg) {
    if (!session || !session.id) return;
    const on = msg && typeof msg === 'object' ? msg.on : undefined;
    if (on === true) {
      const now = Date.now();
      if (!(session._mapWatchUntil > now)) session._mapWatchFresh = true;
      session._mapWatchUntil = now + PRESENCE2.MAP_WATCH_MS;
    } else if (on === false) {
      session._mapWatchUntil = 0;
      session._mapWatchFresh = false;
    }
  },

  /* the ids of this player's party, or null */
  _presence2Party(playerId) {
    const p = this._partyOf ? this._partyOf(playerId) : null;
    if (!p || !Array.isArray(p.members) || p.members.length < 2) return null;
    return new Set(p.members);
  },
};
