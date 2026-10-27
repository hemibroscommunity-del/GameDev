/* ═══ v2.3.3522: EACH BUILDING'S PICTURE, FOR THE MAPS ═══
 *
 * The owner, playtesting: "Have icons representing each building on each
 * building in the minimap/compass."  The minimap (wheelMinimap.js _buildTown)
 * draws each of BroTown's buildings as a roof-coloured footprint with a notch
 * at its door; now each wears the picture its Enter button does
 * (src/data/wheelBuildingDoors.js WHEEL_BUILDING_ICONS), ~14 CSS px on its
 * footprint, and the world map draws the same at each door up close in place
 * of the little drawn house (WorldMapOverlay.jsx).
 *
 * Loaded behind the Wheel's own loading screen (preloadAnimations.js
 * preloadZoneAssets -> loadWheelBuildingIcons), as the signposts' land icons
 * are (wheelSignposts.js): each 256 px picture is decoded once and drawn down
 * to ICON_PX on a canvas as it lands, the 256 px image dropped -- sixteen
 * decoded at full size would be 4 MB for marks 42 device px across.  A shut
 * building's picture gets a grey copy (its pixels' luminance, baked: the
 * canvas never filters a picture, TRAPS §42).  Since v2.3.3614 each is a
 * white symbol on a dark grey disc (drawDisc's note), the shut one's symbol
 * a mid grey.  Let go on leaving the Wheel
 * (freeWheelBuildingIcons, from freeZoneAssets): the minimap's sprites are
 * taken off them first (`hold`'s clear), as a sprite left on a destroyed
 * texture throws in the next frame (CLAUDE.md, the ZONE-ASSET rule).
 *
 * MEMORY: 16 canvases of 64 x 64 (16 KB each) and the hotel's grey copy,
 * ~0.27 MB, held as canvases (the world map draws them with drawImage) and
 * once on the graphics chip as the minimap's textures, ~0.27 MB more: about
 * half a MB while you are in the Wheel, none outside it.  A building whose
 * picture did not load is drawn without one, never fetched on sight (the
 * preloading LAW). */
import { Texture, CanvasSource } from 'pixi.js';
import { WHEEL_BUILDING_ICONS, WHEEL_SHUT_DOORS } from '../data/wheelBuildingDoors.js';

export const BUILDING_ICON_PX = 64;   /* the canvas, px a side: 14 CSS px on a 3x phone is 42, the world map's 20 is 60 */

const _canvas = Object.create(null);   /* plot -> canvas (lit) */
const _grey = Object.create(null);     /* plot -> canvas (grey: a shut one) */
const _tex = Object.create(null);      /* 'plot' or 'plot:grey' -> Texture */
let _loading = null;
const _live = new Set();

/* ═══ v2.3.3614: A WHITE SYMBOL ON A DARK GREY DISC ═══
   The owner, 2026-10-26: "The icons on the minimap that represent each
   business need to be totally different. It blends in with the building
   visually. It needs to be on a plain circle background maybe dark gray and
   the symbol drawing representing the building in white."  The pictures were
   drawn as they are, in colour, on the roof's own terracotta.  Each is now a
   plain dark grey disc under the same picture made WHITE BY ITS OWN LIGHT:
   its darkest lines a light grey, its brightest quarter white (SYM_GREY_LO,
   SYM_WHITE_SHARE), so the anvil keeps its horn and the vault its dial -- a flat
   white silhouette turned the envelope into a white box and the dice into
   two blobs (the preview compared both).  The picture's see-through margin is
   cut first, so every symbol fills the same share of its disc (SYMBOL_K).
   The world map draws the same canvas at each door: one look for a building
   on both maps.  A shut building's symbol is a mid grey (none is shut today,
   v2.3.3539). */
const DISC = '#2E3438', DISC_KEY = '#0E1214';
const SYMBOL_K = 0.68;          /* the symbol's longer side, of the disc's width */
const SYM_GREY_LO = 170;        /* a symbol's darkest line, a light grey */
const SYM_WHITE_SHARE = 0.25;   /* its brightest quarter is white (whiten) */
const SYM_SHUT = 0.62;          /* a shut building's symbol, of white */

