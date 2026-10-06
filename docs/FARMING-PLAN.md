# Turn BroTown's dormant farm into real crops

BroTown's farm should work like FarmVille with the server running all of it: on a visit of a minute or two you dig, plant, water and fertilize, each crop finishes on the server's clock while you are away (six minutes for carrots, twenty-two hours for pumpkins), ripe crops never wither, and the harvest's main job is food — meals and three brewed tonics — plus quest items and a capped daily order board for gold. Today the code has almost every part such a farm would plug into, but no farm the server knows about: the Feed & Seed and Land Office doors work, yet the planting window runs only in the player's browser, asks for "seeds" the server has never made, and has its results wiped out by the server, while three Cookhouse recipes, the Farming skill, its guild rewards and its hiscore tab all wait for crops nobody can grow. Comparable games agree, with numbers behind them: short crops pay several times more per hour than long ones, withering and water shortages were the mechanics players hated most, visitors should only ever be able to help, and selling farm advantages for real money drew complaints except where the paid option never beat the free one. On Diego the recommendation is clear: take his three three-minute tonics (Fury Tonic, Mana Draught, Swift Draught) off his shelf on the day farm-brewed versions ship, because the game allows only one timed effect at a time and a 35-coin double-damage bottle would otherwise beat any farm food, and keep his two cheap instant items as a safety net. Build it in five phases, starting with a server-run version of today's planting window that needs no new art. One caution covers the whole comparison: the web researchers could not open the wikis and guides they cite, so those numbers come from search-result summaries and should be spot-checked before they become prices.

## The farm today is a shell the server never sees

### One shared grotto behind two working doors

**The farm is one zone, `farm_home` ("Your Farm", 30×25 tiles)** (`src/data/zones.js:394-401`), drawn as a single painted picture of a cave clearing (`src/rendering/tiledMaps.js:78`) with no house, fence or crop painted on it. The invisible logic grid's twelve "soil" patches do not even line up with the picture's tilled strips (`src/data/gameDisplay.js:789-795`). Both doors in the Wheel's BroTown reach it: the Feed & Seed opens the old planting window, the Land Office opens a "Travel to Farm" box (`src/data/wheelBuildingDoors.js:40-41`; `src/ui/BroTown.jsx:11792`, `:11830`), and the farm's gate brings you back to the door you came from (`src/game/zoneTransitions.js:1203-1310`).

**"Your farm" is only a label.** Every player who goes there stands in the same zone and is drawn for everyone else (`src/rendering/systems/entityRenderer.js:10504`), and the zone's `personal: true` flag is read only by an encyclopedia badge (`src/ui/panels/EncyclopediaPanel.jsx:719`). The server treats the farm as a hub like town: it is always open (`server/src/movement.js:20`), has no monsters (`server/src/data.js:404-406`), heals fast (`server/src/index.js:3382`), allows no PvP (`server/src/data.js:306-312`) and leaves no death pile (`server/src/index.js:4105`). The game's own world plan already proposes the fix — a "homestead instance per player, `farm:<playerId>`, built the same way dungeon instances are", entered through the Land Office (`docs/WORLD-BIBLE.md:871-880`) — and the Land Office's own art brief already calls for "a big framed map of farm plots" and "a huge wooden key ... the key to your farm" (`public/tools/objects/catalog.js:136-140`).

### A browser-only planting window whose crops the server erases

The planting window (FarmPanel) has six menu slots: two free, the rest unlocked at Farming level 10 and 25 rather than with gold (`src/ui/panels/buildings/FarmPanel.jsx:152`). **Its "seeds" are items the server has never made.** It looks for names like `herb_rough_firebloom` (`FarmPanel.jsx:297-302`), while the server's harvests make only `wood_`, `fish_` and `ore_` items (`server/src/gathering.js:335-345`), so a current player almost always sees "No seeds. Gather resources from zones!" (`FarmPanel.jsx:322`). **Planting and harvesting run only in the browser.** Growth takes 1 to 60 minutes by the item's tier (`:382-383`), and a harvest adds copies of the item and some Farming XP to the phone's own copy of the character and saves it there (`:216-231`), with no message to the server. **The server then overwrites the result**, because every `player_state` message replaces the bag wholesale (`src/networking/wsClient.js:1788-1790`) and life skills are re-sent from the server's stored copy (`server/src/persistence.js:182`). Even a harvest that survived could not feed the server's recipes, which accept only the exact item `herb_firebloom` (`server/src/cooking.js:245-247`; `server/src/data.js:431-433`). The project's handbook calls client-side logic like this "a LEGACY REMNANT" whose migration direction "is always client→server" (`docs/ARCHITECTURE-HANDOFF.md:28-40`).

Beside the window sits a drawer of unused parts. There is a grow-time table of 1, 4, 12, 24 and 48 hours (`src/data/gameSystems.js:1064`), a 12-plot maximum (`src/data/constants.js:80`), one named seed and one herb per element, from Ash Root Seed to Lightmoss Seed and Firebloom to Sunpetal (`src/data/items.js:3-11`), a furniture "garden box" with a ×1.1 farm-yield bonus whose bonus function is never called (`src/data/gameSystems.js:1383-1415`), and a "Farm to Table" quest whose giver, Trader Tix, is no longer in the world (`src/data/gameSystems.js:6802-6822`; `src/data/gameDisplay.js:4901-4907`). The farmhouse bed grants "Well Rested +10% XP" only on the player's own device (`src/ui/BroTown.jsx:13234-13274`), which is also why the Wheel's Hotel stays shut "until the worker can pay it" (`src/data/wheelBuildingDoors.js:82-90`).

### Rewards are wired but have nothing to consume

**The server already has a buyer for crops: three Cookhouse recipes.** Herb Bread (1 Firebloom), Root Stew (Rock Vine plus Cloudpetal) and Firebloom Tea (2 Firebloom) are settled on the server (`server/src/data.js:430-434`; `server/src/cooking.js:270-347`), but no code makes their herbs. They have defects of their own. Each lasts only 60 to 90 seconds. Herb Bread's regeneration timer is written (`server/src/cooking.js:315`) but never read — the server reads only the resist, damage, mana and speed timers (`server/src/combat.js:405`, `:908`; `server/src/index.js:3488`; `server/src/movement.js:251`) — so it would do nothing. And Firebloom Tea's card promises "+5% dmg" (`src/data/gameSystems.js:1015`) while the server applies the cooked-food default of +20% (`server/src/combat.js:904-911`).

