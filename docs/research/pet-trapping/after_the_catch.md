# After the Catch: what captured creatures and pets do (roles, progression, care, collection, ranching, acquisition, pitfalls)

> **Method note.** WebFetch was blocked by this session's egress policy for nearly every wiki or guide domain tried: OSRS Wiki, warcraft.wiki.gg, maplestorywiki.net, irowiki.org, consolegameswiki, every *.fandom.com, Bulbapedia, Serebii, PokémonDB, Dododex, dragon-quest.org, Maxroll, Garmoth and GameFAQs. So the external facts below come from WebSearch result summaries of the linked pages, not from reading the pages in full. Numbers are given as those summaries reported them, and dated or conflicting ones are flagged. The session's shared web-search budget (200 calls per turn across all agents) ran out before the coordinator's late request about non-capture acquisition (section 6). Several titles named in that request are therefore listed as gaps, not cited. BroTown facts come from reading the repo at the paths given.
>
> **Provenance tags.** Every finding line ends with a tag. `[source-read]` means read directly in the BroTown repo, or in CLAUDE.md. `[search-summary]` means taken from a WebSearch result summary of the linked page; the page itself was not opened, because of the egress blocks above. `[memory — unverified]` means my own recollection, not checked against any source; these appear only in Gaps. Numbers restated in Takeaways, Inferences and tables carry the tag of the finding they come from. Proposed numbers in the Inferences (e.g. suggested odds) are design suggestions, not facts. A follow-up could confirm `[search-summary]` numbers against datamined GitHub repos; the coordinator reports that github.com and raw.githubusercontent.com do open with WebFetch.

---

## 1. Role taxonomy: what pets DO after capture, and what each role costs to build

