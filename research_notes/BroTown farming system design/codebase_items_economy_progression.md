# BroTown farming: the reward side -- items, consumables, buffs, cooking, life skills, quests and gold (codebase map)

(Work in progress -- notes appended as research proceeds. Citations are repo-relative path:line at the commit checked out on 2026-10-06.)

## Diego's General Store and potions

### Takeaway
Diego sells exactly five "staples" -- one heal food and four bottles -- all read from ONE server table, `SHOP_ITEMS` (server/src/data.js:466-525), bought server-settled into the bag and drunk from the bag's item popup; there is no hotbar, no auto-use and no per-item cooldown, only a game-wide "one timed effect at a time" rule. Nothing in quests, the tutorial, drop tables or dungeon balance requires them, but the stamina-ability design, the damage anticheat ceiling, the movement speed bound, the bag's "potion" filter and five server test suites are written against them, so removal is a data change plus a handful of comment/test/cap clean-ups, not a combat rebalance.

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
- Economy scale noted in the code: "a player starts with 75 coins and the daily reward is 25" -- `server/src/shop.js:105-108` (the client's actual default is 50 coins -- `src/data/gameSystems.js:5793`).
**Buying is server-settled.** Diego's drawer sends `shop_list` / `shop_quote` / `shop_buy` / `shop_sell` -- `src/ui/panels/ShopkeeperPanel.jsx:202-251`, dispatched at `server/src/index.js:4896-4917`. Staple purchase debits coins and credits the bottle to `ps.inventory` (`_shopBuy` staple branch) -- `server/src/shop.js:449-463`; the older direct `shop_purchase` (still dispatched at `server/src/index.js:5103`, no longer sent by any shop UI since the vendor shelf was removed -- `src/ui/panels/buildings/VendorPanel.jsx:181-203`) applies the effect at the counter with a refund if refused -- `server/src/cooking.js:504-528`. Both draw effects from the single `_applyShopItem` -- `server/src/cooking.js:406-502`.
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

### Takeaway
One timed-buff system exists and it is server-authoritative: `ps._buffs`, a persisted map of wall-clock end-times (`damage`, `spd`, `mana`, `resist`, `regen`, `hp`) plus magnitudes (`damageMul`, `spdMul`, `manaFlat`), written only by potions and cook recipes, with a strict "one timed effect at a time" rule. Only four of the six timers are read by the worker (damage dealt, damage taken, mana regen, the speed anticheat bound); `regen` and `hp` are written and never read server-side. There are no shrines, scrolls, elixirs, "well fed" or pet buffs; amulets and allocated points are permanent stats, not timed buffs. Farm buffs should reuse `ps._buffs`, adding a magnitude key per new effect.

### Cited Findings
**The record and its writers (exists and works).**
- Writers: `_applyShopItem` (potions) -- `server/src/cooking.js:406-502`; `_handleCookRecipe` (recipes) -- `server/src/cooking.js:294-339`. Every timed writer first calls `_clearTimedBuffs`, which replaces the whole record with `{}` ("drinking replaces a meal, eating replaces a drink, and a second potion replaces the first") -- `server/src/cooking.js:381-398`, `server/src/cooking.js:305`.
- NO STACKING by design: a second Fury Tonic "extend[s] from NOW rather than stacking" -- `server/src/cooking.js:497-499`; owner quote "Only 1 effect active at a time though" -- `server/src/cooking.js:381-383`.
- Magnitudes ride beside timers and are pruned with their owner: `BUFF_MAGNITUDES = { damageMul: 'damage', spdMul: 'spd', manaFlat: 'mana' }` -- `server/src/persistence.js:35-45`, `_pruneBuffs` -- `server/src/persistence.js:76-100` (called from `_saveRpg`, `server/src/persistence.js:177`).
**Readers on the worker (what a buff can actually change).**
- Outgoing damage: `if (_buffActive(ps,'damage')) base *= damageMul in [1,4] else 1.20` -- `server/src/combat.js:903-911` (1.20 = the cooked-food magnitude; 2.0 = Fury Tonic).
- Damage taken: `resist` multiplies by 0.95 (5% cut, floor 1) -- `server/src/combat.js:401-407`.
- Mana regen: `mana` timer x1.3 regen, or the Mana Draught's flat per-tick floor (bounded 1..200) -- `server/src/index.js:3486-3520`.
- Move speed: movement is CLIENT-owned; the worker only widens its anti-teleport bound by `spdMul` in [1,2] (else 1.15 food) while `spd` is live -- `server/src/movement.js:236-253`; the client multiplies the walk by the same number -- `src/ui/BroTown.jsx:4978-4990`.
- `regen` and `hp` timers: written (`server/src/cooking.js:315`, `server/src/cooking.js:337`) but no server reader exists (grep of `_buffActive(` across server/src returns only `resist`, `damage`, `mana`, `spd`: `server/src/combat.js:405`, `server/src/combat.js:908`, `server/src/index.js:3488`, `server/src/movement.js:251`) -- dormant; the cooking.js header still claims regen is applied in `_tickPlayerRegen` (`server/src/cooking.js:213-220`), which is stale.
- The client's own regen-buff math only runs when `!S._serverMonsters` (legacy offline path) -- `src/ui/BroTown.jsx:6834-6870`; client-side OOC HP regen is disabled ("melee-kill lifesteal is now the only HP recovery source per design", v2.3.149 comment) -- `src/ui/BroTown.jsx:6842-6847`; the legacy client monster AI predicts resist at 0.85 vs the server's 0.95 -- `src/game/monsterCombat.js:783-784` (drift in a legacy path).
**Persistence, logout, death.**
- `_buffs` is saved in the rpg blob (`server/src/persistence.js:221`, `server/src/persistence.js:496`) and restored on join (`server/src/join.js:735`); a fresh bootstrap starts `{}` (`server/src/join.js:880`). Timers are absolute `Date.now()` end-times, so a buff keeps counting down while you are logged out (it does not pause) -- `server/src/cooking.js:351-353`, `server/src/cooking.js:306-307`.
- Death does not clear buffs: no `_buffs` writer exists in any death/respawn path (whole-server grep: writers only in cooking.js, persistence.js prune, join.js load/bootstrap). (Inference from absence -- see Gaps.)
- Arena: healing items refused in an arena match -- `server/src/cooking.js:81`, `server/src/cooking.js:408-413`.
**HUD.**
- Timed buffs show as chips (icon, label, seconds left, magnitude) in a column at the top-left under the elemental status chips: Cursed, DoT, "Dmg+" (shows "x2" or "+20%"), "Mana" ("Surge"/"+30%"), "Regen", "Resist", speed -- `src/ui/BroTown.jsx:12230-12330`. The client mirrors the server's timers from every `player_state` and treats an absent key as OFF -- `src/networking/wsClient.js:1919-1963`.
- Monster-inflicted statuses (chill, burn, gust, hold, daze, shock, soak, poison) are a separate worker system with their own chips -- CLAUDE.md v2.3.2996 / v2.3.3014 bullets (`server/src/monsterstatus.js`, `src/ui/ElemStatusChips.jsx`).
**Permanent stat pipeline (for context, not timed).**
- Damage, damage taken, max pools and regen are computed by the worker from allocated prog3 points, gear tier/grade, amulet and elemental terms; e.g. defense -0.4%/pt cap -40% -- `server/src/combat.js:408-413`; move speed stat +0.4%/pt -- `server/src/prog3.js:268-282`; flame-gem amulet elemental damage -- `server/src/combat.js:970-980`; amulet stamina regen -- `server/src/index.js:3468`. The client predicts the same numbers (prog3 mirrors pinned by `prog3.test.mjs` / mirror-audit per `server/src/prog3.js:275-282`).
- "Well Rested" (+10% XP for 30 min after sleeping in the farm house bed) exists but is CLIENT-ONLY: the bed sets `R._wellRestedUntil` and restores HP/stamina/mana locally -- `src/ui/BroTown.jsx:13240-13250`; the multiplier is read only in the client's legacy local kill-XP path -- `src/game/monsterCombat.js:2671-2675`; the HUD shows "Well Rested +10% XP" -- `src/ui/BroTown.jsx:11742-11759`; no server file mentions it (grep of server/src for wellRested: none), and the worker owns XP. CLAUDE.md records the Hotel staying shut because "its rest is the farm bed's, client-only" (v2.3.3066 bullet; `src/data/wheelBuildingDoors.js` WHEEL_SHUT_DOORS note).
- Dormant client furniture buffs: `FURNITURE_RECIPES` (`src/data/gameSystems.js:1263`) includes an "Alchemy Set" ("Brew potions", 18 wood + 180 g, `statBuff: { potionPower: 1.2 }`) -- `src/data/gameSystems.js:1328-1339`; `getFurnitureBuffs(rpg)` would fold such multipliers (wellRestedMult, craftSpeedMult, xpMult, forgeCostMult, potionPower ...) -- `src/data/gameSystems.js:1396-1406` -- but nothing in src/ or server/ calls `getFurnitureBuffs` (grep: definition only), so every furniture stat is dead data. There is NO alchemy/herblore life skill.
- No other timed boosts were found: zero code hits for shrine / blessing / wellFed / "well fed"; "elixir" appears only as a word in the potion-category regex (`src/ui/mobile/dash/InventoryPanel.jsx`, `server/src/store.js`); pets have no combat bonus (pets.js has only capture chance) -- `server/src/pets.js:45`.

### Inferences
- A farm "food buff" that changes damage, damage taken, mana regen or speed can be built entirely on the existing record: write `ps._buffs.<timer> = endsAt` (+ a magnitude key registered in `BUFF_MAGNITUDES`) in a server handler, and it will be persisted, mirrored to the client, drawn as a chip, and cancelled by the next potion/meal. A NEW kind of effect (e.g. +max HP, +XP gain, +gather yield, +crit) needs a new server reader at the right authority point (e.g. `_recomputeMaxes`, `_prog3AwardXp`, `_harvestYieldMult`) -- none of those read `_buffs` today.
- The "one effect at a time" rule means food and potions compete for a single slot; if the owner wants food to coexist with potions (common in other games), `_clearTimedBuffs` must become per-category.
- Because timers are wall-clock, a long farm buff (e.g. 30 min) drains while offline; if that is unwanted the timer needs pausing on logout (not supported today).

### Gaps
- I did not run the server to confirm buff survival through a death; the claim rests on the absence of any `_buffs` writer in death/respawn code.

## Cooking

### Takeaway
Server-settled cooking today is (a) raw fish -> cooked fish via a timing/gesture minigame (`cook_request`), and (b) three multi-ingredient "herb" recipes (`cook_recipe`) whose herb ingredients the server never mints -- so the recipe path is real code with no live supply. Cooked fish is the game's main player-made heal (100/140/180 HP); recipes grant short timed buffs through the same `ps._buffs` record the potions use. Crops would slot in most cheaply as new `COOKING_RECIPES` rows (index-addressed, mirrored client/server).

### Cited Findings
**Fish cooking (exists and works, server-settled).**
- `cook_request {fishKey, kind}`: consumes one raw `fish_*`, mints `cooked_<fishKey>` (+200 cooking XP) or `burnt_dust` -- `server/src/cooking.js:576-665`; 200 XP is "25x the original" per owner ("Lifeskills xp is far too slow") -- `server/src/cooking.js:645-658`.
- The outcome is PLAYER TIMING (flip inside the window), which the server deliberately does not roll -- `docs/specs/cooking.md` ("Why the server does NOT roll the outcome"); server bounds cadence instead.
- Rate limits: `COOK_PER_MIN` 45 -- `server/src/cooking.js:20-30`; `COOK_FLOOR_MS` 900 ms between cooks -- `server/src/cooking.js:620-626`; botfp `COOK_HOUR_CAP` 2,400 -- `server/src/botfp.js:156`; quickest honest cycle 1,510 ms (`HONEST_CYCLE` 90 + 220 + 1,200) -- `server/src/gathering.js:106-113`; gesture target 1,500 ms -- `src/game/gesturePose.js:103`.
- Eating: `eat_request` heals `ceil(92 + tier.lvl x 8)` + the HP-grid Recovery flat bonus; only `cooked_fish_*` keys are edible; refused in an arena match -- `server/src/cooking.js:47-99`. Minnow 100, clownfish 140, trout 180 (FISH_TIERS lvl 1/6/11 -- `server/src/data.js:424-428`).
- The cooking spec still says "+8 cooking XP" -- `docs/specs/cooking.md` step 6 -- but the code pays 200 (`server/src/cooking.js:658`); code wins.
**Multi-ingredient recipes (code exists and works; ingredients never minted = effectively dormant).**
- Server table (index-addressed; the client sends `recipeIdx`) -- `server/src/data.js:430-434`: Herb Bread (1 `herb_firebloom`) -> `regen` 60 s; Root Stew (`herb_rock_vine` + `herb_cloudpetal`) -> `resist` 60 s; Firebloom Tea (2 `herb_firebloom`) -> `damage` 90 s. Client copy with names, `cookLvl` 1/3/6 and descriptions ("Regen 2%/s for 60s", "5% resist for 60s", "+5% dmg for 90s") -- `src/data/gameSystems.js:981-1015`.
- Server handler: dry-run all ingredients, consume (exact key or `cooked_`+key only), clear all timed buffs, write the timer, +`tier x 25` cooking XP (NOT the 25x scale) -- `server/src/cooking.js:226-347`. It does NOT check `cookLvl` (the server table has no such field) -- `server/src/data.js:430-434`.
- Supported effect words in the handler: `heal` (dead data, no recipe uses it), `regen`, `resist`, `damage`, `all` (damage+spd+hp+mana timers) -- `server/src/cooking.js:308-339`.
- No server code produces any `herb_*` key: the only server hits are the recipe table and a comment (`server/src/data.js:431-433`, `server/src/cooking.js:238-239`); harvest keys are only `wood_`/`fish_`/`ore_` -- `server/src/gathering.js:311-345`. The legacy FarmPanel harvest credits `herb_<name>` CLIENT-side only (`R.inventory[...] +=`, `localStorage`) -- `src/ui/panels/buildings/FarmPanel.jsx:218-231` (exists but client-only; the server's next player_state inventory echo would overwrite it).
- The client's quest `trader_3` "Farm to Table" (plant and harvest a crop, flag `harvestedCrop`) unlocks "Herb buff recipes ... at the Kitchen" -- `src/data/gameSystems.js:6806-6824`; the server pays it with no objective (client-trusted) -- `trader_3: {gold:150, xp:35, next:null}` -- `server/src/data.js:716`.
**Where cooking happens.**
- The Wheel Brotown's Cookhouse door opens TOWN_BUILDINGS `cooking` (`cookhouse: 'cooking'`) -- `src/data/wheelBuildingDoors.js:39`, the KITCHEN building ("Cook food buffs", action `cook`) -- `src/data/buildings.js:15`; its panel lists the fish minigame and the herb recipes, greying a recipe below its `cookLvl` -- `src/ui/panels/buildings/CookPanel.jsx:503-711`.
- A campfire is lit by burning a `wood_*` log from the bag; the server only consumes the log, the fire itself is a 45 s client-local prop -- `server/src/cooking.js:101-142`.
- Cooking the bag's best recipe from a campfire prompt also sends `cook_recipe` -- `src/ui/BroTown.jsx:13400-13470`.

### Inferences
- A crop-based recipe needs: a new row appended to BOTH `COOKING_RECIPES` tables (append only -- the index is the wire id), ingredient keys the server can mint (a server-settled harvest), and an effect word the handler and the readers understand. "Heal" recipes already have a handler branch.
- Because the recipe XP (`tier x 25`) was deliberately NOT scaled 25x (`server/src/cooking.js:651-657`), a crop recipe pays ~1/8 of a fish cook's 200 XP unless that is changed.
- Herb items (`herb_firebloom`, `herb_rock_vine`, `herb_cloudpetal`) are an existing, named, iconed ingredient set (`src/ui/panels/TradeWindowPanel.jsx:94`) with zero live source: they are the obvious first crops if the farm becomes server-settled.

### Gaps
- Whether the owner wants recipe buffs at all (the recipes are pre-Wheel design) is not stated in code.

## Life skills

### Takeaway
There are ten life skills on both sides and `farming` is ALREADY one of them (persisted, migrated, leaderboarded, shown in the Skills panel) -- it simply has no server-settled XP source; the only farming XP grant is the legacy client-only FarmPanel. A server-side Farming skill would follow the gathering pattern exactly: a server XP grant through `_addLifeSkillXp`, an optional level gate table like `GATHER_REQ_LVL`, and botfp/rate caps.

### Cited Findings
- Client list: woodcutting, fishing, mining, farming, cooking, blacksmithing, woodworking, gemCutting, enchanting, trapping -- `src/data/lifeSkills.js:9`; server migration keys, same ten -- `server/src/migrations.js:88`; leaderboard maps `farming` -- `server/src/leaderboard.js:65`; chain score lists it -- `server/src/chainscore.js:60`; Skills panel shows Farming ("Grow ingredients at the farm") under "Utility" -- `src/ui/panels/SkillsPanel.jsx:249-262`; leaderboard tab -- `src/ui/mobile/dash/LeaderboardPanel.jsx:33`.
- The only farming XP grant is client-side: `addLifeSkillXp(sk, 'farming', p.tier * 20)` in the legacy FarmPanel -- `src/ui/panels/buildings/FarmPanel.jsx:223` (exists but client-only; no server writer -- grep of server/src for 'farming' finds no XP grant).
- Level curve (both sides, byte-identical): XP to next level = `ceil(500 x 1.08^(level-1))` -- `src/data/lifeSkills.js:8`, `server/src/gathering.js:457-476`. Computed from that formula: 500 XP for L1->2, 1,000 at L10, 2,158 at L20, 21,714 at L50; cumulative to reach L5 = 2,254, L10 = 6,247, L20 = 20,732, L30 = 51,997, L50 = 265,197, L99 = 11,780,929 (arithmetic on the cited formula).
- Harvest XP = `ceil((tier x 1.5 + 5) x 25) x accuracy` (ok 1.0 / good 1.5 / perfect 2.0) -- `server/src/gathering.js:446-455`, `server/src/gathering.js:360-364`; computed: tier 1 = 163/245/326, tier 6 = 350/525/700, tier 11 = 538/807/1,076. The "x 25" is the owner's 25x ("Lifeskills xp is far too slow", v2.3.1435 + v2.3.1765) -- `server/src/gathering.js:447-452`; `docs/specs/pace-and-difficulty.md:29-33` says life skills were deliberately NOT halved with combat XP.
- So a level-1 gatherer levels in 2-4 harvests (500 XP / 163-326), and ~20-40 harvests reach Lv 10.
- Not 25x-scaled, by explicit choice: recipe cooking (`tier x 25`), forge/woodwork crafting, enchanting, gem cutting, trapping -- `server/src/cooking.js:651-657`.
- Level gates: `GATHER_REQ_LVL` = ore {1:1, 6:1, 11:5}, fish {1:1, 6:5, 11:10}, tree {1:1, 6:5, 11:10} -- `server/src/gathering.js:147-151`, mirrored `src/data/lifeSkills.js:43-47` (mirror-audit pinned); enforced on `extraction_start` and `node_strike` with kill switch `gatherreq: false` -- `server/src/gathering.js:115-146`; a below-level try is a client-only animation that sends nothing (CLAUDE.md v2.3.3059).
- Tools: one per gathering skill, held as inventory items `woodcutting_axe`, `fishing_pole`, `mining_pickaxe`, granted by quest `life_1` -- `server/src/gathering.js:520-536`, `server/src/data.js:679-685`; "Deliberately NOT applied to farming/cooking/the crafting skills ... Anything absent from this map is ungated" -- `server/src/gathering.js:528-531`. Tools survive death -- `server/src/gathering.js:538-569`.
- Yield: trees and fish always 1 per harvest; ore 2 on a 'perfect' -- `server/src/gathering.js:347-358`; 'perfect' claims capped at 45/min (`HARVEST_PERFECT_PER_MIN`) -- `server/src/gathering.js:113`, `server/src/gathering.js:366-387`; botfp `HARVEST_HOUR_CAP` 2,400 -- `server/src/botfp.js:148`.
- Item keys are minted by the server from type + tier: `<wood|fish|ore>_<name>` (e.g. `wood_pine_log`, `fish_minnow`, `ore_black_steel_ore`) -- `server/src/gathering.js:311-345`.
- Node respawn 20 s -- `server/src/index.js:1038`; harvest open delay base 4,000 ms (+1,200 ms per tier above skill, -250 ms per level below) -- `server/src/index.js:1057`, `server/src/gathering.js:489-500`.
- Harvest also rolls a 33% elemental shard -- `server/src/gathering.js:478-485` (on the Wheel the node's `home` land's shard; none on the commons -- CLAUDE.md v2.3.3012).
- A life skill is never level 0 (`healLifeSkillLevels`, both sides) -- CLAUDE.md v2.3.3039-3046 bullet.

### Inferences
- A Farming skill would reuse: `_addLifeSkillXp(ps, 'farming', xp)` (exists), the persisted `ps.lifeSkills.farming` record (exists), a level-gate table keyed by crop (pattern of `GATHER_REQ_LVL` + mirror-audit), and a botfp-style hourly cap. Because crops are timer-based (not swing-based), the anti-cheat surface is mostly "the server owns the plant time"; harvest XP per crop should be sized against the 163-1,076 per-harvest and 200-per-cook figures above so Farming levels at a similar pace to the other gathering skills.
- If seeds are gated by Farming level in "levels of 5" like the owner's ore/fish rule, the natural ladder is crop tiers at Farming 1 / 5 / 10 / 15 ...

### Gaps
- No doc states target hours-to-level for life skills; only the per-action XP and curve exist.

## Items and inventory

### Takeaway
There is no central item-definition table for stackables: an item is a lower-case string key in the server-owned map `ps.inventory = { key: qty }`, minted by whichever server code path grants it (harvest, loot, shop, quest, cook), and the client infers its name, category, art and buttons from the key (exact-key tables first, then prefix/regex rules). Equipment is separate (weapon stash 8, gear stash 32, tier tables mirrored and audited). So adding seeds/crops/fertilizer is "pick key families + have the server mint them + teach the bag their name/art/category/action"; a hoe or watering can would follow the gathering-tool pattern (an inventory key that survives death).

### Cited Findings
**Storage and authority (exists and works).**
- Stackables live in `ps.inventory` (key -> integer); the client adopts the server's map wholesale from every `player_state` -- `src/networking/wsClient.js:1788-1790` -- so anything credited only on the client (e.g. the legacy FarmPanel's `herb_*`, `src/ui/panels/buildings/FarmPanel.jsx:218-223`) is overwritten by the next echo.
- Keys are minted server-side by family: harvest `<wood|fish|ore>_<name>` -- `server/src/gathering.js:311-345`; cooked `cooked_<fishKey>` / `burnt_dust` -- `server/src/cooking.js:642-661`; potions by their `SHOP_ITEMS` id -- `server/src/shop.js:449-462`; remnants via remnantInvKey and zone shards `shard_<zone>` -- `server/src/shop.js:110-130` (key families listed in SHOP.BASE comments); quest grants `{kind:'inv', key, n}` -- `server/src/data.js:679-685`; daily chest `daily_chest` -- `server/src/dailychest.js:36-45`; bars `bar_<metal>` -- `server/src/shop.js:121-124`.
- No stack-size cap or bag-slot cap exists on the server (no such constant in server/src; grep for BAG/STACK/INV caps found only bootstrap limits): a NEW character's client-supplied bag is capped at 100 keys x 50 each and 2,000 coins on first join -- `server/src/join.js:835-851`. Per-action limits exist instead (Diego 100 per action, `server/src/shop.js:169`; auction house qty 1..9,999, `server/src/store.js:139-141`).
- Weapons live in `ps.weaponStash` (max 8) -- `server/src/index.js:833`; armour/shields/legs/cosmetics/amulets in server gear stashes (cap 32) -- `server/src/gearstash.js:73`.
- The bank building is a read-only summary of gold and equipped gear (no item storage) -- `src/ui/panels/buildings/BankPanel.jsx:3-8`.
**Death.** Death wipes the bag except gathering tools and any key that is the objective of a shipped quest (derived from `QUEST_REWARDS`), and drops the rest in a pile the owner alone can loot for 60 s, anyone for 120 s total -- `server/src/gathering.js:538-583`, `server/src/quests.js:72-117`, `server/src/index.js:3212-3218`, `server/src/index.js:4083-4135`, `server/src/index.js:1160-1164`; no pile is made in `town` or `farm_home` (items are simply gone) -- `server/src/index.js:4104-4105`. In No man's land the pile is the killer's -- CLAUDE.md v2.3.3058 bullet.
**Client presentation (exists and works).**
- Bag categories are FOUR filters from `classify(key)`: weapon / armor / potion / crafting (default) -- `src/ui/mobile/dash/InventoryPanel.jsx:37-63`; potions are recognised by exact key (`isPotionKey`, derived from `POTION_THUMBS`) or words potion/elixir/tonic/salve/brew/tincture/draught -- `src/ui/mobile/dash/InventoryPanel.jsx:58-60`, `src/ui/mobile/dash/InventoryPanel.jsx:297-303`. There is no "food" category: cooked fish file under crafting.
- Display names: exact-key `ITEM_NAMES` overrides, else a prettified key -- `src/ui/mobile/dash/InventoryPanel.jsx:237-248`; icons: exact keys then regex families (wood/log/plank, fish, ore, bar_ ...) -- `src/ui/mobile/dash/InventoryPanel.jsx:305-345`.
- Bag actions by key family: Eat (`cooked_fish_*`), Drink (`SHOP_ITEMS` ids, gated on `caps.potionBag`), Open (ticket/chest), Sell (auction house) -- `src/ui/mobile/dash/ItemDetailPopup.jsx:196-232`.
**Mirroring.** Stackable keys are not mirrored (they are strings); the data tables that ARE pinned client<->server by `server/test/mirror-audit.test.mjs` include ARCHETYPES, MONSTER_HP_CURVE, FISH_TIERS (§3), COOKING_RECIPES index-aligned (§4), QUEST_REWARDS vs QUEST_CHAINS both directions (§5), BLACKSMITH/WOODWORKING tiers (§6), GUILD_SKILLS/GUILD_QUESTS (§7), SHOP_ITEMS vs VendorPanel (§11), life-skill retune constants (§13), smelting rows, gathering hits, gather levels -- section headers at `server/test/mirror-audit.test.mjs:108-1520`.
**Selling / trading paths an item gets for free.**
- Diego buys ANY key at a family price (default 20, half paid, decaying with his pile) -- `server/src/shop.js:109-233`; a new family (e.g. `crop_`) would be priced at BASE_DEFAULT 20 (10 paid at an empty pile) until a `SHOP.BASE` entry is added -- `server/src/shop.js:144`, `server/src/shop.js:206-216`.
- Auction house (`store.js`): any inventory key of <= 32 characters, qty 1-9,999, price 1-999,999, 10 listings per player, 2,000 world-wide, fixed 7-day expiry, escrowed, no listing fee or sales tax -- `server/src/store.js:100-141`, `server/src/store.js:607-619`.
- The order-book market (`market.js`) is weapons-only (its bucket key is a weapon taxonomy), 24 h orders, no fee -- `server/src/store.js:3-11`, `server/src/market.js:35-40`.
- Player trades (`trade2.js`) move stackables and gold between two players -- `server/src/trade2.js:242`.
**Existing unused farm-flavoured data (stale design / dormant).**
- `ZONE_RESOURCES` gives every element a `herb`, a `seed` ('Ash Root Seed', 'Ice Cap Seed', 'Kelp Seed' ...) and a `food`/`foodStat` ('Fire Resist'/flameDef, 'Regen Boost'/regen, 'Speed Boost'/speed, 'Defense Boost'/defense ...) -- `src/data/items.js:2-11`; no server file references these seed or food names (grep of server/src for the herb names found only the recipe table). Label: exists but dormant.
- Herb item glyphs exist for `herb_firebloom`, `herb_rock_vine`, `herb_cloudpetal` -- `src/ui/panels/TradeWindowPanel.jsx:94`.

### Inferences
- New farm items should be short, prefixed key families (e.g. `seed_<crop>`, `crop_<crop>`, `fert_<kind>`) so: the auction-house 32-character limit holds, Diego can price them by one `SHOP.BASE` prefix, the bag can classify/icon them by prefix, and a quest can ask for a whole family with `invPrefix` (as `cooked_fish_` and `ore_` do).
- A hoe/watering can should be an inventory key added to the death-kept set (today `_GATHER_TOOL_FOR_SKILL` + quest objectives) or it will be lost on death the way the axe was before v2.3.1688 (`server/src/gathering.js:538-553`).
- Crops carried in the bag die with the player (pile, 120 s). If crops are meant to be a safe store of value, they need either a farm-side storage (none exists) or to be protected like quest items.
- The bag needs a "food" (or "produce") category and an Eat action generalised beyond `cooked_fish_*` if crops/meals are consumable.

### Gaps
- I did not find any per-player cap on total distinct inventory keys after bootstrap; whether a very large bag causes UI or payload problems was not measured.

## Quests

### Takeaway
Quest steps are declarative objectives on the server (`QUEST_REWARDS` in server/src/data.js) mirrored by display data on the client (`QUEST_CHAINS` in src/data/gameSystems.js), pinned both directions by mirror-audit §5. Supported verified types are `kill`, `gather` (any node harvest), `collect` (hold N of an exact `invKey` or an `invPrefix` family, optionally `consume`), and a reserved `flag`. "Deliver 10 carrots" is expressible today with zero new code (`collect` + `consume`); "grow a pumpkin" needs a new server-credited counter (a `gather`-like kind such as `harvest_crop`) because flags are not server-owned. No quest requires a potion or other bought consumable; two require cooked fish / ore.

### Cited Findings
- Objective grammar: `{type:'kill', arch, count, zone}`, `{type:'gather', count}`, `{type:'flag', flag}`, `{type:'collect', invKey|invPrefix, count, consume, zone}`; "flag-type must NOT be wired to server _questFlags writes until flags are server-owned" -- `server/src/data.js:527-538`.
- Counters: the server is the sole writer of `_questKills`; `_creditQuestObjective(playerId, kind, arch, zone)` increments every active quest whose objective type matches (called from monster kills and harvests) -- `server/src/quests.js:163-192`.
- Turn-in verifies the objective, then consumes `collect` items if `consume`, then pays gold, XP (into a chosen combat skill for prog3 characters), 5 AP, and item grants -- `server/src/quests.js:194-300`; `QUEST_AP_REWARD` 5 -- `server/src/quests.js:23-24`.
- `collect` counts an exact key or sums a family prefix -- `server/src/quests.js:33-65`.
- Every quest objective's items are kept through death, table-wide -- `server/src/quests.js:67-117`.
- Quests without an objective stay client-trusted -- `server/src/quests.js:13-18`.
- The live quest table and payouts (gold / xp): tutorial `tut_1` 25/15 (collect 4 `snowman`, grants Copper Great Sword + Pine Shield on accept, Pine Bow + Pine Staff on turn-in), `tut_2` 60/35 (6 `slime-remnants`), `tut_3` 150/53 (5 `skeleton-remnants`), `tut_4` 400/105 (6 `fire-goblin-remnants`, Copper Greaves) -- `server/src/data.js:581-659`; life chain `life_1` 60/28 (2 `cooked_fish_*`, grants axe + pole, pays pickaxe), `life_2` 200/70 (5 `ore_*`, Copper Torso) -- `server/src/data.js:679-708`; mayor 50/10, 100/28 (kill 5), 300/70; trader 25/8, 75/18 (gather 3), 150/35; enchant 50/15, 200/53, 500/105; scout 100/28, 200/53; bron 60/15 ... 400/88; luna 40/10 ... 250/63; kai 80/20 ... 350/70; ash 100/28 ... 800/175 -- `server/src/data.js:711-735`.
- Quest XP was halved in v2.3.3054 (both tables) -- `docs/specs/pace-and-difficulty.md:16-28`.
- Client chain entries carry `npc`, `title`, `desc`, a `check(rpg)` display predicate, `reward`, `next`, `unlocks`, `dialogue` -- e.g. `trader_2`/`trader_3` -- `src/data/gameSystems.js:6780-6824`. `trader_3` "Farm to Table" (plant and harvest a crop) is client-trusted (no server objective) and reads the client flag `harvestedCrop` set only by the legacy FarmPanel -- `src/data/gameSystems.js:6806-6824`, `src/ui/panels/buildings/FarmPanel.jsx:225-226`, `server/src/data.js:716`.
- Guild "quests" are skill-level checkpoints that pay gold + AP per life skill, INCLUDING farming: GUILD_SKILLS lists `farming` -- `server/src/data.js:819-822`; rungs Lv5 30g/10AP, Lv15 80g/25, Lv30 150g/40, Lv50 300g/75, Lv70 500g/150, Lv90 800g/250, Lv100 1,200g/400, Lv150 2,000g/750 -- `server/src/data.js:823-832`; claimed server-side against `ps.lifeSkills[skill].level` -- `server/src/guilds.js:34-61`; the Wheel's Guild Hall opens the guild panel since v2.3.3066 (CLAUDE.md).
- No quest objective references a potion or bought consumable (the five `SHOP_ITEMS` ids appear in no QUEST_REWARDS objective -- see the potion reference sweep in the Diego section).
- The quest road in the Wheel points at the nearest node a step needs (`_wheelGatherPoint`, a step's `node`) -- CLAUDE.md v2.3.3012 bullet.

### Inferences
- "Deliver 10 carrots": `{type:'collect', invKey:'crop_carrot', count:10, consume:true}` in QUEST_REWARDS plus the display entry in QUEST_CHAINS; it works as soon as the server can mint `crop_carrot`. Side effect: every objective key becomes death-protected table-wide, so a common crop used as a quest objective would never drop on death for anyone.
- "Grow a pumpkin" / "harvest 5 crops": add a new objective kind credited by the server's crop-harvest handler via `_creditQuestObjective(id, 'harvest', cropKey)` (mirrors how `gather` is credited by node harvests); `flag` should not be used (server-owned flags do not exist).
- The farming guild rungs (30g at Farming 5 ... 2,000g at 150) start paying automatically once the server grants Farming XP -- a free reward ladder already wired.

- Only Mayor Bro's nine quests (tut_1-4, life_1-2, mayor_1-3) can be offered: the quest log shows only quests whose giver is in `NPC_DATA`, which holds Mayor Bro alone; the other 22 quests (Trader Tix, Enchantress, Scout, Blacksmith Bron, Healer Luna, Beastmaster Kai, Veteran Ash) are dormant data -- `src/ui/mobile/sheet/questModel.js:3-30`, `src/data/gameDisplay.js:4901-4910`. So `trader_3` "Farm to Table" is unreachable today (exists but dormant).

### Gaps
- Whether the owner wants a farm quest chain from Mayor Bro, from a new farm NPC, or from the dormant Trader Tix chain is a design question the code cannot answer.

## Gold economy

### Takeaway
Gold is small-numbered: a new character starts with 50, monsters drop 5-10 g each through level 20, the whole reachable quest line pays 1,345 g once, the daily chest 25-136 g, and the commonest sinks are 8-55 g (potions, early forge tiers) with big one-off sinks at 500 g (clan) and 500 x 4^h (hardening). The only NPC that buys goods, Diego, pays half a family base price that decays hyperbolically per exact item key across the whole world, so any single item key can only ever extract about 65 x its base price from him in total (before players buy the pile back). No doc sets a gold-per-hour target; the estimates below are a model built from the code's numbers.

### Cited Findings
**Faucets (gold created).**
- Starting coins: client default 50 -- `src/data/gameSystems.js:5785-5793`, adopted by the worker on a new character's first join (capped at 2,000) -- `server/src/join.js:835-851`. (A comment in shop.js says "a player starts with 75 coins" -- `server/src/shop.js:105-106` -- which disagrees with the code's 50.)
- Monster coins: `gold = ceil(_monsterStat(5, lvl, 1.035, 1.020, 1.015))` -- `server/src/index.js:1526`, `server/src/index.js:1566`, curve at `server/src/index.js:1258-1264`; computed from that formula: L1 5, L2 6, L5 6, L7 7, L10 7, L15 9, L17 9, L20 10, L25 12, L30 14, L40 18, L50 21. Paid on pickup as `pile.coins x share` (contribution share, killer alone = 1.0) -- `server/src/combat.js:1615-1640`, `server/src/index.js:4320-4330`, `server/src/index.js:4403`.
- Per-kill loot besides coins: one remnant for slime/snowman/fire goblin/mummy/skeleton kills -- `server/src/index.js:2815-2820`, `server/src/index.js:3870-3873`; a 10% zone shard -- `server/src/index.js:1199`, `server/src/index.js:2821-2824`; rare weapon/armour/gem rolls -- `server/src/index.js:3876-3918`.
- Monster respawn 18.75 s (faster with more players in a zone) -- `server/src/index.js:931`, `server/src/spawnscale.js:193-200`.
- Quests: only Mayor Bro's chains are offered (the quest log hides quests whose giver is not in the world, and `NPC_DATA` holds only Mayor Bro) -- `src/ui/mobile/sheet/questModel.js:3-30`, `src/data/gameDisplay.js:4901-4910`; his nine quests pay 25+60+150+400 (tutorial) + 60+200 (life) + 50+100+300 (mayor) = 1,345 g once -- `server/src/data.js:581-713`.
- Daily chest: 78% coins = (25 + 10 x (streak-1), streak capped at 7) x a roll in [1.0, 1.6] -> 25-40 g on day 1, 85-136 g at a 7-day streak; 8% ten cooked minnows; 8% a rare gem; 6% armour -- `server/src/dailychest.js:36-56`; legacy plain-gold daily 25 -- `server/src/cadence.js:40`.
- Skill-guild rungs (one-time per skill, all ten life skills incl. farming): 30 g at Lv5, 80 at 15, 150 at 30, 300 at 50, 500 at 70, 800 at 90, 1,200 at 100, 2,000 at 150 -- `server/src/data.js:819-832`, `server/src/guilds.js:34-61`.
- Dungeon clear: `30 x waves + monsterLevel x 2` with a boss, else `20 x waves` -- `server/src/dungeon.js:768-777`.
- Selling a stash weapon to the game: `ceil(tierMult x weaponBase x 0.5)` -- `server/src/gear.js:180-199`.
- Diego buying goods: half the family base, decaying `/(1 + stock/40)` per exact key, floor 1 g, max 999 held -- `server/src/shop.js:145-169`, `server/src/shop.js:218-233`, `server/src/shop.js:392-414`. Family bases: remnants 18, snowman 26, wood 24, fish 28, ore 40, cooked fish 45, shard 110, bar 240, default 20 -- `server/src/shop.js:109-144`. Computed totals for selling N units into an EMPTY pile (sum of the cited formula): default/new family (20): first unit 10, 10 units 90, 40 units 279, 100 units 504, all 999 units 1,307; ore (40): 20 / 180 / 559 / 1,009 / 2,615; cooked fish (45): 22 / 203 / 629 / 1,135 / 2,942; shard (110): 55 / 496 / 1,538 / 2,775 / 7,192; bar (240): 120 / 1,083 / 3,357 / 6,056 / 15,692. The pile is ONE world-wide record shared by all players and only drains when someone buys from it at the full base price -- `server/src/shop.js:34-40`, `server/src/shop.js:465-481`.
- Arena champion reward 2,000 g, described as a deliberate "house faucet" -- `server/src/gladiator.js:47`, `docs/ARCHITECTURE-HANDOFF.md:539`.
**Sinks (gold destroyed).**
- Diego's staples 8 / 12 / 30 / 30 / 35 g -- `server/src/data.js:466-525`; buying from his player-fed pile at the full family base -- `server/src/shop.js:465-481`.
- Forge and woodworking crafts: goldCost per tier wood/pine 8, copper/softwood 20, iron/hardwood 35, steel/cedar 55, titanium/maple 85, obsidian 120 ... up to 4,200 (plus 3-25 ore or wood) -- `server/src/data.js:755-811`, debited at `server/src/gear.js:433-461`.
- Amulet forge: 50 / 200 / 500 / 1,200 g plus gold bars -- `server/src/data.js:912-915`, `server/src/amulet.js:145-147`; gem extraction from 25 g -- `server/src/data.js:1076`, `server/src/amulet.js:239-242`.
- Hardening: 500 x 4^hardness (500, 2,000, 8,000, 32,000, 128,000) at 80/20/5/1/0.5% success -- `server/src/hardening.js:44-46`, `server/src/hardening.js:123-128`.
- Clan creation 500 g -- `server/src/clans.js:41`, `server/src/clans.js:135-136`; arena entry 100 g -- `server/src/gladiator.js:46`.
- Gambling: Ace's flip risks 3x the stake at a 45% win chance, an expected 10% rake on the amount at risk -- `server/src/gamble.js:32-51`; weekly jackpot deposits in 50 g tickets (50-5,000 per deposit) -- `server/src/cadence.js:43-45`, `server/src/cadence.js:140-160`.
- No market, auction-house or trade fee exists (no fee/tax constant in market.js, store.js, storeoffer.js, trade2.js; STORE and MARKET constant blocks -- `server/src/store.js:100-141`, `server/src/market.js:35-40`).
- A red-skull death in No man's land loses all gold to the killer (a transfer) -- `server/src/nomansland.js:406-407`.
**Docs.** `docs/BALANCE-PLAN.md` has no gold-income targets (its only gold numbers are the hardening cost, `docs/BALANCE-PLAN.md:348`); `docs/specs/pace-and-difficulty.md` covers XP and monster HP/damage only (`docs/specs/pace-and-difficulty.md:1-102`).
**Inputs for an hourly estimate (from code/docs).**
- At your own level a kill takes ~5.7-7.5 swings and costs ~31-32% of your HP (Melee 15 vs a level 17 slime; a level 7 vs a level 7 slime) -- `docs/specs/pace-and-difficulty.md:62-74`.
- HP refills at 1% of max every ~660 ms once you have neither taken nor dealt damage for 6 s (about 66 s from empty) -- `server/src/index.js:816-817`, `server/src/index.js:3406-3426`; a cooked fish heals 100-180 -- `server/src/cooking.js:47-60`.
- Gathering: a node respawns in 20 s -- `server/src/index.js:1038`; the quickest honest harvest cycle is 1.51 s -- `server/src/gathering.js:106-113`; hourly cap 2,400 -- `server/src/botfp.js:148`.

### Inferences
- **Rough early/mid income model (assumptions mine, not in code):** solo combat at your own level with a kill every ~20-30 s including the fight, walking and recovery gives ~120-180 kills/h -> about 600-1,800 g/h in coins at levels 1-20 (5-10 g a kill), plus one remnant per kill (Diego: 9-13 g each into an empty pile, but only ~250 g for the first 40 of a key world-wide) and a shard every ~10 kills (55 g into an empty pile). Gathering ore at, say, 2-4 harvests a minute is 120-240 ore an hour, but Diego pays only ~559 g for the first 40 of a key and ~1,009 g for the first 100 -- so NPC selling is a shallow, shared, quickly-saturated faucet; the auction house (player demand) is the elastic outlet. Treat ~1,000 g/h as the order of magnitude for an active early player, with a one-time ~1,345 g from the quest line.
- **Land expansion price magnitudes that fit these numbers:** a first expansion around 300-1,000 g (between the tut_4 reward of 400 and the 500 g clan creation; roughly an hour of play), with later expansions scaling geometrically (e.g. x2-x4 per step, in the same spirit as hardening's 500 x 4^h and the forge's 8 -> 4,200 ladder), so expansions remain a long-term sink rather than a day-one purchase.
- **Crop sell price magnitudes:** to sit alongside the existing families, a quick crop (minutes) fits a raw-material base of ~15-30 (Diego paying 7-15 for the first unit), a long crop (hours) a processed-goods base of ~45-110 (cooked fish to shard), and a cooked crop dish above its raw crop (the same "cooked beats raw" rule as `cooked_fish` 45 vs `fish_` 28 -- `server/src/shop.js:125-127`). Because Diego's decay is per exact key and world-wide, every distinct crop key gets its own ~65 x base lifetime ceiling with him; mass-produced crops will mostly be worth what other players pay on the auction house, unless crops are mainly consumed (quests, cooking, buffs), which is the healthier sink.
- If FarmVille-style timers let crops grow while the player is offline, farm gold is income that needs no play time; keeping a crop's gold well under the ~1,000 g/h active-play figure (e.g. a plot yielding tens of gold per hour of real time) stops farming from replacing combat as the main faucet.

### Gaps
- No telemetry or doc gives measured gold/hour, player counts, or Diego's live pile sizes, so the hourly figures above are a model, not a measurement.
- The client's melee swing interval was not pinned down (an old server comment cites ~300 ms per swing in a duel -- `server/src/index.js:3386-3388` -- but that predates later combat changes), so kills/hour is an assumption.
