# Capture and pets in shared worlds: contested captures, group credit, trading, abuse, PvP loss, monetization rules, live-ops

Research date: 2026-10-06. Source caveat for the report writer: the agent proxy blocked most primary sites (pegi.info, Niantic help centre, Bulbapedia, Wowpedia, OSRS wiki, ark.wiki.gg, pathofexile.com, ftc.gov, kansspelautoriteit.nl, sensortower.com and others), and the session's shared web-search budget ran out before the last round. Only Apple's guidelines were read first-hand. Most findings come from search summaries of the pages linked, which are a mix of primary pages and secondary coverage. Items marked "(headline only)" were seen as a result title but not read. Each finding carries a "BroTown:" line. **Sections 8–10 were added after the owner's update** (weaken-to-20% was an early demo; the owner is considering placed traps with bait, befriending or egg drops on defeat, or capture tools that work at full HP). They were written after the search budget ran out, so they rely on two kinds of evidence. First, findings already sourced here, and findings the sibling notes `traps_and_hunting_skills.md` and `after_the_catch.md` sourced, re-cited to the original URLs those notes list. Second, BroTown's server code, read for this addendum (`server/src/pets.js`, `combat.js`, `index.js`, `gearprov.js`). BroTown today: weaken a monster to <=20% HP, then any player within ~200 px may spend a 20-gold basic trap. The chance is 40% + skill - 5% per level above you, clamped to 10-95%. A success removes the monster for everyone (no loot or XP). Pets: max 6, they follow and pick up loot, and they are untradeable.

