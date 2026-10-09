# The bro looks like himself while he gathers (v2.3.3146)

> The owner, 2026-10-07: *"The character's appearance changes during resource
> gathering activities. It needs to stay consistent. Fix this part."*

Five things changed how the bro looked the moment he started to gather. Each
is now fixed, and `mp-gatherlook` checks each on a phone.

Then, offered the three differences left (the lumberjack's size, the shirt's
print and pattern, and a lost crack sound), the owner: *"Yes fix all"*. Those
are sections 5 to 7.

| Activity | What changed before | Now |
|---|---|---|
| Mining | hair, hat and beard drawn ~8% too big for the head | sized to the head |
| Fishing | the painted orange skin, olive trousers and grey boots; hair, hat and beard ~18% too small | your skin, trousers and boots; sized to the head |
| Woodcutting (the lumberjack) | the painted olive trousers and grey boots | your trousers and boots |
| Cooking (the cook) | the painted olive trousers and grey boots; hair, hat and beard ~30% too small for his head | your trousers and boots; sized to his head |
| Lighting a fire (the fire-lighter) | the painted trousers and boots | your trousers and boots |
| All three figures | 76% (lumberjack), 88% of your head (cook), 108% (fire-lighter) of your size | your size |
| All three figures, and a sword swing or a bow shot | your shirt's colour, without its print or pattern | your shirt's colour, print and pattern |

## How the bro is drawn while gathering

- **Mining and fishing** keep your own body. They switch to their own sheets
  (`mine-south`, `fish-south`), and your hair, hat, beard and glasses are
  placed on that sheet's head.
- **Woodcutting, cooking and lighting a fire** hide your body and draw a
  different painting in its place: the lumberjack, the cook and the
  fire-lighter (`public/sprites/skills/*-strip.webp`). Your look is baked onto
  that painting.
  - Already carried before this change: your skin, your tattoos, your tee's
    colour, your armour and your head traits.
  - Since v2.3.3146: your trousers and boots too, your shirt's print and
    pattern (section 6), and your size (section 5).

## 1. Hair, hats and beards on the mining and fishing heads

`_placeTrait` (entityRenderer) scales every head trait by a per-pose number,
`poseTraitMul`.

- **The old numbers.** Mine 1.21 and fish 0.88 were v2.3.875's guesses from
  the whole figure's height. But a trait sits on the head.
- **The measured numbers.** The repo's own tool, `tools/tune_headwear.py`
  `sheet_head`, measures the skull's top in 256-space: stand-south 43 px,
  mine-south 48, fish-south 46.
- **So they are now 1.116 and 1.07** (`MINE_TRAIT_MUL`, `FISH_TRAIT_MUL`).
  These are the numbers every individually fitted item (the glasses, the eye
  styles, the crown, the halo) was already measured to. Only the 8 hairs, the
  beard and 37 of the 39 hats still rode the old guesses.
- **The tools mirror these numbers:** `tune_headwear.py`,
  `preview_headwear.py`, `species_frames.py` and `species_contact_sheet.py`.

Head width at depths below the crown, in 256-space (read off the sheets):

| depth | 8 | 12 | 16 | 20 | 24 | 28 | 32 | 36 | 40 |
|---|---|---|---|---|---|---|---|---|---|
| stand | 38 | 43 | 43 | 44 | 51 | 51 | 46 | 42 | 37 |
| mine | 40 | 48 | 50 | 50 | 48 | 48 | 46 | 45 | 36 |
| fish | 44 | 46 | 46 | 46 | 52 | 52 | 48 | 44 | 39 |

A hat sits at the top, where mine is 1.12× and fish 1.07× the standing head.
A beard sits lower, where the three are within a few percent of each other.
So with one number per pose, the beard on the mining head is now about 5–10%
over, where it was about 20%.

## 2. Fishing wears your colours

