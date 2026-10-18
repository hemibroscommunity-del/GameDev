# Each land's trees and rocks wear its element (v2.3.3402)

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
| Flame Fields (`ember`) | fire | glowing embers rising off its top, flakes of ash, a warm glow at its foot |
| Wind Dunes (`sky`) | wind | sand streaming off it downwind |
| Stone Hollows (`hollows`) | stone | dust sifting down, crystal glints |
| Electric Foundry (`thunder`) | electric | sparks crackling, a little arc jumping now and then, a flickering violet glow at its foot |
| Water Caves (`tidal`) | water | drips falling from it, a breath of mist |
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
- they are 3 to 10 world px across (a mist puff up to 22);
- the lights (embers, sparks, spores, fireflies, glints, motes) are drawn
  ADDED to what is under them, so they shine on dark ground and bright;
- about a dozen at a time on a tree, fewer on a rock (`rate`, a second, for a
  resource 100 world px across).

## How it works

- `src/rendering/landAuras.js` (`LandAuras`, owned by the effects renderer;
  `LAND_AURAS` is the table to tune: each land's rate, its kinds and their
  share, life, where they start, how they move, colours, size, glow).
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
  go are pooled and used again.
- A resource mined out stops making specks, its glow fades, and its last
  specks finish. One that leaves the view lets them go at once.
- `?noauras` leaves the resources plain.

## Memory and cost

- **Textures:** seven little canvases, under 10 KB in all. They are made
  behind the Wheel's loading screen (`landAurasWarm`, from
  `worldTrial.preloadWheel`, as the buildings' life) and destroyed on leaving
  the Wheel (`landAurasFree`, `wheelOnStop`), every sprite drawing them first.
  Without them nothing is drawn.
- **Drawing:** at most 260 sprites, only for the resources near you; a sprite
  of each shape batches with the others of its blend.

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

Pictures: `tools/qa/mp/out/landauras-<land>.png` (the tree) and
`landauras-<land>-rock.png`.
