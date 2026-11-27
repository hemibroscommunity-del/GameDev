/* ═══ v2.3.6784: THE MENU'S PICTURE, AS BIG AS THE BAND LETS IT BE (card UI3-menus, reading 1) ═══
 *
 * The owner, 2026-11-26 (docs/design/UI_FEEDBACK_2026-11-26.md, part 4):
 * "Main menu. Keep the four-by-two layout. Enlarge the icons by approximately
 * 25%, reduce the button bevels and shadows, and use the same typography
 * across all navigation buttons."  And "without increasing the dashboard
 * height".  So the picture grows into the room the tile already has, never
 * the band: 46 x 1.25 = 58 upright, 28 x 1.25 = 35 sideways, and less where
 * the measured box cannot hold that.
 *
 * Pure, no import (finish.md part 5, rule 5): dash/MenuGrid.jsx hands it the
 * grid's OWN ResizeObserver entry (docs/specs/layout-reads.md, way 5: no new
 * layout read) and the grid's shape; tools/guards/menu-tile.test.mjs tests what
 * it does at the six shapes and a computer.
 *
 * The tile (src/ui/kit/ui2.css .u2-tile, read here, never restyled): its edge
 * 1 px a side (--ui2-size-edge), its padding PAD a side (MenuGrid sets 2: the
 * kit's 4 would leave 56 at 390 x 844), the gap between the picture and the
 * word 2 (--ui2-space-xs), the word's line 15 (13 px at line-height 1.15).
 */

export const MENU_GAP = 6;         /* between the tiles (MenuGrid's grid gap) */
export const MENU_TILE_PAD = 2;    /* the tile's padding a side, everywhere in MenuGrid */
const EDGE = 1;                    /* the raised edge a side */
const LABEL = 15;                  /* the word's line */
const INNER_GAP = 2;               /* between the picture and the word */
export const MENU_ART_CAP = Object.freeze({ upright: 58, sideways: 35 });
export const MENU_ART_BEFORE = Object.freeze({ upright: 46, sideways: 28 });   /* before the first entry: yesterday's */
const FLOOR = 16;                  /* a picture never vanishes in a box too small to be the band */

/**
 * box    { width, height } of the grid's content box (its ResizeObserver entry), or nothing yet
 * shape  { cols, rows, short }: menuGridShape's answer, and whether the page is the short (sideways) one
 * ->     the picture's side in whole px: the largest that fits the tile's room, capped
 */
export function menuTileArt(box, shape) {
  const s = shape || {};
  const short = !!s.short;
  const w = box && Number(box.width) > 0 ? Number(box.width) : 0;
  const h = box && Number(box.height) > 0 ? Number(box.height) : 0;
  if (!w || !h) return short ? MENU_ART_BEFORE.sideways : MENU_ART_BEFORE.upright;
  const cols = Math.max(1, s.cols | 0);
  const rows = Math.max(1, s.rows | 0);
  const tileW = (w - (cols - 1) * MENU_GAP) / cols;
  const tileH = (h - (rows - 1) * MENU_GAP) / rows;
  const roomW = tileW - 2 * MENU_TILE_PAD - 2 * EDGE;
  const roomH = tileH - 2 * MENU_TILE_PAD - 2 * EDGE - LABEL - INNER_GAP;
  const cap = short ? MENU_ART_CAP.sideways : MENU_ART_CAP.upright;
  /* floor, never round: a picture 1 px over its room is squashed by the tile's flex (TRAPS: the art's min-height 0) */
  return Math.max(FLOOR, Math.min(cap, Math.floor(Math.min(roomW, roomH))));
}
