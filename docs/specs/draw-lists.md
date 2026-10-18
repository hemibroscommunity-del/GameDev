# Each world layer keeps its own draw list (v2.3.3359)

The owner, 2026-10-18: *"I'd like you to iterate on what best improves
framerate without loss of quality (or negligible loss) for phone gameplay
(iPhone, android)"*.

## What was wrong

Pixi (the drawing library) keeps, for each *render group*, a list of what to
draw and in what batches. When something in a group changes in a way it
counts as *structural*, it throws that list away and rebuilds it next frame:
it walks the group's whole tree and adds every sprite to a batch again.

Since v2.3.3079 the world is one render group and the screen (the HUD) another.
`mp-phoneframe`'s probe (below) found **both rebuilt every single frame**, in
BroTown and at a fight, by things like:

- **~25 shapes wiped every frame** (`Graphics.clear()`), most of them empty
  before and after: the screen's damage flash and atmosphere, the
  telegraphs, the smithing sparks, the ground's portal glows, the projectile
  layer... Pixi's `GraphicsPipe.validateRenderable` answers "rebuild" for any
  small shape whose content reported a change, and `clear()` always reports
  one. In a fight, two more per monster on screen (health bar and plate).
- **the depth sort re-keying everything that walks.** Its key is a ground line
  rounded to the pixel, so a walking monster's key changes nearly every frame,
  and Pixi's `zIndex` setter marks a re-sort and a rebuild whenever a key
  changes, even when the order has not.
- dust puffs, footprints, the buildings' sparks and smoke shown and hidden,
  ground pieces streaming in.

Any one of them rebuilds the whole world: the ground, every tree and building,
every figure. (The same day v2.3.3339, chasing the owner's "around 30fps to
40ish fps" with `mp-frameprofile`, stopped the SCREEN's list being rebuilt by
its own empty shapes, one call site at a time -- effectsRenderer
`clearIfDrawn`, TRAPS §208. The world's list was still rebuilt every frame.) `docs/MEMORY-PLAN.md` had sized it ("0.4-1.2 ms a frame ...
stopping the triggers one by one cannot win") and held it back because a group
under the camera was thought to shift edge pixels. That was before the world
itself became a group (the camera already on the GPU), so it no longer holds.

## The four changes (each with its own off switch)

1. **Every world layer but `shadows` is its own render group** (pixiApp.js
   `buildScene`; `?nolayergroups` to compare). A change in a layer rebuilds only
   that layer's list. Each layer sits at the world's origin unscaled, so its
   group draws with the world's own camera matrix, the same numbers in the
   same order: **the same picture to the pixel** (`mp-layergroups`). `shadows`
   stays in the world's list (it is drawn through a filter and hardly changes).
2. **Wiping a shape that is already empty is no change** (quietClear.js;
   `?loudclear` to compare). An empty Graphics context (no shapes, no
   half-drawn path, its transform at rest) is left alone by `clear()`. A shape
   with something in it is wiped exactly as before.
3. **The depth sort stores a new key quietly while the order holds**
   (depthSort.js `applyGroundSort`; `?zindexall` to compare). The keys are
   worked out first; if the children already stand in key order, Pixi's
   stable sort would leave them where they are, so the keys go into the
   setter's own field (`_zIndex`) without marking anything. When the order has
   changed, every key goes through the setter and Pixi sorts, as before.

4. **A layer draws with the world's own camera numbers** (layerUniforms.js;
   `?layerpush` to compare). Pixi draws a render group inside another by
   pushing a fresh set of the shared uniforms (the camera's matrix, the tint,
   the target's projection and size) and popping them after; a push is a new
   uniform group, so every program the layer draws with uploads the numbers
   again, and the pop marks the outer set changed, so the next program uploads
   them once more. A layer's numbers ARE the world's, so a layer whose push
   would set exactly what is bound (the matrix by value, the tint, the same
   target) is drawn with what is bound, and a layer with nothing in its list
   is skipped -- in BroTown 16 of the 22 groups a frame are empty. The same
   numbers reach the same programs: **the same picture to the pixel**
   (`mp-layergroups` draws one held frame both ways). The group's matrix is
   read once a frame: Pixi's getter keeps nothing for a second read and a push
   would then inherit the parent's matrix (TRAPS §218).

And the ground's black background (tileRenderer.js `bgGfx`, the same two
rectangles every frame) is drawn again only when what it draws changes.

### A switch read as a sprite is packed

A sprite is packed into its batch when its layer's list is built, and again
only when it changes in a way Pixi tracks (it moves, its picture or tint
changes). Two live test switches are read at that moment: the form shade's
`window.__btShadeOff` and the sharp pixels' `window.__btSharpOff`, each
flipped by a test to take the same frame with and without. They used to show
on the next frame only because everything was rebuilt every frame; now a
still sprite would keep its old look. So each is a `liveSwitch`
(`src/rendering/drawLists.js`): the batcher reads a plain field (no `window`
lookup a quad), and a flip marks every render group for a rebuild, so the
next frame is drawn with it, as before. `window.__btRebuildDrawLists()` does
the same by hand. The game itself sets everything such a read depends on
(`_vShade`, `_vShadeKids`, `_noSharp`) when it makes a sprite, before it is
first drawn (the stand-ins' marks, formShade.js `markStandIns`, run before
`app.render` in the same frame).

