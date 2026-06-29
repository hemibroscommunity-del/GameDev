# Jog-legs-during-attack composite — techniques

How the bow-attack stand-in plays **jogging legs** under a **bow-aiming upper
body** while moving, without sliding feet, seams, ghost hands, or colour
artifacts. Written after a long iteration (PR #144) so the next person — and the
upcoming **armor upper/lower split** — can reuse what worked instead of
rediscovering it.

Core files: `src/rendering/systems/effectsRenderer.js` (`_updateBowShot`),
`src/rendering/jogWaist.js` + `src/rendering/bowTorsoCut.js` (generated tables),
`tools/build_attack_torso.mjs`, `tools/build_jog_legs.mjs`,
`tools/build_jog_waist.mjs`.

## The problem shape

The top half (bow-aim pose, 3 frames) and the bottom half (jog cycle, 20–28
frames) are **different art at different scales**. Naively compositing them gives
sliding feet, per-frame waist gaps/overlaps, ghost hands, and recolour mis-tints.
These are the techniques that fixed each, in dependency order.

## 1. Slice on the COLOUR CHANGE, per frame — not a fixed row

The waist is the **skin→pants boundary**. Detect it per frame as the median
*first-non-skin row* down the central belly columns; do NOT cut at a fixed row
(the run cycle bobs the body up to ~19 px, so a fixed cut leaks belly onto the
legs). The same detector runs on BOTH sheets so both halves cut at the same
anatomical line:
- `build_attack_torso.mjs` → erases the torso legs at that row, emits
  `bowTorsoCut.js` (the cut row per facing/frame).
- `build_jog_waist.mjs` → `jogWaist.js` (the leg waist row per facing/frame).

Geometry is **recolour-invariant**, so detecting once on the base sheet is valid
for every player's recolour. Verify the detector by overlaying its line on every
frame of the sheet (a magenta-bg dump) before trusting it.

## 2. Align by a SHARED waist line at ONE scale

Make the two halves meet by construction, every frame:
- Draw the legs at the **torso's** scale `s` (= `S._swordBodyH/188`), NOT the jog
  scale — one consistent figure size.
- Land the legs' waist row exactly on the torso's cut row:
  `yMeet = sp.y + (cutRow - cfg.feetY) * s`. Anchor the legs at their waist so
  that row sits on `yMeet`. The feet then land back at the foot-plant on their own
  (waist→feet distance matches), so the figure stays grounded.

## 3. Scale offsets, never hardcode world pixels

The local figure scale `_dscale` (`display.scale.y`) is **perspective-based**
(~0.3–0.6, varies with screen position). Any vertical nudge/lift must be
expressed in **frame px × `s`** (e.g. `_LEG_LIFT * s`), or it drifts as the player
moves. A fixed world-px offset looked right in one spot and broke elsewhere.

## 4. Erase the arms/hands from the leg sheet (skin AND outline)

Below the waist a body is only pants+shoes (never skin), so the jog fists that
dip below the waist are erasable: erase every **skin** pixel, then flood the
connected **black outline** (bounded dilation into dark pixels) — the outline is
what remained and read as a "ghost hand". `build_jog_legs.mjs` bakes
`jog-<dir>-legs.png`; the renderer recolours them through the SAME
`_loadRecoloredBody` pipeline the bow body uses (rebakes on skin/pants/shoes
change), keyed by movement dir.

## 5. Match the recolour pipeline's EXACT colour tests

`recolorBodyToCanvas` classifies skin **before** pants:
`_isSkin = r>g && g>=b && r-b>30 && r>90 && r-g>25`, pants =
`g>=r-10 && g>b+8 && r<150`. When you bake or synthesize pixels, test against
these EXACT predicates. A "pants" colour picked with a looser test got retinted to
**skin** on some frames → a skin-coloured rectangle flashing at the waist. Pants
and skin are mutually exclusive here (`r-g>25` vs `g>=r-10`), so sampling strictly
within the pants predicate is safe.

## 6. Draw the lower half OVER the upper half, then LIFT to cover the seam

Drawing legs UNDER the torso means the torso's horizontal cut clips them and its
straight edge shows on angled runs. Instead draw the legs **over** the torso/chest
(still under the weapon so the bow stays in hand) and **lift** them a few frame-px
(`_LEG_LIFT * s`) so the real, shaded pants drape over the torso's bottom edge and
hide the seam.

**Do NOT synthesize a flat fill to cover gaps.** An earlier "pants-fill rectangle"
baked above the waist caused, in sequence: a transparent **barcode** (per-column
copy left gaps), a **skin flash** (recolour mis-tint, see §5), and a visible
**rectangle** once the legs were on top. The real lifted pants cover the seam with
correct shading and none of that. Prefer real art + geometry over painted fills.

## 7. Verify with a faithful preview — alignment is scale-invariant

I cannot run a moving bow-shot here, and my eyeball on fine pixels is unreliable
(the owner is the visual authority). What IS trustworthy: a Node compositor that
stacks the real sheets at the renderer's **exact** scales/anchors/positions and
dumps a PNG. Seam alignment is **scale-invariant** (both halves scale by `s`
together), so a static preview at any representative `_dscale` faithfully shows
whether the waists meet — that's how each fix was checked before pushing. An
early preview that reconstructed the WHOLE scene (with the wrong `_dscale`/frame)
was NOT faithful and misled us; keep previews minimal and aligned to the code
under test. Final sign-off is always the branch preview URL on device.

## Gotchas

- Cache-bust on every baked-art change: `BOW_ART_VERSION` (torso strips),
  `JOG_LEGS_VERSION` (leg sheets), `SPRITE_VERSION`/`GEAR_VERSION` as relevant.
- `_jdir` (movement dir, the 5 source dirs) keys the leg sheet; `fmap[0]` (bow
  facing) keys the torso. They can differ — don't conflate them.
- Diagonal facings (`southwest`/`northeast`, which cover SE/NW by mirror) lean,
  so their waistline is diagonal; a small per-facing leg enlargement helps there.
