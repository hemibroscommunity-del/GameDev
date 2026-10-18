/* ═══ v2.3.3470: WHERE `position: fixed` PUTS 0,0 ═══
 *
 * Everything drawn over the game is `position: fixed`, and on a phone that
 * measures from the window: the corner getBoundingClientRect reads in, so a
 * control's rect can be used as it comes.  On a computer it cannot.  #root has
 * contain:paint there (game.css v2.3.1768: the game as a column between black
 * bars), and that makes #root the box every fixed child measures from -- so a
 * rect placed as it comes lands the column's left edge too far right.  Found
 * three times in one round (TRAPS §232): the bag flight, the XP label, and the
 * quest coach's ring (on a 1280 x 800 window "Tap OPEN" was rung at x 840, the
 * button at 426, past the column's right edge where its paint box cut it off).
 *
 * fixedBox(layer) is the box, in the window's numbers, that a fixed layer's
 * absolute children are placed in: the layer's own when it is laid out (a
 * `position: fixed; inset: 0` layer IS that box), else #root's -- the same box
 * for an overlay that is #root's, and laid out while game.css hides the layer
 * (display:none measures 0 x 0) or before it is up -- else the window's.  Take
 * x/y off a rect before placing it in the layer; h is the layer's height, for
 * anything measured from its bottom.  On a phone it is the window: 0, 0. */
export function fixedBox(layer) {
  try {
    const lb = layer && layer.getBoundingClientRect ? layer.getBoundingClientRect() : null;
    if (lb && lb.width > 0 && lb.height > 0) return { x: lb.left, y: lb.top, w: lb.width, h: lb.height };
    const root = typeof document !== 'undefined' ? document.getElementById('root') : null;
    const rb = root && root.getBoundingClientRect();
    if (rb && rb.width > 0 && rb.height > 0) return { x: rb.left, y: rb.top, w: rb.width, h: rb.height };
  } catch (_e) { /* the window's own corner */ }
  const w = typeof window !== 'undefined' ? window : null;
  return { x: 0, y: 0, w: (w && w.innerWidth) || 0, h: (w && w.innerHeight) || 0 };
}
