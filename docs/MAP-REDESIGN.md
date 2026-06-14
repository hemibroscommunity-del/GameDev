# Bro Town — Map Redesign: Maps, Sizes & Level Bands

**Status:** working design reference for the map redesign. Built from the
*current code* (source of truth) + the parts of the GDD the owner confirms are
current (element identities, zone names, visual/lore flavor). The GDD's
structural "66-zone, 8-depth-tier" model and its 16×16→176×176 size table are
treated as stale early-thinking and are NOT used here.

## Element model (corrected)
- **Each zone has ONE primary element. There are no secondary elements** (the
  GDD §14.2 "Secondary" column is dropped per owner).
- Canonical elements + emotional aspect (GDD §33.1, still current): Flame=Rage,
  Frost=Grief, Water=Memory, Venom=Betrayal, Storm=Chaos, Stone=Defiance,
  Wind=Loss, Flora=Yearning, Dark=Fear, Light=Truth, Eclipse(Dark+Light)=Wholeness.
- **Storm is the electric element.** Owner is considering re-theming its zone
  (Thunder Peaks) as a **futuristic / metallic / electric** land. Lore aspect
  stays "Chaos"; the *visual* skin becomes machinery/neon/metal.
- World stays **hub-and-spoke** (town center, spokes reachable from town),
  difficulty by a **radial, no-scaling gradient** (monster level fixed by
  position), zones **banded** so players converge by level (50-player density).
- Player cap is now **60** (`MAX_PLAYERS=60`, lobby `SOFT_CAP=50`).

## The maps (14 total)

Sizes are practical, capped at the 2048px art ceiling (tiles × 32px). Bigger maps
at higher tiers for combat room; small/safe maps stay small. Palettes for
existing zones are the *current code* values (`src/data/zones.js`).

### Safe / hub
| Map | Element | Level | Size (tiles → px) | Theme / palette |
|---|---|---|---|---|
| **Town** | none (safe) | hub | 48×48 → 1536 | warm welcoming baseline `#4a6741` |
| **Starting Meadow** | none | 1–10 | 40×40 → 1280 | gentle green `#3d6b2e` |
| **Your Farm** | none (personal/instanced) | safe | 30×25 → 960×800 | sunlit grotto `#4a7a3a` |

### Overworld elemental spokes (8 — one map per element, banded)
| Map | Element (aspect) | Level band | Size (tiles → px) | Theme / palette |
|---|---|---|---|---|
| **Frozen Shore** | Frost (Grief) | 8–25 | 48×48 → 1536 | coastal ice, cool blue-grey `#5a6a7a` |
| **Tidal Caves** | Water (Memory) | 8–25 | 48×48 → 1536 | flooded sea caves, deep blue `#2a4a5a` |
| **Verdant Wilds** *(NEW)* | Flora (Yearning) | 22–40 | 48×48 → 1536 | overgrown floral jungle, lush green |
| **Mistwood** | Venom (Betrayal) | 22–40 | 48×48 → 1536 | swamp/poison, murky green `#2a4a2a` |
| **Desert Winds** | Wind (Loss) | 38–58 | 56×56 → 1792 | desert dunes, pale `#6a7a8a` (GDD name "Sky Reaches") |
| **Deep Hollows** | Stone (Defiance) | 38–58 | 56×56 → 1792 | underground caverns, near-black `#3a3a3a` |
| **Thunder Peaks** | Storm (Chaos) | 55–80 | 64×64 → 2048 | electric → **futuristic/metallic** re-theme, violet `#7a5aaa` |
| **Ember Fields** | Flame (Rage) | 55–80 | 64×64 → 2048 | volcanic, hostile red-orange `#a04020` |

