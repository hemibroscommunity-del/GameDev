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

`weaponTriAnchor` in `src/ui/panels/ShieldButton.jsx`, with the rest of the
right-hand cluster. Every place beside the attack disc is already another
button's (TRAP and Shield Bash over Jump, Block beside it, Sprint over the disc,
Special and Whirlwind over Sprint), kept even while that button is hidden, so:

- **upright**: over the cluster, its right edge on the disc's, its foot 10 px
  over Whirlwind's top. On a 390 x 844 phone, y 382-466: under the minimap,
  right of the quest card.
- **sideways**: the pocket left of Shield Bash (and TRAP, and the skateboard),
  10 px over Block, 24 px under Special.

The box is 88 x 84 px: the two lower buttons 8 px apart, 4 px of air between
the top ring and each lower one. The coach card's lift (`combatBandTopPx`) does
not count it (the card stands left, the triangle right).

The notification bell stays where it was beside the old chip's corner
(`--bt-wpn-slot`); it moves into More next.

## Checks

`node tools/qa/mp/run.mjs weaponswap`: empty hands (fists on top, the bow and
staff dashed, "No bow yet"); upright and sideways, the three buttons' sizes, a
finger at each centre lands on it, 8 px or more from every control slot of the
cluster (drawn or not) and every other control on screen; a tap on each dim
weapon takes it in hand, turns it to the top, and the worker's player_state
says so; a drag does not swap. `swaphint`: the phone's callout over the
triangle. QA: `window.__btWeaponChip()`, `window.__btWeaponTri` (taps, notes,
`boxes(landscape)`).