One read can change without its sprite changing: the form shade colours each
piece of a character by where it sits in the figure's head-to-feet span, read
off the figure's body reference, which is invisible -- a new frame on it packs
nothing again. So `refreshFigureShades` (formShade.js), once a frame before
the draw, packs a figure's pieces again whenever that span has moved (Pixi's
own update, no rebuild; nothing when it has not). It is a guard: the checks
below never caught a stale span, with it or without it.

Two tests took their before/after pictures live, a moment apart, and were
fooled by what happened in between: `mp-formshade` now takes the shade on and
off in one held frame (in Verdant a slime's LUNGE! warning had come up over
the player's head between the two, which read as "the head is shaded more
than the legs"), as `mp-sharppixels` already did.

## Measured

`mp-phoneframe` side by side, a phone page (390 x 844, drawn at 1x density so
this box's software graphics keep up), 3 rounds each, no profiler or census
running (`BT_PF_ROUNDS=3 BT_PF_PROFILE=0 BT_PF_SDC=0 BT_PF_DPR=1`). Changes 1-3
and the background, against `BT_PF_AB='nolayergroups&loudclear&zindexall'`:

| | now | before |
|---|---|---|
| BroTown, walking: Pixi's drawing a frame | 1.52 ms | 1.80 ms |
| Flame Fields fight: Pixi's drawing a frame | 2.15 ms | 2.72 ms |
| BroTown, walking: the frame's work (mean) | 4.27 ms | 4.45 ms |
| Flame Fields fight: the frame's work (mean) | 5.11 ms | 5.68 ms |
| draw calls a frame (BroTown / fight) | 49.6 / 74.1 | 47.3 / 70.2 |

Change 4 on its own, against `BT_PF_AB='layerpush'`:

| | now | Pixi's push and pop |
|---|---|---|
| uniform uploads a frame (BroTown / fight) | 28 / 31 | 44 / 46 |
| Pixi's drawing a frame (BroTown / fight) | 1.58 / 2.27 ms | 1.72 / 2.37 ms |

The one list's own uploads were 28 / 31: with the camera numbers shared the
layers cost none. What the layers do cost is a few draw calls, as a batch now
ends at each layer's edge, and a buffer upload a layer that changed. What is
still rebuilt each frame is small layers (a monster's health bar redraws its
own `monsterUi` layer).

## How it is checked

- `mp-sharppixels`, `mp-formshade`, `mp-liveness`, `mp-sheen` flip the two
  live switches and compare frames (the first failed before the switches
  rebuilt every list).
- `ridersort` (a server suite: the depth pass on stand-ins that model Pixi's
  `zIndex` accessor over `_zIndex`): a sort whose order holds stores every key
  and marks nothing for a re-sort; one whose order changed marks the layer.
- NOTHING STALE (`mp-layergroups`): just arrived in the Wheel, in BroTown and
  at a fight, every draw list rebuilt by force -- every quad packed again, as
  the old code did every frame -- changes no pixel of the held frame.
- `mp-layergroups` (22 checks): the layers are groups and the switches turn
  the first three off; **the same held frame with every layer back in the
  world's one list is identical to the pixel**, in BroTown and at a fight, and
  so is the same frame with every group's uniforms pushed and popped as Pixi
  does (most layers drawn with the world's numbers, the empty ones skipped);
  after every frame of a walk the two depth-sorted layers stand in key order,
  most sorts quiet; the world's and the screen's own lists no longer rebuilt
  every frame.
- `mp-phoneframe` is the measuring tool: per scene the frame's cost by stage,
  the page's main-thread time a second, a CPU profile mapped to the source
  (`QA_DIST=dist-prof`, a build made with
  `npx vite build --minify false --sourcemap --outDir ../dist-prof`), the WebGL
  calls a frame, the draw list's batches, and every rebuild with its cause.
  `BT_PF_AB` and `BT_PF_VARIANTS` compare address switches.

## Not in this change

- The batches themselves: a fight's frame has ~68, the drawing program
  switching between the three batchers (everything, the characters' sharp
  pixels, the Wheel's colour numbers) at almost every one. Next.
- The GPU's share. This box draws in software; the colour-numbers shader
  (`paletteTex.js`, eight reads a pixel) is the biggest drawing cost here
  (`?nopalette` draws a 3x frame ~30% faster in software), which is the
  memory trade the owner chose in v2.3.3190: a phone's chip reads far faster
  than software does, so what it costs there is not measured.
