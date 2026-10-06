# Farming rewards and economy design (cross-game principles and numbers)

Status: IN PROGRESS (research started 2026-10-06). Sections are filled as findings come in.

## Food/consumable buff design in MMOs and ARPGs

(Note on method: most game wikis -- warcraft.wiki.gg, wiki.guildwars2.com, UESP, consolegameswiki, OSRS wiki, Albion wiki, fextralife -- were BLOCKED for full-page fetch by this session's egress proxy, so the numbers below come from web-search result summaries of those pages. The URL given is the page the search surfaced. Treat exact figures as "per search summary of that page" and spot-check before quoting in a player-facing doc.)

### Raw findings (batch 1)
- GW2: only ONE nourishment (food) effect at a time; nourishment and utility (enhancement) effects are separate slots and always stack with each other -- [GW2 Wiki: Nourishment](https://wiki.guildwars2.com/wiki/Nourishment); [MetaForge GW2 food guide](https://metaforge.app/guild-wars-2/the-definitive-food-guide-in-guild-wars-2)
- GW2: ascended (top-tier) food lasts 1 hour (and is placed as a 5-minute feast); all other food lasts 30 minutes unless stated -- [GW2 Wiki: Feast (food)](https://wiki.guildwars2.com/wiki/Feast_(food))
- GW2: food and utility buffs persist through defeat (death) and map changes; the timer keeps counting down -- [GW2 Wiki: Nourishment](https://wiki.guildwars2.com/wiki/Nourishment); [MetaForge](https://metaforge.app/guild-wars-2/the-definitive-food-guide-in-guild-wars-2)
- FFXIV: every meal grants "Well Fed": +3% EXP (combat, crafting AND gathering EXP) for 30 minutes on top of the meal's stat effects; eating more of the SAME food extends it to 60 minutes; only one meal active at a time (a different meal overwrites); some event meals give +4% EXP -- [FFXIV Wiki: Meals](https://ffxiv.consolegameswiki.com/wiki/Meals); [FFXIV Wiki: Well Fed](https://ffxiv.consolegameswiki.com/wiki/Well_Fed); [FFXIV Wiki: Experience](https://ffxiv.consolegameswiki.com/wiki/Experience)
- ESO: provisioning food/drink buffs last 30 minutes to 2 hours; only ONE provisioning consumable buff (food OR drink) can be active at a time -- [Tamriel Journal ESO provisioning guide](http://tamrieljournal.com/crafting-and-professions/provisioning/)
- ESO: since Patch 1.0.4 (2014, historical) food/drink buffs persist through death, like Mundus Stone buffs -- [Tamriel Journal](http://tamrieljournal.com/crafting-and-professions/provisioning/); [ESO forums: dual food/drink buff thread](https://forums.elderscrollsonline.com/en/discussion/108632/dual-food-drink-buff-one-disappears-after-death)
- WoW (Dragonflight, 2022-24, historical): ordinary Dragon Isles Well Fed buffs did NOT survive death; the crafted "Alchemical Flavor Pocket" embellishment doubled (+100%) Well Fed duration from Dragon Isles meals AND made it persist through death -- [Wowpedia: Alchemical Flavor Pocket](https://wowpedia.fandom.com/wiki/Alchemical_Flavor_Pocket); [Wowhead spell 372120](https://www.wowhead.com/spell=372120/alchemical-flavor-pocket)
- WoW (The War Within, 2024+): "Hearty" meals -- combine 5 of any food with 1 Artisan's Acuity to make a Warband-bound hearty version that lasts through death; normal food buffs are still lost on death (players' forum complaints, e.g. Earthen racial food) -- [Blizzard Watch: Hearty Meals](https://blizzardwatch.com/2024/05/22/hearty-meals-cooking-wow-war-within/); [Blizzard forums: Earthen Well Fed goes away after death](https://us.forums.blizzard.com/en/wow/t/earthen-well-fed-buff-goes-away-after-death/1943495)
- Diablo IV: elixirs last 30 minutes and persist through death; their XP bonus stacks with ONE incense; e.g. Elixir of Advantage +5% XP, Elixir of Advantage II +8% XP (launch-era values; check current season) -- [Fextralife D4 Elixirs](https://diablo4.wiki.fextralife.com/Elixirs); [PureDiablo Alchemist](https://www.purediablo.com/diablo4/Alchemist)

### Raw findings (batch 2)
- FFXIV: food stat boosts are a PERCENTAGE with a fixed CAP (e.g. HQ Apkallu Omelette "Critical Hit +5% (Max 27)"), so the same food helps a low-level character proportionally but its absolute value is bounded; food is crafted exclusively by the Culinarian crafting class; buff lasts 30 minutes -- [GameSkinny FFXIV food guide](https://www.gameskinny.com/tips/ffxiv-food-guide-with-stats-for-physical-damage-dealers-dddps/); [Gamer Escape: Consumables](https://ffxiv.gamerescape.com/wiki/Category:Consumable)
- Albion Online: food buff lasts 30 minutes; food is cooked by players at the Cook crafting station, buff type/potency set by the food's type and tier; whether the buff survives death has varied by mode and been debated on the forums (players proposed losing it on death specifically to raise food demand) and players have asked for the timer to PAUSE on logout (implying it keeps running offline) -- [Albion Wiki: Food](https://wiki.albiononline.com/wiki/Food); [Albion forum: Food usage balancing](https://forum.albiononline.com/index.php/Thread/29646-Food-Useage-Balancing-Suggestions-on-how-to-help/); [Albion forum: Food buff SHOULD pause on logout](https://forum.albiononline.com/index.php/Thread/187190-Food-Buff-SHOULD-Pause-On-Logout/) (exact current death rule NOT confirmed)
- New World: two kinds of food -- recovery food (health/mana over seconds; recovery effects cannot stack) and attribute food (+attributes; all attribute foods also give a "Well Fed" heal of 1% max health every 2.5 s that stops when you take damage); e.g. Light Ration: 40 health/s for 20 s plus the 1%/2.5 s regen for 20 minutes -- [StudioLoot New World consumables guide](https://www.studioloot.com/new-world/articles/beginners-guide-to-consumables-in-new-world/); [NWHub consumables](https://nwhub.gg/consumables/); [Fextralife NW Consumables](https://newworld.wiki.fextralife.com/Consumables)
- Path of Exile: flasks are NOT consumed -- they are permanent items whose charges refill by killing (normal monster 1 charge, magic 3.5, rare 6, unique 11) or returning to town; a town vendor sells level-appropriate flasks if none drop. A historical change: "one charge to a random unfilled flask per kill" made players equip a single best flask, so charges now rotate across non-full flasks -- [Maxroll PoE Flasks guide](https://maxroll.gg/poe/resources/flasks); [PoE Wiki: Flask](https://pathofexile.fandom.com/wiki/Flask?version=457dabec2960808edcece1098d7a34f4)
- Diablo III (2012, historical): replaced Diablo II potion spam with an emergency button -- instant heal of 60% max health, 30-second cooldown (spam would make characters effectively invincible) -- [Diablo Wiki: Potion](https://www.diablowiki.net/Potion)
- Diablo IV: healing potions drop from enemies/objects, charges came from regional Renown and potency upgrades from the Alchemist (NPC crafter using gathered herbs); per Game Rant, Season 11 removed Alchemist potion upgrades and moved to a fixed 4-potion capacity with a 30-second recharge (NOT independently verified) -- [Game8: Upgrade healing potion](https://game8.co/games/Diablo-4/archives/408512); [Game Rant: D4 Season 11 potion changes](https://gamerant.com/diablo-4-season-11-potion-changes-good-bad/)
- WoW The War Within (2024+): Well Fed food gives on the order of +446 Stamina (scaled to 126 for low levels) per Warcraft Wiki summary; Earthen racial "mineral" food was raised from +383 to +562 of a secondary stat after complaints -- [Warcraft Wiki: Well Fed](https://warcraft.wiki.gg/wiki/Well_Fed); [Blizzard Watch: Earthen food](https://blizzardwatch.com/2024/09/06/ingest-minerals/) (search-summary figures; low confidence on which food the 446 refers to)
- Consumable cost as a raid "tax" (Classic Era, community estimate): a casual raider spends ~15-40 gold/raid night on food, weapon oil and cheap elixirs; a progression raider 150-400+ gold/night, driven almost entirely by Black Lotus flask cost -- [Timesaver.gg: raid night cost in Classic Era](https://timesaver.gg/blog/how-much-gold-raid-night-cost-wow-classic-era) (third-party blog; no designer statement on a deliberate "consumable tax" was found)
- Mobile presentation -- AUTO-POTION is standard in mobile/cross-platform action RPGs: toggle on/off, pick the potion, set an HP% threshold (guides recommend ~20%), up to 4 consumable quick-slots each with its own trigger (HP%, MP%, "re-use when cooldown ends", on a status effect) -- [Ragnarok Landverse: Automated Battle System](https://maxion-1.gitbook.io/ragnarok-landverse-america/game-guide/automated-battle-system); [Aura Kingdom wiki: Auto-Potion System](https://aurakingdom.fandom.com/wiki/Beginning_Guide/Auto-Potion_System); [Undecember auto potion settings](http://www.vhpg.com/undecember-auto-potion-settings/)

## NPC-sold versus player-made consumables

(pending)

## Gold economy: faucets, sinks, sell caps, taxes, expansion pricing

(pending)

## Quest-item and daily-order demand for farm produce

(pending)

## Server timers, clock exploits, and bot/multi-account farming abuse

(pending)

## Session-design ethics for a phone game with a daily play cap

(pending)
