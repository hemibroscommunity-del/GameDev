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

/* v2.3.1648 (owner: "the current problem is that the slots and info
   displayed currently don't meet a minimum size where users who can't see
   at smaller sizes struggle with it").  LEGIBILITY now outranks the
   equal-thirds rule from v2.3.1636, and it is the owner's own reason:
   three equal columns each holding three squares across a 390px phone
   caps the square at 35px, and no amount of padding arithmetic moves that
   number.  The cap is the LAYOUT, so the layout changes.

   COMBAT no longer needs a third of the row.  It went from six parents to
   three — melee / bow / magic — because HP, defense and stamina "can just
   be reflected in total hp, energy points" (owner), and those already
   read live on the world HUD.  Three items in a column do not want three
   squares across; they want three wide rows.  So COMBAT takes a NARROW
   column and BAG / EQUIPPED split what it gives up, which is what pays
   for the bigger squares: 35 -> 41px, a 17% gain in every dimension that
   matters for seeing an item.

   THE EQUAL-THIRDS RULE IS DELIBERATELY RELAXED HERE, not forgotten.  It
   existed because three columns of six squares each read as three
   unrelated widgets when their widths were content-derived; that reason
   does not apply to a column whose content is a different shape on
   purpose.  Reverting is one constant: set NARROW_SHARE to 1/3. */
const NARROW_SHARE = 0.24;

/* v2.3.1649 (owner: "the inventory slots need to be about 50% larger.  I
   think 4 slots can only be visible on the dashboard.  The rest can be put
   into full bag view").  THE SLOT SIZE IS THE COLUMN COUNT.  Panel widths
   did not change here at all — the bag simply stopped putting three
   squares across a 142px panel and started putting TWO, and the tile that
   falls out of the same padding algebra is 64px instead of 41.  That is
   the "about 50%" the owner asked for (+56%), derived rather than dialled
   in, and it is why there is no magic multiplier anywhere below.

   FOUR VISIBLE SLOTS is the arithmetic consequence the owner already
   anticipated: two across, and the band's height affords two rows.  What
   used to be nine cramped previews is four you can actually identify, and
   the tenth-and-beyond were already only reachable by opening the Bag. */
export const BAG_COLS = 2;

export function dashPanelWidths(vw) {
  const avail = vw - 4 * DASH_GAP;
  const target = Math.round(Math.min(Math.max(avail * NARROW_SHARE, 76), 130));
  /* The wide panel is SNAPPED to exactly what its whole squares need, and
     the rounding remainder goes to the narrow one.  Taking the naive half
     instead left 1px over inside each wide panel, and centring split it —
     measured 4.5 / 4 / 4 / 4.5 across the bag's top row, which is the same
     half-pixel asymmetry v2.3.1640 was created to kill.  A panel may only
     be a width its own contents tile exactly. */
  const t = dashTileSizeFor(Math.floor((avail - target) / 2));
  const wide = BAG_COLS * t + 2 + (BAG_COLS + 1) * DASH_GAP;
  return { wide, narrow: avail - 2 * wide, avail };
}

function dashTileSizeFor(wide) {
  /* BAG_COLS squares across a WIDE panel: its border, its own padding on
     both sides and the gaps between them all come off first.
     v2.3.1649: the 56 cap is lifted to 76 — it existed to stop a tablet
     blowing up 3-across tiles, and at 2-across it would have clamped the
     phone case itself (64) and quietly undone the whole change. */
  return Math.floor(Math.min(Math.max((wide - 2 - (BAG_COLS + 1) * DASH_GAP) / BAG_COLS, 36), 76));
}

export function dashTileSize(vw) {
  return dashTileSizeFor(dashPanelWidths(vw).wide);
}

/* v2.3.1648: the EQUIPPED cell — TWO across, THREE rows, and WIDER THAN
   TALL.  It was three across / two rows of the same square the bag uses,
   and measured that left 26.5px of dead panel above and below the block
   (the bag's third row had nothing to pair with, since there are exactly
   six equip slots and no seventh).  Two-by-three fills the panel to the
   pixel, puts all three panels on the SAME three baselines, and grows each
   worn-gear target from 41x41 to 66x41 — 60% more area for the thumb,
   which is the half of "too small to use" that a bigger icon can't fix.
   The icon itself is still bound by the 41px height; at three across on a
   390px phone nothing can make it bigger, which is stated plainly rather
   than worked around. */
/* v2.3.1649: the equipped block keeps its 2x3 shape, but its cell height
   is now derived from the PANEL rather than borrowed from the bag tile.
   The bag went to two rows; six equip slots still want three, so the two
   numbers parted company and the old `h: dashTileSize(vw)` would have made
   the equipped block 64*3 tall inside a 132px panel and clipped the bottom
   row against overflow:hidden — the v2.3.1637 bug, one layout later. */
export function equipCellSize(vw) {
  const { wide } = dashPanelWidths(vw);
  return {
    w: Math.floor((wide - 2 - 3 * DASH_GAP) / 2),
    h: panelRowHeight(vw, 3),
  };
}

/* The height of one of `rows` stacked children inside a panel whose inner
   box is panelInnerHeight — the single place the "three equipped rows and
   three combat pills line up with two bag rows" promise is kept. */
