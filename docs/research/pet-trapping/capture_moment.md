# The capture moment: how games resolve capturing or taming a creature (rules, odds, skill, feel)

*How these notes were gathered:* this sandbox's network blocks almost every game wiki and news site (Bulbapedia, Serebii, fandom, wiki.gg, GamePress, Pokémon GO Hub, Kiranico, poewiki, Wowhead, Reddit and Steam all return 403). Only GitHub content could be read directly. So:
- **[code]** means I read the number directly from source code or a datamined file on GitHub: the decompiled Pokémon Emerald (pret/pokeemerald), the pokeemerald-expansion engine (a community rebuild of the Gen 4–9 rules), and the PokeMiners Pokémon GO game master downloaded on 2026-10-06.
- **[summary]** means the number comes from a web search engine's summary of the linked page, because the page itself was blocked. These are probably right but I could not check them. Where two summaries disagreed, I say so.
- **[calc]** means my own arithmetic from a formula cited here.
- The shared web-search budget ran out after the owner's overkill update arrived. The overkill section's "leads to verify" (in its Gaps) are therefore unsourced and flagged.

*BroTown baseline* (read from this repo, and the basis for every "BroTown:" line). A capture is allowed only when the monster can take damage, is at or below 20% HP, is within 200 px, you have fewer than 6 pets, and you hold a `basic_trap`. The trap is used up only after all of those checks pass. The chance is clamp(0.40 + 0.005 × trapping level + 0.002 × woodcutting level − 0.05 × max(0, monster level − player level), 0.10, 0.95), rolled once with the worker's `Math.random`. A failure gives 5 trapping XP. A success gives 15 + 2 × monster level trapping XP and removes the monster for everyone, with no loot, no XP and no quest credit; it respawns on the normal clock ([server/src/pets.js](../../../server/src/pets.js)). The basic trap sells for 20 gold ([server/src/shop.js](../../../server/src/shop.js), line 138). [calc] At equal level and trapping 1 the chance is 40.7%, so a pet costs 2.46 traps (about 49 gold) on average. Five levels up it is 15.7%: 6.4 traps (about 127 gold). Seven or more levels up it hits the 10% floor: 10 traps (200 gold).
*Owner update (2026-10-06, relayed by the coordinator):* the weaken-to-20% rule was an early demo, and it breaks once a player can kill a monster in one hit. The first section below is therefore the main one.

## Capture methods that do not depend on lowering HP, or that survive overkill (main section)

### Takeaway
Five families of design avoid the "weaken it to X% HP" trap:
1. **Capture at any HP.** The odds come from position, the item's power against the creature's level, status and stealth: Palworld, Pokémon Legends: Arceus, Pokémon GO, WoW's hunter Tame Beast.
2. **A separate non-lethal meter, or a tool that deals no damage:** Ark's torpor, Monster Hunter's traps and tranquilisers, sleep and paralysis setups, Black Desert's lasso.
3. **The kill itself is the trigger:** befriend, drop or capture on defeat. Ni no Kuni's hearts, Yo-kai Watch's befriending, Path of Exile's Einhar after patch 3.5, Monster Sanctuary's eggs, MapleStory's cards, Siralim.
4. **Skill inputs that set or replace the odds:** Pokémon GO's throw ring and curveball, Black Desert's timing press and mashing, Nexomon's button prompt.
5. **Guards that stop a strong player killing what they meant to catch:** False Swipe leaves the target at 1 HP; Cassette Beasts' target cannot die while being recorded; Dragon Quest Monsters' scouting turns would-be damage into a percentage; Monster Hunter shows a limp and a skull icon when a monster can be captured.

How each family copes with one-hit kills:
- Family 3, and designs where damage becomes capture progress, actually *gain* from overkill.
- Families 1 and 4 do not care about overkill, because no damage is needed.
- Family 2 works only if the player switches to non-lethal tools.
- HP-gated designs break: Monster Hunter, WoW battle pets, and BroTown today.

