/**
 * Tile Map Renderer — renders zone tiles using PixiJS Sprites from tileset assets.
 * Falls back to colored rectangles for tile types without sprite assets.
 */
import { Container, Graphics, Sprite, Text, TextStyle, Texture, Rectangle, Assets } from 'pixi.js';
import { TILE } from '@/data/constants.js';
import { ZONES } from '@/data/zones.js';
import { TOWN_BUILDINGS } from '@/data/buildings.js';
import { TOWN_EXITS } from '@/data/effects.js';
import { getLoadedTiledMap, getTilesetImage, IMAGE_ZONE_MAPS, ROOFTOP_OVERLAYS } from '../tiledMaps.js';

const ZONE_LABEL_STYLE = new TextStyle({
  fontFamily: 'VT323, monospace',
  fontSize: 28,
  fontWeight: '700',
  fill: '#ffffff',
  stroke: { color: '#000000', width: 4 },
  align: 'center',
  letterSpacing: 2,
});

function cssToHex(css) {
  if (typeof css !== 'string') return 0x000000;
  return parseInt(css.replace('#', ''), 16) || 0x000000;
}

/* Deterministic hash for tile variety — same position always picks same variant */
function tileHash(r, c) {
  let h = (r * 374761393 + c * 668265263) >>> 0;
  h = ((h ^ (h >> 13)) * 1274126177) >>> 0;
  return h;
}

/* Fallback colors for tiles without sprite assets */
const TILE_COLORS_BASE = {
  0: 0x2d5a1e, 1: 0x8b7355, 2: 0x2a6ca8, 3: 0x4a3a5c,
  4: 0x1a4a12, 5: 0x2d5a1e, 6: 0xd4b483, 7: 0x6b6b6b,
  8: 0x5b52ff, 9: 0x3dd497, 10: 0xff5e6c, 11: 0x4a4a4a,
  12: 0x6a5a3a, 13: 0x7a5a3a, 14: 0x5a4a2a, 15: 0x6a4a5a,
};

function getTileHexColor(tile, zoneId) {
  const zone = ZONES[zoneId];
  if (!zone) return TILE_COLORS_BASE[tile] || 0x2d5a1e;
  if (tile === 0) return cssToHex(zone.palette.ground);
  if (tile === 1) return cssToHex(zone.palette.path);
  return TILE_COLORS_BASE[tile] || cssToHex(zone.palette.ground);
}

/* Map each TOWN_BUILDINGS entry to a building sprite key */
const BUILDING_SPRITE_MAP = {
  marketplace: 'warehouse',
  vendor:      'house03',
  bank:        'house05',
  enchanting:  'house07',
  cooking:     'house01',
  farm:        'barn',
  party:       'house09',
  blacksmith:  'blacksmith',
  woodworker:  'house02',
  gambler:     'house10',
  gemcutter:   'house04',
  farmhome:    'house06',
};

export class TileRenderer {
  constructor(layer, app, rooftopsLayer) {
    this.layer = layer;
    /* App reference is needed to call app.renderer.generateTexture
       in _rebuildFromTiled for the static-map bake.  Optional —
       falls through to per-sprite rendering if app isn't available. */
    this.app = app || null;
    /* Rooftops layer — drawn ABOVE the entity layer so the player
       passes behind tall buildings (zone-specific PNG with alpha=0
       everywhere except above each yellow footprint).  Optional;
       zones without a ROOFTOP_OVERLAYS entry render nothing here. */
    this.rooftopsLayer = rooftopsLayer || null;
    this._rooftopsSprite = null;
    // Background fill
    this.bgGfx = new Graphics();
    this.layer.addChild(this.bgGfx);
    // Container for tile sprites
    this.tileContainer = new Container();
    this.tileContainer.label = 'tileSprites';
    this.layer.addChild(this.tileContainer);
    // Overlay graphics for effects (water shimmer, exit glow, building outlines)
    this.overlayGfx = new Graphics();
    this.layer.addChild(this.overlayGfx);
    // Building sprite container (rendered on top of tiles)
    this.buildingContainer = new Container();
    this.buildingContainer.label = 'buildingSprites';
    this.layer.addChild(this.buildingContainer);

    /* Zone-name labels — pooled.  In TOWN: one label per exit
       showing the destination zone's name.  In a themed zone: one
       label at the return-to-town exit (S.map tile 9) saying "Town".
       Pool grows on demand, unused entries hidden. */
    this._zoneLabels = [];

    /* Exit portal pulse — drawn per-frame on overlayGfx over S.map
       cells with tile id 8 (zone exit) / 9 (return-to-town) / 10
       (dungeon entrance). */
    this._exitTiles = [];   // [{ r, c, tile }]

    this.currentZone = null;
    this.currentMap = null;
    this._bgColor = 0x2d5a1e;
    this._mapW = 0;
    this._mapH = 0;
    this._assets = null;
    /* Tiled tile-frame caches.  Per-tile-gid Texture (frame within the
       tileset) is created once on first use and reused across zones. */
    this._tilesetBaseCache = new Map(); // imageSrc -> Pixi Texture (full image)
    this._tileFrameCache = new Map();   // gid -> Pixi Texture (frame slice)
    /* RenderTexture cache of the fully-composed Tiled map per zone —
       lets the renderer draw the entire map as one Sprite per frame
       instead of thousands of per-tile Sprites.  Built once on the
       first zone entry, reused on revisits, destroyed if the zone's
       map data changes. */
    this._bakedMapCache = new Map();    // zoneId -> Texture (RenderTexture)
  }

