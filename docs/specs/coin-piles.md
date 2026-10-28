# The coin piles (v2.3.3734)

**The ask** (owner, 2026-10-28, the night before the judges): "I want these as
the coin art instead of the current one (and at different amounts) shown
between the labelled pic and unlabeled one".

**What it is.** Fourteen gold piles from the owner's sheet
(`assets/icons-source/coins/`), one an amount: 1, 2, 3, 4, 5, 10, 50, 100,
1,000, 5,000, 10,000, 50,000, 100,000, 200,000+. An amount shows the pile
whose label is the largest at or under it (`src/game/coinArt.js`
`coinArtFor(amount)`; nothing, zero or a broken number shows the one coin).
`COIN_ONE` is the one coin, for a coin that is only a unit beside a price.

**The pictures.** `public/icons/coins/coin-<label>.png`, cut by
`tools/ui/add-coin-art.mjs` with the Object Studio's steps (found by count on
the near-solid px, cut with a margin for the glow, trimmed, shrunk), then 256
colours each by a median cut over RGBA (the glow kept: NOT hardened), written
as palette PNGs with alpha. At most 112 px a side: the coin on the ground
(28 world px) and the drop line's picture at a phone's 3x. 29-46 KB decoded
each, 6-8 KB on disk. `src/data/coinPiles.js` is GENERATED.

**Loaded** behind the loading screen (`src/rendering/coinPileArt.js`, the
global gate's `coinPiles`): all fourteen as textures for the world, the same
`<img>`s warming the DOM's copies. Ordinary textures (~520 KB): their glow is
partly see-through, which `paletteTex.js`'s colour numbers do not keep.

**Where.**

| place | shows |
|---|---|
| the purse on the top bar (`ZoneHeader`), the character sheet's strip (`IdentityStrip`), the old menu bar, the stat screen, the furniture window | the pile for your gold |
| the bag's gold (`InventoryPanel`) | the pile; a sell price the one coin |
| coins on the ground (`effectsRenderer`) | the pile for the drop (a watcher, who does not know the share: the one coin) |
| the drop line "Coins x6" (`game/dropLines.js`) | the pile for the amount |
| the "+5 G" pickup number | the pile for the amount |
| quest rewards (`QuestPay`, the quest detail, the reward flying to the purse) | the pile for the reward |
| daily rewards, the daily chest's prize, a dungeon chest's gold line | the pile for the amount |
| the Town Hall's mail (a gold delivery) | the pile for the amount |
| a trade (both windows, an incoming offer), a duel's wager | the pile for the amount |
| the auction house: your wallet and each listing's price | the pile; the price you type the one coin |
| the party board (your gold) | the pile for your gold |
| shops, vendors, the bank, the gamble hall, Ace's flip, the daily spin, the benches, the farm's seeds, the dungeon creator, the codex | the one coin (a unit beside a price) |

The old pictures (`/icons/popups/gold.webp`, `/icons/ui/cur-gold.webp`) stay
on file, drawn nowhere in the game now.
