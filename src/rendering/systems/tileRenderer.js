/**
 * Tile Map Renderer — renders zone tiles using PixiJS Sprites from tileset assets.
 * Falls back to colored rectangles for tile types without sprite assets.
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import { TILE } from '@/data/constants.js';
import { ZONES } from '@/data/zones.js';
import { TOWN_BUILDINGS } from '@/data/buildings.js';

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
  constructor(layer) {
    this.layer = layer;
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

    this.currentZone = null;
    this.currentMap = null;
    this._bgColor = 0x2d5a1e;
    this._mapW = 0;
    this._mapH = 0;
    this._assets = null;
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

  rebuild(app, map, zoneId) {
    this.currentZone = zoneId;
    this.currentMap = map;
    this.overlayGfx.clear();
    this.bgGfx.clear();
    // Remove old tile sprites
    this.tileContainer.removeChildren();
    this.buildingContainer.removeChildren();

    if (!map) return;

    const zone = ZONES[zoneId];
    const rows = map.length;
    const cols = map[0]?.length || 0;
    this._mapW = cols * TILE;
    this._mapH = rows * TILE;
    this._bgColor = zone?.palette?.ground ? cssToHex(zone.palette.ground) : 0x2d5a1e;

    if (this._useSprites(zoneId)) {
      this._rebuildWithSprites(map, zoneId, rows, cols, zone);
    } else {
      this._rebuildProcedural(map, zoneId, rows, cols, zone);
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
    // Draw background fill extending beyond map edges
    this.bgGfx.clear();
    const pad = Math.max(viewW, viewH);
    this.bgGfx.rect(-pad, -pad, this._mapW + pad * 2, this._mapH + pad * 2);
    this.bgGfx.fill({ color: this._bgColor });
    if (cx < 0) {
      this.bgGfx.rect(-pad, -pad, pad + 0, this._mapH + pad * 2);
      this.bgGfx.fill({ color: 0x000000, alpha: 0.3 });
    }
  }

  destroy() {
    this.tileContainer.removeChildren();
    this.buildingContainer.removeChildren();
    this.overlayGfx.clear();
  }
}
