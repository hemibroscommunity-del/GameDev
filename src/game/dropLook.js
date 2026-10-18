/* ═══ v2.3.3473: WHAT A DROPPED ITEM LOOKS LIKE ON THE GROUND ═══
 *
 * A drop (game/itemDrop.js) is drawn as its own bag picture.  The bag's
 * lookup lives in the bag (ui/mobile/dash/InventoryPanel.jsx `thumbFor`),
 * which imports the renderer's modules -- so the renderer cannot import it
 * back without a loop.  The bag hands its lookup over here instead
 * (setDropThumbs, at its module's load), and the renderer asks dropThumb().
 *
 * NO IMPORTS, on purpose: a module that imports nothing is evaluated before
 * anything that imports it, so `thumb` is always set up before the bag's call
 * reaches it, whatever order the rest of the app loads in.
 */
let thumb = null;

export function setDropThumbs(fn) {
  thumb = typeof fn === 'function' ? fn : null;
}

/* the bag picture's address for an inventory key, or null (none, or the bag
   has not loaded yet: the renderer draws a stand-in until it has) */
export function dropThumb(key) {
  if (!thumb || typeof key !== 'string' || !key) return null;
  try { return thumb(key) || null; } catch (e) { return null; }
}
