# Each land's trees and rocks wear its element (v2.3.3402; fire and water redone, v2.3.3511)

> The owner, 2026-10-18: a wood's tree is the same picture in every land so
> its log's colour is too, and *"Maybe you add effects to a pine tree to make
> it look like it belongs in that elemental zone but the wood logs stay the
> same?"*, *"Yes but keep in mind there are actually 10 elemental zones (dark,
> light, floral, poison, wind, ice, fire, water, electric, stone)"*.

Since v2.3.3345 each wood's tree and each metal's rock is one picture in every
land (`docs/specs/tier-trees.md`, `docs/specs/tier-ore.md`). Now each resource
in one of the Wheel's eight lands wears its land's element, drawn in code over
its picture. The picture never changes, so a tier's colours are the same
everywhere.

| Land | Element | What you see |
|---|---|---|
| Frost Ridge (`frost`) | ice | snowflakes shaken off it, a glint of rime now and then |
| Flame Fields (`ember`) | fire | glowing embers thrown up off its crown, streaking, rising faster and cooling redder as they go out; soft dark smoke swelling as it climbs; a coal popping at its foot; flakes of ash; a glow at its foot flickering like coals (v2.3.3511) |
| Wind Dunes (`sky`) | wind | sand streaming off it downwind |
| Stone Hollows (`hollows`) | stone | dust sifting down; on a rock, crystal glints and a crumb of stone falling (v2.3.3511: no glints on a tree) |
| Electric Foundry (`thunder`) | electric | sparks thrown in bursts that arc down and die (v2.3.3511), a little arc jumping now and then, a flickering violet glow at its foot |
| Water Caves (`tidal`) | water | on a tree, drops forming on its crown's lower edge, falling and splashing on the ground at its foot; a low mist along the ground; wet glints; a rock stands in a tide pool, rings spreading from it (v2.3.3511) |
| Poison Forest (`mist`) | poison | glowing green spores rising, a sickly green haze at its foot |
| Verdant Wilds (`verdant`) | floral | petals turning over as they fall, a firefly or two |
| (the Dark realm) | dark | shadow wisps rising, a dark pool at its foot |
| (the Light realm) | light | motes of light rising, a pale glow at its foot |

BroTown and the commons wear nothing.

The Dark and Light realms past the far gates are not built yet. Their two
looks are in the table already, ready for resources there whose ids name them
(`wn-dark-<k>`, `wn-light-<k>`).

## Seen on a phone

The first cut drew 1.5 to 2.5 px squares, a handful a tree. At the Wheel's
scale (about 0.6 CSS px a world px) each one was a device pixel or two, and
the phone pictures showed the trees bare. So now:

- each kind has a SHAPE of its own: a snowflake, a sand streak, a drop, a
  petal, a four-pointed glint, a soft round light, a square speck;
- they are 3 to 10 world px across (since v2.3.3511 an ember's streak 22 to 30
  long in its glow, a mist puff up to 36);
- the lights (embers, sparks, spores, fireflies, glints, motes) are drawn
  ADDED to what is under them, so they shine on dark ground and bright;
- about a dozen at a time on a tree, fewer on a rock (`rate`, a second, for a
  resource 100 world px across).

## How it works

- `src/rendering/landAuras.js` (`LandAuras`, owned by the effects renderer);
  `LAND_AURAS` is the table to tune: each land's rate, its kinds and their
  share, life, where they start, how they move, colours, size, glow -- since
  v2.3.3511 in `src/data/landAuras.js`.
- A resource's land is in its id: the worker names the Wheel's nodes
  `wn-<land>-<k>` (`wheelzone.js _wheelSpawnNodes`).
- Each resource near the view that is drawn (you hold its tool) makes specks
  at its land's rate, more for a wider one, inside its picture's box
  (`treeGeom` / `oreGeom`): from its crown, its top, its lower half or all
  over.
- The specks of a resource are a Container that RIDES on its picture
  (`_ridesOn`, the depth pass's rider, as the buildings' fire): in its layer, a
  quarter step after it, so they are drawn just in front of it and behind
  anyone south of it, wherever the depth pass moves it. They take its alpha:
  a tree you stand behind is seen through (tier-trees.md), and so are its
  specks.
- At most `AURA_MAX` (260) alive, `PER_MAX` (36) on one resource; specks let
  go are pooled and used again (since v2.3.3511 a pool of its own a resource,
  never added to or taken out of the layer a speck at a time: below).
- A resource mined out stops making specks, its glow fades, and its last
  specks finish. One that leaves the view lets them go at once.
- `?noauras` leaves the resources plain.

## Memory and cost

