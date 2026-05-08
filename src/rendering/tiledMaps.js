/**
 * Tiled .tmx map loader + per-frame renderer.
 *
 * Fetches .tmx XML from /public/maps, resolves each <tileset> reference to
 * its .tsx (which holds the source PNG dimensions + columns), preloads the
 * PNGs, and exposes a `drawTiledMap(ctx, zoneId, cx, cy, W, H)` helper that
 * draws each layer's visible tiles as drawImage calls.
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
  town:    '/maps/town_v8.jpg',
  frost:   '/maps/frost_v4.jpg',
  meadow:  '/maps/meadow_v4.jpg',
  thunder: '/maps/thunder_v4.jpg',
  tidal:   '/maps/tidal_v4.jpg',
  mist:    '/maps/mist_v4.jpg',
  hollows: '/maps/hollows_v4.jpg',
  ember:   '/maps/ember_v4.jpg',
  sky:     '/maps/sky_v4.jpg',
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
  /* town_v8.mp4 = re-encoded at 1024x1024 native (was 960x960) so
     it matches world bounds and doesn't get scaled per frame.  CRF
     30, animation tune, audio stripped, faststart on.  Bump suffix
     on next change to bust caches. */
  town: '/maps/town_v8.mp4',
};

/** Per-zone walkability JSON.  Each url returns
 *  `{ width, height, grid: bool[h][w] }` where grid[ty][tx]=false marks
 *  a blocked tile.  Used as `S._tiledWalkable[zoneId]` so isSolid()
 *  treats the painted footprints as collision.  When a zone has an
 *  IMAGE_ZONE_MAPS entry but NO walkability JSON, isSolid() defaults
 *  it to fully walkable. */
export const WALKABILITY_MAPS = {};

/** Preload every image-zone map URL into the Pixi Assets cache.  Call
 *  once at renderer startup (alongside loadTileAssets / loadPlayerSprites).
 *  Without preload, Texture.from(url) in Pixi v8 returns an empty
 *  placeholder — the Sprite shows blank until something else
 *  triggers a load. */
export async function loadImageZoneMaps() {
  // Lazy import so this module stays usable in non-Pixi contexts.
  const { Assets } = await import('pixi.js');
  const tasks = Object.values(IMAGE_ZONE_MAPS).map((url) =>
    Assets.load(url).catch((e) => {
      console.warn('[image-zone] failed to load', url, e && e.message);
    })
  );
  await Promise.all(tasks);
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

/**
 * Draw the loaded Tiled map for `zoneId` to ctx, viewport (cx,cy,W,H) in
 * world pixels. No-ops if the map isn't loaded yet — the caller falls back
 * to its existing renderer until the data arrives.
 */
export function drawTiledMap(ctx, zoneId, cx, cy, W, H) {
  const map = _maps[zoneId];
  if (!map) return false;
  const startCol = Math.max(0, Math.floor(cx / TILE));
  const endCol = Math.min(map.width - 1, Math.floor((cx + W) / TILE));
  const startRow = Math.max(0, Math.floor(cy / TILE));
  const endRow = Math.min(map.height - 1, Math.floor((cy + H) / TILE));

  for (const layer of map.layers) {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const gid = layer.data[r * layer.width + c];
        if (!gid) continue;
        // Strip Tiled flip flags (top 3 bits) — we don't render flips for v1.
        const realGid = gid & 0x1fffffff;
        const r2 = _resolveGid(realGid, map.tilesets);
        if (!r2 || !r2.ts) continue;
        const img = _images[r2.ts.imageSrc];
        if (!img || !img.naturalWidth) continue;
        const cols = r2.ts.columns || 1;
        const sx = (r2.localId % cols) * r2.ts.tileWidth;
        const sy = Math.floor(r2.localId / cols) * r2.ts.tileHeight;
        const dx = c * TILE - cx;
        const dy = r * TILE - cy;
        ctx.drawImage(
          img,
          sx, sy, r2.ts.tileWidth, r2.ts.tileHeight,
          dx, dy, TILE, TILE,
        );
      }
    }
  }
  return true;
}

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
