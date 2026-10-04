# The Wheel's water moves (v2.3.3017)

> Owner, 2026-10-04: *"Does the water move yet"*. Offered *"glints and slow
> lines of light drifting across the water; the white foam lapping in and out
> at the shore; a gentle drift down the rivers"*, all drawn in code:
> *"Yes"*.

Until now the Wheel's water was the owner's three still pictures (open sea,
shallows, fresh water), laid into the ground pieces like the grass
(WORLD-MAP-PIPELINE: *"Moving water ... is a later round: these are still
pictures"*). The pictures stay exactly as they are. The game now draws the
motion **over** them, on the GPU, and only where water is drawn.

## What you see

| Where | What moves |
|---|---|
| All water | The picture itself **ripples**: each water pixel is drawn from a pixel or so away, the offset wandering slowly, so the pictures' own lines of light sway and turn over. Never at the shore, so no sand is pulled into the water. |
| All water | **Glints**: here and there a small cross of light flashes and goes. |
| The sea's coasts | **Surf**: a line of foam rides in from about 8 game px out, breaks into the shore's own foam line, which brightens and lets go, and a thinner line draws back out as the next wave comes in. Each stretch of coast gets its wave in its own turn, never all at once. Each wave's foam is broken into different lengths. |
| River and pond banks | The same lapping, small and soft. |
| The Sweetwater River | **Flow**: streaks of light run down the river the way it flows (source to sea), quicker mid-channel and upstream, dying away at its mouth. Its ripples ride downstream too. |
| Ponds, lakes, oases | **Rings**: now and then a ring opens where something rose. |
| The open sea | **Whitecaps**: a short dash of white now and then, carried a few pixels downwind. |

The surf, glints, streaks, rings and caps are worked out a game pixel at a
time, so they stay pixel art. The ripple moves the picture smoothly, the way
the ground pieces themselves are drawn (wheelGround.js draws them smooth).

## How it works

### The water field (the ground worker)

The ground worker lays a small **field** with every piece that has water
(`public/tools/world/core/ground.js`, WATER THAT MOVES; asked for with
`composeGround(..., { waterField: { rivers } })`, which only the game's worker
does). It is one texel per art px (1.5 game px), the piece's apron included:
130 x 130 texels, RGBA8.

| Channel | Meaning |
|---|---|
| R | Distance from the texel's middle to the nearest px that is **not water, as drawn** (land, a bridge deck, a rock), in output px x `WF_DIST` (12), up to `WF_CAP` (20 output px = 10 game px). 0 on land. |
| G | Which water the picture there is, as `waterLook` picks it: `WF_KIND` fresh 85, shallows 170, sea 255. On land within `WF_SPREAD` (3) texels of water, the water's kind, so the GPU's smoothing never reads a coast as some other water. |
| B, A | Which way and how fast a river runs there, 128 = still. Along the plan's river line from source to mouth (`waterRivers`, from the blueprint's routes), on fresh water within the river's half-width + `WF_BANK` (18 art px). Fastest mid-channel and upstream, dying away over its last `WF_MOUTH` (160) art px. |

- The distance is **exact**: a Euclidean distance transform (Felzenszwalb and
  Huttenlocher) over the area composeGround already works out, whose margin
  (21 output px) is wider than the cap. Down each column it is two plain
  scans; the full transform runs only along the 130 rows the texels lie on.
- Everything is a function of position, so two pieces laid apart agree on
  every texel they share (test-world-core checks the seams).
- A piece with no water has no field (`null`). A piece of open sea with no
  shore within reach is `uniform` (four numbers, no texels), and the game
  gives all such pieces one shared 1 x 1 texture.
- `?nowaves` in the address: the worker lays no fields at all (`wavesOn`).
- Cost: about 6 ms more per coast piece in Node (47.7 to 53.6 ms, the
  quickest of five), nothing on pieces without water.

### The shader (the game)

`src/rendering/wheelWater.js`, `WheelWater`, owned by `WheelGround`:

