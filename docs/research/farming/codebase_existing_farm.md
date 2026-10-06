# BroTown codebase: the farm that exists today (client + server inventory)

Researched at repo HEAD dfbc860 (v2.3.3067), 2026-10-06. Code is the source of truth; every claim about code is cited as `path:line` (relative to /home/user/GameDev). Status labels used throughout:
**[WORKS]** = exists and works · **[DORMANT/CLIENT-ONLY]** = exists but dormant, hidden, or runs only in the browser (not settled by the worker) · **[MISSING]** = does not exist.
Nothing was run (no browser, wrangler or vite); behaviour that depends on runtime interaction is marked as an inference.

## 1. What is the farm zone today, how do the Land Office and Feed & Seed send you there, and how do you get back?

### Takeaway
The farm is one zone, id `farm_home` ("Your Farm", 30x25 tiles = 960x800 px). It is drawn as one painted picture of a mossy cave clearing. The house, the Dungeon Workshop and the Pet House are invisible tap/proximity rectangles over that picture. Both farm doors in the Wheel's BroTown are working teleports [WORKS]. The farm's bottom gate brings you back to the Wheel door you left by, passing through today's town under a veil [WORKS].

### Cited Findings
- **Zone definition [WORKS]:** `farm_home: { id:'farm_home', name:'Your Farm', w:30, h:25, element:null, level:[0,0], music:'town', safe:true, personal:true, palette{…}, spawns:[], enemyEmoji:{} }`. Source: `src/data/zones.js:394-401`. Its size is 960x800 px, per the per-zone size note at `src/data/constants.js:35-38`.
- **The picture [WORKS]:** `src/rendering/tiledMaps.js:78` maps `farm_home` to `/maps/farm_v1.webp`, commented "redesign: cozy sunlit farm grotto (newly image-backed)". The file is 1373x1145 px and 251,808 bytes.
  - Viewed directly, it shows a cave clearing lit by a shaft of sun from an opening at the top. The middle is a dirt clearing with two small diagonal tilled strips. There is a pond with a little waterfall on the left, plus glowing mushrooms, ferns, flowers and fireflies.
  - **No house, barn, workshop, pet house, fence or crop is painted.**
- **Lighting and atmosphere:**
  - `src/rendering/lightfx/zoneLight.js:38-39` describes the farm as "a grotto lit by one shaft of sun through the roof at the TOP of the map"; the values are at `:49`.
  - Pollen motes and fireflies: `src/rendering/worldFx.js:63`.
  - The farm counts as an outdoor zone for time of day: `src/game/timeOfDay.js:39`.
- **Nothing is drawn on top of the picture:** the single-image render path returns before any tile or sprite branch (`src/rendering/systems/tileRenderer.js:857-869`).
  - A purchased village tileset that once drew town, meadow and `farm_home` was found unreachable and deleted in v2.3.1670 (`src/rendering/pixiRenderer.js:238-249`).
  - No world props or buildings are registered for `farm_home` (grep for `zone: 'farm_home'` finds nothing).
- **Logic grid (invisible) [WORKS as logic only]:** a procedural tile map is still generated for the zone (`src/data/gameDisplay.js:770-867`). It contains:
  - grass, and a 2-wide path from the south exit;
  - a 5x4 "house" at (MX-2, 3) (`:780-786`);
  - "Farm plots — 3x2 grid of sand tiles (tilled soil)", which in fact lays 4x3 = 12 patches of 3x2 sand (tile 6) (`:789-795`);
  - a random flower garden (`:798-800`), a tree border (`:803-813`) and a pond (`:822-826`);
  - the return exit, tile 9 at the bottom centre (`:816-819`);
  - three rectangles saved for proximity checks: `ZONES.farm_home._house` (`:830-835`), `_workshop` ("§DNG — Dungeon Workshop building (right side of farm)", `:837-849`) and `_petHouse` (with a flower "pet pen", `:851-866`).
- **Tile constants that are never placed [DORMANT]:**
  - `HOUSE_TILE=13`, `FARM_PLOT_TILE=14`, `FARM_BED_TILE=15` (`src/data/constants.js:84-86`), with their colours "house building (farm)", "farm plot (plantable)" and "bed (sleep to recharge)" at `src/data/gameDisplay.js:1265-1269`.
  - The generator above never writes tiles 13, 14 or 15.
- **Walk masks are off:** they have been globally off since v2.3.1693 (`src/rendering/tiledMaps.js:96-106`). The farm's own mask note says the "mask was a wider aspect than the art" (`:194`), and `public/maps/farm_v1.walk.json` (a 64x64 boolean grid) is unused.
- **NPCs [MISSING]:** none. The zone has `spawns:[]` (`src/data/zones.js:398`), and every trip in sets `S2.npcs = null` (`src/ui/panels/buildings/FarmPanel.jsx:115`).
- **Door table [WORKS]:** `src/data/wheelBuildingDoors.js:33-46` sets `feedseed: 'farm'` ("Feed & Seed: the farm panel", `:40`) and `landoffice: 'farmhome'` ("Land Office: travel to your own farm", `:41`).
  - The values are ids from today's-town building table. `src/data/buildings.js:16` has `{id:'farm', label:'FARM', desc:'Grow ingredients', action:'farm'}`; `:22` has `{id:'farmhome', label:'YOUR FARM', desc:'Visit your farm', action:'farmhome'}`; both use the icon `/icons/ui/bldg-farm.webp` (`buildings.js:8-9`).
  - The Wheel's plan places both on the town's farming-side street: `public/tools/world/plan.js:334-336` and `:358-359` (`feedseed` "today: 'farm'", `landoffice` "today: 'farmhome'").
- **How a door opens:** `src/game/interactions.js:105-106` runs `setBuildingPanel(b.action || b.id)`. The old quest gate (`farm: 'farming'`) is commented out ("BUILDINGS OPEN ON SIGHT", v2.3.1779, `:57-75`).
  - `'farm'` renders FarmPanel (`src/ui/BroTown.jsx:11630`).
  - `'farmhome'` renders an inline "🏡 Your Farm" modal (`src/ui/BroTown.jsx:11759-11843`) with the text "Visit your personal farm to grow crops, rest in bed, and tend your homestead." (`:11792`) and the buttons "🚶 Travel to Farm" (`:11830`) and "Cancel".
