# How combat-centred MMOs integrate farming: OSRS/RS3, Albion Online, WoW, Black Desert

(Research notes, started 2026-10-06. Status: IN PROGRESS. Sections are filled in as research proceeds.)

## OSRS / RS3: growth cycles, patches, disease, compost, Farming XP, Herblore supply, Tithe Farm, Farming Contracts, farm runs, Player-Owned Farm

### Takeaway
(pending)

### Cited Findings
(pending)

### Inferences
(pending)

### Gaps
(pending)

## Albion Online: personal islands, plots, crops, Focus watering, seed return, access rights, food/potions, market effects

### Takeaway
(pending)

### Cited Findings
(pending)

### Inferences
(pending)

### Gaps
(pending)

## WoW: Sunsong Ranch / Tillers (MoP), Garrison herb garden and later equivalents

### Takeaway
(pending)

### Cited Findings
(pending)

### Inferences
(pending)

### Gaps
(pending)

## Black Desert Online: fences, growth, pruning/insects/watering, breeding, workers, uses, market

### Takeaway
(pending)

### Cited Findings
(pending)

### Inferences
(pending)

### Gaps
(pending)

## Cross-cutting: farming's share of consumables, food-buff structure, avoiding the chore

### Takeaway
(pending)

### Cited Findings
(pending)

### Inferences
(pending)

### Gaps
(pending)

---
## CHECKPOINT LOG (raw findings appended as gathered; consolidated into the sections above at the end)

### Method note (important for the report writer)
- WebFetch could NOT open any page: the session's egress proxy blocks oldschool.runescape.wiki, runescape.wiki, wiki.albiononline.com, forum.albiononline.com, warcraft.wiki.gg, wowhead.com, theoatrix.net and blackdesertfoundry.com (EGRESS_BLOCKED, 2026-10-06). Every figure below therefore comes from WebSearch result summaries of the cited pages (the search tool reads the page snippets), not from a full read of the page. Treat exact decimals as "per the cited page's snippet"; where two snippets disagree it is flagged.

### OSRS raw findings (batch 1)
- Crops keep growing while logged out, in real time, and can become diseased while the player is offline — https://oldschool.runescape.wiki/w/Farming
- Growth "cycles" by crop type: flowers and saplings 5-minute cycle; allotments 10-minute cycle ("2nd fastest"); herbs and bushes 20-minute cycle; trees, mushroom spores, coral frags 40-minute cycle. There is a per-player offset of up to 30 minutes that persists through logins — https://oldschool.runescape.wiki/w/Farming ; https://oldschool.runescape.wiki/w/Allotment_patch
- A farming-system update ("Farming Timer Rework & Skilling QoL") made it so logging in/out no longer stops a growth tick from happening — https://oldschool.runescape.wiki/w/Update:Farming_Timer_Rework_&_Skilling_QoL (date not yet confirmed)
- Herbs take ~80 minutes to grow fully — https://oldschool.runescape.wiki/w/Herb_patch ; https://www.osrstools.net/guides/money-making/herb-runs ("Farming Money Making Every 80 Minutes")
- Herb patches cannot be protected from disease (no gardener payment); the only protection is a disease-free patch — https://www.theoatrix.net/post/complete-herb-farming-guide-for-osrs-herb-run-guide (search snippet)
- Compost reduces disease chance by 50%, supercompost by 80%, ultracompost by 90% (rounded down to the nearest 1/128) — https://oldschool.runescape.wiki/w/Disease_(Farming) ; https://oldschool.runescape.wiki/w/Ultracompost
- Herbs: base disease chance 27/128 (~21.1%) per cycle; compost 14/128 (~10.9%); supercompost 6/128 (~4.7%); ultracompost 3/128 (~2.3%) — https://oldschool.runescape.wiki/w/Disease_(Farming)
  - CONFLICT: a third-party guide snippet says ultracompost changes "the 20.3% disease chance per stage to only 2.9%" and the chance of death to 8.3% — https://www.theoatrix.net/post/complete-herb-farming-guide-for-osrs-herb-run-guide . Prefer the wiki's 1/128 fractions.
