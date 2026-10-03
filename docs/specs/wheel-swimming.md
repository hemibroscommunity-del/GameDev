# Swimming in the Wheel (v2.3.3003)

> Owner, 2026-10-03: *"I'm thinking you can add swimming and just use the
> characters head poking out of the water plus code effects to make it look
> like swimming and change the movement behavior"*.

## Where you can swim

- **Every river, pond, lake and oasis**: the fresh water.
- **The sea's shallows**: the lighter shelf drawn round every coast, about
  `SHALLOW_CELLS` (5) cells out.
- **The shore's blur**: land cells the walk grid used to count as water.
- **Not the open sea** past the shallows. It is still a wall, because it is
  what keeps the spokes apart. Swimming across it would skip every pass and
  keystone gate the plan lays out.

`public/tools/world/core/ground.js` `swimBits(bp, mm, seed, walk)` decides
this, one bit per blueprint cell:

- It only ever opens cells that `walkBits` shuts.
- A cell counts as shallows when its distance to the shore (land and fresh
  water count as shore, capped at `SHORE_CAP`), plus `SHALLOW_WANDER` times the
  same noise, is under `SHALLOW_CELLS`. This is the test `waterLook` uses to
  draw the shallows, read at the cell's middle with composeGround's seed, so
  you swim out exactly to the line you see.
- The whole map takes about 150 ms, done once in the ground worker.
- The worker sends it as `walk.swim` beside `walk.bits`.
- `wheelTrial.js` `lazyGrid` opens those cells to the walk test.
- Bridges are plank decks you walk on. A river cell under a deck is already
  open, so a swimmer can climb out onto a bridge from its side, like out onto
  a jetty.

`?noswim` in the address closes every drop of water again, exactly as before
(`wheelSwimOn`).

## When you are swimming

`src/game/wheelSwim.js` decides, once a frame, before the walk:

- It looks at the ground **drawn** under your boots: five spots round them,
  each the piece's own pixels every 3 game px (`wheelTrial.wheelWaterAt`).
- You start swimming when 4 of the 5 are water (`SWIM_IN`), and stop at 1 or
  fewer (`SWIM_OUT`). The gap between the two stops a walk along the shore
  from flickering in and out.
- **A teleport** (a respawn, the way in) changes it at once and silently.
  Without that, drowning in a pond would splash you out onto the town square.

It reports what happened, and `BroTown.jsx` carries it out:

- `'in'`: the splash sound, the shield drops, and any attack in flight ends,
  the same way raising the shield ends one.
- `'landed'`: the same, without the splash.
- `'out'`: the drip sound.
- `'stroke'`: one stroke's sound.

## How you move

| | |
|---|---|
| speed | `SWIM_MULT` 0.55 of your walk |
| strokes | one every `STROKE_MS` 650 ms at a full stick; speed rises and falls ±`SWIM_SURGE` 15% through each, averaging 0.55 |
| glide | your direction through the water eases toward the stick, keeping `SWIM_GLIDE` 0.9 of it each 60fps frame: about 0.16 s to ease in, and ~15 px of drift when you let go |

- The glide *replaces* the step rather than adding to it, so it is never
  faster than your walk. This avoids the ice slide's 2x mistake (BroTown
  v2.3.1402).
- The worker's move bound never sees anything new. Its speed is still within
  your walk's.

Measured by `mp-wheelswim` from the game's own per-frame speed:

- 0.53–0.55 of the walk;
- strokes swing between 0.85 and 1.15 of that;
- a 14–16 px drift after letting go.

## No fighting in the water

Only your head is out of it, so these are all refused:

- swing, special and Element Burst (`playerActions.js`);
- abilities (`abilities.js`);
- the roll (`dodge.js`);
- the shield (`shieldToggle.js`);
- the auto-swing of an engaged fight (`monsterCombat.js`).

A held attack also lets go (BroTown). Each refusal is `combatHelpers.swimRefused`,
which says **"Swimming!"** over your head, no more often than every
`NOTE_MS` (1.2 s). The special and shield buttons hide while you swim.

Monsters do not know about the water: the worker has no map of it. They can
follow you in and hit you there. Swim out to fight back.

