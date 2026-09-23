# World effects: time of day, air, dust, blood, the crumbling corpse (v2.3.2703)

Everything here is display only. Nothing is sent to the server, and nothing in combat reads it.

## Time of day — `src/game/timeOfDay.js`, drawn by `src/rendering/worldFx.js`

- **Clock:** one 40-minute day (`DAY_CYCLE_MS`), computed from wall-clock time. Every player sees the same hour without the server being involved.
- **Hours:** dawn, day, golden hour, dusk, night. Each hour is a keyframe with a colour multiplier (`mul`) and a light strength (`lamp`).
- **Night:** worldFx renders a small light map (a quarter of screen size) with the ambient colour plus every light in view, then multiplies the world by it.
  - Lights are your lantern (radius 165), other players' lanterns (radius 125) and fireflies.
  - By day the light map is skipped completely.
  - At golden hour it is a flat tint.
- **Where it applies:** outdoor zones only (`zoneHasSky`): town, meadow, ember, mist, verdant, frost, sky, radiant, farm. Caves, the foundry, the sanctum, the world map and dungeons keep their own light.
- **Layer:** the new `lighting` world layer (pixiApp.js). It sits above everything in the world and below the damage numbers and the world overlay, so night never makes a number harder to read.
- **Preview:** add `?tod=night` (or `dawn`, `day`, `golden`, `dusk`, or a number from 0 to 1) to the URL, or set `window.__btTod = 'night'` in the console. `window.__btTimeOfDay()` shows the current hour.

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

## The crumbling corpse — `src/rendering/deathCrumble.js`

- **Crumble:** on the first dead frame, the player's own display is rendered to a texture, so every worn layer is in it. It is read back once to find the body's real pixels and cut into flakes. The flakes let go from the head down, fall, and the breeze carries them off.
- **Skeleton:** 13 pixel-art bones (minted in `worldFxTextures.js`), scaled to that body, fade in underneath.
- **Collapse:** at about 1 s each bone becomes a small physics body with gravity, bounce, spin and ground friction.
  - Legs go first and the skull last.
  - Long bones tip over to lie flat and the skull rolls.
  - Hard landings kick up dust.
- **Removal:** the pile is removed on the first frame nobody asks for it, which is the respawn.
- **Fallback:** if it cannot draw, `death-v1.png` plays exactly as before.
- **QA:** `window.__btDeathSlow = 8` plays it in slow motion.

## Or you explode (v2.3.2705) — pick with `?death=explode`

This is the owner's alternative, and both styles ship behind one switch until the owner picks one.

- **Swell:** for 170 ms the body strains outward and shivers.
- **BOOM:** flesh flakes, all 13 bones and 12 spare bones blast outward and up in high arcs, spinning.
- **Screen shake:** the camera kicks (shake 26), and kicks again (5–9) as big pieces land, at most every 90 ms.
- **Landing:** bones bounce, skid, grip and lie strewn across the screen. They are tuned to land on screen, not three screens away.
- **Other players:** a friend exploding nearby shakes your screen a little (9).
- **Switch:** `window.__btDeathStyle` or `?death=explode|crumble`. The default is `crumble`. Making either one permanent is a one-line change to the default in `deathStyle()`.

## QA

- **`mp-worldfx`:** covers all of the above against a real worker (22 checks, including the explode style).
- **Harness defaults:** the harness pins every scenario to plain daytime with the drifting air off (`window.__btTod = 'day'`, `window.__btAmbienceOff = true`), so pixel tests don't depend on the clock. mp-worldfx turns the air back on itself.
