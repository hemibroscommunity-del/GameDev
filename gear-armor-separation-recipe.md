# Armor-separation recipe (green-mannequin → per-slot gear)

How we turn one ChatGPT-armored pose sheet into clean, body-aligned **chest** and
**legs** gear layers, plus every dead end we hit and why the final approach wins.
Companion to `gear-layer-spec.md`. Pilot direction: **northeast jog** (the
hardest 3/4 view). Shipped in `GEAR_VERSION` 2.3.616 → 2.3.625.

---

## TL;DR recipe

1. **Source art.** Start from the green-mannequin armored sheet
   `tools/posesheets/jog-<dir>-mannequin-armored.png` — a flat green (`#00AA46`)
   body on magenta (`#FF00FF`), full plate painted over it, built by
   `make_pose_sheet.py` so it shares the body's exact grid/crop/scale.
   **The source has NO chain skirt** — the chain belt was a later post-process
   (`refit_jog_belt.py`/`chainbelt.png`), not drawn by ChatGPT. Don't prompt for one.

2. **Separate with ChatGPT, one slot at a time.** Hand ChatGPT the sheet and ask
   it to keep ONLY one slot's armor (e.g. chest+arms+gauntlets) and paint
   everything else back to flat green `#00AA46`, preserving the grid, poses,
   positions, and magenta background. Remove the helmet (bald head is the design).
   Save as `...-mannequin-torso.png` / `...-mannequin-legs.png`. Prompts live at
   the bottom of this file.

3. **Ingest with `aligned=1`** (the key flag — see "Importer" below):
   ```
   python tools/import_gear_from_sheet.py \
     tools/posesheets/jog-northeast-mannequin-torso.png \
     chest steelplate jog northeast 50 0.0 0.72 0.22 1 1.0 0 0 1
   #                                  thr ymin ymax head dropskin smul cdrift stab ALIGNED
   ```
   Legs: same but `legs steelgreaves ... 0.40 1.0 ... 1`.

4. **Preview exactly as the game renders** (the preview tool mirrors the renderer
   pixel-for-pixel):
   ```
   python tools/preview_armor_frames.py --dir northeast --pose jog \
     --chest 1 --legs 0 --head 0 --zoom 2 --out /tmp/ne-chest.png
   ```

5. **(Optional) chain belt over the waist gap.** A full chest+legs suit leaves a
   bare-hip gap at the waist. Bake the chain belt into the **chest** sheet, then
   strip the full-stride black backing:
   ```
   python tools/fill_gear_gaps.py   jog northeast --no-enclosed  # chain + waist-band backing only
   python tools/refit_jog_belt.py        northeast               # fixed-width centred belt
   python tools/strip_belt_shadow.py jog northeast               # remove any inter-leg black void
   ```
   `fill_gear_gaps` lays `chainbelt.png` across the body-opaque/chest-transparent
   waist band with a black backing (so the chain reads solid, not see-through to
   the masked-away body). **`--no-enclosed` is required** on the body-aligned
   sheets: the default also black-fills *enclosed* pockets (e.g. the trailing-
   arm/leg armpit gap), but the masked-body renderer shows the body there, so the
   fill just paints a black blob. `strip_belt_shadow` replaces the old
   `remove_belt_backing` — its erosion-2 opening missed the small enclosed
   triangle on the clean sheets; the new pass uses erosion-1, below the chain,
   confined to the inter-leg gap.

   **Front/back views (e.g. south) use `--band` instead.** There's no inter-leg
   gap to fill — the legs are together and the waist is a thin horizontal strip —
   so the gap-fill belt lands on the thighs or vanishes. `--band` lays the chain
   as a full **horizontal band worn over the waist** (anchored to a fixed 0.46
   figure-height waist fraction — *not* `seam_off`, which the hanging gauntlets
   drag down to the thighs — and confined to the hip run sampled just below the
   band so it never crosses the arms/hands):
   ```
   python tools/fill_gear_gaps.py jog south --no-enclosed --band
   ```
   (No `refit`/`strip` needed for `--band`.)

6. **Bump `GEAR_VERSION`** (`src/rendering/gearSheets.js`) + `package.json`,
   `npm run build`, commit, push.

---

## Architecture (two halves, kept in lockstep)

The body sheet has **bare** skin/pants/boots; gear is a separate transparent
layer drawn with the body's transform. Two pieces of code do the work and **must
stay identical** (one runs in-game, one validates offline):

- **Importer** `tools/import_gear_from_sheet.py` — green-keys the armor out of the
  source sheet and writes `public/sprites/gear/<slot>/<item>/<pose>-<dir>.png`.