**Farming is already one of the ten life skills**, on the shared level curve of 500 XP for level 2, rising 8% a level (`server/src/gathering.js:459-461`). It has a Grower's Guild that pays 30 coins and 10 achievement points at level 5, rising to 2,000 coins and 750 points at level 150 (`server/src/data.js:819-832`), and a hiscore tab. But the server grants no Farming XP, so all of it is frozen at level 1. Quests can already ask for crops: a `collect` objective with `consume` ("bring me 10 carrots") needs no new code once the server can make the item (`server/src/data.js:527-538`; `server/src/quests.js:40-68`). One side effect to know about: any item that is a quest objective is kept through death, for every player (`server/src/quests.js:70-117`).

### Diego's shelf runs into the one-effect rule

Diego's five staples come from one server table (`server/src/data.js:466-525`), and his shelf is simply that table (`server/src/shop.js:73-78`):

| Item | Price | Effect |
|---|---|---|
| Cooked Minnow | 8 coins | heals 23 HP |
| Stamina Salts | 12 coins | +60 stamina |
| Fury Tonic | 35 coins | double damage for 3 minutes |
| Mana Draught | 30 coins | specials nonstop for 3 minutes |
| Swift Draught | 30 coins | 1.5× run speed for 3 minutes |

**Every timed effect in the game lives in one record**, and the owner's rule "Only 1 effect active at a time though" is enforced by wiping that record whenever anything new is eaten or drunk (`server/src/cooking.js:381-398`). Only the two instant items leave it alone (`server/src/cooking.js:408-420`). Nothing in quests, drops or dungeons needs these potions. They are mentioned only by a stamina design note (`server/src/abilities.js:303-313`), by the cheat-check damage ceiling, sized "even under the 2.0x Fury Tonic" (`server/src/combat.js:858-864`), by the client's own hard-coded potion list (`src/ui/mobile/dash/InventoryPanel.jsx:158`), and by a test that checks the shelf against the shop window (`server/test/mirror-audit.test.mjs:434-455`). Their role in survival is small: the minnow's 23 HP is under a quarter of the weakest player-cooked fish, which heals 100 (`server/src/cooking.js:47-60`), and out of combat in the Wheel a player regains 1% of max HP every ~0.66 seconds after six quiet seconds (`server/src/index.js:816-817`, `:3406-3426`).

### A small-number gold economy

Gold in BroTown is counted in small numbers. A new character starts with 50 coins (`src/data/gameSystems.js:5785-5793`), monsters drop about 5 to 10 coins each through level 20 (`server/src/index.js:1526`), Mayor Bro's whole quest line pays 1,345 coins once (`server/src/data.js:581-713`), and the big sinks are 500 coins to found a clan (`server/src/clans.js:41`) and 500 × 4^h for hardening (`server/src/hardening.js:44-46`). From those numbers, a rough model — my estimate, not a measurement — puts an active early player near **1,000 coins an hour**. Diego buys anything at half a family price that falls as one world-wide pile of that item grows: his offer halves once he holds 40, never drops below 1 coin, and stops at 999 held (`server/src/shop.js:145-169`). So any single crop can pull only **about 65 times its base price** out of him over the whole life of the world. The auction house takes any item, ten listings per player for a week, with no fee (`server/src/store.js:131-133`).

### The server's house rules for any new system

The handbook's rules are partly machine-checked, and a handful matter most for a farm. New saved data gets its own storage name and never goes into the main character record (rule 1, `docs/ARCHITECTURE-HANDOFF.md:44-51`), and the name goes into a registry table that the pre-push check reads (`docs/ARCHITECTURE-HANDOFF.md:52-102`). Every payout goes through one function, `_creditPlayer` (rule 4; `server/src/inbox.js:159-193`), carrying a fixed receipt number — an "opId" — so a retried message can never pay twice (rule 5, `docs/ARCHITECTURE-HANDOFF.md:131-134`). Nothing may wait on another server program between checking a request and committing it (rule 9, `docs/ARCHITECTURE-HANDOFF.md:153-170`). And there are no alarms: the server cannot wake itself at a set time, so anything timed is worked out lazily when someone next looks (rule 12, `docs/ARCHITECTURE-HANDOFF.md:178-181`).

Around those sit the wiring rules. Every message type the server sends must be on a privileged list (`server/src/index.js:377`), because an unknown message from a player is otherwise rebroadcast to the whole room (`server/src/index.js:5490-5578`). Each feature announces a lower-case capability flag in the join reply (`server/src/join.js:1422`); the flag lets old and new versions of the app and server run side by side, and doubles as an off-switch that needs no deploy (`server/src/liveops.js:59`). Each pull request ships a test suite, added to the server's 84-suite test chain, plus a spec document.

## Comparable games reward short visits and stopped punishing absence

A caution first. The researchers' tools could not open the wikis, guides and forums cited in this section, so every figure comes from a search engine's summary of the linked page rather than a full read. FarmVille 1's numbers are historical, since the game closed on 31 December 2020 ([Delisted Games](https://delistedgames.com/after-11-years-the-original-farmville-shuts-down-on-december-31st/)); Hay Day, FarmVille 3, Albion and the rest are live and may have been retuned.

### Short crops earn more per hour; long crops cover the night