- **Getting in (both paths are client-side teleports) [WORKS]:**
  - **Feed & Seed → "Visit Your Farm"** (`FarmPanel.jsx:101-129`): preloads the zone's art (`:108`), calls `rememberFarmTrip` (`:109`), sets `currentZone='farm_home'` (`:110`), regenerates the map (`:111-112`), clears monsters, nodes and NPCs (`:113-115`), places you at tile (15, 21) (`:117-118`), shows the popup "Your Farm" and plays a beep (`:125-126`).
  - **Land Office → "Travel to Farm"** (`src/ui/BroTown.jsx:11804-11829`): the same, except it places you at the zone centre (`:11814`), sets `_currentDepth='shallow'` (`:11823`) and plays the town ambience (`:11827`).
  - The server learns the new zone only from the `z: S.currentZone` field of ordinary `move` messages (e.g. `src/ui/BroTown.jsx:4540`, `:4578`).
- **Remembering where you stood:** `rememberFarmTrip` (`src/game/wheelTownDoors.js:73-82`) runs `S._farmBack = isWheelTrialZone(S.currentZone) ? {x,y} : null`.
- **Getting back [WORKS]:** walk onto the return-exit tiles. The handler is `src/game/zoneTransitions.js:1203-1310`:
  - `_farmOut = (_leftZone === 'farm_home' && S._farmBack && wheelIsHome()) ? S._farmBack : null` (`:1206-1215`);
  - `setWheelArrival(_farmOut); wantWheelSpawn(S)` (`:1270`);
  - the popup reads "BroTown" (`:1271`);
  - `veilWheelTrip(S)` (`:1310`), so you go through today's town under one veil and arrive at the Wheel door you used.
  - Spec: `docs/specs/wheel-doors.md:57-61` and `:110-115`. The QA scenario `tools/qa/mp/mp-wheeldoors.mjs:241-282` checks the zone sequence `['wheel','farm_home','town','wheel']` and lands within 80 px of the door.
- **Custom-dungeon returns land on the farm [WORKS]:**
  - The server dungeon's completion sends you to `farm_home` after 3 s (`src/networking/gameEvents.js:876-911`; spec `docs/specs/dungeons.md:192-200`).
  - So does the legacy client path (`src/game/dungeonWaves.js:6`, `:82-100`, `:170-185`).
  - Wheel dungeons return to their own mouths instead (`gameEvents.js:878-880`).

### Inferences
- Where the invisible rectangles fall on the picture, worked out from code with TILE = 32:
  - the house is around x 416-576, y 96-224 (top centre, the light shaft);
  - the workshop is around x 704-832, y 320-416 (right side);
  - the Pet House is around x 96-224, y 608-704 (bottom left);
  - the 12 logic "soil" patches sit on the left, around x 96-300, y 320-600 (the pond side), not on the two painted tilled strips in the middle.
  - **The painting and the logic grid do not line up.** Any new farm needs real, drawn plot objects.
- Two different entry points: the Feed & Seed path drops you near the bottom gate (tile row 21), while the Land Office path drops you in the middle.

### Gaps
- Not verified in a browser where exactly the Sleep, Workshop and Pet House buttons appear on screen against the picture.

## 2. Is the farm shared or per-player? Can others see or enter it? How does the server treat it?

### Takeaway
**There is one shared farm for everyone [WORKS as a shared hub; "personal" is cosmetic].** Every player "on their farm" is in the same zone id `farm_home` and is drawn for everyone else there. Plots are per-player but exist only inside each player's own panel, so nobody sees anybody's crops. There is no ownership, invitation or visiting concept [MISSING].

The server treats `farm_home` exactly like town: an always-open safe hub with no monsters, no nodes, no PvP, and fast HP regen. A draft plan already proposes per-player farm instances `farm:<playerId>`, built like dungeon instances.

### Cited Findings
- **Other players are drawn by zone:** a remote player is drawn when `(other.zone || other.z || 'town') === S.currentZone` (`src/rendering/systems/entityRenderer.js:10504`).
- **"personal" is only a badge:** the zone's `personal: true` flag is read only by the Encyclopedia badge (`src/ui/panels/EncyclopediaPanel.jsx:719`; grep `.personal`).
- **How the server treats `farm_home`:**
  - **Valid zone:** listed in `VALID_ZONE_IDS` as a hub: "Hubs — no monsters, no spawn config, special-cased all over the server (the `z !== 'town' && z !== 'farm_home'` guards)" (`server/src/data.js:403-406`).
  - **Always open:** in `ALWAYS_OPEN_ZONES` (`server/src/movement.js:20`), with the note "farm_home is personal" (`:100`).
  - **Nothing to fight or gather:** no monsters or zone state on entry, and the server explicitly sends empty lists ("Safe zone (town / farm_home)", `server/src/movement.js:442`, `:499-505`). No gather nodes (`server/src/gathering.js:278`), no spawn scaling (`server/src/spawnscale.js:137`).
  - **Hub regen:** HP regen and the full "HUB TOP-OFF" apply in town, worldview and farm_home (`server/src/index.js:3343`, `:3368`, `:3382`, `:3515-3530`).
  - **No PvP:** the farm was never in the lawless table, so unconsented PvP fails closed there (`server/src/data.js:306-312`; `docs/specs/identity.md:68`).
  - **Other guards:** farm_home is excluded from join-in-world (`server/src/join.js:1296`) and from the zone list (`server/src/index.js:1606`, `:4105`).
- **No per-player farm id exists [MISSING]:** the only instanced zone pattern is `DUNGEON_ZONE_RE = /^dungeon:[A-Za-z0-9_-]{1,32}$/` (`server/src/data.js:422`), accepted by movement (`server/src/movement.js:81`, `:107`).
- **Precedent for private or party spaces [WORKS, for dungeons]:** the "FOLDED INSTANCES" design in `server/src/dungeon.js:12-34`.
  - "An instance is just a zone id the ZONES table doesn't know: 'dungeon:<id>'… the whole existing combat stack work[s] unmodified."
  - "zone presence IS membership — a party feature needs no roster."
  - Limits: `MAX_INSTANCES: 8`, `EMPTY_SWEEP_MS: 60000` (`:53-56`).
