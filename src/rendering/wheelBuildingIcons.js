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
 * canvas never filters a picture, TRAPS §42).  Let go on leaving the Wheel
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

function drawDown(img) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = BUILDING_ICON_PX;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  /* contained, centred: a picture wider than tall (the map) keeps its shape */
  const iw = img.naturalWidth || img.width || BUILDING_ICON_PX, ih = img.naturalHeight || img.height || BUILDING_ICON_PX;
  const k = Math.min(BUILDING_ICON_PX / iw, BUILDING_ICON_PX / ih);
  const w = Math.round(iw * k), h = Math.round(ih * k);
  g.drawImage(img, Math.round((BUILDING_ICON_PX - w) / 2), Math.round((BUILDING_ICON_PX - h) / 2), w, h);
  return cv;
}
function greyCopy(cv) {
  const out = document.createElement('canvas');
  out.width = cv.width; out.height = cv.height;
  const g = out.getContext('2d');
  g.drawImage(cv, 0, 0);
  try {
    const d = g.getImageData(0, 0, out.width, out.height);
    const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      /* the controls' grey palette: luminance squeezed into 30..214
         (tools/ui/cut-small-icons.py grey) */
      const l = 30 + Math.round((0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) * 0.72);
      p[i] = p[i + 1] = p[i + 2] = l;
    }
    g.putImageData(d, 0, 0);
  } catch (e) { /* a tainted canvas: the lit copy stands in */ }
  return out;
}
function loadOne(plot) {
  const url = WHEEL_BUILDING_ICONS[plot];
  if (!url || _canvas[plot] || typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const cv = drawDown(img);
        _canvas[plot] = cv;
        if (WHEEL_SHUT_DOORS.indexOf(plot) >= 0) _grey[plot] = greyCopy(cv);
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
      bytes: (Object.keys(_canvas).length + Object.keys(_grey).length) * BUILDING_ICON_PX * BUILDING_ICON_PX * 4 });
  } catch (e) { /* no window */ }
}
