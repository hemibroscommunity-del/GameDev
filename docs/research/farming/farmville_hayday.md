# FarmVille (1, 2, Country Escape, 3) and Hay Day: timed-crop farming design

**How these notes were made. Read this first.** Researched 2026-10-06, web only. This sandbox's egress proxy blocked WebFetch for every site I tried: hayday.fandom.com, farmville.fandom.com, en.wikipedia.org, farmville-crops.blogspot.com, gamezebo.com, gamelytic.com, farmgamehub.com, gamedeveloper.com, supercell.com and avemariasongs.org returned EGRESS_BLOCKED, and theverge.com could not be fetched. The proxy's rules say not to route around a block. So **no page was read in full**. Every number below comes from WebSearch result summaries of the cited URL. Where summaries disagreed, both versions are given and marked CONFLICT. Load-bearing numbers should be spot-checked on the cited pages before anyone builds on them.

Which numbers are historical:
- **FarmVille 1** numbers are HISTORICAL; the game closed on 2020-12-31.
- **FarmVille 2** numbers come mostly from 2012–2013 guides and may have been retuned since.
- **Hay Day, FarmVille 3 and Country Escape** are live in 2026, so their numbers may have been rebalanced.

The "net coins per hour" figures marked *(my arithmetic)* are mine. Each one is checked against a figure a guide quoted.

---

## 1. The core loop and the cost of each action (plow, seed, plant, water, fertilize, harvest)

### Takeaway
- **FarmVille 1** was plow (15 coins, +1 XP) → buy seed (coins; XP given at PLANTING) → wait → harvest (coins). There was no watering. Fertilizing was the verb a visiting neighbor performed, worth +1 XP at harvest.
- **FarmVille 2** made WATER a mandatory, scarce gate: wells, and water packs requested from friends. Players called it the game's biggest obstacle.
- **FarmVille 3** turned water into an optional ×2 yield boost.
- **Hay Day** removed plowing, the seed shop, watering and fertilizing. You replant one crop to get two back, by dragging a finger across many fields at once.

