/**
 * Tiled .tmx map loader + per-frame renderer.
 *
 * Fetches .tmx XML from /public/maps, resolves each <tileset> reference to
 * its .tsx (which holds the source PNG dimensions + columns), preloads the
 * PNGs, and exposes the parsed maps via getLoadedTiledMap() for the Pixi
 * TileRenderer (the Canvas-2D drawTiledMap helper was removed in v2.3.778).
 *
 * No Tiled features beyond CSV-encoded tile layers + multiple tilesets are
 * supported — that's all the prototype needs. Object layers, animations,
 * and infinite maps are ignored.
 */

const TILE = 32;

// zoneId -> /maps/<file>.tmx
// All 9 main zones now use single-image maps via IMAGE_ZONE_MAPS.
// This map is kept for any future zones (dungeons, farm, etc.) that
// still want the Tiled pipeline.
export const TILED_ZONE_MAPS = {};

/** Single-image zones — instead of building a Tiled grid, the entire
 *  zone is one 1024x1024 image rendered at native size (zone bounds
 *  match image bounds: 32x32 tiles at TILE=32).  Faster to author
 *  (drop in a generated image, done) and renders as a single Pixi
 *  Sprite — much faster per-frame than tile sprites.
 *  Walkability falls back to "all walkable" since there's no per-tile
 *  metadata to derive blocking from. */
export const IMAGE_ZONE_MAPS = {
  /* All zone art is now at 1024x1024 native to match the 32x32-tile
     world bounds exactly — Pixi no longer rescales the texture per
     frame, so bilinear sub-texel shimmer (visible as walking-stutter)
     is gone.  town_v8.jpg fallback for blocked-autoplay; animated
     overlay through VIDEO_ZONE_MAPS.town below.  Bump suffix on next
     change to bust browser/CDN caches. */
  /* v2.3.1103: all zone maps re-encoded PNG -> WebP q82 (~35MB -> ~4MB) to
     shrink the download. WebP decodes fine in Pixi Assets.load + <img> on
     iOS Safari 14+. Dimensions unchanged (1024x1024), so world bounds and the
     walkability grids still align. */
  town:    '/maps/town_v15.webp',   /* new walled town with buildings (normal avatar size) */
  worldview: '/maps/worldview_v3.webp',   /* v2.3.1403: owner's new painted overworld — central hub city with six radial trails to snow / volcano / desert / cherry-blossom / swamp / coast + crystal cave & thunder spire (speck avatar). Fully walkable (no v3 mask yet); WORLDVIEW_EXITS may need re-anchoring if the owner adopts it. */
  frost:   '/maps/frost_v5.webp',   /* redesign: meadow-coast -> deep-ice transition */
  meadow:  '/maps/meadow_v6.webp',   /* redesign: new painterly meadow (scaled to 1024 world) */
  thunder: '/maps/thunder_v5.webp',   /* redesign: metallic/electric buried-machine peaks */
  tidal:   '/maps/tidal_v6.webp',   /* redesign: arrival-by-sea cave island */
  mist:    '/maps/mist_v5.webp',   /* redesign: poison swamp, living edge -> toxic deep */
  hollows: '/maps/hollows_v6.webp',   /* redesign: underground crystal cavern */
  ember:   '/maps/ember_v6.webp',   /* redesign: volcanic, scorched fringe -> molten heart */
  sky:     '/maps/sky_v5.webp',   /* redesign: warm desert, scrub fringe -> dune sea */
  farm_home: '/maps/farm_v1.webp',   /* redesign: cozy sunlit farm grotto (newly image-backed) */
  verdant: '/maps/verdant_v1.webp',   /* redesign: new Flora spoke */
};

/** Zones that play a looping video as their map texture.  When a zone
 *  appears here AND in IMAGE_ZONE_MAPS, the renderer prefers the video
 *  (so animated effects play on the map) and uses the still image as
 *  a fallback if the browser refuses to play the video.
 *
 *  Mobile autoplay requires the <video> to be `muted`, `playsInline`,
 *  and `autoplay` — without all three, iOS Safari blocks the loop
 *  until a user gesture. */
export const VIDEO_ZONE_MAPS = {
  /* Town is intentionally absent — the looping town_v8.mp4 overlay
     read as "muddy" against the painted art.  Town now uses the
     IMAGE_ZONE_MAPS still image (town_v8.jpg) as its only map. */
};

