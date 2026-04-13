/**
 * Tile Asset Loader — loads village tileset PNGs and defines sprite regions.
 * All tilesets use 32×32 pixel tiles.
 */
import { Assets, Texture, Rectangle } from 'pixi.js';

const TILE_PX = 32;
const BASE = '/assets/tilesets/village/Texture/';

/** Cut a sub-texture from a loaded base texture (dimensions in tile units). */
function frame(base, col, row, w = 1, h = 1) {
  return new Texture({
    source: base.source,
    frame: new Rectangle(col * TILE_PX, row * TILE_PX, w * TILE_PX, h * TILE_PX),
  });
}

/**
 * Loads village tileset textures and returns a map of named sub-textures.
 * Call once at startup; the returned object is reused by the tile renderer.
 */
export async function loadTileAssets() {
  // Load only the sheets we actually use (skip Terrain and Building base —
  // terrain is 1024×1024 which can fail on Canvas renderer, and we use
  // individual building PNGs from Extra/ instead of the base sheet)
  const results = await Promise.allSettled([
    Assets.load(BASE + 'TX_Tileset_Grass.png'),
    Assets.load(BASE + 'TX_Tileset_Dirt.png'),
    Assets.load(BASE + 'TX_Village_Plant.png'),
  ]);

  const grassBase = results[0].status === 'fulfilled' ? results[0].value : null;
  const dirtBase  = results[1].status === 'fulfilled' ? results[1].value : null;
  const plantBase = results[2].status === 'fulfilled' ? results[2].value : null;

  if (!grassBase) throw new Error('Failed to load grass tileset (required)');
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.warn('Tileset load failed:', r.reason?.message);
  });

  // --- Grass (512×512 = 16×16 grid) ---
  // Solid grass fills in cols 12-15
  const grass = {
    solid:     frame(grassBase, 12, 0),
    solid2:    frame(grassBase, 13, 0),
    detailed:  frame(grassBase, 12, 5),
    detailed2: frame(grassBase, 13, 5),
    detailed3: frame(grassBase, 14, 5),
    detailed4: frame(grassBase, 15, 5),
  };

  const grassFills = [
    grass.solid, grass.solid2,
    grass.detailed, grass.detailed2, grass.detailed3, grass.detailed4,
  ];

  // --- Dirt / Path (256×128 = 8×4 grid) ---
  let dirtFills = null;
  if (dirtBase) {
    dirtFills = [
      frame(dirtBase, 0, 0), frame(dirtBase, 1, 0),
      frame(dirtBase, 0, 1), frame(dirtBase, 1, 1),
    ];
  }

  // --- Plants (1024×1024 = 32×32 grid) ---
  let treeVariants = null;
  let trees = {};
  if (plantBase) {
    trees = {
      green1: frame(plantBase, 1, 0, 1, 2),
      green2: frame(plantBase, 3, 0, 1, 2),
      green3: frame(plantBase, 5, 0, 1, 2),
      green4: frame(plantBase, 7, 0, 1, 2),
      grassTuft1: frame(plantBase, 22, 6),
      grassTuft2: frame(plantBase, 23, 6),
      grassTuft3: frame(plantBase, 24, 6),
    };
    treeVariants = [trees.green1, trees.green2, trees.green3, trees.green4];
  }

  // --- Building sprites (individual PNGs from Extra/) ---
  const buildingFiles = {
    house01: 'TX_Village_Building_-_House_01.png',
    house02: 'TX_Village_Building_-_House_02.png',
    house03: 'TX_Village_Building_-_House_03.png',
    house04: 'TX_Village_Building_-_House_04.png',
    house05: 'TX_Village_Building_-_House_05.png',
    house06: 'TX_Village_Building_-_House_06.png',
    house07: 'TX_Village_Building_-_House_07.png',
    house08: 'TX_Village_Building_-_House_08.png',
    house09: 'TX_Village_Building_-_House_09.png',
    house10: 'TX_Village_Building_-_House_10.png',
    house11: 'TX_Village_Building_-_House_11.png',
    house12: 'TX_Village_Building_-_House_12.png',
    house13: 'TX_Village_Building_-_House_13.png',
    house14: 'TX_Village_Building_-_House_14.png',
    house15: 'TX_Village_Building_-_House_15.png',
    barn:    'TX_Village_Building_-_Barn_01.png',
    blacksmith: 'TX_Village_Building_-_Blacksmith_01.png',
    chapel:  'TX_Village_Building_-_Chapel_01.png',
    tower:   'TX_Village_Building_-_Tower_01.png',
    warehouse: 'TX_Village_Building_-_Warehouse_01.png',
  };

  const buildingSprites = {};
  const buildingEntries = Object.entries(buildingFiles);
  const buildingTextures = await Promise.all(
    buildingEntries.map(([, file]) => Assets.load(BASE + 'Extra/' + file))
  );
  buildingEntries.forEach(([key], i) => {
    buildingSprites[key] = buildingTextures[i];
  });

  return {
    grassFills,
    dirtFills,
    trees, treeVariants,
    buildings: buildingSprites,
  };
}