- Fruit trees: base 18/128 (~14.1%) per cycle; compost 9/128; supercompost 4/128; ultracompost 2/128 (~1.6%) — https://oldschool.runescape.wiki/w/Disease_(Farming)
- Compost adds 1 "harvest life", supercompost 2, ultracompost 3; ultracompost guarantees at least 6 herbs per patch — https://www.theoatrix.net/post/complete-herb-farming-guide-for-osrs-herb-run-guide (search snippet)
- Watering allotment, flower and hops patches with a watering can reduces disease risk — https://oldschool.runescape.wiki/w/Disease_(Farming)
- A living Iasor plant (Farming Guild/anima) reduces all crops' disease risk by a further 80%, to a minimum of 1/128 per cycle — https://oldschool.runescape.wiki/w/Disease_(Farming)
- Paying the nearby farmer/gardener removes disease risk for tree patches; seedlings in plant pots can't get diseased. Payments are in-kind produce: magic tree 25 coconuts; palm tree 15 papayas; spirit tree 5 monkey nuts + 1 monkey bar + 1 ground suqah tooth. The farmer will also clear a grown tree for 200 coins — https://oldschool.runescape.wiki/w/Tree_patch ; https://oldschool.runescape.wiki/w/Magic_tree_(Farming) ; https://oldschool.runescape.wiki/w/Palm_sapling ; https://oldschool.runescape.wiki/w/Spirit_Tree_Patch
- Tithe Farm (Hosidius, Farming 34+): 1 point per 3 fruit deposited, +2 bonus points at the 100th fruit; 16,000-point cap; bonus XP of 250x the harvest rate on the 75th fruit (1,500/3,500/5,750 XP for golovanova/bologano/logavano); double XP for fruit 75-100. XP/hour: golovanova 25k-35k (lv 34-54), bologano 65k-80k (54-74), logavano 105k-120k (74+) — https://oldschool.runescape.wiki/w/Tithe_Farm ; https://oldschool.runescape.wiki/w/Tithe_points

### OSRS / RS3 raw findings (batch 2)
- Farming contracts (Farming Guild, Guildmaster Jane): grow a named crop in the Guild; reward a seed pack (tier 1-5). Easy contracts need Farming 45 (tiers 1-3), Medium 65 (tiers 2-4), Hard 85 (tiers 3-5). Average expected value: Easy 18,388.84 coins, Medium 39,204.41, Hard 63,638.78. A spirit seed/seedling/sapling can be swapped for one tier-5 pack (avg 78,334.83 coins) — https://oldschool.runescape.wiki/w/Farming_contracts ; https://oldschool.runescape.wiki/w/Seed_pack ; https://oldschool.runescape.wiki/w/Guildmaster_Jane
- Farming Timer Rework (official OSRS news): the original 2005 growth-timer code let crops miss growth ticks depending on when a player logged in/out or hopped worlds, "slowing down the patch potentially by hours or days". Clocks tick every 5, 10, 20, 40 min...; fastest crops (weeds, flowers) grow on 5-min ticks, allotments on 10-min ticks. After the rework, logging in/out no longer stops a tick, "once a seed is in the ground, players will know roughly how long it'll take" — https://secure.runescape.com/m=news/farming-timer-rework--skilling-qol?oldschool=1 ; https://oldschool.runescape.wiki/w/Update:Farming_Timer_Rework_&_Skilling_QoL (exact release date not captured by the snippet — gap)
- Farming XP model (trees): XP is paid at planting (e.g. magic seed 145.5 XP), and the bulk at "check health" once fully grown (oak 467.3, willow 1,456.5, maple 3,403.4, magic 13,913.8 XP); ordinary trees give no harvest XP; fruit trees/palm do (palm: 6 coconuts at 41.5 XP each) — https://oldschool.runescape.wiki/w/Magic_tree_(Farming) ; https://oldschool.runescape.wiki/w/Oak_tree_(Farming) ; https://oldschool.runescape.wiki/w/Maple_tree_(Farming) ; https://oldschool.runescape.wiki/w/Palm_tree
- RS3 Player-owned farm (Manor Farm): pens for raising/breeding livestock (rabbits, chickens, sheep, cows, chinchompas, spiders, yaks, zygomites, dragons); currency "beans". Growth stages advance with the animal in its pen even while the player is logged out; newborns born while away don't start growing until the player next visits/logs in on the farm. Magic beans (sundry) cost 400 beans and grow something "near instantly" in mushroom/hops/allotment/evil-turnip patches — https://runescape.wiki/w/Player-owned_farm ; https://runescape.wiki/w/Breeding

