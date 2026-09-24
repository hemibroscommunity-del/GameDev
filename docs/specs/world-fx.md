# World effects: time of day, air, dust, blood, and death (v2.3.2712–2717)

Everything here is display only. Nothing is sent to the server, and nothing in combat reads it.

## Time of day — `src/game/timeOfDay.js`, drawn by `src/rendering/worldFx.js`

- **Clock:** one 40-minute day (`DAY_CYCLE_MS`), computed from wall-clock time. Every player sees the same hour without the server being involved.
- **Hours:** dawn, day, golden hour, dusk, night. Each hour is a keyframe with a colour multiplier (`mul`) and a light strength (`lamp`).
- **Lengths (v2.3.2892):** day ~28.7 min, golden hour 2.4, dusk 2, night 2.9, dawn 4. Night was ~11.6 min; the owner asked for a quarter of that, and the time went to day.
- **Top bar clock (v2.3.2892):** a small sun / low sun / horizon / moon icon sits left of the zone name (`TodIcon` in ZoneHeader.jsx, `data-tod` names the hour). Indoors and in dungeons it is dimmed, since the hour still passes but the world ignores it.
- **Night:** worldFx renders a small light map (a quarter of screen size) with the ambient colour plus every light in view, then multiplies the world by it.
  - Lights are your lantern (radius 165), other players' lanterns (radius 125) and fireflies.
  - By day the light map is skipped completely.
  - At golden hour it is a flat tint.
- **Plates and monsters stay readable (v2.3.2715):**
  - Every visible name plate and monster health bar gets a nine-slice softbox of light in the light map. Its bright middle covers the plate exactly, so the plate reads at its daytime colour.
  - Every monster gets a cool moonlight glow, with its full part sized to the body, so a snowman on night snow stands out.
  - Both share one falloff (v2.3.2716, owner: "tighter … and a soft dispersion … too cut out"). It is full over the object, drops steeply just past its edge, then a faint tail fades to nothing over about 40 CSS px: `0.82·e^(-t/0.07) + 0.18·(1-t)²`.
  - Both are found through the entity renderer's display maps and measured with getBounds.
- **Where it applies:** outdoor zones only (`zoneHasSky`): town, the world map (v2.3.2716), meadow, ember, mist, verdant, frost, sky, radiant, farm. Caves, the foundry, the sanctum and dungeons keep their own light. On the world map, lanterns shrink with the figures (`zonePlayerScale`).
- **Layer:** the new `lighting` world layer (pixiApp.js). It sits above everything in the world and below the damage numbers and the world overlay, so night never makes a number harder to read.
- **Preview:** add `?tod=night` (or `dawn`, `day`, `golden`, `dusk`, or a number from 0 to 1) to the URL, or set `window.__btTod = 'night'` in the console. `window.__btTimeOfDay()` shows the current hour.

## Props at night (v2.3.2717)

- **Painted lights become real lights.** The lamps, torches, forge fire and lit windows painted into the town props now light the night. Each is placed where the art draws it, as a fraction of the sprite (`PROP_LIGHTS` in worldFx.js), so it follows a scaled or flipped prop.
  - Flames flicker, lamps barely, windows not at all.
  - Flames and lamps also get a small halo at the source itself, drawn in the `glows` layer above the night, so the source shines rather than just being lit.
- **Moonlit wash:** every prop, including frost's pines and rocks, gets a soft moonlit wash so it doesn't sink into the dark.
- **Fireflies:** each is a soft ball of light with a 7 px pixel-art bug at its heart (`FLY_ART`). It beats its wings and faces the way it drifts. Fireflies live in the `glows` layer, above the night.
- **Sun shadows (light-and-shine):** the sun shadows from light-and-shine fade out through dusk and back in at dawn under an open sky (`lightFx.js`). A sun shadow at midnight would be a shadow of nothing.

## Air

`ZONE_AIR` in worldFx.js sets each zone's air:

- **Motes:** pollen in the green zones, spores in mist, embers in ember, blowing sand in the dunes, glints in radiant, snow in frost.
- **Fireflies:** the green zones swap their pollen for fireflies at night.
- **Cloud shadows:** drift across outdoor zones by day.
- **Fog:** low fog at dawn in the green zones.
- **Wind:** everything drifts on one shared breeze (`windAt`).

## Dust prints

- **What:** one print about every 17 px of travel, alternating feet, placed at the feet (42 px below the body's position; see `FEET_DY`). A light puff is kicked up every other step.
- **Fade:** after about 0.4 s the breeze slides each print away, spreads it and thins it out. It is gone at 1.3 s.
- **Who:** you and every other player you can see.
- **Colour:** set per zone. The print is a darker shade of the zone's dust and the puff is the dust colour itself.
- **Frost:** keeps its own snow prints. The water caves have no prints.

## Blood — `queueBlood` (worldFx.js), called from `gameEvents.js` on `monster_attack`

- **Tier:** set by that hit's damage as a share of the victim's max HP.

  | Share of max HP | Tier | Drops |
  |---|---|---|
  | ≤ 10% | tiny | 4 |
  | 11–32% | moderate | 11, plus a mist |
  | ≥ 33% | heavy | 24, plus a mist and a mark on the ground |

- **Direction:** away from the attacker's position (the same point the camera kick uses).
- **Flight:** drops leave from the chest, fall with gravity, and some leave marks on the ground that fade over 6.5 s.
- **Who:** your own hits and hits on other players you can see. Blocked and dodged hits don't bleed.

## Death: crumble, then explode — `src/rendering/deathCrumble.js`

The owner looked at both v2.3.2713 styles and picked "the skin crumbles off … then explode" (v2.3.2714). There is one death, in four beats:

1. **Crumble:** on the first dead frame, the player's own display is rendered to a texture, so every worn layer is in it. It is read back once to find the body's real pixels and cut into flakes. The flakes let go from the head down, fall, and the breeze carries them off.
2. **Stand:** a 13-bone pixel-art skeleton (minted in `worldFxTextures.js`), scaled to that body, fades in underneath.
3. **Shiver:** from 0.86 s the skeleton rattles harder and harder.
4. **BOOM:** at 1.08 s, every bone and 12 spares (hidden in the ribcage until then) fly up and out in high arcs, spinning. Any flakes still clinging go too.
   - The camera kicks (shake 26), and kicks again (5–9) as big pieces land, at most every 90 ms. A friend's explosion nearby shakes your screen a little (9).
   - The bones bounce, skid, grip and lie strewn across the screen. They are tuned to land on screen.
   - Long bones lie flat and the skull rolls.

- **Removal:** the bones are removed on the first frame nobody asks for them, which is the respawn.
- **Fallback:** if it cannot draw, `death-v1.png` plays exactly as before.
- **QA:** `window.__btDeathSlow = 8` plays it in slow motion.

## QA

- **`mp-worldfx`:** covers all of the above against a real worker (22 checks).
- **Harness defaults:** the harness pins every scenario to plain daytime with the drifting air off (`window.__btTod = 'day'`, `window.__btAmbienceOff = true`), so pixel tests don't depend on the clock. mp-worldfx turns the air back on itself.
