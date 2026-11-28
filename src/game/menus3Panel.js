/* ═══ v2.3.6860: THE NEW MENUS' PANEL, ITS SHAPE BY DEVICE (card MN step 1) ═══
 *
 * The owner's menus (docs/design/menus3/SPEC.md, WIREFRAME.html, and the
 * card's "Decided" 1, docs/design/menus3/DECISIONS.md): ONE height for every
 * menu and counter -- upright, 48% of the screen, held to 318..410 px; on a
 * phone on its side AND on a computer, a drawer on the right, 40% wide, full
 * height, the fight controls left of it.  Upright the fight controls are
 * hidden while a panel is open.  This REVERSES the one band's heights
 * (src/ui/oneBand.js): the owner chose it; `?menus3=0` keeps the old band.
 *
 * Which shape is the device profile's question (src/game/deviceProfile.js
 * fineInput: a mouse is a computer): the caller hands in the window's size
 * and that answer, so node tests every device here.  The page draws the
 * same numbers as CSS (panelCss), so nothing measures the page to place it
 * (docs/specs/layout-reads.md).
 *
 * `worldShift` is the wireframe's camera move upright (its world slides up
 * 14% while the panel is open, v4.4 `.game.open svg.world`).  Step 1 does
 * NOT apply it: no rebuilt section opens the panel yet, and the world's
 * drawing is the renderer's (card MN "What NEVER changes"); the step that
 * first fills the panel asks first.  No imports: node's suite reads this. */

export const MENUS3_PANEL = Object.freeze({
  MIN_H: 318,          /* upright: never shorter (px) */
  MAX_H: 410,          /* upright: never taller (px) */
  UP_SHARE: 0.48,      /* upright: of the screen's height */
  DRAWER_SHARE: 0.40,  /* sideways and a computer: of the screen's width */
  WORLD_SHIFT: 0.14,   /* upright: the wireframe's camera move (applied from step 4, v2.3.6861) */
});

/** 'upright' or 'drawer'.  A computer (a mouse) is always the drawer; a
 *  touch screen wider than tall is the drawer; anything else upright. */
export function menus3Shape(w, h, fine) {
  if (fine) return 'drawer';
  return Number(w) > Number(h) ? 'drawer' : 'upright';
}

/** The panel's box for a screen `w` x `h` (px) above a dock `dockH` px tall:
 *  { shape, w, h, right, bottom, controls, worldShift }.  `controls` is what
 *  the fight controls do while it is open: 'hidden' upright, 'left' (they
 *  stay, left of the drawer) otherwise. */
export function menus3Panel(w, h, fine, dockH) {
  const W = Math.max(0, Number(w) || 0), H = Math.max(0, Number(h) || 0);
  const dock = Math.max(0, Number(dockH) || 0);
  const shape = menus3Shape(W, H, fine);
  if (shape === 'upright') {
    const ph = Math.round(Math.min(MENUS3_PANEL.MAX_H, Math.max(MENUS3_PANEL.MIN_H, H * MENUS3_PANEL.UP_SHARE)));
    return { shape, w: W, h: ph, right: 0, bottom: dock, controls: 'hidden', worldShift: MENUS3_PANEL.WORLD_SHIFT };
  }
  return { shape, w: Math.round(W * MENUS3_PANEL.DRAWER_SHARE), h: Math.max(0, H - dock), right: 0, bottom: dock, controls: 'left', worldShift: 0 };
}

/** The same box as CSS, for the page (no measuring): the height's clamp
 *  upright, the drawer's share sideways. */
export function panelCss(shape) {
  const P = MENUS3_PANEL;
  if (shape === 'upright') {
    return { left: 0, right: 0, bottom: 0, width: 'auto', height: `clamp(${P.MIN_H}px, ${Math.round(P.UP_SHARE * 100)}vh, ${P.MAX_H}px)` };
  }
  return { top: 0, right: 0, bottom: 0, width: `${Math.round(P.DRAWER_SHARE * 100)}%`, height: 'auto' };
}

/** v2.3.6861 (card MN step 4): the camera's move while the panel is open, in
 *  the world's px for a world `H` tall: upright the wireframe's 14% (v4.4
 *  `.game.open svg.world{transform:translateY(-14%)}`), the bro drawn that
 *  much higher so he stays in view above the panel; the drawer none (the
 *  world beside it is whole).  A SHIFT only: never the world's scale.  Whole
 *  px; the renderer puts the camera on whole device pixels (TRAPS §231). */
export function menus3CamOffset(open, shape, H) {
  if (!open || shape !== 'upright') return 0;
  return Math.round(Math.max(0, Number(H) || 0) * MENUS3_PANEL.WORLD_SHIFT);
}