### Endgame
| Map | Element (aspect) | Level | Size (tiles → px) | Theme / palette |
|---|---|---|---|---|
| **Shadow Sanctum** | Dark (Fear) | 81–90 | 64×64 → 2048 | near-black violet `#1a1a2a` |
| **Radiant Heights** | Light (Truth) | 81–100 | 64×64 → 2048 | golden `#ccc060` |
| **The Convergence** *(NEW)* | Eclipse (Wholeness) | 91–100 | 64×64 → 2048 | dual dark/light coexisting |

**New maps to build (not in current code):** Verdant Wilds (Flora) and The
Convergence (Eclipse). All others exist today and are re-themed + re-banded.

## Direction diagram (schematic — really radial from the town hub)

```
                       NORTH · high level · the summit
   ┌──────────────────────────────────────────────────────────────┐
   │              ☼ RADIANT HEIGHTS (Light)  81–100                 │
   │   ◆ SHADOW SANCTUM (Dark) 81–90      ✦ THE CONVERGENCE 91–100  │
   ├──────────────────────────────────── endgame ─────────────────-┤
   │   🌋 EMBER FIELDS (Flame)            ⚙ THUNDER PEAKS (Storm     │
   │      55–80                              → metallic) 55–80      │
   ├──────────────────────────────────── band 4 ───────────────────┤
   │   ⛰ DEEP HOLLOWS (Stone)            🏜 DESERT WINDS (Wind)      │
   │      38–58                              38–58                  │
   ├──────────────────────────────────── band 3 ───────────────────┤
   │   ☠ MISTWOOD (Venom)                🌸 VERDANT WILDS (Flora)   │
   │      22–40                              22–40                  │
   ├──────────────────────────────────── band 2 ───────────────────┤
   │   ❄ FROZEN SHORE (Frost)            🌊 TIDAL CAVES (Water)     │
   │      8–25                               8–25                   │
   ├──────────────────────────────────── band 1 ───────────────────┤
   │        🌳 STARTING MEADOW 1–10    ·    🏘 TOWN (hub)            │
   │                ⛏ Your Farm (personal grotto)                  │
   │        ~~~~~~~~ COVE / SHORE — you wash up here ~~~~~~~~        │
   └──────────────────────────────────────────────────────────────┘
                       SOUTH · low level · arrival
                            ~~~~~~ OCEAN ~~~~~~
```

- Two elements share each band → an **element choice** at every tier (and a
  counter-element consideration), without doubling content per level.
- ~3-level seam overlaps between bands so there's always a valid "next" zone.
- The schematic is vertical for readability; mechanically it's hub-and-spoke
  (every spoke reached from town, difficulty rises with distance/depth).

## Open decisions / notes
1. **Summit theme vs leveling.** The art mockup paints fire + ice at the summit.
   In the leveling structure the true endgame is **Dark/Light/Convergence**;
   Ember (fire) sits in the high band near the summit (fits the volcano), but
   Frozen Shore (ice) is an *early* coastal zone. So the snowy upper mountain is
   visual, while the ice *gameplay* zone is low-level — unless we deliberately
   add a separate high-level ice zone. Owner call.
2. **Storm → metallic** is a re-skin of Thunder Peaks (and could fold in the
   "metal hatch / underground" idea); element stays Storm.
3. **Banding numbers** here supersede the illustrative ones in PR #62
   (frost+tidal 8–28, ember+mist 25–48, thunder+hollows 45–68, sky 65–82). Sync
   `src/data/zones.js` + `server/src/index.js` to this table when locked.
4. Sizes are proposals capped at 2048px; tune per zone after a combat-density
   pass (Phase 2).

## How this maps to the build
- Re-theme/re-band existing zones = data + new background JPEG per map (art via
  the ChatGPT pipeline, ≤2048px). Add Verdant Wilds + Convergence as new `ZONES`
  entries + `IMAGE_ZONE_MAPS` art.
- Visual direction (GDD §1.1, current): textured HD pixel art; elemental identity
  through **material/emissive, not color overlay**; element VFX as a swappable
  layer; per-zone palette deviates from the town's warm baseline.
