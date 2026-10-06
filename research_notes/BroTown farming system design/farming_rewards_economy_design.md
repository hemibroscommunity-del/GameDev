# Farming rewards and economy design: cross-game principles and numbers (for BroTown)

*Method note (2026-10-06): this session's egress proxy blocked full-page fetches of nearly every game wiki and news site (warcraft.wiki.gg, wiki.guildwars2.com, UESP, consolegameswiki, OSRS Wiki, Albion Wiki, Fextralife, Blizzard Watch, MMORPG.com). The shared web-search budget also ran out before the last planned queries. Every figure below therefore comes from web-search summaries of the cited page, not from reading the page itself. Spot-check exact numbers on the cited page before they go into a player-facing design. "Historical" marks facts about past versions of a game. BroTown context marked "(per repo CLAUDE.md)" comes from the project file in this session, not from web research.*

## 1. Food and consumable buff design in MMOs and ARPGs (sizes, durations, slot rules, death/logout, mobile)

### Takeaway
The big MMOs have settled on a common pattern:
- one food buff at a time (GW2 adds a separate utility slot);
- buffs that last 30 to 120 minutes;
- modest stat bumps, usually with a small XP bonus on top (FFXIV +3% EXP, GW2 +10% kill XP, Diablo IV elixirs +5-8% XP);
- more and more often, buffs that survive death (GW2, ESO since 2014, Diablo IV). WoW is the holdout, and in 2024 it added "Hearty" food that survives death, after player complaints.

Action RPGs went further. Basic healing is no longer something you buy: Diablo III has one potion on a cooldown, Path of Exile has flasks that recharge, and Diablo IV and Diablo Immortal have charges that refill from kills. Crafted consumables are left to do buffs. Mobile ARPGs also add auto-use thresholds and a few quick slots.

