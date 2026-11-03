# A bigger, cleaner minimap (v2.3.3922)

The owner, playtesting on a computer, 2026-11-02:

> Map system is confusing... make the mini map 100% + bigger/ double the
> size... and change the look of the mini map

> Questioning the minimap border shape, placement, size, and minimap quality
> as well.

From the review they took: keep the top-right place; a rounded square; "a thin
charcoal or muted gold border, gentle corner rounding, and no attached
oversized location plaque"; "smaller enemy markers, potentially grouped at low
zoom, to eliminate the current clusters of oversized red skulls"; "ensure the
map's danger markers are visually distinct from the skull used for outlaw
status"; a tap opens the World map, with a small corner icon (the "tap me"
mark it already had).

**This reverses three earlier choices of the owner's** (docs/UI-DESIGN-NOTES.md,
"The minimap and the world map"): keeping the box's size with the plate inside
it (v2.3.3108), the thick frame "so it's not confused with game screen area"
(v2.3.3009), and a skull for every monster (v2.3.1810). The new words are the
owner's own, so they win.

## What changed

All in the Wheel's minimap (`src/rendering/systems/wheelMinimap.js`); the
dungeons' and the farm's small box are as they were.

- **Size** (`src/ui/wheelMiniSize.js`): on a computer playing wide
  (`deskWideActive()`) the box is twice as big, 264 CSS px, and shows 1.5
  times the world (4,800 game px across). A phone keeps 132 px and 3,200 game
  px: 264 would be 68% of an upright phone's width. The box draws in the
  phone's units and scales its root by K (its Graphics are vector; its Texts
  are drawn K times finer); the box's place (`window.__btWheelMini`, with its
  "tap me" mark), the plate's (`window.__btWheelPlate`) and the probe
  (`window.__btMinimap`, now with `k`) are in CSS px. What keeps clear of the
  box asks `wheelMiniBox()` (NmlAskCard's place under it) or the phone's
  `WHEEL_MINI_PX` (the Sprint button's clearance: Sprint is hidden on a
  computer) instead of writing 132.
- **Look**: a rounded square (corners of 12), the frame 3 px (was 7, corners
  8): a dark keyline, a px of charcoal and a thin muted-gold line inside,
  over a soft shadow (three faint rounded rects). The lands under a light wash
  of the world's ground (`0x6e6852` at 0.2; the overview's tint lifted from
  `0xdadada` to `0xebebeb`) and a gentle shade at the window's edge. No new
  textures. The N bead is charcoal with a gold N, a touch smaller (radius 6).
- **Monsters**: a small red dot (5 px, a dark edge: the `mdot` glyph,
  `minimapRenderer.js`) for each 10 px cell of the box that holds monsters
  (the cell fixed to the world, so a group holds still as you walk), at its
  monsters' middle, 7 px for three or more. A boss is a small horned skull
  (`bossSkull`, 11 px), drawn over the dots and never grouped; No man's land's
  outlaw skull (`NmlBadge.jsx` `NmlSkull`) has no horns. The probe's
  `monsters` counts them.
- **The name plate** stays inside the box, slimmer: the map's window 98 px of
  the 132 (was 92), the plate 29 px (was 33), its two lines as they were
  ("BroTown" over "safe" at home, at 11 px or more). The top bar is to say the
  place and its safety (another change); removing the plate is a follow-up
  once that is on main.

## Checked

See the PR body for the runs. The scenarios: `mp-wheelmap` (the frame, the
plate, the ice blue under the wash, and the monsters as grouped dots on Frost
Ridge), `mp-north`, `mp-minishot` (the two new glyphs distinct from every
other), `mp-deskplace`, `mp-deskkeys`, `mp-starcue`, `mp-mappin`,
`mp-partymap`, `mp-membudget`; the UI review's `hud`, `world-map` and
`world-map-pin`.