  /** Set tile assets (call once after loadTileAssets resolves). */
  setAssets(assets) {
    this._assets = assets;
  }

  /** Returns true if this zone should use village tileset sprites. */
  _useSprites(zoneId) {
    // Use sprites for town and meadow (first forest area)
    return this._assets && (zoneId === 'town' || zoneId === 'meadow' || zoneId === 'farm_home');
  }

  /** Build (or rebuild) the rooftops overlay sprite for the current
   *  zone.  ROOFTOP_OVERLAYS[zoneId] points at a 1024x1024 RGBA PNG
   *  with alpha=0 everywhere except above each painted-yellow building
   *  footprint.  We add it to `rooftopsLayer` (sibling of `tiles`,
   *  z-ordered above `player` in pixiApp.LAYER_NAMES) so the player
   *  walks behind tall roofs.  No-op when zone has no overlay or the
   *  rooftops layer wasn't passed to the renderer. */
  _refreshRooftops(zoneId) {
    if (!this.rooftopsLayer) return;
    const url = ROOFTOP_OVERLAYS[zoneId];
    if (!url) return;
    const cachedTex = Assets.cache.get(url);
    const sprite = new Sprite(cachedTex || Texture.EMPTY);
    sprite.x = 0;
    sprite.y = 0;
    sprite.width = this._mapW;
    sprite.height = this._mapH;
    this.rooftopsLayer.addChild(sprite);
    this._rooftopsSprite = sprite;
    /* Race fix: if the preload is still in flight when the user
       enters town, swap the texture in once Assets.load resolves. */
    if (!cachedTex) {
      const w = this._mapW;
      const h = this._mapH;
      Assets.load(url).then((loaded) => {
        if (loaded && this._rooftopsSprite === sprite && !sprite.destroyed) {
          sprite.texture = loaded;
          sprite.width = w;
          sprite.height = h;
        }
      }).catch(() => {});
    }
  }

