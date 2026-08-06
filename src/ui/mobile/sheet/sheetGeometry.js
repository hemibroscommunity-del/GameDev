/* v2.3.1283: bottom-sheet geometry — the ONE source of truth for the
   band's snap heights, imported by BOTH BottomDashboard.jsx (the sheet)
   and BroTown.jsx (the canvas resize).  Replaces the comment-enforced
   "keep DASH_* in sync with --dash-h" mirror that had to be hand-edited
   in two files on every band change (v2.3.1268..1280 history).

   v2.3.1290 (owner: three-state nav): the resting default is now BAR —
   toolbar only, maximum world visibility.
   v2.3.1350 (owner: bar + expanded ONLY): the compact glance snap is
   retired (compactDashHeight deleted with it).  Two snap heights:
     bar      = barHeight(vw,vh) (slot-sized shelf) <- resting state
     expanded = expandedSheetHeight(vw, vh)        <- detail view

   INVARIANT (nav-system spec, amended v2.3.1290): --dash-h /
   barHeight stay the BAR height in ALL modes.  Expanded is a taller
   position:fixed overlay above the world; the WebGL canvas, joystick
   zones (height: calc(100% - var(--dash-h))), and every
   bottom:calc(var(--dash-h)+N) world-HUD anchor NEVER move when a
   sheet opens.  Opening a sheet must not resize the canvas — a
   canvas.width write reallocates the WebGL drawing buffer.

   v2.3.1560: the bar is now TWO stacked persistent rows —
     --dash-h = navShelfHeight + quickRowHeight   (the whole band)
     --nav-h  = navShelfHeight                    (the toolbar ribbon)
   The invariant above is unchanged: --dash-h is still the BAR height in
   all modes and still the one number the canvas/zones/HUD read.  --nav-h
   exists only for chrome pinned INSIDE the band (the ribbon, and the
   reserve under an open panel) and must not be substituted for --dash-h
   anywhere outside BottomDashboard.

   v2.3.1635 (owner "option C"): THREE stacked persistent rows —
     --dash-h  = identityRowHeight + <middle row> + navShelfHeight
     --cols-h  = the middle row's own height
     --nav-h   = navShelfHeight     (the toolbar ribbon)
   --cols-h joins for the same reason --nav-h did: the middle row sized
   itself as calc(--dash-h - --nav-h), which was exact while the band had
   two rows and silently became "middle + identity" once it had three.
   Each pinned row is told its own height; none of them derives another's.
   The BAR-height invariant above is unchanged.

   v2.3.1636 (owner reference shot): the middle row is now the
   three-column BAG / EQUIPPED / COMBAT block (columnsRowHeight); the
   nine-cell quick bar it replaced is gone.  The var was --quick-h
   through v2.3.1635 and is --cols-h from here — renamed rather than
   reused so a stale stylesheet cannot silently size the new row with the
   old row's number. */

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
/* v2.3.1560: the toolbar SHELF — what barHeight was through v2.3.1559.
   Split out because the bar is now two stacked rows and the ribbon is
   absolute-pinned to the band's bottom: it must be told its own height,
   not the whole band's, or it would cover the quick bar above it. */
export function navShelfHeight(vw, vh) {
  return navSlotSize(vw, vh) + 31;
}

/* v2.3.1636 (owner, with a reference shot of the pre-v2.3.1287 band):
   the THREE-COLUMN ROW — BAG / EQUIPPED / COMBAT — replaces the
   v2.3.1560 nine-cell quick bar in the same slot (quickCellSize and
   quickRowHeight retired with it; their algebra is in git history).

   EVEN THIRDS is the owner's explicit correction to the original, and it
   is why the tile size derives from a column's width rather than each
   column sizing its own tiles: one third of the row, minus that column's
   padding, minus the two gaps between its three tiles.
     column = (vw - 16 frame pad - 2 gaps x 6) / 3
     tile   = round(clamp((column - 12 col pad - 8 tile gaps) / 3, 22..34))
   ~34px tiles at 390w.

   The row's height is set by its TALLEST column, which is COMBAT: two
   rows of (tile + an 11px level line) with a 4px gap, versus EQUIPPED's
   DMG/DPS line + two bare tile rows.  Sizing to anything else clips one
   column and leaves the other two floating in dead space.
     header strip 17 + body pad 10 + 2 x (tile + 11) + 4 row gap
     + frame pad 8/10 + 2 border at the 1px non-retina worst case
   ~133px at 390x844.  Tiles are under the 44pt touch minimum for the
   same reason the quick bar's were — eighteen of them cannot be 44 wide
   on a 390px phone — and the same mitigation applies: every tile has a
   full-size counterpart one tap away in Bag/Hero. */
export function dashTileSize(vw) {
  const column = (vw - 16 - 12) / 3;
  return Math.round(Math.min(Math.max((column - 20) / 3, 22), 34));
}
export function columnsRowHeight(vw, vh) {
  const tile = dashTileSize(vw);
  return Math.round(17 + 10 + 2 * (tile + 11) + 4 + (vh && vh <= 720 ? 8 : 10) + 2);
}

/* v2.3.1635 (owner: bring back a persistent sense of identity and
   progress, "option C"): the IDENTITY ROW — the third persistent row,
   stacked above the quick bar.  One row carrying portrait, name, level,
   exact XP-to-next, unspent build points, active weapon and gold.
   Height is the 40px portrait IdentityStrip already renders (it is
   shared with Hero compact/expanded and must stay pixel-identical
   there) plus 5/6 padding and the 1px bottom hairline.
   SHORT VIEWPORTS get the tighter pad for the same reason navSlotSize
   and dashTileSize carry caps: an SE-class phone has to keep its world
   view, and this row is the third thing competing for it. */
export function identityRowHeight(vw, vh) {
  return 40 + (vh && vh <= 720 ? 8 : 12);
}

/* The BAND height every consumer keys off (canvas, joystick zones, world
   HUD anchors) — all three rows, since all three are persistent chrome.
   v2.3.1635: identity row joins.  187px at 390x844 (was 135: 87 shelf +
   48 quick).  NB 87 is --nav-h, the ribbon ALONE — not the band.
   v2.3.1636: the columns row replaces the quick row in the same slot —
   ~272px at 390x844 (52 identity + 133 columns + 87 shelf), 32% of the
   screen.  That is the owner's chosen trade, made with both this and the
   187px one-row version rendered to scale: the columns are the ask, and
   the identity row stays because no column carries name/level/XP/gold. */
export function barHeight(vw, vh) {
  return identityRowHeight(vw, vh) + columnsRowHeight(vw, vh) + navShelfHeight(vw, vh);
}
/* v2.3.1271: the band's 14px rounded top corners cut out to the page
   background; the canvas runs 14px UNDER the band so the notches show
   live world. */
export const DASH_OVERLAP = 14;
/* Player feet sit ~24px below the sprite center (matches the reel-touch
   anchor in BroTown's isReelTouch). */
export const FEET_OFFSET = 24;

/* v2.3.1350: compactDashHeight retired with the compact snap (its
   6x2-slot algebra lives in git history at v2.3.1320/1325). */

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
  /* v2.3.1352 (owner: fit a third bag row without shrinking anything):
     ground allowance 44 -> 36px — still inside the owner's original
     "leave ~32-48px of visible ground" band (v2.3.1311), and the extra
     8px goes to every root sheet's content. */
  const feetRule = vh - (feetY + 36);
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
