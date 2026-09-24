# Sharp character pixels and the tee's shoulder line (v2.3.2768–2743)

> Owner: "The characters shoulder outline on idle south is very thick and I
> think it's the result of keyed changes on the shirt, not the original art.
> The character also looks soft compared to the art he's wearing like sword or
> shirt. That's probably a result of lower res textures to save memory, but is
> there an enhancement you can do for that?"

## The shoulder line (v2.3.2769)

* **Cause:** measured on stand-south, the tee is drawn one texel inside the
  body's silhouette along the shoulder tops and sides. The body's black outline
  (column 48, row 43) and the tee's keyline (column 49, row 44) sit side by
  side, so they read as one line twice the normal weight.
  `seal-shirt-edges.mjs` never touched it: it only writes inside the tee's
  bounding box, on purpose (v2.3.1995).
* **Fix:** `tools/gear/hug-shirt-silhouette.mjs`. Where the tee's edge has 1–2
  texels of the body's dark outline beyond it and then empty space, the tee's
  edge is shifted out onto that outline. The result is one line at the true
  silhouette.
  * It works on the sheets as they ship, and a second run finds nothing to change.
  * Openings (neck, cut-out arm) and other parts' edges are protected, and the
    tee never overhangs the body.
  * `jog-east` is left alone: it is pinned to the artist's pixels by
    `mp-shirtarm`.
* 352 texels changed across 8 stand and jog sheets. `GEAR_VERSION` and the
  preview's `SHIRT_ART_VER` were bumped.

## Sharp pixels (v2.3.2770)

* **Cause, measured with `window.__btSelfSprites()` (v2.3.2768):** the body and
  clothes are 128px textures (`DISPLAY_DS = 2`, the v2.3.1408 iPhone memory
  fix), drawn at about 2.6 device pixels per texel on a 3x phone. The GPU's
  linear filter blends each texel across all of that. The sword is a 256px
  texture at about 1.3x, which is why it looks sharper.
* **Fix, costing no memory:** `src/rendering/sharpPixels.js` samples the same
  textures with "sharp bilinear". Each texel stays a flat square, and only a
  band one screen pixel wide is blended at each seam. That gives crisp pixel
  art with a 1px anti-aliased edge, so it does not shimmer the way plain
  nearest filtering did in the v2.3.1121 / v2.3.1237 jog reports.
* **How it's wired:**
  * It is a named Pixi batcher (`'sharp'`) with its own shader.
  * The character sprites are routed to it: the player and peer displays, the
    combat and gathering stand-ins, and NPC figures.
  * Maps, props, monsters, UI and text keep smooth filtering. Painted art
    would look blocky under this sampler.
* **Limits and switches:**
  * WebGL2 only. The shader is compiled as GLSL ES 3.00 (TRAPS §110).
  * `?sharp=0` turns it off for that load, `window.__btSharpOff = true` turns
    it off live, and `window.__btSharp()` reports its state.
* **QA:** `tools/qa/mp/mp-sharppixels.mjs` checks that the shader compiles, the
  sprites are routed through it, and the figure has more edge contrast (+11%
  measured live). Since v2.3.2922 it compares on one frozen frame: the
  switch also moves the figure by a fraction of a pixel now, and the live
  pictures were two moments of the idle animation. Frozen: +23–25%.

## A figure's layers move as one (v2.3.2922)

> Owner: "While wearing torso armor though jogging northeast / northwest
> there's a subtle flicker that occurs near the neckline where it meets the
> armor."

![Before: the collar hops on the neck. After: collar and neck move as one.](img/figure-seam/collar.gif)

*The figure frozen mid-jog NE while the camera slides by one screen pixel and
back in tenths, magnified 4x. Left is the old per-sprite snap
(`?figround=1`), right is as shipped.*

* **Cause:**
  * An armoured figure is a stack of sprites on one texel grid: the masked
    body, the plate, the greaves and the head traits.
  * Pixi's `roundPixels` (`pixiApp.js`) snaps each sprite's corners to whole
    screen pixels on its own.
  * Since the cropping series (v2.3.2750–2872), each layer's quad starts where
    its art starts: the body's at the crown, the plate's at the collar. At
    about 2.74 screen pixels per texel, those starts sit on different
    fractions of a pixel.
  * So as the camera slides in sub-pixel steps, the layers snap at different
    moments. Frozen mid-jog NE, stepping the camera through one pixel in
    tenths: for one camera position in ten, the plate sat a whole pixel higher
    on the neck. The flicker is that pixel toggling while you run.
  * Before the crops, every layer was a whole frame, the quads were identical,
    and they snapped together.
  * It happens with the shine off too. It is not the shine.
* **Why NE/NW:**
  * In a matched set (plate and greaves of one metal), the other six jog
    facings draw one knight sprite, which has no seam to open.
  * NE/NW have no knight art, so they draw the stacked figure.
  * A chest plate worn on its own is stacked in every facing.
* **Fix:**
  * The character batcher no longer snaps its sprites' corners. Pixi snaps
    only the batch elements whose `roundPixels` flag is 1, and the routing
    hook in `sharpPixels.js` now sets it to 0 for the sprites it sends here.
    The shader itself is unchanged.
  * Its sharp-bilinear sampling already draws a texel grid cleanly at any
    sub-pixel offset, which is the job the snap was doing. On one frozen
    frame, the figure is as sharp unsnapped as snapped (within the variation
    between sub-pixel positions), and the sampler still makes it 23–25%
    sharper than the default one.
  * Every layer of a figure now lands on the same fraction of a pixel, and
    the plate stays where the art puts it on the body.
  * Maps, props, text and UI keep `roundPixels`, and so does every sprite
    when this batcher is off (`?sharp=0`, or WebGL1).
* **Switch:** `?figround=1` puts the old per-sprite snap back for one load,
  and `window.__btFigRound = true` does it live (from the next rebuild of the
  draw list), for an A/B on the same build.
* **QA:** `tools/qa/mp/mp-figureseam.mjs`.
  * It freezes the jog NE and NW in plate and greaves, and steps the camera
    through one screen pixel in tenths on four frames of the run.
  * Each layer is drawn alone on a flat ground, and its position is read as
    the centre of its brightness.
  * As shipped, the plate keeps its place on the body within 0.03–0.11 px.
    With `?figround=1` it moves 0.40–0.71 px.
  * Two edge-based versions of the check were fooled by the art first
    (TRAPS §121).
