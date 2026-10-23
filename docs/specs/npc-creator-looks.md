# The townsfolk are bros from the character creator (v2.3.3580)

The owner: "generate the art for the characters described in the document
using the Brotown character creator. You can modify the bro art if you want.
I think NPCs should look like normal bro characters." Then, on the preview:
"Approve and push to main". And of the dialogue faces: "Are you able to use
an up close of their face of their Southwest portrait for dialog?", then "I
think you should do a pass on specifically cleaning up the portrait because
it looks fuzzy and some stray pixels are visible" and "So Hemi bros is based
off the NFT characters shown here. Can you try to model the portraits as
close as you can to something found here? I added more to the game than
exists in the actual collection" (the dialogue portraits, below).

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
- The files keep their old names; `NPC_ART_VERSION` moved to 2.3.3580, so
  every phone fetches the new ones.

A change of look is a re-bake: edit `NPC_LOOKS`, build, run `--bake`, commit
the pictures.

## The dialogue portraits are Hemi Bros

Every head (the dialogue window's, Diego's shop and Ace's flip) is a Hemi
Bros portrait. Hemi Bros, the NFT collection the game is named for, is 3,333
busts of 32 x 32 pixels turned to the viewer's left on a flat background
(github.com/hemibroscommunity-del/Hemi-Bros-catalogue, with the trait layers
they are stacked from). Each townsperson's portrait is such a bust, built
from the collection's own trait art:

| Who | His traits | Skin (the game's) |
| --- | --- | --- |
| Mayor Bro | Top Hat, Golden Monocle, Beard (grey), Suit; Purple Navy | fair |
| Blacksmith Bro | Bandana over the Flat Top, Beard (black), no shirt; Rose Taupe | tan |
| Diego | Slick Back Hair, Golden Glasses, Purple Bomber; Dark Lavender | brown |
| Farmer Bro | Bucket Hat, Wtf Eyes, Beard, Yellow Shirt; Russian Green | sand |
| Woodworker Bro | Flattened (the goggles), Afro (grey), White Striped Shirt; Teal Blue | pale |
| Beastmaster Bro | Cowboy Hat, Sleepy Eyes, Beard, Normal Soldier Outfit; Camouflage Green | olive |
| Lil Bro | Headphone on Blonde Hair, Happy Eyes, Yellow Running Jacket; Teal Blue | honey |
| Ace | Derby Hat (black), Sus Eyes, Woolen Shirt; Middle Green | rosy |

What the game has beyond the collection is the collection's pieces combined
or recoloured, never redrawn:

- the skin is each townsperson's game skin, recoloured from the bro's orange
  by brightness, as the game's own recolour does;
- a hat: the collection wears hair OR a hat, and a bro in a hat is bald
  under it, his ear showing below the brim; so is a townsperson's portrait,
  though the game gives him hair under it (the bake refuses hair with a hat
  in `HATS`). A band (the bandana, the headphones) sits on the hair, as in
  the game;
- a recoloured trait (the Mayor's grey beard, Ace's black derby)
  keeps the collection's outline colour and puts every other colour on a ramp
  in its own order of brightness.

```
python3 tools/qa/nft_portraits.py extract <catalogue>   # once: the layers
python3 tools/qa/nft_portraits.py                       # the eight portraits
```

The extract writes every trait it can place as a 32 x 32 picture,
`assets/portrait-source/hemi-bros/<trait>.png` (98, 27 KB in all), so the
portraits never need the catalogue again:

- The layer files are each cropped and scaled differently and were enlarged
  smoothly, so each layer's own pixel grid is found from its edges and every
  cell is judged by its whole inside. A cell the file's edge cuts through
  counts: the brims' tips and the beard's front edge lie in such cells, and
  reading a cell's middle alone lost them.
- Each layer is placed where it matches the real NFTs that wear it. The
  traits too small to show a grid (the eyes, the monocle, the gold glasses,
  the low beard, the camo) are lifted out of the NFTs.
- Every layer is then MENDED against the NFTs that wear it, cell by cell,
  where they agree. Some files are not quite the art the NFTs were made
  with: the slick-back hair's file stops at the jaw where every NFT carries
  it down the nape, the light-brown hair misses a lock by the ear, and the
  goggles' file (the sheet's "Flattened") has no strap and clear lenses.
- An eyewear's GLASS is found on the collection's two skins, the orange Bro
  and the brown Different Bro: the cells that let what is under them show
  are one see-through tint. The goggles are a blue-grey at 56% with painted
  pupils, the monocle clear glass, the golden glasses gold, so a pale
  Woodworker's skin shows pale through his goggles.
- The check: the real NFTs of both skins, rebuilt whole from the layers, come
  out within 12 of their 1,024 pixels, 0.3-0.4 on average (the WebP's own
  smear). Past 12 nothing is written.

The portrait is its 32 x 32 pixels, each a flat colour, made 6 x 6 file px:
192 x 192 lossless, under 1 KB a file. The creator headshot it replaces was
the dialogue's "fuzzy" picture with "stray pixels". Then the owner asked again
for a cleanup pass, and every portrait was gone over a pixel at a time beside
real NFTs wearing the same traits. What was taken out:

- the hair under the three hats (the Mayor, the Farmer, Ace). The first cut
  of these had the Farmer's hair poking through his bucket hat; the next cut
  hair to what hung below the brim, which left a lone grey pixel and a grey
  sliver on Ace, a 1-pixel brown strip on the Farmer and a grey band on the
  Mayor, where a hatted Hemi Bro has his ear;
- the Farmer's Low Beard: the collection's own art (rebuilt, the real NFTs
  match it cell for cell), but its 20 scattered pixels read as specks on his
  lighter skin. His beard in the game is full, so his portrait wears the
  collection's full Beard;
- the goggles placed by hand one pixel off on both axes, before the extract
  placed them by the NFTs that wear them.

What stays is the collection's own detail, checked on real NFTs: the
headphones' pink highlight, the bandana's white pattern and its knot, the
gold glasses' tint past the edge of the face, the goggles' gap at the nose.
No orange bro-skin pixel is left in any portrait; every one became that
townsperson's own skin.

Every place shows them crisp: the dialogue (`image-rendering: pixelated`, as
before), Ace's coin flip (64 px, two CSS px a portrait pixel, pixelated:
smoothed, it blurred every edge on all but a 3x phone), Diego's shop (a
rounded chip, 32 px with -3 px margins so the header keeps its height:
one CSS px a portrait pixel, where 26 px was smoothed and a computer's screen
dropped pixels outright), and the quest page (44 px, pixelated, now at
`npcArtUrl`'s version like the dialogue, so the two share one file).

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

- `mp-npclooks` (new): every townsperson picture comes in at 2.3.3580.
  Each is a bro's size with his feet on his spot, a walker on cell 8. Lil
  Bro's figure is painted 0.875 of Diego's height. Each look's own colour is
  counted beside him. The Mayor's dialogue shows his Hemi Bros portrait: 192
  px, its corner the collection's Purple Navy, and every one of its 32 x 32
  pixels a flat 6 x 6 block, read from the picture in the page. Diego's shop
  and Ace's coin flip show it crisp: 32 and 64 px, drawn pixelated. There are
  no page errors.
- `mp-wheelfolk`: the cast and its pictures are read off WHEEL_TOWNSFOLK
  and NPC_DATA. The old list missed the tour's Woodworker Bro and Farmer
  Bro, so this check was red on main. The cast holds 2.93 MB, under its
  3.2 MB line.
- `mp-race`: Lil Bro runs the race on all eight of his jog's cells. The test
  now walks up to him from a side with nobody else on it. The harness's
  `approachNpc` steps away 420 px east first, which in the world's BroTown
  is beside Mayor Bro, whose line opened and held the screen; this was red
  on main.
- `mp-shopkeeper`: moved off the retired old map to the world. Its check that
  Diego is drawn bigger than Mayor Bro came from v2.3.2052 (the owner: "make
  shopkeeper larger his sprite is bit small"), when his hand-painted picture
  was the smallest man in town; now he is a grown bro's height, as tall as
  anyone but the Mayor, whose extra 10% is the owner's v2.3.1822. In the
  world its players are kept in by a real keystroke (`H.keepAlive`): the
  world loads slower, the watcher sat idle past two minutes and was logged
  out, and the tap that brought it back sent its price request while the new
  socket was joining. (A real player who ends an idle logout with a tap on
  the open shop loses that tap's price the same way, and taps again; not
  changed here.)
- `mp-mayorart`: moved off the retired old map to the world. It counts the
  navy of the Mayor's tee on his body alone, since the Town Hall's blue
  trophy cabinet stands behind him.
- `mp-joinin` is unchanged and passes.