- **Textures:** eleven little canvases, about 20 KB in all (v2.3.3511 added the
  ember and spark streaks, the soft puff and the ring). They are made
  behind the Wheel's loading screen (`landAurasWarm`, from
  `worldTrial.preloadWheel`, as the buildings' life) and destroyed on leaving
  the Wheel (`landAurasFree`, `wheelOnStop`), every sprite drawing them first.
  Without them nothing is drawn.
- **Drawing:** at most 260 specks alive, only for the resources near you; a
  sprite of each shape batches with the others of its blend.

## v2.3.3511: fire that rises, water that falls

> The owner, after a playtest (2026-10-19): *"land tree effects: fire looks like
> sparkles, water looks like sweating"*.

Both were true, and why:

- **An ember was a sparkle.** A big round light with a hard bright heart, rising
  at one slow speed with a gentle sway, and every frame a fifth of them dimmed
  at random: a point that twinkles. Now an ember is a short **streak** (its own
  texture, 24 x 8: a hot white-yellow head and an orange tail, the middle
  quarter of its height its core, in a soft **glow** of its own colour that
  reaches past its head -- a bare line read as a scratch of light in the test's
  phone pictures, and a coal glows; 22-30 world px long, the core 3.5-4.25 thick,
  white-hot at its head -- an off-screen render of the Flame Fields' willow with
  and without its picture showed the first sizes as faint orange smudges on the
  orange ground)
  drawn **pointing the way it flies** and stretched with its speed; thrown up
  off the crown (anywhere in its upper two thirds, over the leaves, where it
  shows -- a tree's name plate sits just above it) and **rising
  faster as it goes** (`g` -62: hot air carries it), curling more the higher it
  climbs (`curl`); **cooling** from white-yellow through orange to a dull red
  (`ramp`) as it shrinks to a third and goes out; a smooth flicker about nine
  times a second (`flick`) in place of the random blink. With it: soft dark
  **smoke** that swells as it climbs (normal blend, about a quarter strong), a **coal
  popping** at the foot now and then (thrown up, arcing back to the ground),
  the ash as before (fewer), and the foot's glow flickering like **coals** --
  two slow waves -- not one breath.
- **A drip was sweat.** Born a third to three quarters of the way down the
  picture -- inside the leaves, since a crown ends 64-88% of the way down --
  sliding slowly (a 0.85 s life fell ~58 px), fading where it was, never
  reaching the ground, while pale puffs sat on the crown like steam. Now a drop
  **forms on the crown's lower edge** as the picture has it (below), **hangs**
  0.18-0.42 s as it swells, lets go and **falls** fast (700 px/s², stretched as
  it speeds), and **ends on the ground** at the tree's foot line (give or take
  a few px, as a drop from the back of the crown lands a little north of one
  from its front) in a **splash**: a ring spreading over the ground (squashed
  to lie on it) and two droplets jumping back down. A low **mist** drifts along
  the ground at the foot (wide, flat, faint, normal blend), and **wet glints**
  wink on the leaves. A **rock** has no leaves to drip from: it stands in a
  tide pool -- glints on it and **rings** spreading from its foot.
