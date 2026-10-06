# BroTown farming: the reward side -- items, consumables, buffs, cooking, life skills, quests and gold (codebase map)

(Work in progress -- notes appended as research proceeds. Citations are repo-relative path:line at the commit checked out on 2026-10-06.)

## Diego's General Store and potions

### Takeaway
Diego sells exactly five "staples" -- one heal food and four bottles -- all read from ONE server table, `SHOP_ITEMS` (server/src/data.js:466-525), bought server-settled into the bag and drunk from the bag's item popup; there is no hotbar, no auto-use and no per-item cooldown, only a game-wide "one timed effect at a time" rule. Nothing in quests, the tutorial, drop tables or dungeon balance requires them, but the stamina-ability design, the damage anticheat ceiling, the movement speed bound, the bag's "potion" filter and four server test suites are written against them, so removal is a data change plus a handful of comment/test/cap clean-ups, not a combat rebalance.

### Cited Findings
**What he sells (exists and works, server-settled).**
- The staple shelf IS `SHOP_ITEMS`: `shopStaples()` maps every key of it at its `cost` -- `server/src/shop.js:73-78`; `isShopStaple` is an own-property test against it -- `server/src/shop.js:79-81`.
- The five items, prices and effects -- `server/src/data.js:466-525`:
  - `cookedMinnow` 8g, effect `healFish`, power 23 (heals 23 HP) -- `server/src/data.js:467`
  - `staminaSalts` 12g, effect `stamina`, power 60 (+60 stamina, instant) -- `server/src/data.js:487`
  - `whetstone` ("Fury Tonic") 35g, `dmgBuff`, duration 180 s, mult 2.0 (double damage 3 min) -- `server/src/data.js:498`; owner quote "make it 2x and 3 minutes" -- `server/src/data.js:494`
  - `manaShard` ("Mana Draught") 30g, `manaSurge`, 180 s (fills mana, then a regen floor so specials can be cast nonstop) -- `server/src/data.js:509`
  - `swiftDraught` ("Swift Draught") 30g, `spdBuff`, 180 s, mult 1.5 (1.5x run speed) -- `server/src/data.js:524`