**Every timed-crop game prices short crops as the efficient choice while you play, and long crops as insurance while you are away.** In FarmVille 1, plowing cost 15 coins a plot ([FarmVille Wiki: Plow tool](https://farmville.fandom.com/wiki/Plow_tool)). After that cost, blueberries (50 → 91 coins, 4 hours) netted about **6.5 coins per plot-hour** ([Blueberry](https://farmville.fandom.com/wiki/Blueberry)) and tomatoes (8 hours) about 7.25 ([Tomato](https://farmville.fandom.com/wiki/Tomato)), while four-day artichokes made about **1.3** ([Gamezebo](https://www.gamezebo.com/walkthroughs/farmville-walkthrough/)). In Hay Day, at top roadside prices, two-minute wheat is worth about **108 coins per field-hour** and three-hour pumpkins **10.8**, a tenfold gap ([Wheat](https://hayday.fandom.com/wiki/Wheat); [Pumpkin](https://hayday.fandom.com/wiki/Pumpkin)), and guides say to plant wheat and corn while playing and cotton, indigo or chili before logging off ([farmgamehub](https://www.farmgamehub.com/en/guides/hay-day/crops)). Palia shows the same ladder in real time: one game day is one real hour, so carrots take about 3 real hours and apples about 12 ([Prima Games](https://primagames.com/tips/how-long-do-crops-take-to-grow-in-palia-answered)). Albion runs every crop on one 22-hour cycle, just under a day so players keep the same daily slot ([Albion wiki: Crops](https://wiki.albiononline.com/wiki/Crops)), and WoW's Sunsong Ranch crops ripened in about a day ([Warcraft Tavern](https://www.warcrafttavern.com/mop/guides/sunsong-ranch-farm-guide/)).

**Growth must be measured on the server's wall clock.** Old School RuneScape's 2018 timer rework fixed code that let crops skip growth steps depending on when players logged in, so that "once a seed is in the ground, players will know roughly how long it'll take" ([Official OSRS news](https://secure.runescape.com/m=news/farming-timer-rework--skilling-qol?oldschool=1)). Black Desert's crops grow only while the player is logged in, and players have asked for offline growth on its official forum ([Black Desert forum](https://www.naeu.playblackdesert.com/en-US/Forum/ForumTopic/Detail?_topicNo=36465)). **Pay for actions, not for idle time.** RuneScape 3 cut its Player-Owned Farm's XP to 50% after complaints of "too much XP for too little activity" ([Jagex](https://secure.runescape.com/m=news/player-owned-farm---changes-blog)), and when FarmVille 1 paid XP for planting, power-levelers planted, deleted and replanted the same plots ([steelowl](https://steelowl.wordpress.com/2009/07/08/farmville-power-leveling/)).

### Withering and water gates drew the loudest complaints

In FarmVille 1 a ripe crop stayed safe for about one more grow time, then withered at random until all of it was gone by about 2.5 times the grow time from planting ([Wither](https://farmville.fandom.com/wiki/Wither)). Zynga then sold permanent immunity, the **Unwither Ring, for 250 Farm Cash** ([Unwither Ring](https://farmville.fandom.com/wiki/Unwither_Ring)), and coverage at the time asked whether it was "the worst thing to happen to virtual farming" ([Yahoo/FarmVille Freak](https://www.yahoo.com/news/2010-02-14-farmville-unwither-ring-the-worst-thing-to-happen-to-virtual-fa.html)). Academics later named the pattern **"Playing by Appointment"**, a dark pattern in which the game rather than the player decides when play must happen ([Zagal, Björk & Lewis 2013](https://www.diva-portal.org/smash/get/diva2:1043332/FULLTEXT01.pdf)). Later games dropped it. Hay Day's designer said the game "doesn't punish players for not logging in" ([GamesBeat](https://gamesbeat.com/after-a-decade-supercells-1st-hit-hay-day-keeps-humming-along/)); in Stardew Valley an unwatered crop simply doesn't grow that day ([Stardew Valley Wiki: Crops](https://stardewvalleywiki.com/Crops)); in Palia unwatered crops pause and never die ([TheGamer](https://www.thegamer.com/palia-farming-gardening-seeds-soil-plots-fertilizer-guide-walkthrough/)); and Animal Crossing: New Horizons removed flower wilting ([Animal Crossing Fandom: Flowers](https://animalcrossing.fandom.com/wiki/Flowers)).

**Water hurt as a gate and helped as a bonus.** FarmVille 2 rationed it — a well gave 10 water every 4 hours, and extra wells cost 14,000 coins plus four friends to staff them — and the press called water "one of the biggest obstacles" ([Yahoo 2012](https://ca.finance.yahoo.com/news/2012-09-10-farmville-2-tips-second-well.html)). FarmVille 3 turned it into an optional double-produce bonus ([FarmVille 3 Help Center](https://zyngasupport.helpshift.com/hc/en/91-farmville-3/faq/14485-how-do-i-plant-and-harvest-crops/)). Hand-watering wears players down: a Stardew player who did it for a whole year was "very close to quitting" ([Steam discussion](https://steamcommunity.com/app/413150/discussions/0/3415432674407977809)), sprinklers that water 8, 24 or 48 tiles are that game's cure ([TheGamer](https://www.thegamer.com/stardew-valley-sprinklers-guide-enricher-pressure-nozzle/)), and Palia players called hold-to-water tedious ([Steam discussion](https://steamcommunity.com/app/2707930/discussions/0/4360121020300548226)). The phone-friendly answer is a bulk gesture: Hay Day lets you drag one finger across every field ([AOL](https://www.aol.com/2012/06/22/hay-day-iphone-ipad/)), and WoW added seed bags that plant four plots at once ([Ten Ton Hammer](https://www.tentonhammer.com/articles/buying-the-farm-sunsong-ranch-changes-in-patch-5-2)).

### Expansion ladders start cheap, climb steeply and stay earnable

Most games below let players earn more land through play; the two that tied land or growth to a subscription drew complaints.

| Game | How players expanded | Numbers | What players thought |
|---|---|---|---|
| FarmVille 1 | coins plus a neighbor count | 10,000 coins and 8 neighbors, up to 500,000 coins and 30 ([Expand Farm](https://farmville.fandom.com/wiki/Expand_Farm/Home_Farm)) | — |
| Albion Online | island upgrades in silver | 1 million to 26.5 million silver in total; a 20,000-silver first island for newcomers; price per added plot climbs about threefold ([albiononlinegrind](https://albiononlinegrind.com/table/island-upgrade-cost)) | buying required the paid Premium, and players called it "pay 2 win" ([Albion forum](https://forum.albiononline.com/index.php/Thread/48681-albion-s-farm-system-is-getting-quite-pay-2-win/)) |
| Palia | Writs bought with Renown, a currency earned by playing | 39 expansions, 20 rising to 100 Renown each, 2,410 in all ([Palia Wiki: Housing Expansion](https://palia.wiki.gg/wiki/Housing_Expansion)) | — |
| World of Warcraft | reputation, never money | 4 plots growing to 16 ([Warcraft Tavern](https://www.warcrafttavern.com/mop/guides/sunsong-ranch-farm-guide/)) | — |
| Black Desert | real money | a permanent 10-slot fence for 1,200 pearls, about $12, capped at 8 per account ([Pearl Abyss notice](https://www.naeu.playblackdesert.com/News/Notice/Detail?groupContentNo=6178&countryType=en-us)) | tolerated because it matched the best free fence instead of beating it |
| ArcheAge | scarce shared land that only subscribers could claim or keep ([Engadget](https://www.engadget.com/2014/04/03/archeage-faq-mentions-testing-plans-optional-subscription-and/)) | labor, the action budget, refilled offline only for subscribers ([ArcheAge Wiki: Labor](https://archeage.fandom.com/wiki/Labor)) | resented; scripts sniped lapsed plots |

### Visitors who can only add, never take

**China's Happy Farm let friends steal ripe crops, and real friendships frayed** ([Association for Asian Studies](https://www.asianstudies.org/publications/eaa/archives/chinas-happy-farm-and-the-impact-of-social-gaming/)). ArcheAge's open-world crop theft went to player juries ([ArcheAge Justice System](https://archeage.fandom.com/wiki/Justice_System)), its finite land was taken by scripts ([official forum archive](http://forums.archeagegame.com/archive/index.php/t-150686.html)), and its North American and European servers closed in June 2024 ([TheSixthAxis](https://www.thesixthaxis.com/2024/04/27/archeage-servers-in-europe-and-north-america-will-be-shutdown-on-june-27th/)).

The models that worked all limit visitors to helping. FarmVille 1 neighbors could fertilize 5 plots a day on each of up to 50 farms, for 10 coins and 1 XP per plot, and the host earned XP too ([Crop Fertilizer](https://farmville.fandom.com/wiki/Crop_Fertilizer)). In Animal Crossing, each distinct visitor who waters a flower raises its daily chance to reproduce from 5% alone to 25, 35, 50, 65 and 80% with up to five visitors ([Nookipedia: Flower](https://nookipedia.com/wiki/Flower)), and only "Best Friends" may use axes and shovels ([Nintendo UK](https://www.nintendo.com/en-gb/News/2020/May/Top-tips-for-playing-Animal-Crossing-New-Horizons-with-friends-1783708.html)). Albion names Visitor, Builder and Co-Owner roles ([Managing Access Rights](https://wiki.albiononline.com/wiki/Managing_Access_Rights)); Palia lets visitors water and weed only while the owner is on the plot ([Palia support](https://support.palia.com/hc/en-us/articles/7475337549076-Social-Features)); and Hay Day visitors revive a friend's wilted trees for XP ([Trees and Bushes](https://hayday.fandom.com/wiki/Trees_and_Bushes)). Hay Day's design lead told GDC 2025 that its competitive team event burned out the larger, cooperative majority of players ([mobilegamer.biz](https://mobilegamer.biz/gdc-2025-diablo-immortals-shock-success-hay-days-bumpy-derby-launch-andis-candy-crush-saga-is-the-worlds-biggest-esport/)). **WoW's phased farm is the counter-example:** friends could neither see nor help ([Warcraft Wiki](https://warcraft.wiki.gg/wiki/Sunsong_Ranch)).

### Food beats potions only when the buff rules and the supply allow it

**The common rule is one food buff at a time, lasting 30 to 120 minutes, of modest size and often carrying an XP bonus.** Albion's lasts 30 minutes ([Albion wiki: Food](https://wiki.albiononline.com/wiki/Food)); WoW's +300 Strength lasts an hour and needs 25 Green Cabbage from the farm ([Warcraft Wiki](https://warcraft.wiki.gg/wiki/Recipe:_Black_Pepper_Ribs_and_Shrimp)); every Final Fantasy XIV meal adds +3% XP for 30 minutes ([FFXIV Wiki: Well Fed](https://ffxiv.consolegameswiki.com/wiki/Well_Fed)); Guild Wars 2 food adds +10% kill XP ([Snow Crows](https://snowcrows.com/guides/getting-started/guild-wars-2-food-glossary)) and survives death ([GW2 Wiki: Nourishment](https://wiki.guildwars2.com/wiki/Nourishment)); WoW added "Hearty" meals that survive death after players complained ([Blizzard Watch](https://blizzardwatch.com/2024/05/22/hearty-meals-cooking-wow-war-within/)); and Stardew allows one food buff and one drink buff at once ([Stardew Valley Wiki: Buffs](https://stardewvalleywiki.com/Buffs)).

**Who makes the consumables decides who depends on farmers.** OSRS sells no prayer potions in any shop, which makes ranarr, a low-level herb, one of its most valuable ([OSRS Wiki: Ranarr weed](https://oldschool.runescape.wiki/w/Ranarr_weed)). Albion's potions have been made mainly from player-grown herbs since 2016 ([Albion on Steam](https://steamcommunity.com/games/761890/announcements/detail/3985189839340751275)). Black Desert's shop potions cost more than player-made ones but never run out ([BDO Crafting Lab](https://www.bdocraftinglab.com/guides/alchemy-guide)). Action RPGs took basic healing off the shelf altogether: Diablo III has one potion healing 60% on a 30-second cooldown ([Diablo Wiki](https://www.diablowiki.net/Potion)), and Diablo Immortal has three charges refilled by chests, tougher monsters and town ([Game8](https://game8.co/games/Diablo-Immortal/archives/378456)).

The economic tools are old and proven: Raph Koster's warning that gold sources players can open wider, set against fixed drains, cause inflation ([Raph Koster](https://www.raphkoster.com/2006/09/07/agc-mmo-economies/)); Black Desert's daily-capped shop that buys players' cooking ([BDO Crafting Lab](https://www.bdocraftinglab.com/guides/imperial-cooking)); and Final Fantasy XIV's daily turn-ins, which accept items bought on the market ([FFXIV Wiki](https://ffxiv.consolegameswiki.com/wiki/Grand_Company_Supply_and_Provisioning_Missions)). Timer games also draw cheats. Changing a phone's clock to skip timers was shown at DEF CON in 2011 ([Tom's Guide](https://tomsguide.com/us/Zero-Day-Exploit-DEFCON-19-DEFCON-Kids,news-12106.html)), Albion players ran "20 alts with islands" ([Albion forum](https://forum.albiononline.com/index.php/Thread/36390-20-Alts-with-islands-and-farms-for-massive-farming/)), and OSRS banned about 7 million bots in 2023 ([PC Gamer](https://www.pcgamer.com/old-school-runescape-players-revolt-after-new-big-money-owners-say-bots-are-fine-actually-devs-furiously-walk-it-back-and-say-they-banned-7-million-bots-last-year/)).

## The recommended design: dig, plant, water, feed, harvest

### What each step changes

**Dig and plant are required; water and fertilizer are optional boosts with a visible payoff.** This follows the evidence above: forgetting a step should cost a little time or a little yield, never the crop.

| Step | Required? | What it does |
|---|---|---|
| Dig | yes | Turns grass or a spent bed into soil: once on newly bought land, and again after each harvest. |
| Plant | yes | Uses one seed from the bag, bought at the Feed & Seed. Sets which crop grows and how long it takes. |
| Water | no | The crop is ready **25% sooner**. An unwatered crop still grows; it just takes a third longer. |
| Fertilize | no | Uses one bag of compost (4 coins at the Feed & Seed). The harvest is **50% larger**. |
| Harvest | — | Puts the crops in the bag, pays Farming XP, and leaves the bed spent. |

The rule to remember is **"water makes it faster, fertilizer makes it bigger"**, and each bed's card shows both numbers before you commit. On a phone, every tool works by tapping it once and dragging a finger across the beds, as in Hay Day. Each drag is one message to the server, never one message per bed. Farming XP is paid **only at harvest**, never for digging or planting, which closes FarmVille's delete-and-replant exploit.

### Six starter crops, from six minutes to twenty-two hours

The two short crops reward being on the farm, and the overnight and daily crops reward coming back. Three of the six reuse the exact herb items the server's recipes already ask for, so the Cookhouse starts working the day they ship. The level gates follow the owner's own "levels of 5" rule for gathering (`server/src/gathering.js:115-121`).

| Crop (bag item) | Farming level | Seed price | Ready in (watered) | Harvest per bed (fertilized) | Farming XP per bed | Diego pays for the first | Main use |
|---|---|---|---|---|---|---|---|
| Carrot (`crop_carrot`) | 1 | 2 coins | 6 min | 2 (3) | 25 | 4 coins | Garden Stew; the first farm errand |
| Firebloom (`herb_firebloom`) | 1 | 5 | 30 min | 2 (3) | 50 | 8 | Herb Bread, Firebloom Tea, brewed Fury Tonic |
| Potato (`crop_potato`) | 5 | 6 | 2 h | 3 (4–5) | 90 | 6 | Garden Stew, Pumpkin Pie |
| Rock Vine (`herb_rock_vine`) | 5 | 10 | 4 h | 2 (3) | 120 | 15 | Root Stew, brewed Mana Draught |
| Cloudpetal (`herb_cloudpetal`) | 10 | 15 | 8 h | 2 (3) | 180 | 20 | Root Stew, brewed Swift Draught |
| Pumpkin (`crop_pumpkin`) | 10 | 25 | 22 h | 2 (3) | 320 | 30 | Pumpkin Pie, daily orders |

**The numbers follow the comparable games' shape.** Count Diego's opening price, after the seed is paid for, on a watered but unfertilized bed. One harvest then nets 6, 11, 12, 20, 25 and 35 coins down the table, so each harvest is worth about six times more from carrot to pumpkin. Per bed-hour it nets 60, 22, 6, 5, 3 and 1.6 coins, a nearly fortyfold fall — steeper than FarmVille's gap only because the carrot is shorter than anything FarmVille had. **Diego can never become an endless gold source.** Every seed costs at least one coin per crop it normally yields, so once the world's pile of a crop pushes Diego to his 1-coin floor, selling him that crop earns nothing. Even a full 25-bed pumpkin farm earns about 875 coins a day at his opening price, or about 1,500 with fertilizer — one to one and a half hours of combat in the model — and much less once his pile grows.

**XP is sized like gathering.** Harvesting six Firebloom beds pays 300 XP for about a minute's visit, within the 163 to 326 XP of a single tier-1 gathering harvest (`server/src/gathering.js:446-455`); the clock, not the player, limits how often. On the free six beds, three visits a day reach Farming level 5 (2,254 total XP) in two to three days and level 10 (6,247 total XP) in about a week, and the Grower's Guild then pays automatically. A change the owner approved but that isn't on main yet doubles what every life-skill level costs (branch `claude/lifeskill-xp-pace`). Once it lands, these become about five days and two weeks at the same XP per harvest. The dormant elemental herbs (Snowpetal, Thunderbloom and the rest) can arrive later as seeds dropped by each land's monsters, which gives combat a reason to feed the farm, the way OSRS herbs come from both patches and monsters.

### Being away costs nothing

**Crops grow on the server's clock whether or not the owner, or anyone, is online.** Each bed stores the moment it will be ready, and the server compares that moment with the clock whenever the farm is opened, so even an empty room needs no alarm. The no-alarms rule forces this lazy timer anyway, and food buffs already use the same pattern (`server/src/cooking.js:306-307`). **Ripe crops wait in the ground indefinitely: nothing withers, rots or gets stolen.** The only cost of a long absence is beds that sit idle, which is Hay Day's model.

On login the game says "4 beds ready", the same way the daily chest announces itself. The game has no push notifications. On iPhone, web notifications reportedly require the site to be added to the Home Screen (not verified). Apple's App Store rules say notifications must never be needed to play ([Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)); a web game isn't bound by them, but the rule is a good one to follow. A gentle later extra would make absence pay: a bed left empty for a day could grow one extra crop next time, up to a cap, the way WoW's rested XP rewards time away ([Icy Veins](https://www.icy-veins.com/wow/rested-xp-a-detailed-overview)). This design also suits the planned two-hour free play cap (`docs/WORLD-ARCHITECTURE.md:383-385`): growth happens off the clock, and a farm visit spends only minutes of it.

### A free six-bed deed, then prices that double

The Land Office hands every player a free deed for a six-bed farm. More land costs gold there, each step roughly double the last:

| Purchase at the Land Office | Beds added | Beds in total | Price | Price per added bed | Running total |
|---|---|---|---|---|---|
| Free deed | 6 | 6 | free | — | 0 |
| Expansion 1 | 3 | 9 | 500 coins | 167 | 500 |
| Expansion 2 | 3 | 12 | 1,000 | 333 | 1,500 |
| Expansion 3 | 4 | 16 | 2,000 | 500 | 3,500 |
| Expansion 4 | 4 | 20 | 4,000 | 1,000 | 7,500 |
| Expansion 5 | 5 | 25 | 7,500 | 1,500 | 15,000 |

**The first step costs the same 500 coins as founding a clan**, about half an hour of active play in the model, and three pumpkin beds sold to Diego at his opening price pay it back in about five days, or three with fertilizer. The last steps work as long-term gold sinks: the full 15,000 coins is about fifteen hours of combat income, so a player on two hours a day reaches the top in weeks, not days. Twenty-five beds is the ceiling because that is about as much as one finger can comfortably drag across on a phone. Every step is bought with gold players earn, never with real money. If the $2 supporter pass ever touches the farm it should be cosmetic, because paid extra growth was resented in ArcheAge and called "pay 2 win" in Albion, and Black Desert's paid fence was tolerated only because it never beat the free one.

### Friends water; only the owner plants and harvests

| Who | How they get in | What they may do |
|---|---|---|
| The owner | always | everything: dig, plant, water, fertilize, harvest, buy land, change who may visit |
| Friends (the default), or friends and clan, or nobody, as the owner chooses | walk in from the friends list or the Land Office, even while the owner is offline (a decision below) | look around, chat, and water growing beds |
| Anyone the owner invites | an invite card, open for two minutes, sent while both are online | the same as a friend, for that visit |
| Nobody, ever | — | harvest, plant, dig, or take anything from someone else's farm |

Friends' watering pays both sides, using the Animal Crossing pattern. Each different friend who waters a bed adds **+10% to its harvest**, up to three friends (+30%), and the helper earns 15 Farming XP per bed, up to 10 beds per farm per day. No gold changes hands, so a crowd of alternate accounts gains nothing worth farming, and helpers must reach Farming level 5 to count, which raises the price of using brand-new identities — nearly free to make in this game. The owner's setting is stored with the farm, so it holds while the owner is offline, and a friend's watering simply adds to the stored beds. This would be new ground: Palia requires the owner to be present and Animal Crossing's offline visits are look-only, so neither lets a friend help a sleeping farm. BroTown can, because the server checks every action.

### What farming pays: meals, brews, quests and capped orders

Phase 2 turns crops into things a combat player wants. Meals last half an hour and are modest; brews are the three Diego tonics, unchanged, but made from herbs.

| Dish | Made from | Effect | Lasts | Server work |
|---|---|---|---|---|
| Garden Stew | 2 Carrot + 1 Potato | heals 150 HP at once | instant | extend today's fish-eating path (`server/src/cooking.js:47-99`) to dishes |
| Herb Bread | 1 Firebloom | out-of-combat healing twice as fast | 30 min | add the missing reader for the `regen` timer |
| Root Stew | 1 Rock Vine + 1 Cloudpetal | 5% less damage taken | 30 min | reader exists (`server/src/combat.js:405`) |
| Pumpkin Pie | 1 Pumpkin + 2 Potato | +10% combat XP | 30 min | new reader in `_prog3AwardXp` (`server/src/prog3.js:1135`) |
| Fury Tonic | 3 Firebloom | double damage | 3 min | effect exists (`server/src/data.js:498`) |
| Mana Draught | 2 Rock Vine | specials nonstop | 3 min | effect exists (`server/src/data.js:509`) |
| Swift Draught | 2 Cloudpetal | 1.5× run speed | 3 min | effect exists (`server/src/data.js:524`) |

Today cooking a recipe applies its buff on the spot. **Phase 2 makes the Cookhouse produce an item you carry instead**, so non-farmers can buy food from farmers on the auction house and farming feeds combat without forcing anyone to farm. The Pumpkin Pie's server-side XP bonus is also the missing half of a real "Well Rested" from the farmhouse bed, the reason the Hotel is shut.

Beyond food, farming pays in three more ways. A Mayor Bro errand ("claim your farm, then bring me 4 Firebloom") works with today's quest code, and a new `harvest` objective kind can count crops picked the way node harvests are already counted (`server/src/quests.js:163-192`). The Grower's Guild ladder pays automatically, from 30 coins at level 5 to 2,000 at level 150. And gold arrives three ways: Diego is a trickle that dries up as his pile grows, the auction house moves gold between players, and **a Feed & Seed order board is the dependable source** — three orders a day per player, such as "12 Carrots for 40 coins and 150 XP" or "3 Pumpkin Pies for 250 coins and 800 XP", about 150 to 400 coins a day, reset lazily by the existing daily-cadence code (`server/src/cadence.js:1-36`). Throughout, farming should make a fighter's life easier without ever being required, the lesson of WoW's Garrison "laundry list of chores" ([BlizzPro](https://blizzpro.com/2015/06/13/world-of-warcraft-qa-with-ion-hazzikostas-recap/)).

### Diego keeps his staples and loses his tonics

**Retire the Fury Tonic, Mana Draught and Swift Draught from Diego's shelf on the same day the farm brews ship, and keep the Cooked Minnow and the Stamina Salts.** The tonics must go because, under the one-effect rule, a 35-coin bottle of double damage beats any meal a farm could offer; farm "stat boosts" would be pointless while it is on sale, and no quest, drop table or dungeon needs it. The two instant items should stay because they never touch the buff record, so they don't compete with farm food, and they give a brand-new player at a quiet hour a fallback. The minnow is already outclassed — Garden Stew heals 150 HP to its 23 — and the stamina-ability design assumes salts can be bought (`server/src/abilities.js:303-313`). Removing all five would push the whole risk of a thin market onto a one-room world capped at 60 players (`server/src/index.js:762-769`).

**The thin-market risk stays low anyway, because every player gets a free farm.** One six-bed farm planted with Firebloom three times a day grows 36 Firebloom — enough for **twelve Fury Tonics, which cost 420 coins at Diego's counter today, for 90 coins of seed** — so no player depends on a stranger's supply. The cleanest implementation keeps the three bottles' item names and effects and takes them off Diego's shelf on the server. Old bottles in bags then stay drinkable, the bag's potion list (`src/ui/mobile/dash/InventoryPanel.jsx:158`) and the auction house's potion category (`server/src/store.js:166-171`) keep working, and the shop and potion tests that buy them from Diego change in the same pull request. The cheat-check damage ceiling already allows the Fury Tonic's ×2, and brewed tonics keep exactly that number.

## A server sketch: one record, lazy clocks, a private zone per farm

### The farm record

**Each player's farm is one saved record, `farm:<playerId>`,** registered in the handbook's table. One record means one storage row written per action; splitting it into a row per bed would multiply writes. A sketch, with times on the server's clock in milliseconds:

```
farm:<playerId> = {
  v: 1,                    // record format version
  zid: "f7a2c91e",         // short private zone name -> zone "farm:f7a2c91e"
  beds: 6, bought: 0,      // 6 free beds, 0 of 5 expansions bought
  visit: "friends",        // who may walk in: "me" | "friends" | "clan"
  plots: [
    { s: "growing", crop: "herb_firebloom",
      plantedAt: 1791273600000, readyAt: 1791275400000,
      water: true, feed: false, helpers: ["<friendId>"] },
    { s: "spent" }, { s: "dug" } /* ... one entry per bed */
  ]
}
```

**Readiness is never ticked; it is computed.** A crop is ripe when the server's clock passes `readyAt`, and watering recomputes `readyAt` at the moment it happens. **The phone's clock is never trusted:** the farm's state message carries the server's own `now` beside each `readyAt`, so a phone with a wrong clock still shows the right countdown. The client has no server-clock helper today, and countdowns such as the war banner subtract the phone's own clock (`src/ui/panels/WarBanner.jsx:31`), even though every tick already carries the server's time (`server/src/tick.js:326`, `:492`).

### Messages and wiring

| Message | Direction | Purpose |
|---|---|---|
| `farm_enter {owner}` | phone → server | Ask to go to a farm. The server checks permission, then answers with the zone and the arrival point. |
| `farm_act {op, beds[], item?}` | phone → server | Dig, plant, water, fertilize or harvest one or many beds. One message per drag. |
| `farm_buy {step}` | phone → server | Buy the next Land Office expansion. |
| `farm_settings {visit}` | phone → server | Who may visit. |
| `farm_invite {target}` / `farm_invite_accept {from}` | phone → server | A one-off invite, kept in memory for two minutes, like clan invites. |
| `farm_state` | server → phone | The whole farm on entry, small changes after each action. Sent only to people in that farm. |
| `farm_invited`, `farm_error` | server → phone | The invite card, and refusal reasons. |

The server-sent types join the privileged list, and each phone-sent type gets a case in the server's message router and a line in the phone's send allowlist (`src/networking/wsClient.js:4036-4405`). The feature advertises a `caps.farm` flag: the phone uses the new farm only when it sees that flag, and retires the old browser-only planting at the same moment, while `farm: false` in the live flags hides the farm and refuses its actions without a deploy.

### What the server checks

Every check runs against the server's own data. A harvest before `readyAt` is refused. Each harvested bed pays through `_creditPlayer` with a receipt number such as `farmharvest:<playerId>:<bed>:<plantedAt>`, so a message retried after a dropped connection pays once. Buying land debits the gold and writes the record in one event (rules 8 and 9). Seed and crop names are looked up only as the table's own entries, never through inherited names like `__proto__`, and crop level gates sit in a table copied on the phone and pinned by mirror-audit, like the gathering requirements (`server/src/gathering.js:147-151`). Rate limits follow the house pattern: a per-minute cap set from an honest tapping pace, and an hourly cap like the 2,400-an-hour harvest and cook caps (`server/src/botfp.js:148`, `:156`). Once beds are drawn on a map, the player must be standing in the farm and near the bed, and helpers are counted as distinct people and capped per day.

### Making farms private

**Phase 3 copies the dungeon trick.** A dungeon instance is "just a zone id the ZONES table doesn't know" (`server/src/dungeon.js:12-34`), so every farm gets a zone named `farm:<zid>`. The id is short because zone names are capped at 40 characters (`server/src/movement.js:78-82`) and player ids vary in length (`server/src/account.js:27-33`). **Dungeons deliberately have no lock, so farms need one.** Dungeon ids appear in a once-a-second list sent to every player, "so a stranger can walk into someone's dungeon" (`server/src/movement.js:68-77`). Privacy must therefore come from an entry check on both the move and join paths, and the server should place arrivals itself, as the movement code recommends: "the next person should build that instead" (`server/src/movement.js:155-159`). About nine scattered "town or farm_home" checks become one helper that also recognises farm zones (for example `server/src/index.js:3382` and `:4105`). Today's farm also houses the Dungeon Workshop that Mayor Bro's third quest sends players to (`src/data/gameSystems.js:6722-6758`), and custom dungeons return players there, so those links and the `mp-wheeldoors` test of the farm trip must move to the private farm too.

### Where the farm lives, and what it costs

**The farm should live inside today's single game room**, where your bag, coins, friends and the farm are all in one place, so every harvest and purchase settles in a single step. A separate room per farm doesn't work today, because character data lives inside each room (`server/src/index.js:222-225`) and a visitor's bag would not be there. A separate farm server per player is overkill at 60 players: every harvest would become a two-step hand-off between servers. That option becomes natural later, when the planned per-player "character vault" exists (`docs/WORLD-ARCHITECTURE.md:103-133`), and keeping `farm:<playerId>` self-contained makes the later move mechanical. **The cost is small.** Farm actions are taps, negligible beside the 15 to 30 movement messages a second a walking phone already sends, and a ten-minute session of 100 actions writes about 100 rows, roughly $0.0001 at $1 per million rows (`docs/WORLD-ARCHITECTURE.md:293-315`).

## Five phases, smallest first

Each phase ships as one self-contained pull request, or a short series, with its own test suite, spec and kill switch, and each makes sense to players even if the next phase never comes.

| Phase | What players get | Main work | Why in this order |
|---|---|---|---|
| **1. Real crops** | The Feed & Seed window becomes server-run: 6 free beds, Dig/Plant/Water/Harvest buttons, Carrot plus the three recipe herbs, seeds sold in the same window, Farming XP that counts. The three Cookhouse recipes start working; Herb Bread gets its missing server reader and Firebloom Tea's card is corrected. | New server module `farm.js`, the `farm:<playerId>` record, the crop table copied on the phone, `farm_act`/`farm_state`, `caps.farm`, `farm.test.mjs`, `docs/specs/farm.md`; the old browser planting retired. | No new art, no zone changes, only proven patterns. Unfreezes the Grower's Guild and the Farming hiscore on day one. |
| **2. Food worth growing** | Potato and Pumpkin; carried meals and brews; Garden Stew; 30-minute meals; the three tonics brewed from herbs and taken off Diego's shelf; a Food filter and an Eat button in the bag. | Cook-to-item path, eat path for dishes, the XP reader, shop and potion test updates, the client potion list, and the meal-and-brew slot decision below. | Gives combat players a reason to want crops before the farm gets prettier. |
| **3. Your own farm** | "Claim your free farm" at the Land Office; expansions from 500 to 7,500 coins; a private farm with beds drawn on a new map; walk up and tap, or drag; visible growth stages; Mayor Bro's farm errand. | `farm:<zid>` zones, the entry check on move and join, server-placed arrival, the hub helper; the Dungeon Workshop and dungeon returns moved to the private farm; art made with the Object Studio, loaded per zone and freed on exit as the preload law requires. | The largest server and art change, made once crops have proven their worth. This phase builds the lock. |
| **4. Friends on the farm** | The visit setting; "Visit farm" on the friends list and inspect card; the invite card; friends' watering with the +10% bonus and helper XP; visits while the owner is offline, if chosen. | A permission check against the stored friends and clan records, the invite handshake, helper caps, a friendly zone label in the Social panel. | Social play on top of a stable private farm. This phase hands out the keys. |
| **5. Depth** | Better compost; elemental seeds dropped by each land's monsters; the daily order board; golden-quality crops; tool upgrades that water or dig 1, 3, then 5 beds a swing; the rested-soil bonus. | Mostly data and tuning on top of phases 1 to 4. | Tune once real play data exists. |

## Decisions only the owner can make

| Decision | Choices | Recommendation |
|---|---|---|
| Diego's potions | remove all five; retire the three tonics and keep the minnow and salts; keep everything | Retire the three tonics in Phase 2, on the day the brews ship; keep the two instant items. |
| How many timed effects at once | one, today's rule; one meal plus one brew | One meal plus one brew, like Stardew's food-and-drink rule, with damage buffs only in brews. By simple multiplication, a +20% meal stacked on the ×2 tonic would push the staff's measured peak from 90.5% to about 109% of the cheat-check ceiling (`server/src/combat.js:858-864`). |
| Are water and fertilizer required? | required steps; optional boosts | Optional boosts. FarmVille 2's water gate was its most complained-about mechanic. |
| Withering | none; FarmVille-style | None. Ripe crops wait. |
| Default visitors, and visits while the owner is offline | nobody, friends, or friends and clan; owner online only, or any time | Friends by default, any time, watering only. |
| What guests may do | water only; also plant for trusted friends | Water only, at least until Phase 5. |
| The farm's look | keep the cave picture; a new map from the Wheel's art pipeline | A new map: the picture has no room for beds and does not match the logic grid. |
| Land prices | the doubling ladder (500 to 7,500, 15,000 total); steeper; gold plus materials | The doubling ladder in gold, retuned once there are real income numbers. |
| The $2 supporter pass and the farm | nothing; cosmetics; extra beds or faster crops | Nothing that makes crops grow faster or larger. |
| Meal timers | keep running while offline, as today; pause while offline | Keep today's rule first; pausing a 30-minute meal while logged out, which Albion players asked for, is a later polish. |

## Conclusion

The real obstacle to farming rewards in BroTown is a single rule, not a missing feature. Because only one timed effect may run at once, any farm food competes with a 35-coin bottle of double damage and loses; retiring the tonics, or giving meals their own slot, is what makes "temporary stat boosts" worth growing. The other big choices fall out of the architecture. The no-alarms rule forces exactly the offline, never-withering growth that fifteen years of farm games converged on, and a free deed for every player largely removes the thin-market risk that sinks player-made-potion economies, because no one depends on a stranger's supply.

Two openings exist that the comparable games lacked. A server that settles every action can let friends help a farm while its owner is asleep, which neither Palia nor Animal Crossing allows: a genuinely new social hook, but untested, so the alt-account caps matter. And the one server-side XP reader that Pumpkin Pie needs is also the missing half of the farmhouse bed's "Well Rested", which is exactly why the Hotel is still shut, so building the farm's rewards helps open a building in town.

*The notes behind this report, with every source, are in `docs/research/farming/`.*
