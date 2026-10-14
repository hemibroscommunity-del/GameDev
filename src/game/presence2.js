/* ═══ v2.3.3250: FAR PLAYERS ONLY WHILE YOUR WORLD MAP IS OPEN (the phone's half) ═══
 *
 * server/src/presence2.js has the whole story.  This phone joins with
 * `pres: 2`; against a worker that advertises `caps.presence2` it is no longer
 * sent far players in the Wheel unless its world map is open, so:
 *
 *   - the v2.3.1112 GHOST SWEEP (wsClient.js: forget a player silent for 10 s)
 *     stands down while the worker's online list (`on`, every 30 s) is fresh:
 *     a far player is silent because nobody needs their position, not because
 *     they left.  The list does the sweep's job instead -- a player missing
 *     from it is forgotten (applyOnlineList) -- and says where each player is
 *     (id -> zone), which a far player's copy no longer hears; one this phone
 *     never heard join (a tab asleep through it) is added, parked.  If the
 *     lists stop coming (the worker's `presence2: false` switch, an older
 *     worker after a rollback) the sweep comes back after ONLINE_STALE_MS;
 *   - a FAR PLAYER'S COPY IS PARKED.  Their last copy would stand frozen where
 *     they were last seen -- on nobody's screen while they are far from you,
 *     but walk that way and you would meet a ghost there, still walking on the
 *     spot.  The worker marks this phone's roster `nr` (every player near you
 *     is in it), so one missing from it is far or elsewhere: parkMissing marks
 *     it `_away` and stops it, and every frame parkAway keeps an `_away` copy
 *     at least PARK_R from you -- past the minimap's corner (2,263 px) and any
 *     reach, sound or light -- so not one of the forty-odd places that read
 *     other players' positions can draw, hear or hit a ghost.  Any update the
 *     worker sends of them (near again, a party member, an open map) is their
 *     real position, and clears it;
 *   - the open world map says so (map_watch) on opening, every
 *     MAP_HEARTBEAT_MS while open, and on closing -- never to a worker that
 *     does not advertise presence2, which would rebroadcast an unknown message
 *     to the whole room (index.js's default branch).  It skips parked copies:
 *     the first roster of a watch carries every far player, where they are.
 *
 * No imports: node-tested (server/test/presence2.test.mjs reads it as text).
 */

export const PRESENCE2_CLIENT = Object.freeze({
  /* the open map's repeat (the worker keeps a watch MAP_WATCH_MS, 8 s) */
  MAP_HEARTBEAT_MS: 4000,
  /* the online list comes every 30 s; two and a half missed and the 10 s
     ghost sweep is back */
  ONLINE_STALE_MS: 75000,
  /* a parked copy is kept at least this far from you: the worker's
     FAR_PLAYERS.NEAR_R (server/src/tick.js), the circle every roster covers */
  PARK_R: 2400,
});

/** Does this worker do presence v2 for us? */
export function presence2On(S) {
  return !!(S && S._serverCaps && S._serverCaps.presence2);
}

/** The ghost sweep stands down while this is true. */
export function onlineListFresh(S, now) {
  return presence2On(S) && !!S._onlineAt && (now - S._onlineAt) < PRESENCE2_CLIENT.ONLINE_STALE_MS;
}

/** Keep a parked copy at least PARK_R from you, along the line from you
    through it.  Returns true when it moved. */
export function parkAway(S, o) {
  if (!o || !o._away) return false;
  const P = S && S.player;
  if (!P || !Number.isFinite(P.x) || !Number.isFinite(P.y)) return false;
  let dx = (Number.isFinite(o.x) ? o.x : P.x) - P.x;
  let dy = (Number.isFinite(o.y) ? o.y : P.y) - P.y;
  const R = PRESENCE2_CLIENT.PARK_R;
  const d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return false;
  if (d2 < 1) { dx = 1; dy = 0; }
  const k = R / Math.sqrt(dx * dx + dy * dy);
  const x = P.x + dx * k, y = P.y + dy * k;
  o.x = x; o._serverX = x; o.renderX = x;
  o.y = y; o._serverY = y; o.renderY = y;
  if (o._posBuffer) o._posBuffer.length = 0;
  return true;
}

function park(S, o) {
  o._away = true;
  o._vx = 0; o._vy = 0; o._smoothVx = 0; o._smoothVy = 0;
  parkAway(S, o);
}

/** A tick marked `nr`: every player near you is in `players`; park the rest.
    Returns how many were parked anew. */
export function parkMissing(S, players) {
  if (!S || !S.others) return 0;
  const here = players || {};
  let n = 0;
  for (const id of Object.keys(S.others)) {
    const o = S.others[id];
    if (!o || Object.prototype.hasOwnProperty.call(here, id)) continue;
    if (!o._away) n++;
    park(S, o);
  }
  return n;
}

/** A tick's `on` (everyone in the room, id -> zone; a bare list of ids from
    the first cut): forget every player not in it, give a parked one its zone,
    and add, parked, one this phone never heard join (`makePeer(id, zone)`
    builds the copy, as a tick's unknown player is built).  Returns how many
    came or went. */
export function applyOnlineList(S, on, now, makePeer) {
  if (!S || !on || typeof on !== 'object') return 0;
  S._onlineAt = now;
  const zoneOf = new Map();
  if (Array.isArray(on)) {
    for (let i = 0; i < on.length; i++) if (typeof on[i] === 'string') zoneOf.set(on[i], undefined);
  } else {
    for (const id of Object.keys(on)) zoneOf.set(id, typeof on[id] === 'string' ? on[id] : undefined);
  }
  if (!S.others) S.others = {};
  const others = S.others;
  let changed = 0;
  for (const id of Object.keys(others)) {
    if (!zoneOf.has(id)) { delete others[id]; changed++; }
  }
  for (const [id, zone] of zoneOf) {
    /* ids from the worker's own table, but S.others is a plain object
       (CLAUDE.md rule 4): never write '__proto__', read only own entries */
    if (id === S.myId || id === '__proto__') continue;
    const o = Object.prototype.hasOwnProperty.call(others, id) ? others[id] : null;
    if (o) {
      if (o._away && zone) o.zone = zone;
    } else if (typeof makePeer === 'function') {
      const made = makePeer(id, zone || 'town');
      if (made) { made._lastUpdate = now; others[id] = made; park(S, made); changed++; }
    }
  }
  return changed;
}

/** The world map opened (true), is still open (true again), or shut (false). */
export function sendMapWatch(S, on) {
  if (!presence2On(S) || !S.channel || typeof S.channel.send !== 'function') return false;
  try { S.channel.send({ type: 'map_watch', on: !!on }); } catch (e) { return false; }
  S._mapWatchSent = { on: !!on, at: Date.now() };
  return true;
}
