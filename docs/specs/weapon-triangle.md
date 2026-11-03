# The weapon triangle (v2.3.3919)

The owner, playtesting: "I need a button on screen for switching between
weapons. Maybe a triangle or wheel where the active weapon is highlighted on top
and the others are greyed out", and "I don't think it's clear enough that
tapping the tiny circular staff button (right next to the notification bell)
allows you to switch between weapons." From the design review they adopted:
"relocate it near the right-hand combat controls, enlarge it ... The icon should
always depict the currently active sword, bow, or staff."

It replaces v2.3.3005's weapon chip (a 44 px button in the bottom-left corner
under the movement stick; a tap was the next weapon). A phone only: a computer
swaps with its keys.

## What it is

Three round buttons, one per weapon slot, always in the order sword, bow,
staff round the triangle (`src/ui/panels/WeaponTriangle.jsx`):

- **top**: the weapon in your hand, 46 px, full colour, the gold ring. It wears
  `data-weapon-chip` (the hook the swap hint and the tests use). A tap does
  nothing.
- **lower right / lower left**: the next weapon round the cycle and the one
  before it, 40 px of touch, the quiet slate ring, the picture dimmed (opacity:
  never a CSS filter over the game, the iPhone grain). A tap takes it in hand
  and the triangle turns (every button slides to its new corner, 150 ms) so it
  is on top.
- **a weapon you do not have yet**: a dashed empty circle. A tap says "No bow
  yet" (or "No staff yet") over your head, as Sprint says "Not enough
  energy!", shakes the circle, and does nothing else.
- empty hands: the top is your fists, the Weapon cell's empty-slot picture,
  faint.

A tap runs the one swap path (`_desktopCycleWeapon` in BroTown: a step on, or
back with `dir -1`), the same one the left stick's double tap and the Tab key
use: the worker hears `set_active_slot`, the name floats over your head, the
weapon's own sound plays. The double tap stays.

## Where

`weaponTriAnchor` in `src/ui/panels/ShieldButton.jsx`. The LEFT thumb's side,
by the owner's choice on the PR (the first cut stood over the right-hand
cluster): "Do you think the weapon triangle should move besides the left
joystick instead? I'm thinking the right joystick is already crowded with
buttons and weapon swapping won't need to occur as often." It is the left
cluster's third place (Element Burst, Quick eat), toward the middle:

- **upright**: over Quick eat, its left edge on Quick eat's, its foot 10 px over
  Quick eat's top, never past 4 px short of the screen's middle. On a 390 x 844
  phone, x 90-178, y 461-545: under the quest card, over the bell, its open feed
  58 px away.
- **sideways**: right of the movement stick, 10 px off its box, its foot level
  with the stick's (a row higher reaches the top bar on a 390 px-tall screen;
  level with Quick eat it lies on the quest card).

The box is 88 x 84 px: the two lower buttons 8 px apart, 4 px of air between
the top ring and each lower one. Like Quick eat it swallows its own touches, so
a tap never starts a walk. `combatBandTopPx` counts it, so upright the coach
card's lift rises 15 px.

The notification bell stays where it was beside the old chip's corner
(`--bt-wpn-slot`); it moves into More next.

## Checks

`node tools/qa/mp/run.mjs weaponswap`: empty hands (fists on top, the bow and
staff dashed, "No bow yet"); upright and sideways, the three buttons' sizes, a
finger at each centre lands on it, in the left half, 8 px or more from Element
Burst's, Quick eat's and the stick's places (drawn or not), every other control
on screen and the open chat feed; a tap on each dim
weapon takes it in hand, turns it to the top, and the worker's player_state
says so; a drag does not swap. `swaphint`: the phone's callout over the
triangle. QA: `window.__btWeaponChip()`, `window.__btWeaponTri` (taps, notes,
`boxes(landscape)`).