- **Renderer** `entityRenderer.js` `_maskedBodyFrame()` — at draw time, masks the
  body under the worn plate, restores the head/neck, and blends the bare "ghost
  hand" into the pants. Mirrored exactly by `preview_armor_frames.py`
  `_blend_ghost_hand()` / `composite()`. **If you touch one, touch both** and
  keep the magic numbers in sync (they're commented "keep in sync").

---

## The problems, in the order we hit them — what we tried, what worked, why

### 1. Splitting chest vs legs
- **Tried first:** one full-armor sheet split by a figure-relative Y-band
  (`ymin_frac`/`ymax_frac`). **Failed** — the band is fragile; the helmet baked
  into E/NE/SW art bled in; required endless pixel heuristics (helmet remnants,
  ear-vs-grate, hand clipping).
- **What worked:** separate at the **source** — ChatGPT erases the unwanted
  armor (it's far better at *removing* a region than our post-hoc masking).
  Re-ingest each clean single-slot sheet through the existing pipeline.

### 2. Head detached / "floating" above the torso (v2.3.617)
- **Cause:** the body-mask erases body under the dilated plate. The cuirass has a
  V-neckline; the dilation (4px) closed that narrow neck gap and punched the
  neck out, so the head floated and the top looked clipped.
- **Fix that worked:** after punching, **restore the head+neck band** — redraw
  the body for rows `[0, neckY]`, `neckY = figureTop + 0.33·figureHeight`
  (`NECK_RESTORE_FRAC`). The plate (a separate sprite) still draws on top of the
  torso; the neck shows through its opening.
- **Gotcha:** the "missing head chunk" reported later was NOT this — it was a
  throwaway palette-preview script that skipped the restore step. The shipped
  pipeline removes **zero** head pixels (verified).

### 3. Ghost hands — the bare fist poking past the gauntlet
The body's bare fist showed past the armored gauntlet in some frames (worst in
the tucked-arm crouch frames 5/8/12). Long road:

- **Tried: bigger mask dilation** (6/9/12px). **Failed** — the trailing fist
  hangs far from any plate; dilation can't reach it and erodes the silhouette.
- **Tried: erase bare-skin below the neck** (v2.3.618). **Failed badly** — it ate
  the legs. The body wears *shorts*: torso + upper thighs are bare skin, only the
  lower legs are pants. The fist and the thigh are the **same color, same height,
  and connected**, so no color/Y-band/connectivity rule can separate them.
- **Tried: connected-components, keep skin reaching the feet.** **Failed** — a
  fist touching the thigh joins the leg component and survives.
- **Root cause (the real one):** the importer re-fit the *armored* silhouette
  rigidly to the torso band, which drifts the independently-swinging extremities
  — the gauntlet slid off the fist. Frame 0 landed right; 5/8/12 didn't.
- **Fix that worked: align at the source (`aligned=1` import).** The mannequin
  sheet is drawn *over* the body, so each figure is congruent to it. See below.

### 4. Importer `aligned` mode (v2.3.619) — the alignment fix
- **Tried: fixed-crop inverse map** (exact reverse of `make_pose_sheet`).
  **Failed** — ChatGPT doesn't keep each figure perfectly inside its cell, so the
  fixed crop was offset (that's why `detect_figure` exists at all).
- **What worked:** per frame, **detect** the figure blob (absorbs ChatGPT's
  per-cell drift), **scale it to the body's per-frame bbox height**, and place it
  by maximizing **full-silhouette overlap** with the body (NOT just the torso
  band) — so arms/hands register too. Skips the global IoU scale, the
  spike-rejection placement, and the horizontal swing-stabilization (all of which
  were for the old misaligned workflow and actively *hurt* a congruent source).
  Result: gauntlets land on the fists in **every** frame; the only bare skin left
  is the legitimate hip/thigh.

### 5. Blending the leftover hip/fist into the pants (v2.3.620)
Even aligned, a little bare hip/fist skin shows below the cuirass (and the chain
belt isn't always there to cover it). The user's spec: recolor it to the pants
shade where it's over the leg (no transparent hole), erase what pokes beyond the
leg outline, drop the dark outline.
- **First version: olive-specific hue test** + default-olive fallback.
  **Worked for default, failed for versatility** — any other pants color got a
  wrong-colored patch.

### 6. Versatile patch color (v2.3.621) — match the color picker
Pants/skin are player-chosen (`PANTS_CATALOG`/`SKIN_CATALOG`, recolored into the
body texture at load). Patch must match.
- **Tried: classify skin by a fixed orange hue** (`R-G>35`). **Failed** — olive
  pants are *also* `R>G>B`; pale/dark skins don't match a fixed orange.
- **What worked: sample the actual body.** Skin tone from the **head**
  (`[figureTop, neckY]`), pants from the **upper leg**, shoes from the **foot
  band** — all read off the already-recolored texture, so it's correct for any
  picker choice AND remote players. Classify the fist by **hue-alignment** to the
  sampled skin (`score = (p·T)² / |T|²`). Patch with the sampled pants color.

### 7. Pale skin + contrasting pants still leaked (frames 5–7) — two bugs (v2.3.624)
- **Bug A — contaminated pants sample:** the big pale fist sat *inside* the
  pants-sampling band, dragging "pants" toward skin so the test couldn't separate
  them. **Fix:** exclude skin-toned pixels (cosine-to-skin > 0.985) from the
  pants sample.
- **Bug B — the margin rejected pale skin:** the fist test required skin to beat
  the others by `1.05×`. Bright/desaturated pale skin scores almost as high to
  the **gray boots** as to skin (~1.02×), so it failed. **Fix:** drop the margin
  — **strict argmax** (the fist is skin when skin is the *most* hue-aligned of
  skin/pants/shoes). Cleanly separates pale-fist (→skin) from gray-boots (→shoes).
- Also lowered the blend's waist start `0.50 → 0.45` so the waist/hip skin (the
  chain-belt zone) is caught too.

### 8. Pants-colored ring around the shoes (v2.3.625)
- **Cause:** with contrasting palettes, individual gray boot pixels flipped to
  "skin" under argmax and got recolored to pants — a ring on the shoes.
- **Fix:** detect the fist **only between the waist and the shoe band** (the hand
  swings at the hip, never at the feet), and **despeckle** the fist mask
  (4-connectivity, drop blobs < 20px) to kill stray boot/edge misclassifications.

---

## Key parameters (all in `_maskedBodyFrame` / `_blend_ghost_hand`, keep in sync)

| Constant | Value | Meaning |
|---|---|---|
| cover-mask dilation | `4` px | erase body this far past the plate edge |
| `NECK_RESTORE_FRAC` | `0.33` | restore body `[top, top+0.33·h]` = head+neck |
| waist start | `0.45·h` | blend only below here |
| shoe band | bottom `0.18·h` | shoes sampled here; fist NOT detected here |
| pants band | `[waist, waist+0.40·h]` | where pants color is sampled |
| skin-exclusion (pants sample) | cosine-to-skin `< 0.985` | drop fist pixels from the pants sample |
| fist test | **strict argmax** of `score=(p·T)²/|T|²` over skin/pants/shoes | no margin |
| fist region | `[waist, shoeTop]` | hip only, never the feet |
| despeckle | drop blobs `< 20` px, 4-conn | remove stray misclassifications |
| dark-outline pickup | `R,G,B < 85`, within `2` px (Manhattan) of fist | recolor/erase the fist's outline with it |
| leg silhouette | per-row span of non-fist body, `±2` px | over-leg ⇒ recolor; beyond ⇒ erase |

## Importer CLI (`import_gear_from_sheet.py`)
```
<png> <slot> <item> <pose> <dir> [thresh=50] [ymin_frac=0] [ymax_frac=1]
  [head_frac=0.22] [drop_skin=1] [scale_mul=1] [cover_drift=0]
  [stabilize=1] [aligned=0]
```
- **`aligned=1`** for body-aligned green-mannequin sheets (the new workflow):
  detect + per-frame height-scale + full-silhouette overlap placement; skips the
  global IoU scale, spike-rejection, and swing-stabilization.
- `stabilize`/`cover_drift`/the IoU scale are **legacy** (old misaligned art).
  Leave them off (`... 0 0 1`) for aligned sheets.

---

## What's done / what's next
- **Done:** NE chest, validated across default/orange/blue+pale/white/gray/purple
  + deep/ebony skins. Head intact, gauntlets aligned, hip/fist blended to pants,
  clean boots.
- **Next:** roll the two prompts across south/east/north/southwest and the
  `stand` pose (same flow, `aligned=1`; chest band `0.0 0.72`, legs `0.40 1.0`).
- **Belt:** re-added over the NE waist via `fill_gear_gaps` → `refit_jog_belt` →
  `strip_belt_shadow` (step 5). Run this per direction after ingesting chest+legs.

---

## ChatGPT prompts

**Chest (torso + arms + gauntlets):**
> This image is a sprite animation sheet: 16 frames of a running character on a
> flat magenta (`#FF00FF`) background, in a 5-column grid, left-to-right,
> top-to-bottom. The body is a flat solid green (`#00AA46`) mannequin with steel
> plate armor painted over it — helmet, chest plate, shoulder pauldrons, arms,
> gauntlets, and leg armor.
>
> Edit every frame to keep only the upper-body armor, leaving everything else as
> the bare green mannequin:
> - KEEP: the chest/torso plate, the shoulder pauldrons, both arms' armor, and
>   the gauntlets/hands.
> - REMOVE the helmet — show the plain bald green mannequin head underneath.
> - REMOVE all leg armor (greaves, knees, boots) — show the plain green legs.
>
> Rules you must not break:
> 1. Wherever you remove armor, paint that area back to the same flat green
>    (`#00AA46`) body — not magenta, no hole. The full green silhouette must stay
>    intact, same shape and position.
> 2. Do not move, resize, rotate, or re-pose the character in any frame. Keep all
>    16 frames in their exact grid cells.
> 3. Keep the magenta (`#FF00FF`) background exactly as-is outside the body.
> 4. Keep the steel armor's existing colors, shading, and pixel detail — only
>    erase the listed parts.
> 5. Output the full sheet at the same dimensions and grid layout as the input.

**Legs (greaves + boots):** same sheet and rules; KEEP only the leg armor
(greaves/shin guards, knee plates, thigh plates, armored boots on both legs);
REMOVE the helmet, chest plate, pauldrons, arms, and gauntlets — bare green head,
torso, and arms.
