# The pickaxe keeps its wood, and the miner's tee has no pinholes (v2.3.3648)

The owner, 2026-10-27: "check all the animations for ghost remnants of either a
body beneath or areas for cleanup".

`mp-ghostaudit`'s miner was a green bro, and he swung a green pickaxe.

## Why

The axe and the fishing rod are drawn in a magenta key and coloured as they
load (`toolRecolor.js`). The pickaxe is not: the mining sheets (`mine-south` and
its head sheet) draw it in its own wood and steel, baked into the miner's
frames. Its wood is the skin's hue family, a pale orange, so the recolour's skin
test (`playerSkins.js` `recolorBodyToCanvas`, `_isSkin`) took the handle and the
rim of its head, and every player mined with a pickaxe the colour of their
skin. Its steel is the boots' flat grey; where the swing brings it down by the
legs, the boot test could take that too.

## The rule (`src/rendering/toolWood.js`)

The miner's skin is a deeper orange than the wood. Over the sheet's 14 frames,
on the pixels the skin test passes, the skin sits at green/red 0.5-0.6 and
blue/red 0.2-0.3, the wood at 0.65 and up and 0.32 and up. So, frame by frame:

- **Wood.** A skin-test pixel that pale is wood when it belongs to a pale piece
  (8-connected, in its frame) of 40 px or more (at a 256 px frame). The handle
  and the head's rim are one long piece. An eye's corner, an ear's edge or a
  knuckle's highlight is a few px, and stays skin.
- **Steel.** A boot-grey pixel within 6 px of the wood is the pickaxe's too.

What is the pickaxe is passed over by every test in the recolour (skin, shirt,
trousers, boots, and the drawings' masks), so it keeps the colours it is
painted. Only the mining sheets ask: the walking sheets' own skin is pale enough
to pass the wood's test (on the jog's sheets it would take most of the body).

`?pickwood=0` is the game as it was. `window.__btPickWood()` says whether the
rule is on and, by sheet, how many pixels each mining bake kept.

## Checked on the sheets

`node tools/qa/tool-wood.mjs` runs it over every player sheet (`--draw` writes
each with the wood in magenta and the steel in cyan):

| sheet | wood | steel |
|---|---|---|
| mine-south (14 frames) | 9,620 | 1,032 |
| mine-south-head | 40 | 0 |

Every frame of `mine-south` was checked by eye: the handle and the head's rim
are taken, and nothing of the miner. The mask costs 14-18 ms a sheet in Node,
once a bake. A sweep across and then down finds the steel; a walk round every
wood pixel found the same pixels in about 40 ms.

## The miner's tee had pinholes

The test's green miner in a white tee wore green dots on his chest. The tee's
mining sheet (`shirt/tshirt/mine-south`) has holes of one to six pixels that
the tee encloses on every frame: 154 px over the fourteen frames, and every
one shows the skin under it. The other tee sheets have none to speak of (3 to
4 px on the north and south jogs, 28 over pickup's 29 frames).

`tools/gear/fill-mine-tee-holes.mjs` fills each hole over the body's skin (the
recolour's own skin test) with the tee's own colour: the per-channel median of
its opaque neighbours, from the hole's edge inward. A hole over anything else
(the pickaxe's steel, an outline) is left: the tee may mean to show it. Its
invariants abort the run if anything but a hole over skin would change, and
its dry run finds nothing left to do (`mine-hem` §5). `GEAR_VERSION` 2.3.3648,
so every phone fetches the mended sheet. The PNG only is committed; CI mints
its WebP twin.

## The test: `mp-pickwood`

Two green bros in a white tee mine copper on the commons, far apart. One plays
the game; the other plays it with `?pickwood=0`. Once the harvest waits for the
gesture, the swing's frame is the gesture's phase (`gesturePose01`), so the
test sets the same phase on both pages and photographs each bro alone: the
figure's layers only, without the rock he mines (lifted over him into
`overlayWorld` while he works) or anything else standing there. It counts the
wood's tan and the skin's green in each photograph.

Its last run, 22 checks of 22:

| frame | the wood's tan, new | as it was | the skin's green, new | as it was |
|---|---|---|---|---|
| 0 (raised) | 345 | 2 | 1,459 | 1,813 |
| 4 (coming down) | 287 | 4 | 1,174 | 1,464 |
| 6 (at the rock) | 284 | 1 | 1,179 | 1,478 |
| 8 | 263 | 0 | 1,221 | 1,509 |
| 13 (raised again) | 376 | 0 | 1,479 | 1,867 |

The green the new page no longer shows is the pickaxe: about what it shows in
tan, a little more for the wood's darker side, which the tan test does not
count. The bake kept 10,652 px of the mining sheet's pickaxe (9,620 wood and
1,032 steel) and 40 of its head sheet's, and no other sheet was touched.

The test ran before the tee was mended, so its photographs still show the
pinholes on both pages. The sheet-level check (`mine-hem` §5) guards the tee.

## Found in review

An independent review of the change ran `toolWoodMask` on every player sheet
and found no regression: the tee's pinhole fill covered none of the pickaxe's
wood. It raised two design points, left for later:

- **A colour rule is a guess.** The pickaxe is found by how pale and how
  orange it is next to the miner's skin. A redrawn mining sheet with a paler
  skin or a darker handle could move pixels between the two. The axe and the
  rod avoid that: they are drawn in the magenta key and coloured at load
  (`toolRecolor.js`). Keying the pickaxe the same way would mean painting its
  pixels magenta in `mine-south` once (this rule could find them for that), and
  a `TOOL_SPECS.pickaxe` of a wooden haft and a steel head. The price is the
  art's own pickaxe colours, replaced by the ramps.
- **The skin, trouser and boot tests are copied** into `toolWood.js`,
  `garmentConfine.js`, `tools/qa/garment-confine.mjs` and
  `tools/gear/fill-mine-tee-holes.mjs`, beside the originals in
  `playerSkins.js`. One small module all five import would keep them in step.