**Why it didn't before.** Fishing drew the fish sheet RAW: no skin, trouser
or boot recolour (v2.3.2304). The reason given was that the pink rod and the
line are baked into the art and the recolour would mis-paint them.

**What actually needed protecting:**

- **The rod was never at risk.** In the file it is the magenta tool key, and
  neither the skin test (`g >= b`) nor the trouser test (`g > b + 8`) accepts
  a pixel whose blue is above its green.
- **The line was.** It is boot-grey: 60–72 against the boots' 46–75. No colour
  test can tell them apart.

**How the line is kept out.**

- Position separates the line from the boots completely: the line hangs at the
  frame's left edge (x 2–6 of 128), the boots under the trousers (x 53–80).
- `recolorBodyToCanvas(…, bootsUnderLegs)` paints a boot-grey pixel only below
  the trousers' top and within their columns, plus `BOOT_TOE_FRAC` (1/16 of a
  frame) for a toe. `buildBodySheet` asks for this on the fish sheet.
- Measured over all 32 frames: every boot pixel is kept and not one pixel of
  the line.
- The shoe pattern's region was found by the same test, so it no longer
  stripes the line either.

**The default skin.** The fish sheet is the most orange of all, (219,120,50).
So the default skin is recoloured to the walking tan here (`POSE_SKIN_FLOOR`
+ `fish`), as for a hit, a mining swing and a roll.

**Your own fisher** (`getFishFrame(art, frameIdx, skin, pants, shoes)`):

- baked behind the loading screen (`preloadBodyAll` → `prewarmFish`);
- re-baked after a change of look (`prewarmBody`);
- the armour-masked frames are warmed from it, so they match what is drawn.

**Another player's fisher** is baked the first time they cast. Their look
cannot be known at load, which is the preload law's named exception.

**Memory.** One baked sheet per player, about 1.2 MB as a canvas. On the
graphics chip only once you fish.

## 3. The lumberjack, the cook and the fire-lighter wear your trousers and boots

**The old rule.** The stand-in bake (`_standInBake`, playerSkins) was skin-only
on purpose, with the note: *"pants/shoes are left as painted -- nobody asked
for those, and the pan is the thing they would break"*. The cook's pan rim is
boot-grey, and bits of its contents pass the trouser test.

**The new rule** (`_standInClothes`) separates them by where they are:

- **The trousers** are the trouser-test pixels in the frame's big pieces: each
  4-connected piece must be at least `STANDIN_LEG_SHARE` (¼) of the biggest.
  The pan's contents are small islands; the trousers are one or two big
  pieces.
- **The boots** are the boot-grey pieces (8-connected) of which most pixels lie
  BELOW THE TROUSERS' HEM.
  - Each pixel is judged against the lowest trouser pixel within
    `STANDIN_TOE_SHARE` (⅛ of a frame) either side of its column, less
    `STANDIN_HEM_SHARE` (1⁄16 of the height) for a boot's top.
  - The pan is held at the waist, so its rim goes whole.
- **The fire-lighter** (`pantsWide`) widens the trouser test for the fire's
  glow. Frames 4–7 warm the trousers too much for the body's test, which left
  half a leg olive. The wider test never takes a pixel the skin test takes.

**Checked on every played frame** of the three strips:

- the trousers and boots whole, the lumberjack's toes on his wide stride
  included;
- no pixel of the pan, the axe (its magenta key), the logs or the flame;
- the legless strips (under greaves) are left all but untouched.

The figures re-bake when your trousers or boots change, as they already did for
your skin.

**Another player's** figure on your screen:

- The lumberjack is the raw art unless they have drawings. Then it is baked
  per look (v2.3.2855), and that bake now carries their trousers and boots too.
- The cook and the fire-lighter are YOUR bake, shared: the memory trade of
  v2.3.1713, under which a peer's cook already wore your skin. So they now
  wear your trousers and boots as well.

## 4. The cook's hair, hat and beard fit his head