/** Per-zone walkability JSON.  Each url returns
 *  `{ width, height, grid: bool[h][w] }` where grid[ty][tx]=false marks
 *  a blocked tile.  Used as `S._tiledWalkable[zoneId]` so isSolid()
 *  treats the painted footprints as collision.  When a zone has an
 *  IMAGE_ZONE_MAPS entry but NO walkability JSON, isSolid() defaults
 *  it to fully walkable. */
export const WALKABILITY_MAPS = {
  /* Generated from a ChatGPT-painted magenta=blocked mask via
     tools/mask-to-walkable.mjs (64x64 grid). Authoritative collision for
     the new cove town -- blocks cliffs + ocean, replaces the stale
     procedural building tiles. */
  // town: '/maps/town_v14.walk.json',   /* TEMP: disabled so the Overlook preview is fully walkable (no mask yet) */
  meadow: '/maps/meadow_v6.walk.json',
  frost: '/maps/frost_v5.walk.json',   /* note: north ice flat over-blocked by the mask; repaint to open it */
  tidal: '/maps/tidal_v6.walk.json',   /* note: mask covered rocks only -- open sea + deep pools still walkable, needs a water pass */
  mist: '/maps/mist_v5.walk.json',
  sky: '/maps/sky_v5.walk.json',
  hollows: '/maps/hollows_v6.walk.json',   /* dark cave: formations block, dark rock floor walkable */
  ember: '/maps/ember_v6.walk.json',   /* note: translucent magenta over lava may leak a few walkable lava spots */
  thunder: '/maps/thunder_v5.walk.json',   /* dense machinery -> walkable is mostly the central path corridor */
  farm_home: '/maps/farm_v1.walk.json',   /* note: mask was a wider aspect than the art -- walls align at edges, interior drifts a few % */
  verdant: '/maps/verdant_v1.walk.json',
  // worldview: '/maps/worldview_v1.walk.json',   /* v2.3.1359: DISABLED — the v1 mask was painted for the old art's trails and misaligns on worldview_v2; fully walkable until a v2 mask is painted (same posture as the town mask above) */
};

/** v2.3.1405: which zone maps are currently decoded + resident in the Pixi
 *  Assets cache.  A synchronous mirror of the async cache so the per-zone
 *  loading gate (zoneTransitions.js — a per-frame SYNC function, no await
 *  seam) can decide in one frame whether a zone needs its brief loading
 *  overlay or can be entered instantly (map already resident, e.g. a hub
 *  or a not-yet-freed revisit).  Populated on a successful map load,
 *  cleared by freeZoneMap. */
const _residentZoneMaps = new Set();
export function isZoneMapResident(zoneId) {
  /* v2.3.1406: a zone with no image map has nothing to load — report it
     resident so the transition gate never arms (else a procedural-map
     zone would flash the overlay on EVERY entry for a near-instant load). */
  if (!IMAGE_ZONE_MAPS[zoneId]) return true;
  return _residentZoneMaps.has(zoneId);
}

/** Preload every image-zone map URL into the Pixi Assets cache.  Call
 *  once at renderer startup (alongside loadTileAssets / loadPlayerSprites).
 *  Without preload, Texture.from(url) in Pixi v8 returns an empty
 *  placeholder — the Sprite shows blank until something else
 *  triggers a load.
 *  v2.3.1405: no longer on the pre-game gate (zone maps load per-zone now);
 *  kept for any caller that still wants the whole set at once. */
export async function loadImageZoneMaps() {
  // Lazy import so this module stays usable in non-Pixi contexts.
  const { Assets } = await import('pixi.js');
  /* v2.3.776, redundant since v2.3.778 (canonical call is at
     pixiRenderer.js module scope, early enough for ALL loaders);
     kept as belt-and-braces. */
  try { Assets.setPreferences({ preferCreateImageBitmap: false }); } catch (e) { /* older pixi */ }
  const tasks = Object.entries(IMAGE_ZONE_MAPS).map(([zoneId, url]) =>
    Assets.load(url).then(() => { _residentZoneMaps.add(zoneId); }).catch((e) => {
      console.warn('[image-zone] failed to load', url, e && e.message);
    })
  );
  await Promise.all(tasks);
}

/** Preload just ONE zone's map image (the starting zone, 'town') into the same
 *  Pixi Assets cache that tileRenderer reads (Assets.cache.get(url)).  Awaited
 *  by the intro gate so the ground is painted the instant the overlay lifts —
 *  otherwise the ground sprite falls back to Texture.EMPTY and the world flashes
 *  BLACK until the PNG lands.  Only the starting zone (one URL), so the gate
 *  isn't lengthened by the other 10 maps; those still background-load. */