### OSRS / RS3 raw findings (batch 3)
- Herb run timing: most experienced players finish a full herb run "in 5 to 10 minutes"; the wiki money-making guide lists the activity as 6 minutes of play with a minimum recurrence of 90 minutes — https://www.osrstools.net/guides/herb-runs (5-10 min) ; https://oldschool.runescape.wiki/w/Money_making_guide/Farming_herbs (6 min / 90 min recurrence, per search snippet)
- Herb run profit (wiki money-making guides, figures move with Grand Exchange prices; date of snapshot unknown): grimy snapdragon 183,456 gp profit per run ("1,834,560 per hour" effective, after tax); grimy ranarr 178,898 per run ("1,788,980 per hour"). These "per hour" numbers are per hour of ACTIVE play (a 6-minute run counted as 1/10 hour), assuming ultracompost + magic secateurs and 8.8 herbs per patch. Herbs per patch "6-15", usually 6-10, average 8.8 — https://oldschool.runescape.wiki/w/Money_making_guide/Farming_snapdragon ; https://oldschool.runescape.wiki/w/Money_making_guide/Farming_ranarr_weed ; https://oldschool.runescape.wiki/w/Money_making_guide/Farming_herbs
- Herbs feed Herblore: prayer potion = ranarr potion (unf) + snape grass, Herblore 38, gives 87.5 XP. Ranarr is grown at Farming 32 or dropped by monsters; "despite being one of the lowest-level herbs, ranarr is one of the most valuable herbs in the game, due to its role in making prayer potions" — https://oldschool.runescape.wiki/w/Prayer_potion ; https://oldschool.runescape.wiki/w/Ranarr_weed
- RS3 Player-owned farm: wiki snippet says Manor Farm was released 3 September 2018; it was announced at RuneFest 2016 as #7 of the "12 Most Wanted Updates of 2017", and Jagex called it "one of the most sought after requests from the community Build-a-Backlog poll". Livestock: rabbits, chickens, chinchompas, sheep, spiders, zygomites, cows, yaks, dragons — https://runescape.wiki/w/Player-owned_farm ; https://runescape.wiki/w/Update:Player_Owned_Farm ; UNCERTAIN date: the 2018 date may instead be the Anachronia expansion "The Ranch Out of Time: Farming and Herblore 120" (https://runescape.wiki/w/Update:The_Ranch_Out_of_Time:_Farming_and_Herblore_120); my recollection is that Manor Farm launched in 2017, unverified.
- Jagex later published a "Player Owned Farm - Changes Blog" (post-launch rework) — https://secure.runescape.com/m=news/player-owned-farm---changes-blog (contents not captured)