  rebuild(app, map, zoneId) {
    this.currentZone = zoneId;
    this.currentMap = map;
    this.overlayGfx.clear();
    this.bgGfx.clear();
    // Remove old tile sprites
    this.tileContainer.removeChildren();
    this.buildingContainer.removeChildren();
    // Drop the previous rooftops sprite — _refreshRooftops() rebuilds it
    // for the new zone if there's an entry in ROOFTOP_OVERLAYS.
    if (this._rooftopsSprite) {
      this._rooftopsSprite.parent?.removeChild(this._rooftopsSprite);
      this._rooftopsSprite.destroy();
      this._rooftopsSprite = null;
    }

    if (!map) return;

    const zone = ZONES[zoneId];
    const rows = map.length;
    const cols = map[0]?.length || 0;
    this._mapW = cols * TILE;
    this._mapH = rows * TILE;
    this._bgColor = zone?.palette?.ground ? cssToHex(zone.palette.ground) : 0x2d5a1e;
    this._refreshRooftops(zoneId);

    /* Collect exit/entrance positions from the procedural S.map.
       Tiles 8/9/10 mark zone exits, return-to-town, and dungeon
       entrances.  Used in update() to draw pulsing portal glows. */
    this._exitTiles = [];
    for (let r = 0; r < rows; r++) {
      const row = map[r];
      if (!row) continue;
      for (let c = 0; c < cols; c++) {
        const t = row[c];
        if (t === 8 || t === 9 || t === 10) {
          this._exitTiles.push({ r, c, tile: t });
        }
      }
    }

    /* Zone-name labels.  TOWN: place one label per exit, showing the
       DESTINATION zone's name (so the player sees where each exit
       leads from inside town).  THEMED ZONES: place one label at the
       return-to-town exit (S.map tile 9) reading "Town" so the
       player knows which exit takes them back home. */
    const labelsForFrame = [];
    if (zoneId === 'town') {
      for (const ex of TOWN_EXITS) {
        const destZone = ZONES[ex.zoneId];
        const text = (destZone && destZone.name) || ex.zoneId;
        labelsForFrame.push(this._exitLabelPos(ex.tx, ex.ty, cols, rows, text, ex.dir));
      }
    } else {
      /* Find tile-9 cells (return-to-town) and label one of them. */
      let placed = 0;
      for (let r = 0; r < rows && placed < 1; r++) {
        const row = map[r];
        if (!row) continue;
        for (let c = 0; c < cols && placed < 1; c++) {
          if (row[c] === 9) {
            labelsForFrame.push(this._exitLabelPos(c, r, cols, rows, 'Town', null));
            placed++;
          }
        }
      }
    }
    /* Apply pooled labels.  Grow the pool if needed; hide extras. */
    while (this._zoneLabels.length < labelsForFrame.length) {
      const t = new Text({ text: '', style: ZONE_LABEL_STYLE });
      t.anchor.set(0.5, 0.5);
      this.layer.addChild(t);
      this._zoneLabels.push(t);
    }
    for (let i = 0; i < this._zoneLabels.length; i++) {
      const t = this._zoneLabels[i];
      const spec = labelsForFrame[i];
      if (!spec) { t.visible = false; continue; }
      if (t.text !== spec.text) t.text = spec.text;
      t.x = spec.x;
      t.y = spec.y;
      t.rotation = spec.rotation || 0;
      t.visible = true;
    }

    /* Single-image zone path — when an entry exists in IMAGE_ZONE_MAPS,
       render one Sprite covering the world bounds.  Beats Tiled for
       authoring speed when you already have the art generated, and
       per-frame draw is just one sprite. */
    const imageUrl = IMAGE_ZONE_MAPS[zoneId];
    if (imageUrl) {
      this._renderedTiled = true;   // tell update() not to retry
      const cachedTex = Assets.cache.get(imageUrl);
      const sprite = new Sprite(cachedTex || Texture.EMPTY);
      sprite.x = 0;
      sprite.y = 0;
      sprite.width = this._mapW;
      sprite.height = this._mapH;
      this.tileContainer.addChild(sprite);
      /* Race fix: if the preload is still in flight when the user
         enters the zone, the cache miss above leaves the sprite on
         Texture.EMPTY (blank).  Kick off the load and swap the
         texture in when it resolves so the player sees the image. */
      if (!cachedTex) {
        const w = this._mapW;
        const h = this._mapH;
        Assets.load(imageUrl).then((loaded) => {
          if (loaded && !sprite.destroyed) {
            sprite.texture = loaded;
            sprite.width = w;
            sprite.height = h;
          }
        }).catch(() => {});
      }
      return;
    }

    /* Prefer Tiled .tmx data when loaded for this zone — that's the
       authoritative visual source.  Falls back to per-tile sprites
       (built from the canvas tile atlas) or procedural rectangles
       when Tiled isn't available.  _renderedTiled tracks whether the
       last rebuild used Tiled, so update() can re-trigger rebuild
       if the Tiled map finishes loading after zone entry. */
    const tiledMap = getLoadedTiledMap(zoneId);
    this._renderedTiled = !!tiledMap;
    if (tiledMap) {
      this._mapW = tiledMap.width * TILE;
      this._mapH = tiledMap.height * TILE;
      this._rebuildFromTiled(tiledMap);
    } else if (this._useSprites(zoneId)) {
      this._rebuildWithSprites(map, zoneId, rows, cols, zone);
    } else {
      this._rebuildProcedural(map, zoneId, rows, cols, zone);
    }
  }