## The look

`src/rendering/swimFx.js` runs after the depth pass and before the lights.

**The figure:**

- It sinks until its **neck** is at the water's surface, the ground point it
  swims at. `entityRenderer.figureSwimLine` gives the neck row, measured per
  pose and facing off the bare body sheets.
- A mask cut there (a Graphics child of the figure) hides the rest.
- Wading in takes `SINK_MS` 320 ms and climbing out `RISE_MS` 240 ms, so you
  wade rather than pop.
- The head bobs with each stroke, or slowly while you tread water.

**Drawn on the water** (`groundSplatter`, under every figure):

- a foam ring round the neck: its back half sits behind the head, its front
  half along the cut;
- the head's shade on the water, toward the lower right;
- your body as a dark shape under the surface: hanging below you while you
  tread, trailing behind you as you swim;
- a V of wake;
- ripples, each a light crest with a dark trough, so they show on both the
  light shallows and the deep blue. They spread from every stroke, every
  ~160 ms as you swim, and every second as you tread.

**Drawn over it** (`gestureFront`):

- each stroke's splash, at one side and then the other (the arms);
- a burst of drops going in or coming out.

**Other players** are drawn swimming by the same test at their own boots, so
nothing new goes over the wire.

A swimmer carries `_swimK`, how far under it is. `lightfx/casters.js` and
`glint.js` skip such a figure: no shadow and no armour shine under the water.

The pass costs about 0.1–0.3 ms a frame on the QA box.

## The sounds

All are recordings already in the game, the fishing ones in `SFX_MANIFEST`.
Nothing new and nothing synthesised.

- **Strokes**: two slices of the fish thrashing on the hook, and the lure's
  plop. One plays each stroke, never the same one twice running.
- **Going in**: the catch's splash, at twice a step's level.
- **Coming out**: the plop.
- **Levels**: each slice was brought to footstep-v3's loudness, measured the
  `PROP_SOUNDS` way (loudest 50 ms, plain and A-weighted), so
  `SWIM_STEP_VOL` 0.15 is a step's own level.
- **Footsteps** are silent while you swim: `worldTrial.footstepSurface`
  returns `'swim'`, and `BT_AUDIO.footstep` notes it and plays nothing.
  `footstepSurface` now reads the ground at your boots rather than the
  body's centre, which heard the ground ~52 px ahead when walking north.
- `loadGroundSteps` also asks for the three samples, so a quick dip before
  the manifest has loaded is not silent.

## Tests

- **`test-world-core`, "the water's pictures":**
  - swimBits opens only water the walk grid shuts;
  - it opens every river, pond, lake and oasis, except cells under a bridge's
    deck, which are walked on;
  - it never opens the open sea;
  - it gives the same answer every time;
  - the drawn shallows/sea line and the swim line agree at 1615 of 1624
    coastal water cells.
- **`test-world-core`, "swimming":**
  - the probes and the in/out gap;
  - 'in' happens once, carrying the walk's direction in;
  - strokes average to `SWIM_MULT`;
  - the glide is never faster than the stick, and drifts and stops;
  - the note is throttled;
  - 'out' happens once;
  - a teleport in gives `'landed'` and a teleport out gives no event;
  - nothing happens outside the Wheel;
  - the sounds are the manifest's.
- **`mp-wheelswim`** (30 checks, on a phone-sized page against a real worker):
  - into a pond off its bank, only the head out, with a splash;
  - 0.55 of the walk, in strokes, a glide, no footsteps;
  - no swing, roll or held attack, with "Swimming!";
  - out again whole, with a drip;
  - the open sea's line stops the boots;
  - another player is drawn swimming;
  - no page errors.

  Pictures are in `tools/qa/mp/out/wheelswim-*.png`.
- **`mp-wheelshore`** now runs with `?noswim`: its rule (a wall of water meets
  the boots) is the open sea's, and every water's with swimming off.

## Not done (could come next)

- Monsters that swim, or that stop at the water's edge. Only the worker can
  decide either, from a copy of this map.
- A breath meter or diving. The old tidal zone has both; the Wheel has
  neither.
- Peers' stroke sounds: you hear only your own.
