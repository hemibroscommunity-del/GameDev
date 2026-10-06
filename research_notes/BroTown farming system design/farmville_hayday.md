# FarmVille (1, 2, Country Escape, 3) and Hay Day: timed-crop farming design

Research date: 2026-10-06. Web research only. Every number carries a source URL; numbers from FarmVille 1 (Facebook, shut down 2020-12-31) and FarmVille 2 (Facebook, shut down 2023-12-31) are HISTORICAL. Status work in progress (checkpointed as research proceeds).

## Status as of 2026 (which games are live, which numbers are historical)

(in progress)

## Core loop and the cost of each action

(in progress)

## Crop timers and profit-per-hour balancing

(in progress)

## Withering

(in progress)

## Progression: mastery, unlocks, expansion, storage

(in progress)

## Social layer

(in progress)

## Retention and monetization

(in progress)

---
## CHECKPOINT LOG (raw findings, appended as research proceeds; consolidated into the sections above at the end)

### Method caveat (important for the report writer)
- WebFetch was blocked by this sandbox's egress proxy for every host tried: hayday.fandom.com, farmville.fandom.com, en.wikipedia.org, farmville-crops.blogspot.com, www.gamezebo.com, gamelytic.com, www.farmgamehub.com, www.gamedeveloper.com, supercell.com (EGRESS_BLOCKED), www.theverge.com (unable to fetch). The proxy README says not to route around such blocks, so NO full pages were read. Every number below comes from WebSearch result summaries of the cited URLs. They are consistent with my background knowledge where noted, but a designer should spot-check key numbers on the cited pages before relying on them.