  /** Position a zone label NEAR an exit tile but in the black
   *  margin OUTSIDE the map bounds, so it doesn't cover the playable
   *  area.  Picks the closest cardinal edge from the tile's position
   *  (or the exit's `dir` field if provided).  Returns
   *  { text, x, y, rotation }. */
  _exitLabelPos(tx, ty, cols, rows, text, dir) {
    /* Distance to each edge in tile units. */
    const dN = ty;
    const dS = rows - 1 - ty;
    const dW = tx;
    const dE = cols - 1 - tx;
    /* If a `dir` was provided (from TOWN_EXITS), use it as a hint. */
    let edge;
    if (dir === 'north' || dir === 'ne' || dir === 'nw') edge = 'n';
    else if (dir === 'south' || dir === 'se' || dir === 'sw') edge = 's';
    else if (dir === 'east') edge = 'e';
    else if (dir === 'west') edge = 'w';
    else {
      /* No hint — pick whichever edge the tile is closest to. */
      const min = Math.min(dN, dS, dW, dE);
      if      (min === dN) edge = 'n';
      else if (min === dS) edge = 's';
      else if (min === dW) edge = 'w';
      else                 edge = 'e';
    }
    const cx = tx * TILE + TILE / 2;
    const cy = ty * TILE + TILE / 2;
    const PAD = 32;     // distance from map edge into the black margin
    if (edge === 'n') return { text, x: cx, y: -PAD, rotation: 0 };
    if (edge === 's') return { text, x: cx, y: rows * TILE + PAD, rotation: 0 };
    if (edge === 'w') return { text, x: -PAD - 8, y: cy, rotation: -Math.PI / 2 };
    return { text, x: cols * TILE + PAD + 8, y: cy, rotation: Math.PI / 2 };
  }

  /** Resolve a global tile id to {tileset, localId}, picking the
   *  tileset with the highest firstgid <= gid.  Returns null if no
   *  match (gid 0 = empty cell). */
  _resolveGid(gid, tilesets) {
    let pick = null;
    for (const ts of tilesets) {
      if (ts.firstgid <= gid) pick = ts;
      else break;
    }
    return pick ? { ts: pick, localId: gid - pick.firstgid } : null;
  }

  /** Build (or look up cached) Pixi Texture for a global tile id. */
  _getTileTexture(gid, tilesets) {
    const cached = this._tileFrameCache.get(gid);
    if (cached) return cached;
    const res = this._resolveGid(gid, tilesets);
    if (!res) return null;
    const ts = res.ts;
    let baseTex = this._tilesetBaseCache.get(ts.imageSrc);
    if (!baseTex) {
      const img = getTilesetImage(ts.imageSrc);
      if (!img) return null;            // image not loaded yet — caller falls back
      baseTex = Texture.from(img);
      this._tilesetBaseCache.set(ts.imageSrc, baseTex);
    }
    const cols = ts.columns || 1;
    const sx = (res.localId % cols) * ts.tileWidth;
    const sy = Math.floor(res.localId / cols) * ts.tileHeight;
    const frame = new Texture({
      source: baseTex.source,
      frame: new Rectangle(sx, sy, ts.tileWidth, ts.tileHeight),
    });
    this._tileFrameCache.set(gid, frame);
    return frame;
  }