- **The draft plan (WORLD-BIBLE §8; a DRAFT the owner is reacting to; `plan.js` wins where they differ, per CLAUDE.md):**
  - "Today the farm is a single zone on the server (`farm_home`), not a per-player copy. The proposal is a **homestead instance** per player, `farm:<playerId>`, built the same way dungeon instances are. It is entered through the **Land Office** in town. Visiting a friend's farm means walking into their instance. Your crops and buildings stay yours…" (`docs/WORLD-BIBLE.md:871-880`).
  - It is listed as open decision 6: "Farms as personal homesteads (§8). A server change, separate from the map." (`docs/WORLD-BIBLE.md:1144-1145`).
- **The long-run target architecture also anticipates it:** "separate places behind doors (the realms, dungeons, farms, interiors)" and "Each realm, dungeon, farm and interior is another [map]" (`docs/WORLD-ARCHITECTURE.md:18-23`, `:52-55`).

### Inferences
- Because positions are relayed by zone id, two players who each tap "Visit Your Farm" today stand in the same grotto and can see and chat with each other. That accidentally behaves like "everyone visits everyone's farm", with no ownership and no visible crops.
- A private farm per player plus invitations maps directly onto the existing `dungeon:<id>` folded-instance pattern (`farm:<ownerId>`, membership by presence). The new parts would be:
  - an entry rule (owner, or invited player);
  - persistence (dungeon state is deliberately in-memory only, `server/src/dungeon.js:28-33`, whereas a farm must persist);
  - per-instance plot state broadcast to visitors.

### Gaps
- Not verified whether the worker relays player positions only to players in the same zone, or to everyone with the client filtering. The client filter at `entityRenderer.js:10504` is what makes farm visitors visible to each other either way.

## 3. Is there any crop/seed/plot/planting/watering/harvest code? What data tables exist? What do the Feed & Seed and Land Office actually do?

### Takeaway
**A minimal plant → wait → harvest loop exists, entirely in the browser [DORMANT/CLIENT-ONLY].** It lives in FarmPanel, which only the Feed & Seed door opens. There are 6 menu "plots"; 2 are free and the rest are gated by Farming level, not gold.

- **What gets planted:** any gathered crystal, ore or herb (there are no real seeds).
- **How long it takes:** 1–60 minutes by tier.
- **What harvest gives:** 1..tier copies of the same item, plus Farming XP.

**Missing entirely [MISSING]:**
- tilling, watering, fertilizing, tools, animals, greenhouses;
- crops drawn in the world;
- any server message.

**The Land Office only teleports:** no land sale, no plots, no deeds [MISSING]. Dormant tables already exist: per-element seed and herb names, 1h–48h grow times, and a 12-plot maximum.

### Cited Findings
- **FarmPanel basics [DORMANT/CLIENT-ONLY]:**
  - It is the old town "Farm" building's panel: "the farm plot manager: plant/harvest crops, regenerate the farm_home zone map", extracted verbatim in v2.3.877 (`src/ui/panels/buildings/FarmPanel.jsx:7-15`).
  - The header reads "Farm · Farming Lv N" (`:83`), the text "Plant seeds from zones, harvest when grown." (`:86`).
  - The panel never names "Feed & Seed".
- **Plots:**
  - A hard-coded grid of 6 (`:145`). The unlock rule is `plotIdx < 2 || plotIdx < 4 && farmLvl >= 10 || farmLvl >= 25` (`:152`), so 2 plots at Lv1, 4 at Lv10, 6 at Lv25 ("Unlocks at Farming Lv10/25", `:191`; footer `:410`).
  - Plot state lives at `rpgState.lifeSkills.farmPlots[idx] = {name, emoji, tier, element, rType, plantedAt (unix s), growTime (s)}` (`:147-150`, `:384-392`).
  - Each plot shows a growth bar and "N m left" (`:259-281`), a "Ready!" plus Harvest button (`:191-248`), or "Empty plot" / "Empty · No seeds" (`:287`).
- **"Seeds" are not seeds:**
  - The list enumerates every inventory key `<crystal|ore|herb>_<tierLabel>_<resourceName>` over the `ZONE_RESOURCES` elements and `RESOURCE_TIERS` 1–5 (`:290-316`), showing 💎, ⛏️ or 🌿 (`:307`), at most 8 rows (`:323`).
  - The empty text is "No seeds. Gather resources from zones!" (`:322`).
  - The tier labels are Rough, Common, Refined, Quality and Fine (`src/data/lifeSkills.js:12-17`).
- **Plant (client-only):** fills the first empty unlocked plot (`:370-373`), decrements the item locally (`:380-381`), sets the grow time to `[0, 60, 300, 900, 1800, 3600]` s by tier, i.e. 1/5/15/30/60 min (`:382-383`), saves `localStorage 'bt_rpg'` (`:395`) and beeps (`:397`). No server message.
- **Harvest (client-only):** adds `1 + floor(Math.random()*tier)` of the same item (`:222`), `addLifeSkillXp(sk,'farming', tier*20)` (`:223`), deletes the plot (`:224`), sets `R._questFlags.harvestedCrop = true` (`:226`), saves to localStorage (`:229`) and plays `BT_AUDIO.collect()` (`:231`). No server message.
- **Items the worker actually gives:** gather items are minted as `resType + '_' + name`, with resType only wood, fish or ore (`server/src/gathering.js:335-345`, `:1139-1143`). Examples are `wood_pine_log` (`:312-318`) and `ore_copper_ore` (`src/data/items.js`, SMELT_RECIPES). None matches FarmPanel's `<type>_<tierLabel>_<name>` pattern.
- **[DORMANT] Per-element seeds and herbs already named:** `ZONE_RESOURCES` (`src/data/items.js:2-12`) gives one `seed` per element:
  - Ash Root Seed, Ice Cap Seed, Kelp Seed, Fungus Spore, Static Moss Seed, Cave Lichen Seed, Whisperleaf Seed, Shade Root Seed, Lightmoss Seed.
  - One `herb` per element: Firebloom, Snowpetal, Waterlily, Nightshade, Thunderbloom, Rock Vine, Cloudpetal, Duskbloom, Sunpetal.
  - A `food`/`foodStat` per element, e.g. Fire Resist/flameDef and Regen Boost/regen.
  - The `seed` field is read nowhere (grep).