**Evidence tags** (added at the coordinator's request). Every cited finding starts with one of these:
- **[source-read]**: the page or repo file was read directly. That covers Apple's guidelines and BroTown's code and CLAUDE.md.
- **[search-summary]**: taken from a search engine's digest of the linked page or pages.
  - "via sibling notes" means the sibling trapping researcher gathered the digest.
  - "headline only" means only the result title was seen.
- **[memory — unverified]**: the researcher's background knowledge. These appear ONLY in Gaps, as leads to verify.

The "BroTown:" lines and the Inferences are the researcher's reasoning; any BroTown code fact in them was read in the repo. Official pages tried and found blocked on 2026-10-06: support.google.com (Play policy), www.ftc.gov, consumer.ftc.gov, pegi.info, europarl.europa.eu, kansspelautoriteit.nl.

## 1. Contested captures: who may capture a creature someone else damaged, and what fixes games shipped

### Takeaway
Games that left capture open to whoever acts first (Palworld; classic WoW tagging) drew steal complaints. Every widely praised fix does one of three things: it locks the creature to the first engager (WoW pet battles phase you in with the pet; ARK gives taming rights to whoever knocked it out); it gives every contributor their own reward or catch (Pokemon GO raids, Monster Hunter, Guild Wars 2); or it shares the tag among a capped group (WoW's 5-player tapping since Legion, cross-faction since Dragonflight). BroTown's current rule has the same shape as Palworld's: any nearby player can trap a monster someone else weakened.

### Cited Findings
- [search-summary] **Palworld, no protection:** when players weaken an open-world Pal together, whoever throws a Pal Sphere first catches it. A player who never attacked can take it by throwing faster. Players asked for a timed lock to the first attacker or group (player forum and guide; not an official statement). — [Steam: "Pals get caught by other players"](https://steamcommunity.com/app/1623730/discussions/0/4203615689065956058/); [TheGamer multiplayer guide](https://www.thegamer.com/palworld-multiplayer-guide/)
  - BroTown: the current "any player within ~200 px can trap at <=20% HP" rule is this model. Expect the same capture-steal complaints the first time two players share a spawn.
- [search-summary] **WoW classic tagging:** only the first player to damage a mob got credit (described in 2026 player threads asking for retail-style shared tags). — [Blizzard EU forum: "We need Retail-style multi-tagging"](https://eu.forums.blizzard.com/en/wow/t/we-need-retail-style-multi-tagging-shared-tap-for-named-and-quest-mobs/630766)
  - BroTown: first-tag is simple and server-cheap, but it makes contested spawns adversarial.
- [search-summary] **WoW Legion fix (patch 7.0.3, 19 July 2016):** creatures could be tapped by up to 5 other characters. Quest mobs got multi-player tapping, and anyone with the right profession could gather from the same node. In retail today, up to five ungrouped players tap with any hostile action, and players beyond five share quest credit for named mobs. — [Wowpedia: Tap](https://wowpedia.fandom.com/wiki/Tap); [MMO-Champion: Legion Bottleneck Solutions](https://www.mmo-champion.com/threads/1926619-Legion-Bottleneck-Solutions); [Blizzard EU forum](https://eu.forums.blizzard.com/en/wow/t/we-need-retail-style-multi-tagging-shared-tap-for-named-and-quest-mobs/630766)
  - BroTown: a capped shared tag (for example, up to 5 contributors) is the proven middle ground for kill credit. Capture still has to name one owner for the pet.
- [search-summary] **WoW Dragonflight pre-patch (Oct 2022):** Horde and Alliance share mob tags while ungrouped. Five players can tap one mob for loot and XP. It is off for players with War Mode (PvP) enabled. — [Wowhead](https://www.wowhead.com/news/share-mob-tags-across-factions-starting-with-the-dragonflight-pre-patch-329345); [Blizzard Watch](https://blizzardwatch.com/2022/10/20/mob-tagging-dragonflight/); [Massively OP](https://massivelyop.com/2022/10/13/world-of-warcraft-will-finally-let-horde-and-alliance-share-mob-tagging-with-dragonflight/)
  - BroTown: cooperation rules can switch off in the PvP ring. Inside "No man's land", a contested capture can stay competitive by design, as long as it is signposted.
- [search-summary: headline only] **WoW Forever, 2026 (headline only):** Blizzard reportedly kept first-tag ("must hold the line") while players "queue for rocks", meaning they line up for contested nodes. — [wowforeverbuilds.com](https://wowforeverbuilds.com/news/no-shared-tagging-in-wow-forever-blizzard-says-it-must-hold-the-line-even-as-pla); [wowsod.pro](https://wowsod.pro/articles/wow-forever-shared-tagging-hold-the-line); [wowhandbook.com](https://wowhandbook.com/news/no-shared-tagging-in-wow-forever/)
  - BroTown: exclusive rights on shared spawns produce queues. Rare capturable spawns need either a per-player copy or a frequent respawn.
- [search-summary] **WoW pet battles, the creature taken out of contention:** engaging a wild pet phases you out of the world with it. In PvP zones another player's attack breaks the battle; you get a 3-second shield absorbing 50%, and "the same exact wild pet" respawns for you afterwards. — [WarcraftPets guide](https://www.warcraftpets.com/wow-pet-battles/); [Wowpedia: Pet Battle System](https://wowpedia.fandom.com/wiki/Pet_Battle_System)
  - BroTown: once someone starts a capture (trap thrown or capture window opened), the monster could become untargetable by others or "reserved" for a few seconds. That is the cheap server-side form of phasing.
- [search-summary] **WoW capture rules:** you can trap a pet only below 35% health. A trap attempt uses your turn, only one pet can be captured per battle, and you can hold at most 3 of a species. — [Wowhead: Draenic Trap](https://www.wowhead.com/pet-ability=1368/draenic-trap); [WoWWiki archive: Pet capture](https://wowwiki-archive.fandom.com/wiki/Pet_capture)
  - BroTown: the <=20% threshold matches the genre. A per-species cap like WoW's 3 would limit hoarding and any future market supply.
- [search-summary] **Pokemon GO raids, everyone gets their own catch:** after the boss falls, each trainer receives their own Premier Balls. The count depends on their damage, whether their team controls the gym, and how fast the raid ended. The balls are not shareable and vanish after the catch phase. — [GO Hub raid guide](https://pokemongohub.net/post/guide/go-hub-guide-to-raid-battles/); [Pokemon GO Wiki: Raid Battle](https://pokemongo.fandom.com/wiki/Raid_Battle); [Niantic Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/2739-i-m-unable-to-catch-a-raid-boss-after-defeating-it/)
  - BroTown: for elite or boss monsters, each contributor could get a private trap attempt on their own copy. More damage could earn extra attempts or a better chance, so there is nothing to steal.
- [search-summary] **Pokemon Scarlet/Violet Tera Raids:** after a win, every participating trainer may try to catch the raid Pokemon; the catch is not guaranteed. — [Pokemon Wiki: Tera Raid Battle](https://pokemon.fandom.com/wiki/Tera_Raid_Battle); [Pocket Tactics](https://www.pockettactics.com/pokemon-scarlet-violet/tera-raid-battles)
  - BroTown: the same per-participant model, now standard across the franchise.
- [search-summary] **ARK taming rights (player forum, not verified):** rights go to whoever knocked the creature out, or whoever put the first food in its inventory. — [Steam: "Tame/steal enemy dinos mechanic"](https://steamcommunity.com/app/346110/discussions/0/152391995409001686/); [Steam: "Can I knock out a tamed dino and retame it?"](https://steamcommunity.com/app/346110/discussions/0/451848854999660105)
  - BroTown: "the player who brought it to <=20% owns the capture window" is a recognised norm. It needs no new UI, only a server-side owner field.
- [search-summary] **Guild Wars 2, the canonical kill-steal fix:** every player who joins an event gets 100% of the experience with no party needed. Loot is rolled for each participant "as if they were the only participant", and one hit counts. Chests are effectively per player. — [GW2 Wiki: Dynamic event](https://wiki.guildwars2.com/wiki/Dynamic_event); [GW2 forum archive: kill stealing](https://forum-en.gw2archive.eu/forum/game/gw2/kill-stealing); [Steam: GW2 loot discussion](https://steamcommunity.com/app/1284210/discussions/0/2954914688120405445/)
  - BroTown: when a monster is captured, everyone who damaged it could still get kill XP, quest credit and their own loot roll. Today's "no loot or XP for anyone" lets one trapper deny a whole group's rewards.
- [search-summary] **Monster Hunter, capture as a team result:** in MH: World one hunter captures and everyone gets the rewards. Rise made some super-rare parts carve-only. In Wilds no material is exclusive to carving or capturing. — [Steam: MH World "Capture or Kill?"](https://steamcommunity.com/app/582010/discussions/0/1737760710136144371/); [PC Gamer](https://www.pcgamer.com/games/action/monster-hunter-wilds-capture/)
  - BroTown: capture should never cost the group anything. The capturer's pet should be an extra on top of the party's normal kill rewards.
- [search-summary: headline only] **Monster Hunter Wilds friction (headline only):** Steam threads titled "F those who capture." and "stop capturing every hunt" show some players resent a teammate choosing capture for the group. — [Steam thread 1](https://steamcommunity.com/app/2246340/discussions/0/599646477861580974/?ctp=15); [Steam thread 2](https://steamcommunity.com/app/2246340/discussions/0/599646234919049848/?ctp=11)
  - BroTown: if capture ever replaces the kill's loot, party members will feel robbed. Keep the kill rewards whole.

### Inferences
- The strongest fix for BroTown's open-world monsters is an owner on the capture window. The first damager's party, or the top contributor, holds an exclusive trap right while the monster is <=20% HP. Others cannot throw traps at it, but can still help kill it.
- On capture, the server should pay the kill credit (XP, quest progress, shard drops) to every contributor, Monster Hunter and GW2 style. Only the pet goes to the trapper.
- For rare "alpha" or elite spawns, a Pokemon GO raid model (each contributor gets their own attempt, more damage buys more attempts) removes competition entirely. It needs per-species caps so pets do not inflate.
- Inside No man's land, a deliberately contested capture fits the zone's PvP identity, provided it is clearly signposted, as WoW keeps tags separate in War Mode.

### Gaps
- No official Pocketpair statement or patch note on capture ownership was found. The Palworld behaviour comes from player forums.
- The official ARK rule on whether an enemy can claim a knocked-out tame was not verified: forum answers conflict and ark.wiki.gg was blocked.
- The exact WoW Mists-era rare-mob tagging changes (for example the Timeless Isle) were not verified; Wowpedia was blocked.
- [memory — unverified] Lead: the Timeless Isle (patch 5.4, 2013) is remembered as letting anyone who hit a rare elite loot it. That would be an early shared-tag experiment before Legion's general rule.

## 2. Group rules: does everyone in a party get the creature, or a reward?

### Takeaway
The successful pattern is "everyone gets a reward, but the creature is not cloned for free". Path of Exile first gave every party member the captured beast, then changed to a per-player roll tied to the party bonus. Pokemon GO and Scarlet/Violet give every participant an attempt, not a guaranteed creature. Monster Hunter and Guild Wars 2 give every participant full rewards.

### Cited Findings
- [search-summary] **Path of Exile Bestiary:** a beast captured in a party went into every member's menagerie, and the instance owner was always guaranteed it. Later the extra copies became a per-player roll, with the chance tied to the party's item-quantity bonus. Later still, Einhar throws the nets himself once a beast is below 50% life. — [PoE Wiki: Beast](https://pathofexile.fandom.com/wiki/Beast); [PoE forum: Bestiary party-play feedback](https://www.pathofexile.com/forum/view-thread/3349303); [Bestiary League FAQ](https://www.pathofexile.com/forum/view-thread/2091353)
  - BroTown: giving every party member the pet multiplies supply by party size, which is what PoE walked back. A per-member roll at a reduced chance is the tested compromise.
- [search-summary] **Pokemon GO raids:** each trainer has their own catch, and the ball count is weighted by their own damage, their team and the clear speed. — [GO Hub](https://pokemongohub.net/post/guide/go-hub-guide-to-raid-battles/)
  - BroTown: contribution-weighted attempts reward real help and stop leeching.
- [search-summary] **Monster Hunter:** capture rewards go to the whole hunting party. — [Steam: MH World](https://steamcommunity.com/app/582010/discussions/0/1737760710136144371/)
  - BroTown: the party's quest and XP progress should never depend on who threw the trap.
- [search-summary] **Guild Wars 2:** 100% XP and individual loot for every participant, with no party required. — [GW2 Wiki: Dynamic event](https://wiki.guildwars2.com/wiki/Dynamic_event)
  - BroTown: extending this to ungrouped helpers removes the "stranger stole my capture" feeling outside a party.
- [search-summary] **WoW:** retail lets up to five ungrouped players tap for loot and XP, and extra players share quest credit on named mobs. — [Blizzard EU forum](https://eu.forums.blizzard.com/en/wow/t/we-need-retail-style-multi-tagging-shared-tap-for-named-and-quest-mobs/630766); [Wowhead](https://www.wowhead.com/news/share-mob-tags-across-factions-starting-with-the-dragonflight-pre-patch-329345)
  - BroTown: capping shared credit (for example at 5) bounds the payout cost of a crowded spawn.

### Inferences
- Recommended BroTown party rule:
  - the trapper gets the pet;
  - every contributor gets normal kill rewards;
  - optionally, each other party member gets a small independent roll for their own copy (PoE's revised model), or a trapping-XP share.
- Group captures are where a pity counter is easiest to abuse, because alternate characters can farm attempts for one main. Any group roll should count against each recipient's own caps.

### Gaps
- No published data was found on how PoE's party change affected beast prices or player satisfaction.
- The exact current rules for Pokemon GO raid group sizes, and the ball formula, were not retrieved.

## 3. Trading creatures: rules, soulbound vs tradeable, and how creature markets inflated or crashed

### Takeaway
Pokemon GO, WoW and Roblox games show that tradeable creatures drive engagement and revenue. They also invite laundering, scams, dupes and price crashes. The guard-rails that worked:
- a creature can be traded only once;
- trading costs a scaling sink, and rare trades are limited per day;
- trade partners need a friendship or level gate and must be physically close;
- whole categories are untradeable (wild-caught or event-earned);
- per-species caps;
- a trade licence or quiz, trade history and in-game scam reports.

Selling tradeable pets for real money (WoW's Guardian Cub) crashed their in-game price and turned them into a cash-to-gold bridge.

### Cited Findings
- [search-summary] **Pokemon GO, untradeable categories:** Mythical Pokemon (Mew, Celebi, Jirachi, Deoxys, Darkrai, Genesect and more) cannot be traded, apart from Meltan and Melmetal. A Pokemon that has already been traded once cannot be traded again. — [Pokemon GO Wiki: Trading](https://pokemongo.fandom.com/wiki/Trading); [Bleeding Cool](https://bleedingcool.com/games/pokemon-gos-mythical-problem-deoxys-genesect-arent-tradable/); [Niantic Help Center: Trading](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/96-trading-pokemon/)
  - BroTown: "tradeable once" stops pets being laundered or flipped repeatedly. Story or event pets, and the starter pet, should be bound to the player.
- [search-summary] **Pokemon GO, special trades are expensive and limited:** one special trade per trainer per day; events sometimes allow more. Stardust cost:

  | | Good Friend | Great Friend | Ultra Friend | Best Friend |
  |---|---|---|---|---|
  | New to your Pokedex | 1,000,000 | not given | not given | 40,000 |
  | Already registered | 20,000 | 16,000 | 1,600 | 800 |

  These figures are from third-party guides. — [trainercodes.app](https://trainercodes.app/guides/trading-basics); [tool-hunt.com](https://tool-hunt.com/en/pokemon-go-special-trade-guide/)
  - BroTown: a gold fee that scales with the pet's rarity and drops with clan or friend standing is a sink that also deters alt-account funnelling. A daily cap on rare-pet trades limits mule chains.
- [search-summary] **Pokemon GO, distance:** trading requires being within 100 m by default. It was temporarily raised to 40 km for events, for example 15–18 Jan 2021 with a Community Day, and 8 Feb–1 Mar 2021 for Lunar New Year, Valentine's and GO Tour: Kanto. — [Serebii on X](https://x.com/SerebiiNet/status/1349780537544761344?lang=en); [Pokemon Blog](https://pokemonblog.com/2021/02/03/trade-range-will-be-increased-to-40-km-during-the-week-of-pokemon-go-tour-kanto/); [Leek Duck](https://leekduck.com/events/increased-trading-range-lunar-new-year/)
  - BroTown: "both players present at the town's trade post" (a place-based gate) is the web-game analogue. Relaxing it during events is a proven live-ops lever.
- [search-summary] **Pokemon GO, a reason to trade:** trade evolutions. Kadabra, Machoke, Graveler and Haunter evolve for 0 candy after a trade instead of 100; Boldore, Gurdurr, Karrablast and Shelmet instead of 200. Pokemon received in earlier trades qualify retroactively. — [Pokemon GO official post](https://pokemongolive.com/post/trade-evolution/); [TechRadar](https://www.techradar.com/news/new-pokemon-and-trade-evolution-come-to-pokemon-go)
  - BroTown: a cooperative bonus for traded pets (a trait or evolution unlocked by trading) builds social trading without needing an open market.
- [search-summary] **Pokemon GO, lucky trades:** traded Pokemon can become "lucky", with a higher IV floor and half-price Stardust power-ups. The odds were reported inconsistently (see Gaps). — [trainercodes.app](https://trainercodes.app/guides/trading-basics)
  - BroTown: a small random upside on trades makes trading feel good. It must never be sold.
- [search-summary] **Pokemon GO, trading's effect on revenue:** Sensor Tower headlined "Pokémon GO Daily Revenue Grows 39% Following Trading Update to $2.5 Million" (headline only). — [Sensor Tower](https://sensortower.com/blog/pokemon-go-daily-revenue)
  - BroTown: trading is one of the strongest engagement levers in a collection game. That is worth building, but only on the anti-abuse rails below.
- [search-summary] **WoW battle pets, cageable vs not:** to cage or release a pet it must be at full health and not in a battle slot. Wild-caught pets, collector's-edition, BlizzCon, store, promotion, anniversary and achievement pets cannot be caged. Some trading-card-game, archaeology, quest-reward, rare-drop and gold-bought pets can be. The rationale, as reported on forums, was that buying wild pets on the Auction House "would take away from the exploration/collection gameplay". — [Blizzard Support: Cannot Cage or Release a Battle Pet](https://us.battle.net/support/en/article/309267); [MMO-Champion](https://www.mmo-champion.com/threads/1151906-Pets-that-cannot-be-caged-and-sold); [GameFAQs](https://gamefaqs.gamespot.com/boards/534914-world-of-warcraft/63495030)
  - BroTown: a clean split is that wild-trapped pets stay bound (trapping is the activity) while rare-drop or crafted pets are tradeable. A wounded pet should be untradeable.
- [search-summary] **WoW Guardian Cub, a cash-bought tradeable pet:** the Pet Store's first tradeable pet (2012). It was account-bound for 24 hours, then sellable on the Auction House, and bound on use. Its gold value "plummeted soon after it appeared in the shop". After its retirement (2014) was announced, it "skyrocketed again". — [WarcraftPets: tradable pet](https://www.warcraftpets.com/news/guardian_cub_tradable_pet/); [WarcraftPets: retiring](https://www.warcraftpets.com/news/guardian-cub-retiring-from-blizzard-store-soon/); [Blizzard sneak peek](http://worldofwarcraft.blizzard.com/en-us/news/3665632)
  - BroTown: never sell tradeable pets for money. Unlimited cash supply destroys their in-game value and creates a money-to-gold pipeline, which is pay-to-win by proxy.
- [search-summary] **WoW pet market extremes:** the most valuable Auction House pets were scarce promotional or card-game pets, for example Spectral Tiger Cub ~615,818 gold and Ethereal Soul-Trader ~402,277 gold (undated price-tracker snapshot). — [WoW Price Hub](https://wowpricehub.com/pets)
  - BroTown: if pets trade, pets that can no longer be obtained become speculative luxury goods. Retired event pets should not be tradeable, or should come back.
- [search-summary] **ARK, tames as PvP plunder (forums):** players describe knocking out a defeated tribe's tames, herding them into a pen and claiming them. Others say an already-tamed creature cannot be claimed and that such reports were exploits. Insider theft is also reported: a tribe member unclaims the tames just before allies raid. — [Steam: "Enemy tribe claiming our dinos"](https://steamcommunity.com/app/346110/discussions/0/523890046881935098/); [Steam: "Can I knock out a tamed dino and retame it?"](https://steamcommunity.com/app/346110/discussions/0/451848854999660105); [Dododex tip](https://www.dododex.com/tips/giganotosaurus/10939/a-guy-joined-my-tribe-then-unclaimed-out-dinos-and-gave-them-to-his-mates-so)
  - BroTown: if pets ever become clan-shared, permission to release or transfer is a theft vector. Keep pets owned by one player.
- [search-summary] **Black Desert horse market:** horses are sold player-to-player on the Horse Market at the Stable Keeper, or to the NPC for 50% of market value. Level 15+ horses can go to "imperial training" delivery for that 50% plus a tier-matched Shiny Golden Seal. — [Altar of Gaming](https://altarofgaming.com/black-desert-online-horse-taming-training-breeding-exchanging-guide/); [GrumpyGreen](https://grumpygreen.cricket/horse-money/)
  - BroTown: an NPC buy-back at a fraction of market value sets a price floor and a sink for surplus pets.
- [search-summary] **Adopt Me (Roblox), scam defences in the largest pet-trading game:**
  - A Trade License, earned by a 3-question trading quiz, is required to trade Ultra-Rare or Legendary pets.
  - It also gives a 30-day trade history and in-game scam reporting.
  - Cross-trading for Robux or real money breaks the Terms of Service and risks a permanent ban.
  - Common scams are "trust trades", last-second swaps and rigged mini-games.
  — [Adopt Me Wiki: Scams](https://adoptme.fandom.com/wiki/Scams); [Robloxden: trading license](https://robloxden.com/game-codes/adopt-me/guides/adopt-me-how-to-get-a-trading-license); [Adopt Me: Trade Changes & Scam Prevention update](https://www.playadopt.me/news/trade-changes-and-scam-prevention-update)
  - BroTown: if pets trade:
    - any change to an offer resets both confirmations, which stops last-second swaps;
    - a trade history and a report button are needed;
    - an optional "trading licence" quest for rare pets is cheap to build.
- [search-summary] **Dupes flood creature markets:**
  - Grow a Garden (Roblox) disabled pet gifting on 7 June 2025 over an "exploit/dupe bug" and set about removing cloned pets. Lower-quality sources also cite a July 2025 dupe and further shutdowns in 2026. — [Sportskeeda](https://www.sportskeeda.com/roblox-news/why-pet-gifting-disabled-grow-garden); [Durbinrock](https://www.durbinrock.com/grow-a-garden-disables-pet-gifting-due-to-pet-duping-bug/)
  - Pet Simulator X: a bank update opened two holes that duplicated pets and diamonds. Dupers, their associates and their alts were banned, and duped pets were deleted automatically, even inside banks. — [Entertainment Focus, Dec 2021](https://entertainment-focus.com/2021/12/14/pet-simulator-x-pet-dupers-get-punished/)
  - BroTown: a new transfer surface (gift, bank, trade) is where dupes appear. Pets need unique ledger ids with provenance so duplicates can be found and deleted. Every transfer path should ship behind a kill switch, in line with BroTown's caps and kill-switch convention.

### Inferences
- A defensible BroTown trading v1:
  - trapped pets are bound; only rare drops, crafted pets or bred pets are tradeable;
  - a pet trades once;
  - a gold fee scales with rarity;
  - rare-pet trades are capped per day;
  - both players must be at the town's trade post;
  - trades settle through the existing server-settled trade path, with per-pet ids.
- Do not open pets to the auction house until dupe-proofing and per-species caps have run on direct trades. The cases above show pet markets fail through dupes and scams faster than through balance.
- Never sell any tradeable pet, or anything that can become one, for real money (the Guardian Cub lesson).

### Gaps
- Lucky-trade odds: one guide claimed "Pokemon caught 100 km apart boosts lucky odds to 5%", which conflicts with other descriptions and was not verified. The sibling `after_the_catch.md` digest of the Pokemon GO wiki gives instead: lucky Pokemon have IVs of at least 12/12/12 and half-price Stardust power-ups; about a 5% lucky chance per trade, rising with the Pokemon's age; Lucky Friends about 1.1% a day [search-summary, via sibling notes] — [after_the_catch.md](after_the_catch.md)
- [memory — unverified] Leads:
  - Axie Infinity's creature and SLP-token prices collapsed in 2021–22, and its Ronin bridge was hacked (about $600M, March 2022). This is the canonical real-money creature-market crash.
  - Blizzard's WoW Token (2015) became the sanctioned cash-to-gold route after the Guardian Cub era.
  - Pokemon GO trading needs trainer level 10 and launched in June 2018.
- No primary data was found on a Black Desert horse price cap, MapleStory pet trading rules, or the Axie Infinity creature-market collapse. The search budget ran out before these could be researched.
- The date and details of Adopt Me's scam-prevention update were not read (the official page was blocked).

## 4. Abuse: capture bots, spoofing, pet dupes, server-side validation, rate limits and pity timers

### Takeaway
Capture and trapping loops are prime bot targets. OSRS chinchompa-hunting bots are sold openly, and Jagex reported banning more than 6.2 million bot accounts in 2026. The defences that worked:
- the server owns the API (Niantic re-encrypted its API and added captchas in 2016);
- hidden daily and weekly caps (Pokemon GO's widely reported 4,800 catches a day);
- graduated penalties that cut social and trading features first (Niantic's three strikes);
- unique ids so dupes can be found and deleted.

Bad-luck protection is common and accepted: WoW traps gain capture chance after each failure, and RuneScape raises pet drop rates at kill-count thresholds. Roblox now requires any pity on paid items to be disclosed in numbers.

### Cited Findings
- [search-summary] **Niantic three-strike policy (TechCrunch, 20 July 2018):**
  - Strike 1: an in-app warning, plus possible loss of EX Raid Passes, trading, gifts and Showcases; reported to last about 7 days with no wild encounters.
  - Strike 2: suspension of about 30 days.
  - Strike 3: permanent termination, with appeal.
  - Severe cases can be banned at once.
  - Cheating includes GPS spoofing and third-party clients or add-ons.
  — [Niantic Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/39-three-strike-discipline-policy/); [TechCrunch](https://techcrunch.com/2018/07/20/niantic-explains-how-and-why-it-bans-players-in-pokemon-go); [Game Developer](https://www.gamedeveloper.com/design/niantic-introduces-three-strike-policy-for-cheaters-in-i-pok-mon-go-i-)
  - BroTown: a first strike should lock trading, mail-gifting and the market for the flagged account. That stops a botted pet supply from reaching the economy without banning on a single signal.
- [search-summary] **Pokemon GO hidden caps (unofficial, never announced):** 4,800 catches a day and 14,000 a week. Past the cap every Pokemon flees, and capacity returns hour by hour a week later. Stops and gyms are capped at about 1,200 spins a day. — [Future Game Releases (2020)](https://www.futuregamereleases.com/2020/08/pokemon-go-daily-and-weekly-catch-limit/); [pokemongopro FAQ](https://pokemongopro.com/faq/daily-limitations)
  - BroTown: a server-side daily cap on trap throws and successful captures, set far above human play, cheaply stops bot farms. A "the creature slips free" message beats an error message.
- [search-summary] **Niantic versus API bots (2016):** Niantic changed its request signing ("Unknown6") in August 2016 to break bots and third-party maps. A community hackathon (4–7 Aug 2016) worked around it in about 3.5 days; an earlier protection fell in 2 days. Tracker sites received cease-and-desist letters, and the game added captchas on abnormal behaviour. — [GO Hub](https://pokemongohub.net/post/news/new-niantic-security-measure-deployed-third-party-apps-affected/); [GitHub: tejado/Unknown6](https://github.com/tejado/Unknown6); [GO Hub: captcha](https://pokemongohub.net/post/news/captcha-game-pokemon-go-bots-trackers/); [TechCrunch, Aug 2016](https://techcrunch.com/2016/08/02/niantic-explains-why-it-killed-third-party-pokemon-go-tracking-services/amp)
  - BroTown: client obfuscation buys days, not safety. The real defence is that the server decides the roll, the range, the HP threshold and the trap consumption, which BroTown's architecture already supports.
- [search-summary] **OSRS bots:** Jagex reportedly banned more than 6.2 million bot accounts in 2026, "burning trillions of gold". A long-time bot investigator said he "did not find a single bot" at a former hotspot (secondary report). Hunter bots that catch red chinchompas on autopilot are sold commercially. Jagex's detection, Botwatch, profiles account behaviour. — [Notebookcheck](https://www.notebookcheck.net/Old-School-RuneScape-finally-feels-fair-again-as-Jagex-bans-6-2-Million-bots.1313053.0.html); [bottinghub (bot vendor)](https://bottinghub.com/hunter-ai/); [RuneScape Wiki: Botwatch](https://runescape.fandom.com/wiki/Botwatch)
  - BroTown: a trapping life skill whose output (pets, XP) can be traded or sold attracts the same scripts. Keep trapping output bound, or make it expensive to launder.
- [search-summary] **Pet dupes and cleanup:** the Pet Simulator X bank dupe ended with bans of dupers and alts and automatic deletion of duped pets; Grow a Garden disabled gifting during a dupe; a Hypixel SkyBlock duper of Scatha pets was banned. — [Entertainment Focus](https://entertainment-focus.com/2021/12/14/pet-simulator-x-pet-dupers-get-punished/); [Sportskeeda](https://www.sportskeeda.com/roblox-news/why-pet-gifting-disabled-grow-garden); [Hypixel forum](https://hypixel.net/threads/watch-out-for-duped-scatha-pets-update-duper-banned.4581136/)
  - BroTown: the capture (trap consumed, roll, pet minted) should be one idempotent server operation keyed by an operation id (opId). A reconnect or retry then cannot mint twice.
- [search-summary] **WoW traps, in-capture bad-luck protection:** each failed attempt raises the next attempt's chance. Strong Trap adds 25%, Pristine Trap 30% and Draenic Trap 45% per failure. — [Wowhead: Draenic Trap](https://www.wowhead.com/pet-ability=1368/draenic-trap); [WoWWiki: Strong Trap](https://wowwiki-archive.fandom.com/wiki/Strong_Trap); [WoWWiki: Pristine Trap](https://wowwiki-archive.fandom.com/wiki/Pristine_Trap)
  - BroTown: a "+x% per failed trap on this same monster" rule makes a 10% capture feel fair and caps frustration. Players rarely see a long failure streak, and it is easy to reason about.
- [search-summary] **RuneScape bad-luck mitigation for boss pets:** most bosses have a threshold of one-fifth of the pet's base denominator (General Graardor: 1,000 kills). At each multiple of the threshold the chance's numerator rises by 1. Luck boosts do not affect pet chance. — [RuneScape Wiki: Bad luck mitigation](https://runescape.wiki/w/Bad_luck_mitigation); [RuneScape Wiki: Boss pets](https://runescape.wiki/w/Boss_pets)
  - BroTown: for very rare variant pets, a server-side per-player, per-species counter that raises odds at thresholds gives rare collecting an end point without a guarantee.
- [search-summary] **Roblox platform rule (2026):** if paid random items can be bought with Robux, or with a currency bought with Robux, all outcomes and numerical odds must show before purchase and sum to 100%. Luck boosts and pity systems must be disclosed in numbers, and the displayed odds must update when they apply. — [Roblox Creator Docs](https://create.roblox.com/docs/production/monetization/paid-random-items); [Roblox DevForum: Clarifying Requirements](https://devforum.roblox.com/t/clarifying-requirements-for-paid-random-items/4654622)
  - BroTown: no paid randomness exists, so this does not apply. Showing the live capture chance on the trap button is still good practice, and future-proof if anything paid ever touches capture.

### Inferences
- The server must be the only place where the following are decided:
  - the <=20% HP check and the ~200 px range check;
  - the level penalty;
  - consuming the trap;
  - the random roll and minting the pet.
- That operation should be idempotent, rate-limited per player (throws a minute, captures a day), and logged with provenance, to allow rollbacks like Pet Simulator X's.
- Graduated enforcement: first an economy lock (trade, mail, market), then a suspension, then a ban. This matches Niantic's ladder and protects the economy fastest.
- A pity mechanic should be per player and per target. It should never carry across alts, and should reset on success, so it cannot be farmed.

### Gaps
- No primary source (GDC talk or postmortem) was found on server-side validation of client-claimed captures specifically. The inferences above rest on general practice and the Niantic case.
- The OSRS Hunter trap-count limits by level, and OSRS trap-ownership rules, could not be retrieved here. The sibling notes' digests have them; see §8.
- [memory — unverified] Leads:
  - Niantic sells an official auto-catch accessory (Pokemon GO Plus +) while banning third-party auto-catchers and spoofing apps, so "sanctioned automation" is a design option.
  - Pokemon GO's undocumented cooldown after large GPS jumps (the "soft ban") is the community-known teleport rate limit.

## 5. Death and PvP: permanent pet death, theft or safe pets, and what feels fair when the loser drops their bag

### Takeaway
Permanent creature loss is the norm only in hardcore sandboxes (ARK; unbonded pets in Ultima Online). Even there, games added recovery paths:
- UO's bonded pets come back as ghosts that can be resurrected, at a skill cost;
- OSRS insures pets and lets you buy back a lost one;
- ARK's PvP cryopod rules stop pocket armies.

When a PvP loser drops their bag, the rules players accept make the aggressor carry more risk (the OSRS skull), keep a few items safe, and keep long-term companions out of the killer's hands. UO's history shows that when given a choice, most players avoid non-consensual full loss.

### Cited Findings
- [search-summary] **Ultima Online:**
  - A bonded pet that dies becomes a ghost. A tamer with 80 Veterinary and 80 Animal Lore, an NPC vet, or an elixir can resurrect it.
  - Resurrection costs skill: 0.1 per skill on one page, 1–5 points per resurrection on another (the latter likely free-shard rules).
  - An unbonded pet's death is permanent.
  - Too little Animal Lore can break the bond.
  — [UOGuide: Pet Bonding](https://www.uoguide.com/Pet_Bonding); [UOGuide: Pet Resurrection](https://www.uoguide.com/Pet_Resurrection); [uo.com: Pet Ownership](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/pets-ownership/); [UO Renaissance (free shard)](http://www.uorenaissance.com/info/Pet_Bonding)
  - BroTown: "pets are knocked out, not killed" fits BroTown's tone. A downed pet returns to town and needs a time or gold revival (a sink). Permanent death could be optional or limited to a hardcore mode.
- [search-summary] **Ultima Online, the Trammel split (Renaissance, May 2000):** the world was split into Trammel, where all PvP was consensual, and Felucca, which kept open PvP. Trammel "quickly became one of the most popular facets" and a large share of players moved there. — [Wikipedia: Ultima Online](https://en.wikipedia.org/wiki/Ultima_Online); [Ultima Codex: Renaissance](https://wiki.ultimacodex.com/wiki/Ultima_Online:_Renaissance)
  - BroTown: No man's land's ring structure (opt in by walking out, levels matched) is the post-Trammel lesson applied. Putting pets at risk there would push many collectors to avoid the ring entirely.
- [search-summary] **OSRS death rules:**
  - An unskulled player keeps their 3 most valuable items.
  - A skull comes from attacking someone who did not attack you, or entering the Abyss. A skulled player loses everything except 1 item with Protect Item.
  - Protect Item adds one more kept item (4 when unskulled).
  - Above level 20 Wilderness, unprotected items go to the killer.
  - Protect Item does not apply on high-risk worlds.
  — [OSRS Wiki: Items Kept on Death](https://oldschool.runescape.wiki/w/Items_Kept_on_Death); [OSRS Wiki: Skull (status)](https://oldschool.runescape.wiki/w/Skull_(status)); [Jagex: Death Mechanics in Old School](https://secure.runescape.com/m=news/a=594/death-mechanics-in-old-school?oldschool=1)
  - BroTown: BroTown's red and white skulls already copy this aggressor-risk logic. Pets should sit with the "always kept" items, never in the killer's pile.
- [search-summary] **OSRS pets on death (secondary sources):** an uninsured pet is lost when you die; one that was following drops and disappears after about 30 seconds. Probita insured pets for a one-time 500,000 coins, and reclaiming costs 1,000,000. Since June 2022 every pet is insured automatically, including retroactively through the collection log. Killers do not receive pets. — [OSRS Fandom: Probita](https://oldschoolrunescape.fandom.com/wiki/Probita); [osrsmoneymaking.guide](https://osrsmoneymaking.guide/news/osrs-pet-loss-on-death-guide-and-avoidance-tips/); [RSFast guide](https://www.rsfast.com/News/a-guide-to-obtaining-and-insuring-pets-in-old-school-runescape.html)
  - BroTown: "lost but reclaimable for a gold fee at a town NPC" turns pet loss into a sink without the rage of permanent loss. Jagex removed the insurance chore once players proved it was busywork.
- [search-summary] **Albion Online, full loot as the accepted extreme:** red and black zones are full loot. On death part of the drop is destroyed as "trash loot" and the rest is lootable by the killer. There is no insurance; players are advised to bank valuables and carry gear they can afford to lose. — [Albion Oracle codex (2025/26)](https://albionoracle.com/en/codex/mechanics/death); [GameRevolution](https://www.gamerevolution.com/guides/341481-albion-online-losing-items-upon-death-works-green-yellow-red-regions)
  - BroTown: destroying a share of the drop, instead of transferring it all, removes the incentive for alt-account "suicide transfers" through the PvP ring. That matters if pets or valuables can ever be moved this way.
- [search-summary] **ARK, permanent loss and anti-abuse:**
  - A creature in a cryopod dies forever if the pod runs out of power, and admins cannot revive it.
  - On PvP servers a cryopod cannot be released with enemies within 3,500 units, and a creature damaged in the last 60 seconds cannot be pocketed.
  - "Cryo Sickness" (maximum torpor, 10x damage taken) punishes deploying straight after a cooldown.
  — [ARK Wiki: Cryopod](https://ark.wiki.gg/wiki/Cryopod); [Steam: "All our cryo'd tames died"](https://steamcommunity.com/app/346110/discussions/0/6786456360958651921/)
  - BroTown: in No man's land, stop players stowing or swapping pets for N seconds after taking or dealing damage, so pets cannot be used as escape hatches or surprise reinforcements.

### Inferences
- Suggested pet rules for No man's land in BroTown:
  - pets are never part of the dropped bag, and never transfer to the killer;
  - a pet that falls is "knocked out" and returns to the stable, with a revival timer or gold fee;
  - a pet cannot collect any death pile it is not entitled to, so pets do not become loot-stealing tools;
  - pets cannot be stowed or swapped within ~10–60 seconds of combat, borrowing ARK's rule.
- Permanent pet death, if wanted at all, belongs in an opt-in hardcore ruleset, not the main world. UO's bonded pets and OSRS's insurance both show studios retreating from permanent loss for long-term companions.

### Gaps
- No source captured WoW's battle-pet revival rules.
  - [memory — unverified] Lead: battle pets cannot die permanently; they are revived with "Revive Battle Pets" or at a stable master.
- Albion mounts were partly answered by the sibling `after_the_catch.md`, from a digest of Albion forums whose original URL was not recorded [search-summary, via sibling notes]:
  - mounts are fully lootable in red and black zones;
  - taking damage while mounted dismounts you, and a mount at 0 HP forces a 30 s cooldown;
  - mount skins are account-bound and never drop.
  - BroTown: the last point is the precedent for pet skins from the supporter pass never dropping in No man's land.
- No published survey or data on what players consider "fair" PvP item loss was found, beyond UO's population shift.

## 6. Monetization: selling capture items, store pets, paid slots, loot-box law and store rules (2025–2026), and a safe supporter pass

### Takeaway
Since BroTown sells no randomness, it sits outside most loot-box law. Regulation is moving toward three requirements:
- odds disclosure: Apple 2017, Google 2019, South Korea's law since 22 Mar 2024, Roblox worldwide in 2026;
- age limits on paid random items: the FTC's Jan 2025 Genshin order (under 16 needs parental consent), Brazil's ban for minors from 17 Mar 2026, PEGI 16 by default for games submitted from June 2026, Australia's minimum M since 22 Sep 2024;
- price transparency for virtual currencies: the FTC order, and the EU Digital Fairness Act, whose proposal was still expected in Q4 2026.

The safest supporter-pass content has clear precedents:
- storage or extra slots: Pokemon HOME Premium at $2.99 a month, Pokemon GO storage upgrades;
- purely cosmetic pets or skins: Path of Exile.

The things to avoid are:
- selling capture consumables for money (Pokemon GO sells Poke Balls, but BroTown's pledge is "no pay-to-win");
- random pet eggs or boxes (paid random items);
- limited-time paid offers (PEGI 12 trigger);
- selling tradeable pets (the Guardian Cub crash).

### Cited Findings
- [search-summary] **Pokemon GO sells capture items and storage:** Poke Balls cost 100 PokeCoins for 20, 460 for 100 and 800 for 200. Pokemon storage and bag space each cost 200 PokeCoins per +50 slots, repeatable up to a limit. — [Pokemon GO Wiki: Shop](https://pokemongo.fandom.com/wiki/Shop); [Serebii: Shop](https://www.serebii.net/pokemongo/shop.shtml); [Dexerto (Sept 2026)](https://www.dexerto.com/pokemon/pokemon-go-shop-updated-list-items-prices-box-changes-1315679/)
  - BroTown: extra pet slots or stable storage are a well-precedented paid item. Traps for money are not: in a shared world they buy capture attempts against other players.
- [search-summary] **Pokemon HOME Premium, storage as a subscription:** $2.99 a month, $4.99 for 3 months, $15.99 a year. Basic holds 30 Pokemon in one box; Premium holds 6,000 across 200 boxes. — [GameRant](https://gamerant.com/pokemon-home-how-to-carry-more-pokemon/)
  - BroTown: the closest real-world precedent for a ~$2/month pass that raises pet storage, for example a stable beyond the 6 active pets.
- [search-summary] **Path of Exile, cosmetic pets:** pets are purely cosmetic followers that do not fight; up to two can follow you. They come from microtransactions, supporter packs and some challenge-league rewards. — [PoE Wiki: Pet](https://pathofexile.fandom.com/wiki/Pet); [Path of Exile on X (Liege pack)](https://x.com/pathofexile/status/1448733018177171457); [PoE2 pet shop](https://pathofexile2.com/en/shop/pets)
  - BroTown: supporter-only pet skins and accessories (a hat, colour, trail or name plate) that change no stats are the cleanest pass content.
- [search-summary] **WoW store pets:** store, promotion and collector's-edition pets are not cageable, so cannot be traded. The one tradeable store pet, Guardian Cub, crashed in gold value after release and was retired in 2014. — [Blizzard Support](https://us.battle.net/support/en/article/309267); [WarcraftPets](https://www.warcraftpets.com/news/guardian-cub-retiring-from-blizzard-store-soon/)
  - BroTown: anything supporters get should be bound to the account.
- [search-summary] **Battle-pass backlash:** GO Pass Deluxe costs US$7.99, or $9.99 with 10 extra ranks. The Unova Tour Pass Deluxe at $14.99 drew "greedy" and "worthless rewards" complaints. — [LDShop](https://www.ldshop.gg/blog/pokemon-go/pokemon-go-pass.html); [Sportskeeda](https://www.sportskeeda.com/pokemon/all-pokemon-go-pass-rewards-may-2025-deluxe-worth-purchasing); [Dexerto](https://www.dexerto.com/gaming/pokemon-go-players-erupt-over-greedy-unova-tour-pass-price-and-worthless-rewards-3145970/)
  - BroTown: at $2/month the pass should feel generous and simple (slots plus cosmetics), not a ladder of rewards that gates encounters.
- [search-summary] **Pokemon GO Remote Raid Pass (April 2023), a monetized convenience cut back:**
  - A single pass went from 100 to 195 PokeCoins, and the 3-pack to 525.
  - Remote raids were capped at 5 a day.
  - #HearUsNiantic organised boycotts and a petition of more than 100,000 signatures.
  - Niantic said remote passes had "come to dominate the overall experience … essentially a shortcut to playing the game."
  — [Charlie INTEL](https://www.charlieintel.com/pokemon/pokemon-go-devs-address-viral-hearusniantic-movement-remote-raid-pass-controversy-252483/); [Forbes](https://www.forbes.com/sites/paultassi/2023/04/03/pokmon-go-players-ready-mass-boycott-over-remote-raid-pass-price-hike/); [Change.org petition](https://www.change.org/p/stop-pok%C3%A9mon-go-remote-raid-passes-cost-increase)
  - BroTown: never put a convenience in the pass that you might later need to nerf. Design pass perks to be permanent.
- [source-read] **Apple App Store Review Guidelines, read 2026-10-06:**
  - 3.1.1: "Apps offering 'loot boxes' or other mechanisms that provide randomized virtual items for purchase must disclose the odds of receiving each type of item to customers prior to purchase." Digital unlocks (subscriptions, in-game currencies, premium content) "must use in-app purchase".
  - 3.1.2: auto-renewable subscriptions "must provide ongoing value", last at least seven days, and be available on all the user's devices.
  - 4.7: HTML5 mini games inside apps must comply with the guidelines.
  — [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
  - BroTown: as a Safari web game, the guidelines do not apply. A future wrapper app would need in-app purchase for the pass (or the US link-out rules below), and the pass would need to give ongoing value.
- [search-summary] **Apple US link-outs:** after the Epic contempt ruling, Apple updated its guidelines on 1 May 2025 to allow buttons and external links to outside purchases on the US storefront. On 11 Dec 2025 the Ninth Circuit modified the injunction so Apple may charge fees on external links (MacRumors; headline only). — [9to5Mac](https://9to5mac.com/2025/05/01/apple-app-store-guidelines-external-links/); [MacRumors](https://www.macrumors.com/2025/12/11/apple-app-store-fees-external-payment-links/); [Justia: 9th Cir. No. 25-2935](https://law.justia.com/cases/federal/appellate-courts/ca9/25-2935/25-2935-2025-12-11.html)
  - BroTown: if a wrapper app ever ships, US users could be linked to web checkout, but fees may apply.
- [search-summary] **Google Play (2019):** apps offering randomized virtual items from a purchase "must clearly disclose the odds of receiving those items in advance of purchase". — [Fenwick](https://www.fenwick.com/insights/publications/google-play-now-requires-disclosure-of-loot-box-odds); [TechTimes, 31 May 2019](https://www.techtimes.com/articles/244016/20190531/android-gamers-will-soon-see-loot-box-odds-as-google-updates-its-play-store-policy.htm)
  - BroTown: not applicable while BroTown sells no paid randomness.
- [search-summary] **ESRB (April 2020):** the "In-Game Purchases (Includes Random Items)" notice covers loot boxes, gacha, item or card packs, prize wheels and treasure chests. It replaces the plain "In-Game Purchases" notice whenever any such item is present. A 2023 study found "unsatisfactory compliance" with ESRB, PEGI and IARC loot-box labels (headline only). — [Perkins Coie](https://perkinscoie.com/insights/update/esrb-issues-labeling-requirement-video-games-containing-loot-boxes); [Nintendo Life](https://www.nintendolife.com/news/2020/04/esrb_ratings_will_now_warn_players_about_loot_boxes_and_other_random_items); [Royal Society Open Science 2023](https://royalsocietypublishing.org/doi/10.1098/rsos.230270)
  - BroTown: with no paid random items, a plain "In-Game Purchases" notice would be the most BroTown would get if it were ever rated.
- [search-summary] **PEGI "interactive risk categories" (announced 12 Mar 2026; for games submitted from June 2026, no re-rating of older games):**
  - Paid random items, defined as "all in-game offers to purchase digital goods or premiums where players don't know exactly what they are getting prior to the purchase", are PEGI 16 by default, up to PEGI 18.
  - Time- or quantity-limited purchase offers: PEGI 12.
  - NFTs or blockchain: PEGI 18.
  - Play-by-appointment: PEGI 7 if it gives rewards, PEGI 12 if it punishes.
  - Unrestricted online communication: PEGI 18.
  - Built with Germany's USK.
  — [PEGI](https://pegi.info/news/pegi-expands-age-rating-criteria-interactive-risk-categories); [Lexology](https://www.lexology.com/library/detail.aspx?g=329c2cf7-d5c6-4de1-8ec9-33adfcdd2632); [Wccftech](https://wccftech.com/games-with-loot-boxes-now-get-pegi-16-rating-starting-june-2026-ea-sports-fc/); [The FPS Review](https://www.thefpsreview.com/2026/03/13/pegi-updates-its-rating-system-to-address-interactive-risk-categories-such-as-loot-boxes-in-game-monetization-and-safe-online-gameplay/)
  - BroTown: a web game needs no PEGI rating. If one is ever sought (console or store), limited-time pet-skin sales, open chat, and punishing daily mechanics such as streak loss would each raise the rating. Evergreen cosmetics avoid the purchase triggers.
- [search-summary] **Belgium (April 2018):** the Gaming Commission found paid loot boxes in Overwatch, FIFA 18 and CS:GO to be illegal games of chance. Star Wars Battlefront II's were not, having been removed at the time. Operators faced up to five years' prison and fines up to EUR 1.6 million. Justice Minister Koen Geens: mixing games and gambling "especially at a young age, is dangerous for mental health". Blizzard removed paid loot boxes from Overwatch and Heroes of the Storm in Belgium. — [PC Gamer](https://www.pcgamer.com/belgiums-gambling-commission-rules-against-loot-boxes-in-overwatch-fifa-18-and-csgo/); [Blizzard Watch](https://blizzardwatch.com/2018/04/25/belgium-overwatch-loot-boxes-are-now-illegal-gambling/); [NAG](https://www.nag.co.za/2018/04/26/belgium-gaming-commission-says-loot-boxes-in-three-games-violate-local-laws/); [PCGamesN](https://www.pcgamesn.com/overwatch/overwatch-belgium-loot-boxes)
  - BroTown: never sell a random pet egg or box for money. In Belgium that alone can be criminal.
- [search-summary] **Netherlands (Raad van State, 9 March 2022, final):** the Kansspelautoriteit's penalty on EA (EUR 250,000 a week, up to EUR 5 million) was unlawful. FIFA packs are "not a standalone game" but part of a skill game. Most packs are earned through play, and black-market trading is limited. — [Kansspelautoriteit](https://kansspelautoriteit.nl/nieuws/2022/maart/uitspraak-raad-state-fifa-zaak-dwangsom/); [Ius Mentis](https://blog.iusmentis.com/2022/03/14/kansspelautoriteit-heeft-ea-onterecht-dwangsom-opgelegd-om-fifa-lootboxen/); [KVDL](https://kvdl.com/artikelen/raad-van-state-vernietigt-besluit-ksa-loot-boxes-in-fifa-game-zijn-geen-opzichzelfstaand-kansspel)
  - BroTown: courts weigh whether random goods can be cashed out. Tradeable pets with a real-money black market raise gambling risk if randomness is ever sold.
- [search-summary] **UK:** the government chose industry self-regulation. Ukie published 11 principles in July 2023, aiming to stop under-18s buying loot boxes without parental approval and to improve spending controls and transparency. A May 2025 study of the 100 top-grossing iPhone games found:
  - none sought explicit parental consent;
  - 23.5% disclosed loot boxes in their marketing;
  - 8.6% consistently disclosed probabilities;
  - no enforcement followed reports made more than six months earlier.
  An October 2025 DCMS review examined "skins gambling" (headline only). — [Ukie](https://ukie.org.uk/news/new-loot-box-principles-agreed-by-industry); [CMS](https://cms.law/en/gbr/legal-updates/loot-boxes-11-new-principles-for-an-industry-led-approach); [Royal Society Open Science 2025](https://royalsocietypublishing.org/rsos/article/12/5/250704/235838/Non-compliance-with-and-non-enforcement-of-UK-loot); [TechXplore](https://techxplore.com/news/2025-05-uk-loot-rampant-compliance.html); [CMS LawNow, Oct 2025](https://cms-lawnow.com/en/ealerts/2025/10/inside-the-skins-gambling-surge-dcms-review-exposes-risks-and-regulatory-gaps-in-skins-gambling)
  - BroTown: if pets become tradeable, third-party real-money markets (the "skins" problem) are the regulatory risk, not loot boxes. The terms should ban cash trading, as Adopt Me's do.
- [search-summary] **EU Digital Fairness Act:** the public consultation ran 17 July–24 Oct 2025 with 3,341 responses. As of 7 Sept 2026 no proposal had been tabled; it was expected in Q4 2026, and earlier reporting said Q3 2026. Expected scope: dark patterns, addictive design, minors, in-game virtual currencies and loot boxes. Reporting suggests virtual currencies may have to show real-money prices, and paid loot boxes may be banned or need parental consent. — [Wikipedia: DFA](https://en.wikipedia.org/wiki/Digital_Fairness_Act); [digitalfairnessact.com](https://digitalfairnessact.com/); [Freshfields](https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/the-eus-proposed-digital-fairness-act-a-game-developers-guide-to-potential-imp-102ltio); [RWA Bible](https://rwa-bible.com/en/news/eu-digital-fairness-act-game-virtual-currency-supercell-candy-crush-2026/)
  - BroTown: a flat monthly pass priced in real money, with no premium currency, is the shape least exposed to the DFA. Avoid adding a premium currency.
- [search-summary] **US FTC v. Cognosphere / HoYoverse (January 2025):** a $20M settlement. The company may not sell loot boxes to under-16s without parental consent, and must disclose odds and virtual-currency exchange rates. It must delete under-13 data and comply with children's privacy law (COPPA). The allegations: players were deceived about real costs and about the odds of "five-star" prizes. — [FTC consumer alert](https://consumer.ftc.gov/consumer-alerts/2025/01/ftc-settlement-order-bans-sales-genshin-impact-loot-boxes-kids-under-16-without-their-parents); [BleepingComputer](https://www.bleepingcomputer.com/news/gaming/ftc-cracks-down-on-genshin-impact-gacha-loot-box-practices/); [PocketGamer.biz](https://www.pocketgamer.biz/hoyoverse-agrees-to-20-million-settlement-with-ftc-over-loot-boxes/)
  - BroTown: children's privacy applies to any game likely played by under-13s, randomness or not. Collecting creatures appeals to children, so age handling matters.
- [search-summary] **Brazil, Lei 15.211/2025 ("ECA Digital"), signed 17 Sept 2025, in force 17 Mar 2026:**
  - It bans paid loot boxes in games "aimed at or likely to be accessed by" under-18s.
  - Loot-box games are expected to get an 18+ rating, and the app stores block them for minors from 17 March.
  - Fines reach up to 10% of Brazilian revenue or R$50 million per infraction.
  - It requires reliable age verification (not self-declaration) and parental linking for under-16s across services likely used by minors.
  - Roblox barred paid random items for Brazilian under-18s from the same date.
  — [Factotum (Substack)](https://factotumcom.substack.com/p/brazil-digital-eca-bans-loot-boxes); [Pixelkin](https://pixelkin.org/2025/09/29/brazil-becomes-latest-country-to-ban-loot-boxes-targeted-at-minors/); [ASC Jogos](https://www.ascjogos.org.br/en/post/brazil-loot-box-ban-eca-digital-kids-games); [Roblox Creator Docs](https://create.roblox.com/docs/production/monetization/paid-random-items)
  - BroTown: no loot boxes, so the ban does not bite. Brazil's age-assurance duties may still apply to the service itself; that needs a legal check if Brazil is served.
- [search-summary] **Australia (from 22 Sept 2024, new classifications only):** paid chance-based items mean at least M, which is advisory, not a legal sale restriction. Simulated gambling means R18+. Chance mechanics that do not involve real money are exempt. — [Game Developer](https://www.gamedeveloper.com/business/games-featuring-paid-loot-boxes-will-soon-receive-a-mandatory-m-rating-in-australia); [PCWorld](https://www.pcworld.com/article/2464538/all-games-with-loot-boxes-will-be-rated-m-or-higher-in-australia.html); [PocketGamer.biz](https://www.pocketgamer.biz/australia-sets-new-rules-for-video-games-with-gambling-like-content/)
  - BroTown: chance-based traps bought only with earned gold fall in the exemption. Keep gold unpurchasable.
- [search-summary] **South Korea (Game Industry Promotion Act amendment, 22 Mar 2024):**
  - The type of every probability item and its exact odds must be shown in game, on the website and in advertising, by domestic and foreign firms.
  - 266 games were found violating by July 2024.
  - Penalties reach up to 2 years' prison or about US$14,500, with treble damages since 31 Jan 2025 (secondary).
  - A first compliance roster in July 2026 listed 81 publishers, one facing a penalty (headline only).
  - Korea's rules led Roblox to disclose odds worldwide (June 2026).
  — [GameWorldObserver](https://gameworldobserver.com/2024/07/08/266-games-violated-loot-box-rules-south-korea); [Kim & Chang](https://www.kimchang.com/en/insights/detail.kc?sch_section=4&idx=29487); [Shattered.io](https://shattered.io/loot-box-odds-disclosure-laws-2026/); [TechTimes, July 2026](https://www.techtimes.com/articles/321760/20260728/south-korea-publishes-first-game-compliance-roster-81-publishers-one-faces-penalty.htm); [TechTimes, June 2026](https://www.techtimes.com/articles/319148/20260626/koreas-loot-box-rules-push-roblox-disclose-item-odds-worldwide.htm)
  - BroTown: the global norm for anything random and paid is now "disclose exact odds everywhere". Keep the stance "nothing random is ever paid".

### Inferences
- A supporter-pass menu consistent with every 2025–2026 rule found and with the no-pay-to-win pledge:
  - more pet slots or stable storage;
  - cosmetic pet skins, accessories and name plates (bound to the account, evergreen or recurring, never "last chance");
  - a cosmetic badge.
- Out of bounds:
  - traps or trap upgrades for money;
  - capture-chance or trapping-XP boosts;
  - random pet eggs or "mystery" boxes;
  - tradeable pets;
  - a premium currency;
  - one-time FOMO bundles.
- The pass's "ongoing value" (new cosmetics each month, permanent slots) also satisfies Apple 3.1.2, should a wrapper app ever ship.
- Because gold, traps and pets are earned, not bought, BroTown's capture odds are exempt from the disclosure laws. Showing the chance anyway costs nothing and builds trust.

### Gaps
- Not covered because of the search budget: Japan's 2012 "kompu gacha" ban; China's odds rules; Spain's pending minors' bill; Belgium's post-2018 enforcement; the EU consumer-protection network's March 2024 virtual-currency principles.
- Google Play's 2026 policy wording was not re-verified: support.google.com was blocked when tried on 2026-10-06. The 2019 wording is assumed current. The FTC's own pages (ftc.gov, consumer.ftc.gov) were also blocked, so the Genshin terms rest on news digests.
- [memory — unverified] Leads:
  - Japan's Consumer Affairs Agency banned "kompu gacha" (complete-the-set gacha) in 2012.
  - China has required odds disclosure for paid random items since 2017.
  - The EU consumer-protection network's "Key principles on in-game virtual currencies" (March 2024) say virtual-currency prices should also show their real-money value, and minors should not be pressured.
  - The UK government's loot-box response came on 17 July 2022.
  - Belgium's fines are up to EUR 800,000, doubled where minors are involved, which is the likely source of the EUR 1.6 million figure.
  - US subscription law matters for a $2/month pass. The FTC's "click-to-cancel" rule was vacated by the 8th Circuit in July 2025. California's amended auto-renewal law (in force 1 July 2025) requires easy online cancellation.
  - Apple added 13+, 16+ and 18+ age-rating tiers in 2025.
- It is unclear whether a cash-bought capture consumable with a random success chance (like Poke Balls) counts as a "paid random item" under PEGI's 2026 definition. No guidance was found.
- No player-sentiment data was found specifically for paid pet-slot subscriptions or cosmetic-pet supporter packs; reception is inferred.

## 7. Live-ops: event spawns, rare-spawn announcements, limited-time pets and FOMO, and published retention effects

### Takeaway
Short, recurring, predictable windows with boosted spawns and boosted rare variants work: Pokemon GO's monthly 3-hour Community Day since January 2018, and its weekly one-hour Spotlight Hour. Events and new social features produce measurable revenue spikes (Halloween 2016 +133% over five days; daily revenue +39% after trading launched). Novelty decays fast: a BMJ study found activity gains gone by week 6. Limited-time exclusives draw FOMO criticism, and Blizzard's answer was to promise rotations and open "outlet" vendors for old items. Taking away a convenience players had paid for triggered a boycott.

### Cited Findings
- [search-summary] **Pokemon GO Community Day:** first held 20 January 2018 (Pikachu, with the exclusive move Surf). It is a monthly 3-hour event with boosted spawns of one species, an exclusive move, and bonuses such as 2x XP and 3-hour Lures. The shiny rate was observed at about 1 in 25 (Pikachu about 1 in 22.7, range 1 in 19 to 1 in 28). — [Serebii: January 2018 Community Day](https://serebii.net/pokemongo/communityday/january2018.shtml); [Forbes, 31 Jan 2018](https://www.forbes.com/sites/insertcoin/2018/01/31/heres-your-boosted-chance-of-getting-a-shiny-on-pokemon-go-community-day/); [Pokemon GO Wiki: Community Day](https://pokemongo.fandom.com/wiki/Community_Day)
  - BroTown: a monthly "Trapping Day" makes this concrete:
    - one land's featured monster spawns thickly near town for 2–3 hours;
    - a boosted rare-colour variant chance;
    - a featured-only cosmetic trait that returns in later years.
    - It fits the ~2 h/day free cap and the time zones of one shared world.
- [search-summary] **Event-linked trading windows:** the trade range rose to 40 km around Community Day and seasonal events (for example 15–18 Jan 2021; 8 Feb–1 Mar 2021). — [Serebii on X](https://x.com/SerebiiNet/status/1349780537544761344?lang=en); [Leek Duck](https://leekduck.com/events/increased-trading-range-lunar-new-year/)
  - BroTown: relaxing a trade gate (for example a cheaper fee, or trades allowed outside town) during events is a cheap, reversible lever.
- [search-summary] **Spotlight Hour:** a weekly one-hour event with one species boosted plus a 2x Candy, Stardust or XP bonus, historically Tuesdays 6–7 pm local. 2026 sources conflict: one says it was discontinued in March 2026 and replaced by "Daily Discoveries"; others say it returned on Thursdays from 18 June 2026, and one lists a 17 Sept 2026 Thursday event. — [Pokemon GO Wiki: Spotlight Hour](https://pokemongo.fandom.com/wiki/Pok%C3%A9mon_Spotlight_Hour); [Nintendo Wire, 17 Sept 2026](https://nintendowire.com/guides/pokemon-go/spotlight-hour-for-september-17th-2026/); [TheGamer](https://www.thegamer.com/pokemon-go-spotlight-hour-guide/)
  - BroTown: a weekly one-hour spotlight on one capturable species is low-cost content using spawn tables that already exist.
- [search-summary] **Revenue effects (Sensor Tower):**
  - Pokemon GO's first in-game event (Halloween 2016) raised spending about 133% in its first five days: ~$23.3M on 25–29 Oct vs ~$10M on 18–22 Oct.
  - Daily revenue grew 39% to $2.5M after the trading update (headline).
  - Lifetime player spending passed $6B (headline).
  — [Sensor Tower: Halloween event](https://sensortower.com/blog/pokemon-go-halloween-event-revenue); [Sensor Tower: trading update](https://sensortower.com/blog/pokemon-go-daily-revenue); [Sensor Tower: $6B](https://sensortower.com/blog/pokemon-go-6-billion-revenue)
  - BroTown: events and social trading are the best-documented engagement drivers in a collection game. With a $2 pass, the payoff is pass conversions and retention, not per-event spending.
- [search-summary] **Novelty decay (BMJ, December 2016, difference-in-differences study):** Pokemon GO players walked 955 more steps a day in week one. The gain faded over five weeks and was gone by week six. — [PubMed 27965211](https://pubmed.ncbi.nlm.nih.gov/27965211/); [Medical News Today](https://www.medicalnewstoday.com/articles/314718)
  - BroTown: a pet system's launch excitement will last about a month. Plan recurring beats (monthly featured creature, weekly spotlight) from day one.
- [search-summary] **WoW Trading Post, a FOMO mitigation:** monthly rotating cosmetics, including pets. Blizzard said items return, so players "should feel comfortable passing on items" they don't need that month. Players criticised how few came back. Later, "Trading Post Outlet" vendors in Dornogal and Silvermoon brought back a large collection of older mounts, pets and appearances, and old rewards returned again in September 2026. — [Warcraft Tavern](https://www.warcrafttavern.com/wow/news/dragonflight-trading-post-items-will-appear-more-than-once/); [Blizzard forum](https://us.forums.blizzard.com/en/wow/t/will-they-ever-rerun-monthly-trading-post-items/1834836); [Sportskeeda](https://sportskeeda.com/mmo/world-warcraft-dragonflight-trading-post-activities-rewards); [Master of Warcraft, Aug 2026](https://www.masterofwarcraft.net/2026/08/wow-september-trading-post-old-rewards-return.html)
  - BroTown: every limited pet cosmetic should return on a published cycle, for example each anniversary. A returning item also avoids PEGI's limited-offer trigger if it is ever sold.
- [search-summary] **Remote Raid Pass backlash (April 2023):** after a price rise and a 5-a-day cap on a feature players had relied on, the community mobilised (#HearUsNiantic, a petition of more than 100,000). Niantic defended the change as necessary for the game's health. — [Charlie INTEL](https://www.charlieintel.com/pokemon/pokemon-go-devs-address-viral-hearusniantic-movement-remote-raid-pass-controversy-252483/); [GO Hub](https://pokemongohub.net/post/news/the-remote-raid-pass-change-a-message-to-niantic-and-the-pokemon-go-player-base/)
  - BroTown: event rules that become habits (bigger pet caps, cheaper traps) are hard to take back. Label event perks as temporary from the start.

### Inferences
- A BroTown cadence:
  - a monthly 2–3 hour featured-creature day;
  - a weekly one-hour spotlight;
  - a seasonal rare variant that returns yearly.
- Rare-spawn announcements could reuse the existing land-banner and chat-line machinery. A rare capturable spawn could post a server-wide line, but only with a per-player copy or contribution-based capture rights. Otherwise announcements create camping and stealing, as WoW Forever's "queue for rocks" headlines suggest.
- Event spawn boosts should raise the per-player catch cap too, or players near the cap will feel shut out.

### Gaps
- No published retention data (day-1, day-7, day-30 retention or similar) for collection or pet systems was found. The only quantitative effects are Sensor Tower's revenue spikes and the BMJ activity-decay study.
- No sources were gathered on rare-spawn broadcast designs (OSRS pet broadcasts, WoW rare alerts) or on retention effects of limited-time pets. The search budget was exhausted.
- Whether Pokemon GO's Spotlight Hour exists as of October 2026 is unresolved (sources conflict).
- [memory — unverified] Lead: OSRS announces rare pet drops in the player's clan chat. This is a precedent for announcing a rare catch to the player's own clan instead of the whole server, which avoids the camping a server-wide announcement invites.

## 8. Placed traps in a shared world: trap theft, spot camping, per-player trap limits, who owns the catch, and whether others can see or trigger your trap

### Takeaway
OSRS Hunter is the reference for placed creature traps in a shared world:
- a cap per player that grows with level, plus one more in the PvP Wilderness;
- a trap that falls or collapses becomes an ordinary ground item, which other players can take after 60 seconds;
- so players carry spare traps and change worlds to escape crowded spots.

ARK keeps a creature contested until the tamer commits by feeding it. On official PvE servers, though, the last player to hit it holds the taming rights, which invites sniping. The designs that avoid trap conflict entirely make the bait public and the catch private: Pokemon GO's lure spawns appear for every trainer in range. BroTown runs one shared room with no worlds to switch to, so crowding and trap theft cannot be escaped and must be designed out.

### Cited Findings
- [search-summary, via sibling notes] **OSRS trap caps** (sibling notes' sources): 2 traps at Hunter level 1, 3 at 40, 4 at 60, 5 at 80, and one extra in the Wilderness. — [OSRS Wiki: Hunter training](https://oldschool.runescape.wiki/w/Hunter_training); [OSRS Toolkit Hunter guide](https://osrstoolkit.com/guides/hunter/)
  - BroTown: a cap per player, growing on trapping's 5-level steps, with +1 inside No man's land as the risk bonus. A cap per player, not per spot, is what stops one player blanketing an area.
- [search-summary] **OSRS dropped items:** tradeable items dropped are visible only to their owner for 60 s, then to everyone for 120 s. A Hunter guide warns that other players can see your fallen snare after 1 minute. — [OSRS Wiki: Drop](https://oldschool.runescape.wiki/w/Drop); [2007rshelp: Hunter](https://2007rshelp.com/skill/24/hunter)
  - BroTown: the server can do better than OSRS. A trap that times out goes back to its owner (bag or mail), so trap theft simply does not exist outside No man's land.
- [search-summary] **OSRS trap theft:** unattended box traps can be stolen, so guides advise carrying 10–15 spares, especially at the Wilderness black chinchompas. — [osrsbestinslot Hunter guide](https://www.osrsbestinslot.com/osrs-hunter-guide/); [OSRS Wiki: Box trap](https://oldschool.runescape.wiki/w/Box_trap)
  - BroTown: in OSRS theft is mostly a cost of the PvP zone. If BroTown keeps it anywhere, keep it only in No man's land, where losing things is already the deal.
- [search-summary] **OSRS crowding:** at crowded chinchompa spots players change worlds and learn the respawn points. Chinchompas can themselves dismantle traps. — [osrsmoneymaking.guide: red chinchompas](https://osrsmoneymaking.guide/news/best-place-to-catch-red-chinchompas-in-osrs-2/); [OSRS Wiki (fandom mirror): Chinchompa (Hunter)](https://oldschoolrunescape.fandom.com/wiki/Chinchompa_(Hunter))
  - BroTown: there is one room (`brotown-1`), so OSRS's escape valve does not exist. Either each trap draws a creature for its owner alone, or each land has enough trap spots for a crowd to spread out.
- [search-summary] **Monster Hunter World:** a hunter carries one shock trap and one pitfall trap at a time, and crafts more from parts during the hunt. — [GameFAQs MHW thread](https://gamefaqs.gamespot.com/boards/211368-monster-hunter-world/76301983); [Kiranico: Trapping and capturing](https://mhworld.kiranico.com/en/guide/trapping)
  - BroTown: a small carried stock, refilled by field crafting, limits trap spam without cooldown timers.
- [search-summary] **ARK bear traps** (forums): a bear trap holds a wild creature for "mere seconds", and bigger creatures need purpose-built taming pens. — [Steam: bear trap duration](https://steamcommunity.com/app/346110/discussions/0/351659808490256700/); [Steam: bear traps & taming](https://steamcommunity.com/app/346110/discussions/0/405694115203781334/)
  - BroTown: a short snare or root used during a fight, while you stand there, cannot be stolen and leaves nothing in the world. It suits capture tools that work at full HP.
- [search-summary] **ARK official PvE:** the last player or tribe to hit a creature has exclusive taming rights. The first food binds the tame to the feeder. A creature that wakes up is "fair game" again. This conflicts with the forum reports in §1, which give rights to whoever knocked it out or fed it first. — [Ark Wiki: Taming](https://ark.fandom.com/wiki/Taming); [survivetheark forum](https://survivetheark.com/index.php?%2Fforums%2Ftopic%2F33302-pve-taming-dinos%2F=)
  - BroTown: lock a catch at a clear commit point that the owner's own action creates (the trap springs on the creature, or the bait is eaten). Never use "last hitter owns it", which rewards sniping.
- [search-summary] **Pokemon GO Lure Module:** lasts 30 minutes, and its spawns appear for every trainer in range of the PokeStop, shown as petals on the map. — [Niantic Help Center: Lure Modules](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1789-lure-modules/); [Bulbapedia: Lure Module](https://bulbapedia.bulbagarden.net/wiki/Lure_Module)
  - BroTown: bait can be public, drawing creatures for everyone nearby, as long as each player's catch is their own. There is then nothing to steal, and bait becomes a reason to play together (clans, parties).
- [search-summary] **GW2 juveniles:** any ranger can charm a juvenile pet "unless they already belong to another ranger". A bug let rangers charm another ranger's pet when it loaded before its owner. — [GW2 Wiki: Pet](https://wiki.guildwars2.com/wiki/Pet); [GW2 forum bug report](https://en-forum.guildwars2.com/topic/132909-rangers-pet-charm-does-not-work-for-juvenile-alpine-wolves-or-juvenile-blue-moas/)
  - BroTown: who owns a trap and its catch must be a server field set when the trap is placed. It must never be worked out at check time from who happens to be nearby; GW2's bug is exactly that inference failing.
- [search-summary] **WoW's Loque'nahak, camping:** a rare tameable that respawns about every 6–10 hours, is up for about 10 minutes, and is often gone within 2 minutes. — [Huntsman's Lodge](https://huntsmanslodge.com/535/tips-and-advice-for-hunters-seeking-loquenahak/); [Blizzard forums: spawn timer](https://us.forums.blizzard.com/en/wow/t/loquenahak-spawn-timer/17055)
  - BroTown: one rare on a long timer in one shared room will be camped by the most-online, strongest players. Give each trap or kill its own small per-player chance of a rare instead.
- [search-summary: headline only] **WoW Forever 2026 (headline only):** with first-tag kept, players "queue for rocks". — [wowforeverbuilds.com](https://wowforeverbuilds.com/news/no-shared-tagging-in-wow-forever-blizzard-says-it-must-hold-the-line-even-as-pla)
  - BroTown: exclusive shared spots turn into queues. Avoid "one trap spot per creature" designs.
- [source-read] **BroTown code, respawns:** world monsters respawn on a clock that speeds up with population, down to a 6 s floor in a crowded zone. — [server/src/combat.js L1586-1592](../../server/src/combat.js)
  - BroTown: crowds already ease competition for common creatures. This does nothing for rare ones.
- [source-read] **BroTown code, death piles:** a No man's land death pile belongs only to its owner until `ownerOnlyUntil`, then anyone in the zone may claim it. — [server/src/index.js L4248-4255](../../server/src/index.js)
  - BroTown: if a catch or a fallen trap is ever left on the ground, this "private, then public" pile is the ready-made template. Returning it to the owner is simpler and fairer.

### Inferences
- Placed-trap rules that fit one shared room:
  1. **Ownership is stamped when the trap is placed.** Other players can see a trap, so they know the spot is taken. They cannot trigger, check or lift it. A trap that times out goes back to its owner instead of dropping.
  2. **Spacing.** One trap per small radius per player, and a minimum gap between different players' traps, so nobody can fence off a spot. A screen-level cap on drawn traps protects phones from clutter.
  3. **The catch is spawned for the trap's owner.** It is a personal creature, not one taken from the shared monster list, so nobody can kill it first, steal it, or empty a land of monsters.
  4. **No man's land exception.** There, players allowed to fight the owner may see and break (not steal) the owner's traps. This mirrors the Wilderness's +1 trap for added risk.
  5. **Resolve the catch when the trap is checked,** using the server clock. Nothing ticks between checks, which suits the per-room message budget.
- Griefing to close before launch:
  - trap-walling: traps used to block paths, doors or nodes;
  - placing traps at a land's choke points;
  - leading aggressive monsters onto another player who is checking traps (BroTown's monsters chase, and the existing safe-ground rules show monsters can be pulled toward players).

### Gaps
- ARK trap griefing (using traps, pens or structures to grief other players' tames, and official PvE rules against it) found no source: the search budget was exhausted and ark.wiki.gg is blocked.
- Whether OSRS lets other players see, check or interfere with a STANDING trap (as opposed to a collapsed one), and the exact collapse timer, were not verified.
- No data was found on how much trap theft or crowding drives players away.

## 9. Strong players interfering with weaker ones' captures (a one-shot ends the capture), and the fixes games shipped

### Takeaway
The owner is dropping weaken-to-20% because one-hit kills skip the capture window. That problem has a multiplayer twin: a stronger passer-by one-shots the creature a weaker player was wearing down. Games fixed it in four ways:
1. **The tag protects the first player.** In classic WoW only the first damager earns credit, so a stranger's kill gains the stranger nothing. The creature still dies, though, so tagging alone does not save a capture.
2. **Shared credit.** Guild Wars 2 gives full credit and personal loot for one hit; WoW since Legion lets up to 5 players tag; Monster Hunter gives capture rewards to everyone. A strong helper then costs the weaker player nothing.
3. **The capture step leaves the shared world.** WoW pet battles phase you in with the pet, and an interrupted battle brings the same pet back. Pokemon GO raids give each player a private catch.
4. **Capture is decided on death.** Path of Exile's nets were unpopular, and since 3.5.0 killing the beast captures it automatically. How fast you kill no longer matters.

BroTown's kill path already pays contributors by their share of the damage, but its capture path ignores contribution entirely.

### Cited Findings
- [search-summary] **Classic WoW:** only the first player to damage a mob could receive credit. — [Blizzard EU forum](https://eu.forums.blizzard.com/en/wow/t/we-need-retail-style-multi-tagging-shared-tap-for-named-and-quest-mobs/630766)
  - BroTown: first-tag would stop a strong passer-by taking a weaker player's kill credit. The monster still dies, so it does not save a capture.
- [search-summary] **WoW since Legion 7.0.3 (2016):** up to 5 players tag a mob. The Dragonflight pre-patch (2022) extended this across factions, still capped at 5. — [Wowpedia: Tap](https://wowpedia.fandom.com/wiki/Tap); [Wowhead](https://www.wowhead.com/news/share-mob-tags-across-factions-starting-with-the-dragonflight-pre-patch-329345)
  - BroTown: shared credit turns a strong passer-by into a helper. BroTown's kill path already works this way through damage shares.
- [search-summary] **Guild Wars 2:** one hit earns credit, each participant gets 100% XP, and loot is rolled for each player as if they were alone. — [GW2 Wiki: Dynamic event](https://wiki.guildwars2.com/wiki/Dynamic_event); [GW2 forum archive: kill stealing](https://forum-en.gw2archive.eu/forum/game/gw2/kill-stealing)
  - BroTown: this is the most generous form. BroTown's 5% damage-share floor for gold is a softer version that already exists.
- [search-summary] **Monster Hunter World:** one hunter captures and every hunter is rewarded. — [Steam: MH World "Capture or Kill?"](https://steamcommunity.com/app/582010/discussions/0/1737760710136144371/)
  - BroTown: whatever the capture route, everyone who fought should still get the kill's rewards.
- [search-summary] **WoW pet battles:** you are phased in with the wild pet. A PvP attack breaks the battle, and "the same exact wild pet" respawns for you. — [WarcraftPets guide](https://www.warcraftpets.com/wow-pet-battles/); [Wowpedia: Pet Battle System](https://wowpedia.fandom.com/wiki/Pet_Battle_System)
  - BroTown: if any live capture remains (tools that work at full HP), give it a short "being captured" state. During it, only the capturer's actions affect the creature, enforced on the server, and the creature returns to the world if the attempt is interrupted.
- [search-summary] **Pokemon GO raids:** each trainer gets a private catch after the shared fight, with Premier Balls weighted by their own damage. — [GO Hub raid guide](https://pokemongohub.net/post/guide/go-hub-guide-to-raid-battles/); [Pokemon GO Wiki: Raid Battle](https://pokemongo.fandom.com/wiki/Raid_Battle)
  - BroTown: for elite or boss creatures, give every contributor their own capture roll after the kill, with extra rolls for more damage. Strong helpers then never cost a weaker player a chance.
- [search-summary] **Pokemon GO lures:** lure spawns appear for every trainer in range. — [Niantic Help Center: Lure Modules](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1789-lure-modules/)
  - BroTown: public spawns plus private catches leave nothing to interfere with.
- [search-summary] **Path of Exile:** Bestiary nets "weren't popular". Since 3.5.0 the player kills the beast and Einhar captures it automatically. In a party the beast first went to every member, and later each member got a separate roll. — [PoE Wiki: Net](https://pathofexile.fandom.com/wiki/Net); [GameRant](https://gamerant.com/path-of-exile-how-capture-beasts/); [PoE Wiki: Beast](https://pathofexile.fandom.com/wiki/Beast)
  - BroTown: the cleanest fix for the owner's one-hit problem is to decide capture when the monster dies, as a per-member roll in a party.
- [search-summary] **ARK official PvE:** the last hitter holds exclusive taming rights, and the first food binds the tame. — [Ark Wiki: Taming](https://ark.fandom.com/wiki/Taming); [survivetheark forum](https://survivetheark.com/index.php?%2Fforums%2Ftopic%2F33302-pve-taming-dinos%2F=)
  - BroTown: never let a capture go to whoever hits last. That rewards the strongest sniper, which is exactly the interference to remove.
- [search-summary] **Palworld:** there is no protection. The first sphere thrown wins, and players asked for a timed lock for the first attacker. — [Steam: Palworld](https://steamcommunity.com/app/1623730/discussions/0/4203615689065956058/); [TheGamer](https://www.thegamer.com/palworld-multiplayer-guide/)
  - BroTown: a short lock for the first attacker or their party is the minimum fix if any live capture survives the redesign.
- [source-read] **BroTown code, kill path:**
  - XP and gold are split by each player's share of the damage (`dmgByPlayer`), with no gold below a 5% share.
  - Every XP recipient gets quest credit.
  - The loot pile is limited to recipients.
  — [server/src/combat.js L1594-1615](../../server/src/combat.js)
  - BroTown: a weaker player who dealt at least 5% before a strong player's one-shot already keeps their XP, gold and pile rights on a kill. Capture should mirror this.
- [source-read] **BroTown code, capture path:** it checks only HP at or below 20%, the 200 px range, a free slot and a trap. It never reads `dmgByPlayer`. It removes the monster for everyone, with no kill credit. — [server/src/pets.js L132-199](../../server/src/pets.js)
  - BroTown: this is the one place where a strong player can erase a weaker player's reward (by killing first) or a stranger can take it (by trapping first).
- [source-read] **BroTown code, "provoked":** the worker already defines it as having hurt this monster during its current life and having dealt damage within the last 10 s. — [CLAUDE.md, v2.3.3056 clause](../../CLAUDE.md)
  - BroTown: this can be reused as the test for who is eligible to capture.

### Inferences
- The most robust BroTown answer is that **capture is decided at the kill, per player**: every contributor above a damage-share floor (the existing 5%) gets their own capture, befriend or egg roll when the monster dies. A strong player's one-shot then only adds helpers and never removes chances. This combines PoE's capture-on-kill, GW2's per-player rolls and Pokemon GO's private catch.
- If a full-HP capture tool remains, it needs a commit point: a 1–3 s "being captured" state in which other players' damage cannot finish the creature (server-side, like WoW's phasing). Otherwise a passer-by's area attack ends the attempt.
- Tagging alone fixes credit, not the creature dying, so it is not enough for capture.
- Rare creatures should be rolled per player on each kill, or spawned as a personal copy per eligible player. A single shared rare goes to the strongest player every time.
- Inside No man's land, interference can be intended. Outside it, it should be impossible.

### Gaps
- [memory — unverified] Ordinary Pokemon GO wild spawns are independent for each player: one trainer's catch does not remove the Pokemon for others. Widely understood, but no source was captured this session.
- [memory — unverified] Level downscaling as a fix: Guild Wars 2 and Elder Scrolls Online scale strong players down in low-level areas. Not researched; the search budget was exhausted.
- [memory — unverified] "Personal loot" systems (WoW, Diablo) roll each player's loot privately, which removes kill and loot stealing. No source captured.

## 10. Drop-based pets (eggs, cards, souls) in parties: who gets the drop, and the duplication and botting risks of drops versus captures

### Takeaway
Drop-based pets solve the one-hit problem because they work however fast you kill. But they move the pet into the loot pipeline, which changes the risks:
- **Party allocation.** Giving every party member the creature multiplies supply; Path of Exile tried it and walked it back to a separate roll per member. The generous but bounded norm is an independent roll per contributor (GW2's loot, Pokemon GO's raid catches), not one shared drop.
- **Races.** In BroTown today, the single-copy items on a kill pile go to the first eligible player who picks them up, and an active pet's 240 px pickup range wins those races.
- **Dupes.** Recent pet dupes came through transfer features (gifting, banks). An egg that is a bag item inherits every transfer path: trade, mail, market, and No man's land death drops.
- **Bots.** Drops ride the most-botted activity, kill farming. A capture at least adds a consumable and a deliberate act.
- **Pity.** Per-player counters suit drops well: RS3's kill-count thresholds, and OSRS skilling-pet odds that improve with level.

### Cited Findings
- [search-summary, via sibling notes] **OSRS skilling pets** (sibling notes' digests): the chance is 1/(B − 25 × skill level). For the baby chinchompa B is 131,395 (grey), 98,373 (red) and 82,758 (black), so 1/128,920 down to 1/80,283 at level 99. — [OSRS Wiki: Baby chinchompa](https://oldschool.runescape.wiki/w/Baby_chinchompa); [OSRS Wiki: Pet](https://oldschool.runescape.wiki/w/Pet)
  - BroTown: a pet that drops from the player's own activity (their own trap checks, their own kills) is personal by construction, so there is no party question.
- [search-summary] **RS3 boss pets:** the drop chance rises at fixed multiples of the player's own kill count. — [RuneScape Wiki: Bad luck mitigation](https://runescape.wiki/w/Bad_luck_mitigation); [RuneScape Wiki: Boss pets](https://runescape.wiki/w/Boss_pets)
  - BroTown: keep a counter per player and per species, and count a party kill once for each contributor.
- [search-summary] **Path of Exile Bestiary in parties:** at first every member got the beast. This was changed to a separate roll per member, tied to the party's item-quantity bonus. The instance owner was always guaranteed it. — [PoE Wiki: Beast](https://pathofexile.fandom.com/wiki/Beast); [PoE forum: Bestiary party-play](https://www.pathofexile.com/forum/view-thread/3349303)
  - BroTown: "a pet for every member" multiplies supply by party size, and a party of alt accounts multiplies it for free. Give each member an independent roll at the solo rate, with a damage-share floor.
- [search-summary] **Party reward norms:** GW2 rolls loot per participant ([GW2 Wiki: Dynamic event](https://wiki.guildwars2.com/wiki/Dynamic_event)). Pokemon GO raids give each player a catch ([GO Hub](https://pokemongohub.net/post/guide/go-hub-guide-to-raid-battles/)). Monster Hunter gives capture rewards to all ([Steam: MH World](https://steamcommunity.com/app/582010/discussions/0/1737760710136144371/)).
  - BroTown: the shared expectation across these is that nobody in the group loses because someone else got the drop.
- [search-summary, via sibling notes] **"Souls" from corpses** (sibling digest): Path of Exile's Raise Spectre turns the corpse of almost any non-unique monster into a permanent minion that keeps its skills. — [PoE Wiki: Raise Spectre](https://pathofexile.fandom.com/wiki/Raise_Spectre)
  - BroTown: a soul or essence earned from the kill works with one-hit kills. As a per-player counter ("collect 10 frost-goblin souls"), it smooths out luck and needs no party allocation at all.
- [search-summary, via sibling notes] **MapleStory familiars** (sibling notes, digest of the MapleStory wiki; original URL not recorded): familiar cards drop from specific monsters, and sets complete into badges. — [after_the_catch.md](after_the_catch.md)
  - BroTown: a card as a bag item would be tradeable loot. A card recorded straight into a per-player collection is not.
- [search-summary] **Pet dupes:**
  - Grow a Garden disabled pet gifting from 7 June 2025 over a dupe exploit, and set about removing cloned pets. A lower-quality source says the clones were mostly pets from premium or event eggs. — [Sportskeeda](https://www.sportskeeda.com/roblox-news/why-pet-gifting-disabled-grow-garden); [u4gm](https://www.u4gm.com/grow-a-garden/blog-why-is-pet-trading-disabled-in-grow-a-garden)
  - Pet Simulator X's bank dupe was answered with bans and automatic deletion of the duped pets. — [Entertainment Focus](https://entertainment-focus.com/2021/12/14/pet-simulator-x-pet-dupers-get-punished/)
  - A Hypixel SkyBlock duper of Scatha pets was banned. — [Hypixel forum](https://hypixel.net/threads/watch-out-for-duped-scatha-pets-update-duper-banned.4581136/)
  - BroTown: every route by which a pet or egg can move (gift, mail, bank, trade, market, death pile) is a dupe route. The fewer of them an egg can use, the smaller the risk.
- [search-summary] **Bots:** Jagex reportedly banned more than 6.2 million bot accounts in 2026, and Hunter bots are sold commercially. Pokemon GO's unofficial catch caps (4,800 a day, 14,000 a week) exist to stop farming. — [Notebookcheck](https://www.notebookcheck.net/Old-School-RuneScape-finally-feels-fair-again-as-Jagex-bans-6-2-Million-bots.1313053.0.html); [bottinghub](https://bottinghub.com/hunter-ai/); [Future Game Releases](https://www.futuregamereleases.com/2020/08/pokemon-go-daily-and-weekly-catch-limit/)
  - BroTown: drops scale with how fast you kill, which is what bots and area-attack farmers maximise. Use low per-player rates, a daily cap and pity, rather than high base rates.
- [source-read] **BroTown code, kill-pile races:** on a kill pile, the single-copy items go to the first eligible picker among the recipients (players with at least a 5% damage share): the skull, shard or gem slot, the weapon and the armour. The code notes "the claimant is not always the killer (shares, pet vacuum)". An active pet widens the pickup range to 240 px. — [server/src/index.js L4206-4260, L4336-4390](../../server/src/index.js); [server/src/pets.js L57-64](../../server/src/pets.js)
  - BroTown: an egg added to today's pile would become a race that the pet owner usually wins. Give eggs their own lane per recipient instead.
- [source-read] **BroTown code, pet claims at join:** when the server holds no pets for a player, joining adopts the client's own claimed pet list. It accepts up to 6 pets, checked only for shape (a known archetype, level clamped to 1–100), and every join regenerates the pet ids. — [server/src/pets.js L77-127](../../server/src/pets.js)
  - The gear provenance ledger was built because shape-only checks on client claims let forged and duplicate gear through. — [server/src/gearprov.js header](../../server/src/gearprov.js)
  - BroTown: before pets carry value (drops, trading, the market), they need the same treatment: a stable server-assigned id with a provenance row, and no adopting of client claims. Otherwise a forged or duplicated pet list cannot be told apart from a real one.
- [source-read] **BroTown code, No man's land death piles:** they belong only to the killer until a timer runs out, then anyone may claim them. — [server/src/index.js L4248-4255](../../server/src/index.js)
  - BroTown: an egg kept as a bag item would go to the killer in No man's land. Decide this deliberately: either eggs are bound and kept on death (like OSRS pets), or they are at risk like other bag loot.

### Inferences
- Drops versus captures, for BroTown:
  - **Supply.** Drops grow with kill speed; captures grow with deliberate attempts and consumables. If drops: low per-player rates, a daily cap, pity per species, and each kill counted once per player.
  - **Dupe surface.** Captured pets live in `ps.lifeSkills.pets`, outside items, mail and market. Eggs as items would enter every item path. Make eggs bound and keep them out of the inventory: on a drop, the server writes straight to a per-player hatchery list, the way a capture writes to the pet list, and never to `ps.inventory`.
  - **Party fairness.** An independent roll per contributor above the share floor (the same 5% gold already uses), never one shared egg on the pile.
  - **Forgery.** Pet ids must be minted by the server and stay stable before any of this ships.
- Collect-N cards or souls are the lowest-risk drop variant. Progress is per player and certain rather than lucky, works with one-hit kills, and is held as counters rather than items, so there is nothing to dupe, trade or lose on death.
- Whatever the route, award pets on the server, limit them per player per day, and tie them to things bots find awkward. The gathering gesture already enforces an honest speed floor (`HONEST_CYCLE`, [CLAUDE.md](../../CLAUDE.md)).

### Gaps
- No source was found on how MMOs allocate rare pet drops in group content (for example OSRS group-boss pets or WoW group loot for pets): the search budget was exhausted.
  - [memory — unverified] Lead: OSRS gives a monster's drop, boss pets included, to the player who dealt the most damage.
- No published data was found comparing bot or dupe rates for drop-based and capture-based pets. The comparison above is inference from the cases and BroTown's code.
- The egg, card and soul mechanics themselves (rates, hatch timers) are covered by the sibling `after_the_catch.md`. This section covers only their multiplayer side.