  /** Render a fully-loaded Tiled map.  When app.renderer is available,
   *  builds all per-tile Sprites into a temporary container, bakes the
   *  composite into a single RenderTexture, then displays the map as
   *  one Sprite using that texture.  This drops per-frame draw count
   *  from ~6000 (40x30 map x 5 layers) to 1 — significant FPS / GC
   *  win at the cost of one bake per zone (~5MB texture for a 40x30
   *  zone, kept in this._bakedMapCache so revisits are instant).
   *
   *  Falls back to the live per-tile Sprites if app isn't available
   *  (e.g., the in-update auto-refresh path that calls rebuild without
   *  an app reference). */
  _rebuildFromTiled(tiledMap) {
    /* Cache hit — reuse the previously baked map texture. */
    if (this.currentZone) {
      const cached = this._bakedMapCache.get(this.currentZone);
      if (cached && !cached.destroyed) {
        const sprite = new Sprite(cached);
        sprite.x = 0;
        sprite.y = 0;
        this.tileContainer.addChild(sprite);
        return;
      }
    }

    /* Build per-tile sprites.  When app is available, these go into a
       temporary container so we can generate a texture; when not,
       they render live in tileContainer. */
    const target = this.app && this.app.renderer ? new Container() : this.tileContainer;

    for (const layer of tiledMap.layers) {
      for (let r = 0; r < layer.height; r++) {
        for (let c = 0; c < layer.width; c++) {
          const raw = layer.data[r * layer.width + c];
          if (!raw) continue;
          const gid = raw & 0x1fffffff;   // strip Tiled flip flags
          const tex = this._getTileTexture(gid, tiledMap.tilesets);
          if (!tex) continue;
          const sprite = new Sprite(tex);
          sprite.x = c * TILE;
          sprite.y = r * TILE;
          sprite.width = TILE;
          sprite.height = TILE;
          target.addChild(sprite);
        }
      }
    }

    /* Bake into a single texture if possible. */
    if (this.app && this.app.renderer && target !== this.tileContainer) {
      try {
        const baked = this.app.renderer.generateTexture({
          target,
          frame: { x: 0, y: 0, width: this._mapW, height: this._mapH },
          resolution: 1,
        });
        if (this.currentZone) this._bakedMapCache.set(this.currentZone, baked);
        const sprite = new Sprite(baked);
        sprite.x = 0;
        sprite.y = 0;
        this.tileContainer.addChild(sprite);
      } catch (e) {
        console.warn('[tileRenderer] map bake failed, falling back to per-tile sprites:', e && e.message);
        /* Move the temp children into tileContainer so we still render. */
        while (target.children.length) {
          const child = target.children[0];
          target.removeChildAt(0);
          this.tileContainer.addChild(child);
        }
      } finally {
        target.destroy({ children: false });
      }
    }
  }