- **[DORMANT] Grow-time table:** `FARM_GROWTH_TIMES = [0, 3600, 14400, 43200, 86400, 172800]`, "seconds per tier", under the heading "§18.2 Farming — plant seeds, harvest after time" (`src/data/gameSystems.js:1063-1064`). That is 1h, 4h, 12h, 24h and 48h. It is never imported (grep).
- **[DORMANT] Plot cap:** `FARM_PLOT_MAX = 12` (`src/data/constants.js:80`) is imported by BroTown (`src/ui/BroTown.jsx:448`) but never used. The logic map lays exactly 12 soil patches (`src/data/gameDisplay.js:789-795`).
- **Default state:** `farming: {level:1, xp:0}` ("Utility skills", `src/data/gameSystems.js:1107-1110`); `farmPlots: {}` (`:1120`; migration `:1177`); the level-0 heal includes farming (`:1183-1187`).
- **The Land Office modal [WORKS as a teleport]:** only "Travel to Farm" and "Cancel" (`src/ui/BroTown.jsx:11759-11843`).
  - Spec table: "Land Office | 'Travel to your farm'" and "Feed & Seed | the farm panel (plots, seeds, 'Visit Your Farm')" (`docs/specs/wheel-doors.md:25-26`).
  - No purchase, plot or deed handler exists on client or server (grep farm/plot/land in `server/src`: only hub guards and skill-name lists).
- **No in-farm plot interaction [MISSING]:** no "near plot" check exists (grep `nearPlot`/`FARM_PLOT`). FarmPanel is opened only by `setBuildingPanel('farm')` via the Feed & Seed door, so you plant from the shop's window, not on the farm.
- **No watering/tilling/fertilizer/tool/animal/greenhouse code [MISSING]:** case-insensitive grep across `src/` and `server/src` for crop, till, hoe, watering, fertili, compost, sprout, greenhouse and seedling found only FarmPanel and unrelated words (crop as in image crop, seed as in RNG seed). The Pet House is the closest thing to animals; see section 4.

### Inferences
- Because new players' bags hold only worker-minted keys such as `ore_copper_ore` or `wood_pine_log`, a current player almost always sees "No seeds" in FarmPanel. The loop is effectively unusable in today's Wheel, apart from legacy items left over from the client-side gathering era.
- The dormant data (seed names, herb names, the 1–48 h timer table, 12 plots) roughly matches the owner's FarmVille-style vision and could seed a real crop catalogue.

### Gaps
- Not checked at runtime whether any live account still holds legacy `herb_rough_*`-style keys that FarmPanel would accept.

## 4. What is the farm bed and what other farm features exist? Client-local vs server-settled? Where is farm state stored?

### Takeaway
Every farm feature is browser-local except the Dungeon Workshop (server-run dungeons) and pet capture (server-validated). The features are:

- **Sleep:** full HP, mana and stamina plus a 30-minute "Well Rested +10% XP".
- **Furniture Workshop:** 12 furniture pieces whose buffs are never applied.
- **Pet House:** evolve and enchant.
- **Plots.**

Farm state lives in `localStorage 'bt_rpg'` inside `lifeSkills.farmPlots`. There is no server storage key for farms [MISSING]. Worse, the server's wholesale `lifeSkills` and `inventory` echoes overwrite the local copies (inference, below).

### Cited Findings
- **Sleep (the reachable "bed") [DORMANT/CLIENT-ONLY]:**
  - Being within 1 tile of the invisible house rectangle sets `S._nearHouse` (`src/ui/BroTown.jsx:5443-5449`).
  - The button "😴 Sleep (Restore All + Well Rested Buff)" (`src/ui/BroTown.jsx:13234-13274`) sets `R.hp/stamina/mana = max`, `R._wellRestedUntil = now + 1800000` (30 min), beeps, and saves `localStorage 'bt_rpg'`. No server message.
  - Keyboard E does the same (`src/game/desktopControls.js:114-117`).
  - FarmPanel advertises it: "sleep to fully restore HP, Mana, Stamina and gain a 30-min Well Rested buff (+10% XP)" (`FarmPanel.jsx:132`).
- **Tile-based bed [DORMANT, dead code]:** `if (S.currentZone === 'farm_home' && footTile === FARM_BED_TILE …)` with a 3 s rest (`HOUSE_SLEEP_MS=3000`) (`src/ui/BroTown.jsx:5141-5176`; constants `src/data/constants.js:81-83`). Tile 15 is never placed (section 1), so this cannot fire.
- **Well Rested:**
  - Its multiplier is applied only in the client's local kill-XP code (`src/game/monsterCombat.js:2675`, `src/game/projectiles.js:1857`). The banner "🌟 Well Rested +10% XP · N min" is at `src/ui/BroTown.jsx:11759`.
  - The worker has no reference to it (grep `wellRested` in `server/src` = none).
  - Combat XP is worker-applied, and the client says "A modified client that sets R.xp = 999999 will get stomped on the next kill's player_state" (`src/networking/wsClient.js` player_state handler, `case 'player_state'` at `:1675`).
- **Official statement that rest is client-only:** "its rest is the farm bed's, on this device only (no message, nothing the worker settles: the HP it restores is the worker's to give), so it stays shut until the worker can pay it". This is why the Wheel's Hotel is shut (`src/data/wheelBuildingDoors.js:82-90`; `docs/specs/wheel-halls.md:78-80`). Note the server already tops off HP, mana and stamina in `farm_home` as a hub (`server/src/index.js:3515-3530`).
- **Furniture Workshop [DORMANT/CLIENT-ONLY]:**
  - Button near the house: `src/ui/BroTown.jsx:13358-13374`.
  - Recipes `FURNITURE_RECIPES`, "woodworking expansion for farm house" (`src/data/gameSystems.js:1262-1393`): bed, table, bookshelf, forge_mini, trophy_case, enchant_table, alchemy_set, wardrobe, pet_bed, chandelier, weapon_rack, garden_box. The garden box costs 6 wood and 40 gold, is described as "Indoor growing" and gives `farmYieldMult: 1.1` (`:1383-1392`).
  - `getFurnitureBuffs` (`:1396-1415`) is never called (grep), so no buff, including farm yield, ever applies.
  - Crafting is local: `R2.coins -= f.goldCost`, any wood-like key is decremented, `R2._furniture[id]` is set, and the result is saved to localStorage (`src/ui/panels/FurniturePanel.jsx:179-203`).