export async function preloadStartZoneMap(zoneId = 'town') {
  const url = IMAGE_ZONE_MAPS[zoneId];
  if (!url) return;
  const { Assets } = await import('pixi.js');
  try { Assets.setPreferences({ preferCreateImageBitmap: false }); } catch (e) { /* older pixi */ }
  return Assets.load(url).then((tex) => {
    _residentZoneMaps.add(zoneId); /* v2.3.1405: mirror the async cache for the sync gate */
    return tex;
  }).catch((e) => {
    console.warn('[start-zone] failed to load', url, e && e.message);
  });
}

/** v2.3.1405: free a zone's 4MB map texture when leaving it, so only the
 *  hubs + current zone stay resident (per-zone loading, owner directive).
 *  The HUBS (town / worldview) are kept resident — you return to them
 *  constantly and they're cheap to hold.  Assets.unload releases the GPU
 *  TextureSource + cache entry; a later preloadStartZoneMap re-fetches
 *  (usually from the browser's HTTP cache, so a re-decode, not a
 *  re-download).  Safe because tileRenderer destroys the previous zone's
 *  ground sprite before this runs (v2.3.1405) — no live Sprite references
 *  the source when it's unloaded. */
export async function freeZoneMap(zoneId) {
  if (!zoneId || zoneId === 'town' || zoneId === 'worldview') return;
  const url = IMAGE_ZONE_MAPS[zoneId];
  if (!url) return;
  _residentZoneMaps.delete(zoneId); /* v2.3.1405: drop from the sync mirror before the async unload */
  const { Assets } = await import('pixi.js');
  try { await Assets.unload(url); } catch (e) { /* already gone / still in use */ }
}

/** Fetch every walkability JSON in WALKABILITY_MAPS.  Returns a
 *  promise resolving to `{ zoneId: grid[][] }` with grid[ty][tx]=true
 *  for walkable, false for blocked.  Failures are logged and skipped
 *  rather than rejecting — the caller falls back to procedural
 *  walkability when a zone's mask isn't available. */
export async function loadWalkabilityMaps() {
  const out = {};
  await Promise.all(Object.entries(WALKABILITY_MAPS).map(async ([zoneId, url]) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (Array.isArray(data && data.grid)) {
        out[zoneId] = data.grid;
      }
    } catch (e) {
      console.warn('[walkability] failed to load', url, e && e.message);
    }
  }));
  return out;
}

// Loaded map cache: zoneId -> { width, height, layers, tilesets }
const _maps = {};
// Loaded tileset image cache: src -> HTMLImageElement
const _images = {};
// Tilesets currently being fetched: src -> Promise<tilesetMeta>
const _tilesetPromises = {};
// Maps currently being fetched: zoneId -> Promise
const _mapPromises = {};