/** The picture's opaque box, drawn into `box` px (contained), as a canvas. */
function fitSymbol(img, box) {
  const iw = img.naturalWidth || img.width || box, ih = img.naturalHeight || img.height || box;
  /* read at no more than 256 px a side: the cut's box, then the fit */
  const k0 = Math.min(1, 256 / Math.max(iw, ih));
  const W = Math.max(1, Math.round(iw * k0)), H = Math.max(1, Math.round(ih * k0));
  const a = document.createElement('canvas');
  a.width = W; a.height = H;
  const ga = a.getContext('2d');
  ga.imageSmoothingEnabled = true; ga.imageSmoothingQuality = 'high';
  ga.drawImage(img, 0, 0, W, H);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  try {
    const d = ga.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[4 * (y * W + x) + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  } catch (e) { /* tainted: the whole picture */ }
  if (x1 < x0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const k = Math.min(box / cw, box / ch);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(cw * k)); out.height = Math.max(1, Math.round(ch * k));
  const go = out.getContext('2d');
  go.imageSmoothingEnabled = true; go.imageSmoothingQuality = 'high';
  go.drawImage(a, x0, y0, cw, ch, 0, 0, out.width, out.height);
  a.width = 0;
  return out;
}
/** The symbol made white by its own light (the header's note); `shut` greys
    it.  Each picture is lifted by its OWN light: the brightest quarter of its
    pixels white, the rest down to SYM_GREY_LO by their luminance -- a fixed
    lift left the gavel's dark wood a dull grey beside the envelope's white. */
function whiten(cv, shut) {
  const g = cv.getContext('2d');
  try {
    const d = g.getImageData(0, 0, cv.width, cv.height);
    const p = d.data;
    const lum = (i) => (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255;
    const hist = new Uint32Array(256);
    let n = 0;
    for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 24) { hist[Math.round(lum(i) * 255)]++; n++; }
    let want = Math.ceil(n * (1 - SYM_WHITE_SHARE)), at = 0, lHi = 1;
    for (let b = 0; b < 256; b++) { at += hist[b]; if (at >= want) { lHi = b / 255; break; } }
    lHi = Math.max(0.2, lHi);
    for (let i = 0; i < p.length; i += 4) {
      let v = SYM_GREY_LO + (255 - SYM_GREY_LO) * Math.min(1, lum(i) / lHi);
      if (shut) v *= SYM_SHUT;
      p[i] = p[i + 1] = p[i + 2] = Math.round(v);
    }
    g.putImageData(d, 0, 0);
  } catch (e) { /* tainted: drawn as it is */ }
  return cv;
}
function drawDisc(img, shut) {
  const S = BUILDING_ICON_PX;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 1.5, 0, Math.PI * 2);
  g.fillStyle = DISC;
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = DISC_KEY;
  g.stroke();
  const sym = whiten(fitSymbol(img, Math.round(S * SYMBOL_K)), shut);
  g.drawImage(sym, Math.round((S - sym.width) / 2), Math.round((S - sym.height) / 2));
  sym.width = 0;
  return cv;
}
function loadOne(plot) {
  const url = WHEEL_BUILDING_ICONS[plot];
  if (!url || _canvas[plot] || typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        _canvas[plot] = drawDisc(img, false);
        if (WHEEL_SHUT_DOORS.indexOf(plot) >= 0) _grey[plot] = drawDisc(img, true);
      } catch (e) { /* drawn without it */ }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Behind the Wheel's loading screen (preloadZoneAssets('wheel')). */
export function loadWheelBuildingIcons() {
  if (!_loading) _loading = Promise.all(Object.keys(WHEEL_BUILDING_ICONS).map(loadOne)).then(() => undefined);
  return _loading;
}

/** On leaving the Wheel (freeZoneAssets): every holder lets go first. */
export function freeWheelBuildingIcons() {
  for (const h of _live) { try { h.clear(); } catch (e) { /* gone */ } }
  _loading = null;
  for (const k of Object.keys(_tex)) {
    try { _tex[k].destroy(true); } catch (e) { /* gone */ }
    delete _tex[k];
  }
  for (const k of Object.keys(_canvas)) { _canvas[k].width = 0; delete _canvas[k]; }
  for (const k of Object.keys(_grey)) { _grey[k].width = 0; delete _grey[k]; }
}

/** The picture's canvas (the world map's drawImage), or null while it is not
    loaded; `grey` the shut copy where there is one. */
export function wheelBuildingIconCanvas(plot, grey) {
  if (typeof plot !== 'string') return null;
  return (grey && _grey[plot]) || _canvas[plot] || null;
}
/** The minimap's texture for a plot, made from its canvas the first time it
    is asked for (the minimap builds its town once, behind the loading
    screen's end), or null while the picture is not loaded. */
export function wheelBuildingIconTexture(plot, grey) {
  const cv = wheelBuildingIconCanvas(plot, grey);
  if (!cv) return null;
  const key = plot + (grey && _grey[plot] ? ':grey' : '');
  if (!_tex[key]) _tex[key] = new Texture({ source: new CanvasSource({ resource: cv }) });
  return _tex[key];
}
/** A drawer that holds the textures: `holder.clear()` is called before they go. */
export function holdBuildingIcons(holder) { if (holder) _live.add(holder); }
export function releaseBuildingIcons(holder) { _live.delete(holder); }
/** QA: how many pictures are loaded. */
export function wheelBuildingIconsLoaded() { return Object.keys(_canvas).length; }

/* QA (mp-wheelmap): what is held -- the drawn-down pictures, their grey
   copies and the minimap's textures; all three none outside the Wheel */
if (typeof window !== 'undefined') {
  try {
    window.__btBuildingIcons = () => ({ loaded: Object.keys(_canvas).length, grey: Object.keys(_grey).length, textures: Object.keys(_tex).length,
      bytes: (Object.keys(_canvas).length + Object.keys(_grey).length) * BUILDING_ICON_PX * BUILDING_ICON_PX * 4,
      /* v2.3.3614 (mp-wheelmap): each picture's opaque pixels -- the disc's
         dark grey, the symbol's near-white, and any with colour left in it */
      look: () => Object.keys(_canvas).map((plot) => {
        const d = _canvas[plot].getContext('2d').getImageData(0, 0, BUILDING_ICON_PX, BUILDING_ICON_PX).data;
        let n = 0, disc = 0, white = 0, colour = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 250) continue;
          n++;
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (Math.max(r, g, b) - Math.min(r, g, b) > 14) colour++;
          else if (r < 70) disc++;
          else if (r >= 200) white++;
        }
        return { plot, n, disc, white, colour };
      }) });
  } catch (e) { /* no window */ }
}