- **Pet House:**
  - Proximity and button: `src/ui/BroTown.jsx:5462-5468`, `:13334-13358`; desktop `src/game/desktopControls.js:129-133`.
  - PetHousePanel's activate/evolve/enchant handlers write to localStorage (`src/ui/panels/PetHousePanel.jsx:6-22`) [DORMANT/CLIENT-ONLY].
  - Pet capture itself is server-validated (`server/src/pets.js:1-30`) [WORKS].
- **Dungeon Workshop (on the farm) [WORKS, server-run]:**
  - Proximity and button "🏗️ Dungeon Workshop": `src/ui/BroTown.jsx:5452-5458`, `:13274-13300`.
  - Launch sends `dungeon_start {config}` when the worker advertises `caps.dungeon` (`src/ui/panels/DungeonCreatorPanel.jsx:873-885`). The server instance logic is in `server/src/dungeon.js`.
- **Farm banners:** "🏡 Your Farm — Safe Zone" (`src/ui/BroTown.jsx:11688-11707`), and a top banner "🏡 Your Farm · 🌟 Well Rested" (`:11632-11653`).
- **[DORMANT] Farm minigames:** `ELEMENTAL_MINIGAMES` ("2-4 player timed minigames on the farm, one theme per element", entry fee 25 gold, 45 s) and `createMinigameInstance` (`src/data/gameSystems.js:1888-1975`) have no caller (grep). The on-farm Minigame Arena was removed by owner direction in v2.3.871 (remote commit 2016ceb0, 2026-06-14).
- **Where farm state is stored, and why it does not stick:**
  1. **On the device:** `localStorage 'bt_rpg'` holds the whole rpg object: `lifeSkills.farmPlots`, `lifeSkills.farming`, `_furniture`, `_wellRestedUntil`, `_questFlags.harvestedCrop`. It is read at boot as a cache that the "server overwrites async" (`src/ui/BroTown.jsx:3872-3880`), and "bt_rpg is rewritten on every player_state" (`:3887-3890`).
  2. **The old upload path is a no-op:** `syncRpgToServer` includes `farmPlots` (`src/networking/index.js:190-241`, `:230`) but sends it through `btRpc`, which is a stub returning null ("Legacy Supabase compat (Supabase removed…)", `src/networking/index.js:19-27`).
  3. **The client intends farm plots to stay local:** the comment at `src/networking/wsClient.js:1792-1797` says "Preserve client-only sub-fields (resources / gems / farmPlots / pets / etc.)… Server owns woodcutting / fishing / mining today".
  4. **But the worker copies life skills wholesale on a first join:** `lifeSkills = { ...msg.data.rpgLifeSkills }` (`server/src/join.js:853`). The client sends `rpgLifeSkills: S.rpg.lifeSkills` (`src/networking/wsClient.js:505`), and a new character's defaults include `farmPlots: {}` (`src/data/gameSystems.js:1120`).
  5. **After that, the stored copy wins and is echoed whole:** a returning player gets `stored.lifeSkills` (`server/src/join.js:723`). The worker persists and echoes the whole `lifeSkills` object (`server/src/persistence.js:182`, `:447`), and a v2 delta resends any field whose JSON changed (`server/src/persistence.js:562-584`).
  6. **The client overwrites every key it receives:** `S.rpg.lifeSkills[k] = …` (`src/networking/wsClient.js:1823-1842`). Inventory is replaced wholesale: `S.rpg.inventory = {...msg.payload.inventory}` (`:1788-1790`).
- **No farm storage keys on the server [MISSING]:**
  - The storage-key registry has no farm, plot or land key (`docs/ARCHITECTURE-HANDOFF.md:52` onward; grep).
  - Rule 1 there: "Never add a field to the rpg blob… New persistent state gets its own storage key" (`:44-51`).
  - Rule Zero: client-local logic "is a LEGACY REMNANT… The migration direction is always client→server" (`docs/ARCHITECTURE-HANDOFF.md:28-40`).
  - Farming is officially "client-progressed" (`docs/specs/guild-quests.md:51-53`).

### Inferences (strong, from the code paths above; not runtime-tested)
- **Planted crops and farming XP are likely wiped.** Accounts created with the default `farmPlots: {}` captured at first join should see their local plots and farming XP reset to the stored copy:
  - at the next login (the first player_state is full);
  - and whenever the worker changes that player's `lifeSkills`, e.g. after any server-settled chop, mine or fish, which resends the whole `lifeSkills` field.
- **Harvest yields and planted "seeds" are phantom.** The worker never knows about either, and the next inventory echo restores its own inventory.
- **Furniture costs and sleep HP are phantom the same way.** Furniture gold is stomped by the coin echo; this mirrors the documented "Phantom today (the player_state echo stomps the coins)" in `server/src/guilds.js:4-6`. Sleep HP is the worker's to give. The Well Rested +10% is not honoured by server-applied XP.

### Gaps
- The clobbering behaviour was not exercised in a live client and worker.
- How many live records actually carry a `farmPlots` key is unknown; that would need the worker's storage.

## 5. Which quests, tutorial text, achievements and UI refer to the farm or farming?

### Takeaway
- **mayor_3 is not a farming quest.** It is "Dungeon Delver" and needs the Farm door only because the Dungeon Workshop stands on the farm [WORKS].
- **The only planting quest is dormant:** trader_3 "Farm to Table", whose giver Trader Tix is not in the world [DORMANT].
- **Farming appears across skill and profile UI** (skill lists, a guild, a hiscore tab, the Inspect card's Homestead), but its numbers never move server-side.

### Cited Findings
- **mayor_3 "Dungeon Delver — Clear any dungeon."** (`src/data/gameSystems.js:6722-6758`): reward 300 gold and 70 xp, unlocks `skill_cap_50`.
  - `needsDoor: 'farm'` (`:6741`), because "the custom-dungeon workshop… stands in farm_home" (`:6727-6740`).
  - Check: `lifeSkills.dungeonClears` is non-empty (`:6742-6745`).
  - Server row: `mayor_3: {gold:300, xp:70, next:null}` (`server/src/data.js:713`).
  - The Wheel's doors re-enable it: `setWheelDoorsOpen` counts door actions including `'farm'` (`src/data/gameSystems.js:7381-7399`), and `docs/specs/wheel-doors.md:62-63` says "mayor_3 (which asks for the Farm's door) is offered again".
