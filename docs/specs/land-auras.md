# Each land's trees and rocks wear its element (v2.3.3346)

> The owner, 2026-10-18: a wood's tree is the same picture in every land so
> its log's colour is too, and *"Maybe you add effects to a pine tree to make
> it look like it belongs in that elemental zone but the wood logs stay the
> same?"*, *"Yes but keep in mind there are actually 10 elemental zones (dark,
> light, floral, poison, wind, ice, fire, water, electric, stone)"*.

Since v2.3.3343 each wood's tree and each metal's rock is one picture in every
land (`docs/specs/tier-trees.md`, `docs/specs/tier-ore.md`). Now each resource
in one of the Wheel's eight lands wears its land's element, drawn in code over
its picture. The picture never changes, so a tier's colours are the same
everywhere.

| Land | Element | What you see |
|---|---|---|
| Frost Ridge (`frost`) | ice | snow drifting down through the crown |
| Flame Fields (`ember`) | fire | embers rising off the top, flickering out |
| Wind Dunes (`sky`) | wind | grains of sand streaming off downwind |
| Stone Hollows (`hollows`) | stone | dust sifting down, crystal glints |
| Electric Foundry (`thunder`) | electric | sparks crackling, a jump at a time |
| Water Caves (`tidal`) | water | drips falling from the leaves |
| Poison Forest (`mist`) | poison | green spores rising, wobbling |
| Verdant Wilds (`verdant`) | floral | petals drifting down, a firefly or two |
| (the Dark realm) | dark | shadow wisps rising |
| (the Light realm) | light | motes of light rising |

The Dark and Light realms past the far gates are not built yet. Their two
looks are in the table already, ready for resources there whose ids name them
(`wn-dark-<k>`, `wn-light-<k>`).

BroTown and the commons wear nothing.

## How it works

- `src/rendering/landAuras.js` (`LandAuras`, owned by the effects renderer).
- A resource's land is in its id: the worker names the Wheel's nodes
  `wn-<land>-<k>` (`wheelzone.js _wheelSpawnNodes`).
- Each resource near the view that is drawn (you hold its tool) makes specks
  at its land's rate, more for a wider one, inside its picture's box
  (`treeGeom` / `oreGeom`): from its crown, its top or all over.
- Every speck is a sprite of ONE 2 x 2 white texture, tinted -- square specks,
  the pixel look, all in one batch. At most `AURA_MAX` (180) are alive; specks
  let go are kept in a pool and used again.
- The specks of a resource are a Container that RIDES on its picture
  (`_ridesOn`, the depth pass's rider, as the buildings' fire): in its layer, a
  quarter step after it, so they are drawn just in front of it and behind
  anyone south of it, wherever the depth pass moves it.
- A resource mined out stops making specks and its last ones finish. One that
  leaves the view lets them go at once.
- A tree you stand behind is seen through (tier-trees.md), and so are its
  specks: they take its picture's alpha.
- `?noauras` leaves the resources plain.

## Memory and cost

One 2 x 2 texture. At most 180 sprites. Only the resources near the view.

## Tests

`mp-landauras`: on a phone in the Wheel, the player is put beside the nearest
tree and rock of each of the eight lands in turn, and beside the commons' pine
(the page's own position: the specks are the page's alone). The commons' pine
makes none; every land's tree and rock make specks of that land, riding on its
picture, inside its box; never more than the cap. Pictures:
`tools/qa/mp/out/landauras-<land>.png`.
