# Armored-character session notes (layered steel armor, idle/jog scaling, waist belt)

Working notes from the long session that built + tuned the layered steel armor on
the player. Reads as **what we tried / what worked / what failed** so the next
session doesn't re-walk the dead ends. Current state ends at **v2.3.569**.

## Goal / setup
- Layered paper-doll armor: `chest=steelplate` (includes the helmet, `coversHead`)
  + `legs=steelgreaves`. Per-frame sheets at
  `public/sprites/gear/<slot>/<item>/<pose>-<dir>.png`, drawn by copying the body
  sprite transform (`_placeGear`).
- **The body is HIDDEN under the full set** — the armor *is* the character.
- 5 source dirs (south/east/north/northeast/southwest) cover all 8 via mirror.
- Poses: `stand` (idle, 1 frame), `jog` (20-32 frames).

## Pipeline (`tools/`)
- `make_pose_sheet.py` — green mannequin silhouette sheets for the user to draw armor on.
- `import_gear_from_sheet.py` — extract armor from the drawing (green-key, silhouette-fit to body, `scale_mul` bulk).
- `fill_gear_gaps.py` — bake the chain belt over the waist gap + black-fill enclosed holes (neck).
- `normalize_idle_width.py` — match idle gear body width to the BARE body (helmet preserved). **(final)**
- `derive_armor_scales.py` — derive the idle render scales (normalize armored height). **(final)**
- `scale_idle_helmet.py` — legacy helmet enlarger; NOT used in the final approach.
- `tools/posesheets/` — silhouettes, the user's `*-mannequin-armored.png` source art, `chainbelt.png`.

---

## AI-drift / body-peek  — RESOLVED
The AI-drawn armor doesn't perfectly trace the body per frame, so anything under it peeks past the plate edge.
- ❌ Pad/dilate the armor (`cover_drift`) — user rejected ("listen more carefully").
- ❌ Black-tint the body underneath instead of hiding it — still pokes at edges.
- ✅ **HIDE the body entirely** when the full `coversHead` set is worn
  (`spriteBody.visible = false`, both local + remote paths in `entityRenderer.js`).
  Nothing renders under the armor → no peek anywhere. Resulting waist/neck holes
  are black-filled by `fill_gear_gaps.py`.

## Waist belt — RESOLVED (many iterations)
The waist (user drew a green belt/brief) becomes a hole once the body is hidden.
- ❌ Nearest-armor-color fill — flickered (sampled color jumped per frame).
- ❌ Fixed figure-% black band + enclosed-hole fill — black region *pulsed* (gap opens/closes with the legs).
- ❌ Green-waist centroid anchor — jumped to the feet, vanished on side views, black showed above the chain.
- ❌ "Put the belt behind the character" — hid it behind the breastplate.
- ✅ **Chain belt** (user-provided `chainbelt.png`, recolored to steel) baked into the
  **chest sheet only where the chest is transparent** (the gap) → fills the gap, never
  overwrites the opaque arms (no clipping), stays visible. Anchored to **crown + median
  chest-bottom offset** (stable, no jitter), fixed band height.

## Scaling — the big saga, RESOLVED with automated normalization (v2.3.569)

### Root cause (finally measured)
Render scale was derived from the **bare body**, but the body is hidden and the
**gear** is drawn at sizes/aspects that vary independently. Measured on the build:
idle rendered heights spread **20%** (80-97px), idle rendered **taller than jog**
every facing, gear frame heights vary **209-249px**, body widths/aspect vary.

### What we tried — mostly FAILED / patches
- ❌ Bare-body crown-to-hip normalization — works for the bare body, but the gear varies independently, so the *armored* figure stays inconsistent.
- ❌ Per-direction hand-tuning of `BODY_DIR_SCALE` — endless whack-a-mole.
- ❌ `scale_idle_helmet.py` (enlarge idle helmets to match jog) — over-scaled; idle helmets are small relative to the body, so matching the helmet balloons the whole figure. User reverted N/NE.
- ❌ `STAND_WIDTH` render stretch (`scale.x` per dir) — widens the helmet too → distortion. User disliked.
- ❌ Full-height equalization (240 / gear-height) — "weird," because the art's aspect ratios vary, so normalizing height left widths inconsistent.

### What WORKED — automated, measured from the ARMORED sprites
Two reproducible normalizations (no hand-tuning):
1. **Height** (`derive_armor_scales.py` → `BODY_DIR_SCALE.stand`): every idle renders at
   ONE height (~86px = **1.063 x the MEDIAN jog height**, the validated
   standing-taller ratio; SW jog==idle gave 0.941). Uniform → no 20% spread;
   anchored to the jog → idle ~= jog. Manual tweaks: south x0.97, north x0.98.
2. **Body width** (`normalize_idle_width.py`, baked into the gear): each idle's body
   width scaled to the **bare body's** correct per-angle width (front wide, side
   narrow); **helmet kept at native width** so it never distorts. `STAND_WIDTH` stays 1.0.

Key insights:
- Measure the **armored figure** (the visible thing), not the bare body.
- Idle = clean pose → full height is reliable; normalize all idles to one target.
- DON'T match idle to jog per-direction — jog full height is **leg-spread-confounded**;
  anchor the uniform idle to the jog's **median** instead.

### Jog scales — kept as-is
`BODY_DIR_SCALE.jog = { south:1.0, east:1.181, north:1.05, northeast:1.126, southwest:1.0 }`
(validated/hand-tuned, incl. the north leg-spread nudge). Not re-derived: jog full
height varies with leg-spread (not character size), so re-normalizing re-introduces
the leg issues.

## Where things live
- `src/rendering/systems/entityRenderer.js` — `BODY_DIR_SCALE` (stand+jog),
  `STAND_WIDTH`, `bodyDirScale()`, and the body-hide logic (full set →
  `spriteBody.visible=false`; local ~line 2710, remote ~line 2178).
- `src/rendering/gearCatalog.js` — slots, `coversHead`, defaults
  (chest=steelplate, legs=steelgreaves), storage key `bt-gear-v2-*`.
- `src/rendering/gearSheets.js` — `GEAR_VERSION` cache-bust string.
- `tools/` + `tools/posesheets/` — the pipeline + source art.

## Residual / next steps
- Idle helmets are drawn a touch smaller than jog helmets in the art; **not**
  force-matched (user reverted). Figure height + body width ARE consistent.
- **Copper armor recolor** — proof done (greyscale colorizes cleanly to copper);
  queued, not shipped. Approach: bake a luminance→copper-ramp variant as a 2nd item.
- **Helmet/chest/legs segmentation** (separate equip slots) — discussed, viable via
  extraction bands; not built.
- Only the **idle** gear got the body-width normalization; if jog widths read off,
  apply the same to jog.
- Patches dropped but tools remain: `scale_idle_helmet.py` (unused),
  `STAND_WIDTH` values (all 1.0 now).

## Version trail (key milestones)
- Bare-body scale normalization: v2.3.537-544.
- Body hidden + gap handling: v2.3.550-560.
- Chain belt (user art) tuning: v2.3.558-563.
- User re-drew all idle sprites: v2.3.567.
- **Automated two-axis idle normalization (current): v2.3.569.**
