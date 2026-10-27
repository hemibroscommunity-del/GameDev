# The Points page switches between the three weapons (v2.3.3665)

The owner, 2026-10-27:

> the points page needs a way to change between views between melee, bow,
> staff. It's stuck on whatever weapon you have equipped but there should be a
> way to toggle between the 3

## Before

The Points tab's top row is six weapon stats behind a gold frame that lists the
three weapons, sword, staff and bow, each with its points left. The six cells
showed the weapon in your hand (v2.3.3051) and nothing on the page changed
that. Upright there was no switch at all. Sideways, the accordion's lane
headers could be tapped; the dashboard's Melee/Bow/Magic pill could ask for a
lane by name; the [+] window has its own lane tabs, but they only aim the
window.

## Now

The frame's three rows are buttons (`HeroExpanded.jsx` `headCell`):

- A tap on a weapon's row shows its six numbers. It's the same
  `setBuildCat` the dashboard's pill uses.
- The row shown wears a brass ring. The faint fill it had before was too
  faint, once the cells can be another weapon's than the one in hand.
- The [+] on a cell spends that weapon's points, as before: the cells name
  their lane.
- Changing the weapon in your hand brings the view back to it
  (`heldCatRef`, v2.3.3051).
- `data-prog3-held` still marks the weapon in your hand, and
  `data-points-shown` marks the one shown.
- Each row is about 55 x 21 px upright. That is small for a thumb, but a miss
  only shows the next weapon. The rows fill the frame between them.

The owner had said the weapon row was a label, not a button (v2.3.2684): then
a tap on it would have done nothing the [+]'s window does not. Showing another
weapon's points is what it does now. `docs/UI-DESIGN-NOTES.md` says so beside
the old rule.

## Checked: `mp-pointsswitch`

In the world, upright on a 390 x 844 phone, with real fingers, after the
worker charged two Power to the bow and one Range to the staff:

1. The grid opens on the sword in your hand, its row lit.
2. The bow's row shows the bow's six cells, its Power at 2, the sword still
   marked in hand.
3. The staff's row shows the staff's (Range 1), and the sword's row brings the
   sword back.
4. Taking the bow in hand (the 2 key) brings the grid to the bow.
5. On a computer, a click on the bow's row does the same.

8 of 8. The page after the bow's row is tapped is saved as
`tools/qa/mp/out/pointsswitch-bow.png`.

The points are charged with `/dev/combat {skill: 'all', level: 6, deal: true}`
(each weapon's own points, as a level-up deals them) and the game's own
`prog3_allocate`, Power's key being `dmg`.
