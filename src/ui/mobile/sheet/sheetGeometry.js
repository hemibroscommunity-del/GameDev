/* v2.3.1283: bottom-sheet geometry — the ONE source of truth for the
   band's snap heights, imported by BOTH BottomDashboard.jsx (the sheet)
   and BroTown.jsx (the canvas resize).  Replaces the comment-enforced
   "keep DASH_* in sync with --dash-h" mirror that had to be hand-edited
   in two files on every band change (v2.3.1268..1280 history).

   INVARIANT (nav-system spec): --dash-h / compactDashHeight stay the
   COMPACT height in all modes.  The expanded sheet is a taller
   position:fixed overlay above the world; the WebGL canvas, joystick
   zones (height: calc(100% - var(--dash-h))), and every
   bottom:calc(var(--dash-h)+N) world-HUD anchor NEVER move on expand.
   Expanding must not resize the canvas — a canvas.width write
   reallocates the WebGL drawing buffer. */

/* Compact height algebra (Bag 6x2 drives the band):
   slot s = (100vw - 56px) / 6   (5 inner gaps x8 + 2x8 edges = 56)
   band  = 2 rows + 1 gap + 8 top pad + 8 bottom pad + 72 toolbar shelf
         = 2s + 8 + 16 + 72 = (100vw - 56)/3 + 96 = 33.3333vw + 77.33
   -> rounded to 78.  CSS mirror: game.css --dash-h. */
export const DASH_W_FRAC = 1 / 3;
export const DASH_BASE = 78;
/* v2.3.1271: the band's 14px rounded top corners cut out to the page
   background; the canvas runs 14px UNDER the band so the notches show
   live world. */
export const DASH_OVERLAP = 14;
/* Player feet sit ~24px below the sprite center (matches the reel-touch
   anchor in BroTown's isReelTouch). */
export const FEET_OFFSET = 24;

export function compactDashHeight(vw) {
  return Math.round(vw * DASH_W_FRAC + DASH_BASE);
}

/* Expanded snap: ~half the viewport, with the sheet's top edge stopping
   ~90px below the player's feet (camera centers the player in the
   canvas area), clamped to the spec's 48-52% window. */
export function expandedSheetHeight(vw, vh) {
  const canvasH = vh - compactDashHeight(vw) + DASH_OVERLAP;
  const feetY = canvasH / 2 + FEET_OFFSET;
  const feetRule = vh - (feetY + 90);
  return Math.round(Math.max(vh * 0.48, Math.min(vh * 0.52, feetRule)));
}
