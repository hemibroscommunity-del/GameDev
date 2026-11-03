/* ═══ v2.3.3972: WHERE THE "YOU DIED" STRIP GOES ═══
 * Directly under the top bar, across the whole play column (the owner: "should
 * span the entire top strip of the game screen").  The top bar
 * (.bt-zone-header) is itself the play column's width in every layout -- the
 * whole screen on an upright phone, the world's own width sideways and in a
 * computer's shell (game.css: `left: var(--world-x)`, `width: var(--play-w)`)
 * -- so its box is the strip's left, width and top: sized from the play
 * column, never the window (TRAPS sections 214, 232).  The strip is portalled
 * to document.body, so these window numbers are the ones `position: fixed`
 * measures from.  No top bar on screen: the play area's own box (.brotown-wrap).
 * Read while the strip shows, every 250 ms (DeathCard's clock): a turned
 * phone or a resized window moves it. */
export function deathStripPlace() {
  try {
    const bar = document.querySelector('.bt-zone-header');
    const b = bar ? bar.getBoundingClientRect() : null;
    if (b && b.width > 0 && b.height > 0 && getComputedStyle(bar).display !== 'none') {
      return { left: Math.round(b.left), top: Math.max(0, Math.round(b.bottom)), w: Math.round(b.width), at: 'bar' };
    }
    const wrap = document.querySelector('.brotown-wrap');
    const r = wrap ? wrap.getBoundingClientRect() : null;
    if (r && r.width > 0) return { left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), at: 'wrap' };
  } catch (e) { /* the window */ }
  return { left: 0, top: 0, w: (typeof window !== 'undefined' && window.innerWidth) || 390, at: 'window' };
}
