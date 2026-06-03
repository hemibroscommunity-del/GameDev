# Layered Gear System — Spec

Paper-doll equipment for the sprite-frame player: each gear piece is a transparent
sheet sharing the body's exact frame layout, stacked at render time. Works for armor
*and* cloth; modular (drop in a sheet to add an item); no per-frame anchor/angle data.

The key invariant: **a gear frame is pixel-aligned to the body frame it sits on.**
Because of that, the renderer draws the gear with the *same transform as the body
sprite* — nothing else.

---

## 1. Asset format & layout

```
public/sprites/gear/<slot>/<itemId>/<pose>-<dir>.png
```

- `slot`: `legs`, `chest`, `shoulders` (head stays in the existing headwear system).
- Each `<pose>-<dir>.png` is a horizontal sheet of 256x256 frames, **same frame
  count and order** as the body's `public/sprites/player/<pose>-<dir>.png`.
  Frame *i* of the gear aligns pixel-for-pixel with frame *i* of the body.
- Base dirs only: `south, southwest, east, northeast, north`. `west / northwest /
  southeast` are horizontal mirrors generated at load (exactly like the body).
  Asymmetric pieces (e.g. one-shoulder pauldron) ship all 8 instead of mirroring.
- Fully transparent except the gear pixels. Pre-colored (dye is optional, see §3).
- Poses: match the body — `stand, jog, hit, pickup, attack`. A piece may omit a
  pose; renderer falls back to hidden for that pose (or to `stand` frame 0).

Per-item `meta.json` (minimal):
```json
{ "slot": "chest", "mirrorable": true, "dye": false }
```

---

## 2. Renderer

New module `src/rendering/gearSheets.js`, mirroring `playerSkins.js`:

- `getGearFrame(slot, itemId, pose, dir, frameIdx) -> Texture | null`
  - Lazy-bake per `(slot,item,pose,dir)`: load the sheet, slice into 256px frame
    Textures (same code as `buildBodySheet`), cache. Return null while loading /
    if missing (caller hides the slot).
  - `linear` scaleMode + mipmaps, same as body, for clean GPU downscale.
- `prewarmGear(slot,itemId)` for the spawn pose, to avoid a first-frame gap
  (same pattern as `prewarmBody`).
- Optional dye: `getGearFrame(..., tint)` recolors a flagged region via the shared
  brightness-ratio retint (`recolorBodyToCanvas` style), cache keyed by tint.

In `entityRenderer.js`:

- **Creation** (in `createPlayerDisplay` + `createOtherPlayerDisplay`, right after
  `spriteBody`): one Sprite per slot — `_gearLegs`, `_gearChest`, `_gearShoulders`
  — `visible=false`, added to the container in z-order:
  `body -> legs -> chest -> shoulders -> [existing hair/headwear/weapon]`.
- **Update** (where `getBodyFrame` is called and `spriteBody` transform is set —
  local ~L2620, remote ~L2065): for each equipped slot,
  ```js
  const tex = getGearFrame(slot, itemId, pose, dir, frameIdx);
  if (tex) {
    s.texture = tex;
    s.x = spriteBody.x; s.y = spriteBody.y;
    s.anchor.copyFrom(spriteBody.anchor);
    s.scale.copyFrom(spriteBody.scale);   // carries bodyScale AND mirror sign
    s.visible = true;
  } else s.visible = false;
  ```
  That's the whole placement. Mirror, per-dir body-size bumps, bob — all already
  baked into `spriteBody`'s transform, so the gear inherits them for free.
- **Fallback**: missing frame -> slot hidden that frame. Never blocks the body.

Cost: a few Sprites + lazy bakes per player. Negligible.

---

## 3. Equipment state & sync

- Game state: `equip = { legs: id|null, chest: id|null, shoulders: id|null }`.
- MP: broadcast in the presence payload next to `skin/pants/shirt` (short keys,
  e.g. `eqc/eql/eqs`); remote players carry their ids -> `getGearFrame` for them.
  Same plumbing as the shirt fields.
- Precedence on the torso: **chest gear hides the procedural shirt** (armor over
  shirt). Legs gear hides the pants recolor region where it covers.

---

## 4. Offline extraction tool — `tools/extract_gear.py`

Turns a "character wearing the gear" generation into a transparent, body-aligned
gear sheet. Two modes; **prefer mode A** because it makes extraction trivial and
reliable.

### Mode A (recommended): paint-on-base (img2img / inpaint)
Generate the gear *onto the exact base body frames* (`<pose>-<dir>.png`) via
img2img/inpaint, so the base body is preserved and only gear pixels are added.
Then per frame:
```
diff   = |wearing - base| summed over RGB
gearM  = diff > THRESH            # changed pixels = gear
gearM  = despeckle(gearM, MIN_BLOB)        # drop AA/noise specks
out    = wearing where gearM else transparent
out    = despill 1px AA fringe at the mask edge
```
No alignment needed — the frames are already registered.

### Mode B (fallback): independent generation
The wearing-it animation was generated separately (not pixel-aligned). Per frame:
1. **Register** wearing -> base: search a small (dx,dy[,scale]) window, maximize
   silhouette alpha-IoU (or minimize SSD on the body region). Apply the transform.
2. Diff + despeckle as in Mode A.
3. Flag frames whose best IoU < confidence floor for manual review.
Less reliable; use only if Mode A isn't available.

### Tool details
- Input: a folder of wearing-it sheets matching the base `<pose>-<dir>` layout
  (or video -> frames via the existing extraction step), + per-piece config
  `{ slot, thresh, min_blob, region_mask? }`.
- `region_mask` (optional): restrict kept pixels to the torso / leg band so the
  diff can't pick up incidental face/hand differences.
- Output: `gear/<slot>/<item>/<pose>-<dir>.png` (same frame layout) + manifest row.
- **Validation**: composite the extracted gear over the base body for sample
  frames (reuse the renderer's "copy body transform" rule offline) and eyeball —
  the same offline-verify loop used for the shirt. Bump `GEAR_VERSION` for cache
  busting.

---

## 5. Why this beats the alternatives here

- **vs procedural recolor**: encodes real shape/detail/deformation; no fragile
  pixel segmentation; armor can have its own silhouette.
- **vs rigid-anchor + rotation**: no rotation (pixel-art rotation = jaggies), no
  per-frame angle data, and it handles cloth too. Each frame is real art.
- **Modularity**: pieces never interact; add one by dropping a sheet; stack any
  combination; one sheet works over any skin tone (the layer has no skin pixels).

## 6. Decisions to nail before building

1. **Generation alignment** is the crux — commit to Mode A (paint-on-base) so
   extraction is a clean diff. This is the single biggest risk.
2. Frame counts MUST match the body sheet per pose/dir (the generator must emit
   the same N frames; else resample/align).
3. Mirror vs full-8 per piece (symmetry).
4. Torso precedence (chest armor vs procedural shirt) and the dye story.