### Takeaway
Six roles recur in ARPGs and MMOs: cosmetic followers, loot or utility helpers, passive-buff charms, active combat companions, base or ranch workers, and mounts. Their build costs differ by an order of magnitude. A cosmetic, loot or buff pet is just a field and a modifier on its owner. A combat pet is a second monster in the server tick, with its own AI, pathing, aggro and PvP rules. Games that kept combat pets either built a whole class budget around them (WoW Hunter, GW2 Ranger, PoE minion builds) or folded the pet into the player (GW2 Soulbeast; WoW's Lone Wolf pays you for going without one).

### Cited Findings

#### BroTown today (read from the repo)
- **Capture rules.** Capture is server-validated:
  - the monster must be at 20% HP or less and within 200 px, and one `basic_trap` is spent per attempt;
  - chance = 0.40 + 0.005 × Trapping level + 0.002 × Woodcutting level − 0.05 per level the monster is above you, clamped to 0.10–0.95;
  - a success removes the monster for everyone, with no loot, XP or kill credit;
  - Trapping XP is 5 for an escape and 15 + 2 × monster level for a capture; at most 6 pets.
  
  — [server/src/pets.js](../../../server/src/pets.js) (lines 41–65, 132–200) [source-read]
- The active pet's ONLY gameplay effect is a wider loot pickup: the owner's radius becomes 240 px instead of 160, measured from the owner's server position. The server does not track the pet's position; the follow orbit is client-only cosmetics — [server/src/pets.js](../../../server/src/pets.js) (lines 25–34, 54–64); [docs/specs/pets.md](../../../docs/specs/pets.md) [source-read]
- The pet is drawn as its emoji (15 px Text), a 7 px name and a shadow ellipse, with no texture asset. Other players' active pets are relayed as a `pet:` field in the join/move payload — [src/rendering/systems/entityRenderer.js](../../../src/rendering/systems/entityRenderer.js) (`_updatePet`, ~line 14913) [source-read]
- Stored pet fields: archetype, element, name, level (the monster's level at capture, then frozen), emoji, colour, captured_at, and personality (playful/lazy/curious/anxious/bold). The client uses personality only to wobble the follow orbit — [server/src/pets.js](../../../server/src/pets.js) (lines 67–69, 83–101); [src/ui/BroTown.jsx](../../../src/ui/BroTown.jsx) (~line 6483) [source-read]
- **Client-only evolve and enchant.** Two client functions exist with no server handler:
  - `evolvePet` consumes two pets to make the next tier of Base/Evolved/Ascended/Mythic (level requirements 1/10/25/50). It adds level +2, a `combatPower` figure, 1 + tier enchant slots, and a secondary archetype and element.
  - `enchantPet` costs 1/3/5 gems plus 50/200/500 gold.
  
  `_sanitizePets` keeps only 8 whitelisted fields and runs on every join, so evolved or enchanted fields do not survive a relog. The spec already lists a server `pet_evolve` as a successor — [src/data/gameSystems.js](../../../src/data/gameSystems.js) (lines 1197–1265); [docs/specs/pets.md](../../../docs/specs/pets.md) ("Attach points for successors") [source-read]
- **Incidental bug.** `PET_ELEMENTS` lists flame, venom, frost, storm, stone, wind and water, but not `'flora'`, which is the Verdant Wilds zone's element. Since `_sanitizePets` runs on every join, a pet captured with element `'flora'` would have its element nulled after a relog — [server/src/pets.js](../../../server/src/pets.js) (line 69, line 92); [server/src/data.js](../../../server/src/data.js) (line 360) [source-read]
- Gathering nodes already have a tiered, server-checked level gate: `GATHER_REQ_LVL` covers `oreVein`, `fishSpot` and `tree` by tier (1/6/11/16/21) — [server/src/gathering.js](../../../server/src/gathering.js) (line 150). This is relevant to the nest idea in section 6. [source-read]

#### Cosmetic followers
- OSRS skilling pets are rare drops from skilling actions. Chance = 1/(BaseChance − SkillLevel × 25). It stops improving at level 99, except that 200M XP in the skill makes the pet 15× more likely (the final denominator is divided by 15) — [OSRS Wiki: Pet](https://oldschool.runescape.wiki/w/Pet) [search-summary]
- OSRS one-off pets are insured automatically, and a lost pet can be reclaimed from Probita. Reclaims are reported free since September 2025, with a "look harder" retry added in June 2024. A duplicate pet earns a free reclaim token — [OSRS Wiki: Probita](https://oldschool.runescape.wiki/w/Probita) (dates from the search summary; flag) [search-summary]
- FFXIV manages minion clutter with display options rather than limits:
  - minion names can be shown only when targeted, or never;
  - Group Pose can hide minions, pets and companions;
  - holding X filters nameplates in crowds.
  
  Players have asked on the official forum for a toggle that hides all non-party characters, minions and companions in congested areas — [Destructoid: FFXIV HUD tips](https://www.destructoid.com/10-ffxiv-hotbar-and-hud-tips-and-tricks-you-may-not-know/); [FFXIV UI guide: target filter](https://na.finalfantasyxiv.com/uiguide/faq/faq-other/setting_tgfilter.html); [Square Enix forum thread 182806](https://forum.square-enix.com/ffxiv/threads/182806) [search-summary]
- WoW companion pets double as battle pets:
  - at most 3 of any species in the journal;
  - qualities Poor, Common, Uncommon and Rare (Epic and Legendary exist in the data but players cannot obtain them), with higher quality meaning more health, speed and power;
  - 10 breed variants, each with two breed IDs;
  - pets can be caged and sold on the auction house, and only caged listings show the breed;
  - Wowpedia cites "up to 650 companions" (probably out of date).
  
  — [WarcraftPets: breeds](https://www.warcraftpets.com/wow-pet-battles/breeds/); [Wowpedia: Companion](https://wowpedia.fandom.com/wiki/Companion); [Wowpedia: Pet Battle System](https://wowpedia.fandom.com/wiki/Pet_Battle_System) [search-summary]

#### Loot and utility pets
- **Torchlight II.**
  - Pets carry loot back to town to sell it.
  - Given gold and a shopping list, they buy health and mana potions, town portal scrolls and identify scrolls.
  - Feeding a pet fish transforms it: temporarily into a monster, permanently into another pet type, or into a timed bonus.
  - Each pet wears one collar and two tags.
  
  — [Torchlight Wiki: Pets (T2)](https://torchlight.fandom.com/wiki/Pets_(T2)); [Torchlight Wiki: Fish (T2)](https://torchlight.fandom.com/wiki/Fish_(T2)) [search-summary]
- **MapleStory.**
  - Pets automatically pick up items and mesos within reach.
  - Feeding a hungry pet raises Closeness, which unlocks pet levels and commands.
  - A pet's magic lasts about 90 days, then it turns into a doll until revived with Premium Water of Life: 2,400 NX (or 2,400 reward points) for 90 days, or 270 days with the Concentrated version.
  
  — [StrategyWiki: MapleStory/Pets](https://strategywiki.org/wiki/MapleStory/Pets); [MapleStory Wiki (Fandom): Pet](https://maplestory.fandom.com/wiki/Pet); [GameTaco: Premium Water of Life](https://gametaco.net/maplestory-premium-water-of-life/) [search-summary]
- **Lost Ark.**
  - Auto-loot is a free base pet feature with filters: currency, Adventurer's Tome collectibles, island materials, and gear by tier, level or rank. It only works while the pet is summoned.
  - The Crystalline Aura unlocks extra "pet functions": a 50-slot pet inventory, remote storage, and remote repair of gear and trade-skill tools.
  
  — [Maxroll: Lost Ark mounts & pets](https://maxroll.gg/lost-ark/resources/mounts-pets); [Prima Games: Crystalline Aura](https://primagames.com/gaming/lost-ark-crystalline-aura) [search-summary]
- **Black Desert.**
  - Pets are the auto-looters, up to 5 out at once.
  - At 0% hunger a pet stops looting.
  - A more active movement setting loots faster but burns hunger faster.
  - Higher tiers loot faster and give better passives: one skill at T1–T2, two at T3, three at T4.
  
  — [Garmoth: BDO Basics – Pets](https://garmoth.com/guides/post/bdo-basics-pets); [BDFoundry: Pets guide](https://www.blackdesertfoundry.com/pets-guide/) [search-summary]
- **Diablo IV** (2024).
  - Pets are cosmetic followers that pick up gold, herbs, ores, gem fragments, crafting materials, Forgotten Souls, Murmuring Obols and Aberrant Cinders, but not quest items.
  - They fetch items lying just off-screen.
  - Four pets at launch: one free from a quest, three from editions or pre-order.
  
  — [Icy Veins: Diablo IV pet guide](https://www.icy-veins.com/d4/guides/pet-guide/); [Blizzard forums: what pets will pick up](https://us.forums.blizzard.com/en/d4/t/per-pezradar-adam-this-is-what-pets-will-pick-up/170082); [GameRant: how to get a pet](https://gamerant.com/diablo-4-how-get-pet/) [search-summary]
- RuneScape 3 legendary pets give gameplay benefits, including automatically scavenging certain drops. Some come from the Premier Club token store, others from the paid Marketplace — [RuneScape Wiki: Legendary pet](https://runescape.wiki/w/Legendary_pet) [search-summary]

#### Passive-buff pets
- **MapleStory familiars.**
  - Cards from specific monsters are logged into a Familiar Collection.
  - Completing a set earns a Familiar Badge; up to 8 badges can be equipped. Examples: Starter Badge MaxHP +5; Wings Badge Speed +1 and all stats +1%.
  - Each familiar has 2 potential lines (e.g. All Stats +1%, Weapon ATT +3%), which are hidden and must be re-appraised when it ranks up.
  
  — [MapleStory Wiki: Familiars](https://maplestorywiki.net/w/Familiars); [StrategyWiki: MapleStory/Familiars](https://strategywiki.org/wiki/MapleStory/Familiars) [search-summary]
- Ragnarok Online: a pet hatches at Neutral intimacy, and its stat bonus only switches on at Loyal (910–1000 intimacy) — [Ragnarok Wiki: Cute Pet System](https://ragnarok.fandom.com/wiki/Cute_Pet_System) [search-summary]
- Pokémon GO: a Best Buddy gets a CP boost equal to one extra level (40→41, 50→51), but only while it is your active buddy — [Pokémon GO Wiki: Buddy Pokémon](https://pokemongo.fandom.com/wiki/Buddy_Pok%C3%A9mon); [Pokémon.com: Buddy Adventure tips](https://www.pokemon.com/us/strategy/tips-to-make-the-most-of-buddy-adventure-in-pokemon-go) [search-summary]
- WoW Hunter pet specializations are partly buffs on the owner:
  - Ferocity: 4% Leech, plus Primal Rage (+30% haste for the group for 40 s);
  - Tenacity: +5% max health and −3% damage taken;
  - Cunning: Master's Call (a freedom effect) and +8% movement speed.
  
  — [Icy Veins: Hunter pets guide](https://www.icy-veins.com/wow/hunter-pets-guide); [Icy Veins: BM Hunter pets](https://www.icy-veins.com/wow/beast-mastery-hunter-pets-guide) [search-summary]
- Lost Ark: a pet upgraded to Legendary in the Pet Ranch gains a random skill that triggers one of three effects at random points in combat — [Lost Ark news: Pet Ranch](https://www.playlostark.com/en-us/news/articles/lost-ark-academy-pet-ranch) [search-summary]
- Palworld: 12 Pals, one per work type, have partner skills that add +1 to that work suitability for every other Pal at the base. Duplicates do not stack — [Palworld Wiki (Fandom): Work Suitability](https://palworld.fandom.com/wiki/Work_Suitability); [PalMods: partner skill rework](https://www.palmods.gg/guides/whats-new/partner-skill-rework) [search-summary]

#### Active combat companions
- WoW Hunter: the 3 specializations above; 200 stable slots plus 5 active (205 in all) — [Icy Veins: Hunter pets guide](https://www.icy-veins.com/wow/hunter-pets-guide) [search-summary]
- WoW Marksmanship's Lone Wolf pays the hunter for having NO pet: +5% damage since patch 11.0.0 (it was 10%), reaching full value 20 s after the pet is dismissed — [Wowpedia: Lone Wolf](https://wowpedia.fandom.com/wiki/Lone_Wolf); [Warcraft Wiki: Lone Wolf](https://warcraft.wiki.gg/wiki/Lone_Wolf) [search-summary]
- GW2 Ranger pets take 95% less damage from most ground-targeted AoE from PvE enemies. The same summary also said pets are immune to crowd control; that part is unverified — [GW2 Wiki: Pet](https://wiki.guildwars2.com/wiki/Pet) [search-summary]
- GW2 Soulbeast (Path of Fire, 2017) merges the pet into the player through "Beastmode". While merged the pet has no physical form; instead it grants attributes and three skills based on its family and archetype. The cost is losing the pet's own damage — [GW2 Wiki: Soulbeast](https://wiki.guildwars2.com/wiki/Soulbeast); [GW2 forums: Soulbeast pet swapping](https://en-forum.guildwars2.com/topic/115366-allow-soulbeasts-to-swap-pets-in-combat-again/) [search-summary]
- **Path of Exile spectres.**
  - Raise Spectre turns the corpse of almost any non-unique monster into a permanent minion of that monster type: normal rarity, but keeping its intrinsic mods.
  - Spectres persist through logout.
  - In PoE2, Bind Spectre makes an account-bound gem, and a dead spectre becomes an orb that re-forms when you enter an area.
  
  — [PoE Wiki: Raise Spectre](https://pathofexile.fandom.com/wiki/Raise_Spectre); [Game8: PoE2 Bind Spectre](https://game8.co/games/Path-of-Exile-2/archives/507288) [search-summary]
- Ultima Online: players have 5 pet control slots by default. Most pets take 1; stronger ones take 2 (e.g. drakes, nightmares) or 3 (dragons, white wyrms, golems) — [UO.com: Pet Ownership](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/pets-ownership/) [search-summary]
- **FFXIV chocobo companion** (unlocked at level 30).
  - It fights beside you.
  - Rank goes from 1 to 20, but stalls at rank 10 until it is fed a Thavnairian Onion.
  - It can be stabled and trained once an hour with vegetables.
  - Giving the same snack repeatedly makes it a "favorite feed", which has a combat effect.
  
  — [FFXIV UI guide: chocobo rank](https://na.finalfantasyxiv.com/uiguide/faq/faq-chocobo/chocobo_rank.html); [Screen Rant: raise your chocobo](https://screenrant.com/final-fantasy-xiv-raise-chocobo-companion/) [search-summary]
- Monster Hunter Rise buddies (Palico, Palamute) fight beside the hunter, while reserve buddies go on expeditions — [GameSpot: Rise buddy explainer](https://www.gamespot.com/articles/monster-hunter-rise-buddy-explainer-how-palamutes-and-palicoes-work/1100-6488765/) [search-summary]

#### Base and ranch workers
- Palworld 1.0 raised Work Suitability's cap from 5 to 10. Passives such as Ranch Master (+2) and Farmhand (+1) raise the farming suitability — [Nodecraft: Work Suitability level 10](https://nodecraft.com/support/games/palworld/general/palworld-work-suitability-level-10-explained); [Palworld Wiki (Fandom): Work Suitability](https://palworld.fandom.com/wiki/Work_Suitability) [search-summary]
- **Slime Rancher.**
  - Slimes kept in corrals eat food and produce plorts.
  - A largo (two slime types merged into one) produces 2 plorts per meal, or 4 on a favourite food.
  - A largo that eats a third plort type becomes Tarr, which eats slimes, chickens, crops and even ranchers.
  
  — [Slime Rancher Wiki: Largo Slimes](https://slimerancher.fandom.com/wiki/Largo_Slimes); [Slime Rancher Wiki: The Tarr](https://slimerancher.fandom.com/wiki/The_Tarr) [search-summary]
- FFXIV Island Sanctuary: captured animals go to the Pasture automatically. Fed animals are happier and leave "leavings", collected in Gather mode — [GameRant: Island Sanctuary animals](https://gamerant.com/ff-xiv-14-island-sanctuary-animal-guide-makeshift-net-restraints-soporific-pasture/) [search-summary]
- Lost Ark Pet Ranch (August 2022):
  - pets working in the Cookie Workshop earn Expertise and Jam Cookies but lose Morale, which they regain in the Ranch;
  - Jam Cookies buy pet cosmetics, weekly rewards and card packs.
  
  — [Lost Ark news: Pet Ranch](https://www.playlostark.com/en-us/news/articles/lost-ark-academy-pet-ranch); [GGRecon: Pet Ranch](https://www.ggrecon.com/guides/lost-ark-pet-ranch/) [search-summary]

#### Mounts
- Black Desert horses come in tiers 1–8. Dream Horses (tiers 9–10) are made by awakening a tier-8 Courser after Courser Training. The skills required rise with tier: Charge alone at T1–2, up to seven skills at T8 — [Pearl Abyss: GM Notes on horses](https://blackdesert.pearlabyss.com/ASIA/en-us/News/Notice/Detail?_boardNo=3293); [Thería Games: BDO horses](https://theriagames.com/guide/black-desert-online-horses/); [BDFoundry: Dream Horses](https://www.blackdesertfoundry.com/awakened-horses-tier-9/) [search-summary]
- **Albion Online mounts.**
  - They are crafted from farm-raised animals.
  - They can be fully looted on death in red and black zones; skins are account-bound and never drop.
  - Taking or dealing damage while mounted despawns the mount.
  - At 0 mount HP you are dismounted, with a 30 s cooldown before you can remount.
  
  — [Albion Wiki: Island Farms](https://wiki.albiononline.com/wiki/Island_Farms); [Albion forum: mounts dropped on death](https://forum.albiononline.com/index.php/Thread/45188-Mounts-dropped-on-Death/); [Albion forum: dismount](https://forum.albiononline.com/index.php/Thread/160691-From-NDA-playtests-Dismount/) [search-summary]

### Inferences

#### Implementation cost classes (my classification, inferred from the mechanics above)
| Class | What the server must do | Examples | Phone and memory cost |
|---|---|---|---|
| **C1 Replicated cosmetic** | Store which pet is active. Each client draws its own orbit from the owner's synced position. | OSRS pets, FFXIV minions, WoW companions; **BroTown today** | One small look per distinct pet on screen (zero for BroTown's emoji) |
| **C2 Owner modifier** | Apply the pet's effect to the owner's numbers (loot radius, % stat, status resistance, XP or drop bonus). No pet entity. | Torchlight/D4/BDO/Lost Ark/MapleStory loot pets; RO, MapleStory-familiar and GO-buddy buffs; **BroTown's 240 px pickup** | Same as C1 |
| **C3 Timed job** | Keep timestamps for an expedition, ranch production, incubation or care, and settle them when read. Needs storage keys, opId idempotency and economy sinks. | Lost Ark Pet Ranch, MH Rise Meowcenaries, T&L Amitoi, Slime Rancher corrals, Palworld incubators, Torchlight town trips | Nothing in the field; one farm or pen screen |
| **C4-lite "proc pet"** | Compute pet damage or status as part of the owner's hit or ability; the client only animates the pet. | GW2 Soulbeast (pet folded into player), Lost Ark Legendary procs; Lone Wolf shows the pet sits inside the class's damage budget | Pet attack animation |
| **C4 Simulated entity** | Run a second actor in the tick: AI, pathing, threat, hitbox and HP, PvP targeting, interest management, wire deltas. | WoW Hunter, GW2 Ranger, PoE spectres, UO tames, Palworld base AI | A full monster look per pet on screen, plus pathing bugs |
| **Mount** | Change the movement bound (BroTown's sprint already multiplies it), track mounted state, apply dismount rules. | BDO, Albion, Ark | A large sprite per rider |

#### What each role would mean for BroTown
- **Cosmetic (C1).** BroTown is already here, with a zero-texture emoji. Switching to real monster art would keep a captured monster's whole look loaded wherever the owner walks, but the Wheel frees each land's looks as you leave it (CLAUDE.md: four looks held about 57 MB at the Flame Fields [source-read]). So a pet's look should be a small, separately made mini-sprite or the emoji, and it falls under the per-PR `mp-membudget` check.
- **Loot/utility (C2/C3).** The 240 px pickup radius is already this role. Lost Ark-style pickup filters, and a Torchlight-style "send the pet to sell junk" timer (C3), would save taps on a small touch screen. Keep both out of the $2 supporter pass, to avoid the Lost Ark, MapleStory and RS3 pattern of paid pet functions.
- **Passive buff (C2).** The stored `element` could become a small, capped resistance to that land's on-hit status. Chill, burn, gust, hold, daze, shock, soak and poison already exist server-side in `server/src/monsterstatus.js`. That makes "one pet per land" a collection goal without opening a power gap. `personality` could become a flavour-sized modifier.
- **Combat (C4).** A full combat entity is the most expensive option in a server-authoritative Durable Object: AI, pathing and threat run in the tick, `zone_state` grows, and PvP needs rules. It also puts a second figure per player on a phone screen. A proc pet (C4-lite) gives most of the feel at a fraction of the cost.
- **Ranch workers (C3).** Spare pets placed at the farm (`farm_home`) as timers avoid Palworld's pathing problems entirely.
- **Mounts.** These need a server movement-bound change (precedent: sprint's 1.33× bound [source-read: CLAUDE.md]), large sprites and PvP rules. Albion's dismount-on-damage is a ready-made PvP rule. Mounts are the lowest priority under a phone memory budget.

### Gaps
- The following were not verified (wiki pages egress-blocked, search budget exhausted): Grim Dawn-style summons, how long a Torchlight town trip takes, WoW battle pets' level cap and wild-capture HP rule, and FFXIV's total minion count.
- No source said whether BDO pets or WoW companions are server-simulated entities or client-derived followers. The cost classes above are my inference from how they behave.
- Lost Ark: no pet hunger mechanic was found. The brief's "Lost Ark auto-loot pets with hunger" matches BDO instead; the only depletion found in Lost Ark is Pet Ranch Morale. How the Crystalline Aura is acquired (paid or in-game currency) was not verified.

---

## 2. Progression and care: levels, evolution, bonding, hunger, hidden stats, merging, fusion

### Takeaway
Long-term goals without power creep come from bounded, visible progress, such as:
- a capped percentage (Palworld's 4 stars = +20%; a GO Best Buddy = one extra level);
- affection with a daily cap (GO: 10 hearts a day, about 30 days in all);
- duplicates turned into progress (Palworld condensing, BDO exchange, GO candy).

Care systems that only punish were removed, softened or remembered as chores: WoW's unhappy −25% damage, UO pets going wild, RO pets running away, MapleStory pets expiring. Hidden random stats (Pokémon IVs) drove so much grinding that later games added items to fix bad rolls.

### Cited Findings

#### Levels, rank and evolution
- FFXIV chocobo: rank 1–20, capped at 10 until fed a Thavnairian Onion; training is hourly with a vegetable; an unclean stable gives an EXP penalty — [FFXIV UI guide: chocobo rank](https://na.finalfantasyxiv.com/uiguide/faq/faq-chocobo/chocobo_rank.html); [Screen Rant](https://screenrant.com/final-fantasy-xiv-raise-chocobo-companion/) [search-summary]
- Lost Ark pets earn Expertise in the Pet Ranch. At max Expertise, Pet Growth Tokens upgrade them toward Legendary — [Lost Ark news: Pet Ranch](https://www.playlostark.com/en-us/news/articles/lost-ark-academy-pet-ranch) [search-summary]
- Monster Hunter Rise: higher-level buddies bring back more expedition rewards — [Fextralife: Meowcenaries](https://monsterhunterrise.wiki.fextralife.com/Meowcenaries) [search-summary]
- Cassette Beasts: forms can be "remastered" (evolved). 10% of the rogue fusions that could be remastered appear remastered — [Cassette Beasts Wiki: Fusion](https://wiki.cassettebeasts.com/wiki/Fusion) [search-summary]

#### Affection and bonding
- Pokémon GO:
  - four buddy levels: Good, Great, Ultra and Best;
  - Best Buddy takes 300 hearts, at most 10 a day (20 when "Excited"), so about 30 days at minimum;
  - the Best Buddy CP boost (+1 level) only applies while that Pokémon is the active buddy.
  
  — [Pokémon GO Wiki: Buddy](https://pokemongo.fandom.com/wiki/Buddy_Pok%C3%A9mon); [Pokémon.com](https://www.pokemon.com/us/strategy/tips-to-make-the-most-of-buddy-adventure-in-pokemon-go) [search-summary]
- Ragnarok Online:
  - intimacy runs from Neutral up to Loyal (910–1000), and the bonus only applies at Loyal;
  - hunger states run from Very Hungry (0–10) to Stuffed (76–100);
  - a starving pet loses intimacy every 20 s, and at 0 it runs away;
  - each death of the owner costs about 20 intimacy.
  
  — [Ragnarok Wiki: Cute Pet System](https://ragnarok.fandom.com/wiki/Cute_Pet_System) [search-summary]
- Ultima Online:
  - a pet bonds 7 days after it is first fed by an owner with enough real Taming skill;
  - since Publish 111, bonded pets no longer go wild from hunger; they stop obeying until fed;
  - any food restores full loyalty.
  
  — [UO.com: Pet Ownership](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/pets-ownership/); [UO forums: pet loyalty](https://forum.uo.com/discussion/9389/pet-loyalty-clarification) [search-summary]
- Ark: 100% imprinting while raising a baby gives +20% stats on default settings. When the imprinter rides it, it also gets +30% damage and +30% damage resistance — [Dododex: breeding & mutations](https://help.dododex.com/en/article/ark-breeding-mutations-guide). The brief's "+30% stats" does not match this source. [search-summary]

#### Hunger, feeding and upkeep
- WoW patch 4.1.0 (26 April 2011) removed Hunter pet happiness and loyalty. Happy pets had dealt +25% damage and unhappy ones −25%. The happy bonus became the baseline for every pet, and feeding now only heals 50% outside combat — [Wowpedia: Happiness](https://wowpedia.fandom.com/wiki/Happiness); [Petopia: patch 4.1](https://www.wow-petopia.com/php/cataclysm/patch41.php) [search-summary]
- BDO: a pet at 0% hunger stops looting, and the activity setting trades loot speed against hunger — [Garmoth](https://garmoth.com/guides/post/bdo-basics-pets) [search-summary]
- Palworld: base Pals that get stuck go hungry, lose sanity (SAN) and get injured — [Screen Rant: Pal pathing](https://screenrant.com/palworld-pal-stuck-pathing-broken-ai/) [search-summary]
- Albion: each animal has a favourite food that halves the feed it needs, and Focus can "nurture" livestock to raise offspring yield — [Albion Wiki: Farm Animal](https://wiki.albiononline.com/wiki/Farm_Animal); [Albion Wiki: Island Farms](https://wiki.albiononline.com/wiki/Island_Farms) [search-summary]

#### Traits and hidden stats
- Pokémon: IVs range 0–31 per stat (up to +31 stat points at level 100); a nature raises one stat by 10% and lowers another by 10%; EVs total 508, with at most 252 in one stat — [Game8: EVs, IVs and Natures](https://game8.co/games/Pokemon-Scarlet-Violet/archives/386382); [Bulbapedia: Individual values](https://bulbapedia.bulbagarden.net/wiki/Individual_values) [search-summary]
- Pokémon later added ways to fix bad rolls: a Bottle Cap raises one IV to max (a Gold Bottle Cap does all of them), and mints change stat growth (but not the nature passed on by breeding) — [Nintendo Life: Hyper Training](https://www.nintendolife.com/guides/pokemon-scarlet-and-violet-hyper-training-and-how-to-get-bottle-caps); [Sportskeeda: natures and mints](https://www.sportskeeda.com/esports/pokemon-sword-and-shield-nature-and-mints-guide) [search-summary]
- **Palworld passives** (patch drift likely):
  - up to 4 per Pal, no duplicates, and bonuses to the same stat add together;
  - Legend: +20% Attack, +20% Defense, +15% movement speed. It is fixed on certain legendary Pals and can be bred down;
  - Lucky: +15% Attack, +15% Defense, +20% work speed (after the v1.0.4 fix). Lucky Pals sparkle in the wild;
  - gold-glow alpha Pals roll the top passives more often.
  
  — [Palworld Wiki (Fandom): Passive Skills](https://palworld.fandom.com/wiki/Passive_Skills); [Palworld Wiki: Lucky](https://palworld.wiki.gg/wiki/Lucky); [Palworld Wiki: Legend](https://palworld.wiki.gg/wiki/Legend) [search-summary]
- Ark mutations: about a 7.31% chance per baby while both parents are under 20 mutations on their side, falling to 3.7% once a side is capped. A stat stops at 255 levels — [Dododex](https://help.dododex.com/en/article/ark-breeding-mutations-guide); [ArkStatus](https://arkstatus.com/breeding-mutations/) [search-summary]
- Coromon potential:
  - 1–16 is Standard (97.09%), 17–20 Potent (2.88%, about 1 in 35), 21 Perfect (1 in 3,194);
  - higher potential fills the bonus-point XP bar faster;
  - Potent Scent rolls three times instead of once.
  
  — [Coromon Wiki: Potential](https://coromon.wiki.gg/wiki/Potential); [DigitalTQ: Coromon potential](https://www.digitaltq.com/coromon-potential) [search-summary]
- Temtem: fertility up to 8, and each parent loses 1 per egg. Wild Temtem lose 0.5 fertility for each single value of 49 or 50 — [Temtem Wiki: Breeding](https://temtem.wiki.gg/wiki/Breeding) [search-summary]

#### Merging duplicates and fusion
- BDO pet exchange: two same-tier pets give a chance at the next tier, keeping a chosen skill or rolling a new random one. There is an Auto-Exchange option — [Garmoth](https://garmoth.com/guides/post/bdo-basics-pets); [BDFoundry](https://www.blackdesertfoundry.com/pets-guide/) [search-summary]
- Palworld condensing:
  - 4 stars cost 48 duplicates (4, then 8, 12 and 24);
  - each star gives +5% HP, Attack and Defense (+20% in total);
  - the partner skill gains up to +5 levels;
  - at 4 stars, every work suitability gets +1.
  
  — [Timesaver: condensing guide](https://timesaver.gg/blog/palworld-condensing-guide); [Game8: Pal Essence Condenser](https://game8.co/games/Palworld/archives/440237) [search-summary]
- Pokémon GO: transferring a Pokémon gives Candy and frees a storage slot — [Pokémon GO Wiki: Lucky Pokémon](https://pokemongo.fandom.com/wiki/Lucky_Pok%C3%A9mon) (summary; candy amounts not verified) [search-summary]
- MapleStory familiars: a rank-up hides the potential until it is re-appraised, and Red Familiar Cards reset it — [MapleStory Wiki: Familiars](https://maplestorywiki.net/w/Familiars) [search-summary]
- Cassette Beasts fusions are more likely to include a bootleg (alternate-type) component: rogue fusions 1/50 (1/20 from flood fusions), fusion swarms 1/10, orb fusions 1/5 — [Cassette Beasts Wiki: Bootleg](https://wiki.cassettebeasts.com/wiki/Bootleg) [search-summary]

### Inferences
- **What lasts without becoming a chore** (inferred from the removals above): (a) progress that only goes up and has a cap; (b) a daily cap that sets the pace rather than decay that punishes absence; (c) a stated sink for duplicates. WoW 4.1, UO Publish 111 and RO's run-away rule show developers walking back negative-only care.
- **Hidden stats are a double-edged sword.** Rolled traits create a chase (Palworld passives, Ark mutations, Coromon potential). But hidden rolls lead to mass catch-and-release grinding, which Pokémon later softened with Bottle Caps and mints. Showing the roll openly (Coromon's tier is visible) plus a fix-it sink works better.

#### What it would mean for BroTown
- **Level.** A pet's level is frozen at the monster's level at capture (`pets.js`). It could instead grow from things the server already settles (kills and harvests while the pet is active), capped at the owner's level the way FFXIV's chocobo matches its player. That cap also stops a traded level-40 catch from being a power spike for a level-5 player.
- **Bonding.** A GO-style bond with a daily cap (points from walking together or feeding a cooked dish) gives roughly a 30-day goal suited to short sessions. It should never decay. With free play capped at about 2 hours a day, a player is away about 22 hours of every day, so any decay would punish the business model itself.
- **Hunger.** Feeding should be a positive boost using Cooking's dishes: Albion's favourite food, FFXIV's favourite-feed effect, Torchlight's fish transformations. A pet should never stop working at 0 the way BDO's does.
- **Traits.** Turn `personality` into a visible, rolled trait with a small, capped effect, and offer a fix-it sink (a re-roll item made with Trapping or Smithing). This avoids catch-and-release grinding.
- **Merging.** The client's `evolvePet` (2 pets → next tier) is BDO exchange and Palworld condensing under another name. A server `pet_evolve` must be atomic and opId-idempotent (both pets consumed, one created), and the sanitizer must whitelist the new fields. With a 6-slot cap, merging is the natural place for duplicates to go.
- **Fusion.** Cassette Beasts-style two-element fusion maps onto BroTown's eight elements (the client evolve already has a `secondaryElement`). But every new fused look is new art and new memory; a tint or overlay costs none.

### Gaps
- No reliable numbers were found for the following: Pokémon evolution design, Pokémon GO candy per transfer or per buddy distance, WoW battle-pet levelling (cap, stones), BDO pet tier 5, or MapleStory familiar rank-up odds.
- No developer postmortem or GDC talk on pet progression was found (search budget exhausted).

---

## 3. Collection: bestiary rewards, rarities and variants, duplicates, storage, naming

### Takeaway
Collections that last combine three things:
- a visible checklist (a Pokédex, a collection log, familiar badge sets);
- small, capped completion rewards (a Shiny Charm that raises rare odds; set badges worth +1 to +5 stats);
- a layer of rare variants (shiny, lucky, alpha, luma, potent/perfect, bootleg, battle-pet quality), with odds published from about 1 in 35 down to 1 in 8,192.

Duplicates are handled by converting them (candy, condensing, exchange), a cap per species (WoW: 3), reclaim tokens (OSRS) or trading (WoW cages, GO lucky trades). Storage caps are large where storage is sold or where performance limits it (GO 9,800; WoW 205; Ark 500 per tribe).

### Cited Findings

#### Completion rewards
- Pokémon: completing the regional dex gives the Shiny Charm, which raises shiny odds from 1/4,096 to about 1/1,365 (three rolls instead of one) — [Game8: Scarlet/Violet shiny guide](https://game8.co/games/Pokemon-Scarlet-Violet/archives/392967); [PokéBase](https://pokemondb.net/pokebase/269979/chance-getting-shiny-after-completing-pokedex-masuda-method) [search-summary]
- MapleStory familiar badges reward completed sets, with up to 8 equipped (see section 1) — [MapleStory Wiki: Familiars](https://maplestorywiki.net/w/Familiars) [search-summary]

#### Rarity and variants
- Pokémon shiny odds: 1/8,192 in Gen II–V, 1/4,096 from Gen VI on. The Masuda method gives about 1/683 (6 rolls), and Masuda plus the Shiny Charm gives 1/512 (8 rolls) — [Game8: Scarlet/Violet shiny guide](https://game8.co/games/Pokemon-Scarlet-Violet/archives/392967); [PokéBase](https://pokemondb.net/pokebase/269979/chance-getting-shiny-after-completing-pokedex-masuda-method) [search-summary]
- Pokémon Legends: Arceus alphas: a 0.2–2% chance depending on species, place and time, and always the maximum size value (255) — [Serebii: Alpha Pokémon](https://www.serebii.net/legendsarceus/alphapokemon.shtml) [search-summary]
- **Pokémon GO Lucky Pokémon.**
  - IVs are at least 12/12/12.
  - Powering them up costs 50% less Stardust; the Candy cost is unchanged.
  - Any trade has about a 5% chance to make one, rising the longer the Pokémon has been owned.
  - A "Lucky Friend" (about a 1.1% chance on the first daily interaction with a Best Friend) guarantees a lucky trade.
  
  — [Pokémon GO Wiki: Lucky Pokémon](https://pokemongo.fandom.com/wiki/Lucky_Pok%C3%A9mon) [search-summary]
- Coromon potential tiers (about 1/35 Potent, 1/3,194 Perfect), Temtem Lumas (1/2,000; ×10 per Luma parent), Cassette Beasts bootlegs, Palworld Lucky and alpha Pals, WoW battle-pet quality and breeds, and BDO pet tiers: all cited in sections 1–2 and section 6.

#### Duplicates
- OSRS: a duplicate gives a free reclaim token — [OSRS Wiki: Probita](https://oldschool.runescape.wiki/w/Probita) [search-summary]
- WoW: at most 3 of a species, and a caged pet can be sold on the auction house — [Wowpedia: Companion](https://wowpedia.fandom.com/wiki/Companion); [WarcraftPets: breeds](https://www.warcraftpets.com/wow-pet-battles/breeds/) [search-summary]
- GO turns duplicates into candy, Palworld condenses them (48 for 4 stars), and BDO exchanges them (see section 2).

#### Storage limits
- Pokémon GO storage maximum is 9,800 (raised by 500; the item bag cap is 8,800). Upgrades add 50 slots each for 200 coins. One summary claimed a 12,650 maximum; that is unverified and conflicts with the official post — [@PokemonGoApp](https://x.com/PokemonGoApp/status/1894885216453304335?lang=en); [Pokémon GO Wiki: Shop](https://pokemongo.fandom.com/wiki/Shop); [Pokémon GO: storage increase](https://pokemongolive.com/post/december-2024-storage-increase/) [search-summary]
- WoW Hunter: 200 stable slots plus 5 active — [Icy Veins](https://www.icy-veins.com/wow/hunter-pets-guide) [search-summary]
- Ultima Online: a stable token from the Ultima Store costs 500 sovereigns for +3 slots, up to 7 tokens, for a reported maximum of 42. The same summary also mentioned "up to 21 or higher", which conflicts — [UOGuide: Stable](https://www.uoguide.com/Stable); [UO forum: stable slot tokens](https://forum.uo.com/discussion/8069/stable-slots-increase-why-there-is-a-limit-to-purchase-only-7) [search-summary]
- Ark: 500 tames per tribe on PC PvE servers, 200 on consoles, and at most 40 platform saddles per tribe — [Inquisitr: ARK tribe and tame limits](https://www.inquisitr.com/ark-survival-evolved-pc-update-puts-limits-on-tribes-and-tamed-dinos-lets-you-tame-snakes) [search-summary]
- BDO: 5 pets out at once — [Garmoth](https://garmoth.com/guides/post/bdo-basics-pets) [search-summary]

### Inferences
- The variant odds that worked are tuned to how often a player meets the creature. Pokémon's 1/4,096 assumes hundreds of encounters an hour. With a 2-hour daily cap and a few dozen kills or nests per session, BroTown needs odds closer to GO's or Coromon's to be visible. A two-tier layer, such as about 1 in 35 for "potent" and 1 in several hundred for "shiny", gives a visible chase plus a jackpot.
- Turning duplicates into a resource stops the 6-slot cap from feeling like a wall. Trading turns duplicates into an economy, but only if the server mints every pet with provenance.

#### What it would mean for BroTown
- **Trapper's Log.** One page per land, listing species by tier, with first-capture rewards (a title or cosmetic) and small, capped land-set bonuses, MapleStory-badge sized (+1 to +5 of a stat).
- **Variants at zero texture memory.** A "shiny" can be a recolour by sprite tint; the Wheel already draws monsters past level 20 that way with no extra memory (`wheelStageTint`, CLAUDE.md). An alpha-style variant can be a draw scale. Neither adds a texture under `mp-membudget`.
- **Duplicates.** Convert them to a pet essence or candy that feeds merging and levelling (GO, Palworld). Optionally let pets be caged as market items (WoW). BroTown already has a market, an auction house and trades, but pets would need server-minted provenance, as the ledger does for forged armour, to prevent duplication.
- **Storage.** Keep 6 active pets plus a server-side stable at the farm or Pet House, expanded through play. Selling stable slots in the supporter pass is a borderline convenience-vs-power call for the owner (UO sells them).
- **Naming.** Already server-validated (trimmed to 24 characters in `_sanitizePets`). Add a filter before names are shown to other players.

### Gaps
- No sourced findings on pet naming conventions or naming abuse.
- No sources found for mainline Pokémon PC box counts, WoW's current companion cap (the 650 figure looks dated), or the rewards for completing OSRS's collection log.

---

## 4. Ranching, breeding and idle loops, and how they tie into a farm

### Takeaway
Idle loops turn the pets you are not using into value while you are offline. There are three kinds:
- production pens (Slime Rancher, FFXIV's pasture, Lost Ark's ranch);
- breeding and incubation on real-time timers (Palworld 3–36 h; Albion 1 day 20 h);
- expeditions (MH Rise, Throne & Liberty, WoW's mission tables).

The two classic failures are economic and about attention. WoW Draenor's garrisons gave every player a mine and a herb garden, which flooded the ore and herb markets. Later mission tables needed add-ons just to read. Slime Rancher's saturating plort market is a ready-made template for keeping farm output from crashing a player market.

### Cited Findings
- **Slime Rancher plort market.**
  - In SR1, each sale adds to market volume, and at maximum volume the price halves. Prices also swing ±30% per plort and ±30% market-wide (49–169% of base).
  - In SR2, each plort's saturation decays 25% every midnight, with noise of 30% globally and 40% per plort. Selling 1,000 pink plorts depresses the price until about day 13.
  
  — [Slime Rancher Wiki: Plort Market (SR1)](https://slimerancher.fandom.com/wiki/Plort_Market_(Slime_Rancher)); [Slime Rancher Wiki: Plort Market (SR2)](https://slimerancher.fandom.com/wiki/Plort_Market_(Slime_Rancher_2)); [Steam: how the plort market works](https://steamcommunity.com/app/433340/discussions/0/1470841715946243977/) [search-summary]
- Slime Rancher food: chicks ("Chickadoos") are put in a coop and grow into chickens to feed slimes, though "chickens don't really grow fast enough to be reliable food". Largos and Tarr are covered in section 1 — [TheGamer: Slime Rancher beginner's guide](https://www.thegamer.com/beginners-guide-slime-rancher/) [search-summary]
- Palworld breeding farm: one male and one female plus one cake produce an egg about every 5 minutes. At a comfortable temperature, incubation takes 3 h (Normal egg), 18 h (Large) or 36 h (Huge), roughly doubling at the wrong temperature — [GameServerKings: cake & breeding farm](https://www.gameserverkings.com/knowledge-base/palworld/palworld-cake-and-breeding-farm/); [GameServerKings: breeding guide](https://www.gameserverkings.com/knowledge-base/palworld/palworld-breeding-guide/) [search-summary]
- BDO horse breeding:
  - a foal's tier is random but raised by the parents' tier and level and by Training mastery;
  - for example, with 1,500 mastery and tier-8 parents, a combined parent level of 48 gives a 100% tier-8 foal;
  - the mother's tier matters more than the father's.
  
  — [GrumpyGreen: horse breeding](https://grumpygreen.cricket/bdo-horse-breeding/); [Altar of Gaming: BDO horses](https://altarofgaming.com/black-desert-online-horse-taming-training-breeding-exchanging-guide/) [search-summary]
- Pokémon day care: an egg may be generated every 256 steps; one egg cycle is 256 steps (e.g. a 25-cycle egg takes 6,169–6,425 steps); Flame Body, Magma Armor or Steam Engine in the party halve the steps (except in FireRed/LeafGreen) — [Game8: hatch eggs fast (FRLG)](https://game8.co/games/Pokemon-FireRed-LeafGreen/archives/583568); [Sinjoh Ruins: Egg hatching (Gen 4)](https://sinjohruins.com/Gen+4/Egg+Hatching); [PokéBase: Flame Body](https://pokemondb.net/pokebase/217815/how-do-you-use-flame-body-to-help-hatch-eggs) (the summary mixes generations; flag) [search-summary]
- Temtem: fertility up to 8, −1 per egg for each parent; Luma odds 1/2,000, ×10 per Luma parent — [Temtem Wiki: Breeding](https://temtem.wiki.gg/wiki/Breeding) [search-summary]
- **Albion livestock.**
  - Farming needs owned plots (farm, herb garden, pasture or kennel).
  - Livestock grows in 1 day 20 hours (halved with Premium).
  - Offspring yield: each full 100% gives one offspring, and any extra gives a chance of another.
  - A favourite food halves the feed needed (baby chickens: wheat; goat kids: turnips; goslings: cabbage; lambs: potatoes; piglets: corn; calves: pumpkin).
  - Focus nurtures livestock for more offspring.
  - Grown animals are crafted into mounts or used for food.
  
  — [Albion Wiki: Island Farms](https://wiki.albiononline.com/wiki/Island_Farms); [Albion Wiki: Farm Animal](https://wiki.albiononline.com/wiki/Farm_Animal) [search-summary]
- FFXIV Island Sanctuary: animals are caught with crafted island items:
  - Makeshift Net for small animals (1 Island Branch + 2 Island Vine);
  - Makeshift Restraint for medium ones (1 Island Copper Ore + 3 Island Hemp);
  - Makeshift Soporific (1 Island Sap + 2 Island Laver + 2 Island Jellyfish).
  
  Attempts can fail; captured animals go to the pasture and leave "leavings" when fed — [GameRant](https://gamerant.com/ff-xiv-14-island-sanctuary-animal-guide-makeshift-net-restraints-soporific-pasture/); [Gamertweak](https://gamertweak.com/capture-animals-island-sanctuary-ffxiv/) [search-summary]
- Monster Hunter Rise Meowcenaries: up to 4 reserve buddies go on an expedition and return after the hunter completes 5 quests of their own; their levels and skills affect rewards. The Argosy trades for items through hired buddies — [Fextralife: Meowcenaries](https://monsterhunterrise.wiki.fextralife.com/Meowcenaries); [Game8: Meowcenaries](https://game8.co/games/Monster-Hunter-Rise/archives/317550) [search-summary]
- Throne & Liberty Amitoi expeditions:
  - longer trips bring back more;
  - rewards include crafting materials and Abyssal Contract Tokens, and rarely morphs, new Amitoi and boss fragments;
  - Amitoi marked with a green arrow raise the chance of a special pouch.
  
  — [TheGamer: Amitoi Expeditions](https://www.thegamer.com/throne-and-liberty-amitoi-expeditions/); [Game8: Amitoi Expedition guide](https://game8.co/games/Throne-and-Liberty/archives/471867) [search-summary]
- WoW Draenor's garrison mission table sent followers on missions of varying length, with a roster too big to keep all active. A critique (blogger, 2015): making every player's garrison include a mine and an herb garden "destroyed the economy for ore and herbs". Blizzard Watch (2021) asked whether the mission table had "outlived its usefulness", and later tables needed add-ons to understand the fights — [Wowpedia: Garrison missions](https://wowpedia.fandom.com/wiki/Garrison_missions); [Mash Those Buttons (2015)](https://mashthosebuttons.com/2015/01/wow-thoughts-on-improving-garrisons/); [Blizzard Watch (2021)](https://blizzardwatch.com/2021/04/05/mission-table-outlived-usefulness/) [search-summary]
- Lost Ark Pet Ranch's work/morale cycle and Torchlight's town trips are covered in section 1.

### Inferences
- Real-time timers suit a 2-hour daily cap: you start an egg or an expedition, log off, and collect next session. Monster Hunter's "returns after N of your quests" keys progress to play, which suits short sessions and cannot be idled on a second device.
- Every idle loop is a faucet. In a game with a player market, its output must be bounded: saturating NPC prices (Slime Rancher), bind-on-pickup outputs, or outputs that feed sinks (Cooking, Smithing, the forge) rather than raw goods sold to other players. WoW's garrisons are the warning.
- Breeding needs a natural brake, or "perfect" pets inflate: Temtem's fertility of 8, Ark's mutation cap, and BDO's random tiers.

#### What it would mean for BroTown
- **Farm pens (C3).** Pets assigned at `farm_home` produce their land's materials on a timer (e.g. a frost pet makes frost-land goods), routed into Smithing and Cooking inputs. Any NPC buy-back price saturates the way plorts do.
- **Incubators on the farm.** Real-time hatching (published ranges run from 3 h to 1 day 20 h to 36 h) moves pet progress outside the 2-hour window, and the number of incubators becomes a progression knob. This is also the natural home for egg-based acquisition (section 6).
- **Breeding.** Two pets of one species or element make an egg with inherited traits. A Temtem-style fertility count (a few eggs per pet) bounds inflation. Pokémon-style hatching by walking can use the server's movement validation (the speed bounds that sprint billing already relies on) to count distance actually travelled, with a daily cap against walk-in-circles bots.
- **Expeditions.** "Returns after N of your quests or kills" (MH Rise) or a real-time return (T&L). Outputs should go to sinks or be account-bound.
- **Avoid Palworld-style simulated farm workers.** Pathing, CPU and memory costs; an abstract timer gives the same satisfaction.

### Gaps
- Not found: Ark incubation and maturation times, Palworld's base Pal cap, WoW pet-battle participation trends, and any developer statement on the garrison economy (the critique cited is a blogger's).
- No published plort base prices or Albion offspring-yield percentages per animal were gathered.

---

## 5. Pitfalls: power gaps, pet AI and griefing, clutter, death, upkeep, and balancing combat pets in PvP

### Takeaway
The recurring failures are:
- **Paid power.** Pet utility that is effectively mandatory and sold (BDO's loot pets, Lost Ark's pet functions, MapleStory's expiring cash pets, RS3's legendary pets).
- **Shared-world AI.** Pets that pull monsters, steal aggro or get stuck (WoW Hunter Growl in dungeons for 14 years; Palworld base pathing).
- **Performance.** Too many creatures (Ark had to cap tames per tribe).
- **Loss and chores.** Losing a pet permanently (Ark; UO before Publish 111), and care that only punishes.

In PvP, combat pets are tuned on their own numbers, separately from PvE: WoW's Avoidance is weaker against players, and GW2 nerfed pets in PvP. Players argue that pets soaking hits is a hidden defensive power. The cleanest structural answers were folding the pet into the player (GW2 Soulbeast) and paying players for going without one (WoW Lone Wolf).

### Cited Findings

#### Mandatory pets and pay-for-power
- **BDO.**
  - Loot pets are bought mostly in the Pearl Shop, usually for 1,100 pearls; some free pets come from quests, attendance and challenges.
  - Guides argue loot left on the ground despawning "is wasted silver", and pets are "the only thing that stops it", so active grinders need 4–5 paid pets.
  - Whether this is pay-to-win is contested; one guide says a full free roster is now possible.
  
  — [GrumpyGreen: Pearl Shop & P2W](https://grumpygreen.cricket/bdo-pearl-price/); [GrumpyGreen: pets](https://grumpygreen.cricket/bdo-pet-guide/); [ClawSkills: how many pets to buy](https://clawskills123.com/articles/pearl-shop-pets.html) [search-summary]
- Lost Ark gates pet storage and repair functions behind the Crystalline Aura — [Maxroll](https://maxroll.gg/lost-ark/resources/mounts-pets) [search-summary]
- MapleStory pets stop working after about 90 days unless revived (2,400 NX per 90 days) — [GameTaco](https://gametaco.net/maplestory-premium-water-of-life/) [search-summary]
- RS3 legendary pets, which auto-scavenge drops, come from the Premier Club or the Marketplace — [RuneScape Wiki](https://runescape.wiki/w/Legendary_pet) [search-summary]
- WoW pays a petless Marksmanship hunter +5% damage (it was 10%) — [Wowpedia: Lone Wolf](https://wowpedia.fandom.com/wiki/Lone_Wolf) [search-summary]

#### Pet AI, pathing and griefing in shared spaces
- WoW: for about 14 years, Hunter (and Warlock) pets taunted monsters off tanks in groups. Battle for Azeroth (2018) automatically turns the pet's Growl off inside dungeons and raids, and back on when leaving — [AIPT: Growl auto-off](https://aiptcomics.com/2018/06/10/world-of-warcraft-battle-for-azeroth-hunter-pets-growl-will-automatically-turn-off-upon-entering-a-dungeon/); [Blizzard forums: pet aggro](https://us.forums.blizzard.com/en/wow/t/why-are-people-still-yelling-at-hunters-about-pet-aggo/1208606); [MMO-Champion: pets pulling threat](https://www.mmo-champion.com/threads/810064-Pets-pulling-threat-off-tanks) [search-summary]
- Palworld:
  - large and flying Pals get stuck at bases, and stuck Pals go hungry, lose sanity and get injured;
  - players redesign bases to be flat, with 2-wide stairs, to cope;
  - the problem grows as players get bigger, better Pals.
  
  — [Screen Rant: Pal pathing](https://screenrant.com/palworld-pal-stuck-pathing-broken-ai/); [Steam: base AI needs a rework](https://steamcommunity.com/app/1623730/discussions/0/4203615689066543746/); [Steam: AI pathing](https://steamcommunity.com/app/1623730/discussions/0/546746241084606401/) [search-summary]

#### Screen clutter and performance
- Ark capped tames at 500 per tribe on PC PvE servers (200 on consoles) and platform saddles at 40, explicitly for performance: tribes had held thousands of tames, crashing players who entered packed areas — [Inquisitr](https://www.inquisitr.com/ark-survival-evolved-pc-update-puts-limits-on-tribes-and-tamed-dinos-lets-you-tame-snakes); [Steam: server tame limit reached](https://steamcommunity.com/app/346110/discussions/0/1353742967820891778/) [search-summary]
- FFXIV offers hiding options (minion names, Group Pose, target filter), and players still ask for a hide-everyone toggle in crowds — [Destructoid](https://www.destructoid.com/10-ffxiv-hotbar-and-hud-tips-and-tricks-you-may-not-know/); [Square Enix forum](https://forum.square-enix.com/ffxiv/threads/182806) [search-summary]

#### Pet death and loss
- Ark players report tames dying or vanishing with no notice: hours of taming lost to stuck-in-terrain deaths, water creatures dying at the surface, and one admin losing 80% of tames to a starvation-rate glitch (anecdotal Steam threads) — [Steam: tamed dinos disappearing](https://steamcommunity.com/app/346110/discussions/0/3288067088116634937/); [Steam: dinos killed while offline (PvE)](https://steamcommunity.com/app/346110/discussions/0/535151589883494772/) [search-summary]
- Ultima Online before Publish 111: unfed pets could go wild mid-fight (one player: "surrounded by 30 mobs") and were lost for good. Afterwards, bonded pets only stop obeying until fed — [UO forums: pet loyalty](https://forum.uo.com/discussion/9389/pet-loyalty-clarification) [search-summary]
- RO pets run away at 0 intimacy — [Ragnarok Wiki](https://ragnarok.fandom.com/wiki/Cute_Pet_System). PoE2 spectres become orbs and re-form instead of dying — [Game8 PoE2](https://game8.co/games/Path-of-Exile-2/archives/507288). OSRS insures pets for free — [OSRS Wiki: Probita](https://oldschool.runescape.wiki/w/Probita). Albion mounts can be looted, but skins never drop — [Albion forum](https://forum.albiononline.com/index.php/Thread/45188-Mounts-dropped-on-Death/) [search-summary]

#### Upkeep chores
- Removed or softened: WoW pet happiness in 4.1, and UO's going-wild rule in Publish 111. Upkeep that remains: BDO hunger, Lost Ark ranch morale, the FFXIV chocobo stable's cleanliness penalty, and Palworld's hunger and sanity (sources in section 2).

#### Balancing combat pets in multiplayer and PvP
- WoW's Avoidance is an innate passive on every class's pets that cuts AoE damage from creatures (80% per Wowpedia). One summary reported a PvP split: 95% less from NPC AoE but only 50% less from players. The figures depend on the version — [Wowpedia: Avoidance (passive)](https://wowpedia.fandom.com/wiki/Avoidance_(passive)); [Wowhead: Avoidance](https://www.wowhead.com/spell=65220/avoidance); [Warcraft Wiki: Avoidance (hunter pet ability)](https://warcraft.wiki.gg/wiki/Avoidance_(hunter_pet_ability)) [search-summary]
- GW2 pets take 95% less damage from most PvE ground AoE — [GW2 Wiki: Pet](https://wiki.guildwars2.com/wiki/Pet) [search-summary]
- GW2 PvP:
  - pets were nerfed in PvP after complaints about birds and tigers killing players;
  - a 2015 forum post argued that giving pets AoE damage reduction in PvP would be "mathematically incorrect", because every hit a pet soaks may save a player;
  - players hold that a pet should never out-damage its player, complain that pet nerfs aren't split between PvE and PvP, and note that pets pressure and disable opponents and soak projectiles.
  
  — [GW2 forums: lower ranger pet damage](https://en-forum.guildwars2.com/discussion/95282/can-we-lower-the-damage-of-ranger-pets); [GW2 archive forum: AoE reduction for pets](https://forum-en.gw2archive.eu/forum/professions/ranger/Why-no-AOE-damage-reduction-for-pets); [GW2 forums: how to balance ranger pets](https://en-forum.guildwars2.com/discussion/28287/how-to-balance-ranger-pets); [GuildJen: fighting rangers in PvP](https://guildjen.com/how-to-fight-ranger-in-pvp/) [search-summary]
- Other structural answers: GW2 Soulbeast folds the pet into the player — [GW2 Wiki: Soulbeast](https://wiki.guildwars2.com/wiki/Soulbeast). WoW's Cunning spec is described as good in PvP for its freedom effect and +8% movement — [Icy Veins](https://www.icy-veins.com/wow/hunter-pets-guide). Albion despawns a mount when its rider deals or takes damage, and imposes a 30 s remount cooldown — [Albion forum](https://forum.albiononline.com/index.php/Thread/160691-From-NDA-playtests-Dismount/) [search-summary]

#### Capture friction
- Path of Exile's Bestiary league (3.2.0) had players throw nets at low-life beasts. It "wasn't popular", and when Einhar entered the core game (3.5.0) capture became practically "kill the beast", with nets no longer obtainable — [PoE Wiki: Net](https://pathofexile.fandom.com/wiki/Net); [PoE Wiki: Einhar](https://pathofexile.fandom.com/wiki/Einhar,_Beastmaster); [GameFAQs mirror of GGG's "Important: How We're Changing Capturing"](https://gamefaqs.gamespot.com/boards/605432-path-of-exile/76376493) [search-summary]

### Inferences
- The power gap comes from selling or requiring a pet's function, not from pets existing. BDO's case shows that "pure convenience" (loot pickup) becomes mandatory once it changes income per hour.
- In a shared world, a pet that can start fights must be unable to affect anyone else's fight (WoW took 14 years to automate this).
- In PvP, any pet that is a separate target becomes a defensive layer (GW2's soak argument). Pets that are not separate entities avoid the problem.

#### What it would mean for BroTown
- **No paid function.** Keep pet effects capped and optional (the 240 px radius is convenience-sized), and never sell a pet function. The supporter pass stays cosmetic (pet skins, name colours), consistent with the no-pay-to-win model.
- **Shared world.** A pet must never tag or aggro monsters for other players, and never block a path. BroTown's tag rules (`m.dmgByPlayer`, provoked-from-safe-ground) should ignore pets entirely, which a proc pet does by construction.
- **PvP ring and No man's land.** If pets ever add damage, it is computed by the server, with its own PvP multiplier (WoW and GW2 tune pets separately for PvP). Pets are not targetable soak.
- **Death.** A pet never drops in the PvP ring's bag loss or under No man's land rules (like Albion skins and OSRS insurance). A knocked-out pet goes "home to the farm" for a cooldown instead of dying (like PoE2's orb).
- **Clutter and memory.** Show your own pet and party members' pets by default. Draw others' as emoji or hide them via a setting (FFXIV-style). Cap the number of distinct pet looks drawn at once (the lesson of Ark's tame caps), all under `mp-membudget`.
- **Upkeep.** Positive-only care. Nothing decays while you are offline, and with a 2-hour cap you are offline most of the day.
- **Capture friction.** BroTown's "weaken to 20%, then tap a trap within 200 px" is the same friction PoE removed, and the owner reports it breaks once a player one-hits monsters. See section 6.

### Gaps
- No primary patch notes were retrieved for WoW or GW2 PvP pet modifiers (only wiki and forum summaries).
- No developer postmortem or GDC talk on pet AI, griefing or clutter was found.
- Path of Exile minion clutter, and options to hide other players' pets in D4, ESO or PoE, were not verified (search budget exhausted).

---

## 6. Acquisition routes that are NOT a live capture (owner update: they must work for a player who one-hits everything)

### Takeaway
BroTown's weaken-then-trap has a direct precedent that failed: PoE's Bestiary nets, thrown at a low-life beast, were unpopular, and GGG replaced them with capture that is practically "kill the beast". Routes keyed to a monster's HP during a fight break for one-hit players. Two kinds of route work at any power level:
- routes keyed to the **kill event**: card, soul or essence drops; capture-on-kill with an armed trap; claiming the corpse (PoE spectres);
- routes **decoupled from combat**: nests and eggs, breeding, eggs hatched by time or by walking, per-action drops like OSRS skilling pets, expeditions that return new pets.

For a strong player, kill-keyed routes speed up rather than break, so their rates need tuning. Several requested titles could not be source-checked this turn (see Gaps).

### Cited Findings

#### Precedent: low-HP capture replaced by capture-on-kill
- PoE Bestiary (3.2.0): players threw nets at low-life beasts. It "wasn't popular", so when Einhar entered the core game (3.5.0), GGG changed capture to practically "kill the beast" instead of "reduce the beast's life and then throw the net in time"; nets can no longer be obtained. One summary describes Einhar appearing once a beast falls below 50% life and netting low-health beasts himself; the exact trigger wording should be checked against GGG's post — [PoE Wiki: Net](https://pathofexile.fandom.com/wiki/Net); [PoE Wiki: Einhar](https://pathofexile.fandom.com/wiki/Einhar,_Beastmaster); [GameFAQs mirror of GGG's "Important: How We're Changing Capturing"](https://gamefaqs.gamespot.com/boards/605432-path-of-exile/76376493) [search-summary]
- PoE spectres are claimed from a corpse after the kill and become permanent minions that keep that monster's type and intrinsic mods — [PoE Wiki: Raise Spectre](https://pathofexile.fandom.com/wiki/Raise_Spectre) [search-summary]

#### Drops from kills (cards, souls, essence) and collect-N
- MapleStory familiar cards drop from specific monsters; completing sets earns badges (up to 8 equipped). No drop rates were found — [MapleStory Wiki: Familiars](https://maplestorywiki.net/w/Familiars); [StrategyWiki: Familiars](https://strategywiki.org/wiki/MapleStory/Familiars) [search-summary]
- Cited "collect N" patterns: Palworld needs 48 duplicates for 4 stars (4/8/12/24), Pokémon GO turns transfers into Candy, and BDO turns two same-tier pets into a chance at the next tier — [Timesaver](https://timesaver.gg/blog/palworld-condensing-guide); [Pokémon GO Wiki](https://pokemongo.fandom.com/wiki/Lucky_Pok%C3%A9mon); [Garmoth](https://garmoth.com/guides/post/bdo-basics-pets) [search-summary]

#### Eggs, breeding and incubation timers
- Palworld: 1 male + 1 female + 1 cake → an egg about every 5 minutes. Incubation: Normal 3 h, Large 18 h, Huge 36 h at a comfortable temperature, roughly double otherwise. Six incubators beside a campfire or cooler is described as the step that "turns a hobby into a pipeline" — [GameServerKings: cake & breeding farm](https://www.gameserverkings.com/knowledge-base/palworld/palworld-cake-and-breeding-farm/) [search-summary]
- Pokémon: eggs come from two compatible Pokémon at the day care, possibly every 256 steps, and hatch by walking (256 steps per egg cycle; a 25-cycle egg takes 6,169–6,425 steps; Flame Body and similar abilities halve it) — [Game8 (FRLG)](https://game8.co/games/Pokemon-FireRed-LeafGreen/archives/583568); [Sinjoh Ruins](https://sinjohruins.com/Gen+4/Egg+Hatching); [PokéBase](https://pokemondb.net/pokebase/217815/how-do-you-use-flame-body-to-help-hatch-eggs) [search-summary]
- Temtem: each parent has a fertility of up to 8 and loses 1 per egg. A Luma (shiny) hatches at the wild rate of 1/2,000, multiplied by 10 for each Luma parent (1/200 with one, 1/20 with two) — [Temtem Wiki: Breeding](https://temtem.wiki.gg/wiki/Breeding) [search-summary]
- Ark: babies get about a 7.31% mutation chance each (3.7% once one side is capped at 20), and 100% imprint care gives +20% stats — [Dododex](https://help.dododex.com/en/article/ark-breeding-mutations-guide) [search-summary]
- Albion: a baby animal grows in 1 day 20 hours (half with Premium) and yields offspring (each 100% gives one, and any extra gives a chance of another). Favourite food halves the feed; Focus raises the yield — [Albion Wiki: Island Farms](https://wiki.albiononline.com/wiki/Island_Farms); [Albion Wiki: Farm Animal](https://wiki.albiononline.com/wiki/Farm_Animal) [search-summary]
- BDO horses: a foal's tier comes from the parents' tier and level plus Training mastery (e.g. 100% tier 8 at 1,500 mastery with tier-8 parents of combined level 48) — [GrumpyGreen: horse breeding](https://grumpygreen.cricket/bdo-horse-breeding/) [search-summary]

#### No fight at all: per-action drops, expeditions, feeding, crafted capture tools
- OSRS skilling pets drop per skilling action, at 1/(Base − 25 × level), 15× more likely at 200M XP — [OSRS Wiki: Pet](https://oldschool.runescape.wiki/w/Pet) [search-summary]
- Throne & Liberty expeditions can bring back new Amitoi and morphs as rare rewards; longer trips bring more — [TheGamer](https://www.thegamer.com/throne-and-liberty-amitoi-expeditions/); [Game8](https://game8.co/games/Throne-and-Liberty/archives/471867) [search-summary]
- Slime Rancher: slimes are put into corrals rather than fought for. Feeding a slime another slime's plort creates a new creature, a largo; chicks put in a coop grow into chickens — [Slime Rancher Wiki: Largo Slimes](https://slimerancher.fandom.com/wiki/Largo_Slimes); [TheGamer: beginner's guide](https://www.thegamer.com/beginners-guide-slime-rancher/) [search-summary]
- FFXIV Island Sanctuary: animals are caught with crafted tools (net, restraint, soporific), attempts can fail, and catches go straight to the pasture — [GameRant](https://gamerant.com/ff-xiv-14-island-sanctuary-animal-guide-makeshift-net-restraints-soporific-pasture/) [search-summary]

#### Quest, trade and purchase routes
- Diablo IV gives one pet free through a quest; others come with editions — [Icy Veins](https://www.icy-veins.com/d4/guides/pet-guide/); [GameRant](https://gamerant.com/diablo-4-how-get-pet/) [search-summary]
- BDO pets come from the Pearl Shop (about 1,100 pearls) plus free ones from quests, attendance and challenges — [GrumpyGreen](https://grumpygreen.cricket/bdo-pearl-price/) [search-summary]
- RS3 sells legendary pets (Premier Club, Marketplace) — [RuneScape Wiki](https://runescape.wiki/w/Legendary_pet) [search-summary]
- Pokémon GO trades can make a Lucky Pokémon (about 5%, rising with how long it was owned) — [Pokémon GO Wiki](https://pokemongo.fandom.com/wiki/Lucky_Pok%C3%A9mon) [search-summary]

### Inferences

#### Which routes survive a one-hit player (my judgement from the mechanics above)
| Route | Example (cited) | Works for a one-hit player? | Why / what to tune | BroTown fit and cost |
|---|---|---|---|---|
| Weaken to X% HP, then capture | BroTown today; PoE Bestiary nets (3.2.0) | **No.** The HP window never exists. | PoE removed it for being unpopular even before power creep. | Retire or keep as a minor flavour route |
| Capture on kill with an armed trap (set before you strike) | PoE after 3.5.0 (kill = capture) | **Yes.** Keyed to the kill event. | A per-kill roll, scaled by trap tier and Trapping level. Decide whether a capture replaces the loot (BroTown already gives no loot on capture) or rolls alongside it. | C2: reuses the server's kill path and `basic_trap` |
| Card, soul or essence drop; collect N to summon or upgrade | MapleStory familiar cards; Palworld 48 duplicates; GO candy | **Yes.** Strong players earn faster. | Rates per kill; diminishing duplicates; level gating by land tier. | C2/C3: an item in loot tables plus a server "redeem" op; tradeable cards feed the market |
| Claim the corpse after the kill | PoE spectres | **Yes** | In a shared world, the claim belongs to the tagger (BroTown tracks `m.dmgByPlayer`). A short claim window. | C2 |
| Befriend after defeat | (Yo-kai Watch, DQM, Ni no Kuni: unverified, see Gaps) | **Yes, if** the roll comes after the kill; **no, if** the chance depends on how much fight remains | Feeding before the fight (bait from Cooking) adds agency. | C2 |
| Tame by feeding instead of fighting | Slime Rancher (feeding creates largos); FFXIV crafted tools | **Yes.** No damage needed. | The server needs a "pacified" monster state that no other player can kill out from under you. | C2/C4: a moderate monster-state change |
| Nests and eggs in the world | (MH Stories dens: unverified) | **Yes.** No fight for ownership. | Reuse the gathering-node pipeline: baked spawns, server-checked strikes, respawn timers, `GATHER_REQ_LVL` tiers (1/6/11/16/21) with a new nest type gated by Trapping level per land. | Cheapest new route; nearly all infrastructure exists |
| Breeding | Palworld, Pokémon, Temtem, Ark, Albion, BDO horses | **Yes** | A fertility cap (Temtem: 8) bounds inflation; Luma-style ×10 rare inheritance gives a reason to breed. | C3 on the farm |
| Farm incubation timers | Palworld 3/18/36 h; Albion 1 day 20 h | **Yes** | Hatching continues outside the 2-hour window; incubator slots are a progression knob. | C3 |
| Hatch by walking | Pokémon (256-step cycles) | **Yes** | The server already validates movement, so distance can be trusted. A daily cap guards against bots. | C3 plus the movement counter |
| Per-action pet drops while gathering | OSRS skilling pets | **Yes** | OSRS-sized odds would never land within a 2-hour cap; tune to sessions. | C2 on the existing harvest path |
| Expeditions that bring back pets | Throne & Liberty Amitoi | **Yes** | Session-friendly; keep outputs bounded. | C3 |
| Quest or achievement reward | Diablo IV's free quest pet | **Yes** | One-off; good for a starter pet per land. | Trivial |
| Purchase | BDO, RS3, MapleStory | n/a | Conflicts with no pay-to-win unless cosmetic-only. | Cosmetic skins only |

- **Strongest single recommendation (inference).** Make the default route **nests plus eggs plus farm incubation**, with **capture-on-kill as a Trapping-skill bonus roll**. Nests reuse BroTown's resource-node machinery and give each of the eight lands a reason to explore. Eggs hatch in real time on the farm, tying Trapping to the farm, Cooking and breeding. A kill-keyed bonus roll keeps combat relevant without depending on the monster's HP.
- **Element and level identity.** Eggs from a land's nests carry that land's element and tier, which gives the existing `element` and `level` fields a source. The `flora` sanitizer bug (section 1) must be fixed before any Verdant Wilds egg ships.
- **Rate caution.** Kill-keyed routes reward strong players most. Per-land tiers (higher-tier nests gated by Trapping level, like mining tiers) keep low-level lands from being farmed endlessly by over-levelled players for high-value pets.

### Gaps
- **Not verified this turn** (search budget used up; every wiki fetched was egress-blocked). These are the coordinator's specifically requested titles: Monster Hunter Stories egg dens and nest rarity, Monster Sanctuary eggs, Siralim's acquisition, Ni no Kuni befriending, Yo-kai Watch befriending, Dragon Quest Monsters scouting, Ark egg incubation and maturation times, Pokémon GO egg distances and incubators, and MapleStory familiar card drop rates. No drop rates or timer lengths could be sourced for any of them.
- **UNVERIFIED recollection, to source-check before use (do not cite as fact):**
  - Monster Hunter Stories: eggs are taken from monster dens in the field; some dens are rarer and hold rarer eggs; an egg's quality is hinted by its smell and weight; the parent monster may come back. [memory — unverified]
  - Monster Sanctuary: eggs drop after battles, with a better chance at higher battle ratings. [memory — unverified]
  - Yo-kai Watch: a defeated yo-kai may offer to befriend you, more likely if fed its favourite food during the battle. [memory — unverified]
  - Dragon Quest Monsters: scouting chance compares your party's strength with the target's; older games used meat to raise recruitment. [memory — unverified]
  - Ni no Kuni: defeated monsters can become recruitable after battle. [memory — unverified]
  - Siralim: not recalled reliably. [memory — unverified]
  
  A follow-up turn with a fresh search budget could verify these, and their rates and timers.
- No source compared player sentiment on egg- or nest-based acquisition against fight-based capture.
