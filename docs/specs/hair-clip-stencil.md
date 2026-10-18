# The hair clipped by the stencil, not in a pass of its own (v2.3.3409)

The owner, 2026-10-18: *"I'd like you to iterate on what best improves
framerate without loss of quality (or negligible loss) for phone gameplay
(iPhone, android)"*. After draw-lists.md, sheen-batch.md, one-batch.md and
shadow-prepass.md.

## What was wrong

Hair is cut to the silhouette of what is worn over it, so it cannot poke out:

- a hat that `clipsHair` (31 of the 40 hats: caps, helmets, beanies...),
  v2.3.364 (entityRenderer.js `_clipHairToHat`);
- a cape's hood, v2.3.2186;
- the same on the swing, bow, chop, cook and fire stand-ins, v2.3.1776.

Each did it by making a sprite of the silhouette the hair's **mask**. In Pixi a
sprite mask is an *alpha mask*, and an alpha mask is a **filter**
(AlphaMaskPipe, MaskFilter): every frame, for every figure wearing one, the
graphics chip stopped drawing the frame, drew the hair into a picture of its
own, and went back to the screen to draw it multiplied by the silhouette.

On a phone's tile-based chip (every iPhone, most Androids) each such stop writes
the half-drawn frame out to main memory and reads it back in (TRAPS §221 for
the metal shine, §223 for the shadows). One stop for you in a hat, one more for
every hatted or hooded player on the screen.

## What changes

A mask that is any other container is Pixi's **stencil** mask
(StencilMaskPipe): its contents are drawn into the stencil buffer only, in the
frame's own pass, and the hair is drawn where the stencil is set. No picture
of its own, no stop.

- The silhouette sprite is put in a box of its own (`hairClipBox`) the first
  time it clips anything, where it stood among the figure's children, and the
  box is the hair's mask (hairClip.js `clipHair`, every place that clipped the
  hair).
- The silhouette is drawn by a batcher that keeps its opaque part only
  (`CLIP_BATCHER`: Pixi's own batch program, a fragment whose silhouette is less
  than half there discarded).
- **Which batcher draws it is the silhouette's own answer.** Three routings
  already decide a sprite's batcher where it meets the batch pipe (the colour
  numbers', the sharp pixels'), each wrapping the one before, and the innermost
  has the last word -- a wrapper added after them is overruled (the sharp pixels
  send every figure part to 'sharp'). So a sprite's batch element answers its
  `batcherName` itself: for a clipping silhouette, `CLIP_BATCHER` (an accessor
  on `BatchableSprite`, defined at module load). TRAPS §224.
- While a box clips, Pixi leaves it out of the figure's own drawing
  (`includeInBuild` false); when it clips nothing, it is put away (`renderable`
  false): Pixi hands a stencil mask back to be drawn as an ordinary child, the
  white-dot trap of v2.3.2923's grip hole.
- The shadows' caster walk skips a box that is clipping (casters.js): its
  silhouette is shown, but only into the stencil.
- The stand-ins' head set (yours, shared by the swing, bow, chop, cook and fire
  figures) changes layer with the figure that owns it each frame
  (effectsRenderer `_placeSkillTraitsOn`): a boxed silhouette now travels in
  its box (`clipBoxOrSelf`). Moved alone it would have been drawn as itself --
  a white hat -- and left the hair clipped to an empty box. A silhouette found
  outside its box all the same is boxed again where it stands, and the box is
  destroyed with its silhouette.
- A peer's swing and bow stand-in sets, destroyed when they leave, now destroy
  every trait: the cape's two halves and both silhouettes had been left behind,
  hidden in the layer, one set a peer (since v2.3.1776 and v2.3.2190), and a
  silhouette's box would have joined them.
- `?alphaclip` is the alpha mask, as it was; `window.__btHairClip()` the probe,
  `window.__btHairClipStencil(on)` the live switch (QA).

## The same line

The alpha mask multiplied the hair by the silhouette's `a * r` (MaskFilter; the
silhouettes are white, so `a` squared), smooth over the one texel the
silhouette's edge is sampled across. The stencil keeps the hair where that is
at least half: the cut falls on the same line and is crisp instead of a
one-texel blend, about one device pixel at the hat's edge on a 3x phone.

## Measured

See the PR (`mp-hairstencil`).

## How it is checked

- `mp-hairstencil`: the bro in an afro under the army helmet, then under the
  crimson cape's hood; one held frame drawn the new way, with the alpha mask
  (the live switch) and the new way again; the picture differs only at the cut,
  inside the head's box; the screen bound once less a frame; the bro's shadow as
  many pieces either way.
- `mp-hairclip` (the stand-ins' clip) and `mp-capehair` (the hood) read the same
  probes, which now say "clipped" for the stencil's box too.
