/* ═══ v2.3.5000: THE WALKING ARMOUR'S PIXELS, READ FROM ITS COLOUR NUMBERS ═══
 *
 * The owner, 2026-11-12: "Do armor and weapons as 256 color pictures."  Since
 * v2.3.4999 the walking armour is DRAWN from the `gearwalk` look set
 * (gearWalkFrame.js), but the masked bakes of the body under it (the worker:
 * maskedBakeWorker.js; inline: entityRenderer.js) and the page's own
 * fallbacks still read the chest's and the greaves' RGBA sheets on the CPU,
 * so gearSheets.js loaded them all behind the loading screen.  Here a frame
 * of the numbers is read instead:
 *   - for the WORKER, gearInput(tex) names the sheet and the frame's cell
 *     (the worker has the sheet's bytes, sent once: lookArmour.js
 *     lookSheetForWorker) and expands the cell there (lookExpand.js
 *     lookFrameRGBA), off the page's thread;
 *   - on the PAGE (no worker, QA's inline oracle, drawGearFrame), the frame
 *     expanded here, its sheet parsed once and its frames cached, both with a
 *     cap (the memory law).
 * The pixels are the bake's own 255 colours (lookSets/gearwalk.js: each
 * within 16 levels of the art, the mean under 4), with no roles (armour is
 * not recoloured): a row of nothing.
 */
import { lookSheetBytes } from './lookPalette.js';
import { lookSheetParse, lookFrameRGBA } from './lookExpand.js';

const ROW = new Uint8Array(256 * 4);   /* no roles: the table's own colours */
const SHEET_CAP = 4;                   /* parsed sheets kept on the page (fallbacks only) */
const FRAME_CAP = 24;                  /* expanded frames kept on the page */
const _sheets = new Map();
const _frames = new Map();
const _stats = { parsed: 0, expanded: 0 };

/** 'gearwalk/<sheet>' for a texture drawn from the walking armour's numbers,
 *  else null. */
export function gearNumbersKey(tex) {
  const s = tex && tex._source;
  if (!s || !s._btLook) return null;
  const m = /^bt-look:(gearwalk\/[A-Za-z0-9_-]+)$/.exec(String(s.label || ''));
  return m ? m[1] : null;
}

/** The worker's input for such a frame (as entityRenderer.js _frameInput's
 *  { bm, tx, ty, fw, fh, ow, oh }, with the sheet and its cell for the
 *  bitmap), or null for any other texture. */
export function gearInput(tex) {
  const key = gearNumbersKey(tex);
  if (!key) return null;
  const f = tex.frame, o = tex.orig || f, t = tex.trim;
  if (!f || !(f.width > 0) || !(f.height > 0)) return null;
  return {
    look: key, cell: { x: f.x, y: f.y, w: f.width, h: f.height },
    tx: t ? t.x : 0, ty: t ? t.y : 0, fw: f.width, fh: f.height, ow: o.width, oh: o.height,
  };
}

function sheetOf(key) {
  let s = _sheets.get(key);
  if (s) { _sheets.delete(key); _sheets.set(key, s); return s; }
  const [set, sheet] = key.split('/');
  const d = lookSheetBytes(set, sheet);
  if (!d) return null;
  try { s = lookSheetParse(d.bytes, d.w, d.rows, d.bits); } catch (e) { return null; }
  _stats.parsed++;
  _sheets.set(key, s);
  while (_sheets.size > SHEET_CAP) _sheets.delete(_sheets.keys().next().value);
  return s;
}

/** A canvas of the frame's own texels (its cell, straight RGBA) for the
 *  page's readers, or null. */
export function gearNumbersCanvas(tex) {
  const inp = gearInput(tex);
  if (!inp || typeof document === 'undefined') return null;
  const fk = inp.look + '@' + inp.cell.x + ',' + inp.cell.y + ',' + inp.cell.w + ',' + inp.cell.h;
  let c = _frames.get(fk);
  if (c) { _frames.delete(fk); _frames.set(fk, c); return c; }
  const s = sheetOf(inp.look);
  if (!s) return null;
  const { rgba } = lookFrameRGBA(s, inp.cell, ROW);
  c = document.createElement('canvas');
  c.width = inp.cell.w; c.height = inp.cell.h;
  c.getContext('2d').putImageData(new ImageData(rgba, inp.cell.w, inp.cell.h), 0, 0);
  _stats.expanded++;
  _frames.set(fk, c);
  while (_frames.size > FRAME_CAP) {
    const k = _frames.keys().next().value;
    const old = _frames.get(k);
    _frames.delete(k);
    try { old.width = 0; old.height = 0; } catch (e) { /* gone */ }
  }
  return c;
}

if (typeof window !== 'undefined') {
  window.__btGearNumbers = () => ({ ..._stats, sheets: _sheets.size, frames: _frames.size });
}
