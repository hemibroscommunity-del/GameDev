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
/* v2.3.1640 (owner: "make the spacing for all of the slots even padding
   between the container's edge and between each slot square"): ONE gap
   value, used for every gap on the row — the frame's own left/right
   padding, the space between the three panels, each panel's inner
   padding, and the space between squares.  Nothing on this row may use
   any other number.

   That makes the geometry solvable rather than approximate.  Across a
   panel: pad + tile + gap + tile + gap + tile + pad, so four G and three
   tiles fill its inner width exactly.  Down it: pad + tile + gap + tile +
   pad, so three G and two tiles ARE the panel's height — not a minimum it
   floats inside.  FLOOR the tile: rounding up overflows the panel and the
   outer squares clip against overflow:hidden (the v2.3.1637 bug). */
export const DASH_GAP = 4;

export function dashTileSize(vw) {
  const column = (vw - 4 * DASH_GAP) / 3;
  return Math.floor(Math.min(Math.max((column - 2 - 4 * DASH_GAP) / 3, 18), 40));
}

/* v2.3.1640: the columns row is EXACTLY its content now — two tile rows,
   three gaps, the panel border and the frame's own vertical padding.  It
   is no longer max(content, whatever the rail needs), because that max
   was what put slack inside the panels: the rail demanded a taller band
   than two rows of width-limited squares fill, and the surplus had to go
   somewhere.  The dependency is inverted below — the SLOTS set the band
   and the rail sizes itself to fit, which is the only arrangement where
   "even padding" can be exactly true rather than nearly. */
/* v2.3.1640b: the panel's width is an EXACT integer — border + four gaps
   + three whole tiles — instead of a 1fr third.  With 1fr the column came
   out fractional (112.7 at 390w), the floored tile left ~1.7px over, and
   centring split it onto the two OUTER edges: measured 4.8 / 4 / 4 / 4.8,
   edges 20% wider than the gaps between squares.  Pinning the width moves
   that remainder out to the row's own margins, where it is one shared
   number rather than a visible asymmetry inside every panel. */
export function dashColumnWidth(vw) {
  return 2 + 4 * DASH_GAP + 3 * dashTileSize(vw);
}

/* v2.3.1647 (owner: "increase the size of the dashboard by about 50% of
   the space between its current height and the joysticks area ... the
   exact height can be determined by whatever slot spacing that could use
   the extra room makes the most sense"): THREE tile rows, not two.

   The 50% is a real measurement, not a guess.  The joystick disc anchors
   at calc(var(--dash-h) + 70px) (TouchControls), so the clear gap between
   the band's top edge and the disc is a fixed 70px that rides with the
   band — half of it is 35, putting the target at 145 + 35 = ~180.

   A third ROW is the only thing that can spend it.  The tile is capped by
   WIDTH — three across a 124.7px column at 390w is 35px and no larger —
   so extra height cannot make the squares bigger, only add another line
   of them.  Three rows lands at 132 (band 184), 4px past the target and
   the nearest height where the spacing still works out exactly.

   ROWS ARE PER-PANEL, though.  Only BAG has more to show: EQUIPPED has
   exactly six worn slots and COMBAT exactly six parents, so a third row
   there would be three empty squares reading as "slots you have not
   filled" and "skills you have not found" — both false.  Those two centre
   their six in the taller panel instead; see DashColumns. */
export const DASH_ROWS = 3;

