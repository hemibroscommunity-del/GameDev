# Loot that lands, with the rarest thing on top (v2.3.2771)

> Owner: "Make it so loot from monster drops kind of bounces when it first
> lands (each item independently). Show rarer items in top in terms of drop
> rate if overlap. Show 'RARE DROP!' message if there's a rare item in the pile
> and have it just give a faint white shine upward from its position."

All client-side and display only. The pickup test still reads the pile's
real position.

## The landing
For the first second after a pile is created (measured from the server's drop
time), every item on it falls from its own height, lands, and takes two
shrinking hops, with a small squash at each contact. The items are the
remains, the coins, the zone shard, and each rare item.
* Each item has its own height, delay and rhythm, so they land one after
  another rather than as one block.
* A pile you arrive at later, including one synced on zone entry, is
  already lying still.

## Draw order is drop rate
The loot layer sorts by `LOOT_Z` (`effectsRenderer.js`). Rarer items draw over
commoner ones, whether on one pile or where two piles overlap. The rates come
from the server.

| Item | Chance per kill |
| --- | --- |
| Remains, coins | nearly every kill |
| Zone shard | 10% |
| Weapon | 0.05–3%, by monster level |
| Rare gem | 1 in 200 |
| Iron armour | 1 in 500 |

Labels draw above all items. The ground rings stay underneath.

## Rare items: icon, shine, RARE DROP!
* **Icons:** a weapon, gem or armour piece now lies on the pile as its bag
  icon (`lootIcons.js`). Before this it was only a ring and a text label. The
  icons are 64px copies loaded on the loading screen (the preloading law).
* **Shine:** each rare item sends up a faint white shine, a soft additive beam
  minted in code. It is brighter just after landing, then breathes gently for
  as long as the item is there.
* **RARE DROP!:** a pile that arrives with a rare item calls "RARE DROP!"
  above itself once, for 2.4 s. An old pile never announces itself.

## QA
* `window.__btLootRare()` reports each pile's parts, their draw order and
  heights, and the RARE DROP! state.
* `tools/qa/mp/mp-lootland.mjs` (14 checks) covers a fresh rare pile, a fresh
  ordinary pile and an old synced pile.
