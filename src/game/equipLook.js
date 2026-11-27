/* ═══ v2.3.6698: THE EQUIPPED PANEL'S LOOK: A PALE GREEN GROUND, ITS PICTURES FILLING THEIR SLOTS (card UI2-equipgreen) ═══
 *
 * The owner, 2026-11-27, playing on an iPhone: "Also on equipped page might
 * the background color a pale green color and make the thumbnail icons fill
 * each slot better like the inventory icons do".
 *
 * ON by default; `?equiplook=0` gives yesterday's Equipped panel (the kit's
 * dark well behind it, a worn picture 72% of its slot).  Read once a page
 * (the look does not change under a player's thumb), through the page's one
 * reader of its switches (switches.js).  What the look IS lives in the style
 * sheet (src/ui/mobile/dash/gearPanels.css, the token --u2-gp-equip-ground);
 * its numbers are here so the guard (tools/guards/equip-look.test.mjs) and
 * the phone test (mp-equipgreen) hold the same ones.
 *
 * No imports but the switch reader: node tests it. */
import { sw } from './switches.js';

/* a bag cell's picture is 94% of its cell (dash/InventoryPanel.jsx BagTile: "the new item art fills the
   slot"); a worn cell's was the kit's 72% (ui2.css .u2-slot-art) */
export const EQUIP_FILL = 0.94;
export const EQUIP_FILL_WAS = 0.72;
/* the words on the green: at least this contrast (WCAG AA for body text) */
export const EQUIP_MIN_CONTRAST = 4.5;

let _on = null;
/** true: the new look (the green ground, the pictures at 94%). */
export function equipLookOn() {
  if (_on === null) _on = !sw('equiplook');
  return _on;
}
/** tests only: forget the read */
export function _resetEquipLook() { _on = null; }