### Cited Findings
**Slot rules and durations**
- GW2: only one nourishment (food) effect at a time. Food and utility (enhancement) effects use separate slots and always stack with each other. -- [GW2 Wiki: Nourishment](https://wiki.guildwars2.com/wiki/Nourishment); [MetaForge GW2 food guide](https://metaforge.app/guild-wars-2/the-definitive-food-guide-in-guild-wars-2)
- GW2: ascended (top-tier) food lasts 1 hour and is set down as a 5-minute feast; all other food lasts 30 minutes unless stated. -- [GW2 Wiki: Feast (food)](https://wiki.guildwars2.com/wiki/Feast_(food))
- FFXIV: every meal gives "Well Fed": +3% EXP for 30 minutes (combat, crafting and gathering EXP) on top of the meal's stat effects. Eating more of the same food extends it to 60 minutes. Only one meal works at a time (a different meal overwrites it). Some event meals give +4% EXP. -- [FFXIV Wiki: Meals](https://ffxiv.consolegameswiki.com/wiki/Meals); [FFXIV Wiki: Well Fed](https://ffxiv.consolegameswiki.com/wiki/Well_Fed); [FFXIV Wiki: Experience](https://ffxiv.consolegameswiki.com/wiki/Experience)
- FFXIV: food is crafted only by the Culinarian crafting class. -- [GameSkinny FFXIV food guide](https://www.gameskinny.com/tips/ffxiv-food-guide-with-stats-for-physical-damage-dealers-dddps/)
- ESO: provisioning food and drink buffs last 30 minutes to 2 hours. Only one provisioning buff (food OR drink) can be active at a time. -- [Tamriel Journal: ESO provisioning guide](http://tamrieljournal.com/crafting-and-professions/provisioning/)
- New World has two kinds of food:
  - Recovery food gives health or mana over a few seconds. Recovery effects cannot stack.
  - Attribute food gives +attributes. Every attribute food also gives "Well Fed", which heals 1% of max health every 2.5 s and stops when you take damage.
  - Example: Light Ration heals 40 health/s for 20 s, plus the 1%/2.5 s regen for 20 minutes.
  - -- [StudioLoot: New World consumables guide](https://www.studioloot.com/new-world/articles/beginners-guide-to-consumables-in-new-world/); [NWHub: Consumables](https://nwhub.gg/consumables/); [Fextralife NW: Consumables](https://newworld.wiki.fextralife.com/Consumables)
- Albion Online: the food buff lasts 30 minutes. Food is cooked by players at the Cook station, and the food's type and tier set the buff's type and strength. -- [Albion Wiki: Food](https://wiki.albiononline.com/wiki/Food)
- Diablo IV: elixirs last 30 minutes. Their XP bonus stacks with ONE incense. Examples: Elixir of Advantage +5% XP, Elixir of Advantage II +8% XP. These are launch-era values. -- [Fextralife D4: Elixirs](https://diablo4.wiki.fextralife.com/Elixirs); [PureDiablo: Alchemist](https://www.purediablo.com/diablo4/Alchemist)

**Buff sizes (examples)**
- GW2: Plate of Truffle Steak (level 80) gives +100 Power and +70 Precision. All GW2 food also gives +10% experience from kills while it lasts. -- [GW2 Wiki: User:Dacromir/Food](https://wiki.guildwars2.com/wiki/User:Dacromir/Food); [Snow Crows GW2 food & utility glossary](https://snowcrows.com/guides/getting-started/guild-wars-2-food-glossary)
- ESO: Bewitched Sugar Skulls give, for 2 hours, Max Health +4,620, Max Stamina and Max Magicka +4,250, and Health Recovery +462. -- [ESO-Hub: Bewitched Sugar Skulls](https://eso-hub.com/en/food-drinks/delicacies/bewitched-sugar-skulls); [UESP: Bewitched Sugar Skulls](https://en.uesp.net/wiki/Online:Bewitched_Sugar_Skulls)
- FFXIV: food stat boosts are a percentage with a fixed cap. Example: the high-quality Apkallu Omelette gives "Critical Hit +5% (Max 27)", an older food. A low-level character gets the full percentage, but the absolute gain is capped. -- [GameSkinny FFXIV food guide](https://www.gameskinny.com/tips/ffxiv-food-guide-with-stats-for-physical-damage-dealers-dddps/); [Gamer Escape: Consumables](https://ffxiv.gamerescape.com/wiki/Category:Consumable)
- WoW The War Within (2024+): Well Fed food gives about +446 Stamina, scaled down to 126 for low levels, per a Warcraft Wiki search summary. LOW confidence on which food this is. Earthen racial "mineral" food was raised from +383 to +562 of a secondary stat after complaints. -- [Warcraft Wiki: Well Fed](https://warcraft.wiki.gg/wiki/Well_Fed); [Blizzard Watch: Earthen food](https://blizzardwatch.com/2024/09/06/ingest-minerals/)

**Persistence through death and logout**
- GW2: food and utility buffs survive defeat (death) and map changes. The timer keeps counting down; it does not reset on respawn. -- [GW2 Wiki: Nourishment](https://wiki.guildwars2.com/wiki/Nourishment); [MetaForge](https://metaforge.app/guild-wars-2/the-definitive-food-guide-in-guild-wars-2)
- ESO: since Patch 1.0.4 (2014, historical), food and drink buffs survive death, like Mundus Stone buffs. -- [Tamriel Journal](http://tamrieljournal.com/crafting-and-professions/provisioning/); [ESO forums: dual food/drink buff thread](https://forums.elderscrollsonline.com/en/discussion/108632/dual-food-drink-buff-one-disappears-after-death)
- Diablo IV: elixirs survive death. -- [Fextralife D4: Elixirs](https://diablo4.wiki.fextralife.com/Elixirs)
- WoW Dragonflight (2022-24, historical): ordinary Dragon Isles Well Fed buffs were LOST on death. The crafted "Alchemical Flavor Pocket" embellishment doubled Well Fed duration (+100%) and made it survive death. -- [Wowpedia: Alchemical Flavor Pocket](https://wowpedia.fandom.com/wiki/Alchemical_Flavor_Pocket); [Wowhead spell 372120](https://www.wowhead.com/spell=372120/alchemical-flavor-pocket)
- WoW The War Within: "Hearty" meals combine 5 of any food with 1 Artisan's Acuity into a Warband-bound version that lasts through death. Normal food is still lost on death, and players complain about it (e.g. Earthen racial food). -- [Blizzard Watch: Hearty Meals](https://blizzardwatch.com/2024/05/22/hearty-meals-cooking-wow-war-within/); [Blizzard forums: Earthen Well Fed goes away after death](https://us.forums.blizzard.com/en/wow/t/earthen-well-fed-buff-goes-away-after-death/1943495)
- Albion: whether food survives death has varied by game mode and been debated. Players proposed losing it on death specifically to raise food demand. Others asked for the buff timer to PAUSE on logout, which suggests it keeps running offline. -- [Albion forum: Food usage balancing](https://forum.albiononline.com/index.php/Thread/29646-Food-Useage-Balancing-Suggestions-on-how-to-help/); [Albion forum: Food buff SHOULD pause on logout](https://forum.albiononline.com/index.php/Thread/187190-Food-Buff-SHOULD-Pause-On-Logout/); [Albion forum: consumables in arena after last changes](https://forum.albiononline.com/index.php/Thread/75784-Consumables-in-arena-after-last-changes/)

**When buffs become mandatory: cost and creep**
- WoW Classic Era (community estimate):
  - A casual raider spends about 15-40 gold per raid night on food, weapon oil and cheap elixirs.
  - A progression raider spends 150-400+ gold per night, driven almost entirely by Black Lotus flask cost.
  - This is a third-party blog; no designer statement on a deliberate "consumable tax" was found.
  - -- [Timesaver.gg: raid night cost in Classic Era](https://timesaver.gg/blog/how-much-gold-raid-night-cost-wow-classic-era)
- WoW Classic seasons (forum evidence only, not official):
  - Season of Mastery disabled world buffs in raids. Season of Discovery kept them.
  - Players argue world buffs become mandatory for parsing, create social friction and make raids hard to tune.
  - -- [Blizzard forums: World buffs should not be usable in raids](https://us.forums.blizzard.com/en/wow/t/world-buffs-should-not-be-usable-in-raids/1748353); [Blizzard forums: World buffs are incompatible with raid difficulty](https://us.forums.blizzard.com/en/wow/t/world-buffs-are-incompatible-with-raid-difficulty/1934267)

**ARPG healing: what replaced bought potions**
- Diablo III (2012, historical): replaced Diablo II's potion spam with an emergency button. It heals 60% of max health at once, then has a 30-second cooldown. Spammable potions would have made characters effectively invincible. -- [Diablo Wiki: Potion](https://www.diablowiki.net/Potion)
- Path of Exile: flasks are permanent items, not used up.
  - Charges refill from kills: normal monster 1, magic 3.5, rare 6, unique 11. Returning to town also refills them.
  - A town vendor sells flasks for your level if none drop.
  - Charges used to go to one random unfilled flask per kill, which led players to equip a single best flask. Charges now rotate across non-full flasks.
  - -- [Maxroll: PoE Flasks guide](https://maxroll.gg/poe/resources/flasks); [PoE Wiki: Flask](https://pathofexile.fandom.com/wiki/Flask?version=457dabec2960808edcece1098d7a34f4)
- Diablo IV: healing potions drop from enemies and objects. Charge count came from regional Renown, and potency upgrades from the Alchemist, an NPC who crafts from herbs you gather. Per Game Rant, Season 11 removed Alchemist potion upgrades and moved to a fixed 4 potions with a 30-second recharge; this is NOT independently verified. -- [Game8: Upgrade healing potion](https://game8.co/games/Diablo-4/archives/408512); [Game Rant: D4 Season 11 potion changes](https://gamerant.com/diablo-4-season-11-potion-changes-good-bad/)
- Diablo Immortal (Blizzard/NetEase mobile ARPG, 2022):
  - 3 healing-potion charges, 20 s cooldown between uses.
  - A charge heals 10% of Life at once, then 7.5% per second for 8 s.
  - Charges refill from chests and Rare/Ancient monsters (1 each) and Unique monsters (3), and fully in town or at a healing well.
  - -- [Game8: Diablo Immortal how to heal](https://game8.co/games/Diablo-Immortal/archives/378456); [Gamepressure: Diablo Immortal healing](https://guides.gamepressure.com/diablo-immortal/guide.asp?ID=65008); [Diablo Wiki (Fandom): Healing Potions](https://diablo.fandom.com/wiki/Healing_Potions)

**Mobile presentation**
- Auto-potion is standard in mobile and cross-platform action RPGs:
  - toggle it on or off, pick the potion, and set an HP% threshold (guides recommend about 20%);
  - up to 4 consumable quick-slots, each with its own trigger: HP%, MP%, "use again when cooldown ends", or on a status effect.
  - -- [Ragnarok Landverse: Automated Battle System](https://maxion-1.gitbook.io/ragnarok-landverse-america/game-guide/automated-battle-system); [Aura Kingdom wiki: Auto-Potion System](https://aurakingdom.fandom.com/wiki/Beginning_Guide/Auto-Potion_System); [Undecember auto potion settings](http://www.vhpg.com/undecember-auto-potion-settings/)

### Inferences
- **How big a buff should be.** "Useful but not mandatory" games keep food to a few percent of a main stat, plus a small XP bonus.
  - GW2's +100 Power is about 10% of a level-80 base Power of 1,000. That base value comes from GW2 attribute pages surfaced but not read ([GW2 Wiki: Precision](https://wiki.guildwars2.com/wiki/Precision)). It is a smaller share of a geared total.
  - ESO's +4,620 health is far larger, so ESO treats food as part of every build. That is the "mandatory" end of the spectrum.
  - FFXIV's percent-with-cap stops food from scaling out of control.
  - For BroTown, a small stat bonus (a few %) plus an XP or gathering bonus fits the "useful, not required" goal. An XP bonus is especially attractive because combat levelling was halved in v2.3.3054 (per repo CLAUDE.md).
- **Duration against a 2-hour free day.**
  - A 30-minute buff means up to 4 uses in a capped day.
  - A 60-minute buff means 2 uses.
  - A 2-hour buff (ESO-style) means one item covers the whole free day.
  - 30-60 minutes creates steady, repeat demand for farmed food without heavy upkeep.
- **Survive death.** Every recent design except base WoW keeps food through death, and WoW players complain and pay extra (Hearty) to get it. BroTown has risky deaths (No man's land rules, per repo CLAUDE.md). Losing a buff on death would double the cost for the players who die most, which are usually the weakest.
- **Count down only while online.** Pausing the buff timer offline would be fairest under a time-capped free tier; Albion players ask for exactly this. The repo already counts No man's land skull timers in time ONLINE (per repo CLAUDE.md), so the pattern exists. The worker should hold the buff, its stat effect and its timer; the client only shows it, since the worker is authoritative for damage.
- **Healing potions.** The ARPG lesson for Diego's potions is that basic healing works best as a free refilling resource: charges refilled by kills or by returning to town (Diablo Immortal, PoE). Farmed items then sell as BUFFS and better/extra healing, not as the only way to survive.
- **On a phone.**
  - One food icon with a ring timer near the HP bar.
  - An optional auto-use threshold.
  - At most 1-2 consumable buttons, which matches what mobile ARPGs converged on.

### Gaps
- FFXIV: no source found on whether food survives death, or on tincture (stat potion) duration and recast.
- Lost Ark battle-item rules and its consumable limits: not researched (search budget exhausted).
- Whether GW2, ESO or FFXIV buff timers count down while logged off: not found. Only Albion's forum request suggests they tick offline.
- WoW's current exact food stat values and durations: low confidence (search summary only).
- Diablo IV's current elixir duration and the Season 11 potion rework: Game Rant only, not verified.
- Total character stat pools, needed to turn each buff into an exact % of power: not found. The % above are inferences.
- No data on how mobile MMOs show buff timers, or how often players use food.
- No designer interview found on keeping buffs non-mandatory. Albion's dev reasoning for its consumables overhaul surfaced as a Ten Ton Hammer article ([Ten Ton Hammer](https://www.tentonhammer.com/news/consumables-and-potions-overhauled-in-albion-online)) but could not be read.

## 2. NPC-sold versus player-made consumables (vendor removal, floors, hybrids, effects on newcomers and gatherers)

### Takeaway
Three working models exist:
1. **Everything player-made** (OSRS prayer potions, Albion, Star Wars Galaxies). Gatherers get strong, constant demand: OSRS prayer-potion making is about 1.06M coins/hour, and herbs are its farming money crop. But this model needs a deep market and tends to fail newcomers when the population shrinks.
2. **Vendor floor plus a crafted premium** (WoW vendor food vs cooked Well Fed food; BDO NPC HP potions, dearer than the market but unlimited, vs crafted elixirs; PoE's flask vendor). New players are never stuck, and crafters compete on buffs and price.
3. **Basic healing not bought at all** (Diablo III/IV, PoE, Diablo Immortal). Crafted items are buffs only.

Albion adds a fourth tool: an NPC that BUYS crafted goods (its Black Market), which creates demand without supplying anything.

### Cited Findings
- OSRS:
  - Prayer potions are not sold in any shop. They must be made by players (Herblore) or looted.
  - Demand is always high because Prayer is used throughout combat.
  - They are made from a ranarr potion (unf) plus snape grass at 38 Herblore.
  - The OSRS Wiki lists making prayer potions at about 1,060,313 coins/hour profit. This changes with market prices.
  - Ranarr (32 Farming) is the main farmed herb for them, grown in herb runs about every 80 minutes.
  - -- [OSRS Wiki: Prayer potion](https://oldschool.runescape.wiki/w/Prayer_potion); [OSRS herblore guide (third party)](https://www.osrsbestinslot.com/osrs-herblore-guide/); [OSRSTools herblore guide](https://www.osrstools.net/guides/skills/herblore)
- Albion Online:
  - Its economy is described as "100% player driven": you start with no gear and no coins, and no NPC sells weapons or armour.
  - Nearly every item is crafted by players, in player buildings, from player-gathered resources. Exceptions include monthly reward mounts.
  - -- [Albion Wiki: Category Economy](https://wiki.albiononline.com/wiki/Category:Economy); [Gaming Trend: Albion review](https://gamingtrend.com/reviews/risk-vs-reward-albion-online-review/); [Albion forum: how the economy works](https://forum.albiononline.com/index.php/Thread/158971-how-the-economy-works-in-albion-online/)
- Albion's Black Market is an NPC BUYER. Items it buys are given out again as loot from chests and monsters, so the NPC creates demand for crafted goods instead of supplying them. -- [Albion forum: how the economy works](https://forum.albiononline.com/index.php/Thread/158971-how-the-economy-works-in-albion-online/); [Albion Wiki: Category Economy](https://wiki.albiononline.com/wiki/Category:Economy)
- WoW (hybrid): vendors sell ordinary food and drink that restores health and mana. The strongest Well Fed buffs come from foods that only Cooking-profession players make. -- [Wowpedia: Food](https://wowpedia.fandom.com/wiki/Food); [Wowpedia: Well Fed](https://wowpedia.fandom.com/wiki/Well_Fed)
- Black Desert (hybrid): NPC alchemy vendors usually charge more than the player Marketplace but never run out. Potions restore HP/MP; player-crafted elixirs give timed buffs (damage, defence, gathering, fishing, movement). Alchemy "ensures access to the best-boosting elixirs." -- [BDO Crafting Lab: Alchemy guide](https://www.bdocraftinglab.com/guides/alchemy-guide); [Saarith: BDO Alchemy guide](https://saarith.com/bdo-alchemy-guide/); [GrumpyGreen: BDO Alchemy basics](https://grumpygreen.cricket/alchemy/)
- Path of Exile: one town vendor sells flasks for your level if none drop. The vendor is a safety net, and flasks recharge instead of being used up. -- [Maxroll: PoE Flasks guide](https://maxroll.gg/poe/resources/flasks)
- Diablo IV / Diablo Immortal: basic healing comes from drops and refilling charges, not from shops (details and sources in section 1). Diablo IV's buff elixirs are crafted by an NPC Alchemist from herbs players gather. -- [PureDiablo: Alchemist](https://www.purediablo.com/diablo4/Alchemist); [Game8: Diablo Immortal how to heal](https://game8.co/games/Diablo-Immortal/archives/378456)
- Star Wars Galaxies (2003-2011, historical): almost every usable item was player-crafted, including weapons, armour, food, housing and droids. Doctor buffs and stat food were among the most important crafted goods. Top crafters became server-famous brands selling through player vendors. -- [SWG Legends Wiki: Crafting](https://swglegends.com/wiki/index.php?title=Crafting); [Wikipedia: Star Wars Galaxies](https://en.wikipedia.org/wiki/Star_Wars_Galaxies)
- OSRS High Level Alchemy acts as a PRICE FLOOR. It turns an item into coins at 60% of its store value. When the market price drops below alch value minus rune cost, players buy the item to alch it, which stops the fall. -- [OSRS Wiki: High Level Alchemy](https://oldschool.runescape.wiki/w/High_Level_Alchemy)
- Thin-market risk (WEAK source: Q&A opinion):
  - When the player base ages, veterans supply only other veterans and new players find nothing affordable at their level, then leave.
  - One seller can crash a small market by flooding it.
  - FFXI's slow pace kept low-level crafts useful for years, so newcomers could still earn.
  - -- [Quora: why player-driven economies are hard to maintain](https://www.quora.com/Why-are-sandbox-MMOs-and-player-driven-economies-so-difficult-to-maintain)

### Inferences
- **The thin-market risk is real for BroTown.** It has ONE shared room (`brotown-1`) and therefore one market (per repo CLAUDE.md). If healing potions come only from farmers, a new player who logs in when no potion sell orders exist has no way to survive. That is the classic thin-market trap.
- **Recommended hybrid: keep a vendor ceiling.** Diego keeps a basic potion priced ABOVE what farmed potions should cost (the BDO pattern: NPC dearer but unlimited). That price becomes the ceiling for an equal player-made potion. Farmed potions then win on price, potency or an added buff rider (the WoW pattern).
- **Add a floor too.** If an NPC also buys produce or potions at a low fixed price (the OSRS alch / Albion Black Market pattern), player prices settle between the NPC buy price and the NPC sell price. The market lives inside that band, and both edges are under the designer's control.
- **Or take the ARPG route.** Make base healing free, refilling charges (e.g. 3 charges refilled by kills or in BroTown). All farm consumables then become buff food and elixirs: optional upside for the 2-hour session, not a tax on fighting.
- **Removing Diego's potions entirely** gives farmers the strongest demand (OSRS shows how constant consumable demand supports gatherer income). But the cost lands on new and returning players at low-population hours. Phase it in only once the order book shows steady potion supply.

### Gaps
- No clean before/after case was found where a game removed vendor potions and measured prices or new-player retention.
- No good source was found on stock-based NPC shop pricing (prices that fall as the shop's stock rises).
- The thin-market evidence is opinion-grade (Quora). No academic or developer data on minimum population for a player-only consumable market was found.

## 3. Gold economy: farming as faucet vs market good, anti-inflation tools, expansion prices as sinks

### Takeaway
- Selling produce to an NPC CREATES gold (a faucet). Selling to players only MOVES gold, and becomes a sink if the trade is taxed.
- Raph Koster's warning: faucets that players can open wider, against drains that stay fixed, lead to inflation.
- Proven controls:
  - caps on NPC buying (BDO: Contribution Points / 2 boxes a day; Lost Ark: only 6 gold earners per roster);
  - trade taxes (OSRS 2% capped at 5M, raised from 1% in May 2025; GW2 5% + 10%);
  - item sinks that delete goods;
  - big escalating purchases.
- Plot ladders are steep and get dearer per unit:
  - Albion's personal island goes from 1M to 26.5M silver in total, and the price per added plot rises about 3x across the ladder.
  - FFXIV house plot sizes cost roughly 1 : 5.3 : 13.3.
  - The first step is often discounted for onboarding (Albion's first island: 20k instead of 1M).

### Cited Findings
- Raph Koster (2006, notes on his AGC talk):
  - Faucets are players selling to the game; drains are players buying from the game.
  - Players control cash creation by killing for loot. Prices rise, so they kill more.
  - Faucets open wider while drains are usually fixed, which leads to hyperinflation.
  - Star Wars Galaxies used an explicit faucet/drain model.
  - -- [Raph Koster: AGC MMO economies](https://www.raphkoster.com/2006/09/07/agc-mmo-economies/); [Wikipedia: Gold sink](https://en.wikipedia.org/wiki/Gold_sink)
- OSRS High Level Alchemy:
  - Turns an item into coins at 60% of its store value. This is both a FAUCET (coins from nothing) and a PRICE FLOOR.
  - Rune cost is about 583 coins, or about 388 with a staff that supplies fire runes.
  - About 1,200 casts per hour at maximum speed.
  - -- [OSRS Wiki: High Level Alchemy](https://oldschool.runescape.wiki/w/High_Level_Alchemy)
- OSRS Grand Exchange tax ("convenience fee"):
  - 2% on most trades, capped at 5 million coins per item. It started at 1% and rose to 2% on 29 May 2025.
  - Most of it is deleted from the game.
  - A small part buys a set number of specific items from players each week and deletes them (the "item sink"), to hold their prices up and keep old content relevant.
  - -- [OSRS Wiki: Grand Exchange](https://oldschool.runescape.wiki/w/Grand_Exchange); [OSRS Wiki: Old School Economy - Future Plans](https://oldschool.runescape.wiki/w/Update:Old_School_Economy_-_Future_Plans)
- Guild Wars 2 Trading Post:
  - 5% listing fee, non-refundable and charged up front. It also stops players using the Trading Post as free storage.
  - 10% exchange fee on the sale.
  - Sellers keep 85%. The fees are described as a gold sink that limits inflation.
  - -- [GW2 Wiki: Trading Post](https://wiki.guildwars2.com/wiki/Trading_Post); [Scout Warband: Trading Post basics](https://scoutwarband.com/trading-post-basics/)
- Black Desert Imperial Cooking/Alchemy Delivery, an NPC that buys crafted food boxes (a capped faucet):
  - Your daily box allowance is Contribution Points / 2 (e.g. 250 CP gives 125 boxes). It resets once a day.
  - Each NPC also has its own channel limit "in the hundreds".
  - Cooking mastery adds up to +144.9% to the payout.
  - -- [BDO Crafting Lab: Imperial Cooking](https://www.bdocraftinglab.com/guides/imperial-cooking); [Pearl Abyss forum: Imperial Cooking daily max](https://blackdesert.pearlabyss.com/ASIA/en-us/Forum/ForumTopic/Detail?_topicNo=30741); [Saarith: Imperial Crafting Delivery explained](https://saarith.com/bdo-imperial-crafting-delivery-explained/)
- Lost Ark: only 6 characters per roster may earn gold from weekly raids; you assign them as "gold earners" each reset. Gold is shared across the roster. This caps the faucet per account rather than per character. -- [Icy Veins: How to earn gold in Lost Ark](https://www.icy-veins.com/lost-ark/how-to-earn-gold-in-lost-ark); [Maxroll: Lost Ark gold and silver](https://maxroll.gg/lost-ark/resources/how-to-make-gold-silver)
- FFXIV housing as a gil sink:
  - Plot prices in that notice: small 1,488,000-1,860,000 gil; medium 7,936,000-9,920,000; large 19,840,000-24,800,000.
  - Unsold plots lose about 14% every 6 hours, down to half price over 30 days.
  - Buying removes the gil from the game.
  - Historical: these come from an older Lodestone notice, the devaluation % is per search summary, and the current FFXIV system was not checked.
  - -- [FFXIV Lodestone: Additional Plots and Housing Price Adjustments](https://na.finalfantasyxiv.com/lodestone/topics/detail/611a2417fbdd247a18a619409302b2896cea7f52); [FFXIV forum: housing devaluation](https://forum.square-enix.com/ffxiv/threads/377242); [FFXIV forum: housing price thread](https://forum.square-enix.com/ffxiv/threads/128601)
- Albion Online personal island upgrade ladder (the game's personal farm/house plot), regular price, after the 16 Oct 2023 rework to multipurpose plots. These come from third-party tables; verify against the wiki.

  | Level | Plots (regular + small) | Cost of this step (silver) | Total so far (silver) |
  |---|---|---|---|
  | L1 | 1 | 1,000,000 | 1,000,000 |
  | L2 | 3 + 2 | 2,500,000 | 3,500,000 |
  | L3 | 6 + 2 | 4,000,000 | 7,500,000 |
  | L4 | 9 + 2 | 5,000,000 | 12,500,000 |
  | L5 | 12 + 2 | 6,000,000 | 18,500,000 |
  | L6 | 16 + 2 | 8,000,000 | 26,500,000 |

  A first-island discount drops L1 to 20,000 silver and the whole first ladder to about 6.5M. -- [AlbionOnlineGrind: island upgrade cost](https://albiononlinegrind.com/table/island-upgrade-cost); [Albion Codex: island guide](https://www.albioncodex.com/guides/albion-online-island-guide); [Albion Wiki: Player Island](https://wiki.albiononline.com/wiki/Player_Island)
- Price-curve reference from idle games:
  - Purchase n+1 costs base x growth^n.
  - Example: AdVenture Capitalist's Lemonade Stand has base 4 and growth 1.07, so the 11th stand costs 4 x 1.07^10 = 7.87.
  - Costs grow exponentially while output grows linearly or polynomially, which keeps each next purchase a meaningful sink.
  - -- [Game Developer: The Math of Idle Games, Part I (Pecorella, 2016)](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i); [GDC Europe 2016 slides, Pecorella](https://media.gdcvault.com/gdceurope2016/presentations/Pecorella_Anthony_Quest%20for%20Progress.pdf)
- Warning (anecdote, low weight): one MMORPG with fluctuating NPC prices on a fixed, depletable supply ran into trouble once players crafted at scale, because NPC shops had fixed limits on what they would buy. -- [GameDev.net: MMO RTS trade system thread](https://gamedev.net/forums/topic/582659-mmo-rts-trade-system/4708015/?page=1)

### Inferences
- **Classify every farm output.**
  - An NPC sale is a faucet: new gold.
  - A player sale through the order book is a transfer, and a sink if a fee is taken.
  - Eating or using the item is an item sink, which keeps produce prices up.
  - A healthy farm sends most produce into consumption and player trades, and only a capped trickle to NPCs for gold.
- **If an NPC buys produce, cap it per identity per day** (the BDO approach), or pay a low fixed price that works as a floor (the OSRS-alch approach), not as the main income. With cheap free identities (see section 5), an uncapped NPC buyer times unlimited alt farms means unlimited gold.
- **Order-book fee.** BroTown already settles a market and order book on the server (per repo CLAUDE.md). A small seller fee (OSRS 2%; GW2's 15% is the high end) is a steady sink on all trade, including produce. A cap per trade (OSRS 5M) avoids punishing big trades.
- **Expansion ladder.** These ratios are computed from the cited tables.
  - Albion's step costs grow 2.5x, then 1.6x, 1.25x, 1.2x and 1.33x.
  - Its price per added plot rises from about 625k (L2: 2.5M for 4 plots) to about 2M (L5-L6), roughly 3.2x.
  - The total ladder is 26.5x the first step.
  - FFXIV size tiers cost about 1 : 5.3 : 13.3.
  - **Suggested shape for BroTown:** a near-free first plot (onboarding), then steps costing about 1.25-2.5x the previous one, with the per-plot price climbing about 3x across the ladder.
  - Price each step in "days of capped free-tier farming income", so that a 2-hour-a-day player reaches the top of the ladder over weeks to months, not days.
- **Devaluing prices.** FFXIV's devaluing land prices show that time-decaying prices can clear unsold scarce slots. BroTown's plots are presumably instanced and not scarce, so a decay is not needed.

### Gaps
- Faucet/sink measurements from EVE's monthly economic reports or academic work were not gathered (search budget).
- No reliable example with numbers was found for NPC buy prices that fall as you sell more of the same item.
- Hay Day, Stardew and FarmVille expansion price curves were left to the researchers covering those games.
- FFXIV housing figures may be outdated: later patches changed plot sales, and this was not verified.
- Cookie Clicker's often-quoted 1.15 growth rate was not confirmed, so it is not used.

## 4. Quest-item and daily-order demand for farm produce (and not forcing non-farmers to farm)

### Takeaway
Turn-in systems create recurring but CAPPED demand:
- FFXIV Grand Company: one request per crafting class and per gathering class per day, with high-quality items paying double.
- FFXIV Custom Deliveries: 12 a week, at most 6 per NPC.
- WoW cooking dailies: pay in a profession currency.
- Hay Day order board: up to 9 orders at level 32.

They avoid forcing non-farmers in three ways:
- accepting market-bought items (FFXIV says so explicitly);
- paying mostly in XP or profession currency instead of gating main progression;
- capping by day or week so they never become an unlimited faucet.

### Cited Findings
- FFXIV Grand Company Supply & Provisioning missions:
  - ONE daily request per crafting class and per gathering class.
  - Rewards: that class's EXP plus Company Seals.
  - High-quality (HQ) crafted turn-ins pay DOUBLE EXP and seals; starred items pay extra.
  - Resets daily at 8 PM GMT.
  - Items can be bought on the Market Board; "you do not need to craft or gather the items yourself".
  - -- [FFXIV Wiki: GC Supply and Provisioning Missions](https://ffxiv.consolegameswiki.com/wiki/Grand_Company_Supply_and_Provisioning_Missions); [Gamer Escape: Supply and Provisioning Mission](https://ffxiv.gamerescape.com/wiki/Supply_and_Provisioning_Mission); [Icy Veins: Grand Companies](https://www.icy-veins.com/ffxiv/grand-companies)
- FFXIV Custom Deliveries:
  - At most 12 delivery allowances per week, at most 6 per NPC.
  - Rewards: crafter or gatherer scrips, EXP and a little gil, scaled by the item's "collectability".
  - An NPC already at max friendship sometimes offers a weekly bonus delivery type.
  - -- [FFXIV Wiki: Custom Deliveries](https://ffxiv.consolegameswiki.com/wiki/Custom_Deliveries); [Icy Veins: Custom Deliveries](https://www.icy-veins.com/ffxiv/custom-deliveries-for-crafting-and-gathering)
- WoW cooking dailies (from Cataclysm, 2010, historical):
  - City cooking dailies (e.g. Marogg in Orgrimmar, Robby Flay in Stormwind) pay Chef's Awards and +1 or +2 Cooking skill.
  - Recipes cost about 3 Chef's Awards each.
  - Finishing them all takes at least five days (the achievement "Let's Do Lunch").
  - -- [Wowpedia: Chef's Award](https://wowpedia.fandom.com/wiki/Chef's_Award); [Warcraft Wiki: Daily cooking quests](https://warcraft.wiki.gg/wiki/Daily_cooking_quests); [Warcraft Tavern: Cataclysm cooking dailies](https://www.warcrafttavern.com/cataclysm/guides/cooking-daily-quests/)
- Hay Day order board (demand side only):
  - Starts with 1 order and grows to a maximum of 9 at experience level 32.
  - Each order shows its coin and XP reward. A rejected order is replaced after a few minutes.
  - Players hold high-value orders for "truck event" days, when they pay double coins/XP.
  - -- [Hay Day Wiki: Truck](https://hayday.fandom.com/wiki/Truck); [iMore: Hay Day tips](https://www.imore.com/hay-day-top-six-tips-tricks-and-cheats); [Supercell support: Boat orders](https://support.supercell.com/hay-day/en/articles/boat-orders-3.html)
- Black Desert Imperial delivery (section 3) is the same idea for crafted food: a daily-capped NPC buyer whose pay grows with skill mastery. -- [BDO Crafting Lab: Imperial Cooking](https://www.bdocraftinglab.com/guides/imperial-cooking)

### Inferences
- **How much demand a turn-in creates:** roughly the cap times the number of active players times the items per turn-in. A daily order wanting 5 of a crop, done by 100 players, consumes 500 of that crop a day. Because it is capped, designers can predict it. No game published actual volumes (see Gaps).
- **Make produce turn-ins PURCHASABLE (the FFXIV pattern).** Combat-focused players then buy produce from farmers on the order book. Farmers get a market, and nobody has to farm. This is the main lever for "farming matters to non-farmers without being forced on them."
- **Keep required farm items off the main combat quest chain**, or make them buyable. Pay daily orders mostly in XP, tokens or cosmetics plus a little gold, as the WoW and FFXIV token pattern does, so order boards don't become an uncapped gold faucet.
- **Scale with skill.** HQ double pay (FFXIV) and mastery bonuses (BDO) reward farming skill without changing what non-farmers must do. They fit BroTown's existing per-level gathering requirements (GATHER_REQ_LVL, per repo CLAUDE.md).

### Gaps
- No published numbers were found on how much market demand order boards or turn-ins actually create (volumes, price effects).
- No case study was found of player backlash against profession-locked quest requirements (not searched; search budget exhausted).
- Hay Day order-board reward formulas (coins vs market value) were left to the Hay Day researcher.

## 5. Server timers, clock exploits, and bot/multi-account farming abuse (with countermeasures)

### Takeaway
- **Timers.** Clock-skipping on phones is an old, documented exploit (DEF CON Kids, 2011). The standard fix is to store absolute server timestamps and let the server decide when a timer is done; never trust the client's clock.
- **Bots and alt armies.** Timer farms are cheap to run in bulk:
  - Albion bans thousands of accounts a month, and its one-island-per-character, 3-characters-per-account rule invites "20 alts with islands".
  - OSRS banned about 7M bots in 2023.
  - ArcheAge's land rush was won by hacks.
- **Countermeasures that work:**
  - caps per account rather than per character (Lost Ark);
  - trade limits on new accounts (OSRS: 20 hours played, 10 quest points, 100 total level);
  - daily sell caps (BDO);
  - rules against multi-account cooperation (Albion);
  - mass bans.

### Cited Findings
- Clock exploits (historical, 2011): at DEF CON 19's DEF CON Kids, a 10-year-old ("CyFi") disclosed a class of "zero-day" exploits in iOS/Android timer games: moving the device clock forward to skip waits such as farming-style growth timers. This is hard to detect when the device is offline, and small step-by-step clock changes are harder still. -- [Tom's Guide: 10-year-old girl reveals exploit in Android, iOS game](https://tomsguide.com/us/Zero-Day-Exploit-DEFCON-19-DEFCON-Kids,news-12106.html)
- Developer practice (practitioner sources, not academic):
  - Keep timers on the server, with a trusted clock.
  - The client REQUESTS a reward, and the server checks it before the UI updates.
  - Test device-time changes, offline mode and repeated claims.
  - "Never trust the client."
  - -- [Unreal Engine forums: prevent change device time daily reward cheat](https://forums.unrealengine.com/t/android-prevent-change-device-time-daily-reward-cheat/454841); [GameSalad forums: prevent cheat in a time-based system](https://forums.gamesalad.com/discussion/42725/prevent-cheat-in-a-time-based-system); [Medium: anti-cheat tutorial for Unity mobile games](https://medium.com/@IAMFANTASYSTORYTELLER/anti-cheat-system-tutorial-in-unity-mobile-games-2026-f45bc401b5cc)
- Albion Online bans:
  - "Nearly 39,000 accounts" banned for cheating or botting over a few months (MMORPG.com; year not confirmed in the snippet).
  - 13,495 accounts banned in one December for botting, real-money trading (RMT) or cheats.
  - 8,500+ bot accounts and 4,600 RMT accounts banned in January 2024.
  - Using a cheat program even once means a permanent ban.
  - -- [MMORPG.com: Albion banned nearly 39,000 accounts](https://www.mmorpg.com/news/albion-online-has-banned-nearly-39000-accounts-for-cheating-and-botting-since-march-2000127935); [Albion forum: Botting and Account Security Update, Feb 15 2024](https://forum.albiononline.com/index.php/Thread/192667-Botting-and-Account-Security-Update-February-15-2024/); [Albion forum: Bots, Bans & Account Security Update (Dec)](https://forum.albiononline.com/index.php/Thread/219849-Bots-Bans-Account-Security-Update-December-1st-31st/); [Albion forum: Botting and speed-hacking update, May 10](https://forum.albiononline.com/index.php/Thread/181016-Botting-and-Speed-Hacking-Update-May-10/)
- Albion multi-account rules and island alts:
  - Multiple accounts are allowed.
  - Characters logged in at the same time may NOT interact, trade, cooperate or support each other outside player islands, guild islands, cities or guild territories. They may not fight together or scout for each other.
  - Playing several characters at once requires active Premium.
  - Each character may own one personal island, with 3 characters per account, so one person can run many farm islands. Alts need 30 days of Premium to build one.
  - Forum threads describe "20 alts with islands and farms for massive farming", and alt islands are used to feed a main character's laborers.
  - -- [Albion forum: Reminder: Rules on Multiple User Accounts](https://forum.albiononline.com/index.php/Thread/140380-Reminder-Rules-on-Multiple-User-Accounts/); [MMORPG.com: Albion reminds us of multi-account rules](https://www.mmorpg.com/news/albion-online-reminds-us-of-multi-account-rules-2000120113); [Albion forum: 20 alts with islands and farms](https://forum.albiononline.com/index.php/Thread/36390-20-Alts-with-islands-and-farms-for-massive-farming/); [Albion forum: Can I get multiple islands?](https://forum.albiononline.com/index.php/Thread/62323-Can-i-get-multiple-islands/)
- OSRS bot scale (2026 figures are from secondary press; dates per search summary):
  - Jagex said it banned about 6.9-7 million bot accounts in 2023 (PC Gamer, 2024).
  - Jagex reported averaging 67,000+ OSRS account bans per week in 2024.
  - A 2026 report says more than 1 million macro accounts were banned in January 2026, against 582,000 in December 2025, and more than 1 trillion GP of cheat-made gold was removed.
  - Notebookcheck reports 6.2 million bans (period unclear), with prices of heavily botted items rising 40-90% once bot supply vanished.
  - -- [PC Gamer: Jagex banned 7 million bots last year](https://www.pcgamer.com/old-school-runescape-players-revolt-after-new-big-money-owners-say-bots-are-fine-actually-devs-furiously-walk-it-back-and-say-they-banned-7-million-bots-last-year/); [Jagex: Bots, Bans and Appeals: An Update](https://secure.runescape.com/m=news/a=870/bots-bans-and-appeals-an-update?oldschool=1); [GameFragger: 1 million bots banned in one month](https://gamefragger.com/multiplatform/massively-multiplayer/jagex-has-banned-over-1-million-bots-on-old-school-runescape-in-one-month-a27962); [Notebookcheck: Jagex bans 6.2 million bots](https://www.notebookcheck.net/Old-School-RuneScape-finally-feels-fair-again-as-Jagex-bans-6-2-Million-bots.1313053.0.html)
- OSRS trade limits on new accounts (a countermeasure):
  - New free-to-play accounts cannot sell commonly botted items (e.g. oak logs, feathers, runes) on the Grand Exchange until they have 20 hours logged in, 10 quest points and 100 total level.
  - Free players get 3 Grand Exchange slots, against 8 for members.
  - -- [OSRS Wiki: Grand Exchange](https://oldschool.runescape.wiki/w/Grand_Exchange); [OSRS Money Making Guide: new account restrictions](https://osrsmoneymaking.guide/news/osrs-new-account-restrictions-what-you-need-to-know-in-2025/)
- ArcheAge (2014 Western launch, historical; blog and forum-grade sources):
  - Limited land plots were taken by hacks or bots "almost instantly" when freed, with the same names on many houses.
  - In the Auroria expansion, land was claimed by hacks as soon as castles were placed.
  - Archeum trees were disabled after a massive bot attack.
  - -- [Aywren's Nook: Breaking ties with ArcheAge](https://aywren.com/2014/11/06/breaking-ties-with-archeage/); [Rift Universe: Trion gives bots the smackdown](http://riftuniverse.com/news/archeage-trion-gives-bots-the-smackdown/); [Wikipedia: ArcheAge](https://en.wikipedia.org/wiki/ArcheAge)
- Per-account and daily caps as anti-farm tools: Lost Ark's 6 gold earners per roster and BDO's daily delivery cap (Contribution Points / 2). Sources are in section 3.

### Inferences
- **Timers.**
  - Store absolute server timestamps on each planted plot (planted-at, ready-at, from the worker's clock).
  - Work out growth when the player harvests ("is now >= ready-at?"), not with a ticking loop. This is cheap on a Durable Object and immune to device clocks.
  - The client only shows a countdown. A harvest request before ready-at is refused, like any other client request that has not been allowed on purpose (the wire-protocol rule in repo CLAUDE.md).
  - This also gives offline growth for free.
- **Cheap identities.** BroTown's identity is a per-browser id from a silent passphrase, and `?guest=1` makes another one (per repo CLAUDE.md). Making free identities is therefore almost free. Timer farms suit bots and alts especially well: a few taps per cycle, no combat skill needed.
- **Defences that follow:**
  - cap any NPC gold faucet per identity per day;
  - limit what NEW identities can sell on the order book until they reach some playtime or level (the OSRS 20 h / 10 QP / 100 total pattern);
  - make the most valuable farm outputs character-bound, or used up on the spot (buff food), rather than tradeable gold-equivalents;
  - watch for many identities sharing an IP or device, or harvesting at identical timings.
- **The 2-hour cap must count the person, not just the identity.** If the free-tier cap counts per identity, alt-hopping defeats it. Per Albion's experience, account-level rules (one farm per player, no multi-identity cooperation) need detection to mean anything.

### Gaps
- No published numbers were found on the share of farm/gathering output made by bots in Albion or OSRS. Only ban counts were found.
- Albion's laborer-journal botting and specific gathering-bot countermeasures were only mentioned, not detailed.
- No source was found on server-time design specifically for Cloudflare Durable Objects or web clients. The inference above is general practice.
- The exact year of the MMORPG.com "39,000 accounts" Albion figure and the period of Notebookcheck's 6.2M figure are unconfirmed.

## 6. Session-design ethics for a phone game with a daily play cap (appointments, notifications, withering vs forgiving, offline progress)

### Takeaway
- "Playing by appointment" is a recognised TEMPORAL dark pattern (Zagal, Bjork & Lewis, 2013).
- FarmVille's withering crops are the punishing archetype: your absence destroys your earlier effort.
- Forgiving designs turn absence into a banked bonus instead:
  - WoW rested XP: 5% of a level per 8 hours, up to 150%;
  - Lost Ark's rest bonus doubles later rewards;
  - Honkai: Star Rail stores overflow stamina, up to 2,400 points over 30 days.
- Making offline growth a PAID-only perk (ArcheAge: subscribers regenerated labor offline, free players only online) was resented.
- Apple requires that push notifications are never needed for the app to work, and that marketing pushes are explicitly opted into and can be turned off.

### Cited Findings
- Academic: Zagal, Bjork & Lewis, "Dark Patterns in the Design of Games" (FDG 2013).
  - They sort dark patterns by what the player is tricked into spending: time, money or social capital.
  - "Playing by Appointment" is a TEMPORAL dark pattern: the game, not the player, decides when play must happen. "Grinding" sits in the same group.
  - Later work looks at dark patterns in mobile free-to-play games and at designing "healthy, highly-engaging" mobile games.
  - -- [Zagal, Bjork, Lewis 2013 (DiVA full text)](https://www.diva-portal.org/smash/get/diva2:1043332/FULLTEXT01.pdf); [CORE copy](https://core.ac.uk/reader/301007767); [DiGRA: occurrences of dark patterns in mobile F2P games](https://dl.digra.org/index.php/dl/article/download/2765/2749); [ACM CHI EA 2022: A Game of Dark Patterns -- designing healthy, highly-engaging mobile games](https://dl.acm.org/doi/fullHtml/10.1145/3491101.3519837); [DiGRA 2020: Against "Dark Game Design Patterns"](https://eprints.whiterose.ac.uk/id/eprint/156460/1/DiGRA_2020_paper_189.pdf) (a counter-argument paper; not read)
- FarmVille (2009, historical; commentary and press, not primary data):
  - Crops WITHER if not harvested in time ("appointment dynamics"), so hours of earlier clicking are wasted.
  - Commentators describe it as loss aversion turned into a weapon, plus social guilt: friends see your ruined farm.
  - One summary's claim about a "full-time behavioral psychologist" is unverified and NOT used.
  - -- [Founders Network: how FarmVille uses game mechanics](https://foundersnetwork.com/gamification-research-how-farmville-uses-game-mechanics-to-become-winning-addicting/); [Blue Ocean Thinking: remembering FarmVille](https://blueoceanthinking.substack.com/p/remembering-farmville-a-game-that); [Kotaku: Goodbye, FarmVille 2](https://kotaku.com/goodbye-farmville-2-its-been-fun-but-ive-had-enough-5945953)
- WoW rested XP (forgiving absence): one "bubble" (5% of a level) of rested XP builds up per 8 hours resting, up to 30 bubbles (150% of a level). -- [Icy Veins: Rested XP overview](https://www.icy-veins.com/wow/rested-xp-a-detailed-overview); [Wowpedia: Experience to level](https://wowpedia.fandom.com/wiki/Experience_to_level); [Warcraft Tavern: Classic rested experience](https://www.warcrafttavern.com/wow-classic/guides/rested-experience/)
- Lost Ark Chaos Dungeon rest bonus (the mechanic has been revised since the 2022 launch; treat as historical):
  - Daily "Aura of Resonance" left unused converts into a Rest Bonus (100 unused gives 20 Rest, stacking to 200).
  - A run with 40 Rest Bonus pays DOUBLE.
  - Skipping 2 days and doubling on day 3 loses only about 1 day of loot.
  - -- [Maxroll: General Chaos Dungeon guide](https://maxroll.gg/lost-ark/resources/general-chaos-dungeon-guide); [Lost Ark Wiki: Chaos Dungeon](https://lostark.fandom.com/wiki/Chaos_Dungeon)
- Honkai: Star Rail "Reserved Trailblaze Power" (v1.3, 30 Aug 2023), a forgiving overflow:
  - Stamina refills 1 per 6 minutes up to a 240 cap (24 hours).
  - Once capped, 1 point per 18 minutes goes into a reserve that holds up to 2,400, full after exactly 30 days.
  - Unlike Genshin Impact's resin, which simply stops at its cap, a break no longer wastes the daily allowance.
  - -- [Game8: What is Trailblaze Power](https://game8.co/games/Honkai-Star-Rail/archives/406311); [Pro Game Guides: Reserved Trailblaze Power explained](https://progameguides.com/honkai-star-rail/reserved-trailblaze-power-in-honkai-star-rail-explained/); [Sportskeeda: HSR 1.3 Reserved Trailblaze Power](https://www.sportskeeda.com/esports/news-honkai-star-rail-1-3-reserved-trailblaze-power-mechanic-exploring-details-facts)
- ArcheAge labor (offline progress as a PAID perk; historical, 2014):
  - Patrons (subscribers) regenerated 10 labor points per 5 minutes, online AND offline.
  - Free players regenerated 5 per 5 minutes ONLINE ONLY, with nothing offline.
  - Players disliked waiting on labor and saw it as a push toward paid labor potions.
  - -- [ArcheAge Wiki: Labor](https://archeage.fandom.com/wiki/Labor); [Steam discussion: will labor regen offline for free players?](https://steamcommunity.com/app/304030/discussions/0/35221031790246993/?l=portuguese&ctp=5); [MMOBomb: Labor points are a good idea with so-so implementation](https://www.mmobomb.com/labor-points-good-idea-implementation)
- Apple App Store Review Guideline 4.5.4:
  - Push notifications must not be required for the app to work.
  - They may NOT be used for promotions or direct marketing unless the user explicitly opted in through consent wording in the app's UI, and the app offers a way to opt out.
  - Apple relaxed the rule in March 2020 to allow opted-in marketing pushes.
  - -- [Apple: App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/); [App Store Review Guidelines History: March 2020 push change](https://www.appstorereviewguidelineshistory.com/articles/2020-03-04-push-notifications-marketing-and-more/); [MacRumors, 2020](https://www.macrumors.com/2020/03/04/apple-shares-updated-app-store-guidelines/)

### Inferences
- **Offline growth helps a capped free tier.** If crops grow on real (server) time while the player is away, the capped 2 hours go to harvesting, cooking, trading and fighting, not to watching timers.
- **No withering.** Hold the harvest without loss once it is ripe. The punishing FarmVille pattern is exactly the "appointment" dark pattern, and it clashes with a cap that already limits when you can play.
- **Bank missed days as a bonus.** The WoW, Lost Ark and Honkai: Star Rail style (e.g. a "well-rested soil" yield bonus that builds up while away, up to a cap) turns a missed day into a reason to come back, not a loss.
- **Don't make offline growth the paid perk.** ArcheAge did exactly that and it was resented. Keep offline growth free, and give the $2 pass conveniences that don't make free players' absence costly (e.g. more plots or faster timers).
  - Caution: faster timers for payers is itself pay-for-speed. Weigh it against the owner's plans; this is an opinion.
- **Timer lengths that fit one or two short visits a day.** Offer some long timers (e.g. 8-24 hours) so a once-a-day player loses nothing, plus short optional ones for players still in their session.
- **Notifications.** "Your crops are ready" is a functional notice, but it must be opt-in and can never be needed to play (Apple 4.5.4). Anything promotional needs explicit consent wording and an opt-out. Keep the cadence low: at most one farm notice a day.

### Gaps
- BroTown runs in mobile Safari as a web app (per repo CLAUDE.md). Web Push on iOS reportedly requires the site to be added to the Home Screen (iOS 16.4+); this was NOT verified in this session because the search budget ran out. This decides whether "crops ready" notices are possible at all.
- No data was found on push-notification opt-in rates or on how notification frequency affects retention in mobile games.
- No source was found on how a daily play cap (free tier) has been combined with offline progress in a shipped game, beyond ArcheAge's paid offline regen. The 2-hour cap plus offline growth interaction is reasoned, not evidenced.
- The DiGRA 2020 paper arguing against "dark game design patterns" was surfaced but not read, so the counter-arguments are not summarised.
