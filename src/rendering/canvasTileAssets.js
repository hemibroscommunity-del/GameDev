/**
 * Canvas 2D Tile Asset Loader — pre-renders entire zone tile maps to an
 * offscreen canvas, then blits the visible portion each frame in one call.
 */

const T = 32;
const BASE = '/assets/tilesets/village/Texture/';

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed: ' + src));
    img.src = src;
  });
}

function tileHash(r, c) {
  let h = (r * 374761393 + c * 668265263) >>> 0;
  return ((h ^ (h >> 13)) * 1274126177) >>> 0;
}

const GRASS_V = [[12,0],[13,0],[14,0],[15,0],[12,5],[13,5],[14,5],[15,5]];
const DIRT_V  = [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1]]; // plain dirt (for soil)
const PATH_V  = [[5,1],[5,2],[6,1],[6,2]]; // cobblestone path (center fills)
const TREE_V  = [[1,0],[3,0],[5,0],[7,0]];
const TUFT_V  = [[22,6],[23,6],[24,6]];

const B_MAP = {
  marketplace:'warehouse', vendor:'house03', bank:'house05', enchanting:'house07',
  cooking:'house01', farm:'barn', party:'house09', blacksmith:'blacksmith',
  woodworker:'house02', gambler:'house10', gemcutter:'house04', farmhome:'house06',
};
const B_FILES = {
  house01:'TX_Village_Building_-_House_01.png', house02:'TX_Village_Building_-_House_02.png',
  house03:'TX_Village_Building_-_House_03.png', house04:'TX_Village_Building_-_House_04.png',
  house05:'TX_Village_Building_-_House_05.png', house06:'TX_Village_Building_-_House_06.png',
  house07:'TX_Village_Building_-_House_07.png', house08:'TX_Village_Building_-_House_08.png',
  house09:'TX_Village_Building_-_House_09.png', house10:'TX_Village_Building_-_House_10.png',
  barn:'TX_Village_Building_-_Barn_01.png', blacksmith:'TX_Village_Building_-_Blacksmith_01.png',
  chapel:'TX_Village_Building_-_Chapel_01.png', tower:'TX_Village_Building_-_Tower_01.png',
  warehouse:'TX_Village_Building_-_Warehouse_01.png',
};

let _grass = null;
let _dirt  = null;
let _plant = null;
let _bldgs = {};
let _loaded = false;
let _loading = false;

// Offscreen map cache — a single ImageBitmap or Image of the full tile map
let _cacheImg = null;     // ImageBitmap or HTMLImageElement (for single-call blit)
let _cacheZone = null;
let _cacheMap = null;
let _cacheW = 0;
let _cacheH = 0;

export function startLoadingTileAssets() {
  if (_loading || _loaded) return;
  _loading = true;

  const sheets = Promise.allSettled([
    loadImg(BASE + 'TX_Tileset_Grass.png'),
    loadImg(BASE + 'TX_Tileset_Dirt.png'),
    loadImg(BASE + 'TX_Village_Plant.png'),
  ]);

  const bEntries = Object.entries(B_FILES);
  const bImgs = Promise.allSettled(
    bEntries.map(([, f]) => loadImg(BASE + 'Extra/' + f))
  );

  Promise.all([sheets, bImgs]).then(([sheetResults, bldgResults]) => {
    _grass = sheetResults[0].status === 'fulfilled' ? sheetResults[0].value : null;
    _dirt  = sheetResults[1].status === 'fulfilled' ? sheetResults[1].value : null;
    _plant = sheetResults[2].status === 'fulfilled' ? sheetResults[2].value : null;

    bEntries.forEach(([key], i) => {
      if (bldgResults[i].status === 'fulfilled') _bldgs[key] = bldgResults[i].value;
    });

    if (!_grass) {
      console.warn('Grass tileset failed — falling back to procedural');
      _loading = false;
      return;
    }

    _loaded = true;
    _loading = false;
    console.log('Tile assets loaded —',
      'grass:', !!_grass, 'dirt:', !!_dirt, 'plant:', !!_plant,
      'buildings:', Object.keys(_bldgs).length);
  });
}

export function useSpriteTiles(zoneId) {
  return _loaded && (zoneId === 'town' || zoneId === 'meadow' || zoneId === 'farm_home');
}

