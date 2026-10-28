# The angler's forearm in front of his T-shirt, and no pale slits (v2.3.3685)

The owner, 2026-10-27:

> Also the hand for fishing should be in front of the t shirt. Right now it
> looks like it's going into his waistband.

and earlier, on the same pose:

> a flickering grey or see-through hole near the waist and the reeling hand

## What was wrong

**The forearm.** The angler holds the rod in one hand and the reel in the
other. The reel hand's forearm crosses in front of his belly. The T-shirt's
fishing strip (`public/sprites/gear/shirt/tshirt/fish-south.png`, 32 frames
of 128 px) is one picture, frame 12's, moved whole by a pixel or two a frame
(`tools/rebake_fish_gear.py`). Its lower right edge was cut along frame 12's
forearm, so on frame 12 the forearm crosses in front of the shirt. But the
forearm moves as he reels, and on 20 of the 32 frames (3-10, 13-20, 27-30)
it crosses higher. There the shirt was drawn over it, 69-183 px a frame, and
the hand came out from under the shirt's point as if from his waistband.

**The slits.** The body's fishing sheet (`public/sprites/player/fish-south.png`)
had 24 pale grey or cream pixels sitting alone between two outline pixels, at
the waist and beside the reel hand. They are leftovers of the white the art
was cut out of. Recoloured with the figure, each showed as a pale dot that
came and went as the frames turned: the flicker.

## What changed

`tools/gear/fish-forearm-front.mjs` (a dry run prints "N px would be
written"; `--write` writes both sheets):

1. **The forearm, per frame, on the body's own art.**
   - Its skin is found by the recolour's skin test, with the outline as a
     wall (the dark pixels grown by one), so a forearm drawn over the belly is
     its own piece.
   - The piece that touches the reel is the one kept (the magenta key's lowest
     13 rows, grown by 3).
   - From the reel hand, every pixel of that piece within 40 steps along it is
     taken: the hand, the forearm and the elbow.
   - That is grown by 2 into the skin and outline beside it, so the forearm is
     cut out with its own outline.
2. **The shirt is cut there**, except in its sleeve, which covers the top of
   his arm whichever way it moves. Pieces of shirt the cut leaves under 6 px
   go too. A larger piece below the forearm is the shirt's hem behind his arm,
   and stays. In all, 2,674 px of shirt over the 20 frames.
3. **The 24 slits** take the colour of the two outline pixels either side, as
   opaque as they are. Skin is just as bright, so the tool tells a slit from
   skin by its colour: a slit's saturation is under 0.35, skin's over 0.6.

The tool checks its own work and stops on any failure:

- the shirt is only ever taken away;
- every shirt frame is frame 12's picture moved by its offset, less the cut;
- frame 12 itself is never cut;
- the body changes only at the slits.

A second run finds nothing to do.

Both sheets are PNG only, their `.webp` twins deleted (CI mints them).
`GEAR_VERSION` is 2.3.3685 and the body sheets' `VERSION` is 102, so every
phone fetches both again.

## Measured

- **In the game** (`mp-ghostaudit`, the fishing frames photographed on the
  commons, a green-skinned bro in a yellow tee, nothing over it): on all 25
  frames photographed, the reel hand's forearm crosses in front of the tee.
- **Under full iron** the plate covers the tee, and the fix changes nothing:
  5 frames leak at most 19 px, as on main (5, 17).
- **`fish-forearm` suite** (9 checks):
  - the tool's dry run finds nothing left;
  - the sheets' sizes;
  - the shirt only taken away, and cut on exactly the 20 frames;
  - no slit left;
  - both versions bumped.
  Against main's sheets 4 of its checks fail.
- `mp-fisharmour` still holds the tee's grip and the armoured hands.

## What it costs

Nothing at run time. The same two pictures, a few hundred bytes different,
and no new code in the game.