- **The same eye on the rest.** The Electric Foundry's sparks were round lights
  flown at random and blinking at random -- twinkles -- and are now **bursts**
  of three to five white streaks (the ember's shape, a fainter glow) thrown from
  one point that arc down and die (the little arcs stay). The Stone Hollows' crystal glints winked all over its
  TREES (a sparkle on bark) and are a **rock's** alone, with a crumb of stone
  falling off it; a tree there keeps its dust. Frost's rime glints, the
  spores, the petals and the fireflies twinkle on purpose and are as they were.

### Where a crown ends

`src/data/treeArt.js` carries each tree's `crown`: the crown's lower edge, a
picture row every 6 px across the picture (3 game px), 0 over the trunk's
middle. `tools/world/add-tree-art.mjs` measures it off the finished picture
(`tools/world/crownedge.mjs`: below the picture's widest row, the first rows no
wider than the trunk end the crown; each column clear of the trunk, its lowest
leaf above that; each sample the median of its columns), on a new cut and with
`--measure`, which measures the pictures already in `public/sprites/trees/`
and keeps them and their `TREE_ART_V` -- no new address, no re-bake (the bake
reads the pictures' sizes, which a measure never moves). The pine's ends 63-81%
of the way down, the willow's frond tips 59-88%, the hardwood's 41-71%, the
cedar's 76-93%, the maple's 47-82%. `tierTrees.js treeCrownEdge(node)` puts it
in world px where the picture is drawn.

### Nothing rebuilt a frame

CLAUDE.md's rule ("A STRUCTURAL CHANGE REBUILDS ITS LAYER'S DRAW LIST", TRAPS
§218): every speck was a sprite added to its resource's container as it was
born and taken out as it died, its blend and visibility set each time -- each an
`addChild` or `removeChild` in the depth-sorted `entities` layer, whose whole
draw list Pixi rebuilt for it, several times a second a resource. Now:

- a resource's specks are a **pool** made with its container, before the
  container joins the layer (the layer changes once, as it comes into view),
  straight into the layer its picture is in;
- each sprite is one kind's for good -- its picture and blend set once, the
  normal blends first and the added lights after (each run one batch) -- and a
  speck born or gone only moves it and changes its alpha; an idle one waits at
  alpha 0;
- how many a kind keeps (`auraPoolPlan`, src/data/landAuras.js) is what its rate
  keeps alive and a third more, two at the least (an arc's whole line), the
  kinds the rate makes about `PER_MAX` (36) on one resource, a splash's ring and
  droplets sized by its drips: a pine in the Flame Fields keeps 17 sprites for
  its specks (and one for its glow), a maple 34;
- a resource's specks are made only while its picture is within
  `AURA_VIEW_IN` 160 world px of the screen and let go past `AURA_VIEW_OUT` 420
  (the node view reaches 480 px past the screen, and specks were made out there
  that no one saw);
- a ramp's colour is worked out 24 times in a speck's life, not every frame.

Only a resource coming into view, leaving it, or carried to another layer by the
depth pass changes a layer (`stats.structural`).

### The table is data

`LAND_AURAS` moved to `src/data/landAuras.js` (no imports: the server's suite
reads it), with `auraPartsFor` (a land's kinds on a tree or a rock: `on`),
`auraPoolPlan`, `auraRampAt` and `auraFade`. `src/rendering/landAuras.js` draws
it and re-exports what the effects renderer imports. New in the table: `id`,
`on`, `from: 'foot' | 'crownEdge'`, `spread`, `orient`, `stretch`, `ramp`,
`grow`, `squash`, `flick`, `curl`, `burst`, `toGround`, `kind: 'drip' |
'ring'`, `hang`, `splash`, `anchor`, and the glow's `coal`.

## Tests

`mp-landauras`: on a phone in the Wheel, the player is put beside the nearest
tree and rock of each of the eight lands in turn, and beside the commons' pine
(the page's own position: the specks are the page's alone). It checks:

- the textures were made behind the loading screen;
- the commons' pine makes none;
- every land's tree and rock make specks of that land (counted as MADE: a
  spark lives a fifth of a second, so a count of the living at one look missed
  the thunder rock's), its land's own shape among them, riding on its picture,
  every one alive inside its box grown by 120 px;
- the fire, electric and poison lands' resources wear a glow at the foot;
- never more than the cap;
- back on the commons, every land's specks let go.

v2.3.3511 adds:

- **embers** (the Flame Fields' tree and rock): each one seen twice a moment
  apart, the way it moved on the screen against the way it is drawn pointing
  (within 40 degrees); moving up; faster the older it is, and redder (the
  green in its colour); the Foundry's **sparks** pointed the way they fly and
  falling faster as they age;
- **drips** (the Water Caves' tree): every drop starts on the crown's lower edge
  as `treeCrownEdge` has it (worked out in the test from the same data), lands
  on the ground at its foot line, none lost in the air, and splashes; the
  Water Caves' rock has no drips and makes ripples;
- the Stone Hollows' crystal glints on its rock, none on its tree;
- **nothing structural**: hooks on Pixi's own `Container` and `Sprite` (found
  by what they do: the build is minified) count every child added to or taken
  out of a resource's container while it is in a layer, and every picture,
  blend or visibility changed on one of its sprites; at each of the 16
  resources, 2.5 s with specks coming and going: none.

`server/test/land-auras.test.mjs` (no browser) holds the table and the data to
the owner's words: every land's look; an ember a streak drawn the way it flies,
rising faster, cooling, no random blink; smoke and coals; a drip from the
crown's edge that falls and splashes, nothing born in the crown's middle, a
rock's ripples; the Foundry's bursts, the Hollows' glints a rock's; the pools;
and the crown data -- `--measure`'s answer today, every sample a row with
leaves on it and open air under it in most of its columns (pine 24 of 24,
willow 45/47, hardwood 66/66, cedar 48/49, maple 129/130), none over the
trunk, in world px inside the picture as drawn.

Pictures: `tools/qa/mp/out/landauras-<land>.png` (the tree) and
`landauras-<land>-rock.png`.