### Checkpoint 1: status + first crop numbers
- FarmVille (1) launched on Facebook 2009-06-19 and shut down 2020-12-31 (Adobe Flash end-of-life); in-app purchases ended 2020-11-17. HISTORICAL. — https://www.gadgetmatch.com/farmville-shutting-down-facebook-zynga/ ; https://comicbook.com/gaming/news/farmville-ending-closing-shutting-down-facebook-zynga/ ; https://delistedgames.com/after-11-years-the-original-farmville-shuts-down-on-december-31st/
- At FV1's closure, FarmVille 2: Country Escape and FarmVille 2: Tropic Escape (mobile) were unaffected and FarmVille 3 was upcoming. — https://www.altpress.com/facebook-farmville-shutting-down/ ; https://comicbook.com/gaming/news/farmville-ending-closing-shutting-down-facebook-zynga/
- Hay Day: wheat 2 min (level 1), corn 5 min (level 2), carrots 10 min (level 9). — https://hayday.fandom.com/wiki/Wheat ; https://hayday.fandom.com/wiki/Corn ; https://hayday.fandom.com/wiki/Carrot (via search summary)
- FV1 cranberry: level 10, 10 h, seed 55 coins, sells 98 coins. — https://farmville.fandom.com/wiki/Cranberry (via search summary)
- FarmVille 2 (Facebook) per a Gamelytic list (via search summary; NOT verified, corn's 2 min looks odd): tomato 10 coins / lvl 1 / 1 min / 1 XP; wheat 10 coins / lvl 2 / 4 h / 2 XP; strawberry 18 coins / lvl 5 / 24 h / 13 XP; sunflower 25 coins / lvl 10 / 24 h / 14 XP; corn 20 coins / lvl 8 / 2 min / 2 XP. — https://gamelytic.com/farmville-2-crop-and-tree-harvest-list/
- FarmVille: Tropic Escape: pineapple 45 s / 1 XP; rice 1 min / 1 XP; cotton 1.5 h / 12 XP; bell pepper 4 h / 31 XP. — https://farmville-tropic-escape.fandom.com/wiki/Crops,_Trees_and_Animals (via search summary)

### Checkpoint 2: FarmVille 1 loop numbers, withering, neighbors (all HISTORICAL; via search summaries)
- Plowing a plot cost 15 coins and gave 1 XP. — https://farmville.fandom.com/wiki/Plow_tool ; https://adamnash.blog/2009/08/23/the-personal-economics-of-farmville-part-2/ ; https://fvaddicts.yolasite.com/tips-and-tricks.php
- XP exploit players used: plant soybeans (15 coins, 2 XP a plot), delete, re-plow; 20 plots -> 60 XP for 600 coins. (Shows plow+plant XP was farmable: XP was awarded on actions, not outcomes.) — https://adamnash.blog/2009/08/23/the-personal-economics-of-farmville-part-2/ ; https://steelowl.wordpress.com/2009/07/08/farmville-power-leveling/
- FV1 crops (seed cost -> sale value, grow time, XP on planting):
  - Strawberries: 10 -> 35 coins, 4 h, 1 XP — https://farmville.fandom.com/wiki/Strawberry
  - Raspberries: 20 -> 46 coins, 2 h, 0 XP — https://farmville.fandom.com/wiki/Raspberry
  - Straspberry (hybrid of the two): sells 91, 2 h, 2 XP — https://farmville.fandom.com/wiki/Straspberry
  - Blueberries: 50 -> 91 coins, 4 h, 1 XP; ~6.25-6.5 coins/h by guide math; wiki: 1.42 coins/h per square — https://farmville.fandom.com/wiki/Blueberry ; https://adamnash.blog/2009/08/22/the-personal-economics-of-farmville/ ; https://farmville.fandom.com/wiki/Guide:Best_land_use
  - Cranberries: 55 -> 98 coins, 10 h, level 10 — https://farmville.fandom.com/wiki/Cranberry
  - Wheat: 3 days (FV1); Eggplant: 2 days (FV1) — https://farmville.fandom.com/wiki/Eggplant ; https://farmville-crops.blogspot.com/ (search summary; FV1 wheat/eggplant coins not captured)
  - Pumpkins: 8 h (a search summary mixed FV1/FV2 values: 15 seed -> 20 sale; treat coins as UNVERIFIED) — https://farmville.fandom.com/wiki/Pumpkin
- Blueberries were the guides' "waking hours" crop: ready at 4 h, withered by 8 h, so you plan logins in the 4-8 h window. — https://www.yahoo.com/news/2009-09-21-farmville-cheats-and-tips-top-10-cash-crops.html ; https://adamnash.blog/2009/08/22/the-personal-economics-of-farmville/
- WITHERING (FV1), CONFLICTING statements:
  - "Crops wither after the same amount of time it takes to grow them: a 2 h crop withers 4 h after planting" (i.e. ripe window = grow time). — https://www.avemariasongs.org/games/FarmVille/FV-102.htm ; https://www.supercheats.com/guides/farmville/basic-farming
  - "Crops wither when 2.5x the grow time has elapsed (an 8 h crop withers at 20 h)"; and "random plots wither over the next half of the growth time" after a ripe window equal to grow time. — https://farmville.fandom.com/wiki/Unwither ; https://farmvillesuccessdotcom.wordpress.com/seeds-and-crops/withering-crops-in-farmville/
  - Reconciliation (my reading): safe window = 1x grow time after ripening (2x from planting); plots then wither progressively, all gone by ~2.5x from planting. Flag as uncertain.
- Unwither Ring: a limited Valentine's Day 2010 item, 250 Farm Cash, permanently stops all crop withering on the farm. — https://farmville.fandom.com/wiki/Unwither_Ring ; contemporaneous critique: "FarmVille Unwither Ring: The worst thing to happen to virtual farming?" (2010-02-14) https://www.yahoo.com/news/2010-02-14-farmville-unwither-ring-the-worst-thing-to-happen-to-virtual-fa.html
- NEIGHBORS (FV1), two eras CONFLICTING:
  - Fertilize 5 plots a day on each of up to 50 farms (resets at game midnight), 10 coins + 1 XP per plot (50 coins + 5 XP a farm; 2,500 coins + 250 XP for 50 farms). — https://farmville.fandom.com/wiki/Crop_Fertilizer ; https://farmville.fandom.com/wiki/Neighbor
  - Later: first 20 neighbors helped give 20 coins + 5 XP, the rest 5 coins + 1 XP. — https://farmville.fandom.com/wiki/Neighbor (search summary)

### Checkpoint 3: FarmVille 2 water/fertilizer; status of every title in 2026 (via search summaries)
- FV2 (Facebook, launched 2012): crops need WATER to grow (seeds and trees); you click a planted crop showing a water-drop icon to water it. Water also feeds crafted recipes (Lemon Water, Lemonade). Players called water "one of the biggest obstacles". — https://zyngasupport.helpshift.com/hc/en/10-farmville-2/faq/117-how-do-i-water-crops/ ; https://ca.finance.yahoo.com/news/2012-09-10-farmville-2-tips-second-well.html ; forum gripe "a little peeved with the undying need for water": http://gamersunite.coolchaser.com/topics/98474-farmville-2-love-the-game-so-far-but-a-little-peeved-with-the-undying-need-for-water
- FV2 Well: an early land expansion gives a free Well yielding 10 water every 4 hours; extra Wells cost 14,000 coins in the General Store, need construction materials ASKED FROM FRIENDS, and 4 friends must "staff" the well before it works. Water packs could be requested from friends; helping a friend's farm 5 times gave 1 extra water. Sprinklers also existed. — https://ca.finance.yahoo.com/news/2012-09-10-farmville-2-tips-second-well.html ; https://farmville2tips.blogspot.com/2012/09/ways-to-get-water.html ; https://zyngasupport.helpshift.com/hc/en/10-farmville-2/faq/495-how-do-i-use-the-sprinklers/?l=en
- FV2 fertilizer: fertilized crops give extra XP at harvest; Super Fertilizer = 2x bushels, 2x XP, 3x mastery. FV2 kept withering, sold "Unwither" consumables that make withered crops harvest-ready again; free "20 Unwither" reward links still circulate in Aug 2026. — https://farmville2free.com/ ; https://www.juegossocial.com/en/farmville-2-free-get-20-unwither-aug-9-2026/
- FV1 fertilizer: a fertilized plot looks bigger and sparkles and gives +1 XP at harvest (on top of any mastery "premium crop" bonus); a non-premium unfertilized plot gives no XP at harvest (FV1 gave XP on planting, not harvest). — https://farmville.fandom.com/wiki/Mastery_bonus ; https://farmville.fandom.com/wiki/Crop_Fertilizer
- STATUS 2026 (corrects the brief's assumption):
  - FarmVille 1 (Facebook): CLOSED 2020-12-31. — https://www.thegamer.com/farmville-officially-shutting-down-today/
  - FarmVille 2: Country Escape (mobile, 2014): LIVE; Google Play listing shows an update on 2026-09-18; plays offline, no Facebook needed, Farm Co-Ops. — https://play.google.com/store/apps/details?id=com.zynga.FarmVille2CountryEscape ; https://www.zynga.com/games/farmville-2-country-escape/
  - FarmVille 2 (Facebook web): Zynga's FarmVille 2 Help Center was still being updated in 2026 (a "Game Issues Recent Updates" page), and Aug-2026 free-gift links exist -> appears STILL LIVE; I found NO shutdown announcement. UNCERTAIN - verify. — https://zyngasupport.helpshift.com/hc/en/10-farmville-2/faq/16117-game-issues-recent-updates/
  - FarmVille 3: global launch 2021-11-04 on iOS/Android (and M1 Macs), 150+ animal breeds at launch. — https://www.businesswire.com/news/home/20211006005037/en/Zynga-Opens-Pre-Registration-for-FarmVille-3-Ahead-of-November-4-2021-Launch
  - Hay Day (Supercell): LIVE; an update on 2026-08-17 ("faster Truck Orders, easier helping, more Farm Pass rewards"; help-needed indicators); Boat Destinations added 2026; 14th anniversary in 2026 (launched 2012). — https://supercell.com/en/news/announcement/hayday/ ; https://play.google.com/store/apps/details?id=com.supercell.hayday&hl=en_US ; https://vortexgaming.io/en/postdetail/981373
- Country Escape: premium currency is KEYS (speed-ups, some items/buildings); Co-op unlocked at level 10, free, sign near the Barn; members chat, exchange crops/goods, run co-op events. — https://148apps.com/news/farmville-2-country-escape-tips-newbie-farmer ; https://farmvillecountryescape.fandom.com/wiki/Co-Op ; https://www.withoutthesarcasm.com/posts/co-ops-work-farmville-2-country-escape/

### Checkpoint 4: Hay Day crops, shop, storage, expansion, design intent (via search summaries; Hay Day is LIVE so numbers may have been retuned)
- Hay Day field crops (level unlocked / grow time / XP per harvest / max roadside price PER UNIT):
  - Wheat: lvl 1 / 2 min — https://hayday.fandom.com/wiki/Wheat
  - Corn: lvl 2 / 5 min — https://hayday.fandom.com/wiki/Corn
  - Soybeans: lvl 5 / 20 min / 2 XP / max 10.8 — https://hayday.fandom.com/wiki/Crops_List ; https://www.supercheats.com/hay-day/walkthrough/list-of-resources
  - Sugarcane: lvl 7 / 30 min / 3 XP / max 14.4 — same
  - Carrots: lvl 9 / 10 min — https://hayday.fandom.com/wiki/Carrot
  - Indigo: lvl 13 / 2 h / 5 XP / max 25.2 — https://hayday.fandom.com/wiki/Crops_List
  - Pumpkin: lvl 15 / 3 h / 6 XP / max 32.4 — https://hayday.fandom.com/wiki/Pumpkin
  - Cotton: lvl 18 / 2 h 30 min / 6 XP — https://hayday.fandom.com/wiki/Crops_List ; http://haydayencyclopedia.weebly.com/field-crops.html
  - Chili pepper: lvl 25 / 4 h / 7 XP — https://hayday.fandom.com/wiki/Chili_Pepper
  - Tomato: lvl 30 / 6 h / 8 XP — https://hayday.fandom.com/wiki/Tomato
  - Strawberry: lvl 34 / 8 h / 10 XP — https://hayday.fandom.com/wiki/Crops_List
  - Potato: lvl 35 / 3 h 40 min / 7 XP — https://hayday.fandom.com/wiki/Potato
  - The rule: a crop is planted with a seed of its own kind and a harvest yields 2 (net +1), so seed is the crop itself, no seed shop. — https://hayday.fandom.com/wiki/Crops_List (search summary)
  - Max roadside price = 3.6x the item's default value (rounded down); e.g. soybeans 10.8 = 3 x 3.6, pumpkin 32.4 = 9 x 3.6 (my arithmetic). Price can be set from 1 coin to the max. — https://hayday.fandom.com/wiki/Roadside_Shop
- Roadside shop: sell crops, animal goods, products (not lures/nets/traps) and supplies to OTHER PLAYERS; advertise one box in the "Daily Dirt" newspaper every 5 min (or skip the wait for 1 diamond), visible to any player. — https://hayday.fandom.com/wiki/Roadside_Shop ; https://hayday.fandom.com/wiki/Daily_Dirt ; https://www.supercheats.com/hay-day/walkthrough/roadside-shop
- Storage: Barn (goods) upgrades with bolts + planks + duct tape, Silo (crops) with nails + screws + wood panels. Barn: +25 capacity per upgrade from 50 to 1,000, +50 above 1,000, max 25,000; each upgrade needs N of each of the three items, N rising by 1 per upgrade (50->75 needs 1 each, 75->100 needs 2 each...). Silo: +25 from 50 to 1,000, +50 from 1,000 to 3,000. Upgrade items drop randomly from harvests and can be traded, so storage growth is partly a SOCIAL trade good. — https://hayday.fandom.com/wiki/Barn ; https://hayday.fandom.com/wiki/Storage_Buildings
- Land expansion: needs land deeds + mallets + marker stakes (each "worth" 403 coins and 12 diamonds when bought through the game's expansion supplies; stakes seen in roadside shops for 1-403 coins). — https://hayday.fandom.com/wiki/Expansion ; https://hayday.fandom.com/wiki/Marker_Stake ; https://www.supercheats.com/hay-day/walkthrough/land-expansions
- DESIGN INTENT, no punishment: Supercell product lead Timur Haussila: the game does not punish players for not logging in; crops don't dry out and animals don't starve. "We don't teach our players to play Hay Day. There's no forced tutorial. No missions or quests ... no 'right way to play' the game or punishment for playing the game in a different way. We wanted Hay Day to be extremely logical." Hay Day = Supercell's take on FarmVille, adding refining/production chains and touch controls; first farming game on the App Store. — https://gamesbeat.com/after-a-decade-supercells-1st-hit-hay-day-keeps-humming-along/ ; https://www.blog.udonis.co/mobile-marketing/mobile-games/hay-day-monetization (quote attribution via search summary; verify which article carries it)
- Ten-year retrospective (660M downloads at the time): the team started with a SINGLE-PLAYER design and learned over the years that "farming could be a very social experience too" - one of their major lessons. Speakers: Stephan Demirdjian (game lead 9 yrs), Camilla Avellar (designer 7 yrs), Sari Latvala (artist 9 yrs). — https://mobilegamer.biz/what-supercells-hay-day-team-learned-from-ten-years-of-updates/ ; https://www.pocketgamer.biz/supercell-looking-back-10-years-of-hay-day-part-one/
- Boat orders: requests for crops/products split into crates; up to 3 help requests per boat (1 public + 2 neighborhood-only); fill and send for instant rewards (vouchers, choice crates, puzzle pieces) and Nautical Miles on a Boat Voyage track that refreshes every 3 days; helping fill another's boat counts toward co-op achievement tasks. Help-request indicators point to the nearest request on a visited farm (2026). — https://support.supercell.com/hay-day/en/articles/boat-orders-3.html ; https://hayday.fandom.com/wiki/Update

### Checkpoint 5: appointment dynamics, critiques, Zynga talks, FV1 expansion (via search summaries)
- "Appointment dynamic" (Seth Priebatsch, SCVNGR, TED 2010 "The game layer on top of the world"): to succeed, players must do something at a predefined time (and often place); FarmVille's version is returning to harvest crops before they wither. — https://www.gnuband.org/2010/08/24/tidbits_from_the_game_layer_on_top_of_the_world_presentation_by_seth_priebatsch_at_ted/ ; https://techcrunch.com/2010/08/25/scvngr-game-mechanics/ ; https://stratsynergy.wordpress.com/2010/09/29/farmvilles-golden-game-mechanic/
  - NOTE an error in circulation: one summary says FarmVille needs you to return "every 12-24 hours to water the crops" - FV1 had NO watering step (watering is FV2). Do not repeat it.
- Ian Bogost's Cow Clicker (2010), a satire of FarmVille-style games made in three days: click a cow once every six hours for a point. Bogost named four concerns about Facebook games: "enframing, compulsion, optionalism, and destroyed time" - they destroy not only the time spent playing but the time spent AWAY (worrying about the timer). Bogost himself became compulsively attached to his satire. — https://bogost.com/writing/blog/cow_clicker_1/ ; https://www.gamedeveloper.com/design/interview-i-cow-clicker-i-yields-ruminations-on-social-gaming-s-tense-battle-lines ; https://necsus-ejms.org/cows-clicks-ciphers-and-satire/
- Mark Skaggs (FarmVille/CityVille creator), GDC 2011 "The Lessons I Learned from Making FarmVille and CityVille": FarmVille was built in five weeks under a "light, fast and right" philosophy (ship the minimum fast) and reached 1 million DAU within five days. — https://www.gdcvault.com/play/1016592/The-Lessons-I-Learned-from ; https://allthingsd.com/20110301/zyngas-farmville-and-cityville-developer-spills-the-beans-on-what-makes-games-great/ ; https://gamesbeat.com/zynga-history/3/
- FV1 land expansions (bought in order; coins + a NEIGHBOR COUNT gate): Homestead 14x14 = 8 neighbors + 10,000 coins; Family Farm 16x16 = 10 neighbors + 25,000 coins; Big Family Farm 18x18 = 13 neighbors + 50,000 coins. — https://www.unigamesity.com/farmville-land-expansion-list-and-requirements/ ; https://www.gamezebo.com/walkthroughs/farmville-walkthrough/

### Checkpoint 6: FV1 full expansion ladder, FV2 expansions, scale, Skaggs advice (via search summaries)
- FV1 Home Farm expansions (in order; coins OR Farm Cash, plus a neighbor-count gate):
  | # | Name | Size | Neighbors | Coins | Farm Cash |
  |---|---|---|---|---|---|
  | 1 | Homestead | 14x14 | 8 | 10,000 | 20 |
  | 2 | Family Farm | 16x16 | 9 (Unigamesity says 10: CONFLICT) | 25,000 | 20 |
  | 3 | Big Family Farm | 18x18 | 13 | 50,000 | 20 |
  | 4 | Plantation | 20x20 | 16 | 75,000 | 20 |
  | 5 | Big Ole Plantation | 22x22 | 20 | 250,000 | 10 (as summarized; looks odd, verify) |
  | 6 | Mighty Plantation | 24x24 | 30 | 500,000 | 12 (as summarized; verify) |
  — https://farmville.fandom.com/wiki/Expand_Farm/Home_Farm ; https://farmville.fandom.com/wiki/22x22 ; https://www.unigamesity.com/farmville-land-expansion-list-and-requirements/
  - The Farm Cash column as summarized is probably a per-neighbor substitute price or garbled; UNVERIFIED. The firm part: coins + a neighbor count, bought strictly in order.
  - Later (per a JustAnswer thread) Zynga re-offered coin-only expansions; details unverified. — https://www.justanswer.com/computer/69uvt-farmville-zynga-just-offered-players-expand-farms.html
- FV2 expansions (official Zynga help center): most need a level + coins + inventory items, often items gathered FROM FRIENDS: Expansion 3 (Feed Mill) = level 2 + 175 coins; Expansion 4 (Family Well) = level 2, sell 8 eggs, harvest 16 wheat, 1,000 coins; Expansion 6 (West Meadow) = level 5, craft 2 Apple Scones, 2 Garden Clippers from friends, 20,000 coins. Expansion = a small quest that teaches the next system. — https://zyngasupport.helpshift.com/hc/en/10-farmville-2/faq/483-what-are-the-expansion-requirements-1688024717/ ; https://sports.yahoo.com/2012-09-10-farmville-2-land-expansions-guide.html
- FV1 scale (HISTORICAL): peak 83.76M monthly active users (March 2010), 34.5M DAU peak; ~54M MAU eight months after a Feb 2010 peak; ~60M at end of 2010; 7th on Facebook by May 2012; 110th by DAU on 2016-04-30. Facebook cutting off the "viral" channels (feed posts, notifications) is cited as a decline cause; FarmVille lost Facebook's #1 app slot in Nov 2010. — https://fourweekmba.com/what-happened-to-farmville/ ; https://www.forbes.com/sites/oliverchiang/2010/11/20/farmville-no-longer-facebooks-top-application/ ; https://www.cnn.com/2014/07/31/tech/gaming-gadgets/farmville-fifth-anniversary/index.html
- Skaggs (GDC 2011) advice: "learn from success" (copy proven patterns like the gifting interstitial); "make it fun - you can't make up for a boring game with volume ... if it's not [fun], it doesn't matter that you have a million seeds". — https://allthingsd.com/20110301/zyngas-farmville-and-cityville-developer-spills-the-beans-on-what-makes-games-great/

### Checkpoint 7: Soren Johnson critique, FV1 fuel (energy), more withering, Country Escape loop (via search summaries)
- Soren Johnson, "Fear and Loathing in Farmville" (Designer Notes, 2010-03-19, written after GDC 2010): with FarmVille "the premise is to make money", and making the game WORSE can generate more revenue; FarmVille "makes overt use of known psychological techniques to influence and control behavior" tied directly to revenue; its formula makes it easy to progress until you can no longer spend your coins well without spending real money. Frames the debate as art vs slot machine. — https://www.designer-notes.com/?p=195 ; https://waxy.org/2010/03/soren_johnsons/
- FV1 vehicles = the energy system: tractor (plow), seeder (plant), harvester (harvest) each use 1 fuel per plot (a 4x4-upgraded vehicle up to 4 per use); all vehicles share ONE tank of 150 fuel that refills over time; bought fuel refills (Farm Cash only, from 1 fuel for 3 Cash to 75 fuel for 50 Cash) do not regenerate. So fuel is a time-gated speed-up of the click work, not a gate on farming itself (you could always click plot by plot). — https://farmville.fandom.com/wiki/Fuel ; https://farmville.fandom.com/wiki/Vehicle ; https://farmville.fandom.com/wiki/Tractor
- FV1 withering, a third phrasing: "All crops wither in 2.5x their growing time: a 4 h crop begins to wither 8 h after planting, plots wither randomly for up to half the growth time more, all by 10 h." Withered crops: plow and replant, buy Unwithers, or WAIT 14 DAYS after which visiting NEIGHBORS may unwither them. — https://farmville.fandom.com/wiki/Wither ; https://farmvillesuccessdotcom.wordpress.com/seeds-and-crops/withering-crops-in-farmville/ (this matches the reconciliation in checkpoint 2: safe window = grow time again; then a staggered loss over 0.5x grow time)
- FarmVille 3: farmhands unlock with level, are upgraded, and do farm tasks (help expand faster). — https://gamingonphone.com/guides/farmville-3-beginners-guide-and-tips/ ; https://zyngasupport.helpshift.com/hc/en/91-farmville-3/section/1074-getting-started/
- Country Escape: wheat harvests in 1 minute and costs 1 coin per plot; wheat and corn are needed at every level; guides: short crops while actively playing, long crops before you close the game; fast crops can be LEFT IN THE FIELD as storage (implies no withering there - verify). KEYS skip any wait (crops, crafting, animals) and bypass level gates on land/animals; Speed Grow (crops/trees) and Helping Hands (workshop) are speed-up items. — https://farmvillefreak.com/farmville-2-country-escape-guide/ ; https://www.withoutthesarcasm.com/posts/tips-guide-farmville-2-country-escape/ ; https://www.148apps.com/news/farmville-2-country-escape-tips-newbie-farmer/

### Checkpoint 8: co-op jobs, Hay Day money, the spam backlash, Hay Day tree revival (via search summaries)
- FV1 CO-OP FARMING JOBS (2010): a team grows a set quantity of one crop against the clock; three medal windows; Bronze/Silver give XP + coins, Gold also gives every team member an exclusive item. Examples (crops / gold / silver / bronze time): Town Greening 1,450 Morning Glory / 1 d / 1 d 12 h / 2 d 6 h; Bakery Delivery 1,450 Wheat / 1 d 7 h / 2 d / 3 d 6 h; Baby Bunny Rescue 1,350 Carrots / 23 h / 1 d 11 h / 2 d 10 h; Pumpkin Pie O'Plenty 1,400 Pumpkins / 16 h / 1 d / 1 d 13 h. — https://farmville.fandom.com/wiki/Co-Op_farming ; https://farmville.fandom.com/wiki/Gold_Medal ; https://www.supercheats.com/guides/farmville/co-op-farming-jobs ; https://www.unigamesity.com/co-op-farming-guide-for-farmville-farmers/
- HAY DAY MONEY: >$1.2B lifetime revenue (Udonis estimate); diamonds are the ONLY way to skip waits, scarce outside the store; waits run from 2 min (crops) to 20+ h (building production machines); six diamond packs from $1.99 ("Pile") to $99.99 ("Trunk"); ARPDAU > $0.40 in Jan 2021 (Udonis; third-party estimate, not Supercell). — https://www.blog.udonis.co/mobile-marketing/mobile-games/hay-day-monetization ; https://medium.com/udonis/hay-day-monetization-how-this-farming-game-got-to-1-15b-in-revenue-c3b6cd486c78
- THE SPAM BACKLASH (HISTORICAL lesson): FarmVille's growth rode Facebook's viral channels - games could post to friends' feeds ("Sarah is turning straw into gold!") and send requests that hit NON-players. Facebook changed its messaging policy in March 2010 (MAU reportedly -26%) and closed the channel later in 2010. Separately, after the "ScamVille" backlash over lead-gen offer ads, Zynga pulled those ads (reportedly ~1/3 of revenue). Players and non-players widely resented the notifications ("eleven years of annoying notifications"). — https://productmint.com/what-happened-to-farmville/ ; https://startupspells.com/p/farmville-viral-loop-zynga-facebook-exploit ; http://www.andyrathbone.com/2010/03/08/how-to-block-farmville-spam-on-facebook/ ; https://www.joe.co.uk/gaming/farmville-is-shutting-down-at-the-end-of-2020-after-eleven-years-of-annoying-notifications-251211 ; https://slate.com/technology/2018/03/farmville-helped-sow-the-seeds-of-the-cambridge-analytica-scandal.html (secondary sources; the -26% and 1/3 figures are UNVERIFIED against primary data)
- HAY DAY TREES (a social dependency done gently): after its 3rd harvest a fruit tree/bush WILTS and must be revived by ANOTHER player (tap the help sign to ask; any visitor can revive); the reviver earns the same XP as picking one fruit; a revived plant gives a final harvest (4 apples for an apple tree) then dies; a saw (trees) or axe (bushes) clears the dead plant. — https://hayday.fandom.com/wiki/Trees_and_Bushes ; https://hayday.fandom.com/wiki/Apple_Tree ; https://www.playbite.com/q/how-do-you-revive-fruit-trees-in-hay-day