- **trader_2 "Gather and Prosper"** (harvest 3 nodes) `unlocks: 'farming'`, with the completion text "Farm building unlocked! Grow your own ingredients." (`src/data/gameSystems.js:6780-6801`).
- **trader_3 "Farm to Table — Plant and harvest a crop."** checks `_questFlags.harvestedCrop`, which only FarmPanel's harvest sets (`FarmPanel.jsx:226`).
  - Reward 150 gold and 35 xp, unlocks `cooking_buffs`.
  - Dialogue: "Plant a seed and harvest it!", "Visit the Farm building.", "Herb buff recipes unlocked at the Kitchen!" (`src/data/gameSystems.js:6802-6823`).
  - Server rows: `server/src/data.js:715-716`; trader_3 has no objective.
  - **[DORMANT]** The giver is absent: "NPC_DATA emptied — placeholder NPCs (Mayor Bro / Trader Tix / …) removed" (`src/data/gameDisplay.js:4901-4907`). The log hides quests whose giver is not in the world (`src/ui/mobile/sheet/questModel.js:8-22`).
- **Skill UI:**
  - Skills panel: "Farming — Grow ingredients at the farm" (`src/ui/panels/SkillsPanel.jsx:250-254`).
  - Mobile skills sheet: `where: 'Your farm plots', earnHint: 'Plant, tend and harvest crops on your plot.'` (`src/ui/mobile/sheet/skillsModel.js:54`).
  - Life skills list: `src/data/lifeSkills.js:9`.
  - The inspect card and mock profile list farming (`src/ui/mobile/InspectCard.jsx:289-293`).
- **Guild:** "Grower's Guild", master "Guildmaster Sage" (`src/data/gameSystems.js:1524-1530`).
  - Its server-verified ladder checks `ps.lifeSkills.farming.level` against checkLvl 5/15/30/… (`server/src/guilds.js:39-49`; `server/src/data.js:819-831`).
  - The header says that level "is advanced by the server's own harvest/craft handlers" (`server/src/guilds.js:9`), and none exists for farming.
- **Hiscores:** there is a Farming tab (`src/ui/mobile/dash/LeaderboardPanel.jsx:33`), backed by the server-authoritative series (`server/src/leaderboard.js:56-68`), which reads `ps.lifeSkills.farming.level` (`server/src/chainscore.js:193-198`, `:55-62`).
- **Inspect card "Homestead":**
  - A static placeholder picture, `PROFILE_PREVIEW.homesteadSrc = '/icons/ui/homestead-preview.webp'` (`src/ui/panels/playerProfile.js:17-20`, `:55-60`).
  - A "plots ready" count, `farmPlotsReady(lifeSkills)` (`:74-86`, `:229`); another player's count is relayed from their own client (`:112`, `:186`).
  - Its tool says "There is no per-player farm scene to render yet" (`tools/ui/make-homestead-preview.mjs:1-12`).
- **Other UI copy:**
  - Cook panel: "Combine farmed herbs into combat buff meals. No timing needed — just ingredients." (`src/ui/panels/buildings/CookPanel.jsx:501`).
  - The feedback form has a "🌾 Farm — Farm, house, furniture" topic (`src/data/gameSystems.js:1813-1816`).
- **Achievements and tutorial:** no achievement or tutorial step refers to farming (grep for farm, harvest and crop in `src`: none outside the above).

### Inferences
- **The Grower's Guild rungs and the Farming hiscore are frozen** at whatever level the server captured at first join, normally 1, because nothing server-side adds farming XP.
- **Farming was designed to feed cooking.** trader_3 unlocks "Herb buff recipes" and the Cook panel speaks of "farmed herbs"; see section 7 for the server consumer already waiting.

### Gaps
- None material.

## 6. What farm-related art, sound and objects exist that could be reused?

### Takeaway
Very little farm-specific art exists.

- **What there is:**
  - one painted cave-grotto map;
  - three 256 px icons (farm building, farming skill) plus a 480x300 crop of the map;
  - two finished Wheel building sprites (Feed & Seed and Land Office);
  - in-game Wheel props: hay bales, haystacks, troughs, a cart, a well, split-rail fences, crates, orchard apple trees and a scarecrow.
- **What there is not [MISSING]:** crop or seedling art, a tilled-soil ground swatch, a hoe, a watering can, animal art, and any farm sound recordings.
- **Sounds that could be reused:** mud and grass footsteps, the mining strike, and the fishing splash/water sounds.

### Cited Findings
- **Art files in `public/`** (all webp):

  | File | Size | Use |
  |---|---|---|
  | `public/maps/farm_v1.webp` | 1373x1145 | the grotto map |
  | `public/icons/ui/bldg-farm.webp` | 256x256 | farm building icon |
  | `public/icons/ui/skill-farming.webp` | 256x256 | farming skill icon |
  | `public/icons/ui/homestead-preview.webp` | 480x300 | crop of the farm map |
  | `public/maps/farm_v1.walk.json` | 64x64 grid | unused walk mask |

  A file-name search of `public/` for crop, seed, soil, plant, barn, hay, scarecrow, greenhouse, sprout, harvest, wheat, corn, garden, chicken, cow, etc. found only these, plus unrelated cowboy-hat sprites.