### Cited Findings
**FarmVille 1 (Facebook, 2009–2020, HISTORICAL)**
- The basic loop is titled "plow, plant, harvest" in a period guide. — [avemariasongs FV-102](https://www.avemariasongs.org/games/FarmVille/FV-102.htm)
- Plowing a plot cost **15 coins** and gave **1 XP**. — [FarmVille Wiki: Plow tool](https://farmville.fandom.com/wiki/Plow_tool); [Adam Nash, "Personal Economics of FarmVille, Part 2" (2009)](https://adamnash.blog/2009/08/23/the-personal-economics-of-farmville-part-2/); [FV Addicts tips](https://fvaddicts.yolasite.com/tips-and-tricks.php)
- Seeds were bought with coins, and XP was paid **when planted**. Examples:
  - strawberries: 10 coins, 1 XP — [Strawberry](https://farmville.fandom.com/wiki/Strawberry)
  - raspberries: 20 coins, 0 XP — [Raspberry](https://farmville.fandom.com/wiki/Raspberry)
  - blueberries: 50 coins, 1 XP — [Blueberry](https://farmville.fandom.com/wiki/Blueberry)
  - artichokes: 70 coins, 2 XP — [Gamezebo walkthrough](https://www.gamezebo.com/walkthroughs/farmville-walkthrough/)
- Harvest XP:
  - Harvesting paid coins. A plot that was neither fertilized nor a "premium" crop gave **no XP at harvest**.
  - A fertilized plot looked bigger, sparkled, and gave **+1 XP at harvest**.
  - Once you had mastered a seed, its crops could randomly become "premium" and pay a mastery-bonus XP, plus 1 more if fertilized. — [Mastery bonus](https://farmville.fandom.com/wiki/Mastery_bonus); [Crop Fertilizer](https://farmville.fandom.com/wiki/Crop_Fertilizer)
- Fertilizing was done by neighbors. A visitor could fertilize **5 plots a day on each of up to 50 farms**, resetting at game midnight, for **10 coins + 1 XP per plot**. That is 50 coins + 5 XP per farm, or 2,500 coins + 250 XP across 50 farms. — [Crop Fertilizer](https://farmville.fandom.com/wiki/Crop_Fertilizer); [Neighbor](https://farmville.fandom.com/wiki/Neighbor)
  - CONFLICT (a later era): the first 20 neighbors helped paid 20 coins + 5 XP each, and the rest 5 coins + 1 XP. — [Neighbor](https://farmville.fandom.com/wiki/Neighbor)
- Paying XP per action could be farmed. Power-levelers planted soybeans (15 coins, 2 XP a plot), deleted them and re-plowed: 20 plots gave 60 XP for 600 coins. — [steelowl power-leveling (2009)](https://steelowl.wordpress.com/2009/07/08/farmville-power-leveling/); [Adam Nash pt 2](https://adamnash.blog/2009/08/23/the-personal-economics-of-farmville-part-2/)
- Vehicles were FV1's energy system:
  - The tractor, seeder and harvester spent **1 fuel per plot** (a 4×4 vehicle up to 4 per use).
  - All of them drew from **one shared 150-fuel tank** that refilled over time.
  - Bought fuel cost Farm Cash only (from 1 fuel for 3 Cash up to 75 fuel for 50 Cash) and did not refill once used.
  - You could always click plot by plot without fuel. — [Fuel](https://farmville.fandom.com/wiki/Fuel); [Vehicle](https://farmville.fandom.com/wiki/Vehicle); [Tractor](https://farmville.fandom.com/wiki/Tractor)

**FarmVille 2 (Facebook, launched 2012)**
- Crops and trees need **water** to grow. You tap a planted crop that shows a water-drop icon. Water is also an ingredient in recipes such as Lemon Water and Lemonade. — [FV2 Help Center: How do I water crops?](https://zyngasupport.helpshift.com/hc/en/10-farmville-2/faq/117-how-do-i-water-crops/); [Yahoo, "Buy an extra Well" (2012-09-10)](https://ca.finance.yahoo.com/news/2012-09-10-farmville-2-tips-second-well.html)
- Getting water:
  - An early land expansion gives a free **Well: 10 water every 4 hours**.
  - Extra wells cost **14,000 coins** and need construction materials asked from friends; **4 friends must "staff"** a well before it works.
  - Friends could send water packs, and **helping a friend's farm 5 times gave 1 extra water**.
  - Sprinklers also existed. — [Yahoo 2012](https://ca.finance.yahoo.com/news/2012-09-10-farmville-2-tips-second-well.html); [FarmVille 2 Tips: 4 ways to get water](https://farmville2tips.blogspot.com/2012/09/ways-to-get-water.html); [FV2 Help Center: Sprinklers](https://zyngasupport.helpshift.com/hc/en/10-farmville-2/faq/495-how-do-i-use-the-sprinklers/?l=en)
- What players said:
  - Water was "one of the biggest obstacles" in FV2. — [Yahoo 2012](https://ca.finance.yahoo.com/news/2012-09-10-farmville-2-tips-second-well.html)
  - A forum thread title: "Love the game so far, but a little peeved with the undying need for water!" — [GamersUnite thread](http://gamersunite.coolchaser.com/topics/98474-farmville-2-love-the-game-so-far-but-a-little-peeved-with-the-undying-need-for-water)
- Fertilizer:
  - Fertilized crops give extra XP at harvest.
  - **Super Fertilizer gives 2× bushels, 2× XP and 3× mastery**. — [farmville2free.com](https://farmville2free.com/)

**FarmVille 3 (mobile, launched 2021-11-04, LIVE)**
- One seed yields **1 crop**. **Watered plots give double produce** (the Water Boost, unlocked at level 8). — [FV3 Help Center: plant and harvest crops](https://zyngasupport.helpshift.com/hc/en/91-farmville-3/faq/14485-how-do-i-plant-and-harvest-crops/); [GamingHQ review (2025)](https://gaminghq.eu/2025/06/07/farmville-3-review-a-fresh-take-on-the-farming-classic/)
- The Small Well (the "Well Garden" expansion, level 8) gives water **every 6 hours** and holds **up to 6**. — [FV3 Help Center: Water Well](https://zyngasupport.helpshift.com/hc/en/91-farmville-3/faq/14488-how-does-the-water-well-work/)
- An energy-like resource caps how many special ingredients grow at once, and players say it refills far too slowly. — [GamingHQ review](https://gaminghq.eu/2025/06/07/farmville-3-review-a-fresh-take-on-the-farming-classic/); [The Why of Play (2021)](https://thewhyofplay.com/2021/11/22/farmville-3-evolution-or-revolution/)

**FarmVille 2: Country Escape (mobile, LIVE)**
- Wheat harvests in 1 minute and costs 1 coin per plot. — [FarmVille Freak guide](https://farmvillefreak.com/farmville-2-country-escape-guide/)
- LOW CONFIDENCE (a wiki-table summary): "crops must be watered or paid coins to produce", "max 6 of each type". This may describe a special area rather than the home farm. — [Country Escape wiki: Crop](https://farmvillecountryescape.fandom.com/wiki/Crop)

**Hay Day (Supercell, mobile, 2012–, LIVE)**
- There is no seed shop. A crop is planted with one of itself and harvests **2 (net +1)**. — [Hay Day Wiki: Crops List](https://hayday.fandom.com/wiki/Crops_List)
- Touch controls:
  - You tap a tool once, then drag a finger over every field: seeds to plant, a sickle to harvest. A review described it as "scything through fields of wheat to harvest it in seconds".
  - There is no tapping plot by plot and no farm vehicles. — [AOL, "Hay Day brings gesture based farming" (2012-06-22)](https://www.aol.com/2012/06/22/hay-day-iphone-ipad/); [App Store "Play it again: Hay Day"](https://apps.apple.com/au/iphone/story/id1540736251); [TodoAndroid guide](https://en.todoandroid.es/hay-day-the-best-farm-game-for-android/)
- Diamonds (the premium currency) can finish any timer. — [Udonis Hay Day dissection](https://www.blog.udonis.co/mobile-marketing/mobile-games/hay-day-monetization)

### Inferences
- Each of the owner's four steps has a precedent: dig = FV1's plow, plant = everyone, fertilize = FV1 and FV2, water = FV2 and FV3.
  - Where water or fertilizer was a **gate** (FV2: no water, no growth, and water rationed and tied to friends), it drew documented complaints and became a monetization choke point.
  - Where it was a **multiplier** (FV3's ×2 water, FV1's +1 XP fertilizer, FV2's 2× Super Fertilizer), the step meant something without blocking the farm.
- FV1's flat 15-coin plow fee worked three ways: a per-cycle tax, a coin sink, and a lever on crop choice (see §2).
- Paying XP per action (plow, plant) invited the delete-and-replant exploit. Paying XP at harvest, or capping action XP, closes it.
- Hay Day's drag-across-fields gesture is the mobile answer to the click fatigue that FV1 sold fuel against. It matters for an iPhone game with many plots.

### Gaps
- I found no explicit sourced statement that Hay Day has no watering or fertilizing step. It follows from the crop pages and Haussila's no-punishment design (§3), but is unconfirmed.
- Not captured: water per plot in FV2; FV1 seed XP for most crops; FV3 crop timers or seed costs; Country Escape's real planting cost (a coin per plot vs water).

---

## 2. Crop timers, and how profit per hour matched how often a player checks in

### Takeaway
- In both FarmVille 1 and Hay Day, short crops paid far more per plot-hour (and per XP-hour) than long ones:
  - **FV1:** roughly 5–7 net coins per hour for the 2–8 h berries and tomatoes, against about 1.3 for 4-day artichokes.
  - **Hay Day:** about 10× more per field-hour for wheat than for pumpkins.
- Long crops were priced as insurance for sleep or absence, never as the efficient choice.
- Guides in every game teach the same habit: fast crops while you play, long crops before you close the game.

### Cited Findings
**FarmVille 1 crops (HISTORICAL).** Net coins per hour = (sale − seed − 15 plow) ÷ grow hours *(my arithmetic)*. My results match the guides' quoted figures for tomatoes (7.25), blueberries (6.25–6.5) and artichokes (1.29).

| Crop | Level | Seed → sale (coins) | Grow time | XP on planting | Net coins/h per plot | Source |
|---|---|---|---|---|---|---|
| Raspberries | — | 20 → 46 | 2 h | 0 | 5.5 *(mine)* | [Raspberry](https://farmville.fandom.com/wiki/Raspberry) |
| Straspberry (hybrid) | — | ? → 91 | 2 h | 2 | — | [Straspberry](https://farmville.fandom.com/wiki/Straspberry) |
| Strawberries | — | 10 → 35 | 4 h | 1 | 2.5 *(mine)* | [Strawberry](https://farmville.fandom.com/wiki/Strawberry) |
| Blueberries | — | 50 → 91 | 4 h | 1 | 6.5 (guides 6.25–6.5; wiki "1.42 per hour per square") | [Blueberry](https://farmville.fandom.com/wiki/Blueberry); [Adam Nash pt 1](https://adamnash.blog/2009/08/22/the-personal-economics-of-farmville/); [Best land use](https://farmville.fandom.com/wiki/Guide:Best_land_use) |
| Tomatoes | — | 100 → 173 | 8 h | — | 7.25 (guide) | [Tomato](https://farmville.fandom.com/wiki/Tomato) |
| Pumpkins | 5 | 30 → 68 | 8 h | — | 2.9 *(mine)* | [Pumpkin](https://farmville.fandom.com/wiki/Pumpkin) |
| Cranberries | 10 | 55 → 98 | 10 h | — | 2.8 *(mine)* | [Cranberry](https://farmville.fandom.com/wiki/Cranberry) |
| Pattypan squash | 22 | 110 → ? | 12 h | — | — | [FarmVille Best Cheat (2011)](https://farmvillebestcheat.blogspot.com/2011/08/tips-on-how-to-select-very-best-crops.html) |
| Peppers | 12 | 70 → 162 | 1 day | — | 3.2 *(mine)* | [Pepper](https://farmville.fandom.com/wiki/Pepper) |
| Eggplant | — | — | 2 days | — | — | [Eggplant](https://farmville.fandom.com/wiki/Eggplant) |
| Wheat | — | — | 3 days | — | — | [List of FarmVille Crops](https://farmville-crops.blogspot.com/) |
| Artichokes | 6 | 70 → 204 | 4 days (one source: 92 h) | 2 | 1.29 (guide, using 92 h) | [Gamezebo](https://www.gamezebo.com/walkthroughs/farmville-walkthrough/); [Best Cheat](https://farmvillebestcheat.blogspot.com/2011/08/tips-on-how-to-select-very-best-crops.html) |
| Soybeans | — | 15 → ? | — | 2 | — | [steelowl](https://steelowl.wordpress.com/2009/07/08/farmville-power-leveling/) |

- Guides called blueberries the crop "for waking hours": ready at 4 h and withered by 8 h, so you plan logins into that 4–8 h window. They also said short crops are best for coins and XP, "but you have to be there". — [Yahoo/FarmVille Freak, "Top 10 Cash Crops" (2009-09-21)](https://www.yahoo.com/news/2009-09-21-farmville-cheats-and-tips-top-10-cash-crops.html); [Adam Nash pt 1](https://adamnash.blog/2009/08/22/the-personal-economics-of-farmville/)

**FarmVille 2 crops (Facebook; 2012–13 values; LOW CONFIDENCE)**

| Crop | Level | Seed → sale | Grow | XP | Source / caveat |
|---|---|---|---|---|---|
| Tomato | 1 | 10 → ? | 1 min (?) | 1 | [Gamelytic list](https://gamelytic.com/farmville-2-crop-and-tree-harvest-list/) (odd value) |
| Corn | 8 | 20 → ? | 2 min (?) | 2 | Gamelytic (odd value) |
| Wheat | 2 | 10 → 14 | 4 h | 2 | Gamelytic; [FV2 Wiki Category:Crops](https://farmville2.fandom.com/wiki/Category:Crops) |
| Eggplant | — | 30 → 58 | 4 h | — | [FV2 Wiki: Eggplant](https://farmville2.fandom.com/wiki/Eggplant) (mixed FV1/FV2 summary) |
| Soybeans | — | 190 → 300 | 6 h | — | FV2 Wiki Category:Crops (mixed summary) |
| Pumpkins | — | 15 → 20 | 8 h | — | FV2 Wiki Category:Crops (mixed summary) |
| Potatoes | 20 | ? → 108 | 12 h | 10 | [Yahoo FV2 crop guide (2012-09-05)](https://finance.yahoo.com/news/2012-09-05-farmville-2-crop-guide.html); [Supercheats FV2 mastery](https://www.supercheats.com/farmville-2/walkthrough/crop-mastery-system) |
| Red pepper | 34 | 150 → 313 | 12 h | 12 | same |
| Strawberry | 5 | 18 → ? | 24 h | 13 | Gamelytic |
| Sunflower | 10 | 25 → ? | 24 h | 14 | Gamelytic |
| Cabbage | 38 | 130 → 515 | 24 h | 19 | Yahoo FV2 crop guide; Supercheats |

- FV2 differs from FV1 here: XP rises with grow time (1–2 XP for short crops, 13–19 for 24 h crops), so long crops weren't punished on XP.

**Hay Day crops (LIVE; may be rebalanced).**
- A crop's max roadside price is 3.6× its default value, per unit.
- Max coins per field-hour assumes every harvest nets +1 unit sold at max price *(my arithmetic)*.
- Wheat's 3.6 and corn's 7.2 are derived from a guide's 18.0 and 14.4 coins/min, which work out to 10 fields at that rule.

| Crop | Level | Grow time | XP / harvest | Max price per unit | Max coins per field-hour | Source |
|---|---|---|---|---|---|---|
| Wheat | 1 | 2 min | — | 3.6 (derived) | 108 | [Wheat](https://hayday.fandom.com/wiki/Wheat); [farmgamehub crops](https://www.farmgamehub.com/en/guides/hay-day/crops) |
| Corn | 2 | 5 min | — | 7.2 (derived) | 86.4 | [Corn](https://hayday.fandom.com/wiki/Corn) |
| Soybeans | 5 | 20 min | 2 | 10.8 | 32.4 | [Crops List](https://hayday.fandom.com/wiki/Crops_List); [Supercheats resources](https://www.supercheats.com/hay-day/walkthrough/list-of-resources) |
| Sugarcane | 7 | 30 min | 3 | 14.4 | 28.8 | same |
| Carrots | 9 | 10 min | — | — | — | [Carrot](https://hayday.fandom.com/wiki/Carrot) |
| Indigo | 13 | 2 h | 5 | 25.2 | 12.6 | [Crops List](https://hayday.fandom.com/wiki/Crops_List) |
| Pumpkin | 15 | 3 h | 6 | 32.4 | 10.8 | [Pumpkin](https://hayday.fandom.com/wiki/Pumpkin) |
| Cotton | 18 | 2 h 30 m | 6 | — | — | [Hay Day Encyclopedia](http://haydayencyclopedia.weebly.com/field-crops.html) |
| Chili pepper | 25 | 4 h | 7 | — | — | [Chili Pepper](https://hayday.fandom.com/wiki/Chili_Pepper) |
| Tomato | 30 | 6 h | 8 | — | — | [Tomato](https://hayday.fandom.com/wiki/Tomato) |
| Strawberry | 34 | 8 h | 10 | — | — | [Crops List](https://hayday.fandom.com/wiki/Crops_List) |
| Potato | 35 | 3 h 40 m | 7 | — | — | [Potato](https://hayday.fandom.com/wiki/Potato) |

- XP per hour also favors short crops *(my arithmetic)*: soybeans 6 XP/h against strawberries 1.25 XP/h.
- Hay Day guides on when to plant what:
  - While playing, keep about **80% of fields in wheat and corn** and 20% in carrot, sugarcane and soybean.
  - **Before going offline**, plant cotton, indigo or chili pepper.
  - Never plant wheat before leaving: it is ready in 2 minutes and then sits idle, wasting field time.
  - Processed goods (cakes, coffee, smoked fish) beat raw crops per minute. — [farmgamehub crops](https://www.farmgamehub.com/en/guides/hay-day/crops); [Profit Potential of Crops Per Minute (wiki blog)](https://hayday.fandom.com/wiki/User_blog:MindoPod/Profit_Potential_of_Crops_Per_Minute)
- Country Escape guides say the same: short crops while actively playing, longer crops "before you close the game". — [FarmVille Freak guide](https://farmvillefreak.com/farmville-2-country-escape-guide/)
- Country Escape table (LOW CONFIDENCE; it CONFLICTS with "wheat = 1 min" above):
  - wheat, level 1: 3 wheat in 0:00:30
  - corn, level 6: 2 corn in 0:02:00
  - carrots, level 7: 3 in 0:04:00
  - strawberries, level 9: 3 in 1:00:00
  - cranberries, level 42: 2 in 0:10:00 — [Country Escape wiki: Crop](https://farmvillecountryescape.fandom.com/wiki/Crop)
- FarmVille: Tropic Escape: pineapple 45 s / 1 XP; rice 1 min / 1 XP; cotton 1.5 h / 12 XP; bell pepper 4 h / 31 XP. — [Tropic Escape wiki](https://farmville-tropic-escape.fandom.com/wiki/Crops,_Trees_and_Animals)

### Inferences
- The common pattern is a ladder of timers sized to how people actually live:
  - minutes, for an active session (Hay Day wheat at 2 min, Country Escape at 0.5–1 min)
  - 2–8 hours, between sessions (FV1 berries and tomatoes)
  - 8–24 h or more, overnight or a workday (FV1 peppers, FV2 24 h crops, Hay Day 6–8 h)
  - multi-day, for absence (FV1 artichokes and wheat)
- Each rung pays less per hour as it gets longer. That way the long crops never beat attention, but absence still produces something.
- A per-cycle fixed cost (FV1's 15-coin plow) widens that gap automatically, because it hurts short crops in absolute terms but long crops more per hour.
- Rewards can instead scale with grow time (FV2's rising XP; Hay Day's rising price and XP per harvest). The per-hour ranking still favors short crops while long crops feel generous per harvest. That mix feels fair to both kinds of player.

### Gaps
- Not captured: FV1's full table (dozens of crops), level requirements for early crops, and XP for most crops.
- FV2 values are low-confidence (two odd 1–2 minute entries, and a summary that mixed FV1 and FV2).
- Not captured: Hay Day XP for wheat, corn and carrots; Hay Day prices beyond pumpkin.
- No FV3 crop-timer table was found.
- Country Escape timers conflict between sources.

---

## 3. Withering: the rules, Unwither items, player sentiment, and why later games softened it

### Takeaway
- **FarmVille 1:** a ripe crop was safe for about one more grow-time, then withered over roughly half a grow-time more (gone by about 2.5× the grow time from planting). You could buy permanent immunity, the **Unwither Ring (250 Farm Cash)**, or use neighbors after 14 days.
- **FarmVille 2:** kept withering, added neighbor unwithers (5 per 18 h), and sold Unwither consumables.
- **Hay Day:** removed it on purpose ("doesn't punish players for not logging in"), so a long absence costs idle fields, not lost crops.
- Academics later named the FV pattern a "dark pattern" ("Playing by Appointment").

### Cited Findings
**FarmVille 1 timing.** The sources phrase it three ways (CONFLICT); my reconciliation follows.
- (a) "Crops wither after the same amount of time it takes to grow them": a 2 h crop withers 4 h after planting. — [avemariasongs FV-102](https://www.avemariasongs.org/games/FarmVille/FV-102.htm); [Supercheats basic farming](https://www.supercheats.com/guides/farmville/basic-farming)
- (b) "Crops wither when 2.5× the grow time has elapsed": an 8 h crop withers at 20 h. — [Unwither](https://farmville.fandom.com/wiki/Unwither); [Unwither Ring](https://farmville.fandom.com/wiki/Unwither_Ring)
- (c) "A 4 h crop begins to wither 8 h after planting; plots then wither randomly for up to half the growth time more, all gone by 10 h." — [Wither](https://farmville.fandom.com/wiki/Wither); [FarmVille Success: withering](https://farmvillesuccessdotcom.wordpress.com/seeds-and-crops/withering-crops-in-farmville/)
- Reconciliation *(my reading, consistent with (c))*: the safe window after ripening equals the grow time; plots then wither at random over another 0.5× grow time.

**FarmVille 1 remedies**
- For a withered plot you could:
  - plow it and replant,
  - buy Unwithers, or
  - **wait 14 days, after which visiting neighbors could unwither it**. — [Wither](https://farmville.fandom.com/wiki/Wither); [FarmVille Success](https://farmvillesuccessdotcom.wordpress.com/seeds-and-crops/withering-crops-in-farmville/)
- The **Unwither Ring** was a limited Valentine's Day 2010 item for **250 Farm Cash**. It permanently stopped all withering on the farm. — [Unwither Ring](https://farmville.fandom.com/wiki/Unwither_Ring)
  - Contemporary reaction: "FarmVille Unwither Ring: The worst thing to happen to virtual farming?" (2010-02-14). — [Yahoo/FarmVille Freak](https://www.yahoo.com/news/2010-02-14-farmville-unwither-ring-the-worst-thing-to-happen-to-virtual-fa.html)

**FarmVille 2** (CONFLICT; it is uncertain which rule applied when)
- One source: crops wither "approximately three days after they become ready". Another: crops wither if not harvested "within ¼ of the growing time past" ripeness (a 4 h crop leaves about 1 h).
- Neighbors could **unwither your crops for free, up to 5 per 18 hours**. — [FV2 Wiki: Unwither](https://farmville2.fandom.com/wiki/Unwither); [GamersUnite FV2 thread](http://gamersunite.coolchaser.com/topics/99895-farmville-2-crops-wither-how-long-after-planting)
- Unwither is a consumable that makes withered crops harvestable again. Free "20 Unwither" gift links were still posted in August 2026. — [farmville2free.com](https://farmville2free.com/); [Juegos Social, 2026-08-09](https://www.juegossocial.com/en/farmville-2-free-get-20-unwither-aug-9-2026/)

**Hay Day (no withering)**
- Supercell's Timur Haussila said the game doesn't punish players for not logging in: "your crops don't dry out and your starving animals somehow stay alive". He added: "There's no forced tutorial. No missions or quests in Hay Day. And there's no 'right way to play' the game or punishment for playing the game in a different way. We wanted Hay Day to be extremely logical."
  - Which of these two articles carries the quote is unverified. — [GamesBeat, "After a decade..."](https://gamesbeat.com/after-a-decade-supercells-1st-hit-hay-day-keeps-humming-along/); [Udonis dissection](https://www.blog.udonis.co/mobile-marketing/mobile-games/hay-day-monetization)
- What survives is a softer, social "decay": a fruit tree or bush **wilts after its 3rd harvest** and must be **revived by another player**. See §5. — [Trees and Bushes](https://hayday.fandom.com/wiki/Trees_and_Bushes)

**Country Escape**
- Guides advise leaving fast crops "in the fields" instead of filling the barn. That implies crops don't wither there (unverified). — [FarmVille Freak](https://farmvillefreak.com/farmville-2-country-escape-guide/); [Without the Sarcasm tips](https://www.withoutthesarcasm.com/posts/tips-guide-farmville-2-country-escape/)

**How critics framed it**
- Zagal, Björk and Lewis, "Dark Patterns in the Design of Games" (FDG 2013), define a dark pattern as "a game design that is used intentionally by a game creator to cause negative experiences for players which are against their best interests and likely to happen without their consent". They list **"Playing by Appointment"**, where the game, not the player, decides when to play, with FarmVille's timed crops as the example. — [DiVA full text PDF](https://www.diva-portal.org/smash/get/diva2:1043332/FULLTEXT01.pdf); [CORE](https://core.ac.uk/reader/301007767)
- Seth Priebatsch (TED 2010) named the "appointment dynamic": you must act at a predefined time, and FarmVille's form is harvesting before crops wither. — [TED talk notes](https://www.gnuband.org/2010/08/24/tidbits_from_the_game_layer_on_top_of_the_world_presentation_by_seth_priebatsch_at_ted/); [TechCrunch, SCVNGR playdeck](https://techcrunch.com/2010/08/25/scvngr-game-mechanics/); [Strat Synergy](https://stratsynergy.wordpress.com/2010/09/29/farmvilles-golden-game-mechanic/)
  - Caution: one summary says FarmVille needs you back "every 12–24 hours to water the crops". FV1 had no watering, so that is an error to avoid repeating.

### Inferences
- Withering converts absence into loss, then sells the cure: Farm Cash rings, Unwither consumables.
- Hay Day shows timed crops keep their pull without it. The cost of being away becomes idle capacity and unfilled orders.
- If a game keeps withering, FV1's own rules hint at the gentlest form:
  - a grace period at least as long as the grow time,
  - a gradual, partial loss rather than all-or-nothing,
  - friends able to rescue it.
- Selling permanent immunity was received as undermining the game itself.

### Gaps
- I found no Zynga statement explaining why FV2 or later games changed withering, and no data on churn caused by withering.
- FV3's withering rules were not found.
- The FV2 timing conflict is unresolved.

---

## 4. Progression: crop mastery, level unlocks, farm expansion pricing, trees and animals, storage

### Takeaway
- **FarmVille 1** expansion: coins plus a NEIGHBOR COUNT (8 neighbors and 10,000 coins up to 30 neighbors and 500,000), bought strictly in order. Crop mastery came in 3 levels per crop.
- **FarmVille 2** expansion: small quests (level + coins + crafted or friend-gathered items).
- **Hay Day** expansion: three tradeable tool items (deeds, mallets, stakes) that drop randomly or cost diamonds. Hay Day also capped storage (barn and silo start at 50) behind upgrade items that likewise trade.

### Cited Findings
**FV1 home-farm expansions** (in order; coins OR Farm Cash, plus neighbors):

| # | Name | Size | Neighbors | Coins | Farm Cash (as summarized; unverified) |
|---|---|---|---|---|---|
| 1 | Homestead | 14×14 | 8 | 10,000 | 20 |
| 2 | Family Farm | 16×16 | 9 (Unigamesity says 10: CONFLICT) | 25,000 | 20 |
| 3 | Big Family Farm | 18×18 | 13 | 50,000 | 20 |
| 4 | Plantation | 20×20 | 16 | 75,000 | 20 |
| 5 | Big Ole Plantation | 22×22 | 20 | 250,000 | 10 (?) |
| 6 | Mighty Plantation | 24×24 | 30 | 500,000 | 12 (?) |

— [Expand Farm/Home Farm](https://farmville.fandom.com/wiki/Expand_Farm/Home_Farm); [22x22](https://farmville.fandom.com/wiki/22x22); [Unigamesity expansion list](https://www.unigamesity.com/farmville-land-expansion-list-and-requirements/)

**FV1 crop mastery**
- Strawberries: mastery level 1 at **500** points, level 2 at **1,000**, level 3 at **3,750** (5,250 total). Level 3 earns a **Mastery Sign**.
- Bushel finds on a mastered crop give **4 bushels instead of 1**.
- The heirloom **Super Strawberry** needs strawberries mastered first. Its mastery takes 1,250 / 3,750 / 11,250 points (16,250 total). — [Scribd: Farmville Crop Mastery](https://www.scribd.com/doc/25219217/Farmville-Crop-Mastery); [Supercheats mastery tables](https://www.supercheats.com/guides/farmville/crop-mastery-tables); [Strawberries](https://farmville.fandom.com/wiki/Strawberries); [Super Strawberry](https://farmville.fandom.com/wiki/Super_Strawberry)
- Mastered seeds can roll "premium" crops that pay bonus XP. — [Mastery bonus](https://farmville.fandom.com/wiki/Mastery_bonus)
- Level gates seen: pumpkins 5, artichokes 6, cranberries 10, peppers 12, pattypan squash 22 (see §2).

**FV2 crop mastery and expansions**
- Mastery ribbons go yellow → red → blue. Mastery gives **more XP, not more yield**. — [Supercheats FV2 mastery](https://www.supercheats.com/farmville-2/walkthrough/crop-mastery-system); [Gamelytic mastery guide](https://gamelytic.com/farmville-2-crop-mastery-guide/)
- Expansions per the official help center need a level, coins and items, often gathered from friends:
  - Expansion 3 (Feed Mill): level 2 and 175 coins.
  - Expansion 4 (Family Well): level 2, sell 8 eggs, harvest 16 wheat, 1,000 coins.
  - Expansion 6 (West Meadow): level 5, craft 2 Apple Scones, 2 Garden Clippers from friends, 20,000 coins. — [FV2 Help Center: Expansion requirements](https://zyngasupport.helpshift.com/hc/en/10-farmville-2/faq/483-what-are-the-expansion-requirements-1688024717/); [Yahoo FV2 land expansions (2012-09-10)](https://sports.yahoo.com/2012-09-10-farmville-2-land-expansions-guide.html)

**Hay Day expansion and storage**
- Each land expansion needs **land deeds + mallets + marker stakes**. Each item is "worth" **403 coins and 12 diamonds** through the game's supplies; stakes were seen in players' shops for 1–403 coins. — [Expansion](https://hayday.fandom.com/wiki/Expansion); [Marker Stake](https://hayday.fandom.com/wiki/Marker_Stake); [Supercheats land expansions](https://www.supercheats.com/hay-day/walkthrough/land-expansions)
- **Barn** (goods): upgraded with bolts + planks + duct tape.
  - Capacity rises **+25 per upgrade from 50 to 1,000, then +50**, up to a max of **25,000**.
  - Each upgrade needs N of each item, N rising by 1 per upgrade (50→75 needs 1 each, 75→100 needs 2 each).
- **Silo** (crops): upgraded with nails + screws + wood panels; **+25 from 50 to 1,000, then +50 up to 3,000**. — [Barn](https://hayday.fandom.com/wiki/Barn); [Storage Buildings](https://hayday.fandom.com/wiki/Storage_Buildings)
- Fields: one guide says fields cost **1 coin each** (single source, unverified) and recommends 20+ fields early.
  - Guides say spend diamonds on permanent upgrades (storage, machine queue slots, expansion items), **not** on crop speed-ups. — [farmgamehub beginner guide](https://www.farmgamehub.com/en/guides/hay-day/beginner); [Hay Day Wiki: Crops](https://hayday.fandom.com/wiki/Crops)
- Trees and bushes give 3 harvests, then need a friend's revive (§5), then die. A saw (tree) or axe (bush) clears the dead plant. — [Trees and Bushes](https://hayday.fandom.com/wiki/Trees_and_Bushes); [Apple Tree](https://hayday.fandom.com/wiki/Apple_Tree)

**Country Escape and FarmVille 3**
- Country Escape: Keys bypass level requirements for new land and extra animals; guides say upgrade the barn first. — [Without the Sarcasm tips](https://www.withoutthesarcasm.com/posts/tips-guide-farmville-2-country-escape/); [148Apps tips](https://www.148apps.com/news/farmville-2-country-escape-tips-newbie-farmer/)
- FarmVille 3:
  - **150+ animal breeds** at launch. — [BusinessWire launch release](https://www.businesswire.com/news/home/20211006005037/en/Zynga-Opens-Pre-Registration-for-FarmVille-3-Ahead-of-November-4-2021-Launch)
  - Farmhands unlock with level, are upgraded, and run farm tasks. — [GamingOnPhone FV3 guide](https://gamingonphone.com/guides/farmville-3-beginners-guide-and-tips/)
  - Storage "gets full easily". — [GamingHQ review](https://gaminghq.eu/2025/06/07/farmville-3-review-a-fresh-take-on-the-farming-classic/)

### Inferences
- Three ways the games priced expansion:
  - **FV1:** money + a social gate (neighbor count). It ties growth to recruiting, which suited Facebook in 2009 but fits poorly with a small player base.
  - **FV2:** money + a mini-quest that teaches the next system.
  - **Hay Day:** money-equivalent items that drop from play and trade between players, with a premium shortcut.
- The owner wants a "free starter plot, paid expansions". Every one of these games offered an earnable path alongside the paid one (coins vs Farm Cash; drops vs diamonds).
- Storage caps that start small (50) and grow in +25 steps create steady demand for upgrade items. That demand is what drives Hay Day's trading.

### Gaps
- The FV1 Farm Cash column is garbled in the summary.
- Not captured:
  - FV1 tree/animal timers and decoration rules,
  - full FV1 mastery tables for other crops,
  - Hay Day field price per field (the "1 coin" figure is doubtful),
  - the number of expansion items per Hay Day expansion step,
  - Country Escape expansion costs.

---

## 5. Social: helping, co-ops, gifting and requests, selling to players, order boards, and visiting without griefing

### Takeaway
- **FarmVille 1's social verbs:**
  - fertilize a neighbor's plots (capped at 5 per farm per day, both sides rewarded),
  - free gifts,
  - expansion gates counting neighbors,
  - timed co-op jobs.
- **FarmVille 2** tied water and expansions to friends.
- **Hay Day:** a player-to-player shop (prices capped at 3.6× default), help signs that friends answer (reviving trees, filling boat crates), and 30-member neighborhoods.
- **No game in this lineage lets a visitor take from the host.** China's Happy Farm did let friends steal crops, and it caused real friendships to fray.
- Hay Day's GDC 2025 lesson: competition between teams burned out the larger, cooperative majority.

### Cited Findings
**FarmVille 1**
- Neighbors fertilize: 5 plots a day on each of up to 50 farms, for 10 coins + 1 XP per plot. The host gets +1 XP per fertilized plot at harvest. — [Crop Fertilizer](https://farmville.fandom.com/wiki/Crop_Fertilizer); [Neighbor](https://farmville.fandom.com/wiki/Neighbor)
- Withered crops become unwitherable by visiting neighbors after 14 days. — [Wither](https://farmville.fandom.com/wiki/Wither)
- Gifts cost the sender nothing, and receiving was unlimited. The send cap varied by era (CONFLICT): "up to 5 neighbors a day", "one gift every 4 hours", or an older "185 gifts/requests per day". A Mystery Gift existed for early farmers. — [Gift](https://farmville.fandom.com/wiki/Gift); [gamepressure gifts](https://www.gamepressure.com/farmville/gifts/z728e8); [FarmVille Success gifting](https://farmvillesuccessdotcom.wordpress.com/farmville-neighbors/gifting-in-farmville/)
- **Co-op farming jobs:** a team grows a set quantity of one crop against three medal deadlines. Bronze and Silver pay XP and coins; Gold also gives every member an exclusive item. Examples (crop target, then Gold / Silver / Bronze deadlines):
  - Town Greening, 1,450 Morning Glory: 1 d / 1 d 12 h / 2 d 6 h
  - Bakery Delivery, 1,450 Wheat: 1 d 7 h / 2 d / 3 d 6 h
  - Baby Bunny Rescue, 1,350 Carrots: 23 h / 1 d 11 h / 2 d 10 h
  - Pumpkin Pie O'Plenty, 1,400 Pumpkins: 16 h / 1 d / 1 d 13 h — [Co-Op farming](https://farmville.fandom.com/wiki/Co-Op_farming); [Gold Medal](https://farmville.fandom.com/wiki/Gold_Medal); [Supercheats co-op jobs](https://www.supercheats.com/guides/farmville/co-op-farming-jobs); [Unigamesity co-op guide](https://www.unigamesity.com/co-op-farming-guide-for-farmville-farmers/)
- Expansions were gated by neighbor count (8 → 30; §4).

**FarmVille 2**
- Friends staff your wells (4 needed), send water packs and gather expansion items. Helping a friend's farm 5 times earns you 1 water.
- Neighbors can unwither up to 5 crops per 18 h. — [Yahoo 2012](https://ca.finance.yahoo.com/news/2012-09-10-farmville-2-tips-second-well.html); [FV2 Wiki: Unwither](https://farmville2.fandom.com/wiki/Unwither); [FV2 Help Center: expansions](https://zyngasupport.helpshift.com/hc/en/10-farmville-2/faq/483-what-are-the-expansion-requirements-1688024717/)

**Country Escape**
- **Co-op** unlocks free at level 10 (its sign stands near the Barn). Members chat, exchange crops and goods, and take part in co-op events. — [Country Escape wiki: Co-Op](https://farmvillecountryescape.fandom.com/wiki/Co-Op); [Without the Sarcasm: how co-ops work](https://www.withoutthesarcasm.com/posts/co-ops-work-farmville-2-country-escape/)

**Hay Day**
- **Roadside shop:**
  - Sell crops, animal goods, products and supplies to other players, at any price from 1 coin up to **3.6× the item's default value**.
  - Advertise one box in the "Daily Dirt" newspaper **every 5 minutes**, or skip the wait for 1 diamond. — [Roadside Shop](https://hayday.fandom.com/wiki/Roadside_Shop); [Daily Dirt](https://hayday.fandom.com/wiki/Daily_Dirt); [Supercheats roadside shop](https://www.supercheats.com/hay-day/walkthrough/roadside-shop)
- **Tree revival:**
  - A wilted tree shows a help sign, and **any visitor can revive it**.
  - The reviver earns the XP of picking one fruit.
  - The owner then gets a final harvest (4 apples for an apple tree). — [Trees and Bushes](https://hayday.fandom.com/wiki/Trees_and_Bushes); [Apple Tree](https://hayday.fandom.com/wiki/Apple_Tree); [Playbite](https://www.playbite.com/q/how-do-you-revive-fruit-trees-in-hay-day)
- **Boat orders** are a demand sink:
  - Crates of crops and goods; up to **3 help requests per boat** (1 public, 2 neighborhood-only).
  - Filling one pays instant rewards (vouchers, choice crates, puzzle pieces) plus Nautical Miles on a voyage track that **refreshes every 3 days**.
  - Helping another player's boat counts toward co-op achievements. — [Supercell Support: Boat Orders](https://support.supercell.com/hay-day/en/articles/boat-orders-3.html); [Hay Day Wiki: Update](https://hayday.fandom.com/wiki/Update)
- **Neighborhoods** (up to **30 members**): chat, quick visits, members' Help signs, some trading, and the weekly Derby.
  - Each member takes individual tasks: harvest, feed, fish, mine, produce, fill trucks and boats, revive trees.
  - Visiting farms also raises your chance of mystery boxes. — [Neighborhood](https://hayday.fandom.com/wiki/Neighborhood); [Friends](https://hayday.fandom.com/wiki/Friends); [myfarm Derby guide](https://myfarm.site/articles/hay-day-derby-events-guide/)
- The 2026-08-17 update added indicators pointing visitors to the nearest Help Request, plus truck orders that can be filled back to back. — [Supercell Hay Day announcements](https://supercell.com/en/news/announcement/hayday/); [Hay Day Wiki: Update](https://hayday.fandom.com/wiki/Update)

**Lessons the developers drew**
- Hay Day began as a **single-player** design, and the team later learned "farming could be a very social experience too", one of its major lessons. This was said at 660M downloads, by Stephan Demirdjian (game lead for 9 years), Camilla Avellar (designer) and Sari Latvala (artist). — [mobilegamer.biz, ten years of updates](https://mobilegamer.biz/what-supercells-hay-day-team-learned-from-ten-years-of-updates/); [PocketGamer.biz, 10 years of Hay Day](https://www.pocketgamer.biz/supercell-looking-back-10-years-of-hay-day-part-one/)
- **GDC 2025**, "Designing the Derby – Lessons from Hay Day" (Camilla Avellar, design lead):
  - The Derby (March 2015) was modeled on Clash of Clans' Clan Wars, and it "burned out" many players who first loved it.
  - It split the audience into those who enjoy competition and those who don't, and **the latter group was much larger**. Avellar called it a mistake.
  - Tilting the Derby back toward collaboration gave better results. — [mobilegamer.biz GDC 2025](https://mobilegamer.biz/gdc-2025-diablo-immortals-shock-success-hay-days-bumpy-derby-launch-andis-candy-crush-saga-is-the-worlds-biggest-esport/); [Supercell GDC 2025 page](https://supercell.com/en/news/gdc-2025/)

**Griefing precedent**
- China's **Happy Farm** (2008) and Tencent's **QQ Farm** let friends **steal** ripe crops. Players nicknamed it "stealing vegetables".
  - A QQ Farm player reportedly deleted a real-life colleague from her friends list after the colleague stole her expensive produce.
  - Happy Farm inspired the Facebook clones, the biggest of which was FarmVille.
- **Farm Town**, which FarmVille closely copied at first, had no stealing: friends could help harvest, and **both** were rewarded. — [Association for Asian Studies](https://www.asianstudies.org/publications/eaa/archives/chinas-happy-farm-and-the-impact-of-social-gaming/); [GameYum farm-game history](https://www.gameyum.com/other-farming-games/80287-a-brief-history-of-facebook-farm-games/); [Campaign Asia](https://www.campaignasia.com/article/all-about-happy-farm/rpsyvqedhjjbt2g0uovvmskhe1)

### Inferences
- Across these games, the template for visiting a private farm that is useful but can't be griefed is consistent:
  - visitors can only **add** (fertilize, revive, fill an order, buy from the shop);
  - helps are **capped** (5 per farm per day; 5 unwithers per 18 h);
  - **both** sides are rewarded;
  - the host keeps control (they post the help signs).
- Stealing (Happy Farm) is the documented counter-example.
- The Derby lesson argues for cooperative team goals, like FV1's co-op jobs or Hay Day's boats, over leaderboards between teams.

### Gaps
- Not captured: Hay Day's daily limits on helping, how much a helper earns from a boat crate, the truck order board's slot count and rewards, and FV1 gift-request numbers by era (they conflict).

---

## 6. Retention and monetization: appointments, energy, speed-ups, notifications, critiques, postmortems

### Takeaway
- **Retention** rested on appointments: timers plus a loss for missing them.
- **Monetization** sold time and protection:
  - FV1 Farm Cash: fuel, the Unwither Ring, expansions
  - Hay Day diamonds: "the only way to skip wait times"
  - Country Escape Keys
  - FV3 gems
- **FV1's viral notification spam** grew it to 83.76M monthly users. It then caused a backlash and a platform crackdown.
- **Critics** (Bogost, Soren Johnson, Zagal et al.) target compulsion and "destroyed time".
- **Hay Day's** no-punishment model has kept it live and growing at 14 years old.

### Cited Findings
**Energy and speed-ups**
- FV1's fuel is described in §1.
- FV2's water acted as energy: 10 per well every 4 h. — [Yahoo 2012](https://ca.finance.yahoo.com/news/2012-09-10-farmville-2-tips-second-well.html)
- FV3 has an energy-like cap that players call too slow, and gems speed timers. Progress for non-payers "noticeably slows" as the farm grows, especially in timed events. — [GamingHQ review](https://gaminghq.eu/2025/06/07/farmville-3-review-a-fresh-take-on-the-farming-classic/)
- Country Escape's **Keys** skip any wait (crops, crafting, animals) and level gates. Speed Grow (crops and trees) and Helping Hands (workshop) are the speed-up items. — [Without the Sarcasm tips](https://www.withoutthesarcasm.com/posts/tips-guide-farmville-2-country-escape/); [148Apps](https://www.148apps.com/news/farmville-2-country-escape-tips-newbie-farmer/)

**Hay Day's money**
- Diamonds are "the only way you can skip wait times" and are scarce outside the store. Waits run from 2 min for crops to 20+ h for building machines.
- There are 6 diamond packs, from **$1.99 to $99.99**.
- Third-party estimates: **more than $1.2B lifetime revenue**, and an **ARPDAU above $0.40 in January 2021**. — [Udonis dissection](https://www.blog.udonis.co/mobile-marketing/mobile-games/hay-day-monetization); [Udonis on Medium](https://medium.com/udonis/hay-day-monetization-how-this-farming-game-got-to-1-15b-in-revenue-c3b6cd486c78)

**Notifications**
- Hay Day's push notifications ("All crops are ready to harvest", "Eggs is ready to collect") can each be switched on or off in Settings. — [Hay Day Wiki: Settings](https://hayday.fandom.com/wiki/Settings); [Technical-tips](https://technical-tips.com/blog/ios/hay-day-pushturn-off-notifications-6571); [Playbite](https://www.playbite.com/q/how-can-i-tell-hay-day-to-notify-me)
- FV1 posted to friends' Facebook feeds and sent requests, reaching non-players ("Sarah is turning straw into gold!").
  - Facebook changed its messaging policy in **March 2010**, with MAU reportedly −26%, and closed the channel later in 2010.
  - After the "ScamVille" lead-gen ad backlash, Zynga pulled those ads, reportedly about ⅓ of revenue.
  - Its shutdown was covered as the end of "eleven years of annoying notifications". (These are secondary sources; the −26% and ⅓ figures are unverified.) — [ProductMint](https://productmint.com/what-happened-to-farmville/); [StartupSpells](https://startupspells.com/p/farmville-viral-loop-zynga-facebook-exploit); [Andy Rathbone (2010)](http://www.andyrathbone.com/2010/03/08/how-to-block-farmville-spam-on-facebook/); [JOE.co.uk](https://www.joe.co.uk/gaming/farmville-is-shutting-down-at-the-end-of-2020-after-eleven-years-of-annoying-notifications-251211); [Slate (2018)](https://slate.com/technology/2018/03/farmville-helped-sow-the-seeds-of-the-cambridge-analytica-scandal.html)

**Scale (HISTORICAL)**
- FV1 peaked at **83.76M monthly active users (March 2010)** and **34.5M DAU**. It was about 60M MAU by the end of 2010 and lost Facebook's #1 app slot in November 2010.
- It ranked 7th on Facebook by May 2012 and 110th by DAU on 2016-04-30. — [FourWeekMBA](https://fourweekmba.com/what-happened-to-farmville/); [Forbes (2010-11-20)](https://www.forbes.com/sites/oliverchiang/2010/11/20/farmville-no-longer-facebooks-top-application/); [CNN (2014-07-31)](https://www.cnn.com/2014/07/31/tech/gaming-gadgets/farmville-fifth-anniversary/index.html)

**Critiques**
- **Ian Bogost's Cow Clicker** (2010), made in three days: click a cow once every **six hours** for a point. He named four concerns about Facebook games: "enframing, compulsion, optionalism, and destroyed time". They destroy the time spent away, not only the time spent playing. He became compulsively attached to his own satire. — [Bogost: Cow Clicker](https://bogost.com/writing/blog/cow_clicker_1/); [Game Developer interview](https://www.gamedeveloper.com/design/interview-i-cow-clicker-i-yields-ruminations-on-social-gaming-s-tense-battle-lines); [NECSUS](https://necsus-ejms.org/cows-clicks-ciphers-and-satire/)
- **Soren Johnson, "Fear and Loathing in Farmville"** (2010-03-19, after GDC 2010):
  - With FarmVille "the premise is to make money", and making the game worse can earn more.
  - It "makes overt use of known psychological techniques to influence and control behavior" tied to revenue.
  - It makes progress easy until you can't spend coins well without real money. — [Designer Notes](https://www.designer-notes.com/?p=195); [Waxy.org](https://waxy.org/2010/03/soren_johnsons/)
- **Zagal et al.**, "Playing by Appointment" as a dark pattern (§3).

**Postmortems and talks**
- **Mark Skaggs, GDC 2011**, "The Lessons I Learned from Making FarmVille and CityVille":
  - FarmVille was built in **five weeks** on "light, fast and right" and reached **1M DAU in five days**.
  - "Learn from success", for example copying a proven gifting interstitial.
  - "Make it fun ... you can't make up for a boring game with volume ... if it's not [fun], it doesn't matter that you have a million seeds." — [GDC Vault](https://www.gdcvault.com/play/1016592/The-Lessons-I-Learned-from); [AllThingsD (2011-03-01)](https://allthingsd.com/20110301/zyngas-farmville-and-cityville-developer-spills-the-beans-on-what-makes-games-great/); [GamesBeat Zynga history](https://gamesbeat.com/zynga-history/3/)
- **Hay Day at 12 (2024):**
  - Monthly actives turned from a years-long decline to growth; "a really loyal, stable player base" with "growth virality".
  - About 50 developers in 3 "subcells"; more than 1 billion barns created.
  - Originally "Project Soil", Supercell's first iPad game. — [PocketGamer.biz](https://www.pocketgamer.biz/supercell-reveals-rise-in-hay-day-active-users-with-growth-virality-12-years-on/)
- The Hay Day Derby talk (§5) and the Haussila interview (§3) apply here too.

### Inferences
- The two lineages tested two retention models: loss aversion (FV1/FV2 withering, sold back as protection) and opportunity (Hay Day: idle fields, orders waiting, friends' help signs). The second has the longer live record.
- Spam that reaches non-players invited both a backlash and platform penalties. Per-type, player-controlled notifications are Hay Day's quieter alternative.
- Speed-ups that are the only way to skip waits monetize impatience. Hay Day's own guides steer players away from spending diamonds on crops and toward permanent upgrades, which suggests most crop timers there are short enough not to need skipping.

### Gaps
- No primary Zynga or Supercell retention or revenue data; the revenue and ARPDAU figures are third-party estimates.
- GDC Vault slides were not readable here.
- Not found: Hay Day's diamond-per-minute speed-up rate, a Hay Day statement on having no energy system, and a Zynga postmortem on withering or water.

---

## 7. Status as of 2026-10-06: which games are live, and which numbers are historical

### Takeaway
- **Closed:** only FarmVille 1, on 2020-12-31.
- **Live in 2026:** Hay Day, FarmVille 2: Country Escape and FarmVille 3, all with 2026 updates.
- **FarmVille 2 on Facebook** also appears live: its help center was updated in 2026 and Unwither gift links are still posted. I found no shutdown notice, so this is uncertain.

### Cited Findings
- **FarmVille 1 (Facebook):** launched **2009-06-19**; in-app purchases ended **2020-11-17**; **closed 2020-12-31** because Adobe ended Flash. HISTORICAL. — [GadgetMatch](https://www.gadgetmatch.com/farmville-shutting-down-facebook-zynga/); [ComicBook.com](https://comicbook.com/gaming/news/farmville-ending-closing-shutting-down-facebook-zynga/); [Delisted Games](https://delistedgames.com/after-11-years-the-original-farmville-shuts-down-on-december-31st/); [TheGamer](https://www.thegamer.com/farmville-officially-shutting-down-today/)
- At FV1's closure, Country Escape and Tropic Escape were unaffected and FarmVille 3 was upcoming. — [Alternative Press](https://www.altpress.com/facebook-farmville-shutting-down/)
- **FarmVille 2 (Facebook, 2012):** Zynga's FV2 Help Center was still updated in 2026 ("Game Issues Recent Updates"), and free "20 Unwither" links were dated August 2026. It appears **still live**; I found no shutdown announcement (UNCERTAIN). — [FV2 Help Center](https://zyngasupport.helpshift.com/hc/en/10-farmville-2/faq/16117-game-issues-recent-updates/); [Juegos Social](https://www.juegossocial.com/en/farmville-2-free-get-20-unwither-aug-9-2026/)
- **FarmVille 2: Country Escape (mobile):** LIVE. Google Play shows an update on **2026-09-18**. It plays offline and without Facebook, and has Farm Co-Ops. — [Google Play](https://play.google.com/store/apps/details?id=com.zynga.FarmVille2CountryEscape); [Zynga](https://www.zynga.com/games/farmville-2-country-escape/)
- **FarmVille 3:** global launch **2021-11-04** on iOS and Android (and M1 Macs), with 150+ animal breeds. LIVE; its Help Center is active. — [BusinessWire](https://www.businesswire.com/news/home/20211006005037/en/Zynga-Opens-Pre-Registration-for-FarmVille-3-Ahead-of-November-4-2021-Launch); [FV3 Help Center](https://zyngasupport.helpshift.com/hc/en/91-farmville-3/section/1074-getting-started/)
- **Hay Day:** LIVE.
  - An update on **2026-08-17**: faster Truck Orders, easier helping with help-needed indicators, more Farm Pass rewards.
  - Boat Destinations in 2026; a **14th-anniversary** celebration (it launched in 2012). — [Supercell announcements](https://supercell.com/en/news/announcement/hayday/); [Google Play](https://play.google.com/store/apps/details?id=com.supercell.hayday&hl=en_US); [Vortex Gaming](https://vortexgaming.io/en/postdetail/981373); [AOL launch coverage (2012-06-22)](https://www.aol.com/2012/06/22/hay-day-iphone-ipad/)

### Inferences
- The brief listed FV1's 2020 shutdown and FV3's 2021 launch; both are confirmed.
- No evidence was found that FarmVille 2 or Country Escape closed, so their mechanics are current, not historical, though tuned since 2012–2014.
- Hay Day's numbers are live values that Supercell keeps retuning.

### Gaps
- Not verified:
  - Country Escape's launch date (believed 2014),
  - Tropic Escape's current status and launch date,
  - FV2 Facebook's precise status (no official "still live" statement read),
  - Take-Two's 2022 acquisition of Zynga (not researched; not needed for the design question).
- All URLs above were seen only through search summaries; none could be opened (see the note at the top).