- Display names/descriptions (kept as a record only, not rendered): Cooked Minnow "Heals 23 HP", Stamina Salts "Restore 60 Stamina", Mana Draught "Cast specials nonstop for 3 min", Swift Draught "1.5x run speed for 3 min", Fury Tonic "Double damage for 3 min" -- `src/ui/panels/buildings/VendorPanel.jsx:255-261`.
- The basic trap (20g) was removed from the shelf because pet capture has no reachable UI; pets.js and the `trap` effect stay -- `server/src/data.js:468-486` (exists but dormant).
- Mana Draught arithmetic: a special costs one mana block on a 1,500 ms client cooldown; the surge pays `ceil(cost x tickMs/1500 x 1.25)` per regen tick (`MANA_SURGE.HEADROOM` 1.25) -- `server/src/data.js:436-464`, applied at `server/src/cooking.js:429-454`, read as a floor in the regen tick at `server/src/index.js:3486-3520`.
**Diego's other shelf: the player-fed "pile" (exists and works).**
- Besides staples he keeps ONE global public stock record `shop_stock`; players sell him remains/materials and anyone can buy them -- `server/src/shop.js:1-47`, `server/src/shop.js:235-262`.
- He PAYS `base x 0.5 / (1 + stock/40)` per unit (hyperbolic decay, floor 1g, cap 999 stock, max 100 per action) and CHARGES a flat `base` -- `server/src/shop.js:145-169`, `server/src/shop.js:218-233`.
- Base values by key family: remnants 18, snowman 26, `ore_` 40, `wood_` 24, `fish_` 28, `bar_` 240, `cooked_fish` 45, `shard_` 110, default 20; consumables priced at their own cost (whetstone 35, manashard 18, staminasalts 12, cookedminnow 8) -- `server/src/shop.js:109-144`. Worked example in the code: an 18g item fetches 9g into an empty pile, 7g after ten sold, 4g after forty, 2g after a hundred -- `server/src/shop.js:156-158`.
- He never buys his own staples back ("He only sells those") -- `server/src/shop.js:380-385`. Seed stock for a new world: 6 cooked trout -- `server/src/shop.js:193`.
- Economy scale noted in the code: "a player starts with 75 coins and the daily reward is 25" -- `server/src/shop.js:105-108`.
**Buying is server-settled.** Staple purchase debits coins and credits the bottle to `ps.inventory` (`_shopBuy` staple branch) -- `server/src/shop.js:449-463`; the older direct `shop_purchase` applies the effect at the counter with a refund if refused -- `server/src/cooking.js:504-528`. Both draw effects from the single `_applyShopItem` -- `server/src/cooking.js:406-502`.
**Using them (exists and works).**
- Drink is a bag action: `potion_drink` -> `_handleDrinkRequest` validates ownership against `SHOP_ITEMS`, applies, consumes, persists, echoes; a refused effect (healing during an arena match) does not consume -- `server/src/cooking.js:144-202`. Client Drink button in the item popup, gated on `caps.potionBag` -- `src/ui/mobile/dash/ItemDetailPopup.jsx:206-226`; cap advertised at `server/src/join.js:1422`.
- No hotbar, quick-slot or auto-drink exists: a repo-wide grep for hotbar/quickslot/autoPotion/autoEat/auto-use found only the `potionBag` cap and Drink gate (search of src/ and server/src).
- No per-item cooldown; instead ONE timed effect at a time: every granter calls `_clearTimedBuffs`, which wipes `ps._buffs` wholesale -- `server/src/cooking.js:381-398`; a second tonic "extends from now rather than stacking" -- `server/src/cooking.js:497-499`. Owner quote: "Only 1 effect active at a time though" -- `server/src/cooking.js:381-383`.
- Instant effects (`healFish`, `stamina`) do not clear buffs; only the timed ones do (`manaSurge`, `spdBuff`, `dmgBuff` call `_clearTimedBuffs`) -- `server/src/cooking.js:408-420`, `server/src/cooking.js:445`, `server/src/cooking.js:469`, `server/src/cooking.js:491`.
- No carry limit on bottles beyond the bag (the staple branch just adds `want`, up to 100 per purchase) -- `server/src/shop.js:449-462`, `server/src/shop.js:169`.
- Healing in an arena match is refused -- `server/src/cooking.js:408-413`.
**Where he stands.** Diego stands west of the Wheel Brotown's General Store steps with a proximity window (90 px of him) -- `src/data/wheelBuildingDoors.js:94-102`; the General Store's door itself opens the player market (`store: 'marketplace'` -- `src/data/wheelBuildingDoors.js:44`, whose building action is `exchange` -- `src/data/buildings.js:11`); the Auction House panel says "Potions and supplies are on Shopkeeper Bro's shelf, out in the plaza." -- `src/ui/panels/buildings/VendorPanel.jsx:240`.
**How much survival depends on them.**
- HP recovery sources other than potions: in the Wheel, a 1%-of-max-HP trickle every regen tick (~660 ms, `REGEN_TICKS` 30 x 22 ms) after 6 s with no damage taken or dealt -- `server/src/index.js:816-817`, `server/src/index.js:3406-3426`, `server/src/tick.js:27`, `server/src/index.js:761` (about 1.5% max HP/s, full in roughly 66 s). The 10%-per-tick hub heal applies only in `town`/`worldview`/`farm_home`, NOT `wheel` -- `server/src/index.js:3382`, `server/src/index.js:3401-3405`.
- Cooked fish (player-made) heal `92 + tier.lvl x 8` = 100 (minnow), 140 (clownfish), 180 (trout) plus the Recovery flat bonus -- `server/src/cooking.js:47-60`, `server/src/cooking.js:85`, FISH_TIERS at `server/src/data.js:424-428`. So Diego's 23-HP Cooked Minnow is a quarter of the worst player-cooked fish.
- docs/specs/damage-scale-design.md lists heals as "cooking `92 + tier x 8`, `cookedMinnow` 23" -- `docs/specs/damage-scale-design.md:99`, `docs/specs/damage-scale-design.md:245`.
- docs/specs/pace-and-difficulty.md contains no reference to potions, food, heals or gold (whole file read) -- `docs/specs/pace-and-difficulty.md:1-102`.
**What references the potions (whole-repo grep of the five ids and their display names).**
- Not referenced by any quest, tutorial step, monster drop table, achievement or dungeon config (no hit in server/src/quests.js, server/src/data.js QUEST_REWARDS, dungeon.js, wheeldungeon.js; the only server/src hits are shop.js, cooking.js, data.js, persistence.js, combat.js, prog3.js, abilities.js, arrowblast.js, tick.js, store.js).
- Stamina-ability design relies on salts being buyable: "REFILLABLE BY DESIGN: staminaSalts is a shop item (12 coins for 60 stamina ...) reachable from inside a combat zone with no cooldown" -- `server/src/abilities.js:305-311` (the 1,000 ms cooldown, not the pool, is the bound).
- Anticheat damage ceiling was sized "even under the 2.0x Fury Tonic" (staff peaks at 90.5% of the cap) -- `server/src/combat.js:858-864`; `damageMul` bounded 1..4 when read -- `server/src/combat.js:905-911`.
- Movement bound widened for the Swift Draught's x1.5 only while the server-stamped buff is live -- `server/src/movement.js:236-253`; prog3 move-speed arithmetic cites it -- `server/src/prog3.js:268-282`.
- Bag potion filter / art keyed off SHOP_ITEMS: `POTION_KEYS` in `server/src/store.js:166-171`; `POTION_THUMBS`/`isPotionKey` in `src/ui/mobile/dash/InventoryPanel.jsx:145-170`, `src/ui/mobile/dash/InventoryPanel.jsx:297-303`.
- mirror-audit §11 pins SHOP_ITEMS against VendorPanel's `SHOP_STOCK` both directions -- `server/test/mirror-audit.test.mjs:434-454`.
- Tests that buy or use them: `server/test/shop.test.mjs` (27 refs), `server/test/potions.test.mjs` (12), `server/test/lifeskills-economy.test.mjs:362-378`, `server/test/market.test.mjs:475-490` (lists a manaShard in the auction house), `server/test/arena.test.mjs:140-141`; QA scenarios `tools/qa/mp/mp-potions.mjs`, `mp-shopkeeper.mjs`, `mp-drinkcrash.mjs`.

