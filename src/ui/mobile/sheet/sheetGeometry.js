/* v2.3.1283: bottom-sheet geometry — the ONE source of truth for the
   band's snap heights, imported by BOTH BottomDashboard.jsx (the sheet)
   and BroTown.jsx (the canvas resize).  Replaces the comment-enforced
   "keep DASH_* in sync with --dash-h" mirror that had to be hand-edited
   in two files on every band change (v2.3.1268..1280 history).

   v2.3.1290 (owner: three-state nav): the resting default is now BAR —
   toolbar only, maximum world visibility.  Three snap heights:
     bar      = BAR_H (72, the toolbar shelf)      <- NEW resting state
     compact  = compactDashHeight(vw)              <- glance view
     expanded = expandedSheetHeight(vw, vh)        <- detail view

   INVARIANT (nav-system spec, amended v2.3.1290): --dash-h /
   BAR_H stay the BAR height in ALL modes.  Compact and expanded are
   both taller position:fixed overlays above the world; the WebGL
   canvas, joystick zones (height: calc(100% - var(--dash-h))), and
   every bottom:calc(var(--dash-h)+N) world-HUD anchor NEVER move when
   a sheet opens.  Opening a sheet must not resize the canvas — a
   canvas.width write reallocates the WebGL drawing buffer. */

/* The toolbar shelf (v2.3.1258: 72 = 68 ribbon + 4 breathing room).
   CSS mirror: game.css --dash-h. */
export const BAR_H = 72;
/* v2.3.1271: the band's 14px rounded top corners cut out to the page
   background; the canvas runs 14px UNDER the band so the notches show
   live world. */
export const DASH_OVERLAP = 14;
/* Player feet sit ~24px below the sprite center (matches the reel-touch
   anchor in BroTown's isReelTouch). */
export const FEET_OFFSET = 24;

/* Compact snap algebra (Bag 6x2 drives it):
   slot s = (100vw - 56px) / 6   (5 inner gaps x8 + 2x8 edges = 56)
   sheet = 2 rows + 1 gap + 8 top pad + 8 bottom pad + 72 toolbar shelf
         = 2s + 8 + 16 + 72 = (100vw - 56)/3 + 96 = 33.3333vw + 77.33
   -> rounded to 78.  (v2.3.1290: no longer the --dash-h value — this is
   the sheet's COMPACT overlay height only.) */
export const DASH_W_FRAC = 1 / 3;
export const DASH_BASE = 78;

export function compactDashHeight(vw) {
  return Math.round(vw * DASH_W_FRAC + DASH_BASE);
}

/* Expanded snap: ~half the viewport, with the sheet's top edge leaving
   visible GROUND below the player's boots (camera centers the player
   in the canvas area).
   v2.3.1311 (owner Hero spec: "expanded begins almost directly beneath
   the boots — leave ~32-48px of visible ground"): the old
   max(48%vh, ...) FLOOR overrode the feet rule on tall phones — on a
   390x844 viewport it pushed the sheet top to ~22px below the feet.
   The feet rule now wins: sheet top = feetY + 44px of ground, with the
   floor lowered to 40%vh (short-viewport backstop) and the 52% cap
   kept.  The canvas itself never resizes (BAR_H invariant above). */
export function expandedSheetHeight(vw, vh) {
  const canvasH = vh - BAR_H + DASH_OVERLAP;
  const feetY = canvasH / 2 + FEET_OFFSET;
  const feetRule = vh - (feetY + 44);
  return Math.round(Math.min(vh * 0.52, Math.max(vh * 0.40, feetRule)));
}