### Cited Findings
**(1) Capture at any HP: odds from factors other than damage**
- Palworld lets you throw at a full-HP Pal. Low HP only helps: a Giga Sphere at a level 30 Pal gives 12.6% at full HP and 33.7% near death [summary] — [Palpedia capture guide](https://palpedia.io/en/guides/capture/)
- Palworld's main factor is the gap between the sphere's capture power and the Pal's level. Capture power runs from 7 (Pal Sphere) to 64 (Ancient Sphere), and the chance is zero once the Pal's level exceeds the capture power by 50 or more [summary] — [Palworld wiki, Spheres](https://palworld.wiki.gg/wiki/Spheres), [Palpedia](https://palpedia.io/en/guides/capture/). Per-tier values: Pal 7, Mega 14, Giga 20, Hyper 27, Ultra 33, Legendary 38, Exotic 50 [summary] — same search. One summary describes the level gap as sphere level + Capture Power level × 0.5 + passive bonus − target level, with the gap "raised to the ninth power" [summary] — [lootlab capture formula](https://lootlab.app/palworld/guides/capture-formula/), [palworld.gg calculator](https://palworld.gg/capture-rate). Its exact form disagrees with the other summary, so treat the formula's shape as uncertain.
- Palworld's back-attack bonus: a throw that hits a Pal from behind gets +0.5 added to the roll, shown as ×1.5 [summary] — [lootlab](https://lootlab.app/palworld/guides/capture-formula/), [palmods guide](https://www.palmods.gg/guides/capture)
- Palworld's Capture Power level rises with collected Lifmunk Effigies: 51 are needed for the full benefit, and the boost shrinks on higher-level Pals [summary] — [BisectHosting effigy guide](https://www.bisecthosting.com/blog/palworld-lifmunk-effigies-locations-capture-rate-increases), [Game8](https://game8.co/games/Palworld/archives/440542)
- In Pokémon Legends: Arceus, a ball that hits an unaware Pokémon in the back is a "back strike", worth ×1.75, and it carries through a battle started that way. The Heavy, Leaden and Gigaton "weight" balls do better against Pokémon that haven't noticed you, and they stack with the back strike [summary] — [Bulbapedia catch rate](https://bulbapedia.bulbagarden.net/wiki/Catch_rate), [Nintendo catching guide](https://www.nintendo.com/us/whatsnew/pokemon-legends-arceus-hone-your-catching-techniques-with-this-guide/), [Serebii](https://www.serebii.net/legendsarceus/capture.shtml)
- A Pokémon GO wild encounter has no HP to wear down. The per-throw chance is P = 1 − (1 − BCR/(2·CPM))^M, where BCR is the species' base capture rate, CPM the level multiplier and M the product of the ball, berry, throw, curveball and medal multipliers [summary] — [GamePress catch mechanics](https://pogo.gamepress.gg/catch-mechanics)
- WoW's hunter Tame Beast is a 6-second channel. Damage does not push it back, but stuns, knockdowns and silences interrupt it (dazes do not), and losing the beast's attention fails it. It works only on beasts at or below the hunter's level, and exotic beasts need the Beast Mastery spec [summary] — [Wowhead Tame Beast](https://www.wowhead.com/spell=1515/tame-beast), [Warcraft Wiki](https://warcraft.wiki.gg/wiki/Tame_Beast), [Wowpedia](https://wowpedia.fandom.com/wiki/Tame_Beast)
- Mainline Pokémon allows a full-HP throw, but the HP term (3·max − 2·cur)/(3·max) is then ⅓ [code] — [pokeemerald Cmd_handleballthrow](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c). Temtem's version is ((4·max − 3·cur) × rate × card)/(2·max + 10·level) [summary] — [Temtem wiki, Taming](https://temtem.wiki.gg/wiki/Taming)

**(2) Separate non-lethal meters and no-damage tools**
- Ark knocks a creature out with **torpor**, a second meter separate from HP. Narcoberries add 7.5 torpor and Narcotics 40. Taming effectiveness (TE) starts at 100% and falls when the creature is damaged during a knockout tame; punching an unconscious creature to keep its torpor up costs TE. Higher final TE means more bonus levels. Higher-damage weapons give more torpor per shot [summary] — [ARK wiki, Taming](https://ark.wiki.gg/wiki/Taming), [XGamingServer taming guide](https://xgamingserver.com/blog/ark-survival-ascended-taming-guide/), [Steam thread](https://steamcommunity.com/app/346110/discussions/0/483368526588282126)
- Monster Hunter Rise uses 1 shock or pitfall trap plus 2 tranq bombs, and more bombs or ammo may be needed depending on the monster. This works only once the monster is weak enough. Elder Dragons cannot be captured and are usually immune to traps [summary] — [GameRant capture vs kill](https://gamerant.com/monster-hunter-rise-capture-vs-kill-which-is-best/), [Newsweek capture guide](https://www.newsweek.com/monster-hunter-rise-capture-guide-how-tranq-trap-crafting-1578817)
- Black Desert's horse lasso deals no damage. You throw the rope, then make one timed press while the moving bar is in the blue zone (one try). You approach, and when the horse rears you have 10 seconds of repeated presses to keep a red gauge at or above 50%, possibly several times over. Then you feed it a Lump of Raw Sugar and mount [summary] — [GrumpyGreen](https://grumpygreen.cricket/horse-taming/), [BDFoundry](https://www.blackdesertfoundry.com/horse-taming/), [Altar of Gaming](https://altarofgaming.com/black-desert-online-horse-taming-training-breeding-exchanging-guide/)
- Path of Exile's Bestiary league nets were thrown at a beast on low life, with a 3-second capture window when the net matched the beast's level; lower life meant a higher chance [summary] — [poewiki Bestiary](https://poewiki.net/wiki/Path_of_Exile:_Bestiary), [PoE fandom wiki, Net](https://pathofexile.fandom.com/wiki/Net)
- Sleep and paralysis as capture setups:
  - Pokémon: sleep/freeze ×2 (×2.5 from Gen 5), paralysis/poison/burn ×1.5 [code] — [pokeemerald](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c), [pokeemerald-expansion](https://github.com/rh-hideout/pokeemerald-expansion/blob/master/src/battle_script_commands.c)
  - Temtem: Asleep/Frozen 1.5, Burned/Poisoned 1.25, Cold/Trapped 1.2, Exhausted/Seized 1.1, Alerted 0.8 [summary] — [Temtem wiki](https://temtem.wiki.gg/wiki/Taming)
  - Coromon: a Dream Spinner for sleeping targets [summary] — [Coromon wiki, Spinners](https://coromon.wiki.gg/wiki/Spinners)
  - Palworld: asleep or frozen adds about 9% [summary; uncertain] — [Palpedia](https://palpedia.io/en/guides/capture/)
- WoW battle pets can be trapped only below 35% HP [summary] — [Wowhead Strong Trap](https://www.wowhead.com/pet-ability=77/strong-trap)

**(3) The kill is the trigger: befriend, drop or capture on defeat**
- Ni no Kuni (Wrath of the White Witch): after a defeat, a heart may appear over the creature, about 25% for docile creatures and down to about 4% for rare, powerful ones. Esther must then cast Serenade to tame it. Players call it "completely random"; only a merit unlocked later raises the rate [summary] — [Prima Games](https://primagames.com/news/ni-no-kuni-wrath-white-witch-recruiting-familiars), [GameFAQs](https://gamefaqs.gamespot.com/boards/998014-ni-no-kuni-wrath-of-the-white-witch/65581785)
- Yo-kai Watch: food fed during battle raises the chance a Yo-kai is recruited (a favourite raises it, a disliked food lowers it) [summary] — [Yo-kai Watch wiki, Befriending](https://yokaiwatch.wiki.gg/wiki/Befriending). That the roll happens once the Yo-kai is defeated is my understanding; the summary I got covers only the food bonuses.
- Path of Exile from 3.5.0: nets no longer do anything. Einhar captures beasts automatically when they are killed; the net step "wasn't popular" (community description) [summary] — [PoE fandom wiki, Net](https://pathofexile.fandom.com/wiki/Net), [PoE fandom wiki, Beast](https://pathofexile.fandom.com/wiki/Beast), [poecurrency](https://www.poecurrency.com/news/path-of-exile-guide-to-bestiary-league-here-are-more-details-you-dont-wanna-miss)
- Monster Sanctuary: defeating wild monsters earns a 1–5 star rating for the fight (what earns stars was not in the summary I retrieved). Five stars guarantee a rare reward, which is more likely to be the monster's egg if you don't own it yet [summary] — [Monster Sanctuary wiki, Adventuring Basics](https://monster-sanctuary.fandom.com/wiki/Adventuring_Basics), [Monster Eggs](https://monster-sanctuary.fandom.com/wiki/Monster_Eggs)
- MapleStory's familiars arrive as card drops from mobs, at rates set by rank [summary] — [Dexless revamp details](https://dexless.com/threads/familiar-revamp-details-maplestory.1675/)
- Siralim Ultimate: you summon a creature once you hold 100% of its Mana, gained by killing that creature [summary; the mechanism is unclear] — [Siralim Ultimate wiki, Cards](https://siralimultimate.wiki.gg/wiki/Cards)

**(4) Skill inputs that set or replace the odds**
- Pokémon GO's game master sets the throw thresholds at nice 1.0, great 1.3, excellent 1.7, and the curveball spin threshold at 0.5 [code] — [PokeMiners game master](https://github.com/PokeMiners/game_masters/blob/master/latest/latest.json). The throw multiplier scales with the ring's radius when the ball lands: Nice 1.0–1.3, Great 1.3–1.7, Excellent 1.7–2.0. A curveball adds ×1.7 [summary] — [GamePress](https://pogo.gamepress.gg/catch-mechanics), [Pokémon GO Hub bonus chart](https://pokemongohub.net/post/article/capture-bonus-chart-for-pokemon-go/)
- Black Desert: one timed press, then 10 seconds of mashing (above).
- Nexomon: Extinction gives about 5 seconds to enter a button prompt after the trap is thrown. Finishing it raises the chance (players report about +5%), and the inputs can simply be mashed [summary] — [GameRant](https://gamerant.com/nexomon-extinction-capture-creatures-how/), [Steam](https://steamcommunity.com/app/1196630/discussions/0/2916598577627003793/), [GameFAQs](https://gamefaqs.gamespot.com/boards/281562-nexomon-extinction/78948652)
- Coromon: spinner tiers run Spinner < Silver < Golden < Platinum, and the Platinum always catches. The Trick Spinner is best at the start of a battle. I found no skill minigame [summary] — [Coromon wiki](https://coromon.wiki.gg/wiki/Spinners)

**(5) Guards against killing what you meant to catch**
- False Swipe: if a hit's damage is at least the target's HP, the damage becomes HP − 1, the same clamp as Endure and Focus Band [code] — [pokeemerald battle_script_commands.c](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c)
- Hold Back, a later move, has the same effect (`EFFECT_FALSE_SWIPE`, power 40, "An attack that leaves the foe with at least 1 HP") [code] — [pokeemerald-expansion moves_info.h](https://github.com/rh-hideout/pokeemerald-expansion/blob/master/src/data/moves_info.h)
- Cassette Beasts: a target being recorded cannot be defeated and keeps at least 1 HP. Damage dealt to it during the rest of the turn *raises* the record chance; damage taken by the recorder lowers it. A % meter over the target shows the live chance [summary] — [Cassette Beasts wiki, Recording](https://wiki.cassettebeasts.com/wiki/Recording), [devblog "Roll the Tape!"](https://www.cassettebeasts.com/2022/08/19/roll-the-tape/)
- Dragon Quest Monsters scouting is a "show of force". Its success % is shown on screen and is based on the damage your party's normal attacks would deal (Attack, or Wisdom if higher since The Dark Prince), boosted by Oomph, Sap and tension. Only 100% is certain [summary] — [Dragon Quest Wiki, Monster scouting](https://dragon-quest.org/w/index.php?title=Monster_scouting&mobileaction=toggle_view_desktop)
- Monster Hunter's cues:
  - A monster is ready when it limps, heads to its nest to sleep, or its minimap icon flashes a skull [summary] — [Steam MH:W thread](https://steamcommunity.com/app/582010/discussions/0/3335371283879396289/)
  - The skull is not exact: it means the monster is trying to return to its nest [summary] — [Steam MH:W threads](https://steamcommunity.com/app/582010/discussions/0/1735462352475642062)
  - Players report killing monsters by accident during capture attempts and advise holding back damage on capture quests [summary] — [Steam MH:W thread](https://steamcommunity.com/app/582010/discussions/0/2244426186203384394)

### Inferences
**Verdict for each mechanic: does it still work when the player can kill the creature in one hit?**

| Mechanic (games) | Needs HP lowered? | Works if the player one-hits? | Why | What it would mean for BroTown |
|---|---|---|---|---|
| Odds at any HP from item power vs level (Palworld spheres, Temtem cards, Pokémon balls) | No; low HP is only a bonus in Palworld, ×3 at most in Pokémon | **YES**, if you throw *before* hitting | Full-HP throws are legal | Make the trap legal at full HP; base the chance on trap tier vs monster level; HP lost is only a bonus, if kept at all |
| Back-strike / sneak bonus (Palworld ×1.5, Legends: Arceus ×1.75) | No | **YES** | Position, not damage | The worker knows whether a monster is targeting you, so "unaware" is cheap to check. A behind-arc check needs the server to track facing |
| WoW hunter's Tame Beast: 6 s channel, interrupted by stun, knockdown or silence | No HP rule is stated in the sources I reached | **YES** | You tame instead of fighting; the target fights back | A 2–3 s "bind" held on the trap button, broken if you are dazed, held or stunned (the worker already applies these). One thumb, fully server-checked |
| Pokémon GO's throw ring and curveball (×1–2, ×1.7) | No combat at all | **YES** | Execution sets the multiplier | One release-timing tap on a ring. It must be judged on the worker's clock with latency slack, or the client could fake "perfect" |
| Ark's torpor meter (narcotics; damage lowers tame quality) | A separate meter | **PARTLY** | Torpor weapons also deal HP damage, so a strong weapon kills | A "subdue" meter filled only by non-damaging tools (snare, bait, sleep), so damage can't overkill it |
| Monster Hunter's trap + 2 tranqs below a 15–25% threshold | **Yes** | **NO** | Still an HP gate; players report accidental kills | Copy the *cues* (limp, skull) and the *trap that holds*, not the gate |
| Sleep / paralysis setups (Pokémon ×1.5–2.5, Temtem ×1.1–1.5, Palworld about +9%) | No, if used as multipliers | **YES**, as multipliers | Status, not HP | Let player attacks put "held" or "dazed" on monsters (today these statuses only go monster → player), then multiply the chance |
| No-damage restraint tools (Black Desert lasso: one timed press + 10 s of mashing) | No | **YES** | The tool deals no damage | A snare or bola that roots for a beat with no damage, then a bind. Skip mashing: phones, short sessions |
| Path of Exile's league nets (low life, 3 s window, enrage on failure) | **Yes** | **NO** | Overkill skips the window | A warning: dropped when Bestiary went core, replaced by capture-on-kill |
| Capture or befriend on defeat (Path of Exile 3.5+ Einhar; Ni no Kuni hearts 4–25%; Yo-kai Watch food; Monster Sanctuary eggs; MapleStory cards; Siralim mana) | No: the kill *is* the trigger | **YES**, overkill is irrelevant | Rolled at or after death | "Arm a trap; the killing blow on that monster becomes the capture roll." The simplest overkill-proof core (one branch on the server's kill path). It needs pity, a progress meter or a shown chance, or it feels like a random drop |
| Damage fills a capture meter while the target can't die (Cassette Beasts: HP floored at 1 while recording, damage dealt *raises* the rate; Dragon Quest Monsters: scout % from your party's would-be damage) | No | **YES, and overkill HELPS** | Damage converts into capture progress, not death | A short "capture window" opened by a trap: the worker floors that monster's HP at 1, and every hit (yours or a teammate's) fills a capture % shown live; roll when the window ends. Turns "too strong" into an advantage and lets a party help instead of kill-steal |
| HP floor on your own hits (False Swipe and Hold Back: damage at least HP → HP − 1) | Partly: it's how you reach low HP safely | **YES, but only if the player switches to it** | A clamp | A "capture stance" toggle on the server, one line in the damage path. It is a mode to remember, so pair it with a meter or a capture-on-kill rule rather than relying on it alone |
| BroTown today (at or below 20% HP, 200 px, one roll) | **Yes** | **NO** | One hit takes a full-HP monster past 20% straight to death | Replace the gate. See the three candidates below |

**Three overkill-proof core mechanics to consider** (my synthesis, for the plan writer):
1. **Snare and bind** (Tame Beast + Black Desert + Palworld). Tap to throw a snare, which deals no damage and roots the monster for 1–2 s. Then hold to bind for 2–3 s; the monster fights back, and being hit hard, dazed or held breaks the bind. The worker rolls: trap tier vs level, element match, unaware or behind, bait, and pity. Then 0–3 wobbles.
   - One-hit players: unaffected, since no damage is needed.
   - Touch: tap, then hold.
   - Server: every input is a timestamped action the worker validates. Nothing is trusted from the client.
2. **Capture on the killing blow** (Path of Exile 3.5+). Throw a trap at a monster to "mark" it for N seconds; if it dies while marked, the server rolls a capture instead of dropping loot.
   - One-hit players: perfect, since overkill is irrelevant.
   - Touch: a single tap.
   - Weakness: the moment is less of an event, so dress it with wobbles over the corpse.
3. **Capture meter** (Cassette Beasts + Dragon Quest Monsters). A trap opens a 3–5 s window. That monster can't drop below 1 HP, and all damage dealt fills a capture % drawn over it. At the end, roll the % (or capture outright at 100%).
   - One-hit players: their big hits fill the meter fastest.
   - Parties: help rather than steal.
   - Server: one HP-floor flag and one counter per monster.
- Any of the three can carry pity (WoW's +20–30% per failure), situational traps (Pokémon's ball variety) and an honest shown chance, unlike Palworld's inflated reticle.

### Gaps
- **The shared web-search budget ran out (2026-10-06)** before these leads could be checked. They come from memory, are NOT verified, and should not be used as facts until sourced:
  - Pokémon Ranger (DS): captures by drawing loops around the creature with the stylus, while its attacks break the line. If confirmed, it is the most direct precedent for a touch-screen capture with no HP.
  - Final Fantasy X: "Capture" weapons whose killing blow captures the fiend for the Monster Arena. If confirmed, it is a precedent for capture-on-kill.
  - Horizon Zero Dawn: "Override" a machine by sneaking up or after knocking it down, then holding a button. A real-time action-RPG precedent for a no-HP channel.
  - Far Cry Primal: taming by throwing bait and holding a button while the beast eats. A precedent for food-based taming with no HP.
  - Minecraft and Valheim: taming by feeding (a chance per item, or a feeding progress bar).
  - Zelda: Breath of the Wild and Red Dead Redemption 2: horse taming by stamina or balance.
  - Older Dragon Quest Monsters games: monsters joining after defeat, raised by meat fed during battle.
- Also unconfirmed:
  - whether a Dragon Quest Monsters "show of force" damages the target (I believe it does not)
  - the exact timing of Ni no Kuni's heart and Serenade window
  - Ark bolas and nets (immobilise with no damage?)
  - whether Palworld offers any non-lethal option to prevent accidental kills
  - Pokémon Scarlet/Violet's auto-battle, and Legends: Z-A's real-time catching

## Pokémon mainline (Gen 3+) and Pokémon GO: exact mechanics and how transparent the odds are

### Takeaway
Mainline Pokémon resolves a capture as a few independent dice checks. Their odds are the product of continuous modifiers: HP (worth up to ×3), status (×1.5–2.5), ball (×1–5, situational) and level or badge terms in Gens 8–9. The player sees only 0–3 ball shakes.

Pokémon GO keeps the same "product of multipliers" shape but puts the biggest multipliers on execution skill: the throw ring is worth ×1–2 and the curveball ×1.7, up to ×3.4 together. It shows difficulty with a coloured ring that updates live, not a number. GO also hides its base rates on the server, which players resented.

### Cited Findings
- **Gen III formula** (decompiled code):
  - Modified catch value a = (catchRate × ball/10) × (3·MaxHP − 2·HP)/(3·MaxHP).
  - Then ×2 if asleep or frozen, ×1.5 if poisoned, burned, paralysed or badly poisoned.
  - If a > 254 the Pokémon is caught outright.
  - [code] — [pokeemerald Cmd_handleballthrow](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c)
- **Gen III shakes:**
  - Otherwise the threshold is b = 1048560 / √√(16711680/a), and the game rolls a 16-bit `Random() < b` up to four times.
  - The number of rolls passed is the number of shakes the animation shows, and passing all of them means caught.
  - The Master Ball forces success.
  - [code] — same.
- **Gen III ball multipliers** (in tenths) [code] — same:
  - Poké Ball 10, Great 15, Ultra 20, Safari 15.
  - Net 30 against Water or Bug types.
  - Dive 35 underwater.
  - Nest (40 − level), minimum 10.
  - Repeat 30 if the species is already registered as caught.
  - Timer (turns + 10), capped at 40.
- **Safari Zone** (no battling, so odds can only be traded against flight) [code] — [battle_util.c](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c), [battle_main.c](https://github.com/pret/pokeemerald/blob/master/src/battle_main.c):
  - The catch factor starts at catchRate × 100/1275, on a 0–20 scale.
  - The flee ("escape") factor starts at 3.
  - Each "Go Near" adds +4, +3, +2, +1 to the catch factor (cap 20) and +4 to the escape factor (cap 20).
  - Pokéblocks lower the escape factor.
- **Gen 4–9 balls** (community rebuild, set per generation) [code] — [pokeemerald-expansion](https://github.com/rh-hideout/pokeemerald-expansion/blob/master/src/battle_script_commands.c):
  - Great 1.5, Ultra 2.
  - Net 3.5 (3.0 before Gen 7).
  - Nest (41 − level)/10 below level 30 (Gen 6+).
  - Dive 3.5, also when fishing or surfing.
  - Dusk 3.0 at evening, at night or in caves (3.5 before Gen 7).
  - Timer 1 + 1229/4096 per turn (about +0.3 a turn), capped at 4 (Gen 5+).
  - Quick 5.0 on the first turn (4.0 in Gen 4).
  - Repeat 3.5 (3.0 before Gen 7).
  - Level Ball 2, 4 or 8 when your level is more than 1×, more than 2× or at least 4× the target's.
- **Gen 5+ status:** sleep/freeze ×2.5 [code] — same.
- **Gen 8–9 level terms** [code] — same:
  - Gen 8 badge penalty: ×410/4096 (about 0.1) when you lack badges and the wild Pokémon out-levels yours.
  - Gen 9 badge penalty: ×0.8 for each badge level cap (25, 30, 35, 40, 45, 50, 55, 60, 100) the target exceeds beyond your badges.
  - Gen 8 low-level bonus: ×(30 − level)/10 at level 20 or below.
  - Gen 9 low-level bonus: ×(36 − 2·level)/10 at level 13 or below.
- **Critical capture:**
  - The multiplier depends on how many Pokémon you have caught, scaled to a 650-entry Pokédex: more than 600 ×2.5, more than 450 ×2, more than 300 ×1.5, more than 150 ×1, more than 30 ×0.5, otherwise no critical captures. The Catching Charm raises it.
  - The chance is min(255, a × multiplier)/6 against a random 0–255, and it plays its own animation [code] — [pokeemerald-expansion](https://github.com/rh-hideout/pokeemerald-expansion/blob/master/src/battle_script_commands.c)
  - A critical capture makes one shake check instead of the usual ones [summary] — [Pokémon Wiki, Catch rate](https://pokemon.fandom.com/wiki/Catch_rate)
- The Gen VI+ shake formula is b = 65536/(255/a)^(3/16) [summary] — [Pokémon Wiki](https://pokemon.fandom.com/wiki/Catch_rate), [Pokémon Fire Ash wiki](https://pokemonfireash.fandom.com/wiki/Catch_rate)
- In Gen I, a failed throw's shake count was a fixed function of ball, status and HP, a rough hint at the odds rather than the record of a roll [summary] — [Cave of Dragonflies, Gen I capture](https://www.dragonflycave.com/mechanics/gen-i-capturing/)
- **Pokémon GO items and medals:**
  - Berries in the game master [code] — [PokeMiners game master](https://github.com/PokeMiners/game_masters/blob/master/latest/latest.json):
    - Razz ×1.5 for one throw.
    - Golden Razz ×2.5, plus full motivation.
    - Silver Pinap ×1.8, plus a candy award.
    - Pinap gives a candy award (2.0).
    - Nanab slows the target (`ITEM_EFFECT_CAP_TARGET_SLOW`).
  - GO's ball multipliers (commonly quoted as Poké 1, Great 1.5, Ultra 2) were NOT in any source I retrieved, and the current game master's ball items carry no multiplier field [code]. Treat them as unverified.
  - Type medals give Bronze 1.1, Silver 1.2, Gold 1.3, Platinum 1.4 [summary] — [GamePress](https://pogo.gamepress.gg/catch-mechanics).
- **GO fleeing:** each species has a fixed base flee rate, rolled after a failed throw. In one worked example, Ultra Ball + Razz + curveball gave a 75% overall catch and 25% flee, and adding a Great throw with a Gold medal gave 86% and 14% [summary] — [GamePress](https://pogo.gamepress.gg/catch-mechanics)
- **GO's ring colour:** it runs green (easy), yellow, orange, red (hardest). It re-colours live when you apply a berry or switch to a better ball; a Golden Razz on a red raid boss moves it toward orange [summary] — [Twinfinite](https://twinfinite.net/ps4/pokemon-go-colored-ring/), [Switchblade Gaming, target rings](https://www.switchbladegaming.com/pokemon-go/target-ring-system/)
- **GO's hidden rates:** Niantic removed the base catch and base flee rates from the game master, and players called this "shady" [summary] — [Pokémon GO Hub](https://pokemongohub.net/post/news/niantic-hides-base-catch-and-base-flee-rates-from-the-game-master-file/), [Dexerto](https://www.dexerto.com/pokemon/pokemon-go-players-call-niantic-shady-for-hiding-base-capture-flee-rates-2139501/). Confirmed: the 2026-10-06 game master (18,812 templates) has no `baseCaptureRate` or `baseFleeRate` fields, but 1,015 `shadowBaseCaptureRate` fields, for example Pidgey 0.5, Dratini 0.4, Bulbasaur 0.2, Snorlax 0.05, Mewtwo 0.02 [code] — [PokeMiners game master](https://github.com/PokeMiners/game_masters/blob/master/latest/latest.json)
- **GO targets keep acting:** each species has attack and dodge odds and timers during the encounter. Bulbasaur has attackProbability 0.1, dodgeProbability 0.15 and attackTimerS 29; Mewtwo has attackTimerS 3; Snorlax has dodgeProbability 0.05 [code] — same.
- After community complaints Niantic lowered Togetic's flee rate [summary] — [IBTimes](https://www.ibtimes.com/pokemon-go-update-niantic-fixes-togetic-base-flee-rate-after-complaints-make-it-2494531)

### Inferences
- [calc] In Gens III–V each of the four checks passes with probability of about (a/255)^¼, so P(catch) ≈ a/255. In Gen III it comes out a little higher, because the game's integer square roots round down. Gen VI's exponent of 3/16 gives about (a/255)^¾, a buff when a is low. Either way, the shakes are suspense wrapped around a single probability.
- [calc] From the Gen III formula:
  - catch rate 45, Poké Ball, full HP: about 6%
  - the same at 20% HP: about 17%
  - Ultra Ball at 1 HP, target asleep: about 70–78%
  - a catch-rate-3 legendary in that same best case: about 4%
- [calc] Pokémon GO, BCR 0.2 at level 20 (CPM 0.5974):
  - plain Poké Ball: 16.7%
  - a perfect excellent curveball with the same ball: 46%
  - Ultra Ball + Golden Razz + perfect curveball: 96% (assuming Ultra = ×2, which is not sourced here)
  - Execution (×3.4) outweighs the best ball (×2).
- Situational balls turn "conditions" into items: they reward reading the fight — first turn, long fight, place, species already owned, target type — rather than raw power.
- **BroTown lines:**
  - **HP term:** if HP stays in at all, make it a bonus, not a cliff. The owner's overkill concern rules out an HP gate.
  - **Shake checks:** roll on the worker and send `shakes: 0–3`, as Emerald passes a shake count to its animation. The client plays the wobbles, then the break or the click. It needs no extra round trip and nothing can be forged, and the wobbles can be drawn in code with no new textures, which suits the memory budget.
  - **Situational traps:** a frost snare ×3 against frost monsters (like the Net Ball), a quick snare for the first seconds of a fight, a snare that grows with fight time, a repeat snare for species you already own. All can be checked on the server, and they suit the eight elemental lands.
  - **Level penalty:** Gen 9's ×0.8 per step is gentler than BroTown's additive −5 points per level with a 10% floor. A multiplicative penalty never slams into a floor.
  - **Critical capture:** a rare one-wobble capture, more likely the more species you own, rewards collecting.
  - **Safari Zone lever:** getting closer raises the catch chance but also the flee chance. In BroTown: close or behind is better, but you risk a hit.

### Gaps
- The Gen VI–IX shake formula and the one-shake critical capture rest on search summaries, since Bulbapedia was blocked.
- Not retrieved: GO's critical-catch odds, exactly when its flee roll happens, how dual-type medals combine, and the full Legends: Arceus formula. The level/rank term the search returned was garbled.

## Real-time action games: Monster Hunter, Palworld, Path of Exile, Ark, Black Desert, WoW battle pets, WoW hunter taming

### Takeaway
Real-time games fall into four camps:
- **Procedures** gated by a visible state:
  - Monster Hunter: weaken to a per-monster threshold, trap it, two tranqs.
  - WoW's hunter: a 6-second channel that must not be interrupted, on a beast at or below your level.
- **Dice with continuous modifiers plus spatial skill:** Palworld (sphere power vs level, HP, back bonus), with three hidden checks behind an inflated on-screen %.
- **State meters:** Ark's torpor, where damage costs the tame's quality.
- **Skill minigames:** Black Desert's timed press and mashing.

The clearest lesson for a fast action-RPG is Path of Exile: its "lower the beast's life, then net it within 3 seconds" step was replaced by capture-on-kill when Bestiary joined the core game.

### Cited Findings
- **Monster Hunter:**
  - Capture thresholds are usually 25%, 20% or 15% HP, about 5% lower on tempered monsters [summary] — [Steam MH:W "Tempered Monster Capture Threshold"](https://steamcommunity.com/app/582010/discussions/0/3335371283879396289/)
  - Telegraphs: a limp, a retreat to the nest to sleep, a flashing skull on the minimap icon, a flat heart-rate line under the icon [summary] — [Steam MH:W threads](https://steamcommunity.com/app/582010/discussions/0/5950985868236370017/)
  - Slinger pod drops are said to come at 30%, 20% and 10% HP in one summary and about 40%, 25% and 10% in another (conflicting) [summary] — same search set.
  - Rise's cost: 1 trap and 2 tranq bombs. After "Capture Success" you get about 15–20 seconds to gather loose materials.
  - Rewards: capture gives 2–3 rewards; killing gives 3 guaranteed carves. Some super-rare parts (Narga Medulla) are carve-only in Rise, while capture can give materials rarely or never carved [summary] — [GameRant](https://gamerant.com/monster-hunter-rise-capture-vs-kill-which-is-best/), [Newsweek](https://www.newsweek.com/monster-hunter-rise-capture-guide-how-tranq-trap-crafting-1578817)
- **Palworld:**
  - A datamine of the capture math (an r/Palworld post) found the true chance R split into three checks with exponents [0.444444, 0.333333, 0.222222] (`CaptureJudgeRateArray`). These are a bounce/deflection check R^(4/9), a first wiggle R^(3/9) and a second wiggle R^(2/9).
  - The reticle's `ConvertTrueRateToDisplayRate` uses a 1.25 power, and a Lamball shown at 49% had a true 18.25% [summary] — [mirror of the r/Palworld post](https://embedez.com/gallery/6a63d06e403c7d0b4b772a03)
  - The "True Capture Rate" mod reverses the display with P_true = (P_display/100)^2.4 × 100, so a displayed 54.46% is a true 23.26% [summary] — [Nexus mod 5216](https://www.nexusmods.com/palworld/mods/5216)
- **Path of Exile, Bestiary league (2018):**
  - Ten net tiers were staggered through the game; in any area you find the current tier and sometimes the next.
  - The capture window is always 3 seconds with a net of the right level.
  - On failure the beast breaks free, recovers some life and becomes Enraged; you may retry when the Enrage ends.
  - From 3.5.0 nets do nothing, and Einhar captures beasts when they are killed [summary] — [poewiki Bestiary](https://poewiki.net/wiki/Path_of_Exile:_Bestiary), [PoE fandom wiki, Net](https://pathofexile.fandom.com/wiki/Net), [poecurrency](https://www.poecurrency.com/news/path-of-exile-guide-to-bestiary-league-here-are-more-details-you-dont-wanna-miss)
- **WoW battle pets:**
  - The trap can be used below 35% HP and takes your action for the round.
  - Each failed attempt raises the chance: +20% for Trap, +25% for Strong Trap, +30% for Pristine Trap [summary] — [Wowhead Pristine Trap](https://www.wowhead.com/pet-ability=135/pristine-trap), [Wowhead Strong Trap](https://www.wowhead.com/pet-ability=77/strong-trap), [WoWWiki Trap](https://wowwiki-archive.fandom.com/wiki/Trap_(pet_battle))
  - Only one pet can be captured per battle, and you keep it only if you win the battle [summary] — [WarcraftPets guide](https://www.warcraftpets.com/wow-pet-battles/), [Wowpedia Pet Battle System](https://wowpedia.fandom.com/wiki/Pet_Battle_System)
  - Exact HP below 35% doesn't matter [summary] — [WarcraftPets forum](https://www.warcraftpets.com/community/forum/viewtopic.php?t=18739)
  - The base chance is not published [summary].
- Ark, Black Desert and WoW's hunter taming are covered in the main section above.

### Inferences
- **Monster Hunter's telegraph:** borrow the *cue*, not the gate. BroTown already draws HP bars; a pulsing trap icon plus a code-drawn limp (slower walk, tilt) costs no textures.
- **Monster Hunter's rewards:** capture there has its own reward table. BroTown's capture gives no loot or XP, so it is strictly worse than a kill; give it a reward roll or XP.
- **Monster Hunter's capture grace window:** the 15–20 seconds of looting after the capture is a nice "the moment is over, enjoy it" beat.
- **Palworld's three checks:** they map onto BroTown's wobbles. But never inflate the shown odds: players datamine, and a mod exists just to undo the lie.
- **Path of Exile:** in a fast real-time action-RPG, a separate "weaken, then throw in a window" step was dropped. Its Enrage-on-failure (heal plus danger) is a good real-time failure cost.
- **WoW battle pets:**
  - Pity per failure is cheap server state (per player and monster) and turns bad luck into progress.
  - "You keep it only if you win" maps onto BroTown's PvP rings: a pet not yet "banked" could be lost if you die.
- **Path of Exile's net tiers vs level:** BroTown's crafted trap tiers (copper, iron, black steel), with trap tier against monster level replacing the flat −5% per level.

### Gaps
- Kiranico's per-monster capture thresholds and the exact numbers for Monster Hunter Wilds were not retrieved.
- Also not retrieved: the base chance of WoW's pet trap, and whether its "+20% per failure" is added or multiplied.

## Other approaches: Temtem, Cassette Beasts, Coromon/Nexomon, Dragon Quest Monsters, Ni no Kuni, Yo-kai Watch, Shin Megami Tensei, MapleStory familiars, Siralim / Monster Sanctuary

### Takeaway
Outside Pokémon, designers move the moment in four directions:
- **Different dice:** Temtem's level term and its "Alerted ×0.8"; Coromon's situational spinners.
- **A live, visible meter you influence through the turn:** Cassette Beasts, Dragon Quest Monsters.
- **A post-battle befriend roll, raised by food:** Ni no Kuni, Yo-kai Watch, the older Dragon Quest Monsters.
- **Collecting by drops or progress:** MapleStory cards, Monster Sanctuary eggs graded by a 1–5 star fight rating, Siralim's kill-filled mana.
- **Dialogue:** Shin Megami Tensei.

The ones players praise most give agency, as in Cassette Beasts. The ones they complain about are low, pure-luck rates: Yo-kai Watch, Ni no Kuni, MapleStory.

### Cited Findings
- **Temtem** [summary] — [Temtem wiki, Taming](https://temtem.wiki.gg/wiki/Taming):
  - a = ((4·HPmax − 3·HPcur) × TCR × TCB)/(2·HPmax + 10·Level) × TSB × FLCB. At a ≥ 140 the catch is guaranteed.
  - Otherwise four shakes each roll 0–50,000 against b = 1,000,000/√√(21,000,000/a).
  - Cards: TemCard 1.0, TemCard+ 1.5, TemCard++ 2.5, SaiCard 2.0.
  - Two statuses multiply together.
- **Cassette Beasts** [summary] — [Cassette Beasts wiki, Recording](https://wiki.cassettebeasts.com/wiki/Recording), [devblog](https://www.cassettebeasts.com/2022/08/19/roll-the-tape/):
  - RecordRate = DamageBonus × HPBonus × LevelBonus × SpeciesRate × TapeRate × UpgradeBonus / 10000, rolled against a random 0–1.
  - Bootlegs have a lower species rate; the Microphone Upgrade and the Recording Mod raise it.
  - A failed recording does not damage the tape, and you can retry in the same battle as long as you don't kill the target.
- **Dragon Quest Monsters:** a failed scout can irritate the target, which then can't be scouted. In Terry's Wonderland 3D, a monster that has been fed won't get angry, so you can retry until it is full [summary] — [Dragon Quest Wiki](https://dragon-quest.org/w/index.php?title=Monster_scouting&mobileaction=toggle_view_desktop)
- **Yo-kai Watch:**
  - In Yo-kai Watch 1 at difficulty 1 the base is 12.5%, with food tiers adding +10/+15/+20/+25% and a favourite food +3%. Difficulty 2 has a base of 6.25% and a favourite +7.5%; in Yo-kai Watch 3 the favourite adds +4.5% [summary; these figures look inconsistent with one another] — [Yo-kai Watch wiki, Befriending](https://yokaiwatch.wiki.gg/wiki/Befriending)
  - A fan mod for Yo-kai Watch Blasters replaced per-Yo-kai rates "from 6% to 0.5%" with a flat 8% [summary] — [Blasters++ on X](https://x.com/Blastersplusmod/status/1840451478692982982)
- **Shin Megami Tensei V:**
  - You answer to suit the demon's personality, then meet its demands (items, Macca, HP or MP). The moon phase changes its mood: a full moon may skip straight to the demands, and at a new moon no demon can be recruited. A bored demon asked to sing or dance may leave, and the Pacification miracle gives a chance that a soured demon forgives you [summary] — [Megami Tensei wiki, Negotiation](https://megamitensei.fandom.com/wiki/Negotiation), [GameSkinny](https://www.gameskinny.com/tips/shin-megami-tensei-v-negotiation-demon-reactions-guide/)
  - There is a GameFAQs thread titled "Demon negotiations are garbage" [summary] — [GameFAQs](https://gamefaqs.gamespot.com/boards/204211-shin-megami-tensei-v/79779791)
- **MapleStory:**
  - Version 213 (22 April 2020) made familiar card drops depend on rank, not level; players reported 20–60 minutes per low-level familiar. More mobs drop cards, and all badges can be earned without paying, with 8 equipped at once [summary] — [Dexless](https://dexless.com/threads/familiar-revamp-details-maplestory.1675/), [Nexon forum](https://forums.maplestory.nexon.net/discussion/35561/quality-of-life-familiar-badges)
  - There is a forum thread titled "Familiar card drop rate is insane" [summary] — [Nexon forum](https://forums.maplestory.nexon.net/discussion/comment/104595/)
- **Siralim:** creature cards are very rare drops, which players estimate at about 0.1%. Reaching Knowledge Rank A raises the chance, and the Brode's Last Laugh talisman adds 1% per level [summary] — [Siralim 3 wiki, Cards](https://siralim3.fandom.com/wiki/Cards), [Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2429265646)
- The other games in this group (Coromon, Nexomon, Ni no Kuni, Monster Sanctuary) are covered in the main section.

### Inferences
- **Temtem's level term** puts the target's level in the denominator, so higher levels get harder smoothly, with no floor. Its "Alerted ×0.8" rewards trapping a monster that isn't fighting you yet. BroTown: both are easy to compute on the server.
- **Cassette Beasts** is the closest fit for a party in a real-time world: the window can't kill the target, allies' hits help rather than hurt, and the % is visible. BroTown: the worker can floor HP at 1 while a capture window is open.
- **Coromon's spinner set** maps onto BroTown trap variety: a first-strike snare, a snare for held or dazed targets, and a snare that heals the new pet.
- **Nexomon's prompt** shows that a skill input that can be mashed for +5% is noise. BroTown: make skill worth ×1.5–2, or leave it out.
- **Dragon Quest Monsters** bases the chance on your own power (gear and stats). Anger on failure blocks retries, and food prevents anger. BroTown: link cooking to trapping with bait made by cooks.
- **Ni no Kuni and Yo-kai Watch:** a befriend roll after battle can't be spoiled by overkill, but low pure-luck rates frustrate. Short daily sessions call for pity.
- **Shin Megami Tensei's negotiation** needs menus and reading. Not suited to real-time phone play.
- **MapleStory:** drops are tradeable goods. BroTown has a market, so tradeable "pet eggs" would create an economy, but rarity must not need real money (supporter-pass rules).
- **Monster Sanctuary** grades the fight; BroTown's worker knows damage taken and fight time, so it could grade the fight and hatch eggs at the farm. **Siralim** fills a per-species meter from kills, which guarantees an eventual capture.

### Gaps
- Not retrieved: Coromon's formula and whether it has any skill input, Shin Megami Tensei's formulas, Monster Sanctuary's star thresholds, how Siralim's mana works exactly, and whether Temtem shows the odds.

## Hard gates versus continuous modifiers; designs where skill matters more than dice

### Takeaway
Hard gates should be reserved for whether an attempt is allowed at all: range, slots, level band, an Elder-Dragon-style "never". The odds should come from continuous modifiers.

Skill outweighs dice where execution or positioning carries a bounded but large multiplier:
- Pokémon GO: up to ×3.4.
- Legends: Arceus: ×1.75.
- Palworld: ×1.5.

Skill can also replace the roll entirely, as in WoW's hunter channel, Black Desert's minigames and Monster Hunter's procedure. BroTown today is all gates plus one flat roll: the only "skill" lever is not overkilling, and overkill is exactly what breaks it.

### Cited Findings
- **Hard gates:**
  - Monster Hunter's HP threshold, and Elder Dragons that can't be captured [summary] — [Steam](https://steamcommunity.com/app/582010/discussions/0/3335371283879396289/), [GameRant](https://gamerant.com/monster-hunter-rise-capture-vs-kill-which-is-best/)
  - WoW battle pets' 35% HP [summary] — [Wowhead](https://www.wowhead.com/pet-ability=77/strong-trap)
  - Tame Beast's "at or below your level" and its Beast Mastery rule for exotic beasts [summary] — [Wowhead](https://www.wowhead.com/spell=1515/tame-beast)
  - Palworld's zero chance at a level gap of 50 or more [summary] — [Palworld wiki](https://palworld.wiki.gg/wiki/Spheres)
  - Path of Exile's net tier against beast level [summary] — [poewiki](https://poewiki.net/wiki/Path_of_Exile:_Bestiary)
  - No recruiting at a new moon in Shin Megami Tensei V [summary] — [Megami Tensei wiki](https://megamitensei.fandom.com/wiki/Negotiation)
  - Trainer battles block balls in Pokémon [code] — [pokeemerald](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c)
  - BroTown: damageable, 20% HP or less, 200 px, fewer than 6 pets, a trap in the bag [code] — [pets.js](../../../server/src/pets.js)
- **Continuous modifiers:** Pokémon's HP, status, ball and level terms [code]; GO's multipliers [code/summary]; Palworld's HP, power gap, back bonus and status [summary]; Temtem's HP, level and status [summary]; Cassette Beasts' damage during the turn [summary].
- **Skill levers and their sizes:**
  - GO: throw 1.0–2.0 × curveball 1.7 [code/summary].
  - Legends: Arceus back strike 1.75 [summary].
  - Palworld back bonus 1.5 [summary].
  - Pass or fail: Black Desert's timing and mashing [summary], the Tame Beast channel [summary].
  - Dragon Quest Monsters' % comes from your party's attack power [summary].
  - Monster Sanctuary's 1–5 star fight rating sets the egg odds [summary]. That the stars come from combat performance (combos, speed) is my understanding, not sourced here.
  - Sources as cited in the sections above.

### Inferences
- [calc] Under BroTown's rule the only levers are skill levels and the level gap; nothing the player *does in the moment* changes the odds. That is why it feels like a coin toss, and why overkill breaks it.
- A sound split for BroTown:
  - **Gates** (whether you may try): in range, slots free, a trap of high enough tier for the monster's level band, no boss.
  - **Modifiers** (the odds): trap tier against level as a multiplier, element match, the monster unaware or behind you, held or dazed, bait.
  - **Skill** (bounded): one timing input worth up to about ×2, or a channel that holds.
  - **Pity:** guaranteed progress over repeated attempts.
- Where skill truly beats dice:
  - **Deterministic once you execute:** Tame Beast, Monster Hunter, Black Desert.
  - **A large multiplier from execution:** GO, where execution beats the best ball.
  - **A meter you fill:** Cassette Beasts, Dragon Quest Monsters, Siralim.
  - For BroTown's server, deterministic channels and meters are the easiest to verify; timing inputs need server-clock judging.

### Gaps
- I found no published designer talk or GDC session that weighs gates against modifiers in capture design. The reasoning here is my synthesis.

## Failure design: item lost or kept, creature flees, enrages or heals, pity, partial rewards

### Takeaway
Failure costs come in five kinds:
- **The item:** Pokémon, GO, Palworld and BroTown consume it. Cassette Beasts keeps the tape.
- **The chance:** GO's flee roll, Pokémon's Safari Zone flight, Dragon Quest Monsters' anger.
- **Safety:** Path of Exile's beast enrages and heals.
- **Quality:** Ark's taming effectiveness drops.
- **Nothing, with pity:** WoW pet traps add 20–30% per failure.

The best fits for short sessions turn a failure into progress: pity, a consolation reward, or an item kept on failure.

### Cited Findings
- Pokémon ball attempts are counted per ball type in the battle results, and the Master Ball never fails [code] — [pokeemerald](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c)
- Pokémon GO rolls a flee check after failed throws using a species' base flee rate [summary] — [GamePress](https://pogo.gamepress.gg/catch-mechanics)
- In Pokémon's Safari Zone, getting closer raises the escape factor by +4 each time, and Pokéblocks lower it [code] — [battle_util.c](https://github.com/pret/pokeemerald/blob/master/src/battle_util.c)
- In Path of Exile's league, a failed net let the beast recover some life and Enrage, with a retry once the Enrage ended [summary] — [poewiki](https://poewiki.net/wiki/Path_of_Exile:_Bestiary)
- WoW pet traps gain +20%, +25% or +30% per failure, and you keep the pet only if you win the battle [summary] — [Wowhead](https://www.wowhead.com/pet-ability=135/pristine-trap), [WarcraftPets](https://www.warcraftpets.com/wow-pet-battles/)
- In Cassette Beasts, a failed recording does not damage the tape, and you can retry until you kill the target [summary] — [Cassette Beasts wiki](https://wiki.cassettebeasts.com/wiki/Recording)
- In Dragon Quest Monsters, a failure may anger the target and end scouting; food prevents it in Terry's Wonderland 3D [summary] — [Dragon Quest Wiki](https://dragon-quest.org/w/index.php?title=Monster_scouting&mobileaction=toggle_view_desktop)
- In Shin Megami Tensei V, a demon may leave, or forgive you if you have Pacification [summary] — [Megami Tensei wiki](https://megamitensei.fandom.com/wiki/Negotiation)
- In Ark, damage during a tame lowers its quality (taming effectiveness), not whether it succeeds [summary] — [ARK wiki](https://ark.wiki.gg/wiki/Taming)
- In Monster Hunter the risk is killing by accident, which turns a capture into a kill with different rewards; failing a capture quest that way is reported [summary] — [Steam](https://steamcommunity.com/app/582010/discussions/0/2244426186203384394)
- BroTown spends the trap only after validation and gives 5 trapping XP for a failure [code] — [pets.js](../../../server/src/pets.js)

### Inferences
- **WoW-style pity:** a per-player, per-monster (or per-species) counter, added on each failure. A guaranteed capture within a few tries fits a game limited to about 2 hours a day.
- **Path of Exile's enrage-and-heal:** a natural real-time cost that replaces "spend another trap at once". Add a short cooldown on re-trapping that monster.
- **Cassette Beasts' kept item:** combined with pity, it turns failure into progress, not loss. Keeping a broken-trap part, or getting part of a refund, softens the 20 g cost.
- **Dragon Quest Monsters' anger:** a "spooked" state after a failure, where bait resets the attempt, gives cooking a role.
- **WoW's "keep only if you win":** a captured pet could stay unbanked until you leave the zone, which suits PvP drops but punishes casual play. It needs the owner's call.

### Gaps
- No source I reached gives retention or churn data for capture-failure designs.

## Feedback design: shakes, sounds, slow motion, near-miss messages, visible percentages, and what suits one-thumb touch

### Takeaway
The proven feedback language for a capture is:
- **Anticipation** while you aim: GO's coloured ring that updates live, the % on the reticle in Palworld, Cassette Beasts and Dragon Quest Monsters.
- **Suspense:** 0–3 shakes or wiggles, each one a check passed.
- **A distinct resolution:** the click, or a special critical-capture animation.

Monster Hunter adds cues for *when* to try (limp, skull, a flat heart line). Showing honest odds is safe; inflated or hidden odds are a reputational risk. Research on near-misses says almost-wins raise the urge to retry only when the player felt in control, so use them carefully and honestly.

### Cited Findings
- Pokémon's ball animation receives the number of checks passed (0–3, or success) [code] — [pokeemerald](https://github.com/pret/pokeemerald/blob/master/src/battle_script_commands.c). A critical capture sets its own animation flag [code] — [pokeemerald-expansion](https://github.com/rh-hideout/pokeemerald-expansion/blob/master/src/battle_script_commands.c)
- GO's ring colour shows difficulty and updates live with a berry or ball. The bonus is greatest when the ring is smallest [summary] — [Switchblade Gaming](https://www.switchbladegaming.com/pokemon-go/target-ring-system/), [Twinfinite](https://twinfinite.net/ps4/pokemon-go-colored-ring/)
- Palworld shows a % on its capture reticle, but bent upward from the true rate [summary] — [r/Palworld datamine mirror](https://embedez.com/gallery/6a63d06e403c7d0b4b772a03), [Nexus mod](https://www.nexusmods.com/palworld/mods/5216)
- Cassette Beasts shows a live % meter over the target all through the turn [summary] — [Cassette Beasts wiki](https://wiki.cassettebeasts.com/wiki/Recording)
- Dragon Quest Monsters shows its scout % on screen [summary] — [Dragon Quest Wiki](https://dragon-quest.org/w/index.php?title=Monster_scouting&mobileaction=toggle_view_desktop)
- Monster Hunter's cues are the limp, the nest retreat, the skull icon and the flat heart line [summary] — [Steam](https://steamcommunity.com/app/582010/discussions/0/3335371283879396289/)
- **Near-miss research** (Clark et al., *Neuron* 61(3):481–490, 2009) [summary] — [ResearchGate](https://www.researchgate.net/publication/24010632_Gambling_Near-Misses_Enhance_Motivation_to_Gamble_and_Recruit_Win-Related_Brain_Circuitry):
  - Near-misses felt less pleasant than full misses but increased the desire to play, and only when the subject controlled the gamble.
  - They engaged reward circuitry (striatum, insula) that also responds to wins.

### Inferences
- **[calc] Palworld's two reports agree** if the reticle shows (R^(1/3))^1.25 = R^0.417: 0.1825^0.417 ≈ 0.49 and 0.2326^0.417 ≈ 0.545. That suggests the UI raises one per-check rate to the 1.25 power. It is my reconstruction, not confirmed.
- **What suits one thumb on a small iPhone screen:**
  1. Tap-to-throw at the locked target, the result played as 0–3 wobbles drawn in code.
  2. A coloured ring on the target, no number needed, re-coloured live when bait or a better trap is chosen.
  3. Hold-to-bind on the same button (a channel).
  4. At most one release-timing input, judged on the server's clock.
- **What does not suit it:** curve gestures while dodging, 10 seconds of mashing (Black Desert), button-sequence prompts (Nexomon), dialogue (Shin Megami Tensei).
- **Honest near-miss copy is fine** ("Almost! It broke free on the last shake") and it states real information. Never fake a near-miss, and never sell retries for money. Trap items stay gold-only under the supporter-pass rules.
- **Rendering:** wobbles, flashes and a slow-motion moment can be drawn in code (PixiJS) with no new textures, which suits the memory budget law in CLAUDE.md. Any new sound should be short, played as a sound effect rather than through the music path.
- **Not verified here:** I believe iOS Safari doesn't support `navigator.vibrate`. If so, haptic feedback is unavailable on the main platform and the feel must come from sound and screen.

### Gaps
- No primary source on the sound or slow-motion design of any capture moment, and no designer interview or GDC talk on capture "juice" was found.
- iOS vibration support is not verified.

## What players complain about: unfair luck, accidental kills, item cost, hidden or misleading odds

### Takeaway
Players complain about:
- odds that are hidden (GO) or misleading (Palworld's inflated %)
- accidental kills when HP is the gate (Monster Hunter)
- capture steps that interrupt the action-RPG loop (Path of Exile's nets, removed)
- low pure-luck rates with no agency (Ni no Kuni, Yo-kai Watch, MapleStory cards)
- negotiation randomness (Shin Megami Tensei)
- token skill inputs that can be mashed (Nexomon)
- flee rates (GO's Togetic)

I found no direct sources on item-cost complaints.

### Cited Findings
- Pokémon GO players called Niantic "shady" for hiding base capture and flee rates [summary] — [Dexerto](https://www.dexerto.com/pokemon/pokemon-go-players-call-niantic-shady-for-hiding-base-capture-flee-rates-2139501/)
- After complaints, Niantic fixed Togetic's flee rate [summary] — [IBTimes](https://www.ibtimes.com/pokemon-go-update-niantic-fixes-togetic-base-flee-rate-after-complaints-make-it-2494531)
- An r/Palworld datamine is titled "Why the UI percentage lies", and a mod exists to show the true rate [summary] — [mirror](https://embedez.com/gallery/6a63d06e403c7d0b4b772a03), [Nexus mod](https://www.nexusmods.com/palworld/mods/5216)
- Monster Hunter players describe accidental kills (a Stygian Zinogre, a Great Girros) and failed capture quests from overkilling with big weapons [summary] — [Steam MH:W](https://steamcommunity.com/app/582010/discussions/0/2244426186203384394)
- Path of Exile's nets were dropped from the core game; summaries describe them as unpopular [summary] — [PoE fandom wiki, Net](https://pathofexile.fandom.com/wiki/Net)
- Nexomon players note the prompt can be mashed [summary] — [Steam](https://steamcommunity.com/app/1196630/discussions/0/2916598577627003793/)
- On Ni no Kuni's befriending: "It's completely random, and don't listen to anyone that tells you otherwise" [summary] — [GameFAQs](https://gamefaqs.gamespot.com/boards/998014-ni-no-kuni-wrath-of-the-white-witch/65581785)
- Yo-kai Watch Blasters fans modded its 0.5–6% rates to a flat 8% [summary] — [X](https://x.com/Blastersplusmod/status/1840451478692982982)
- MapleStory: "Familiar card drop rate is insane" [summary] — [Nexon forum](https://forums.maplestory.nexon.net/discussion/comment/104595/)
- Shin Megami Tensei V: "Demon negotiations are garbage" [summary] — [GameFAQs](https://gamefaqs.gamespot.com/boards/204211-shin-megami-tensei-v/79779791)
- One Steam user's view: throwing an object is "simple enough that it isn't annoying to repeat hundreds if not thousands of times", while traps and befriending "are tedious and not very repeatable" [summary; a player's opinion] — [Steam Palworld discussion](https://steamcommunity.com/app/1623730/discussions/0/6660355377992883380/)

### Inferences
- BroTown should show honest odds, as a ring colour or a %, because a server-authoritative game cannot hide them from dataminers anyway. The formula is in a public repo.
- It should remove the accidental-kill failure state (capture on kill, an HP floor during capture, or a capture stance), and keep the capture inside the combat flow.
- It should add pity so a 2-hours-a-day player never loses a session to bad luck.

### Gaps
- I couldn't reach Reddit or Steam directly, so the sentiment rests on search summaries and thread titles. There are no complaint counts or survey data.