### Inferences
- Removing the potions = deleting keys from `SHOP_ITEMS`. Because the staple shelf, the Drink gate, the bag filter, the store's potion category and the vendor price lines all derive from that one table, the shelf empties consistently; what must ALSO change is: mirror-audit §11 / VendorPanel `SHOP_STOCK`, the five test suites above, the dead `SHOP.BASE` lines (harmless), and any bottles already in players' bags (`_handleDrinkRequest` would then refuse them -- they would become undrinkable junk unless migrated or left in the table as "no longer sold").
- Removing the Fury Tonic LOOSENS nothing dangerous (the damage cap just gains headroom); removing the Swift Draught leaves the movement widening code dormant; removing Stamina Salts invalidates the abilities.js design comment but not its bound (the cooldown is the real bound).
- The real survival role of potions is small: Diego's only heal (23 HP) is weaker than any player-cooked fish (100+), so a farm food that heals ~100-200 HP or grants a timed buff would directly replace both the minnow and the bottles.
- Any farm food buff that changes damage, damage taken, mana regen or speed MUST be written through `ps._buffs` on the server (the worker is authoritative for damage; a client-only timer was the "thirty-five coins for a visual effect" bug -- `server/src/cooking.js:477-490`).

### Gaps
- Live usage numbers (how many potions players buy) are not in the repo; no analytics table was found.

## Buffs / temporary stat boosts and the stat pipeline

(pending)

## Cooking

(pending)

## Life skills

(pending)

## Items and inventory

(pending)

## Quests

(pending)

## Gold economy

(pending)
