# snow-footprints-strip.png — raw, NOT yet wired (v2.3.2652)

A footprint pair pressed into snow, fading out over four frames. Delivered by
the owner alongside the frost decor; **nothing renders it yet.**

## Geometry, measured

| | |
|---|---|
| Strip | 2172×724, four frames, an even split at **543×724** each |
| Ink per frame | ~390×390, centred in the frame |
| Alpha trend | mean 229 → 225 → 221 → 211 across the four — it is a **fade**, played once, not a loop |
| Raw cost | 6.00 MB decoded RGBA |

## What it is for

`docs/DEPTH-ROADMAP.md` §7 (grounding) and `docs/ART-ASSET-PHASES.md` Phase 2.
The game currently has **no grounding cue at all**: the shared contact-shadow
ellipse was removed at v2.3.2632 because it looked worse than nothing, for the
structural reason that a symmetric blob agrees with no map's baked light.
Terrain reaction is the path that does not need a light direction, and a
footprint is the cleanest example of it.

## Before it ships

- **Size it down.** A footprint pair wants roughly 30–40 world px across. At
  the 2–2.5× texture-to-world ratio §4 derives, that is ~96 px per frame —
  a 384×96 strip, ~0.14 MB decoded, against 6.00 MB raw.
- **Register the loader.** Footprints follow the player everywhere, so this is
  GLOBAL art: it registers in `preloadWorldAnimations`, not
  `preloadZoneAssets` (CLAUDE.md's preloading law; the ZONE-ASSET EXCEPTION
  only covers art a single zone uses).
- **Decide the trigger and the budget** — every Nth footfall, a cap on live
  decals, and a lifetime. `spawnGroundDecal` (`src/game/combatHelpers.js`)
  already exists and is the natural home.
- **Snow only, or everywhere?** These are snow prints. Dirt and grass want
  their own art, or a tint, or the system stays frost-scoped.
