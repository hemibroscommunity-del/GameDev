# The fire-lighter's head in front, and no trousers under his greaves (v2.3.3684)

The owner, 2026-10-27:

> For fire starting animation head needs to be removed and pasted on top of
> armor torso layer (you're done this before) also remove pants (olive green)
> those should not be showing frame 6 is particularly bad - armor legs need to
> shift leftward

## What was wrong

The fire-lighter is a body strip (`firemaking-strip.webp`, eight 384 x 512
frames, the same picture for every player, recoloured) with the armour's own
strips drawn over it at `FIRE_GEAR_REG`'s per-frame places: the greaves, the
T-shirt, the plate.

- **The head.** Where the plate's picture lies over the body's head, it covers
  the face. On frame 2 (he leans to the log) the plate's collar ran across his
  mouth: 1,512 of the plate's pixels on his head. On frames 1, 3, 5 and 6 it
  clipped the chin's outline (14-35 px). The T-shirt's collar did the same on
  frames 1 and 3-5 (52-437 px).
- **The trousers.** His body kneels its own way and the greaves are a picture
  of their own, so his trousers and boots showed beside them:
  - frame 2's thigh between the plate and the greaves (1,092 px of the art);
  - frame 6's hip, 437 px (the greaves sat right of it);
  - the back boot on frames 4 and 5.
  mp-ghostaudit, in full iron with pink trousers and blue boots, found these
  on frames 2-7: 169, 7 + 21, 141 + 59, 139 + 46 and 152 device px.
- **The glow.** Frames 6 and 7 are painted lit by the fire (the fire itself is
  the game's own since v2.3.3666; the glow on him stayed). The trousers on the
  lit side are orange-olive, which neither the trouser test nor the skin test
  takes, so they kept the art's colours in any trousers: 1,133 px at his hip
  on frame 6 and 2,644 down his left leg on frame 7. Found with the above.
- **The log's end.** From frame 4 on, the log's cut end is painted in the
  fire's glow: its magenta key is pushed toward red (hue 352-353), past the
  key's window (315-350). So it kept the art's salmon pink on a wooden log, in
  every light. The audit counted it as trousers: 82-133 px.

## What changed

1. **The head is in front.** "You've done this before" is the pickup crouch
   and the jog, which draw a head of their own over the gear
   (`getPickupHeadFrame`). Here the head never moves against the art, so the
   same result costs nothing at run time: the plate and the T-shirt have no
   picture where the head is. `tools/gear/fire_head_front.py` finds each
   frame's head:
   - the face's own piece of skin (the bake's skin test with the fire window),
     its holes filled;
   - the outline round it (3 px).
   Each layer pixel that is drawn on the head (grown 1 px) becomes
   see-through: 1,624 plate pixels and 993 T-shirt pixels. `GEARLAYER_VER`
   is now 1039.
2. **No legs of his own under greaves.** Under greaves he is baked without his
   trousers and boots, as the cook and the lumberjack have legless strips drawn
   (`playerSkins _standInLegless`). The greaves are his legs. The steps:
   - the trousers and boots go;
   - their outline goes, up to 8 rings of dark or soft pixels round what went.
     His skin's edge and the log's (its key, padded 6 px) are never touched;
   - specks of 40 px or less left near them go.

   About 66,000 px over the eight frames. Your figure is baked the way you need
   (`_fireWantLegless`), and baked again when greaves go on or come off.
   Another player's is baked by their greaves (`_peerFigure`), and is drawn
   from yours only when you wear the same colours and the same greaves.
3. **Frame 6's greaves moved** 20 art px left and 4 up (`FIRE_GEAR_REG.legs`
   `[35, 8]`, was `[55, 12]`), under the plate where his hip is. Frame 6's
   bare trousers in the art went from 437 to 5 px. This holds with the legs
   kept too (`?firelegless=0`).
4. **The glow's trousers are trousers** (`_standInGlowLegs`). A warm pixel the
   skin rule left behind (a piece of skin colour that is not his) is counted
   as trousers when it lies within 3 px of the trousers. So it takes your
   trouser colour, or goes with the legs under greaves.
5. **The log's lit end is wood** (`toolRecolor isLitToolKey`). A red-magenta,
   bright, strong pixel within 4 px of the log's key turns to bark with the
   rest of the log (`_fireLogToBark`).

## Measured

- **mp-ghostaudit** (fire light, full iron): from 15 frames leaking up to
  133 px down to 3 frames of 9 px. The 9 px are frame 4's darkest ring at the
  log's end, inside a single frame's noise. 8 of 8 checks. The audit no longer
  counts the campfire the light leaves (`label: 'campfire'`), since the light's
  fire becomes that campfire by design (v2.3.3666).
- **mp-firegear**: 15 of 15. Frame 6's bare trousers in the art are 437 -> 5.
  In greaves he is baked without legs, and with them again when the greaves
  come off.
- **Memory**: no change. Your figure is still one strip, with legs or without.

## Switches and probes

- `?firelegless=0` keeps his legs under greaves (the game as it was).
- `?firelit=0` leaves the log's end pink.
- `window.__btFireLegless()` returns `{ on, want, legless, gone, frames }`.
- `python3 tools/gear/fire_head_front.py --check` fails if a plate or T-shirt
  pixel lies over his head. Run the tool again after a change to
  `FIRE_GEAR_REG`'s chest or shirt rows, or a re-cut of the owner's art
  (`tools/build_fire_8f.mjs`).
