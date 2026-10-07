# The bro looks like himself while he gathers (v2.3.3145)

> The owner, 2026-10-07: *"The character's appearance changes during resource
> gathering activities. It needs to stay consistent. Fix this part."*

Five things changed how the bro looked the moment he started to gather. Each
is now fixed, and `mp-gatherlook` checks each on a phone.

| Activity | What changed before | Now |
|---|---|---|
| Mining | hair, hat and beard drawn ~8% too big for the head | sized to the head |
| Fishing | the painted orange skin, olive trousers and grey boots; hair, hat and beard ~18% too small | your skin, trousers and boots; sized to the head |
| Woodcutting (the lumberjack) | the painted olive trousers and grey boots | your trousers and boots |
| Cooking (the cook) | the painted olive trousers and grey boots; hair, hat and beard ~30% too small for his head | your trousers and boots; sized to his head |
| Lighting a fire (the fire-lighter) | the painted trousers and boots | your trousers and boots |

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
  - Since v2.3.3145: your trousers and boots too.

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

## What is still different, and why

- **The three stand-ins are different paintings.** Their proportions and style
  are the artist's.
  - The lumberjack is drawn about 25% smaller than your walking figure. His
    height, `CHOP_STANDIN_H` 104.5, is the owner's own choice: "+10%" in
    v2.3.2273, made after the walking figure's last resize.
  - The cook crouches, at `COOK_STANDIN_H` 65.1, also the owner's.
- **A shirt's print or pattern** is not on the stand-ins: they tint the tee.
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
- **No page errors.**

Pictures: `tools/qa/mp/out/gatherlook-*.png`.
