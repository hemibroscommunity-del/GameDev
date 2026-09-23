/* ═══ v2.3.2771: WHAT THE RARE THING ON THE PILE LOOKS LIKE ═══
 *
 * Owner: "Make it so loot from monster drops kind of bounces when it first
 * lands (each item independently).  Show rarer items in top in terms of drop
 * rate if overlap.  Show 'RARE DROP!' message if there's a rare item in the
 * pile and have it just give a faint white shine upward from its position."
 *
 * Until now a rare drop on a pile was a coloured RING on the ground plus a
 * text label -- there was no item to bounce, to sit on top, or to shine.  So
 * each rare kind gets its bag icon here, the same art the inventory shows:
 *
 *   weapon  sword / bow / staff / greatsword (iron greatsword by name)
 *   gem     the rare gem (1 in 200 kills)
 *   armor   iron chest plate / iron greaves (1 in 500 each)
 *
 * PRELOADED, per CLAUDE.md's law: a rare drop is exactly the moment a blank
 * first frame would be seen.  The icons ship at 256px and draw at ~26 world
 * px, so each is shrunk to 64px once at load -- 8 icons, ~130 KB of texture
 * instead of ~2 MB.
 *
 * Also minted here: the shine, a soft vertical beam (canvas, nothing to load).
 */
import { Texture } from 'pixi.js';

const ICON_V = '?v=2.3.1774';   /* InventoryPanel ITEMS_V: the same files, the same cache */
const SRC = {
  sword: '/icons/items/sword.webp',
  bow: '/icons/items/bow.webp',
  staff: '/icons/items/staff.webp',
  greatsword: '/icons/items/great-sword.webp',
  greatswordIron: '/icons/items/great-sword-iron.webp',
  gem: '/icons/ui/cur-gem.webp',
  armorIron: '/icons/items/chest-plate-iron.webp',
  legsIron: '/icons/items/greaves-iron.webp',
};
const SIZE = 64;
export const LOOT_ICONS = Object.create(null);

function shrink(img) {
  const cv = document.createElement('canvas');
  cv.width = SIZE; cv.height = SIZE;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(img, 0, 0, SIZE, SIZE);
  return Texture.from(cv);
}

function load(key, url) {
  if (typeof Image === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => { try { LOOT_ICONS[key] = shrink(img); } catch (e) { /* ring + label still show */ } resolve(); };
      if (typeof img.decode === 'function') img.decode().then(done, done); else done();
    };
    /* a failed icon must never fail the loading gate: the pile keeps its
       ring and label, as it always had */
    img.onerror = () => resolve();
    img.src = url + ICON_V;
  });
}

let _p = null;
/** Registered in preloadWorldAnimations (the global gate). */
export function preloadLootIcons() {
  if (!_p) _p = Promise.all(Object.keys(SRC).map((k) => load(k, SRC[k])));
  return _p;
}

/** The icon for a pile's weapon (server pile: weaponType + weaponName). */
export function weaponIconKey(type, name) {
  const t = String(type || '').toLowerCase();
  if (t === 'greatsword') return /iron/i.test(String(name || '')) ? 'greatswordIron' : 'greatsword';
  if (t === 'bow' || t === 'staff' || t === 'sword') return t;
  return 'sword';
}

/** The icon for one armour piece on a pile ({ name, slot, mat }). */
export function armorIconKey(a) {
  const s = String((a && (a.slot || a.name)) || '').toLowerCase();
  return /leg|greave/.test(s) ? 'legsIron' : 'armorIron';
}

/* The shine: a narrow vertical beam, brightest at its foot and fading upward,
   soft at the sides.  White, drawn additively. */
let _beam = null;
export function lootBeamTexture() {
  if (_beam) return _beam;
  const W = 24, H = 128;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const img = c.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const up = y / (H - 1);                         /* 0 top .. 1 foot */
    const v = Math.pow(up, 1.6);
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - W / 2) / (W / 2);
      const side = Math.exp(-dx * dx * 4.5);
      const a = Math.round(255 * v * side);
      const o = (y * W + x) * 4;
      img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 255; img.data[o + 3] = a;
    }
  }
  c.putImageData(img, 0, 0);
  _beam = Texture.from(cv);
  return _beam;
}