- **Ground swatches:** the 51 Wheel ground swatches (`public/world/ground/manifest.json`) are commons, town-yard, street, boardwalk, plaza, road, gravel, 4 per land, lava, sea, shallows, fresh and 8 borders. There is no farmland or tilled-soil swatch.
- **Object Studio catalogue (`public/tools/objects/catalog.js`):**
  - The town's west end is "the farming end of town, toward the river: whitewashed and barn-red boards, log posts, and green tin roofs" (`:46`).
  - **`feedseed`** "Feed & Seed" (`:130-134`): sign FEED & SEED; job "where players buy seeds and grow their crops"; look "barn-like farm store… gambrel roof… hayloft door with a hoist arm… sacks of seed stacked on the porch"; joke "a giant prize pumpkin with a blue ribbon… a scarecrow in sunglasses".
  - **`landoffice`** "Land Office" (`:136-140`): job "where players get to their own farm"; look "a big framed map of farm plots hung on its front wall, and a surveyor's tripod"; joke "a huge wooden key hung over the door, the key to your farm; and a 'biggest turnip' trophy".
  - **Props:** crate (`:178`), haybale "square hay bales tied with twine… one bale with a pitchfork" (`:179`), trough (`:180`), well (`:183`), cart (`:185`), fence and fence-down split-rail (`:188-189`), commons orchard apple trees (`:198`), commons haystacks (`:200`), and a withered mist-land scarecrow (`:247`).
- **Already in the game's object sheets (`public/world/objects/*.json`, read programmatically):**

  | Sheet | Objects |
  |---|---|
  | buildings-10.json | feedseed |
  | buildings-11.json | landoffice |
  | commons-1.json | orchard |
  | commons-2.json | haystack |
  | town-1.json | crate |
  | town-2.json | haybale, trough |
  | town-3.json | cart, well |
  | town-4.json | fence |
  | town-5.json | fence-down |
  | mist-2.json | scarecrow |
- **Interior pictures wished for but not made:** "Feed & Seed: inside" ("Sacks of seed and feed… hoes, rakes and watering cans hanging on the wall", `docs/ART-WISHLIST.md:211-226`) and "Land Office: inside" ("A big framed map of farm plots… a rack of keys on hooks", `:233-248`). Each comes with a ready prompt.
- **Sound:** farm actions use synthesized beeps plus `BT_AUDIO.collect` (`FarmPanel.jsx:126`, `:231`, `:397`; `collect` is defined at `src/data/gameDisplay.js:2256`).
  - `public/sfx/` holds only bow, cooking, fishing, footstep, levelup, loot, magic, mining, monster, quest, shield, sword, ui and woodcutting.
  - Reusable files: `footstep/step-mud.mp3`, `footstep/step-grass.mp3`, `mining/mine-strike.mp3`, `fishing/lure-drop.mp3`, `fishing/catch-splash.mp3`, `fishing/river-water.mp3`, `woodcutting/axe-chop.mp3`, `cooking/pan-sizzle.mp3`, `loot/coin-pickup.mp3`, `quest/quest-complete.mp3`.
  - Also reusable: the Wheel's 'plant' rustle hit-material (`src/data/wheelMaterials.js:58-62`).

### Inferences
- A FarmVille-style farm needs new art: crop growth stages per crop, tilled and watered soil, tools, plot markers, perhaps a farmhouse sprite. The Object Studio pipeline (catalogue → sheets → `public/world/objects`) is the established route.
- The Land Office's existing building art (map of plots, key to your farm) already fits "buy your plot and expansions here".

### Gaps
- Did not inspect the actual pixels of each object sheet; presence is from the sheet manifests' ids.

## 7. Dormant or half-built farm systems, and the git history of farm work

### Takeaway
The farm is a pre-split prototype feature that later work kept reachable, restyled and re-routed, but never moved server-side. Several dormant pieces are ready-made inputs for a real design:

- per-element seed and herb names;
- the 1h–48h timer table;
- a 12-plot maximum;
- a garden-box yield buff;
- server herb buff-meal recipes with no herb source;
- the dungeon folded-instance pattern;
- the WORLD-BIBLE's `farm:<playerId>` proposal.

### Cited Findings
**Dormant pieces, with evidence:**

| Piece | Status | Evidence |
|---|---|---|
| `FARM_GROWTH_TIMES` (1h, 4h, 12h, 24h, 48h) | unused | `src/data/gameSystems.js:1063-1064` |
| `FARM_PLOT_MAX = 12` | unused | `src/data/constants.js:80` |
| `FARM_PLOT_TILE` / `FARM_BED_TILE` / `HOUSE_TILE` | never placed | `src/data/constants.js:84-86` |
| Tile-based bed | dead code | `src/ui/BroTown.jsx:5141-5176` |
| `ZONE_RESOURCES[*].seed` names | unread | `src/data/items.js:2-12` |
| `FURNITURE_RECIPES` incl. garden_box `farmYieldMult` | buffs never applied (`getFurnitureBuffs` uncalled) | `src/data/gameSystems.js:1262-1415` |
| `ELEMENTAL_MINIGAMES` "on the farm" | no caller | `src/data/gameSystems.js:1888-1975` |
| trader_2 / trader_3 farm quests | absent giver | `src/data/gameSystems.js:6780-6823` |
| The 12 logic soil patches | not drawn | `src/data/gameDisplay.js:789-795` |
| `syncRpgToServer` | no-op | `src/networking/index.js:27`, `:190-241` |

- **Server-ready consumer of farm output [DORMANT]:**
  - The worker's buff meals `COOKING_RECIPES` consume `herb_firebloom`, `herb_rock_vine` + `herb_cloudpetal`, or 2x `herb_firebloom` for regen/resist/damage buffs (`server/src/data.js:430-434`), settled in `server/src/cooking.js:206-250` with an exact-key matcher (`:238-245`).
  - No server path mints any `herb_` item (grep of `server/src` for "herb" finds only these).
  - Herb icons exist in the trade window: herb_firebloom 🌺, herb_rock_vine 🌿, herb_cloudpetal 🌸 (`src/ui/panels/TradeWindowPanel.jsx:94`).
