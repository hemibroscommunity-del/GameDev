# The townsfolk are bros from the character creator (v2.3.3576)

The owner: "generate the art for the characters described in the document
using the Brotown character creator. You can modify the bro art if you want.
I think NPCs should look like normal bro characters." Then, on the preview:
"Approve and push to main".

Every townsperson's picture is now the player's own figure in a creator
look: the same body, hair, hat, beard, shirt, pattern and colours a player
picks, drawn by the game's own renderer. Each look tells the joke the
dialogue's satire pass gives him (docs/specs/npc-dialogue-v2.md).

| Who | His look (creator words) | The joke |
| --- | --- | --- |
| Mayor Bro | top hat, golden monocle, grey slick-back hair and beard, navy pinstriped tee, black | small-town politician |
| Blacksmith Bro | shirtless, red bandana, black flat-top and beard, grey striped sweatpants, white shoes | gym bro |
| Diego | slick-back hair, gold glasses, purple-and-gold diagonal tee, white trousers and shoes | hustler |
| Farmer Bro | green bucket hat, dirty-blonde hair, brown beard, wide eyes, yellow chevron tee, browns | paranoid dirt hippie |
| Woodworker Bro | workshop goggles, wild grey hair, white graph-paper tee, navy trousers | overthinking genius |
| Beastmaster Bro | brown hat, beard, sleepy eyes, green camo tee, browns | survival-show host |
| Lil Bro | headphones, blonde hair, orange striped tee, blue trousers, red shoes, a child's size | iPad kid |
| Ace | black fedora, slick black hair, green diamond tee, black | back-alley bookie |

The looks are written in `tools/qa/npc-looks.mjs` `NPC_LOOKS`, in the
creator's own catalog ids.

## How the pictures are made

```
npm run build
node tools/qa/npc-looks.mjs                 # previews: tools/qa/out/npc-looks/
node tools/qa/npc-looks.mjs --bake          # the game's pictures: public/sprites/npc/
node tools/qa/npc-looks.mjs --bake --only=lilbro
```

- The tool opens a real player in the world, dresses him in each look
  through the creator's own stores, and photographs him with
  `window.__btCaptureLook` (rendering/fighterCapture.js). That calls
  entityRenderer `capturePoseFrames`, which now takes `'stand'`, any of the
  eight facings, a fixed `unitPx` and a pinned `clock`.
- Form shading is off for the photograph: the world shades each
  townsperson as it draws him, and a photograph that carried the player's
  own shading would be shaded twice.
- A photograph is retaken until two in a row match, because the look's
  recolours bake in the background.
- If the page reloads, or the join puts the plain look back, that
  townsperson is photographed again.
- `tools/qa/npc_looks_bake.py` lays the frames into the townsfolk's
  256 × 256 cells: soles on row 222, the figure's own middle on the cell's
  middle. It refuses to write anything if a frame would leave its cell.
- A standing townsperson is one picture.
- A walker gets eight strips (one a facing) of nine cells: the player's jog
  in eight cells spread evenly over its cycle, then his stand (NPC_DATA
  `walk`: `frames` 9, `cycle` 8, `stand` 8).
- Every head (the dialogue window's, Diego's shop and Ace's flip) is the
  dashboard's own 96 px headshot of the look, doubled pixel for pixel to
  192 px so Ace's 64 CSS px window stays sharp.
- The files keep their old names; `NPC_ART_VERSION` moved to 2.3.3576, so
  every phone fetches the new ones.

A change of look is a re-bake: edit `NPC_LOOKS`, build, run `--bake`, commit
the pictures.

## How they are drawn

- Every townsperson is drawn at the player's own `PLAYER_SIZE_MULT`
  (entityRenderer `NPC_SCALE_MULT`), so a grown townsperson is exactly a
  player's height, hat for hat. The old per-figure numbers evened out
  hand-painted pictures and are gone.
- Two of the owner's asks stay. The mayor is 10% larger (v2.3.1822).
- Lil Bro is a child, 0.8 of a bro (v2.3.2064). He is PHOTOGRAPHED at that
  size (NPC_DATA `figureSize` 0.8, which the tool reads too), so his cell is
  drawn at a bro's scale like everyone's and his picture holds no pixels it
  does not show. `npcFigureSize` places his quest pin and name and paces his
  stride by it.
- A walker steps as a player does: one jog cycle every
  `cycleMs('jog', facing)` at a walk's 150 world px a second, times his
  size (`npcWalkCell`). Standing, he is on his stand cell, as v2.3.3520
  made it.

## Memory

The new walker strips are nine cells of a real jog where the old ones were
four, so in the world's BroTown the cast first came to 6.49 MB, where main
held 3.58 MB. Three changes bring it to 2.93 MB, less than before:

- A one-picture townsperson (Mayor Bro, Blacksmith Bro, Woodworker Bro,
  Farmer Bro, Beastmaster Bro) loads cropped to his figure, as the walkers'
  strips always were (`loadCroppedStrip` with one cell): 1.25 MB of whole
  256 px pictures became 0.34 MB.
- Diego and Ace never walk in the world, so they keep only the cell they
  stand on (`loadCroppedStrip`'s new `only`; npcSprites `wheelWalkSources`).
- Lil Bro keeps all nine cells of his race's four ways, photographed at his
  own size: 2.46 MB.

What else moved:

- The eight dialogue heads are 192 px, 1.12 MB decoded (0.39 before).
- The retired old town (`?trial=off` only) loads every walker's eight
  strips: 11.3 MB became 20.2 MB. No player reaches it.

## Tests

- `mp-npclooks` (new): every townsperson picture comes in at 2.3.3576.
  Each is a bro's size with his feet on his spot, a walker on cell 8. Lil
  Bro's figure is painted 0.875 of Diego's height. Each look's own colour is
  counted beside him, the Mayor's dialogue shows his 192 px head, and there
  are no page errors.
- `mp-wheelfolk`: the cast and its pictures are read off WHEEL_TOWNSFOLK
  and NPC_DATA. The old list missed the tour's Woodworker Bro and Farmer
  Bro, so this check was red on main. The cast holds 2.93 MB, under its
  3.2 MB line.
- `mp-race`: Lil Bro runs the race on all eight of his jog's cells. The test
  now walks up to him from a side with nobody else on it. The harness's
  `approachNpc` steps away 420 px east first, which in the world's BroTown
  is beside Mayor Bro, whose line opened and held the screen; this was red
  on main.
- `mp-mayorart`: moved off the retired old map to the world. It counts the
  navy of the Mayor's tee on his body alone, since the Town Hall's blue
  trophy cabinet stands behind him.
- `mp-joinin` is unchanged and passes.