A stand-in's head traits are scaled by `_skillTraitMul` (effectsRenderer).

- These were v2.3.875's figure-height ratios. A height ratio is a head ratio
  only for a figure of the walking body's build.
- **The cook is not.** He crouches, and his head is big: 85 art px wide (70
  across its top) against stand-south's 51 (43).
  - So it should be 1.65, not 1.16. At 1.16 every hat sat on him like a
    child's cap.
- **The lumberjack and the fire-lighter fit theirs within a tenth** and stay:
  - lumberjack: 46 and 40–45 → 0.91;
  - fire-lighter: 101 and 90–100, at his 512 px frame → 1.98.

## 5. The three figures are your size

The walking figure is drawn `PLAYER_SIZE_MULT` (1.25, entityRenderer,
v2.3.1821) bigger on its container. No stand-in carries that factor: they are
drawn on the effects layer. Every earlier tune of their sizes was by eye
against a figure 25% bigger than the numbers said.

Measured instead, in world px, from the same rows the walking body is sized by
(`BODY_ROWS`, `nominalStandFigure`):

| | painted head top to boots | head at its widest |
|---|---|---|
| walking (every facing) | 105.7 | 28.5 (51 art px x 1.061 x 0.421875 x 1.25) |
| lumberjack, upright (frames 17-23) | 170 art px x 104.5/220 = 80.8 (76%) | 46 art px: 21.9 |
| cook (crouched) | - | 85 art px x 65.1/220 = 25.2 (88%) |
| fire-lighter, standing (frame 0) | 381 art px x 154/512 = 114.6 (108%) | 104 art px: 31.3 |

- **Upright figures are matched by height:** `CHOP_STANDIN_H` 104.5 -> **136.8**
  (105.7 tall, and his head comes to 28.6) and the new shared
  `FIRE_STANDIN_H` 154 -> **142** (105.7 tall, head 28.8). The fire-lighter's
  154 was a literal in two places, yours and other players'; it is one constant
  now, as the lumberjack's and the cook's are.
- **The crouching cook is matched by his head:** `COOK_STANDIN_H` 65.1 ->
  **73.9** (28.6). The note that set 65.1 measured him against a 22.6 px
  walking head: that was the head before the walking figure grew 1.25x.
