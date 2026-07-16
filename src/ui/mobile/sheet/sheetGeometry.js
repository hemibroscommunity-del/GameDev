/* v2.3.1283: bottom-sheet geometry — the ONE source of truth for the
   band's snap heights, imported by BOTH BottomDashboard.jsx (the sheet)
   and BroTown.jsx (the canvas resize).  Replaces the comment-enforced
   "keep DASH_* in sync with --dash-h" mirror that had to be hand-edited
   in two files on every band change (v2.3.1268..1280 history).

   v2.3.1290 (owner: three-state nav): the resting default is now BAR —
   toolbar only, maximum world visibility.  Three snap heights:
     bar      = barHeight(vw,vh) (slot-sized shelf) <- NEW resting state
     compact  = compactDashHeight(vw)              <- glance view
     expanded = expandedSheetHeight(vw, vh)        <- detail view

   INVARIANT (nav-system spec, amended v2.3.1290): --dash-h /
   barHeight stay the BAR height in ALL modes.  Compact and expanded are
   both taller position:fixed overlays above the world; the WebGL
   canvas, joystick zones (height: calc(100% - var(--dash-h))), and
   every bottom:calc(var(--dash-h)+N) world-HUD anchor NEVER move when
   a sheet opens.  Opening a sheet must not resize the canvas — a
   canvas.width write reallocates the WebGL drawing buffer. */

/* v2.3.1325 (owner: bigger toolbar): the bar height derives from the
   compact bag grid's slot algebra instead of the old fixed 72, giving
   each toolbar button a slot-tall touch target.
   v2.3.1326 (owner correction): the icons went back to the classic
   30px + label INSIDE those bigger buttons — the slot-derived shelf
   height below is what "buttons bigger" means and it stays.
     slot n = round(clamp((vw - 56)/6, 40..64))   (50 cap on short
              viewports so an SE-class phone keeps its world view)
     bar    = n + 31  (15 frame pad 8/7 + 8+2 ribbon pad/border +
              4+2 button pad/border, borders at their 1px non-retina
              worst case so the icon never clips)
   ~87px at 390w (was 72).  BroTown's resize() stamps --nav-slot and
   --dash-h on :root every viewport change, so every CSS consumer
   (joystick zones, world HUD anchors) and the canvas math read ONE
   JS-rounded whole-px value — game.css only carries boot fallbacks. */
export function navSlotSize(vw, vh) {
  const cap = vh && vh <= 720 ? 50 : 64;
  return Math.round(Math.min(Math.max((vw - 56) / 6, 40), cap));
}
export function barHeight(vw, vh) {
  return navSlotSize(vw, vh) + 31;
}
/* v2.3.1271: the band's 14px rounded top corners cut out to the page
   background; the canvas runs 14px UNDER the band so the notches show
   live world. */
export const DASH_OVERLAP = 14;
/* Player feet sit ~24px below the sprite center (matches the reel-touch
   anchor in BroTown's isReelTouch). */
export const FEET_OFFSET = 24;

/* Compact snap algebra (Bag 6x2 drives it):
   v2.3.1320 (owner: language-free — the v2.3.1319 text rails became
   per-tile worn badges, so the rail column is gone and the grids get
   their full width back):
   slot s = (100vw - 16 edge*2 - 40 gaps) / 6 = (100vw - 56)/6
   sheet = 8 pad + s + 15 separator (7+1+7) + s + 8 pad + toolbar
         = 2s + 31 + barHeight   (v2.3.1325: the toolbar term is the
   slot-derived bar height above, no longer a fixed 72). */
export function compactDashHeight(vw, vh) {
  return Math.round((vw - 56) / 3 + 31) + barHeight(vw, vh);
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
   kept.  The canvas itself never resizes (BAR_H invariant above).
   (v2.3.1317 merge: #288's 44px rule supersedes this branch's
   equivalent round-8 40px/42-48% version — same intent, later owner
   directive wins.) */
export function expandedSheetHeight(vw, vh) {
  const canvasH = vh - barHeight(vw, vh) + DASH_OVERLAP;
  const feetY = canvasH / 2 + FEET_OFFSET;
  const feetRule = vh - (feetY + 44);
  return Math.round(Math.min(vh * 0.52, Math.max(vh * 0.40, feetRule)));
}

/* v2.3.1311e (owner: the T2 spend screen's 5 categories must fit one
   screen): DRILL panels (stack depth > 1 — T2 spend, Settings, quest
   detail) get the taller pre-v2.3.1311 56vh sheet.  The 44px-ground
   feet rule above exists so the character stays visible behind ROOT
   destination sheets; a drill is a focused task where content beats
   world visibility.  The band animates between the two heights on
   push/pop, which doubles as a depth cue. */
export function drillSheetHeight(vw, vh) {
  return Math.round(vh * 0.56);
}
