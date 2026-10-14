/* ═══ v2.3.3243: WHERE ANOTHER PLAYER'S MAP DOT IS NOW ═══
 *
 * A player more than 2,400 px from you is sent about once a second now, with
 * the presence roster (server/src/tick.js FAR_PLAYERS: no far send of their
 * own, four times a second, any more).  They are on neither your screen nor
 * your minimap, but the world map shows them, zoomed in.  Their dot is carried
 * along the speed of their last update since it came, as the game carries a
 * player it draws (visualSystems.js), for at most PEER_GLIDE_MS -- so a walker
 * glides instead of hopping once a second.  A near player is updated many
 * times a second, so their dot barely leaves where they were sent.
 *
 * `_vx`/`_vy` are px a 60 Hz frame (wsClient.js: the wire's hundredths / 100)
 * and `_lastUpdate` is Date.now() at their last update (wsClient.js).
 *
 * No imports: the minimap calls it for every player every frame.
 */

/* a stop or a turn is in the next roster, about a second later; past this the
   dot waits for it rather than run on */
export const PEER_GLIDE_MS = 1500;

/** Where `o`'s map dot is at `now` (a Date.now() time), written into `out`. */
export function peerDotAt(o, now, out) {
  const at = o._lastUpdate;
  const age = at ? Math.min(PEER_GLIDE_MS, Math.max(0, now - at)) : 0;
  const k = age * 0.06;   /* 60 frames a second, per ms */
  out.x = o.x + (o._vx || 0) * k;
  out.y = o.y + (o._vy || 0) * k;
  return out;
}
