# The weapon pill (v2.3.4130)

The owner, 2026-11-03, with a picture of it: "I uploaded ... different pill
shape weapon swap type bar. Put it centered bottom of screen area. Also
different icons for jump, sprint, and reticle."

It replaces the weapon triangle (v2.3.3921, docs/specs/weapon-triangle.md),
which replaced the corner chip (v2.3.3005).

## What it is

`src/ui/panels/WeaponPill.jsx`: one dark pill with a gold rim and three round
wells, always sword | bow | staff, left to right.

- **In hand**: the well ringed in glowing gold (box-shadows, never a CSS
  filter), the Character sheet's own coloured picture of that weapon
  (`icons/ui/hero/melee|bow|magic.webp`, baked small as
  `ui/controls/wpn-*.webp`). It wears `data-weapon-chip`.
- **Held**: the same picture baked grey (`ui/controls/wpn-*-grey.webp`). A tap
  or click takes it in hand.
- **Not yet yours**: an empty, dimmer well. A tap says "No bow yet" (or "No
  staff yet") over your head, shakes the well, and does nothing else.
- Empty hands are fists: the sword's well is lit all the same.

A tap or click runs the one swap path (`_desktopCycleWeapon`, a step on or
back), so the worker hears `set_active_slot` and the name and sound play as for
the double tap and the Tab key. On a computer the wells wear their keys (1, 2,
3; `deskKeys.js`), which still work. The left stick's double tap stays.

## Where

`weaponPillAnchor` in `src/ui/panels/ShieldButton.jsx`: 136 x 48 px (40 px
wells, 4 px apart, 4 px of pill round them), centred in the world view (the
screen on a phone, the world column on a computer), its foot 8 px over the
dashboard band, in every layout.

- **Upright** the foot of the screen is the thumbs': Jump stood south-west of
  the attack disc over that spot, so Jump turns west on the same ring until its
  foot is 8 px over the pill's top (about 12 degrees below west; it was 45),
  and Block stands beside it, their feet level (`jumpAnchor`, `blockAnchor`).
  On a phone narrower than 360 px (320) a centred pill would lie on the
  bell and Block on the movement stick, so there Block goes under the attack
  disc at the band's foot and the pill fills the room between the bell and
  Block, 8 px from each: not centred, its wells 34 px (never under 32).
- **Sideways and on a computer** the foot of the world is clear (Jump under
  the disc, the bell in the corner); nothing else moves.
- While it is drawn `html[data-wpill-shown]` lifts the doors' Enter prompt over
  it sideways and on a computer (game.css; upright the prompt already stands
  over Jump).

## Taught by the big arrow (v2.3.4130)

After the first quest's hand-in, once a second weapon is in hand, the guide
arrow points at the pill: "Tap a weapon to switch" ("Click a weapon or press
1 2 3" on a computer), until the first switch, once (docs/specs/guide-arrow.md).
It replaced the SwapHint callout.

## The other icons in the same ask

- **Reticle** (the attack disc, `controlSkin` `AimReticle`): the owner's, drawn
  in code: a thin grey circle in four arcs and a small white cross.
- **Jump** (`ctl-jump.webp`) and **Sprint** (`ctl-sprint.webp`): a leaping
  figure and a winged foot, light on the dark button. The game's own drawings
  (`tools/ui/draw-control-icons.py`, 112 px, 256 colours, warmed on the loading screen
  by `controlsPreload.js`): the owner's references were someone else's
  pictures, so they are not shipped. `?jumpicon=leap|arrow|...` still wears a
  drawn mark for a tab.

## Memory

Eight new pictures, each under MEMORY-MAP's ~50 KB for a UI icon: Jump and
Sprint 112 x 112 (49 KB decoded each) and the pill's six 96 x 96 (36 KB each),
about 0.3 MB decoded in all, 256 colours, warmed on the loading screen
(`controlsPreload.js`). The pill uses its own small copies, not the Character
sheet's 256 px pictures (256 KB each). `mp-membudget` passed with no line
moved.

## Checks

`node tools/qa/mp/run.mjs weaponswap`: empty hands, the three wells' size,
order, picture and ring, centred and clear of every control's place (drawn or
not) and every control upright and sideways, a tap on each grey well swaps and
the worker's player_state agrees, a drag does not; a computer's pill centred at
the foot of the world column, wearing 1 2 3, a click swaps and walks nowhere,
the 3 key swaps and the pill follows. `swaphint`: the callout over the pill.
`jumpbtn`: Jump on the ring and 8 px off the pill. QA: `window.__btWeaponPill`
(taps, notes, `box()`, `slots(landscape, vw)`), `window.__btWeaponChip()`.
