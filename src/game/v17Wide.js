/* ═══ v2.3.6842: A COMPUTER'S OPEN BAND, 840 WIDE (card UI4, PR 3: the owner's V17 handoff) ═══
 *
 * The owner's V17 specification (2026-11-27, docs/design/v17/
 * MASTER-IMPLEMENTATION.md part 2, its table's Desktop row): "1440 x 900 |
 * 840 x 243 centered | 52 | 840 x 191 | 828 x 179", and "In desktop use
 * extra horizontal space for additional entries, not larger art, text or
 * gameplay view".  The game's centred block (the nav row, an open page and
 * the resting columns: sheetGeometry BAND_ASSEMBLY_MAX_W, stamped as
 * --band-max-w for game.css [data-band-box]) was 840 until v2.3.4243 and 480
 * since (the owner at a computer, 2026-11-05: "Simply make the container
 * areas smaller (like they appear on mobile) they don't need a bunch of extra
 * dark space to make them appear wider").  V17 is the newer word; it goes on
 * with its switch, and the two words are the owner's to weigh (card UI4's
 * flag Q9): this module only says which width the block is.
 *
 * What it changes, and what it never does:
 *   - the block's WIDTH only, and only where the band is wider than it (a
 *     computer, a tablet: a phone's band is its own screen's width, under
 *     both numbers, so a phone draws nothing new);
 *   - never the band's height (barHeight), the closed band, the header, the
 *     world's width or scale, or the camera (none of them reads this
 *     number: the world's width is bandFootprint's, the camera worldViewport
 *     and viewCap's, from the canvas);
 *   - the room is used by the pages' own layouts, which already lay out from
 *     the box they get (oneBandLayout, the grids' auto-fill columns): MORE
 *     entries a row, the type and the pictures their phone sizes.
 *
 * The switch: `?v17wide=0` gives 480 on this device and is remembered
 * (bt_v17wide '0'); `?v17wide=1` forgets; on otherwise (CLAUDE.md section 7:
 * a trial the owner likes is everyone's default, with its switch).  Read
 * once, when sheetGeometry is loaded (before the first layout: the block's
 * width is a constant of the page's visit, as it was).
 * The rule is held by tools/guards/v17-wide.test.mjs.
 * No imports but the switch reader: node tests it.
 */
import { readerFor, swValue } from './switches.js';

/* the two widths: V17's, and the owner's of 2026-11-05 (v2.3.4243) */
export const V17_WIDE_W = 840;
export const BAND_NARROW_W = 480;

/* the switch's memory on this device (`?v17wide=0` remembered; `?v17wide=1` forgets) */
export const V17_WIDE_KEY = 'bt_v17wide';

/** Is V17's wide block wanted on this device?  `search` and `store` are for
 *  tests; the page's address is read through the one reader (switches.js). */
export function v17WideWanted(search, store) {
  const v = search == null ? swValue('v17wide') : readerFor(search).swValue('v17wide');
  let ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  if (v === '0' || v === '1') {
    try { if (ls) { if (v === '0') ls.setItem(V17_WIDE_KEY, '0'); else ls.removeItem(V17_WIDE_KEY); } } catch (e) { /* the address still decides this visit */ }
    return v === '1';
  }
  try { return !(ls && ls.getItem(V17_WIDE_KEY) === '0'); } catch (e) { return true; }
}

/** The block's width for this answer: 840 on, 480 off. */
export function bandBlockW(on) {
  return on ? V17_WIDE_W : BAND_NARROW_W;
}