export function columnsRowHeight(vw) {
  /* +1 for the ROW's own bottom hairline.  The row is box-sizing:border-box
     at height:100% of this number, so that 1px rule comes out of the
     content box — measured as 3.5 / 4 / 3.5 vertically (the half-pixels
     being the shortfall split by centring) until it was accounted for. */
  return DASH_ROWS * dashTileSize(vw) + (DASH_ROWS + 1) * DASH_GAP + 2 + 2 * DASH_GAP + 1;
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

/* v2.3.1637 (owner mockup): the NAV RAIL — the six destinations leave the
   full-width bottom ribbon and become icon-only buttons stacked down the
   band's LEFT edge, plus one at the top for the dashboard itself ("it
   should be a new icon that represent a dashboard").
   v2.3.1637b (owner: "the hero can just be pressing on the icon of the
   hero up top, doesn't need its own button on that side"): SIX buttons,
   not seven — Hero moved onto the identity row's portrait, and the
   height that freed went to the five destinations that stayed.  The rail spans
   the WHOLE band height, so the identity row and the columns row both
   start to its right.

   Owner on the width: "just the size of the icons" — the rail is sized by
   its icon and nothing else, not as an equal fourth column.  Buttons are
   rail-WIDE and short: a 48x28 target is far easier to hit than the 28x28
   a square button would give, and seven square ones could not fit the
   band at any usable size.

   The rail is why the band cannot simply shrink by the ribbon's 87px.
   Six buttons still need vertical room, so the band's floor is whichever
   is taller: what the three columns need, or what the rail needs. */
export const RAIL_COUNT = 3;
const NAV_GAP = 4;

/* v2.3.1642 (owner: "put the rail buttons on the top to the left of the
   character in its own little section up there"): the LEFT RAIL becomes a
   top-left NAV GROUP — three buttons in a row, in their own bordered
   section, with the identity strip beside them.

   The band's left edge is free again, so the three slot panels span the
   full width and the squares grow from 31px to 35 — the rail was the
   binding constraint on tile width from v2.3.1637 onward.

   IT STILL PERSISTS THROUGH AN OPEN PANEL, and that is not decoration.
   The rail replaced a toolbar ribbon that stayed visible under an
   expanded sheet because it was the only way to switch destination or
   get out; moving navigation into the identity row — which HIDES when a
   panel opens — would have restored that trap.  The group is rendered
   separately from the strip for exactly this reason: the strip hides,
   the group does not, and it holds the same screen position in both
   modes so nothing moves under the thumb (the v2.3.1637b rule). */
export function navButtonSize(vw, vh) {
  /* v2.3.1642b: 0.068 -> 0.063 of the viewport (27 -> 25 at 390w).  With
     27 the identity strip's last element — gold — still ended 5px past
     the right edge, measured; three buttons two pixels narrower is the
     cheapest place to find it, and 25x44 stays a bigger target than the
     24x40 the vertical rail had. */
  /* v2.3.1644 (owner: "make the buttons fill in the extra space", after
     the XP bar halved and DMG left the row): 0.063 -> 0.097 of the
     viewport, 25 -> 38 at 390w.  Balanced against what the strip still
     needs — portrait 40, the DPS chip ~60, gold ~46 and a readable
     name/XP column — rather than let flex take it all: at 58 wide
     (measured) the buttons crushed that column to 25px. */
  const w = Math.round(Math.min(Math.max(vw * 0.097, 30), 48));
  return { w, h: identityRowHeight(vw, vh) - 2 * NAV_GAP };
}
export function navGroupWidth(vw, vh) {
  return navButtonSize(vw, vh).w * RAIL_COUNT + NAV_GAP * (RAIL_COUNT - 1) + 2 * NAV_GAP + 2;
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
  /* v2.3.1637: the toolbar ribbon is GONE — its six destinations moved
     into the left rail, which runs beside these two rows rather than
     under them and so adds no height of its own.  230px at 390x844
     (52 identity + 178 columns), down from 272.  navShelfHeight and
     navSlotSize stay exported: the ribbon's buttons are retired but the
     slot algebra is still the compact bag grid's. */
  return identityRowHeight(vw, vh) + columnsRowHeight(vw);
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
/* v2.3.1638 (owner: "shorten the expanded view to be the exact same size
   as the default dashboard view"): expanded IS the bar height now.  The
   v2.3.1311 feet rule (sheet top ~36px below the boots) and the 40/52%vh
   clamp are retired — the band no longer grows at all, in any mode.

   This makes the BAR-height invariant above trivially true rather than
   carefully maintained: --dash-h was already pinned to barHeight in every
   mode, and now the sheet's own height matches it, so nothing about the
   band moves when a panel opens.  The world you can see never shrinks.

   THE COST, stated plainly: a panel gets ~177px of height at 390x844
   instead of ~439.  Every destination has to scroll inside that, and the
   T2 spend screen's "five categories on one screen" goal (v2.3.1311e) is
   no longer reachable — drillSheetHeight matches too, because a drill
   that grew to 56vh while its parent stayed at 177 would be the exact
   band-resize jump this change exists to remove. */
/* v2.3.1638 (owner: "shorten the expanded view to be the exact same size
   as the default dashboard view"): expanded IS the bar height now.  The
   v2.3.1311 feet rule (sheet top ~36px below the boots) and the
   40/52%vh clamp are retired — the band no longer grows in any mode.

   That makes the BAR-height invariant above trivially true rather than
   carefully maintained: --dash-h was already pinned to barHeight in every
   mode, and now the sheet's own height matches it, so nothing about the
   band moves when a panel opens and the visible world never shrinks.

   THE COST, stated plainly: a panel gets ~177px at 390x844 instead of
   ~439, so every destination has to scroll inside that, and the T2 spend
   screen's "five categories on one screen" goal (v2.3.1311e) is no longer
   reachable.  drillSheetHeight matches for the same reason — a drill that
   grew to 56vh while its parent stayed at 177 would be exactly the band
   jump this change exists to remove. */
export function expandedSheetHeight(vw, vh) {
  return barHeight(vw, vh);
}

/* v2.3.1311e (owner: the T2 spend screen's 5 categories must fit one
   screen): DRILL panels (stack depth > 1 — T2 spend, Settings, quest
   detail) get the taller pre-v2.3.1311 56vh sheet.  The 44px-ground
   feet rule above exists so the character stays visible behind ROOT
   destination sheets; a drill is a focused task where content beats
   world visibility.  The band animates between the two heights on
   push/pop, which doubles as a depth cue. */
/* v2.3.1638: drills match expanded, which matches the bar.  One height,
   always — see expandedSheetHeight. */
/* v2.3.1638: drills match expanded, which matches the bar.  One height,
   always — see expandedSheetHeight. */
export function drillSheetHeight(vw, vh) {
  return barHeight(vw, vh);
}