  /** Sprite-based rebuild for zones with tileset assets. */
  _rebuildWithSprites(map, zoneId, rows, cols, zone) {
    const { grassFills, dirtFills, treeVariants, buildings } = this._assets;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = map[r]?.[c];
        if (tile === undefined) continue;
        const x = c * TILE;
        const y = r * TILE;
        const hash = tileHash(r, c);

        // --- Ground layer: always place a grass sprite first ---
        const grassTex = grassFills[hash % grassFills.length];
        const grassSprite = new Sprite(grassTex);
        grassSprite.x = x;
        grassSprite.y = y;
        grassSprite.width = TILE;
        grassSprite.height = TILE;
        this.tileContainer.addChild(grassSprite);

        // --- Overlay based on tile type ---
        if (tile === 1) {
          if (dirtFills) {
            // Path — dirt sprite overlay on top of grass
            const dirtTex = dirtFills[hash % dirtFills.length];
            const pathSprite = new Sprite(dirtTex);
            pathSprite.x = x;
            pathSprite.y = y;
            pathSprite.width = TILE;
            pathSprite.height = TILE;
            this.tileContainer.addChild(pathSprite);
          } else {
            // Fallback — procedural dirt color
            this.overlayGfx.rect(x, y, TILE, TILE);
            this.overlayGfx.fill({ color: 0x8b7355 });
          }
        }

        if (tile === 4 && treeVariants) {
          // Tree — sprite drawn slightly larger, anchored at bottom
          const treeTex = treeVariants[hash % treeVariants.length];
          const treeSprite = new Sprite(treeTex);
          // Trees are 1×2 tiles (32×64), place so trunk base aligns with tile bottom
          treeSprite.anchor.set(0.5, 1);
          treeSprite.x = x + TILE / 2;
          treeSprite.y = y + TILE;
          treeSprite.width = TILE;
          treeSprite.height = TILE * 2;
          this.tileContainer.addChild(treeSprite);
        }

        if (tile === 5 && this._assets.trees.grassTuft1) {
          // Flower — use grass tuft sprites
          const tufts = this._assets.trees;
          const tuftOptions = [tufts.grassTuft1, tufts.grassTuft2, tufts.grassTuft3];
          const tuftTex = tuftOptions[hash % tuftOptions.length];
          const tuftSprite = new Sprite(tuftTex);
          tuftSprite.x = x;
          tuftSprite.y = y;
          tuftSprite.width = TILE;
          tuftSprite.height = TILE;
          this.tileContainer.addChild(tuftSprite);
        }

        // Water shimmer overlay
        if (tile === 2) {
          this.overlayGfx.rect(x, y, TILE, TILE);
          this.overlayGfx.fill({ color: 0x2a6ca8 });
          this.overlayGfx.rect(x + (c % 3) * 6, y + (r % 2) * 8, 6, 2);
          this.overlayGfx.fill({ color: 0xffffff, alpha: 0.15 });
        }

        // Sand/soil
        if (tile === 6) {
          this.overlayGfx.rect(x, y, TILE, TILE);
          this.overlayGfx.fill({ color: 0xd4b483 });
        }

        // Rock/wall
        if (tile === 7) {
          this.overlayGfx.rect(x, y, TILE, TILE);
          this.overlayGfx.fill({ color: 0x6b6b6b });
        }

        // Exit glow
        if (tile === 8 || tile === 9 || tile === 10) {
          this.overlayGfx.rect(x, y, TILE, TILE);
          this.overlayGfx.fill({ color: TILE_COLORS_BASE[tile] || 0x5b52ff });
          this.overlayGfx.rect(x + 2, y + 2, TILE - 4, TILE - 4);
          this.overlayGfx.fill({ color: TILE_COLORS_BASE[tile] || 0x5b52ff, alpha: 0.4 });
        }

        // Fence
        if (tile === 11) {
          this.overlayGfx.rect(x, y, TILE, TILE);
          this.overlayGfx.fill({ color: 0x4a4a4a });
        }

        // Gate
        if (tile === 12) {
          this.overlayGfx.rect(x, y, TILE, TILE);
          this.overlayGfx.fill({ color: 0x6a5a3a });
        }
      }
    }

    // --- Building sprites (town only) ---
    if (zoneId === 'town' && buildings) {
      this._placeBuildingSprites(buildings);
    }
  }

  /** Place individual building sprites on top of building tile regions. */
  _placeBuildingSprites(buildingTextures) {
    TOWN_BUILDINGS.forEach((b) => {
      const spriteKey = BUILDING_SPRITE_MAP[b.id];
      const tex = spriteKey && buildingTextures[spriteKey];
      if (!tex) return;

      const sprite = new Sprite(tex);
      // Position at tile grid location, anchored at bottom-center
      // so taller buildings extend upward naturally
      const tileW = b.bw * TILE;
      const tileH = b.bh * TILE;

      // Scale sprite to fit the building's tile footprint width,
      // maintain aspect ratio (buildings are taller than wide)
      const texAspect = tex.height / tex.width;
      const spriteW = tileW;
      const spriteH = spriteW * texAspect;

      sprite.anchor.set(0.5, 1);
      sprite.x = (b.bx + b.bw / 2) * TILE;
      sprite.y = (b.by + b.bh) * TILE;
      sprite.width = spriteW;
      sprite.height = spriteH;

      this.buildingContainer.addChild(sprite);
    });
  }

  /** Original procedural rebuild for zones without sprite assets. */
  _rebuildProcedural(map, zoneId, rows, cols, zone) {
    // Use a single Graphics object for procedural tiles
    const gfx = new Graphics();
    this.tileContainer.addChild(gfx);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = map[r]?.[c];
        if (tile === undefined) continue;
        const color = getTileHexColor(tile, zoneId);
        const x = c * TILE;
        const y = r * TILE;

        gfx.rect(x, y, TILE, TILE);
        gfx.fill({ color });

        // Tree (tile 4)
        if (tile === 4) {
          const tcx = x + TILE / 2;
          gfx.rect(tcx - 2, y + TILE / 2, 4, TILE / 2);
          gfx.fill({ color: 0x3a2810 });
          gfx.circle(tcx, y + TILE / 2 - 2, 8);
          gfx.fill({ color: cssToHex(zone?.palette?.accent || '#1a6a10') });
        }

        // Flower (tile 5)
        if (tile === 5) {
          gfx.circle(x + 10 + (c % 3) * 3, y + 10 + (r % 3) * 3, 2);
          gfx.fill({ color: 0xf5c542 });
        }

        // Water shimmer (tile 2)
        if (tile === 2) {
          gfx.rect(x + (c % 3) * 6, y + (r % 2) * 8, 6, 2);
          gfx.fill({ color: 0xffffff, alpha: 0.12 });
        }

        // Glowing exits
        if (tile === 8 || tile === 9 || tile === 10) {
          gfx.rect(x + 2, y + 2, TILE - 4, TILE - 4);
          gfx.fill({ color: TILE_COLORS_BASE[tile], alpha: 0.4 });
        }

        // Building outline
        if (tile === 3) {
          gfx.rect(x, y, TILE, TILE);
          gfx.stroke({ color: 0x2a2040, width: 1 });
        }
      }
    }
  }

  update(cx, cy, viewW, viewH) {
    /* Auto-refresh when a Tiled map finishes loading AFTER the
       initial rebuild for this zone — the user briefly sees the
       procedural fallback, then snaps to the Tiled visuals once
       the .tmx + tilesets resolve. */
    if (this.currentZone && !this._renderedTiled) {
      const tiled = getLoadedTiledMap(this.currentZone);
      if (tiled) this.rebuild(null, this.currentMap, this.currentZone);
    }

    /* Pulsing portal glows over zone-exit tiles (8 / 9 / 10).
       Drawn on overlayGfx every frame so the pulse animates without
       a full rebuild.  Color per type: 8 generic exit (zone-element
       color), 9 return-to-town (green), 10 dungeon (red). */
    this.overlayGfx.clear();
    if (this._exitTiles.length) {
      const now = Date.now();
      const zone = ZONES[this.currentZone];
      const elemColor = zone && zone.element ? 0xff5e6c : 0x5b52ff;
      for (const ex of this._exitTiles) {
        const x = ex.c * TILE;
        const y = ex.r * TILE;
        let color, pulseSpeed;
        if (ex.tile === 9)      { color = 0x3dd497; pulseSpeed = 400; }
        else if (ex.tile === 10){ color = elemColor; pulseSpeed = 250; }
        else                    { color = elemColor; pulseSpeed = 300; }
        const pulse = Math.sin(now / pulseSpeed + ex.c + ex.r) * 0.2 + 0.6;
        this.overlayGfx.rect(x - 2, y - 2, TILE + 4, TILE + 4);
        this.overlayGfx.fill({ color, alpha: pulse * 0.55 });
        this.overlayGfx.rect(x + 2, y + 2, TILE - 4, TILE - 4);
        this.overlayGfx.fill({ color, alpha: pulse * 0.25 });
        this.overlayGfx.rect(x, y, TILE, TILE);
        this.overlayGfx.stroke({ color, width: 1.5, alpha: pulse * 0.9 });
      }
    }

    // Two-pass background, matching the Canvas 2D path:
    //   1. Solid BLACK extending well beyond the map so out-of-bounds
    //      areas (anywhere past the tile grid) render black.
    //   2. Zone palette ground color inside the actual map rect.
    this.bgGfx.clear();
    const pad = Math.max(viewW, viewH);
    this.bgGfx.rect(-pad, -pad, this._mapW + pad * 2, this._mapH + pad * 2);
    this.bgGfx.fill({ color: 0x000000 });
    this.bgGfx.rect(0, 0, this._mapW, this._mapH);
    this.bgGfx.fill({ color: this._bgColor });
  }

  destroy() {
    this.tileContainer.removeChildren();
    this.buildingContainer.removeChildren();
    this.overlayGfx.clear();
    if (this._rooftopsSprite) {
      this._rooftopsSprite.parent?.removeChild(this._rooftopsSprite);
      this._rooftopsSprite.destroy();
      this._rooftopsSprite = null;
    }
    /* Free baked map RenderTextures (one per visited zone). */
    for (const [, tex] of this._bakedMapCache) {
      if (tex && !tex.destroyed) tex.destroy(true);
    }
    this._bakedMapCache.clear();
  }
}
