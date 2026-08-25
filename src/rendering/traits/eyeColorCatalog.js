/* ═══ v2.3.1928: EYE COLOUR ═══
 *
 * Owner: "maybe you could also do an eye recolor?"
 *
 * The eyes are painted into the body sheets rather than being a layer, so the
 * pixels are found once offline (tools/eyes/extract-eye-mask.mjs) and shipped
 * as src/rendering/eyeMask.json.  This file is only the palette and the
 * selection, in the same shape as hatColorCatalog: a catalog, a localStorage
 * store, and a change subscription the renderer listens to.
 *
 * WHERE IT SHOWS.  The figure renders about 77px tall in play, so the iris is
 * roughly one screen pixel wide there — this is a character-creator feature,
 * and where it reads is the creator, the character sheet portrait and the
 * inspect card, all of which draw at the full 256 frame.  That was said up
 * front rather than discovered afterwards.
 *
 * `target` REPLACES the iris outright rather than being a brightness-ratio
 * retint.  The iris is near-black, so a ratio pass (which every other recolour
 * in the game uses) would multiply it back to near-black and nothing would
 * change.  `null` = the art's own dark, i.e. no recolour at all.
 */

import { recolorEnabled } from './recolorOptions.js';

export const EYE_COLOR_CATALOG = [
  { id: 'default', name: 'Default', swatch: '#2b2620', target: null },
  { id: 'brown',   name: 'Brown',   swatch: '#7a4a22', target: [122, 74, 34] },
  { id: 'amber',   name: 'Amber',   swatch: '#c8963c', target: [200, 150, 60] },
  { id: 'green',   name: 'Green',   swatch: '#46963c', target: [70, 150, 90] },
  { id: 'blue',    name: 'Blue',    swatch: '#466ed2', target: [70, 110, 210] },
  { id: 'ice',     name: 'Ice',     swatch: '#8fbcd4', target: [143, 188, 212] },
  { id: 'violet',  name: 'Violet',  swatch: '#965ac8', target: [150, 90, 200] },
  { id: 'red',     name: 'Red',     swatch: '#b23a30', target: [178, 58, 48] },
];

/** RGB the iris should be painted, or null for the art's own colour. */
export function eyeColorTarget(id) {
  /* v2.3.1929: the same switch every other colour category answers to (the
     v2.3.1494 pattern -- skinTarget/hairColorTarget/hatColorTarget all open
     with this line).  Dropping the tab without it would hide the control while
     a previously-saved pick kept painting, which is the harder bug to see. */
  if (!recolorEnabled('eyes')) return null;
  const e = EYE_COLOR_CATALOG.find((c) => c.id === id);
  return (e && e.target) || null;
}

/* ── selection store (localStorage) ── */
const STORAGE_KEY = 'bt-eyecolor';
let _active = 'default';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved && EYE_COLOR_CATALOG.some((e) => e.id === saved)) _active = saved;
} catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }

const _listeners = new Set();

/** Currently selected eye colour id. */
export function getEyeColor() { return _active; }

/** Set the eye colour and persist it.  Notifies the renderer so it rebakes the
 *  body sheets on the next frame.  No-op if unchanged. */
export function setEyeColor(id) {
  if (id === _active) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach((fn) => { try { fn(id); } catch (e) { /* ignore */ } });
}

export function onEyeColorChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
