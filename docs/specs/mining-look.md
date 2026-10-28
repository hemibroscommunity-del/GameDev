# The miner: no see-through loops, and a print that stays on his chest (v2.3.3696)

The owner, 2026-10-28:

> I think the pickaxe during mining is transparent for some reason

> Also the shirt while mining still moves around a lot. It would be better to
> have it move less

## The "transparent pickaxe"

It was not the pickaxe. The mining sheet (`public/sprites/player/mine-south.png`,
fourteen frames) was cut off its picture's background by colour. Two pieces of
that background are enclosed by the figure:

- the gap between the raised arm, the pickaxe's handle and the head, on the six
  frames where the pick is over his head;
- the gap between his legs, on almost every frame.

Their middles were cut out, but their edges were left:

- a **ring** of one flat light grey, (150, 158, 172), round a see-through hole.
  Beside his head that reads as a hollow pickaxe blade. Between his knees it is
  a grey loop. That grey is also the sheet's key for the boots and the pick's
  steel, so nothing in the game's recolour could tell it apart;
- a **pale edge**, one or two pixels of near-white and pale grey between the
  ring and the figure's outline, where the background was smoothed into the
  outline. With the ring gone it was a dotted line beside his face and along
  his arm and legs, so it goes too.

`tools/art/clear-mine-fringe.py` rebuilds the sheet from the sheet as it was
cut, kept at `assets/skill-anim-src/mine-south.as-cut.png`, so a second run
makes the same sheet:

- the ring: a pixel of that grey joined to a hole becomes see-through
  (1,381 px on 12 frames);
- the pale edge: a near-neutral pixel lighter than the outline, touching the
  ring or touching one that does, becomes see-through too (347 px).

Nothing else changes:

- the pickaxe's blade is a darker, bluer grey (about 129, 136, 150);
- the pickaxe's handle, the skin and the trousers are strongly coloured, the
  outline and the boots dark, so none of them is pale;
- the eyes' whites share the ring's grey but touch no hole;
- on frame 4 the pick strikes between his legs and there is no hole there, so
  its blade stays;
- only pixels that touched the ring are looked at, so the rock under him and
  its chips are left alone.

`playerSprites.js` `VERSION` is 102 so phones fetch the new sheet. The stale
`.webp` twin is deleted; CI makes a new one.

## The print that moved

A shirt print or pattern is placed on each frame of a sheet by that frame's
own chest box: its widest upper row, its top and its bottom. In the mining
swing the pickaxe goes over his head and the sleeve rises with it, so the box
changed shape. Through the swing the print's middle moved 4.6 px against the
hem and its size changed by 7 x 7 px, on a 128 px frame.

The stand-ins (the sword's swing, the bow's shot, the gatherers) already had a
steadier anchor in waiting, `torsoAnchors` in `src/rendering/playerDecal.js`:

- the **hem** (the shirt's lowest row: it drops with his real crouch);
- the **middle of the torso across** (the garment in a band a quarter to a
  half of the shirt's height above the hem, where no sleeve reaches);
- **one size** for the whole strip (the median of its frames').

The mining sheet now uses it too (`gearSheets.js` `STABLE_PRINT_POSES`). The
print rides the hem and the torso's middle, at one size, and the pattern's
stripes stay where the body is. The walking and standing sheets keep their own
placement, which their tests are tuned to.

## Checked

- `mine-look` suite (node, 7 checks):
  - the tool's own check: the shipped sheet is exactly what it makes;
  - every ring pixel and every pale edge pixel within two of it is
    see-through, worked out in node apart from the tool;
  - nothing else changed: the eyes' whites, frame 4's blade and every pixel of
    the handle's wood are as they were;
  - `VERSION` 102 and the `.webp` twin gone;
  - on the tee's mining strip, the print's middle against the hem moved 4.6 px
    and its size 7 x 7 px placed the old way, and 0 px at one size anchored;
  - across, it follows the torso (the body sways 3.5 px in the swing);
  - only the mining pose is anchored.
- `mp-ghostaudit` with `BT_GHOST_OUTFITS=bare BT_GHOST_ONLY=mine
  BT_GHOST_SHIRT=print` photographs all fourteen frames of a miner in a
  striped, printed tee with no armour, on main's build and on this one.
  `bare` (no armour) and `BT_GHOST_SHIRT` are new options for this check.
