# Sharp character pixels and the tee's shoulder line (v2.3.2756–2743)

> Owner: "The characters shoulder outline on idle south is very thick and I
> think it's the result of keyed changes on the shirt, not the original art.
> The character also looks soft compared to the art he's wearing like sword or
> shirt. That's probably a result of lower res textures to save memory, but is
> there an enhancement you can do for that?"

## The shoulder line (v2.3.2757)

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

## Sharp pixels (v2.3.2758)

* **Cause, measured with `window.__btSelfSprites()` (v2.3.2756):** the body and
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
  * WebGL2 only. The shader is compiled as GLSL ES 3.00 (TRAPS §109).
  * `?sharp=0` turns it off for that load, `window.__btSharpOff = true` turns
    it off live, and `window.__btSharp()` reports its state.
* **QA:** `tools/qa/mp/mp-sharppixels.mjs` checks that the shader compiles, the
  sprites are routed through it, and the figure has more edge contrast (+11%
  measured).
