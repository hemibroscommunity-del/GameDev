/* ═══ v2.3.3111: THE PET SHEET ═══
 * Plan: docs/PET-TRAPPING-PLAN.md, "Art and memory".  Every pet is drawn from
 * one small picture, public/sprites/pets/pet-sheet.png, made from the
 * monsters' own walk art by tools/make_pet_sheet.py (its layout:
 * src/data/petSheet.js, GENERATED).  It replaces the emoji pet: a 15 px emoji
 * (about 9 px on a phone at the Wheel's zoom) in outlined text, which is also
 * the known iPhone Safari crash (nodeLabels.js).
 *
 * GLOBAL, on the loading screen (preloadAnimations.js preloadWorldAnimations):
 * a pet goes everywhere you go, so there is no zone to scope it to.  768 x 448,
 * 1.31 MB decoded, ~0.3 MB on disk -- the plan's 1-3 MB.  Loaded as a plain
 * picture (Assets), never drawn onto a canvas, so it is not held twice.
 *
 * The frames are cut from the loaded texture's source on first ask and kept
 * (sub-textures share the one source: no memory each). */
import { Assets, Rectangle, Texture } from 'pixi.js';
import { PET_SHEET } from '../data/petSheet.js';

const URL = PET_SHEET.url + '?v=2.3.3111';
let _tex = null;
let _loading = null;
const _frames = Object.create(null);   /* base + ':' + dir -> Texture[] */

/** Load the sheet (the loading screen awaits this). */
export function loadPetSheet() {
  if (_tex) return Promise.resolve(_tex);
  if (_loading) return _loading;
  _loading = Assets.load(URL).then((t) => { _tex = t; return t; }).catch(() => { _loading = null; return null; });
  return _loading;
}

export function petSheetReady() { return !!(_tex && _tex.source && !_tex.destroyed); }

/** The frames of `base` facing `dir` ('front' | 'side'): Texture[], or [] when
 *  the sheet is not in (a pet is then not drawn -- never fetched on sight,
 *  the preloading LAW). */
export function petFrames(base, dir) {
  if (!petSheetReady()) return [];
  const b = Object.prototype.hasOwnProperty.call(PET_SHEET.bases, base) ? PET_SHEET.bases[base] : null;
  if (!b) return [];
  const want = dir === 'side' && b.side > 0 ? 'side' : 'front';
  const key = base + ':' + want;
  if (_frames[key]) return _frames[key];
  const C = PET_SHEET.cell;
  const n = want === 'side' ? b.side : b.front;
  const col0 = want === 'side' ? b.front : 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(new Texture({ source: _tex.source, frame: new Rectangle((col0 + i) * C, b.row * C, C, C) }));
  }
  _frames[key] = out;
  return out;
}

/** Which way a base's side frames face ('e' | 'w' | null). */
export function petSideFaces(base) {
  const b = Object.prototype.hasOwnProperty.call(PET_SHEET.bases, base) ? PET_SHEET.bases[base] : null;
  return b ? b.sideFaces : null;
}

/** The art's height in game px at size 1 (for the name over it). */
export function petArtHeight(base) {
  const b = Object.prototype.hasOwnProperty.call(PET_SHEET.bases, base) ? PET_SHEET.bases[base] : null;
  return b ? b.h : 30;
}
