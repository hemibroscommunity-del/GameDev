# The armour you wear is the last to go (v2.3.3704)

The owner, 2026-10-28: *"Northwest jog has trouble loading reloading textures
after recovering from black screen"*, and that night: *"Keep running tests
through the night on memory fixes/improvements and testing for disappearing
traits."*

## What happened

Under armour, the bro's body is not the plain body: it is the body **baked
under the armour** (the masked bake, entityRenderer), so nothing of it pokes
past a plate's edge. In a matched set the jog is a painted knight figure in
every facing but **north-east and its mirror north-west**; those two, and the
stand, are drawn from the bake.

The bakes are kept in a cache of **900 frames**: every frame you can be drawn
in (each pose, all eight facings), and, in spare time, the frames of the sets
**one equip away** -- each piece in your bag put on over what you wear
(`prewarmAltWornSets`, v2.3.2873), so putting it on never stutters. When the
cache is full, it lets go of the least recently **drawn** frame.

v2.3.2872 sized the cap for "the worn set plus up to two sets one equip away,
~660 frames". Since then v2.3.2873 added a third spare set (a new piece for
each slot) and v2.3.3577 the flipped facings to every set. Those have pictures
of their own when the bro wears a pattern or a drawing (checked trousers, a
tattoo), so such a player owning pieces of two metals asks for more than 900
(the same player in plain trousers stops at 686). The spare bakes went on into
play, and each one let go of a frame -- and the least recently drawn frames
were **the armour you wear, in the facings you had not faced lately**:
north-east, north-west, a stand. Jogging that way then drew the plain body
under the plate, a frame here and a frame there, while each was baked again.

A black screen does not cause it, but it is where it shows: a rebuild, and
then the first jog north-west in a while.

Measured with `mp-wornbake` on main: a phone in copper armour and checked
trousers, the kit's other pieces in the bag, the spare bakes left to run:

| | main | with this |
|---|---|---|
| the cache, settled | 900 (full) | 900 (full) |
| frames of the worn set held | **137 of 177** | 177 of 177 |
| jogging north-east, each look (M masked, P plain) | `M P P P P P P P P M P P P` | all M |
| jogging north-west | `P P P P M P P P M P P M P` | all M |

Found by #1187's `mp-packedimages` on main with every open pull request in:
after a black screen's rebuild the north-west body was drawn plain. Its probe
read the worn set at 177 of 177 with 480 frames held once dressed, 736 a few
minutes later, 841 just after the rebuild, and 79 of 177 once the cache was
full, and jogging north-west then `P P M M P M P M M P M P M M`. The same with
`?keepimage=0`, so it was never the pictures kept as images.

## What it does now

- **The frame let go of is the least recently drawn of any OTHER armour**: a
  spare set's, another player's, an old look's (src/rendering/maskedEvict.js
  `pickEvictKey`). Only when every frame held is the worn set's does one of
  those go, least recently drawn first, as before.
- **A spare set is baked only into room the cache has.** At the cap, a spare
  frame not yet baked is skipped (counted, `spareSkipped`): baked into a full
  cache it could only push out another spare frame, a bake thrown away for a
  bake. A spare piece whose frames were skipped is baked when it goes on, as
  before v2.3.2873.

The cap is unchanged (900 frames), so the memory is unchanged.

## Tests

- **`worn-bake` suite** (node): the worn set's key; which frame goes (another
  set's, another player's, one piece of the worn set counts as another set,
  only-worn, nothing held, nothing worn); the trickle replayed into a full
  cache, the old rule keeping 120 of 177 worn frames (north-east and
  north-west gone) and the new one all 177; and the wiring.
- **`mp-wornbake`**: a phone in copper armour, the spare sets baked as far as
  they go, then every frame of the worn set still held, and jogging north-east
  and north-west never the plain body under the plate.
