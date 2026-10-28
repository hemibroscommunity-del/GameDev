# The coin piles (v2.3.3734)

The owner's two ChatGPT sheets, uploaded 2026-10-28 ("I want these as the coin
art instead of the current one (and at different amounts)"), kept here byte for
byte so the game art can be cut again.

| file | what it is |
|---|---|
| `coins-labelled.png` | the 14 piles, each over its label: which amount shows which pile |
| `coins.png` | the same 14 piles with no labels: the art the game uses |

The labels, read like a page (row by row, left to right):

| row | piles |
|---|---|
| 1 | 1, 2, 3, 4, 5 |
| 2 | 10, 50, 100, 1,000, 5,000 |
| 3 | 10,000, 50,000, 100,000, 200,000+ |

An amount of coins shows the pile whose label is the largest at or under it:
7 coins show the 5 pile, 12,345 the 10,000 pile, 250,000 the 200,000+ pile
(`src/game/coinArt.js` `coinArtFor`). A coin beside a price ("120 [coin]") is
the single coin, the 1 pile.

To cut them again: `node tools/ui/add-coin-art.mjs` (writes
`public/icons/coins/coin-<label>.png` and `src/data/coinPiles.js`; `--dry`
writes to a temporary folder instead). Each pile comes out at most 112 px on
its long side, on 256 colours or fewer, with its glow and sparkles kept.