- **Existing test coverage:** `tools/qa/mp/mp-wheeldoors.mjs` §7 covers the trip in and out of the farm (`:20-22`, `:241-282`). No server test suite or QA scenario covers planting or harvesting (grep).
- **Git history:**
  - The local clone is shallow: `git rev-parse --is-shallow-repository` returns true, there are 55 commits, and the oldest is 65a781ba (2026-09-24). So the older history was read through GitHub commit search on `hemibroscommunity-del/GameDev` for "farm": 32 hits, parsed in full (138,529 characters).
  - Farm-relevant commits, oldest first:

    | Commit | Date | What it did |
    |---|---|---|
    | 9b39f935 | 2026-04-12 | village tileset rendering for town/meadow/farm_home |
    | 2016ceb0 | 2026-06-14 | v2.3.871: "Removes the on-farm elemental Minigame Arena… owner-directed" |
    | 1f980cc1 | 2026-06-14 | v2.3.877: extract FarmPanel "verbatim" |
    | 514d352b | 2026-06-14 | "Swap in farm grotto map + walkability" |
    | 723f0bf4 | 2026-06-15 | map redesign, hubs |
    | 6379581c | 2026-07-21 | v2.3.1406: per-zone loading |
    | 99576c72 | 2026-07-22 | v2.3.1414-1415: hub full-restore, joining town/farm_home in regen |
    | ee1ad21a | 2026-08-11 | v2.3.1670: delete the tileset that "drew nothing" |
    | fd26f2c4 | 2026-09-25 | v2.3.2926: Inspect card Homestead |
    | dfd591da | 2026-10-04 | v2.3.3031: designed town, west = farming |
    | 408a7eeb | 2026-10-04 | v2.3.3032: Wheel doors incl. the farm, `rememberFarmTrip` |
    | d9c66658 | 2026-10-04 | v2.3.3037: memory work on the farm trip's town stop |
    | fc1f65cc | 2026-10-06 | v2.3.3064: land music, the theme after the farm |

  - The remaining hits use "farm" to mean XP/AP farming.
  - In-code version tags fill the gaps: FarmPanel restyles v2.3.1232/1235 (`FarmPanel.jsx:16-32`), walk masks off v2.3.1693, buildings open on sight v2.3.1779 (`src/game/interactions.js:57`), mayor_3 needsDoor v2.3.1972 (`src/data/gameSystems.js:6727`), farming level heal v2.3.3041 (`server/src/migrations.js:76-97`).
  - **No commit has ever added server-side farming.**
  - Note: the commits 99670268..62d8b614 on branch `claude/farming-research` are this research's own note checkpoints, not game work.

### Inferences
- Turning the farm on for real is a server project:
  - new storage keys;
  - plant, water and harvest handlers with opIds and deploy-order `caps` flags;
  - instance entry rules.
  
  The client pieces (FarmPanel UI, the farm zone and trip, the Inspect card count) are reusable shells.

### Gaps
- Commit search covers commit messages on the default branch only; a farm change described without the word "farm" would be missed.

## 8. What is missing compared with the owner's vision?

### Takeaway
Against the vision (timed crops with their own waits; dig/till → plant → fertilize → water → harvest; a private farm you can invite people into; a free starter plot from the Land Office; gold-priced expansions bought there):

- **What exists:** only plant → wait → harvest, in a menu, run by the browser.
- **Everything else is missing:** server settlement, per-player instances and invitations, the Land Office's role, tools and steps, and visible crops.

### Cited Findings
| Vision item | Today | Evidence |
|---|---|---|
| Per-crop wait times | Partial, client-only: wait is by item tier (1–60 min); dormant 1–48 h table; no crop catalogue | `FarmPanel.jsx:382-383`; `src/data/gameSystems.js:1063-1064` |
| Dig/till step | [MISSING] | grep (section 3) |
| Plant step | [DORMANT/CLIENT-ONLY]: "seeds" are gathered crystals, ores and herbs | `FarmPanel.jsx:290-399` |
| Fertilize step | [MISSING]; only a never-applied furniture `farmYieldMult` | `src/data/gameSystems.js:1383-1415` |
| Water step | [MISSING] | grep |
| Harvest step | [DORMANT/CLIENT-ONLY]: random 1..tier copies, local farming XP | `FarmPanel.jsx:216-233` |
| Private farm per player | [MISSING]: one shared `farm_home`; proposal `farm:<playerId>` | `src/data/zones.js:394`; `entityRenderer.js:10504`; `docs/WORLD-BIBLE.md:871-880`, `:1144` |
| Invite others into your farm | [MISSING]: precedents are dungeon presence-membership, plus party/clan/friend systems | `server/src/dungeon.js:12-34` |
| Free starter plot from the Land Office | [MISSING]: 2 plots are free to everyone at Farming Lv1; the Land Office only teleports | `FarmPanel.jsx:152`; `src/ui/BroTown.jsx:11759-11843` |
| Gold-priced expansions at the Land Office | [MISSING]: plots 3–6 unlock by Farming level (10, 25), not gold; `FARM_PLOT_MAX = 12` unused | `FarmPanel.jsx:152`, `:410`; `src/data/constants.js:80` |
| Crops visible in the world / on the farm map | [MISSING]: plots exist only in a window opened from the Feed & Seed; map soil is decoration | section 1 |
| Server-settled economy | [MISSING]: no handler, storage key, caps flag or test; local inventory and coin changes are overwritten by echoes | sections 3–4 |
| Farm art and sound | Mostly [MISSING]: grotto map, two building sprites, hay, fence and orchard props; no crop or tool art; no farm sounds | section 6 |
| Farming skill progression | [DORMANT/CLIENT-ONLY]: client-progressed; Grower's Guild and hiscores frozen server-side | `docs/specs/guild-quests.md:51-53`; `server/src/guilds.js:9`, `:47` |
| Use for the produce | [DORMANT]: server herb buff meals wait for `herb_*` items; trader_3 promised "Herb buff recipes" | `server/src/data.js:430-434`; `src/data/gameSystems.js:6816-6821` |

### Inferences
- **Keep:** the two Wheel doors, the farm trip (in via Land Office or Feed & Seed, out at the gate back to your door), the FarmPanel shell and the Homestead count. All work today and are covered by `mp-wheeldoors`.
- **Replace:** the client-side plant/harvest/sleep/furniture handlers. Rule Zero (`docs/ARCHITECTURE-HANDOFF.md:28-40`) calls them legacy remnants to migrate server-side.
- **Decide:** whether the cave-grotto picture stays as the farm's look. It has no room for drawn plots and its features do not match the logic grid. The other option is a new farm map built from the Wheel's own objects and ground pipeline.

### Gaps
- The owner's decision on WORLD-BIBLE §8 (open decision 6) is not recorded in code.
- Whether farm visitors should share plots (co-op watering) or only look is a design question the code cannot answer.
