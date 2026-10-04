/* ═══ v2.3.3016: DUNGEONS IN THE WHEEL ═══
 *
 * Offered "Dungeons in the Wheel ... the other big missing piece, and a larger
 * job", the owner, 2026-10-03: "Yes continue working on those items".  The
 * World Bible's plan for it (docs/WORLD-BIBLE.md §8): "On the tapestry,
 * dungeon entrances become places ... Walking in is the loading screen into
 * an instance."
 *
 * A land's LANDMARK is its dungeon's mouth: the Great Cave (the Stone
 * Hollows), the Foundry Dome (the Electric Foundry), the Buried City (the Wind
 * Dunes).  Walk up to one and "Enter the Great Cave" comes up; the worker
 * opens a private instance of that land's own monsters (server/src/
 * wheeldungeon.js) -- waves of them and a boss, at the place's levels but
 * never above yours -- and when it is cleared, or you walk out of its door,
 * you come back out at the mouth you went in by.
 *
 * This module is the client's half:
 *   - where the mouths are: the worker's own map of the Wheel
 *     (wheelTrial.wheelMapInfo) names every landmark and where it stands, so
 *     nothing here is a second copy of the plan -- only WHICH lands' landmarks
 *     are dungeons today (WHEEL_DUNGEON_HOMES, the worker's table's keys);
 *   - which one you stand at (wheelDoorAt), for the Enter button and the E key;
 *   - the request (enterWheelDungeon), only to a worker that advertises
 *     caps.wheeldungeons -- an older one would read `entrance` as an empty
 *     Workshop config and start a dungeon of level-1 fodder;
 *   - the way back out (leaveWheelDungeon): to today's town and down its
 *     stairs, the trip a death takes (wheelHome.js), with the Wheel's arrival
 *     set to the mouth (worldTrial.setWheelArrival) -- the stairs are the
 *     Wheel's one way in, its loading screen and all.
 */
import { Assets } from 'pixi.js';
import { TILE, ZONES, BT_AUDIO, updateZoneDimensions, generateZoneMap } from '@/data/index.js';
import { wheelMapInfo } from './wheelTrial.js';
import { setWheelArrival } from './worldTrial.js';
import { wantWheelSpawn } from './wheelHome.js';
import { releaseLeftZoneArt, clearZoneLocalFx, veilWheelTrip } from './zoneTransitions.js';
import { WHEEL_DUNGEON_HOMES, DOOR_R, WHEEL_DOOR_LOOK, WHEEL_DUNGEON_FLOOR, WHEEL_ARENA } from '@/data/wheelDungeons.js';

/* the table -- which lands, the button's reach, each mouth's light, each
   arena's floor -- is src/data/wheelDungeons.js (no imports: the server's
   mirror-audit reads it) */
export { WHEEL_DUNGEON_HOMES, DOOR_R, WHEEL_DOOR_LOOK, WHEEL_DUNGEON_FLOOR, WHEEL_ARENA };

/* ═══ THE ARENA ═══
   The Workshop's arena (gameEvents.js) is 28 x 22 with its door in the bottom
   wall: on a phone held upright that zone is smaller than the screen and is
   zoomed in until it fills it (the bro two and a half times his size), and
   the door is a row the player's middle never reaches (data/wheelDungeons.js
   WHEEL_ARENA says why).  A Wheel dungeon's is its own: the size the worker
   sends (36 x 52), walls round it, the bottom one BOTTOM_WALL rows thick, the
   way out two tiles wide in the last row of floor, and you arriving SPAWN_UP
   rows above it. */
export function wheelArenaMap(w, h) {
  const W = Math.max(12, Math.min(64, Math.round(w) || WHEEL_ARENA.W));
  const H = Math.max(16, Math.min(80, Math.round(h) || WHEEL_ARENA.H));
  const map = Array.from({ length: H }, () => Array(W).fill(0));
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (r < WHEEL_ARENA.WALL || c < WHEEL_ARENA.WALL || c >= W - WHEEL_ARENA.WALL || r >= H - WHEEL_ARENA.BOTTOM_WALL) map[r][c] = 7;
    }
  }
  const mx = Math.floor(W / 2);
  const exitRow = H - WHEEL_ARENA.BOTTOM_WALL - 1;
  map[exitRow][mx - 1] = 9;
  map[exitRow][mx] = 9;
  return { map, W, H, spawn: { x: mx * TILE, y: (exitRow - WHEEL_ARENA.SPAWN_UP) * TILE + TILE / 2 }, exit: { row: exitRow, cols: [mx - 1, mx] } };
}

