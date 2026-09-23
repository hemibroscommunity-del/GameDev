# Form shading: light from above (v2.3.2767)

> Owner: "I love gradient colors to make things 'pop' more. I'm wondering if
> there's a way you can add that kind of subtle shadowing on the game's
> geometry, including the character."

## What it looks like

Every figure and prop is lit from the sky. Its top keeps its painted colour, a
touch warmer. Toward the ground it shades into a cool blue-grey, so it reads
as a lit form standing on the ground rather than a cut-out.

* **Shaded:** the player and other players (body, clothes, gear, hair, hat,
  weapon and shield all take one gradient), NPCs, monsters, town props and
  buildings, trees, rocks and ore, and the combat and gathering stand-ins.
* **Not shaded:** name plates, health bars and other UI, fishing spots, and
  scenery painted into a map image (the image zones' ground and the World
  View, which are one picture each).

## How

`src/rendering/formShade.js` patches `DefaultBatcher.packQuadAttributes`, the
one function that writes each sprite's four corner colours for the GPU. Giving
the bottom corners a darker, cooler colour than the top ones is a vertical
gradient at no extra cost: same batch, same draw call, no filter pass, no
texture. Filters per figure (an extra pass each, on iPhone) and baking into
the sheets (a character's ~20 layers use different frame shapes, so the
gradient would band) were both ruled out.

* A character container carries `_vShadeRef` (its body frame) and
  `_vShadeKids`. Every sprite in it takes its colour from its height within
  that head-to-feet span, so the pieces agree.
* A single-sprite object carries `_vShade` and is shaded across its own quad.
* Strengths are in `SHADE` at the top of the file (`figure`, `prop`).

## Switches and QA

* `?shade=0` on the URL turns it off for that load. `window.__btShadeOff = true`
  turns it off live, which is how the pictures are compared.
* `window.__btShade()` reports whether it is on and how many quads it has shaded.
* `tools/qa/mp/mp-formshade.mjs` (town and Verdant) checks that the patch runs,
  that the player's legs darken more than the head, and that nothing is ever
  lit up. It leaves on/off stills in `tools/qa/mp/out/formshade-*.png`.