/** Render the full zone tile map to an offscreen canvas, convert to ImageBitmap. */
function rebuildCache(map, zoneId) {
  const rows = map.length;
  const cols = map[0].length;
  const w = cols * T;
  const h = rows * T;

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');

  const gLen = GRASS_V.length;
  const dLen = DIRT_V.length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = map[r][c];
      const x = c * T;
      const y = r * T;
      const hash = tileHash(r, c);

      // Grass base
      const gv = GRASS_V[hash % gLen];
      octx.drawImage(_grass, gv[0]*T, gv[1]*T, T, T, x, y, T, T);

      switch (tile) {
        case 0: break;
        case 1:
          if (_dirt) {
            const pv = PATH_V[hash % PATH_V.length];
            octx.drawImage(_dirt, pv[0]*T, pv[1]*T, T, T, x, y, T, T);
          }
          break;
        case 2:
          octx.fillStyle = 'rgba(30,90,180,0.7)';
          octx.fillRect(x, y, T, T);
          octx.fillStyle = 'rgba(255,255,255,0.15)';
          octx.fillRect(x + (c%3)*6, y + (r%2)*8, 6, 2);
          break;
        case 3: break; // building footprint
        case 4:
          if (_plant) {
            const tv = TREE_V[hash % TREE_V.length];
            octx.drawImage(_plant, tv[0]*T, tv[1]*T, T, T*2, x, y - T, T, T*2);
          }
          break;
        case 5:
          if (_plant) {
            const fv = TUFT_V[hash % TUFT_V.length];
            octx.drawImage(_plant, fv[0]*T, fv[1]*T, T, T, x, y, T, T);
          }
          break;
        case 6:
          if (_dirt) {
            const sv = DIRT_V[(hash+2) % dLen];
            octx.drawImage(_dirt, sv[0]*T, sv[1]*T, T, T, x, y, T, T);
          } else {
            octx.fillStyle = '#d4b483';
            octx.fillRect(x, y, T, T);
          }
          break;
        case 7:
          octx.fillStyle = 'rgba(80,80,80,0.75)';
          octx.fillRect(x, y, T, T);
          break;
        case 11:
          octx.fillStyle = '#4a4a4a';
          octx.fillRect(x, y, 3, T);
          octx.fillRect(x + T-3, y, 3, T);
          octx.fillStyle = '#5a5a5a';
          octx.fillRect(x, y+4, T, 2);
          octx.fillRect(x, y+T/2, T, 2);
          octx.fillRect(x, y+T-6, T, 2);
          break;
        case 12:
          octx.strokeStyle = '#8a7a4a';
          octx.lineWidth = 2;
          octx.strokeRect(x+1, y+1, T-2, T-2);
          break;
        default: break;
      }
    }
  }

  // Convert to ImageBitmap for fastest possible blit (if supported),
  // otherwise keep the canvas element itself
  if (typeof createImageBitmap === 'function') {
    createImageBitmap(off).then(function(bmp) {
      _cacheImg = bmp;
      _cacheW = w;
      _cacheH = h;
      console.log('Tile cache built as ImageBitmap:', w, 'x', h);
    });
    // Use the canvas as fallback until bitmap is ready
    _cacheImg = off;
  } else {
    _cacheImg = off;
    console.log('Tile cache built as Canvas:', w, 'x', h);
  }

  _cacheW = w;
  _cacheH = h;
  _cacheZone = zoneId;
  _cacheMap = map;
}

/**
 * Draw tiles: one blit from cache + animated overlay tiles.
 */
export function drawTileLayer(ctx, map, zoneId, cx, cy, W, H, now) {
  if (!_loaded || !_grass) return false;

  // Rebuild cache on zone/map change
  if (zoneId !== _cacheZone || map !== _cacheMap) {
    rebuildCache(map, zoneId);
  }

  if (!_cacheImg) return false;

  // Single blit of visible portion
  const sx = Math.max(0, cx) | 0;
  const sy = Math.max(0, cy) | 0;
  const dx = sx - cx;
  const dy = sy - cy;
  const sw = Math.min(_cacheW - sx, Math.ceil(W) + 2);
  const sh = Math.min(_cacheH - sy, Math.ceil(H) + 2);

  if (sw > 0 && sh > 0) {
    ctx.drawImage(_cacheImg, sx, sy, sw, sh, dx, dy, sw, sh);
  }

  // Fill edges beyond map with grass color
  if (cx < 0) {
    ctx.fillStyle = '#4a6741';
    ctx.fillRect(0, 0, -cx, H);
  }

  // Animated exit tiles — only a few per frame
  const startCol = Math.max(0, (cx / T) | 0);
  const endCol   = Math.min((map[0]?.length || 1) - 1, ((cx + W) / T) | 0);
  const startRow = Math.max(0, (cy / T) | 0);
  const endRow   = Math.min(map.length - 1, ((cy + H) / T) | 0);

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const tile = map[r]?.[c];
      if (tile < 8 || tile > 10) continue;
      const x = c * T - cx;
      const y = r * T - cy;

      if (tile === 8) {
        ctx.fillStyle = '#5b52ff';
        ctx.globalAlpha = Math.sin(now / 300 + c + r) * 0.15 + 0.51;
        ctx.fillRect(x - 2, y - 2, T + 5, T + 5);
        ctx.globalAlpha = 1.0;
      } else if (tile === 9) {
        ctx.fillStyle = '#3dd497';
        ctx.globalAlpha = Math.sin(now / 400 + c) * 0.2 + 0.4;
        ctx.fillRect(x - 2, y - 2, T + 5, T + 5);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = '#ff5e6c';
        ctx.globalAlpha = Math.sin(now / 250 + c * 2) * 0.13 + 0.23;
        ctx.fillRect(x - 3, y - 3, T + 7, T + 7);
        ctx.globalAlpha = 1.0;
      }
    }
  }

  return true;
}

export function drawBuildingSprites(ctx, buildings, cx, cy, viewW, viewH) {
  if (!_loaded) return;

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const spriteKey = B_MAP[b.id];
    const img = spriteKey && _bldgs[spriteKey];
    if (!img) continue;

    const tileW = b.bw * T;
    const tileH = b.bh * T;
    const screenX = b.bx * T - cx;
    const screenY = b.by * T - cy;

    if (screenX + tileW < 0 || screenX > viewW || screenY + tileH < 0 || screenY > viewH) continue;

    const texAspect = img.naturalHeight / img.naturalWidth;
    const spriteW = tileW;
    const spriteH = spriteW * texAspect;
    const drawX = screenX + (tileW - spriteW) / 2;
    const drawY = screenY + tileH - spriteH;

    ctx.drawImage(img, drawX, drawY, spriteW, spriteH);
  }
}