/* ═══ ITS FLOOR ═══
   One of the land's own ground pictures (data/wheelDungeons.js
   WHEEL_DUNGEON_FLOOR), at the address the Wheel's ground worker uses --
   `?v=` its manifest's date, so the cache (public/_headers keeps them for
   good) can never serve an old picture -- loaded behind the dungeon's loading
   screen, as the law asks (gameEvents.js dungeon_started), and let go a beat
   after you leave (dropDungeonZone).  Resolves to its address, or null. */
export async function loadDungeonFloor(home) {
  const f = Object.prototype.hasOwnProperty.call(WHEEL_DUNGEON_FLOOR, home) ? WHEEL_DUNGEON_FLOOR[home] : null;
  if (!f) return null;
  let ver = '';
  try {
    const r = await fetch('/world/ground/manifest.json?t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) { const m = await r.json(); if (m && m.made) ver = '?v=' + encodeURIComponent(m.made); }
  } catch (e) { /* the plain address, then */ }
  const url = '/world/ground/' + f.pic + '-A.png' + ver;
  try {
    /* mipmapped from its first upload: a picture pixel is a quarter of a
       screen pixel on a phone, and without them the floor sparkles */
    await Assets.load({ src: url, data: { autoGenerateMipmaps: true, scaleMode: 'linear' } });
    return url;
  } catch (e) { return null; }
}

/** Let a floor picture go that no arena is standing on (a load that came in
    too late, or an arena never entered).  `url` null is nothing to do. */
export function freeDungeonFloor(url) {
  if (!url || Object.values(ZONES).some((z) => z && z.floorPic === url)) return;
  Promise.resolve().then(() => Assets.unload(url)).catch(() => { /* a leak, not a crash */ });
}

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

let _doorsOf = null, _doors = [];
/** The mouths, [{ id (its land), name, x, y }], from the worker's map of the
    Wheel ([] before it has posted one, or outside the Wheel's mode). */
export function wheelDungeonDoors() {
  const map = wheelMapInfo();
  if (!map || !Array.isArray(map.places)) return [];
  if (map === _doorsOf) return _doors;
  _doorsOf = map;
  _doors = map.places
    .filter((p) => p && p.kind === 'landmark' && WHEEL_DUNGEON_HOMES.includes(p.region) && isFinite(p.x) && isFinite(p.y))
    .map((p) => ({ id: p.region, name: p.name || 'the dungeon', x: p.x, y: p.y }));
  return _doors;
}

/** Does this worker open the Wheel's dungeons? */
export function wheelDungeonsSupported(S) {
  return !!(S && S._serverCaps && S._serverCaps.wheeldungeons);
}

/** The mouth you stand at in the Wheel (within DOOR_R), or null. */
export function wheelDoorAt(S) {
  if (!S || S.currentZone !== 'wheel' || !S.player || !wheelDungeonsSupported(S)) return null;
  const P = S.player;
  let best = null, bestD = DOOR_R * DOOR_R;
  for (const d of wheelDungeonDoors()) {
    const dx = d.x - P.x, dy = d.y - P.y, d2 = dx * dx + dy * dy;
    if (d2 <= bestD) { bestD = d2; best = d; }
  }
  return best;
}

/** Ask the worker for the dungeon behind mouth `id`.  The answer is
    dungeon_started (gameEvents.js builds the arena and steps in) or
    dungeon_error (its message over your head).  Once a second: a double tap
    is one request. */
export function enterWheelDungeon(S, id) {
  if (!S || !S.channel || !wheelDungeonsSupported(S) || !WHEEL_DUNGEON_HOMES.includes(id)) return false;
  if (S._serverDungeon || S._dying) return false;
  const now = Date.now();
  if (S._wheelDoorAskedAt && now - S._wheelDoorAskedAt < 1000) return false;
  S._wheelDoorAskedAt = now;
  try {
    S.channel.send({ type: 'broadcast', event: 'dungeon_start', payload: { entrance: id } });
  } catch (e) { return false; }
  try { BT_AUDIO.enterBuilding(); } catch (e) { /* sound only */ }
  return true;
}

/** A dungeon's synthetic ZONES entry (gameEvents.js dungeon_started) goes,
    once whatever is leaving it has read it: the art release waits 400 ms
    (zoneTransitions.releaseLeftZoneArt) and finds the dungeon's monsters'
    looks through the entry's `homes`.  Deleted at once, a Wheel dungeon's
    looks stayed loaded until the Wheel itself was left. */
export function dropDungeonZone(zone) {
  if (typeof zone !== 'string' || !own(ZONES, zone) || !ZONES[zone]._instance) return;
  setTimeout(() => {
    if (!own(ZONES, zone) || !ZONES[zone]._instance) return;
    /* ...and its floor picture: the tile renderer dropped its sprite when it
       rebuilt for where you went (tileRenderer.js _floorSprite) */
    const pic = ZONES[zone].floorPic;
    delete ZONES[zone];
    freeDungeonFloor(pic);
  }, 1500);
}

/** Is this dungeon one of the Wheel's (it has a mouth to come back out at)? */
export function inWheelDungeon(S) {
  return !!(S && S._serverDungeon && S._dungeonBack);
}

/* The way back, as the worker sent it on dungeon_started: { z: 'wheel', x, y }
   -- a step outside the mouth.  Only a finite point in the Wheel is kept. */
export function keepDungeonBack(S, back) {
  if (!S) return;
  S._dungeonBack = (back && back.z === 'wheel' && isFinite(back.x) && isFinite(back.y))
    ? { x: Number(back.x), y: Number(back.y) } : null;
}

/**
 * Out of a Wheel dungeon -- cleared, or walked out of its door -- and back to
 * its mouth: into today's town, as a death comes back, and down the stairs at
 * once (wheelHome.js), arriving at the mouth instead of the town square.
 * Returns false (and does nothing) for any other dungeon: the Workshop's keep
 * their own way home.
 */
export function leaveWheelDungeon(S) {
  if (!S || !S._dungeonBack) return false;
  const back = S._dungeonBack;
  const left = S.currentZone;
  const inst = S._serverDungeon;
  S._serverDungeon = null;
  S._inDungeon = false;
  S._inCustomDungeon = false;
  S._customDungeonConfig = null;
  S._dungeonComplete = false;
  S._dungeonBossSpawned = false;
  S._serverMonsters = false;
  S._dungeonBack = null;
  setWheelArrival(back);
  S.currentZone = 'town';
  S.npcs = null;   /* town's townsfolk come back with it (respawn.js, v2.3.2990) */
  /* the dungeon's monsters' looks go with it: the release (400 ms on) reads
     them off its synthetic ZONES entry's `homes` (variantsForZone), so the
     entry goes only after that (dropDungeonZone) */
  try { releaseLeftZoneArt(left, 'town'); } catch (e) { /* a leak, not a crash */ }
  dropDungeonZone(inst);
  updateZoneDimensions('town');
  try { BT_AUDIO.startZoneAmbient('town'); } catch (e) { /* sound only */ }
  S.map = generateZoneMap('town');
  S.monsters = [];
  S.lockedTarget = null;
  S.gatherNodes = [];
  S.groundLoot = [];
  if (typeof window !== 'undefined' && window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
  S.hitParticles = [];
  S.deathExplosions = [];
  S.arrows = [];
  S.slimeProjectiles = [];
  S.snowballBursts = [];
  S.arrowBlasts = [];
  S.slimeShockwaves = [];
  try { clearZoneLocalFx(S); } catch (e) { /* fx only */ }
  const tz = ZONES.town;
  if (S.player && tz) {
    S.player.x = (tz.w / 2) * TILE;
    S.player.y = (tz.h / 2) * TILE;
    S.player.vx = 0; S.player.vy = 0;
  }
  S._zoneWipe = Date.now();
  wantWheelSpawn(S);
  veilWheelTrip(S);   /* v2.3.3025: today's town never painted on the way back */
  if (S.channel && S.player) {
    try { S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: 'town', vx: 0, vy: 0 } }); } catch (e) { /* the next move carries it */ }
  }
  return true;
}

/* QA (mp-wheeldungeon): the mouths as this client knows them, and which one
   you stand at -- read-only */
if (typeof window !== 'undefined') {
  window.__btWheelDungeons = {
    doors: () => wheelDungeonDoors().map((d) => ({ ...d })),
    at: () => { const S = window._gameState && window._gameState.current; const d = wheelDoorAt(S); return d ? d.id : null; },
  };
}
