/* ═══ v2.3.3142: GETTING A ROOM'S PICTURE READY BEFORE THE DOOR OPENS ═══
 *
 * The seventeen building pictures (data/buildingRooms.js) are ~300 KB each and
 * 3.5 MB decoded.  Two rules pull against each other:
 *
 *   - CLAUDE.md's preloading law: a window must not pop its picture in a
 *     second after it opens (the Auction House's painting was fetched on the
 *     loading screen for exactly that reason, 2.7 MB of it, v2.3.2627);
 *   - CLAUDE.md's memory budget: nothing that is only used somewhere is held
 *     everywhere, and a cache has a cap.  Sixteen decoded pictures would be
 *     ~56 MB for windows a player opens a few times an hour; the Auction
 *     House's two held for the whole session were 9 MB.
 *
 * So the pictures are NOT on the gate.  Instead:
 *
 *   warmRoom(panel)   the door you stand at (BroTown.jsx's nearBuilding /
 *                     nearHall) decodes ITS room's picture, and its keeper's
 *                     strip if it has one, and only that room (a cap of one:
 *                     the next door, or no door, lets it go).  By the time the
 *                     Enter button is tapped the picture is a bitmap, not a
 *                     fetch.
 *   prefetchRooms()   the first time you stand at a shop's or a hall's door
 *                     (not the Town Hall's: see HUB_ROOMS), the other rooms'
 *                     BYTES are fetched one at a time, in idle moments, at low
 *                     priority, into
 *                     the browser's own cache -- never decoded, never held
 *                     here (no reference is kept), and cached for a year
 *                     (public/_headers), so a second visit to the game costs
 *                     nothing.  A phone asking for less data (saveData) or on
 *                     a 2G link gets none of it and loads each room as it
 *                     comes to it.
 */
import { roomIdFor, roomUrl, BUILDING_ROOMS, ROOM_KEEPERS } from '@/data/buildingRooms.js';

/* The doors everyone stands at in their first minute: the Town Hall is where a
   character arrives and where Mayor Bro waits (v2.3.3142 made it a door), so
   standing at it says nothing about wanting the other rooms.  It decodes its own
   picture like any door, but it does not start the others' bytes coming -- that
   waits for a shop's or another hall's door, after the first quest's walk has
   the network to itself. */
const HUB_ROOMS = ['townhall'];

let _held = null;        /* { id, imgs }: the pictures decoded for the door you stand at */
let _prefetchStarted = false;

function load(url, decode) {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  /* decode() says there is a bitmap to paint, not only bytes; a failure here is
     the window's own <img> problem to report, so it is not reported twice */
  if (decode && typeof img.decode === 'function') img.decode().catch(function () {});
  return img;
}

/** Decode the picture for the window `panel` opens (a buildingPanel value), and
    let go of the one before.  `null` (no door, or a window with no room) lets
    the held one go. */
export function warmRoom(panel) {
  const id = roomIdFor(panel);
  if (!id) { releaseRoom(); return; }
  if (_held && _held.id === id) return;
  releaseRoom();
  if (typeof Image === 'undefined') return;
  const imgs = [load(roomUrl(id), true)];
  const k = ROOM_KEEPERS[id];
  if (k) imgs.push(load(k.src, true));
  _held = { id, imgs };
  if (HUB_ROOMS.indexOf(id) < 0) prefetchRooms();
}

/** Let go of the held pictures. */
export function releaseRoom() {
  _held = null;
}

/** Fetch every other room's bytes (and the keepers' strips) into the browser's
    cache, one at a time, in idle moments.  Once per page; a no-op where the
    connection says to save data. */
export function prefetchRooms() {
  if (_prefetchStarted || typeof Image === 'undefined') return;
  _prefetchStarted = true;
  const conn = typeof navigator !== 'undefined' ? navigator.connection : null;
  if (conn && (conn.saveData || /(^|-)2g$/.test(String(conn.effectiveType || '')))) return;
  const ids = [];
  for (const k of Object.keys(BUILDING_ROOMS)) if (ids.indexOf(BUILDING_ROOMS[k]) < 0) ids.push(BUILDING_ROOMS[k]);
  const urls = ids.map(roomUrl);
  for (const id of ids) if (ROOM_KEEPERS[id]) urls.push(ROOM_KEEPERS[id].src);
  let i = 0;
  const idle = typeof requestIdleCallback === 'function'
    ? function (f) { requestIdleCallback(f, { timeout: 4000 }); }
    : function (f) { setTimeout(f, 600); };
  const next = function () {
    if (i >= urls.length) return;
    /* the next one starts when this one ends, either way, and nothing keeps
       the Image: when it has loaded it is the cache's, not ours */
    const img = new Image();
    img.decoding = 'async';
    /* behind everything the game itself is loading, where the browser can say so */
    if ('fetchPriority' in img) img.fetchPriority = 'low';
    img.onload = img.onerror = function () { img.onload = img.onerror = null; idle(next); };
    img.src = urls[i++];
  };
  idle(next);
}

/* QA (mp-buildingrooms): which room is decoded for the door you stand at */
if (typeof window !== 'undefined') {
  window.__btRoomWarm = {
    held: function () { return _held ? _held.id : null; },
    prefetched: function () { return _prefetchStarted; },
  };
}