- **Everything on them follows:** the hair, hat and beard (they read the
  sprite's scale; the head ratios in `_skillTraitMul` are unchanged), the
  armour layers, the cook's pan (`COOK_PAN_DX` is a share of his height) and
  the farm's kneel and its covers.
- **The axe still bites the trunk:** the lumberjack is scaled about his feet,
  so his blade reaches further. `CHOP_OFFSET` 30 -> 44 keeps it where it was
  (the blade's middle is 94.5 art px from his anchor at the strike frame: 45
  world px before, 59 now).
- The campfire's pixel grid was matched to the fire-lighter's only roughly
  (2.4 against its 2.53); at 142 it is 2.22, and stays.

## 6. Your shirt's print and pattern, on every figure

The walking shirt bakes its colour, pattern and drawn print into a second copy
of its sheet (`getShirtLookFrame` -> `composeShirt`). Every figure that stands
in for the body drew its plain strip and tinted it (`_placeSwingShirt`), so a
striped shirt went plain the moment you chopped, cooked, lit a fire, swung or
shot.

- **They bake their own dressed strips** (`_dressedShirtFrame`): the same
  `composeShirt` on the strip, told its frame width (`frameW`, new) because
  these frames are not square (240x220, 213x220, 384x512 ...).
  `stampShirtArt` took only a frame height and sliced by it.
- **The pattern is scaled to the strip.** A tile's `cell` is in the sheet's own
  pixels, and the walking shirt is drawn from 128 px sheets in which you stand
  94.5 px tall. A strip whose figure stands 170 px (the lumberjack) gets cells
  1.8x as big, so the stripes are the same on screen
  (`SHIRT_PATTERN_K`: the combat strips 2.0, the cook by his head, 3.33, and
  the fire-lighter 4.03 / 0.85 = 4.74, as his shirt layer is drawn 0.85 of his
  body, `FIRE_GEAR_REG`).
- **The print needs nothing:** it is fitted to each frame's chest
  (`chestBox`), as on the walking shirt.
- **Only for a shirt with a print or a pattern.** A plain coloured shirt keeps
  the shared strip and its tint, exactly as before, at no cost.
- **Your three gathering figures are baked behind the loading screen**, and
  again 0.4 s after the shirt changes (its print, pattern, colour or the shirt
  itself). The cook's shirt is one pinned garment (frame 22), so only it is
  baked.
- **A sword swing, a bow shot and other players' figures** are baked the first
  time they are drawn, the plain strip standing in meanwhile -- exactly as the
  walking shirt's own dressed copy is.
- **Memory:** `DRESSED_MAX` 10 strips are kept, the least recently drawn let go
  of first, each on the graphics chip only (`keepOnGpuOnly`).

## 7. The ore's crack and pop are never skipped

The ore vein's break animation lives 950 ms, and its end was checked before its
split frame. A frame that came more than 950 ms after the break began (a stall
right at the payout) let it go before the split was played: no ore popped out
and no crack was heard.

- `_advanceOreBreaks` now plays the split first, on whatever frame reaches it,
  up to `ORE_POP_LATE_MS` (3 s) after the break began. A tab back from the
  background minutes later does not crack out of nowhere.
- Found by `mp-nodelabels` on a test machine drawing about a frame a second.
  Timed on main and on this branch alike: every miss followed a gap of 981 ms
  or more, every crack a gap of 892 ms or less.

## What is still different, and why

- **The three stand-ins are different paintings.** Their style is the artist's;
  their size is now yours (section 5).
- **Eye colour** is not on mining, fishing or the stand-ins. Their sheets have
  no eye mask.
- **A cape** stays off the three stand-ins: a cape on a crouch hangs into the
  ground. Mining and fishing keep it.

## Tests

`mp-gatherlook`, on a phone in the Wheel. The test bro is dressed before he
exists: deep skin, a blonde flat-top under a red cap, a blonde beard, a green
tee, BLUE trousers and RED boots. It checks:

- **Standing:** the cap, beard, skin, trousers and boots are read off the frame
  drawn (guard).
- **Mining:** the cap and beard are drawn 1.116× their standing size against
  the body (`display._bodyScale`, published for this).
- **Fishing:** the cap and beard at 1.07×.
- **Fishing colours:** the frame drawn, read where the shipped sheet paints
  skin, trousers and boots, matches the standing frame's reading.
- **The line and rod:** the line is still grey and the rod still wood.
- **The stand-ins:** the lumberjack, the fire-lighter and the cook each read
  blue legs and red boots (`window.__btStandInClothes`, the bake's own reading,
  armed by `__btProbe`).
- **Their size:** the lumberjack's upright height and the fire-lighter's
  standing height within 3% of the walking figure's (`bodyFigureProbe`, in
  world px), and each head within 3% (the fire-lighter's, whose painting runs
  big in the head, 5%); the cook's head within 3%. Each from the figure's
  drawn scale (`__btChopFigure` and its siblings) times its art's own rows.
- **Their shirts:** the test bro wears a striped tee with a purple block
  printed on it. Each figure's shirt is drawn from its dressed strip from its
  first frame (`window.__btDressedShirt`: no plain frame), the stripes' yellow
  and the print's purple on it, and the stripes repeat within 15% of the
  walking tee's on screen (`window.__qaShirtRead`, with `__btTrimVerify`
  keeping the strips readable).
- **No page errors.**

`mp-nodelabels` checks the crack (section 7); `mp-cookpeer` and `mp-wvscale`
hold the new sizes on both screens.

Pictures: `tools/qa/mp/out/gatherlook-*.png`.