/* v2.3.1652 (owner: "put the filters on their own header row above the
   inventory slots"): the band grows by exactly one filter-chip row.

   This is arithmetic, not taste.  The open Bag's body is var(--cols-h)
   tall (the v2.3.1638 one-height rule), and three standing asks now
   compete for it: 64px slots (v2.3.1649, "about 50% larger"), TWO fully
   visible rows (v2.3.1649), and now a chip header.  At 151px the first
   two alone spend 141 of it — there is no padding left anywhere to find
   the header in, and the three ways out were all worse:
     - shrink the bag-view tile: breaks "make the bag slots on bag view the
       same size as the slots on the dashboard view" (owner, v2.3.1646).
     - one visible row instead of two: breaks the v2.3.1649 ask directly.
     - make the EXPANDED sheet taller than the bar: the sheet is
       bottom-anchored, so it grows UPWARD, which moves the nav buttons
       30px whenever the Bag opens.  That is precisely the "controls
       sliding out from under the thumb" failure v2.3.1637b exists to
       prevent, and the reason the rail is bottom-anchored at all.
   So the BAND grows, in both modes, and the nav row does not move.
   203 -> 233px at 390x844.  --dash-h grows with it, so the joystick and
   every world-HUD anchor ride up together and the 70px clearance above
   the band is unchanged (TouchControls keys off --dash-h). */
export const BAG_HEADER_H = 26;

export function panelInnerHeight(vw) {
  return DASH_ROWS * dashTileSize(vw) + (DASH_ROWS - 1) * DASH_GAP + BAG_HEADER_H + DASH_GAP;
}
export function panelRowHeight(vw, rows) {
  return Math.floor((panelInnerHeight(vw) - (rows - 1) * DASH_GAP) / rows);
}

/* v2.3.1648: a COMBAT pill's width — the narrow panel's whole inner width,
   because there is only one per row.  It is the shape change the owner
   asked for ("make the three combat skills a different shape that fits the
   space better, does not need to be square"): 80x41 at 390w instead of a
   35px square, which is what lets the icon, the skill's NAME and its level
   all be legible at once.  Three squares in a narrow column could show
   none of that. */
export function combatPillWidth(vw) {
  const { narrow } = dashPanelWidths(vw);
  return narrow - 2 - 2 * DASH_GAP;
}
/* Three pills over the same inner height two bag rows occupy, so all three
   panels end on the same baseline. */
export function combatPillHeight(vw) {
  return panelRowHeight(vw, 3);
}

/* v2.3.1649 (owner: "shift the DPS number data to be aligned above the
   weapon").  The weapon is the EQUIPPED panel's top-LEFT cell, so this is
   the width of the box the identity row must centre DPS inside: the
   panel's border + padding on the left, the cell, and the mirror of that
   inset on the right.  Centring content in it puts DPS dead over the
   weapon at every viewport, which an eyeballed left-offset would not. */
export function weaponAnchorWidth(vw) {
  return equipCellSize(vw).w + 2 * (1 + DASH_GAP);
}

/* v2.3.1647 (owner: "increase the size of the dashboard by about 50% of
   the space between its current height and the joysticks area — the exact
   height can be determined by whatever slot spacing that could use the
   extra room makes the most sense"): THREE tile rows, not two.  The extra
   room buys a whole row of bag slots rather than padding.
   v2.3.1649: TWO rows of the new 64px tile.  The band's height is
   essentially unchanged (151 vs 150 at 390x844) — the same vertical budget
   now buys four big slots instead of nine small ones, which is the trade
   the owner asked for in as many words. */
export const DASH_ROWS = 2;

export function columnsRowHeight(vw) {
  /* +1 for the ROW's own bottom hairline.  The row is box-sizing:border-box
     at height:100% of this number, so that 1px rule comes out of the
     content box — measured as 3.5 / 4 / 3.5 vertically (the half-pixels
     being the shortfall split by centring) until it was accounted for. */
  return panelInnerHeight(vw) + 2 * DASH_GAP + 2 + 2 * DASH_GAP + 1;
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
export const RAIL_COUNT = 4; /* v2.3.1651: Quests joins */
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
  /* v2.3.1651: the width is DERIVED now, not a share of the viewport.
     A fourth button (Quests) at the old 38 made the group 172 wide, and
     right-aligned that starts at 214 — four pixels INSIDE the DPS
     readout, which ends at 224.  The rule that replaces the fraction is
     the one the collision taught: the group may have everything from the
     DPS readout's right edge to the frame's inner edge, and no more.
     34px at 390w, 31 at 360, 26 at 320 — where the floor is a 24px icon
     plus its borders, the smallest this button can be and still show the
     glyph it is. */
  const budget = (vw - DASH_GAP) - navGroupLeftLimit(vw) - DASH_GAP;
  const w = Math.floor((budget - NAV_GAP * (RAIL_COUNT - 1) - 2 * NAV_GAP) / RAIL_COUNT);
  return { w: Math.min(Math.max(w, 26), 48), h: identityRowHeight(vw, vh) - 2 * NAV_GAP };
}

/* The leftmost x the nav group may start at: the right edge of the weapon
   anchor box, which is what carries DPS on the identity row's lower line. */
function navGroupLeftLimit(vw) {
  return 2 * DASH_GAP + dashPanelWidths(vw).wide + weaponAnchorWidth(vw);
}

export function navGroupWidth(vw, vh) {
  /* v2.3.1650 removed the group's 1px border with its background, so the
     +2 that accounted for it goes too — it was overstating the overhang
     the identity strip and the filter chips have to keep clear of. */
  return navButtonSize(vw, vh).w * RAIL_COUNT + NAV_GAP * (RAIL_COUNT - 1) + 2 * NAV_GAP;
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
