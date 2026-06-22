/* Warm the "Customize Your Bro" trait thumbnails so they don't pop in slowly
 * when the player opens a category tab.  The grid renders plain
 * <img src=/sprites/traits/<cat>/<id>/thumb.png?v=BUILD_INFO.version> on demand
 * (BroTown _thumbTile); we kick the same URLs into the browser cache up front
 * via new Image() while the welcome modal is showing, so the tiles are instant.
 * Only the four thumb categories (the rest are color swatches). */

import { HEADWEAR_CATALOG } from './traits/headwearCatalog.js';
import { HAIR_CATALOG } from './traits/hairCatalog.js';
import { FACIALHAIR_CATALOG } from './traits/facialHairCatalog.js';
import { SHIRT_CATALOG } from './traits/shirtCatalog.js';
import { BUILD_INFO } from '../ui/BuildBadge.jsx';

/* sprite folder -> catalog (matches the grid's spriteCat keys). */
const THUMB_CATS = [
  ['headwear', HEADWEAR_CATALOG],
  ['hair', HAIR_CATALOG],
  ['facialhair', FACIALHAIR_CATALOG],
  ['shirt', SHIRT_CATALOG],
];

let _warmed = false;
const _imgs = []; // hold refs so the prefetch isn't GC'd mid-flight

export function preloadTraitThumbs() {
  if (_warmed) return;
  _warmed = true;
  try {
    for (const [cat, catalog] of THUMB_CATS) {
      for (const opt of (catalog || [])) {
        if (!opt || !opt.id || opt.id === 'none') continue; // 'none' renders a dashed circle, no img
        const img = new Image();
        img.decoding = 'async';
        img.src = '/sprites/traits/' + cat + '/' + opt.id + '/thumb.png?v=' + BUILD_INFO.version;
        _imgs.push(img);
      }
    }
  } catch (e) { /* warm-only; ignore */ }
}