- One quad per piece that has water, over exactly that piece, in its own
  container above every piece (`wheelGround.js` puts the pieces in
  `pieceRoot` so pieces laid later still draw under it).
- The quad's shader reads two textures through **one** set of texture
  coordinates: the field (a texel per art px) and the piece's own picture
  (three px per art px). Both carry the piece's apron, so 130 texels lie
  exactly over 390 px.
- Its output is the piece's own colours, moved and lit, premultiplied, at
  the alpha of "how much this is water" (from R). Land under the quad costs
  one texture read.
- The light is added and the foam is laid over, in one colour.
- One clock and one strength (`uTime`, `uStrength`) for every piece, in a
  shared uniform group. The clock wraps every two hours.
- `highp` throughout: world positions run to 43,008 game px, which an
  iPhone's mediump holds only to the nearest 32.
- **WebGL2 only.** The game asks for WebGL, and every iPhone since iOS 15
  gives version 2. On anything else the water stays still, as before.
- The program is built **behind the Wheel's loading screen**
  (`prewarmWheelWater`, called from `worldTrial.js` `preloadWheel`). A WebGL
  program is compiled the first time it is drawn (the v2.3.2904 lesson,
  glint.js), so one small quad is drawn there. It checks the program linked;
  a device where it does not keeps still water.
- A piece laid again (a picture that came late) gets its quad again, with
  the new picture, before the old one is freed. A piece freed frees its quad
  and its field (the ZONE-ASSET rule).
- Memory: 66 KB of GPU texture per piece with a field, about 1-3 MB for the
  pieces standing. The picture it moves is the piece's own, already there.

### Switches and probes

- `?nowaves`: still water (no fields, no quads).
- `window.__btWaves.off()` / `.on()`: hides and shows the motion live.
- `window.__btWaves.strength(k)`: 0 draws the pictures still, through the
  same quads (for before/after pictures of one moment).
- `window.__btWaves.hold(sec)`: holds the clock at a moment (pictures, GIFs);
  `hold(null)` lets it run.
- `window.__btWaves.probe()`: quads, fields, shared open-sea quads, how many
  carry a flow, field bytes, whether the program built.
- `window.__btWaves.extract(x, y, w, h, res)`: the water layer drawn alone
  over a world rectangle, as RGBA px (mp-wheelwaves checks where it draws and
  that it moves with it, free of everything else on screen that moves).

## Tests

- **test-world-core** "the water moves (v2.3.3017)", 12 checks:
  - the river lines;
  - `?nowaves`;
  - only when asked, with the picture identical to the last px;
  - the field's shape and range;
  - the distance exact against a brute-force search (4,013 texels, 0 wrong);
  - the kind matching the picture laid (5,242, 0 wrong) and carried onto
    the land beside it;
  - no seams between pieces laid apart;
  - the Sweetwater flowing down its own line (5,362 texels, all of them);
  - a pool far from the river lying still;
  - no field without water, and the open sea as four numbers;
  - the cost;
  - the shader decoding the field exactly as ground.js writes it.
- **mp-wheelwaves** (phone viewport, real worker):
  - the program built behind the loading screen, and linked (WebGL2);
  - at a coast, 24 quads: 14 with a field of their own, 10 of open sea
    sharing one (0.9 MB of fields);
  - the water layer drawn **alone** over the view (`__btWaves.extract`):
    every px it draws lies on drawn water or at its edge (of about 82,000,
    none elsewhere);
  - it moves: of the water's px, 8% change by more than 10 levels in 1.5 s at
    a coast (mostly the deep sea's dark, quiet picture) and 43% on the river
    in 1.2 s, against none with its strength at 0;
  - a frame at the coast in the sandbox's software WebGL: 328-335 ms with the
    motion, 274-286 without (two runs). That says nothing about a phone's
    GPU, only that the effect is not a cliff;
  - the river carrying a flow on 19 pieces, and nothing drawn off its water;
  - every field let go back in town;
  - `?nowaves` still: no fields laid, nothing drawn;
  - no page errors;
  - GIFs of the coast and the river in `tools/qa/mp/out/`.
