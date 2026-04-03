/**
 * Tile Map Renderer — renders zone tiles using PixiJS Graphics.
 * Simple approach: one Graphics object per visible area, redrawn on zone change.
 */
import { Container, Graphics } from 'pixi.js';
import { TILE } from '@/data/constants.js';
import { ZONES } from '@/data/zones.js';

function cssToHex(css) {
  if (typeof css !== 'string') return 0x000000;
  return parseInt(css.replace('#', ''), 16) || 0x000000;
}

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

export class TileRenderer {
  constructor(layer) {
    this.layer = layer;
    this.gfx = new Graphics();
    this.layer.addChild(this.gfx);
    this.currentZone = null;
    this.currentMap = null;
  }

  rebuild(app, map, zoneId) {
    this.currentZone = zoneId;
    this.currentMap = map;
    this.gfx.clear();

    if (!map) return;

    const zone = ZONES[zoneId];
    const rows = map.length;
    const cols = map[0]?.length || 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = map[r]?.[c];
        if (tile === undefined) continue;
        const color = getTileHexColor(tile, zoneId);
        const x = c * TILE;
        const y = r * TILE;

        this.gfx.rect(x, y, TILE, TILE);
        this.gfx.fill({ color });

        // Tree (tile 4)
        if (tile === 4) {
          const tcx = x + TILE / 2;
          this.gfx.rect(tcx - 2, y + TILE / 2, 4, TILE / 2);
          this.gfx.fill({ color: 0x3a2810 });
          this.gfx.circle(tcx, y + TILE / 2 - 2, 8);
          this.gfx.fill({ color: cssToHex(zone?.palette?.accent || '#1a6a10') });
        }

        // Flower (tile 5)
        if (tile === 5) {
          this.gfx.circle(x + 10 + (c % 3) * 3, y + 10 + (r % 3) * 3, 2);
          this.gfx.fill({ color: 0xf5c542 });
        }

        // Water shimmer (tile 2)
        if (tile === 2) {
          this.gfx.rect(x + (c % 3) * 6, y + (r % 2) * 8, 6, 2);
          this.gfx.fill({ color: 0xffffff, alpha: 0.12 });
        }

        // Glowing exits
        if (tile === 8 || tile === 9 || tile === 10) {
          this.gfx.rect(x + 2, y + 2, TILE - 4, TILE - 4);
          this.gfx.fill({ color: TILE_COLORS_BASE[tile], alpha: 0.4 });
        }

        // Building outline
        if (tile === 3) {
          this.gfx.rect(x, y, TILE, TILE);
          this.gfx.stroke({ color: 0x2a2040, width: 1 });
        }
      }
    }
  }

  update(cx, cy, viewW, viewH) {
    // Graphics is static — nothing to update per frame for now
  }

  destroy() {
    this.gfx.clear();
  }
}