### Albion Online raw findings (batch 1)
- Personal island cost/upgrade table (silver), as given by third-party guides (one table, sources: albiononlinegrind.com island-upgrade-cost table and altarofgaming guide; the wiki's Player Island page is cited by the same search but could not be opened):
  | Island tier | Multipurpose plots | Small multipurpose plots | Upgrade cost | Cumulative |
  | 1 | 1 | 0 | 1,000,000 | 1,000,000 |
  | 2 | 3 | 2 | 2,500,000 | 3,500,000 |
  | 3 | 6 | 2 | 4,000,000 | 7,500,000 |
  | 4 | 9 | 2 | 5,000,000 | 12,500,000 |
  | 5 | 12 | 2 | 6,000,000 | 18,500,000 |
  | 6 | 16 | 2 | 8,000,000 | 26,500,000 |
  First-time (never owned an island) discount: T1 20,000; T2 500,000; T3 1,125,000; T4 1,312,500; T5 1,500,000; T6 2,000,000 silver. Islands upgrade up to level 6 for silver; each upgrade takes 2 minutes; each upgrade adds build areas — https://albiononlinegrind.com/table/island-upgrade-cost ; https://altarofgaming.com/albion-online-personal-guild-island-guide/ ; https://wiki.albiononline.com/wiki/Player_Island (UNVERIFIED which page gave which number; plot model changed over time - older islands had dedicated farm vs building plots)
- Crops: all plants take 22 hours to grow regardless of Premium, yielding a random 3-6 crops per seed (6-12 for Premium characters) — https://wiki.albiononline.com/wiki/Crops (via search snippet; also echoed by https://wiki.albiononline.com/wiki/Island_Farms)
- Seed return: e.g. cabbage base seed yield 80% unwatered, +40% if watered = 120%; corn 91% unwatered; T8 crops 93.33% base. Watering costs Focus; each 100% of seed yield always returns a seed and the part above 100% is a chance of a second seed. A forum rule of thumb: "if you water half, [all crops] will give enough seed yield for a complete replant" — https://wiki.albiononline.com/wiki/Crops ; https://forum.albiononline.com/index.php/Thread/80221-Farming-Focus-Spreadsheet/ ; https://forum.albiononline.com/index.php/Thread/67187-Farming-and-Focus-Points/ . CONFLICT/UNCLEAR: one snippet says "watering carrots gives a 200% seed yield bonus" - not reconcilable with the +40% figure; treat per-crop numbers as uncertain.
- Player complaints that yields were cut over time: carrots once produced 12-18 units with focus, later 6-12 ("Please stop reducing farm crop production") — https://forum.albiononline.com/index.php/Thread/152391-Please-stop-reducing-farm-crop-production/ ; also "albion's farm system is getting quite pay 2 win" — https://forum.albiononline.com/index.php/Thread/48681-albion-s-farm-system-is-getting-quite-pay-2-win/ ; "A detailed study about farms and how they are unbalanced" — https://forum.albiononline.com/index.php/Thread/191098-A-detailed-study-about-farms-and-how-they-are-unbalanced/ ; "Seed yield is messed up badly. The seed yield percentages are fiction." — https://forum.albiononline.com/index.php/Thread/190225-Seed-yield-is-messed-up-badly-The-seed-yield-percentages-are-fiction/
- Bots: a forum report of fishing bots generating "300m silver in few days" across blue zones, pulling resource prices down — https://forum.albiononline.com/index.php/Thread/216264-300m-silver-in-Few-days-bots/
- Island farm plot types: Farms (crops), Herb Gardens (herbs), Pastures and Kennels (animals). Royal cities give local production bonuses for particular crops/herbs (e.g. one city boosts certain herbs, Brecilien all crops) — https://wiki.albiononline.com/wiki/Island_Farms
- Access rights are role-based: Owner (personal island not transferable), Co-Owner (anything but change permissions; can claim buildings), Builder (build/demolish on building and farm hard-points), Visitor (visit and use public items). Rights are granted to a named player, a guild or an alliance on the dock's Access Rights board; buildings carry their own separate rights — https://wiki.albiononline.com/wiki/Managing_Access_Rights ; https://forum.albiononline.com/index.php/Thread/112456-Island-Access-Rights/

### Albion Online raw findings (batch 2)
- Food: eating gives a buff lasting 30 minutes; only ONE food buff can be active at a time; type and tier of the food decide the buff; e.g. salad = crafting speed/quality, pie = gathering yield, max load and CC resistance. Food is cooked at the Cook crafting station — https://wiki.albiononline.com/wiki/Food ; https://wiki.albiononline.com/wiki/Cooking
- Player complaint: "Food Buff SHOULD Pause On Logout" (the 30-min food timer runs on while logged out) — https://forum.albiononline.com/index.php/Thread/187190-Food-Buff-SHOULD-Pause-On-Logout/
- Premium and islands: a character needs at least 7 days of Premium before it can BUY a personal island (per a forum guide); Premium is not needed to keep it. Premium doubles the crop harvest (3-6 per seed -> 6-12); grow time is 22 h either way; without Premium "even with very high spec, your profit will be very low" — https://forum.albiononline.com/index.php/Thread/207212-A-Semi-Comprehensive-Personal-Island-guide-for-New-Players/ ; https://forum.albiononline.com/index.php/Thread/125262-Question-about-premium-and-personal-island/ ; https://albiononlinegrind.com/table/island-farming-bonuses (the 7-day rule is from a player guide - UNVERIFIED against official text)
- Potions: since the 2016 consumables overhaul, herbs grown in the island Herb Garden supply potion recipes "instead of waiting on rare drops"; potions are crafted at the Alchemist's Lab or bought on the Marketplace/traded; ingredients are mainly farmed herbs (Arcane Agaric, Crenellated Burdock, Brightleaf Comfrey, Dragon Teasel, Elusive Foxglove ...) plus some animal products; 14 potions at the time — https://steamcommunity.com/games/761890/announcements/detail/3985189839340751275 ; https://www.mmobomb.com/news/albion-online-overhauls-consumables-potions ; https://www.tentonhammer.com/news/consumables-and-potions-overhauled-in-albion-online (dated Oct 2016 per https://albionpvp.wordpress.com/2016/10/26/albion-online-overhauls-consumables-and-potions/)
- Focus cost of watering falls with farming specialization (snippet: "reduced from 1000 per crop to 125") — https://wiki.albiononline.com/wiki/Crops (via search; exact numbers UNVERIFIED)
- Design intent of seed yield: higher-tier seeds cost more but return more seeds, so that "every crop costs the exact same amount to plant (2000 silver at NPC shop prices)" — per search snippet attributed to the Albion wiki/forum results (https://wiki.albiononline.com/wiki/Island_Farms ; https://forum.albiononline.com/index.php/Thread/191098-A-detailed-study-about-farms-and-how-they-are-unbalanced/) - UNVERIFIED which page; treat as a player analysis claim
- A developer "Dev Talk: Islands and Farming Rework" exists — https://forum.albiononline.com/index.php/Thread/186576-Dev-Talk-Islands-and-Farming-Rework/ (details below if found)

### Albion Online raw findings (batch 3)
- "Dev Talk: Islands and Farming Rework" (Game Director Robin Henkys + environment artist Johannes Geier) for the Wild Blood update of 16 October 2023: every personal island visually reworked into a biome; players may own MULTIPLE personal islands, up to one per city ("a trans-continental farming empire"); new farming bonuses - one crop grows best on each island, one animal yields more when butchered on each island, each animal has a favourite food that makes it grow faster - "designed to encourage trade" and planned growing/transport/processing schedules — https://albiononline.com/news/dev-talk-islands-farming ; https://forum.albiononline.com/index.php/Thread/186576-Dev-Talk-Islands-and-Farming-Rework/ ; https://gamespace.com/all-articles/news/albion-online-tackled-islands-farming-rework/

### WoW raw findings (batch 1)
- Sunsong Ranch plots: first 4 plots after the opening quest chain with Farmer Yoon; +4 at Honored Tillers (8), +4 at Revered (12), +4 at Exalted (16 total) - each unlock via quests at that rep tier — https://www.warcrafttavern.com/mop/guides/sunsong-ranch-farm-guide/ ; https://warcraft.wiki.gg/wiki/Sunsong_Ranch ; https://wowpedia.fandom.com/wiki/Sunsong_Ranch
- Seeds bought from Merchant Greenfield in Halfhill Market; more seed types unlock with Tillers reputation; planted crops are harvested "the next day" (the starter quest's part II) — same sources
- Crop "problem" states, each fixed by a small verb: Parched (water with the rusty watering can), Infested (Grandpa's bug sprayer), Wiggling (kill the Voracious Virmen that spawns), Alluring (kill the Swooping Plainshawk that dives), Smothered (pull the weed), Runty (lift it upright), Tangled (right-click and run away to pull the vines), Wild (a mini "vehicle" fight: build 50 stacks of Dominance with Flex, interrupt with Gnaw) — https://wowpedia.fandom.com/wiki/Sunsong_Ranch ; https://www.warcrafttavern.com/mop/guides/sunsong-ranch-farm-guide/
- Sentiment sources found (not yet read): "What's the worst crop problem?" (MMO-Champion) https://www.mmo-champion.com/threads/1333166-What-s-the-worst-crop-problem ; blog "Farming in World of Warcraft. Argh" (31 Oct 2012) https://amakiowlaf.wordpress.com/2012/10/31/farming-in-world-of-warcraft-argh/ ; Blizzard forum "Smothered plants in Pandaria" https://us.forums.blizzard.com/en/wow/t/smothered-plants-in-pandaria/2058550
- Ironpaw Tokens = MoP cooking currency; most cooking quests reward them, and surplus ingredients are traded in through the repeatable quest "Replenishing the Pantry"; redeemed at the Stockmaster in Halfhill Market — https://warcraft.wiki.gg/wiki/Ironpaw_Token ; https://wowpedia.fandom.com/wiki/Ironpaw_Token
- MoP cooking "Ways": at 600 skill each Way's top recipe makes food giving +300 of its stat; it needs an ingredient bought only with Ironpaw Tokens; 5 servings per craft; feasts/banquets also exist — https://www.icy-veins.com/mists-of-pandaria-classic/cooking-profession-and-leveling-guide ; https://www.warcrafttavern.com/mop/guides/cooking-leveling-guide-1-600/

### WoW raw findings (batch 2)
- Sunsong Ranch is PHASED: only you are seen there - other players fade out as they enter from your view; each player sees a version based on their own progress and farming choices, only their own plants. So party members cannot see or tend each other's farms (search summary of wiki pages; the "no help" conclusion is the summarizer's reading of the phasing text) — https://warcraft.wiki.gg/wiki/Sunsong_Ranch ; https://wowpedia.fandom.com/wiki/Sunsong_Ranch ; https://wowwiki-archive.fandom.com/wiki/Sunsong_Ranch . Bug thread on phasing persisting on relog: https://us.forums.blizzard.com/en/wow/t/sunsong-ranch-plots-still-phased-when-logging-inout-on-the-farm/1057477
- Ironpaw token loop: buy an empty container from Merchant Cheng (beside the seed vendor); filling it takes 20 of one accepted meat or 100 of one accepted vegetable to make a Bundle of Groceries -> 1 Ironpaw Token from Nam Ironpaw ("Replenishing the Pantry", repeatable). 1 token buys a sack of 5 of a named fish/meat or 25 of a named vegetable — https://wowpedia.fandom.com/wiki/Replenishing_the_Pantry ; https://warcraft.wiki.gg/wiki/Replenishing_the_Pantry ; Engadget "Gold Capped: Cheap Ironpaw Tokens" (26 Dec 2012) https://www.engadget.com/2012-12-26-gold-capped-cheap-ironpaw-tokens.html
- Non-food seeds (the farm feeds other professions, not just cooking): Enigma Seeds (1 g) grow random Pandaria herbs; Magebulb 1-3 Spirit Dust + 0-1 Mysterious Essence; Snakeroot 1 Trillium Ore + 0-2 Ghost Iron Ore; Songbell -> Motes of Harmony. Higher-rep 30 g "bags" plant 4 plots: Songbell bag 40 Motes; Snakeroot bag 40 Trillium + 0-80 Ghost Iron; Enigma bag 40 random herbs; Magebulb bag 40-120 Spirit Dust + 0-40 Mysterious Essence. A full 16-plot farm gives 16 Motes of Harmony/day ~= 1.5 Spirit of Harmony/day (8 every 5 days) — https://warcraft.wiki.gg/wiki/Sunsong_Ranch ; https://www.warcrafttavern.com/mop/guides/spirit-of-harmony-mote-of-harmony-farming-guide/ (note: 40 Motes from a bag of 4 plots implies the bag sizes don't match 1-mote-per-plot; numbers as given by the snippets - UNVERIFIED)
- Master Plow (Tillers Exalted) tills four plots in a row at once (a convenience reward for the most committed) — https://warcraft.wiki.gg/wiki/Sunsong_Ranch
- WoD Garrison Herb Garden: Level 1 grows Draenic Seeds into herbs each day; 6 random Draenor herb nodes to gather per day without needing Herbalism; up to 7 work orders (each costs 5 Draenic Seeds, gives random herbs, occasionally Apexis Crystal). Level 2: followers with the Herbalism trait can work there, more herbs, 14 work orders. Level 3: a unique Draenor fruit tree that grants food buffs, 21 work orders — https://www.icy-veins.com/wow/garrison-herb-garden-guide ; https://www.mmo-champion.com/content/1478-Warlords-of-Draenor-Garrisons-Herb-Garden ; https://www.wowhead.com/spell=165077/garrison-herb-garden

### Black Desert Online raw findings (batch 1)
- Fence types and seed slots: Shabby Fence 1 slot; Small Fence 4 slots (3 Contribution Points to install); Plain Fence 7 slots (6 CP); Strong Fence 10 slots (10 CP); Old Moon Fence 10 slots (needs Farming Master 1). Fences "cost" Contribution Points (a non-silver, refundable rent-like resource) while installed — https://grumpygreen.cricket/bdo-fence/ ; https://grumpygreen.cricket/farming/ ; https://blackdesertonline.fandom.com/wiki/Fence (slot/CP figures per search snippet; UNVERIFIED in full page)
- Growth: all crops take 20-22 hours depending on temperature, and crops only grow while your character is LOGGED IN — https://grumpygreen.cricket/farming/ (snippet); official guide: https://www.naeu.playblackdesert.com/en-US/Wiki?wikiNo=33 (not opened) - verify below
- Crops take 1 slot each mostly; some (e.g. grapes) 2 slots. Artisan farmers can plant Magical Seeds: 5x the slots, 5x the crop (2 magical strawberry seeds fill a 10-slot fence) — https://grumpygreen.cricket/farming/
- Care: crops periodically need pruning, pest removal and water; blights/pruning needs appear randomly at a fixed chance; when a crop has a blight its growth "slows way down" until fixed (press R to prune/kill pests); mushrooms need more pruning, crops more insect removal — https://grumpygreen.cricket/farming/ ; http://dulfy.net/2016/03/06/black-desert-gardening-and-farming-guide/
- Seed quality ladder via BREEDING (instead of harvesting a mature crop): Withered < Regular < High-Quality (green) < Special (blue); breed regular-grown crops for HQ seeds, HQ-grown for Special; Artisan 1+ can rarely get Magical seeds from breeding Special crops. Breeding yields 1-3 seeds with a chance of a higher-quality seed. A Special crop counts as 5 regular crops and an HQ crop as 3 in recipes ("instead of 5 potatoes for a beer, a single special potato") — http://dulfy.net/2016/03/06/black-desert-gardening-and-farming-guide/ ; https://grumpygreen.cricket/farming/ ; https://caphrasarchives.com/quest/526606
- Worker-managed fences: assign one worker per fence from the Garden UI; the worker prunes, kills pests and gathers weeds into storage, but will NOT fertilize, water, harvest or breed; needs workers + CP for their lodging — https://grumpygreen.cricket/farming/ ; https://www.invenglobal.com/articles/1833/afk-farming-let-your-workers-handle-the-job-and-get-extra-benefits ; https://forums.playblackdesert.com/index.php?%2Ftopic%2F3088-sending-workers-to-fences%2F=
- Food buffs (BDO): many meals last 90 minutes (e.g. Balenos Meal: Movement +2, Fishing/Gathering speed +2; Calpheon Meal: All DR +1, Max HP +100, HP regen +5). A second food can stack only in some cases after a 30-minute wait; Cron Meals are "high-quality food" that simpler foods won't replace. Alchemy elixirs/draughts: e.g. Verdure Draught 20% Life XP, -1 s cooking time, +200 LT for 15 min; a draught overrides any active elixirs — https://grumpygreen.cricket/bdo-cooking-guide-eminent/ ; https://altarofgaming.com/black-desert-online-cooking-guide/ ; https://grumpygreen.cricket/life-mastery-buffs/

### Cross-cutting / sentiment raw findings (batch 1)
- Sunsong Ranch (patch 5.0.4, 2012) was "the first area in the game to use phasing technology to give players a personal, semi-customizable space"; the concept "would subsequently evolve into the garrison of Warlords of Draenor and ultimately player housing"; players choose what to plant every day and which NPC to spend time with — https://warcraft.wiki.gg/wiki/Sunsong_Ranch ; https://wowpedia.fandom.com/wiki/Sunsong_Ranch . A 2025 retrospective calls it popular, "a bit of peace between raids and battlegrounds" — https://popupdungeon.com/revisiting-the-farm-at-halfhill-still-a-cozy-hub/ (low-authority blog). Comparison thread: "Sunsong Ranch Vs Garrison, Which is better?" — https://www.mmo-champion.com/threads/1813768-Sunsong-Ranch-Vs-Garrison-Which-is-better ; patch 5.2 changes article: https://www.tentonhammer.com/articles/buying-the-farm-sunsong-ranch-changes-in-patch-5-2
- BDO: crops only grow while the account is logged in (confirmed by a second search); you need land almost anywhere in the world + a fence + seeds; fences are rented with Contribution Points; water and fertilizer apply to the whole fence for faster growth and more yield; fertilizer types differ only in how long they last, not in speed; higher Farming level = faster interaction. Players have asked officially to "Change farming plants to offline growth" — https://grumpygreen.cricket/farming/ ; https://www.blackdesertfoundry.com/farming/ ; https://littleveruca.wordpress.com/2020/04/07/crops1/ ; https://www.naeu.playblackdesert.com/en-US/Forum/ForumTopic/Detail?_topicNo=36465
- Albion: "nearly every item in the game is crafted by players, in player-constructed buildings, from resources gathered by players" - weapons, armour, potions, food and buildings (exceptions such as some reward mounts) — https://store.steampowered.com/app/761890/Albion_Online/ ; https://apps.apple.com/us/app/albion-online/id1202788573 ; https://en.wikipedia.org/wiki/Albion_Online
- reddit.com is not reachable by the search tool in this session (domain refused), so Reddit sentiment could not be sampled directly; official forums, MMO-Champion and Steam threads are used instead.
