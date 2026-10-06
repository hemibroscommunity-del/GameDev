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

(pending)

## Quests

(pending)

## Gold economy

(pending)