function _loadImage(src) {
  if (_images[src]) return Promise.resolve(_images[src]);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { _images[src] = img; resolve(img); };
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

async function _loadTileset(tsxUrl, baseDir) {
  if (_tilesetPromises[tsxUrl]) return _tilesetPromises[tsxUrl];
  const p = (async () => {
    const xml = await fetch(tsxUrl).then(r => r.text());
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const ts = doc.querySelector('tileset');
    const img = doc.querySelector('image');
    const imageSrc = baseDir + '/' + img.getAttribute('source');
    await _loadImage(imageSrc);
    return {
      name: ts.getAttribute('name'),
      tileWidth: parseInt(ts.getAttribute('tilewidth'), 10),
      tileHeight: parseInt(ts.getAttribute('tileheight'), 10),
      columns: parseInt(ts.getAttribute('columns'), 10),
      imageSrc,
      imageW: parseInt(img.getAttribute('width'), 10),
      imageH: parseInt(img.getAttribute('height'), 10),
    };
  })();
  _tilesetPromises[tsxUrl] = p;
  return p;
}

export async function loadTiledMap(zoneId) {
  if (_maps[zoneId]) return _maps[zoneId];
  if (_mapPromises[zoneId]) return _mapPromises[zoneId];
  const url = TILED_ZONE_MAPS[zoneId];
  if (!url) return null;

  const baseDir = url.substring(0, url.lastIndexOf('/'));
  const p = (async () => {
    const xml = await fetch(url).then(r => r.text());
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const map = doc.querySelector('map');
    const width = parseInt(map.getAttribute('width'), 10);
    const height = parseInt(map.getAttribute('height'), 10);

    // Tilesets — sorted by firstgid so a binary/linear search picks the right one.
    const tilesets = [];
    for (const tsEl of doc.querySelectorAll('map > tileset')) {
      const firstgid = parseInt(tsEl.getAttribute('firstgid'), 10);
      const source = tsEl.getAttribute('source');
      const tsxUrl = baseDir + '/' + source;
      const tsxBase = tsxUrl.substring(0, tsxUrl.lastIndexOf('/'));
      const meta = await _loadTileset(tsxUrl, tsxBase);
      tilesets.push({ firstgid, ...meta });
    }
    tilesets.sort((a, b) => a.firstgid - b.firstgid);

    // Layers (CSV only).
    const layers = [];
    for (const lEl of doc.querySelectorAll('map > layer')) {
      const dataEl = lEl.querySelector('data');
      const enc = dataEl.getAttribute('encoding');
      if (enc !== 'csv') {
        console.warn('[tiledMaps] non-CSV layer ignored:', lEl.getAttribute('name'));
        continue;
      }
      const data = dataEl.textContent
        .split(',')
        .map(s => parseInt(s.trim(), 10) || 0);
      layers.push({
        name: lEl.getAttribute('name'),
        width: parseInt(lEl.getAttribute('width'), 10),
        height: parseInt(lEl.getAttribute('height'), 10),
        data,
      });
    }

    const result = { width, height, layers, tilesets };
    _maps[zoneId] = result;
    return result;
  })();
  _mapPromises[zoneId] = p;
  return p;
}

/** Resolve a global tile id to {tileset, localId}. */
function _resolveGid(gid, tilesets) {
  // Pick the highest firstgid that's <= gid.
  let pick = null;
  for (const ts of tilesets) {
    if (ts.firstgid <= gid) pick = ts;
    else break;
  }
  if (!pick) return null;
  return { ts: pick, localId: gid - pick.firstgid };
}

/* v2.3.778: drawTiledMap (the legacy Canvas-2D world renderer) deleted --
   it was dead code; the Pixi TileRenderer consumes getLoadedTiledMap()
   instead. */

/**
 * Walkability grid — true = walkable, false = blocked.
 *
 * Rule: a cell is blocked only if any layer places a tile from a
 * BLOCKING tileset there. Currently the only blocking tilesets are
 * those with "building" in the name. Plants and props are walkable
 * per user request — characters can run through bushes, barrels,
 * etc. Ground, paths, terrain, dirt, FX, and SHADOW tilesets remain
 * walkable; shadows are visual-only and never block.
 *
 * Themed zones currently have no blocking-tileset hits so this
 * returns an all-walkable grid.
 */
const BLOCKING_TS_KEYWORDS = ['building'];
const NON_BLOCKING_TS_KEYWORDS = ['shadow']; // shadow tilesets are walkable

function _isBlockingTileset(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  if (NON_BLOCKING_TS_KEYWORDS.some(k => n.includes(k))) return false;
  return BLOCKING_TS_KEYWORDS.some(k => n.includes(k));
}

export function getWalkability(zoneId) {
  const map = _maps[zoneId];
  if (!map) return null;
  const grid = new Array(map.height);
  for (let r = 0; r < map.height; r++) {
    grid[r] = new Array(map.width).fill(true);
  }
  for (const layer of map.layers) {
    for (let r = 0; r < layer.height; r++) {
      for (let c = 0; c < layer.width; c++) {
        const gid = layer.data[r * layer.width + c] & 0x1fffffff;
        if (!gid) continue;
        const res = _resolveGid(gid, map.tilesets);
        if (!res) continue;
        if (_isBlockingTileset(res.ts.name)) grid[r][c] = false;
      }
    }
  }
  return grid;
}

export function preloadAllTiledMaps() {
  return Promise.all(Object.keys(TILED_ZONE_MAPS).map(z => loadTiledMap(z).catch(e => {
    console.warn('[tiledMaps] failed to load', z, e);
  })));
}

/** Returns the cached parsed map for `zoneId`, or null if not loaded.
 *  Used by the Pixi TileRenderer to render Tiled maps directly. */
export function getLoadedTiledMap(zoneId) {
  return _maps[zoneId] || null;
}

/** Returns the cached tileset image (HTMLImageElement) for the given
 *  source URL, or null if not yet loaded. */
export function getTilesetImage(imageSrc) {
  return _images[imageSrc] || null;
}

/** True if the listed Tiled tileset name is the building-blocking class.
 *  Exported so the renderer can z-order building tiles separately if
 *  desired (currently unused — left as a hook). */
export function isBlockingTilesetName(name) {
  return _isBlockingTileset(name);
}
