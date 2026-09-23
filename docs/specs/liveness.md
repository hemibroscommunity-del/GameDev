# Liveness: the world's small motions, and the bag's (v2.3.2751–2755)

> Owner: "I'm looking for a liveness pass. Basically making things move a
> little in a way that makes sense for whatever object it is. Maybe a tree
> swaying a bit, etc. this includes items in the player inventory and the
> inventory itself. From ambient effects to subtle animations that enhance
> the experience."

## What moves

| Thing | How it moves | Where |
| --- | --- | --- |
| Gather trees (every zone), frost pines and shrubs | sway from the foot in the shared wind (`windAt`), each a damped spring with its own period; gusts roll across a stand of trees downwind | worldLife `_updateTrees`, `_updatePropSway` |
| A tree you chop | the trunk shivers, the spring is kicked away from the axe, needles fall | effectsRenderer stamps `node._lifeChopAt` on the strike frame |
| Frost's near-camera canopies | bob about the edge they hang from (the cut edge stays off the map) | `_updateCanopies` |
| Hanging signs, banner, scales, coin crate | swing like pendulums, heavy ones slower | cut pieces, `_stepParts` |
| Flags (mayor ×2, bank ×2, auction house) | wave from the pole, faster in a stronger wind | `MeshPlane`, `_stepParts` |
| The forge | smokes from its chimney (the painted smoke was cut out), sparks from the chimney and the flames | `SMOKE`, sparks |
| Flames and lamps on buildings | flicker by day (by night worldFx's lights take over) | `PROP_LIGHTS` (worldFx) |
| The mayor's waterfalls, lion and fish | light streaks run down each fall; foam at the foot | `FALLS` |
| Gold on the bank (and the mayor's, the auction house's) | glints now and then | `glints` in `src/data/propParts.js` |
| NPCs standing still, monsters that stopped | breathe | `_updateBreathing`; entityRenderer publishes `display._idlePose` |
| Coins on the ground, ore veins | glint | `_updateGlints` |
| Bag items | one at a time: potions slosh, raw fish flop, herbs sway, food hops, metal/gems/gear glint; logs and bones lie still | `src/ui/mobile/dash/bagLife.js`, game.css `bt-life-*` |
| The bag | a new item pops into its slot with a brass ring; a growing stack bumps its count; a tapped tile gives under the finger | same |
| The item card | its portrait presents the item when it opens, then lives like it does in the bag | ItemDetailPopup `.bt-card-art` |
| The purse | the coin spins when gold lands | ZoneHeader `.bt-purse-flip` |

## The building pieces

`tools/cut_prop_parts.py` cuts the moving pieces out of the four town
buildings (the originals stay untouched as its input) and writes:

* `public/sprites/props/<name>-still.png` — the building without them, same
  canvas and size (worldProps points at these now);
* `public/sprites/props/prop-swing@2x.png` — the swinging pieces, stored 2×
  and drawn linear so they stay crisp while they rotate;
* `public/sprites/props/prop-flags.png` — the flag cloths, 1× nearest, so a
  wave steps in whole texels like pixel-art cloth;
* `src/data/propParts.js` — generated: each piece's rectangle, where it sits
  on its building, its hang point or pole, and the gold's glint spots.

A piece is found by flood-filling from a seed inside it, kept inside a box and
stopped by cut lines drawn where it meets the building. Along the edge it
hangs from it OVERLAPS the building by two texels (TRAPS §109). Run with
`--debug DIR` to get each building's outline picture; look at it after any
change.

The pieces ride a container that stands on the building's own ground line
(+1 px, the TRAPS §104 rule) and lives in its layer, so the depth pass puts a
sign behind you exactly when it puts its building behind you. Off camera, a
building's effects are not simulated.

**To add a moving piece:** add its spec to `SPECS` in the tool, re-run it,
give its swing an entry in `SWING` (worldLife.js) if the default does not
suit, and extend `mp-liveness` (the piece list is read from propParts.js, so
the at-rest and moving checks pick it up by themselves).

## Rules

* Display only. A sway is skew about the sprite's own bottom-centre anchor, so
  the ground point — depth sort, footprints, hit-tests — never moves (the QA
  scenario holds a tree's foot to 0.00 px).
* The bag follows LANTERN-SLATE-SPEC's motion law: nothing loops. One
  scheduler plays one short one-shot on one visible tile every ~2 s; transform
  and opacity only, on a tile's children (never its box); no filter,
  drop-shadow or background-clip over the WebGL canvas (TRAPS §42).
* Everything is loaded or minted on the loading screen (`preloadWorldLife` in
  the preload manifest).
* Off switches: `window.__btAmbienceOff = true` (the QA harness sets it for
  every scenario) stills the world with every piece at rest, and stamps
  `html.bt-calm` so the bag's press feedback goes quiet too. The bag also
  honours the OS reduced-motion setting. For filming, `window.__btLifeRate`
  slows the world's motion clock and `window.__btLifeFrames` steps it one
  fixed tick per frame (tools/qa/mp/shot-liveness.mjs).
* Probes: `window.__btWorldLife()` (sway, parts, riders, effect counts,
  breathing), `window.__btBagLife.stats()` / `.poke(key)`.

## Verified

`tools/qa/mp/mp-liveness.mjs` (51 checks): every piece present and at rest
under calm, riding its building's layer; every piece moving when live; smoke,
sparks, flicker, water, glints, breathing; frost pines/shrubs/canopy sway,
the canopy's hang point fixed, a tree's foot fixed, a chop shivering the trunk
and dropping needles, the ore glinting; the bag's motion kinds, arrival pop,
stack bump, a tile's box unmoved while its art moves, the scheduler, the purse
coin, and silence under both the calm switch and reduced motion.
