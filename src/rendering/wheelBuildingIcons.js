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
 * canvas never filters a picture, TRAPS §42).  v2.3.3614 made each a white
 * symbol on a dark grey disc; since v2.3.3630 each is its picture in its own
 * colours again, drawn bigger than the building under it and ringed in a thin
 * dark outline (drawIcon's note).  Let go on leaving the Wheel
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

/* ═══ v2.3.3630: THE PICTURE IN ITS COLOURS, BIGGER THAN ITS BUILDING ═══
   v2.3.3614 drew each as a white symbol on a dark grey disc (the owner, then:
   "It blends in with the building visually").  The owner, 2026-10-27: "I
   think instead of the white minimap icons you should just do the colored
   icons but oversized so they aren't competing with the buildings color and
   size".  So each is the picture its Enter button wears, in its own colours
   again, its see-through margin cut so every one fills the same share of its
   square (fitSymbol), ringed in a thin dark outline (OUTLINE canvas px, the
   minimap's keyline colour) so it stands off a roof's terracotta, and the
   minimap draws it bigger than the footprint under it (wheelMinimap.js
   BLD_ICON_PX): the picture is what you read, the roof a base under it.  The
   world map draws the same canvas at each door.  A shut building's copy is
   the picture's luminance in the controls' greys (none is shut today,
   v2.3.3539). */
const OUTLINE = 3;              /* canvas px of dark ring round the picture's silhouette (~1 CSS px drawn) */
const OUTLINE_COL = '#0B161B';  /* the minimap's keyline (C_BUILDING_KEY) */

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
/** A shut building's copy: the picture's luminance squeezed into the
    controls' greys (tools/ui/cut-small-icons.py grey), as v2.3.3522 had it. */
function greyOut(cv) {
  const g = cv.getContext('2d');
  try {
    const d = g.getImageData(0, 0, cv.width, cv.height);
    const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const l = (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255;
      p[i] = p[i + 1] = p[i + 2] = Math.round(30 + 184 * l);
    }
    g.putImageData(d, 0, 0);
  } catch (e) { /* tainted: drawn as it is */ }
  return cv;
}
function drawIcon(img, shut) {
  const S = BUILDING_ICON_PX;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const sym = fitSymbol(img, S - 2 * OUTLINE - 2);
  if (shut) greyOut(sym);
  const x = Math.round((S - sym.width) / 2), y = Math.round((S - sym.height) / 2);
  /* the outline: the silhouette in the keyline's colour, stamped round it,
     then the picture over it */
  const sil = document.createElement('canvas');
  sil.width = sym.width; sil.height = sym.height;
  const gs = sil.getContext('2d');
  gs.drawImage(sym, 0, 0);
  gs.globalCompositeOperation = 'source-in';
  gs.fillStyle = OUTLINE_COL;
  gs.fillRect(0, 0, sil.width, sil.height);
  for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2;
    g.drawImage(sil, x + Math.round(Math.cos(t) * OUTLINE), y + Math.round(Math.sin(t) * OUTLINE));
  }
  g.drawImage(sym, x, y);
  sil.width = 0;
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
        _canvas[plot] = drawIcon(img, false);
        if (WHEEL_SHUT_DOORS.indexOf(plot) >= 0) _grey[plot] = drawIcon(img, true);
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
      /* v2.3.3630 (mp-wheelmap): each picture's opaque pixels -- how many
         carry colour (the picture's own), how many are the dark outline, how
         many a light grey or white (the old whitened symbol was all of them),
         and whether a disc fills its corners (none should) */
      look: () => Object.keys(_canvas).map((plot) => {
        const S = BUILDING_ICON_PX;
        const d = _canvas[plot].getContext('2d').getImageData(0, 0, S, S).data;
        let n = 0, dark = 0, colour = 0, white = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 250) continue;
          n++;
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (Math.max(r, g, b) - Math.min(r, g, b) > 24) colour++;
          else if (Math.max(r, g, b) < 40) dark++;
          else if (Math.min(r, g, b) >= 170) white++;
        }
        /* a disc would fill the square's ring at 45 degrees; the pictures leave it see-through somewhere */
        let ring = 0, ringN = 0;
        for (let a = 0; a < 32; a++) {
          const t = (a / 32) * Math.PI * 2, x = Math.round(S / 2 + Math.cos(t) * (S / 2 - 3)), y = Math.round(S / 2 + Math.sin(t) * (S / 2 - 3));
          ringN++; if (d[4 * (y * S + x) + 3] > 200) ring++;
        }
        return { plot, n, dark, colour, white, ring: Math.round(100 * ring / ringN) };
      }) });
  } catch (e) { /* no window */ }
}
