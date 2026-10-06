# Trapping, hunting and taming as a progression skill: a comparative catalogue for BroTown

**How this was gathered (read first).** WebFetch was blocked by this session's egress proxy for every game wiki tried (oldschool.runescape.wiki, runescape.wiki, uoguide.com, stardewvalleywiki.com), and the shell has no outbound access. So no game wiki or forum page was read in full. Every external finding below comes from a WebSearch result digest (the search engine's summary of the result pages), cited to the page or pages that digest drew on. Read exact numbers as "as summarised from that page". Where two digests disagreed, the disagreement is flagged. The session's shared web-search budget ran out before the last seven queries, which are listed under Gaps. BroTown's own numbers come from the repo, not the brief.

**Provenance tags (added on the coordinator's request).** Every Cited Findings bullet ends with a tag that covers every number in it. Where a bullet's sources sit on a closing "Sources:" line, the tag there covers its sub-bullets and any table above it.
- **[source-read]**: read directly. That means BroTown's repo code (`server/src/pets.js`, `server/src/combat.js`, `server/src/shop.js`, CLAUDE.md), and three RuneLite plugin source files on GitHub. RuneLite is a third-party client, so its constants are the plugin authors' model of the game, not Jagex's code.
- **[search-summary]**: taken from a WebSearch result digest of the cited page. The page itself was not opened.
- **[memory — unverified]**: my own recollection, unconfirmed. It appears only under Gaps.

**BroTown baseline used in the "BroTown:" lines (from code).** To capture, the monster must be at or below 20% HP and within 200 px, the player needs a free pet slot (max 6) and one `basic_trap` (20 g in the shop). The trap is **spent on the attempt, success or fail**. Chance = 0.40 + 0.005 × trapping level + 0.002 × woodcutting level − 0.05 × (monster level − player level), clamped to 0.10–0.95. Trapping XP is 15 + 2 × monster level on success and 5 on failure. A capture removes the monster **for everyone**, with no loot, XP or kill credit, and there is **no check of who damaged it** — [server/src/pets.js L41-65, L132-199](../../server/src/pets.js); [server/src/shop.js L138](../../server/src/shop.js). [source-read]

**Owner update (2026-10-06): the weaken-to-20% capture was an early demo and breaks once a player can one-hit monsters.** §10 answers the follow-up: which capture mechanics never read the creature's HP, a one-hit verdict for each, and how to keep trapping a skill of its own that high-level players cannot trivialise. The per-mechanic "BroTown:" lines in §1–§9 still apply.

---

## 1. RuneScape Hunter (OSRS and RS3): trap types, trap limits, collapse, bait, tracking, rumours, pets, Summoning, and what a higher level actually improves

### Takeaway
In OSRS, Hunter level matters in about seven ways at once:
- more traps at a time (2 → 5, plus 1 in the Wilderness);
- a catch chance per creature that rises roughly in a straight line from its unlock level to 99 (red chinchompas about 45% → 89%);
- new creatures and trap types every few levels;
- more XP per catch on some activities;
- rumour tiers at 46/57/72/91;
- catching barehanded 10 levels above the net requirement;
- a tiny improvement to pet odds.

Catches also feed other skills: furs go into RS3 Summoning pouches, jerboa tails become bolas or fox bait, and Herbiboar gives herbs.

### Cited Findings
**Trap limits**
- Outside the Wilderness the maximum number of traps at once is 2 at level 1, 3 at 40, 4 at 60 and 5 at 80. In the Wilderness you get one extra (3/4/5/6). Boosting just before 40/60/80 gives the extra trap early — [OSRS Wiki: Hunter training](https://oldschool.runescape.wiki/w/Hunter_training); [OSRS Toolkit Hunter guide](https://osrstoolkit.com/guides/hunter/) [search-summary]

**Catch chance by level (the core of "what a higher level improves")**
- Grey chinchompa (box trap, unlocks at 53): P(L) = (⌊262×(L−1)/98⌋ + 6) / 255. That is 6/255 at level 1 and 268/255 at 99, which is capped to a sure catch — [OSRS Wiki: Chinchompa (Hunter)](https://oldschool.runescape.wiki/w/Chinchompa_(Hunter)) [search-summary]
- Red (carnivorous) chinchompa (unlocks at 63): P(L) = (⌊306×(L−1)/98⌋ − 78) / 255. About 115/255 at 63 and 228/255 at 99 — [OSRS Wiki: Carnivorous chinchompa](https://oldschool.runescape.wiki/w/Carnivorous_chinchompa) [search-summary]
- Black chinchompa (unlocks at 73): 148/255 at 73 and 228/255 at 99 — [OSRS Wiki: Black chinchompa (Hunter)](https://oldschool.runescape.wiki/w/Black_chinchompa_(Hunter)) [search-summary]

**Level gates per creature, and trap types**
- Ferret 27 (box trap), swamp lizard 29 (net trap), barb-tailed kebbit 33, prickly kebbit 37 and sabre-toothed kebbit 51 (deadfalls), grey chinchompa 53, red 63, black 73 (box traps). A bird snare catch gives 34 XP — [OSRS Wiki: Hunter creatures](https://oldschool.runescape.wiki/w/Hunter_creatures); [Altar of Gaming OSRS Hunter guide](https://altarofgaming.com/osrs-hunter-guide/) [search-summary]
- Varlamore (2024) added:
  - Sunlight moth (65) and Moonlight moth (75), caught with a net and jar or barehanded. Each buffs up to three random players within a 3×3 area: stats and 8 HP for the Sunlight moth, Prayer for the Moonlight moth.
  - Sunlight antelope (72) and Moonlight antelope (91), caught in pitfalls for meat and horns.
  - Jerboa, caught in a box trap. Its tails become bolas or bait for foxes.
  - Fennec fox (57, the pre-release newspost's name), caught in a baited deadfall for fur, meat and bones.

  Sources: [Jagex newspost: The Hunter Guild – Varlamore](https://secure.runescape.com/m=news/a=903/the-hunter-guild---varlamore?oldschool=1); [OSRS Wiki: Varlamore Part One overview](https://oldschool.runescape.wiki/w/Update:Varlamore:_Part_One_-_Overview) [search-summary]

**Implings (butterfly net and jars)**
- You need a butterfly net and impling jars. Inside Puro-Puro, implings can only be caught while you carry empty jars. The Elnock Inquisitor gives a starter kit of 1 net, 7 jars and an impling scroll — [OSRS Wiki: Impetuous Impulses](https://oldschool.runescape.wiki/w/Impetuous_Impulses); [OSRS Wiki: Butterfly net](https://oldschool.runescape.wiki/w/Butterfly_net) [search-summary]
- Baby impling: Hunter 17 with a net, 27 barehanded. Young impling: 22 with a net, 32 barehanded. The magic butterfly net raises the capture chance by about 7.8% — [OSRS Wiki: Baby impling](https://oldschool.runescape.wiki/w/Baby_impling); [OSRS Wiki: Magic butterfly net](https://oldschool.runescape.wiki/w/Magic_butterfly_net) [search-summary]

**Tracking: Herbiboar**
- Requirements: 80 Hunter, 31 Herblore and the quest Bone Voyage (Fossil Island).
- You start at the Hunter icon on the minimap. You inspect rocks, mushrooms, seaweed and mud for tracks until a tunnel holding the herbiboar is revealed.
- XP: 50 per inspection. The catch gives 1,950 at level 80, +30 per level up to 94, +15 at 95, and +19 per level from 96 to 99.
- Herbs: 1–3 per harvest (2–4 with magic secateurs), and 25 Herblore XP for each herb after the first.

Sources: [OSRS Wiki: Herbiboar](https://oldschool.runescape.wiki/w/Herbiboar); [OSRS Wiki: Hunting herbiboars](https://oldschool.runescape.wiki/w/Money_making_guide/Hunting_herbiboars) [search-summary]

**Passive trapping: bird houses (more in §7)**
- A bird house is baited with up to 10 hop seeds (5 if wildblood). Seed quality does not change the result. It traps up to 10 birds in about 50 minutes. A full basic bird house gives 280 XP and bird nests when you take it apart. The timer runs on server time, including while you are logged out — [OSRS Wiki: Bird house (item)](https://oldschool.runescape.wiki/w/Bird_house_(item)); [osrsguru birdhouse guide](https://osrsguru.com/guides/osrs-birdhouse-runs-guide-2026.html); [VirtGold birdhouse guide](https://virtgold.com/blog/osrs-birdhouse-run-guide/) [search-summary]
- RuneLite's time-tracking plugin confirms this:
  - `BIRD_HOUSE_DURATION = Duration.ofMinutes(50)`, described as "the average time to harvest 10 birds";
  - completion is measured against wall-clock epoch time, so it runs while you are logged out;
  - it tracks exactly **4 bird house spaces**: Mushroom Meadow (North and South) and Verdant Valley (Northeast and Southwest);
  - a code comment says players "would generally have 3 or 4 bird houses built at any time".
  Sources: [RuneLite source: BirdHouseTracker.java](https://github.com/runelite/runelite/blob/master/runelite-client/src/main/java/net/runelite/client/plugins/timetracking/hunter/BirdHouseTracker.java); [RuneLite source: BirdHouseSpace.java](https://github.com/runelite/runelite/blob/master/runelite-client/src/main/java/net/runelite/client/plugins/timetracking/hunter/BirdHouseSpace.java) [source-read]

**Collapse and timeouts**
- A box trap collapses after a while and has to be picked up or laid again. A trap that has stood too long falls over and becomes an ordinary ground item. Guides advise carrying 10–15 spare box traps, because other players can take fallen ones — [OSRS Wiki: Box trap](https://oldschool.runescape.wiki/w/Box_trap); [OSRS Wiki: Net trap](https://oldschool.runescape.wiki/w/Net_trap); [osrsbestinslot Hunter guide](https://www.osrsbestinslot.com/osrs-hunter-guide/) [search-summary]
- RuneLite's Hunter plugin models a laid trap as staying up **1 minute** before it collapses (`TRAP_TIME = Duration.ofMinutes(1)`, with the comment "A hunter trap stays up 1 minute before collapsing"). It tracks trap states OPEN, EMPTY, FULL ("a trap that caught something"), TRANSITION and NOT_PLACED — [RuneLite source: HunterTrap.java](https://github.com/runelite/runelite/blob/master/runelite-client/src/main/java/net/runelite/client/plugins/hunter/HunterTrap.java) [source-read]
- When a chinchompa comes out, it either walks into a trap or dismantles at least one trap and hops away — [OSRS Wiki (fandom mirror): Chinchompa (Hunter)](https://oldschoolrunescape.fandom.com/wiki/Chinchompa_(Hunter)) [search-summary]

**Bait**
- Box traps can be baited or smoked to raise success. Chinchompas prefer spicy tomato, carnivorous chinchompas spicy minced meat, and ferrets need no bait. The right bait adds +3% to the catch rate and is used up on each success. RuneHQ mixes game eras, so it is unclear whether this is OSRS or RS3 — [RuneHQ: Box trap](https://www.runehq.com/item/box-trap); [RuneScape Wiki: Box trap](https://runescape.wiki/w/Box_trap) [search-summary]

**Hunters' Rumours and the Hunter Guild (2024)**
- Shipped with Varlamore: Part One. RuneLite's matching release is dated 21 March 2024 — [OSRS Wiki: Varlamore Part One overview](https://oldschool.runescape.wiki/w/Update:Varlamore:_Part_One_-_Overview); [RuneLite 1.10.25 release](https://runelite.net/blog/show/2024-03-21-1.10.25-Release/) [search-summary]
- Four tiers, each with an unboostable level requirement: Novice 46 (Huntmaster Gilman), Adept 57 (Cervus or Ornus), Expert 72 (Aco or Teco), Master 91 (Wolf; also needs the quest At First Light) — [OSRS Wiki: Hunters' Rumours](https://oldschool.runescape.wiki/w/Hunters%27_Rumours); [OSRS Wiki: Guild Hunter Wolf (Master)](https://oldschool.runescape.wiki/w/Guild_Hunter_Wolf_(Master)) [search-summary]
- A rumour names a creature. You hunt it until a rare part drops ("You find a rare piece of the creature!") and hand the part in. Jagex's stated target was about 8–10 minutes per rumour — [OSRS Wiki: Hunters' Rumours](https://oldschool.runescape.wiki/w/Hunters%27_Rumours); [Jagex newspost](https://secure.runescape.com/m=news/a=903/the-hunter-guild---varlamore?oldschool=1) [search-summary]
- Rewards are Hunter XP plus a hunters' loot sack graded by tier (hunter meats, logs, herbs), with rare uniques: the guild hunter outfit, huntsman's kit, quetzal whistle and quetzal feed. The update also added a hunter's spear, a Sunlight hunter's crossbow and sacks for meat and fur — [OSRS Wiki: Hunters' Rumours](https://oldschool.runescape.wiki/w/Hunters%27_Rumours); [Jagex newspost](https://secure.runescape.com/m=news/a=903/the-hunter-guild---varlamore?oldschool=1) [search-summary]

**Rare skilling pet**
- Baby chinchompa: 1 in (B − 25 × Hunter level), where B = 131,395 for grey, 98,373 for red and 82,758 for black. At level 99 that is 1/128,920, 1/95,898 and 1/80,283 — [OSRS Wiki: Baby chinchompa](https://oldschool.runescape.wiki/w/Baby_chinchompa) [search-summary]

**RS3: Summoning from catches, Big Game Hunter, and the dinosaur ranch**
- Spirit larupia pouch = 1 pouch + 155 spirit shards + 1 blue charm + 1 larupia fur, at 57 Summoning. Graahk and kyatt pouches use their own furs the same way. Larupia need 31 Hunter. The digest says all three pouches need 57 Summoning, which I could not confirm for graahk or kyatt — [RuneScape Wiki: Larupia fur](https://runescape.wiki/w/Larupia_fur); [RuneScape Wiki: Graahk fur](https://runescape.wiki/w/Graahk_fur); [RS fandom: Spirit larupia pouch](https://runescape.fandom.com/wiki/Spirit_larupia_pouch(u)) [search-summary]
- Big Game Hunter (Anachronia):
  - Requirements: 75 Hunter and 55 Slayer. It is non-combat and single-player.
  - 9 dinosaurs, each with its own clearing and its own bait. You build a bait pad and bait it to lure the dinosaur.
  - Each dinosaur shows a coloured detection circle on the ground. The minimap copy is unreliable.
  - Once the counter reaches 5–6, that species hides for an hour unless you use a dinosaur lure.

  Sources: [RuneScape Wiki: Anachronia Big Game Hunter](https://runescape.wiki/w/Anachronia_Big_Game_Hunter); [RuneScape Wiki: BGH strategies](https://runescape.wiki/w/Anachronia_Big_Game_Hunter/Strategies) [search-summary]
- Ranch Out of Time (a Farming activity, not Hunter):
  - Five growth stages: egg, child, adolescent, adult, elder.
  - Egg to elder takes 68 h for a jadinko and 80 h for a salamander. A pavosaurus rex takes about 11 days, plus a 23.33 h breeding cycle.
  - If you miss collecting a stage, you still get it at the next one.

  Sources: [RuneScape Wiki: Anachronia Dinosaur Farm](https://runescape.wiki/w/Anachronia_Dinosaur_Farm); [RuneHQ: Ranch Out of Time](https://www.runehq.com/special/ranch-out-of-time) [search-summary]

### Inferences
- **Worked out from the cited formulas:** [search-summary formulas; my arithmetic]
  - Grey chinchompas: about 57% at 53, 75% at 70, and a sure catch from about 95.
  - Red chinchompas: about 45% at 63, 66% at 80 and 89% at 99, so roughly +1.2 points per level.
  - Herbiboar XP reaches about 2,461 at 99.
  - Pet odds barely move with level: grey is 1/130,070 at 53 against 1/128,920 at 99, under 1% better.
  - So OSRS rewards a higher level mainly through **traps at a time × catch chance × access to new creatures**. Pet odds are flavour.
- **Compared with BroTown:** BroTown gives a flat +0.5 points per trapping level for every monster (+20 points at trapping 40). OSRS gives each creature its own curve that starts at 45–57% at its unlock level. [source-read for BroTown; search-summary for OSRS]
- BroTown, one line per mechanic:
  - **Traps at a time by level** → placed traps with a cap per player that grows on the life skills' 5-level steps (for example 2/3/4/5 at trapping 1/10/20/30), plus **1 extra inside No man's land** as the risk bonus. This is the direct counterpart of OSRS's Wilderness +1.
  - **A catch curve per creature** → each land tier gets its own curve, starting near 45–55% at its trapping unlock (steps like `GATHER_REQ_LVL`) and reaching about 90% some 35 levels later. That replaces one flat +0.5%/level. Woodcutting's "better trap materials" bonus would become a crafted trap-tier bonus.
  - **A collapsed trap becomes loot for others** → since the server owns all state, a trap that times out should go back to its owner's bag (or arrive by mail), not drop as loot. The exception could be No man's land, where losing it fits the risk.
  - **Bait worth +3%** → too small to give cooking or farming a reason to care. §6 has bait that decides *which* creature comes.
  - **Rumours (8–10 minutes, tiered, paid in a loot sack)** → a "trapping contract" board in town (Sheriff's Office or Guild Hall), tiered at trapping 5/10/15/20. It suits phone sessions and the 2 h/day cap.
  - **The Herbiboar trail** → tap 5–8 glowing tracks in a land, then a stun gesture, then a harvest gesture. It reuses the gathering gesture minigame and plays with one thumb.
  - **Implings with a net and jar, barehanded 10 levels later** → critters that roam each land, caught with a net gesture into a crafted jar. "Barehanded 10 levels later" is a cheap level reward that players can see.
  - **Baby chinchompa** → a rare cosmetic pet from checking traps, with the odds shown and nudged by level. It is earned luck from play, so it fits the no-loot-box rule.
  - **RS3 Summoning pouches made from furs** → catches (fur, tail, horn) become inputs to other skills, for example fur + bar at the forge makes a pet collar. That creates trade on the market.
  - **Big Game Hunter** → one big creature per land with a **visible detection ring** (a tell that reads on a phone), a bait pad, and an hourly cooldown after 5–6 hunts. The cooldown also puts a built-in ceiling on bots.
  - **The ranch** → captured creatures can be raised on the farm over hours or days, and a missed stage is collected at the next check.
  - **A code observation for the audit:** trapping XP only comes from capture attempts, and `_handlePetCapture` refuses with `slots-full` at 6 pets before any XP is given. A grep found no release path on the server. `PetHousePanel.jsx` removes pets in an evolve flow, but only on the client. So the trapping skill probably stops gaining XP at 6 captures. The audit should confirm this — [server/src/pets.js L150](../../server/src/pets.js); [src/ui/panels/PetHousePanel.jsx L378](../../src/ui/panels/PetHousePanel.jsx) [source-read]

### Gaps
- Jagex's own figure for how long a laid trap stays up was not found. RuneLite models it as 1 minute (see Collapse and timeouts); whether that differs by trap type is not known.
- Older guides as I remember them gave 1 trap at levels 1–19 and the second at 20. Today's digest says 2 at level 1. I could not verify when, or whether, this changed. [memory — unverified]
- The log and level requirement for each bird house tier was cut off by the search budget. (The count, 4 spaces, is now confirmed from RuneLite's source.)
- Whether the +3% box-trap bait applies in OSRS or only RS3 (the RuneHQ digest is unclear).
- Also cut off by the budget: RS3's own trap limits and catch formulas, the Hunter Guild's facilities, and how much PK risk there is at black chinchompas in the Wilderness.
- The Summoning levels for graahk and kyatt pouches.

---

## 2. Ultima Online: Animal Taming, Animal Lore, Veterinary

### Takeaway
UO uses a **budget** rather than a count:
- every player has 5 control slots, and each pet costs 1–5 slots depending on its power;
- each creature has a hard skill gate (dragon 93.9 up to greater dragon 104.7);
- after a week of ownership a pet **bonds** and becomes permanent: when it dies it becomes a ghost that can be raised with 80 Animal Lore and 80 Veterinary, or by an NPC vet for a fee;
- feeding keeps loyalty up;
- an owner cap makes a released pet harder for each new owner.

That same design shaped how people macroed the skill.

### Cited Findings
- Every player has 5 control (follower) slots, and a pet's cost depends on its power:
  - 1 slot: horse, llama, ostard, beetles, lesser hiryu.
  - 2 slots: nightmare, unicorn, ki-rin, drake, imp, raptor.
  - 3 slots: golem, hiryu, cu sidhe, reptalon.
  - 4 slots: dragon, rune beetle, white wyrm, dread warhorse.
  - 5 slots: greater dragon, dragon turtle, shadow wyrm, frost dragon.

  Source: [uo.com: Pet Ownership](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/pets-ownership/) [search-summary]
- Stable (storage) slots grow with skill. As digested, the page gives 8/10/12 slots at 100 Taming/Lore/Vet, 11/13/15 at 110 and 14/16/18 at 120, and the Taming mastery "Boarding" raises the total to 21 at 120 Taming. The digest garbled how the table works; see Gaps — [uo.com: Pet Ownership](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/pets-ownership/) [search-summary]
- Minimum Taming skill: dragon 93.9, white wyrm 96.3, cu sidhe 101.1, greater dragon 104.7 — [UOGuide: Greater Dragon](https://www.uoguide.com/Greater_Dragon); [UO-CAH taming chart](https://www.uo-cah.com/animal-taming-chart); [UOEx: Taming Difficulty Table](https://www.uoex.net/wiki/Taming_Difficulty_Table) [search-summary]
- Bonding: feed the pet at once, keep it for a week, then feed it again to get "your pet has bonded with you", and its tag changes from "tame" to "bonded" — [uo.com: Pet Ownership](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/pets-ownership/); [UOGuide: Pet Bonding](https://www.uoguide.com/Pet_Bonding) [search-summary]
- Loyalty:
  - feeding raises loyalty straight to its maximum, while ignored commands lower it;
  - bonded pets (other than pack animals) **no longer go wild**; they just stop obeying until fed;
  - pack animals still go wild, and their pack contents fall to the ground and decay.

  Sources: [uo.com: Pet Ownership](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/pets-ownership/); [uo.com: A Guide To pack animals](https://uo.com/wiki/ultima-online-wiki/gameplay/a-guide-to-pack-animals/) [search-summary]
- Death:
  - a bonded pet becomes a ghost that still takes non-combat commands;
  - raising it needs **80.0 Animal Lore and 80.0 Veterinary**, standing next to it;
  - the pet loses 0.1 from each of its skills;
  - NPC veterinarians at stables raise pets for a fee.

  Sources: [uo.com: Veterinary](https://uo.com/wiki/ultima-online-wiki/skills/veterinary/); [UOGuide: Veterinary](https://www.uoguide.com/Veterinary) [search-summary]
- Taming again:
  - releasing a pet raises the minimum skill for the next tamer;
  - a creature can have **at most 5 owners**, or fewer if its difficulty would pass 120.0;
  - a previous owner always retames it at difficulty 0;
  - **transferring** a pet, rather than releasing it, has no owner cap.

  Sources: [uo.com: Pet Ownership](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/pets-ownership/); [uo.com: Tameable Creatures](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/tameable-creatures/) [search-summary]
- Skill gain and macros:
  - taming and releasing the same creature gives no skill, failures give none, and players aim for creatures at about 50% success;
  - players run Razor, EasyUO and ClassicUO scripts for "mostly-AFK" taming;
  - some free shards ban moving tames elsewhere to release them, because it enables AFK macroing.

  Sources: [UO Outlands forum guide](https://forums.uooutlands.com/index.php?threads/guide-and-script-animal-taming-afk-skill-gain-in-classicuo.3453/); [UO Renaissance forum guide](https://uorforum.com/threads/the-mostly-afk-guide-to-training-animal-taming.38138/); [uoforum macro thread](https://www.uoforum.com/threads/must-have-tamers-non-afk-skill-gain-macro.68277/) [search-summary]

### Inferences
- **Control slots** → BroTown: replace "6 pets of any kind" with a **slot budget**. A tier-1 land creature costs 1 slot and a tier-8 one costs 3–5. Captures wait in a **stable** (a farm building) apart from the companion slot, so collecting never blocks trapping XP.
- **Stable slots grow with skill** → stable space grows on trapping's 5-level steps: a level reward that gives no combat power.
- **A skill gate per creature** → gate captures by trapping level per tier, matching `GATHER_REQ_LVL` (1/5/10/15/20). Today the only gate is the 5%-per-level penalty against the *player's combat* level. Show a grey "locked" mark over the monster, as the resource node labels already do.
- **Bonding** → after 7 calendar days of ownership (kinder to 2 h/day players than counting online time), a pet bonds. A bonded pet cannot be lost in a No man's land death and gains a cosmetic.
- **Loyalty decay and going wild** → avoid decay that punishes you. A short-session player coming back to a lost pet is a reason to quit. Make feeding (with cooked food) an optional buff, not upkeep.
- **Ghost and vet** → pets get "knocked out" rather than killed, and the town vet revives them for gold, which drains gold from the economy.
- **Owner cap versus transfer** → if pets become tradable, record how many owners each has had and where it came from (the ledger already keeps provenance rows), and cap repeated trades or releases so pets cannot be laundered.
- **No skill from tame-and-release** → trapping XP must not be farmable by catch → release → catch again. Give less XP for repeated captures of the same type within a short window.

### Gaps
- UO's taming success formula, how many attempts a tame takes, and whether creatures turn hostile after a failure were not found.
- The 2017–18 pet-training revamp and its effect on control slots: the query was cut by the search budget.
- The digest garbled the stable-slot table's exact rules (base slots plus per-skill increments).

---

## 3. Survival and life-sim games: Ark, Valheim, Minecraft, Don't Starve, Stardew Valley crab pots, Animal Crossing

### Takeaway
These games supply a toolkit of capture ideas:
- **Ark:** knock out, then feed; the tame's quality drops with damage; traps that hold a creature; taming pens; rules about who owns a tame.
- **Valheim:** feed it and wait about 30 minutes while staying nearby.
- **Minecraft:** clear odds per item.
- **Don't Starve:** bait is used up only on success, and a special trap per kind of creature.
- **Stardew:** a passive trap checked daily, with bait and with professions that remove the need for bait or the junk.
- **Animal Crossing:** a physical sneaking skill instead of a number.

### Cited Findings
**Ark**
- To tame by knockout you make the creature unconscious, keep its torpor up with narcoberries or narcotics, and feed it. A narcotic adds 40 torpor over 16 s. A narcoberry adds 8 over 3 s per the wiki, but 7.5 per one guide. Narcotics do not reduce taming effectiveness — [Ark Wiki: Taming](https://ark.fandom.com/wiki/Taming); [Ark Wiki: Narcotic](https://ark.fandom.com/wiki/Narcotic); the berry value is contradicted by [GuildOrder taming guide](https://guildorder.com/games/ark/wiki/taming-guide) [search-summary]
- Taming effectiveness (TE) starts at 100% and drops with every food the creature eats and every point of torpor damage. At 100% TE the creature gains bonus levels equal to 50% of its wild level — [Ark Wiki: Taming](https://ark.fandom.com/wiki/Taming); [GuildOrder taming guide](https://guildorder.com/games/ark/wiki/taming-guide) [search-summary]
- Preferred kibble gives 80 food, 5× taming speed and maximum TE. Narcoberries fill hunger, which slows taming; narcotics reduce it — [GuildOrder taming guide](https://guildorder.com/games/ark/wiki/taming-guide); [Ark Wiki: Taming](https://ark.fandom.com/wiki/Taming) [search-summary]
- Ways to hold a creature still:
  - a bear trap holds wild creatures for "mere seconds";
  - a bola holds smaller carnivores for about 30 s;
  - larger creatures need **taming pens**, such as an Argentavis pen with a bear trap in the middle, or a Quetzal dropping a creature into a pen.

  These sources are player forums and a calculator site, so confidence is lower: [Steam: bear trap duration](https://steamcommunity.com/app/346110/discussions/0/351659808490256700/); [Steam: bear traps & taming](https://steamcommunity.com/app/346110/discussions/0/405694115203781334/); [wikily: Dire Bear](https://wikily.gg/ark-survival-ascended/dinosaurs/dire-bear/taming-calculator/) [search-summary]
- Who owns a tame:
  - the first food fed binds the tame to that survivor or tribe;
  - on PvE servers the last player or tribe to hit it has exclusive taming rights;
  - if it wakes up, it is "fair game" again.

  Sources: [Ark Wiki: Taming](https://ark.fandom.com/wiki/Taming); [survivetheark forum](https://survivetheark.com/index.php?%2Fforums%2Ftopic%2F33302-pve-taming-dinos%2F=) [search-summary]

**Valheim**
- Boar, wolf, lox, asksvin and moose each take about 30 minutes to tame — [PlayerEcho](https://playerecho.com/valheim/taming-guide) [search-summary]
- Taming only progresses while the animal is **fed, not alerted, and within about 64 m of a player**. An uninterrupted tame costs 3 food. Starred wolves only eat at night and take longer — [PlayerEcho](https://playerecho.com/valheim/taming-guide); [Metabot](https://metabot.gg/en/valheim/taming); [Altar of Gaming](https://altarofgaming.com/valheim-animal-taming-breeding-capturing-guide/) [search-summary]
- Boars eat raspberries, blueberries, red mushrooms, carrots, turnips and onions. Lox eat cloudberries, flax or barley. Two tame lox that are fed produce a calf — [Game8](https://game8.co/games/Valheim/archives/320283); [Altar of Gaming](https://altarofgaming.com/valheim-animal-taming-breeding-capturing-guide/) [search-summary]

**Minecraft**
- Each bone has a 1/3 chance to tame a wolf, and each raw cod or salmon a 1/3 chance to tame a cat. Each seed has a 1/10 chance to tame a parrot, and parrots cannot be bred — [XGamingServer](https://xgamingserver.com/blog/minecraft-animal-taming-guide/) [search-summary]

**Don't Starve**
- A trap springs when a creature of the right size moves nearby. Bait (for example a carrot for rabbits) is used up **only on a successful catch** — [Don't Starve Wiki: Trap](https://dontstarve.wiki.gg/wiki/Trap) [search-summary]
- The Bird Trap is made from 3 twigs and 4 silk and needs a Science Machine. Seeds greatly raise its chance. Birds land on an ordinary trap baited with seeds but are not caught by it — [Don't Starve Wiki: Bird Trap](https://dontstarve.wiki.gg/wiki/Bird_Trap) [search-summary]

**Stardew Valley crab pots**
- Crab pots are framed as daily passive income — [StardewHub crab pot guide](https://stardewhub.com/en/guides/stardew-valley-crab-pot-guide) [search-summary]
- The trash chance is 38% with Bait, Magnet, Magic Bait or Challenge Bait, or with no bait under Luremaster. Luremaster means no bait is needed. Mariner means no trash. Deluxe Bait and Wild Bait cut trash from 38% to 30% — [Stardew Wiki: Crab Pot](https://stardewvalleywiki.com/Crab_Pot) [search-summary]
- Version 1.6 added Targeted Bait, made in the **Bait Maker**:
  - the Bait Maker unlocks at Fishing 6 and costs 3 iron bars, 3 coral and 1 sea urchin;
  - it turns any fish into 5–10 Targeted Bait in 10 minutes;
  - in crab pots (not with Mariner), it makes lobster 4× as likely, clam, crab and oyster 3×, and every other catch 2×.

  Sources: [Stardew Wiki: Targeted Bait](https://stardewvalleywiki.com/Targeted_Bait); [Stardew Wiki: Bait Maker](https://wiki.stardewvalley.net/Bait_Maker) [search-summary]

**Animal Crossing: New Horizons**
- Holding A makes you walk slowly however far the stick is tilted. Letting go swings the net. Running near most bugs or missing them scares them off, and rare bugs flee more readily — [Game8](https://game8.co/games/Animal-Crossing-New-Horizons/archives/284779); [GameSpot](https://www.gamespot.com/articles/animal-crossing-new-horizons-bugs-guide-how-to-cat/1100-6475001/) [search-summary]

### Inferences
- **Ark's taming effectiveness** → BroTown: give a capture a **quality** as well as pass or fail. A clean weakening (few overkill chip hits) and better bait give better pet stats, so the fight before the capture becomes a skill.
- **Ark kibble from eggs and cooking** → bait cooked from farm produce plus monster drops, which links cooking to trapping. See §6.
- **Bola and bear trap** → craftable consumables that root a monster (a snare about 1.5 s, a bola about 3 s), so the ≤20% HP window can be caught on a phone. The worker already has a hold status, the flora "hold in place" of 0.7 s on players (`server/src/monsterstatus.js`), and a monster-side root could reuse that machinery — [CLAUDE.md, v2.3.2996 clause](../../CLAUDE.md) [source-read]
- **Ark's PvE rule that the last hitter owns the tame** → BroTown has **no tag check**: any bystander within 200 px can trap a monster you brought to 20%. The worker already tracks who hurt a monster (`m.dmgByPlayer`, used for provoked pursuit), so captures could be limited to recent damagers or their party — [server/src/pets.js L132-161](../../server/src/pets.js); [CLAUDE.md, v2.3.3056 clause](../../CLAUDE.md) [source-read]
- **Valheim's "player within 64 m"** → a "taming pen" on the farm whose 30 minutes run on the **server clock while you are offline**. Thirty minutes of required presence is a quarter of a free player's 2 h day.
- **Minecraft's odds per item** → show the chance before the throw. The server already returns `chance` in `pet_capture_result`.
- **Don't Starve's bait used only on success** → today a failed BroTown attempt burns the 20 g trap. Instead, make the trap a durable crafted tool with a number of uses, and spend only bait, only on success.
- **Stardew crab pots and professions** → passive water traps checked once a day, with milestone perks to choose at trapping 10 and 20 ("no bait needed" or "no junk"). The Bait Maker suggests refining fish or crops into bait that **targets** a catch.
- **Animal Crossing's sneaking** → a half-tilt "sneak" on the existing left joystick for netting critters. Skittish critters flee from a full-tilt approach, which gives touch controls a physical skill.

### Gaps
- Don't Starve trap durability (uses) and how the birdcage turns food into eggs: not verified (search budget).
- Who may collect from a crab pot in Stardew multiplayer: not found.
- What a Valheim tame does when no player is in range: only inferred from the rule about range.

---

## 4. Raising and breeding mounts and livestock: Black Desert, Albion Online (and RS3's ranch)

### Takeaway
Both MMOs turn a single capture into a long chain of play:
- **Black Desert:** a wild horse (lasso plus sugar) is the starting point of a breeding ladder up to tier 8, driven by Training mastery and the parents' levels.
- **Albion:** every mount starts as a baby raised on a farm island, fed every 22 hours with crops from Farming. Albion also sells halved growth time through Premium.

### Cited Findings
- **Black Desert taming:** after you lasso a wild horse you feed it Lumps of Raw Sugar. More lumps raise the chance, up to a limit, and 4–5 is the practical sweet spot — [Altar of Gaming BDO horse guide](https://altarofgaming.com/black-desert-online-horse-taming-training-breeding-exchanging-guide/) [search-summary]
- **Black Desert wild tiers:** most wild horses are tier 6, with an occasional tier 7 or 8. Drieghan has notably better tier-7 odds — [Altar of Gaming BDO horse guide](https://altarofgaming.com/black-desert-online-horse-taming-training-breeding-exchanging-guide/); [Pearl Abyss Adventurer's Guide: Taming](https://blackdesert.pearlabyss.com/Asia/en-US/Game/Wiki?_masterWikiNo=61) [search-summary]
- **Black Desert breeding:** tier 8 is the highest tier breeding can produce. With 1,500 Training mastery and two tier-8 parents whose levels add up to 48, a tier-8 foal is 100% certain. Higher parent levels raise the odds, and an in-game Breed Calculator shows them — [GrumpyGreen: BDO horse breeding](https://grumpygreen.cricket/bdo-horse-breeding/); [BDFoundry: Horse breeding](https://www.blackdesertfoundry.com/horse-breeding/) [search-summary]
- **Black Desert AFK training:**
  - Alt + right-click sets a looping auto-path, and the horse rides it for as long as your carrots last, gaining XP and skills (you gain Training XP).
  - Players minimise the game to the tray, and safe zones such as Termian Beach are popular spots.
  - Sources: [BDFoundry: Training guide](https://www.blackdesertfoundry.com/training-guide/); [Steam guide: Horse training](https://steamcommunity.com/sharedfiles/filedetails/?id=2475947322) [search-summary]
- **Albion feeding:** livestock on a pasture must be fed before it grows. Each feed is 18 crops or herbs, or 9 of its favourite food, and the production period is 22 h — [Albion Wiki: Livestock](https://wiki.albiononline.com/wiki/Livestock); [Albion Online farming guide](https://albiononline.com/news/guide-farming) [search-summary]
- **Albion growth time:** baby chickens grow in 44 h, halved by Premium. The livestock growth cycle is "1 day 20 hours", also halved with Premium — [Albion Wiki: Baby Chickens](https://wiki.albiononline.com/wiki/Baby_Chickens); [Albion Wiki: Livestock](https://wiki.albiononline.com/wiki/Livestock) [search-summary]
- **Albion buildings:** horses, oxen, stags and moose are raised on a Pasture, and every other riding animal needs a Kennel. "Use your farm to raise baby animals to become the mounts" — [Albion Wiki: Livestock](https://wiki.albiononline.com/wiki/Livestock); [Albion Online farming guide](https://albiononline.com/news/guide-farming) [search-summary]
- RS3's dinosaur ranch (growth stages and timings) is covered in §1.

### Inferences
- **Black Desert's lasso and sugar** → BroTown: "more bait raises the chance, up to a limit" is easy to read. For example, up to 3 bait per throw, each adding a few points, with a cap.
- **Black Desert's tiers and breeding** → farm breeding: two pets from the same land produce a juvenile with a chance at the next tier, based on trapping level and the parents' levels. A tier-8 creature becomes a long-term goal.
- **Black Desert's AFK auto-path** → **avoid** training that needs the client running. A BroTown room's capacity is limited by incoming messages (CLAUDE.md's summary of WORLD-ARCHITECTURE §11), so a horse looping a path all night is both a bot pattern and a server cost. Grow and train on the server clock instead — [CLAUDE.md](../../CLAUDE.md) [source-read]
- **Albion's 22 h feed and favourite food** → one feed per animal per day, using farm crops, with the favourite food halving the cost. This gives the Feed & Seed and the farm a job in the pet loop.
- **Albion's Premium halving growth** → do **not** let the $2 supporter pass shorten growth or trap timers. That is selling speed. Keep supporter perks cosmetic or convenience-only.

### Gaps
- Black Desert's lasso minigame (button-timing details), the wild-tier spread before 2022, and the 21 Sept 2022 patch notes that appeared in the results: not read.
- Albion's island plot counts, how many babies a pasture holds, and whether unfed animals regress or die: not found.

---

## 5. Crafted capture tools and collection systems: Monster Hunter, Palworld, Path of Exile (Einhar), WoW Hunter, Guild Wars 2 Ranger

### Takeaway
There are two families:
- **Capture as a consumable you use skilfully inside combat:** Monster Hunter's trap plus tranquiliser, and Palworld's sphere tiers crafted at workbenches, with modifiers for HP, level and throwing from behind.
- **Capture as collection:** WoW's 205 pet slots, with exotic pets gated by specialisation and rare spawns, and GW2's juveniles, which any ranger can charm.

Path of Exile shows the failure mode. Timing a net throw was unpopular, and it was replaced with "kill it and it is captured".

### Cited Findings
- **MHW carry limit:** you can carry one shock trap and one pitfall trap at a time. You can bring 2 trap tools and materials to craft more during the hunt — [GameFAQs MHW thread](https://gamefaqs.gamespot.com/boards/211368-monster-hunter-world/76301983); [Kiranico: Trapping and capturing](https://mhworld.kiranico.com/en/guide/trapping) [search-summary]
- **MHW recipes:** pitfall = trap tool + net (a net is ivy + spider web). Shock trap = trap tool + thunderbug. A trap tool costs 200 zenny at Astera's provision stockpile — [PowerPyx: Trap Tool](https://www.powerpyx.com/monster-hunter-world-trap-tool-location/); [GameRant: Trap Tool](https://gamerant.com/monster-hunter-world-trap-tool-guide/) [search-summary]
- **MHW capture rule:** the monster must be at **30% health or less**, caught in a trap and tranquilised. Two tranquilisers make it capturable for 45 s, and each further one adds 100 s with no cap — [Kiranico: Trapping and capturing](https://mhworld.kiranico.com/en/guide/trapping); [Fextralife: Tranq Bomb](https://monsterhunterworld.wiki.fextralife.com/tranq+bomb) [search-summary]
- **Palworld spheres:** version 1.0 adds Ultimate, Exotic, Sol and Ancient spheres above these — [XGamingServer: Pal Spheres](https://xgamingserver.com/blog/palworld-pal-spheres-guide/); [Palworld Wiki: Spheres](https://palworld.wiki.gg/wiki/Spheres) [search-summary]

  | Sphere | Unlock level | Capture power | Crafted at |
  |---|---|---|---|
  | Pal Sphere | 2 | 7 | Primitive Workbench |
  | Mega | 14 | 14 | Sphere Workbench |
  | Giga | 20 | 20 | Sphere Workbench |
  | Hyper | 27 | 26 | Sphere Assembly Line I |
  | Ultra | 35 | 32 | Sphere Assembly Line I |
- **Palworld catch chance:** it depends on the Pal's remaining HP, its level against yours, and your capture-power bonus. Throwing at its back adds up to about 20% — [XGamingServer: Pal Spheres](https://xgamingserver.com/blog/palworld-pal-spheres-guide/); [GameSpot: Palworld capture rate](https://www.gamespot.com/articles/palworld-increase-pal-capture-rate/1100-6520553/) [search-summary]
- **Path of Exile:**
  - Nets caught beasts in the Bestiary league. Since 3.5.0 (when Bestiary joined the core game) nets cannot be obtained and do nothing.
  - The mechanic "wasn't popular", so it changed to "kill the beast", and Einhar captures it automatically.
  - Einhar may appear in a new area with 4–6 beasts.
  - Sources: [PoE Wiki: Net](https://pathofexile.fandom.com/wiki/Net); [GameRant: PoE capture beasts](https://gamerant.com/path-of-exile-how-capture-beasts/) [search-summary]
- **WoW stable:** Shadowlands raised it to 200 stable slots + 5 active, 205 in all, up from 65 in Battle for Azeroth — [Wowhead news](https://www.wowhead.com/news/hunter-pet-stable-size-increased-from-60-to-200-slots-in-shadowlands-316689) [search-summary]
- **WoW exotic pets:** exotic families (spirit beasts, devilsaurs, worms, stone hounds) need the Beast Mastery specialisation and bring a family ability, such as Spirit Mend for spirit beasts. Some rares and quest monsters cannot be tamed — [Wowpedia: Hunter pet](https://wowpedia.fandom.com/wiki/Hunter_pet); [EpicCarry hunter pets guide](https://epiccarry.com/blogs/wow-midnight-hunter-pets-guide/) [search-summary]
- **WoW rare spawn, Loque'nahak:**
  - It respawns roughly every 6–10 h (some report up to 24 h) and is up for about 10 minutes.
  - It has at least 7 spawn points.
  - Competition is heavy, and it is often gone within 2 minutes.
  - Spirit beasts are unusable if you change specialisation.
  - Sources: [Huntsman's Lodge](https://huntsmanslodge.com/535/tips-and-advice-for-hunters-seeking-loquenahak/); [Blizzard forums: spawn timer](https://us.forums.blizzard.com/en/wow/t/loquenahak-spawn-timer/17055) [search-summary]
- **GW2 juveniles:** a ranger can charm any friendly "Juvenile" (green nameplate) by walking up and pressing F, "unless they already belong to another ranger". Nearly every area has juveniles, cities included, and expansions put new ones at named points of interest — [GW2 Wiki: Pet](https://wiki.guildwars2.com/wiki/Pet); [TheGamer: End of Dragons pets](https://www.thegamer.com/guild-wars-2-end-of-dragons-new-ranger-pets-locations-juvenile-phoenix-white-tiger-wallow-siege-turtle/) [search-summary]
- **GW2 bug:** when a ranger's pet loads before its owner, other rangers' charm triggers on it as if it had no owner — [GW2 forum bug report](https://en-forum.guildwars2.com/topic/132909-rangers-pet-charm-does-not-work-for-juvenile-alpine-wolves-or-juvenile-blue-moas/) [search-summary]

### Inferences
- **Monster Hunter's carry limit plus field crafting** → BroTown: carry one of each trap type, and craft more in the field from parts (a trap kit + land materials). That stops trap spam without a cooldown.
- **Monster Hunter's two-step capture** → weaken to 20% or less, a **root** (the trap), then a tranquiliser or net tap within a window. MH's 45 s window shows how generous it can be. That generosity matters on a phone.
- **Palworld's sphere tiers** → trap tiers crafted from bars (copper, iron, black steel, titanium, obsidian) at the forge or woodworker, one per monster tier. Trapping becomes a sink for smithing output and a market good. A "from behind" bonus is cheap, because the client already tracks facing.
- **Path of Exile's nets** → if the extra capture step feels like a chore, players reject it. Keep the moment of capture to one tap and put the skill in the setup (bait, root, timing the HP window).
- **WoW's 200-slot stable** → a large collection kept apart from a few active companions.
- **Spirit beasts** → BroTown is one shared room, so rare tames on a respawn timer would breed camping (Loque'nahak gone in 2 minutes). Prefer rares that are per-player, or announced world events.
- **GW2's juveniles** → a **codex**: your first capture of each species is a personal unlock, and the creature does not vanish for others. Collecting without competing.

### Gaps
- Monster Hunter's capture rewards versus kill rewards, and how monsters resist repeated traps: cut by the search budget.
- Path of Exile's crafting with captured beasts and its tradable beast items (Bestiary Orbs): not researched.
- WoW's taming cast time and any level restrictions: not found.

---

## 6. Bait and lures: how bait decides WHICH creature comes, and how bait links to cooking, farming and fishing

### Takeaway
Bait decides what comes in three ways:
1. **Bait as a key, one per species:** each Big Game Hunter dinosaur has its own bait, Varlamore foxes need jerboa-tail bait, Don't Starve uses carrots for rabbits and seeds for birds, and Valheim and Minecraft have foods per species.
2. **Bait as a weighting:** Stardew's Targeted Bait makes a chosen catch 2–4× as likely, RS box-trap bait adds 3%, and Ark's preferred kibble tames 5× faster.
3. **A shared lure** that raises spawns for everyone nearby: Pokémon GO, 30 minutes.

Bait is almost always another skill's output: cooking makes kibble, fishing makes Targeted Bait, farming makes seeds and crops, and hunting makes tails.

### Cited Findings
- Each of Big Game Hunter's 9 dinosaurs needs its own bait, placed on a bait pad — [RuneScape Wiki: Anachronia Big Game Hunter](https://runescape.wiki/w/Anachronia_Big_Game_Hunter) [search-summary]
- Jerboa tails, from box traps, are bait for foxes in deadfalls (and also become bolas): one catch is the bait for the next — [Jagex newspost: The Hunter Guild – Varlamore](https://secure.runescape.com/m=news/a=903/the-hunter-guild---varlamore?oldschool=1) [search-summary]
- RS box-trap bait is species-specific (spicy tomato for chinchompas, spicy minced meat for carnivorous chinchompas) but worth only +3%, and is used up on each success — [RuneHQ: Box trap](https://www.runehq.com/item/box-trap) [search-summary]
- Bird houses use 10 hop seeds, and seed quality does not matter — [OSRS Wiki: Bird house (item)](https://oldschool.runescape.wiki/w/Bird_house_(item)); [osrsguru birdhouse guide](https://osrsguru.com/guides/osrs-birdhouse-runs-guide-2026.html) [search-summary]
- Stardew's Bait Maker turns any fish into Targeted Bait, which makes that fish 2–4× as likely in crab pots. Deluxe and Wild Bait cut crab-pot trash from 38% to 30% — [Stardew Wiki: Targeted Bait](https://stardewvalleywiki.com/Targeted_Bait); [Stardew Wiki: Crab Pot](https://stardewvalleywiki.com/Crab_Pot) [search-summary]
- In Don't Starve, carrots bait rabbit traps and seeds bait bird traps. An ordinary trap baited with seeds lures birds but cannot hold them — [Don't Starve Wiki: Trap](https://dontstarve.wiki.gg/wiki/Trap); [Don't Starve Wiki: Bird Trap](https://dontstarve.wiki.gg/wiki/Bird_Trap) [search-summary]
- Ark kibble:
  - six tiers, one per egg size: extra-small Basic, small Simple, medium Regular, large Superior, extra-large Exceptional, special Extraordinary;
  - each recipe is an egg plus fibre, crops or berries, water and meat or jerky, cooked in a Cooking Pot or Industrial Cooker;
  - a creature takes its preferred tier or any higher one at full effectiveness;
  - Rex, Spino and Argentavis want Superior.

  Sources: [XGamingServer: ARK kibble guide](https://xgamingserver.com/blog/ark-survival-ascended-kibble-guide/); [Dododex: Kibble](https://www.dododex.com/kibble) [search-summary]
- In Albion, an animal's favourite food halves the crops per feed (18 → 9) — [Albion Wiki: Livestock](https://wiki.albiononline.com/wiki/Livestock) [search-summary]
- Black Desert uses raw sugar after the lasso, and Valheim uses each species' foods (berries and root crops for boars) — [Altar of Gaming BDO guide](https://altarofgaming.com/black-desert-online-horse-taming-training-breeding-exchanging-guide/); [Game8 Valheim taming](https://game8.co/games/Valheim/archives/320283) [search-summary]
- A Pokémon GO Lure Module lasts 30 minutes at a PokéStop. The Pokémon it spawns appear for **every trainer in range**, and the pink petals show on the map — [Niantic Help Center: Lure Modules](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1789-lure-modules/); [Bulbapedia: Lure Module](https://bulbapedia.bulbagarden.net/wiki/Lure_Module) [search-summary]

### Inferences
- **Bait as a key** → BroTown: each land has its own bait family, cooked from that land's catches and crops. For example, frost-land bait is cooked from fish caught in frost water. A land's bait is what makes its trappable creatures appear at a placed trap, so cooking and fishing feed trapping directly.
- **Bait as a weighting (Stardew's Targeted Bait)** → a refined bait, made at a "bait bench" or the cookhouse, weights the trap toward one monster type within the land (2–4×). Players can aim for the creature they want without trading fun for luck.
- **The size of the effect** → a +3% bonus is invisible to players. Bait should decide **whether** something can come, or weight it by **×2–×4**, to be worth a cooking session.
- **Shared lures** → a clan or party **lure** at a land's camp raises critter spawns for everyone nearby for 30 minutes. It is social, and since the bait belongs to nobody's catch, nothing can be stolen. It also fits clans.
- **When bait is used up** → only on success (Don't Starve, RS), which takes the sting out of failure.

### Gaps
- I found no source on bait shifting **rarity** (as opposed to species) beyond Stardew's multipliers and Ark's effectiveness.
- How much bait the Big Game Hunter dinosaurs need, and what each bait is: not retrieved.

---

## 7. Idle and asynchronous trap loops for short mobile sessions: timings, caps, and keeping them from becoming bot magnets

### Takeaway
The asynchronous loops that work share one shape:
- a small, fixed number of placements;
- a **server clock** rather than presence, so they progress offline;
- a cost each cycle paid in another skill's output;
- a payoff that does not grow with how fast you click;
- forgiveness if you miss a check (the ranch collects a missed stage at the next one).

Loops that need presence either fail short sessions (Valheim's 64 m) or invite AFK and bot play (Black Desert's auto-path).

### Cited Findings
- OSRS bird houses take about 50 minutes on a server timer that runs while you are logged out. Each cycle costs 10 seeds, and seed quality does not matter — [OSRS Wiki: Bird house (item)](https://oldschool.runescape.wiki/w/Bird_house_(item)); [osrsguru birdhouse guide](https://osrsguru.com/guides/osrs-birdhouse-runs-guide-2026.html) [search-summary]
- The cap is 4 bird houses, one per fixed space, on a 50-minute wall-clock timer, per RuneLite's source — [RuneLite source: BirdHouseSpace.java](https://github.com/runelite/runelite/blob/master/runelite-client/src/main/java/net/runelite/client/plugins/timetracking/hunter/BirdHouseSpace.java); [RuneLite source: BirdHouseTracker.java](https://github.com/runelite/runelite/blob/master/runelite-client/src/main/java/net/runelite/client/plugins/timetracking/hunter/BirdHouseTracker.java) [source-read]
- Stardew crab pots are daily passive income. Luremaster removes the bait cost, and Mariner removes the junk — [StardewHub crab pot guide](https://stardewhub.com/en/guides/stardew-valley-crab-pot-guide); [Stardew Wiki: Crab Pot](https://stardewvalleywiki.com/Crab_Pot) [search-summary]
- Albion livestock is fed once per 22 h and takes 44 h to grow, halved by Premium — [Albion Wiki: Livestock](https://wiki.albiononline.com/wiki/Livestock); [Albion Wiki: Baby Chickens](https://wiki.albiononline.com/wiki/Baby_Chickens) [search-summary]
- RS3's ranch grows creatures over several days, and a missed stage is collected at the next check — [RuneScape Wiki: Anachronia Dinosaur Farm](https://runescape.wiki/w/Anachronia_Dinosaur_Farm) [search-summary]
- In Big Game Hunter, a species hides for 1 hour after 5–6 hunts unless you use a lure — [RuneScape Wiki: Anachronia Big Game Hunter](https://runescape.wiki/w/Anachronia_Big_Game_Hunter) [search-summary]
- A Valheim tame only progresses within about 64 m of a player and while fed — [PlayerEcho](https://playerecho.com/valheim/taming-guide) [search-summary]
- Black Desert horse training runs on a client-driven looping auto-path while the game sits minimised to the tray — [BDFoundry: Training guide](https://www.blackdesertfoundry.com/training-guide/) [search-summary]
- In UO, taming macros run mostly AFK. The game blocks skill gain from re-taming the same creature, and some shards ban releasing tames at a new spot — [UO Outlands forum guide](https://forums.uooutlands.com/index.php?threads/guide-and-script-animal-taming-afk-skill-gain-in-classicuo.3453/); [UO Renaissance forum guide](https://uorforum.com/threads/the-mostly-afk-guide-to-training-animal-taming.38138/) [search-summary]
- Hunters' Rumours were designed around about 8–10 minutes each, a unit that suits a short session — [Jagex newspost](https://secure.runescape.com/m=news/a=903/the-hunter-guild---varlamore?oldschool=1) [search-summary]

### Inferences
- **Server-clock traps** → BroTown: the worker can compute the result when the trap is checked, so nothing ticks and no messages flow between check-ins. That suits the incoming-message budget and a phone that has been backgrounded. Presence loops, by contrast, send moves the whole time.
- **The 2 h/day free cap** → traps that fill offline give free players value without using their capped hours. That is good for retention, but it also makes **alt-account farms** attractive. Counter-measures:
  - cap traps per account;
  - require inputs made by the player's own skills (bait from their own cooking);
  - keep pets and cosmetics untradable, and let only materials (fur, horn) reach the market.
- **Suggested shape (my inference, not sourced):**
  - 3–5 placed trap lines, the number growing with trapping level;
  - 30–60 minutes to fill (the birdhouse scale);
  - one daily "big check" (the crab-pot scale);
  - each line capped at N catches;
  - 24 h of forgiveness for missed checks (the ranch's rule).
- **Guards against bot magnets:**
  - a fixed payoff per stretch of real time, so clicking faster earns nothing (bird houses);
  - an hourly cooldown after N big-game hunts (Big Game Hunter);
  - less XP for repeated captures of the same species (UO);
  - the existing gesture minigame on every check. The worker already enforces an honest-speed floor on gathering (`HONEST_CYCLE`, CLAUDE.md v2.3.3036), and trap checks can share it — [CLAUDE.md](../../CLAUDE.md) [source-read]

### Gaps
- I found no primary source on Jagex's anti-bot reasons for the birdhouse design, or on how common bots are at chinchompas or birdhouses: the query was cut by the search budget.
- No source on mobile-first trapping games (for example on how Pokémon GO sets its timers) beyond its 30-minute lure.

---

## 8. Shared-world rules: can other players see, steal, trigger or break your trap or its catch? Tagging, per-player trap limits, world clutter

### Takeaway
In shared worlds, placed traps and weakened creatures are contested property:
- **OSRS** lets a fallen trap become loot (private for 60 s, then public for 120 s), and players hedge by carrying spares.
- **Ark** gives exclusive PvE taming rights to the last hitter and binds the tame at the first food.
- **WoW** turns rare tames into first-come races.
- **GW2 and Pokémon GO** avoid the conflict by making the resource non-exclusive: juveniles stay, and lures benefit everyone.

BroTown today has **no tagging on captures**, and a capture removes the monster for everyone.

### Cited Findings
- Tradeable items dropped in OSRS appear to other players after 60 s and disappear 120 s later. A Hunter guide warns that others can see your fallen snare after 1 minute — [OSRS Wiki: Drop](https://oldschool.runescape.wiki/w/Drop); [2007rshelp: Hunter](https://2007rshelp.com/skill/24/hunter) [search-summary]
- Box traps you leave unattended can be stolen, so guides advise carrying 10–15 spares, especially at Wilderness black chinchompas — [osrsbestinslot Hunter guide](https://www.osrsbestinslot.com/osrs-hunter-guide/); [OSRS Wiki: Box trap](https://oldschool.runescape.wiki/w/Box_trap) [search-summary]
- At crowded chinchompa spots (Feldip Hills), players change worlds and learn where the creatures respawn. Chinchompas can dismantle traps — [OSRS money making guide: red chinchompas](https://osrsmoneymaking.guide/news/best-place-to-catch-red-chinchompas-in-osrs-2/); [OSRS Wiki (fandom mirror): Chinchompa (Hunter)](https://oldschoolrunescape.fandom.com/wiki/Chinchompa_(Hunter)) [search-summary]
- In the Wilderness (PvP) you may set one extra trap — [OSRS Wiki: Hunter training](https://oldschool.runescape.wiki/w/Hunter_training) [search-summary]
- In Ark, the first food binds the tame. On PvE servers the last hitter has exclusive taming rights, and a creature that wakes is "fair game" again — [Ark Wiki: Taming](https://ark.fandom.com/wiki/Taming); [survivetheark forum](https://survivetheark.com/index.php?%2Fforums%2Ftopic%2F33302-pve-taming-dinos%2F=) [search-summary]
- WoW's Loque'nahak draws heavy competition and is often gone within 2 minutes of spawning — [Huntsman's Lodge](https://huntsmanslodge.com/535/tips-and-advice-for-hunters-seeking-loquenahak/) [search-summary]
- GW2 juveniles can be charmed by any ranger "unless they already belong to another ranger" — [GW2 Wiki: Pet](https://wiki.guildwars2.com/wiki/Pet) [search-summary]
- Pokémon GO lures are public: everyone in range of the PokéStop gets the spawns — [Niantic Help Center: Lure Modules](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1789-lure-modules/) [search-summary]
- In UO, transferring a pet avoids the owner cap that releasing triggers — [uo.com: Pet Ownership](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/pets-ownership/) [search-summary]
- **BroTown's code today:**
  - A capture needs only range (200 px), HP at or below 20% and a trap.
  - It removes the monster for everyone, with no loot.
  - The monster respawns on the zone's population-scaled clock.
  - Nothing checks who damaged it.

  Source: [server/src/pets.js L139-199](../../server/src/pets.js) [source-read]
- **BroTown's code today:** the worker already defines "provoked" as having hurt a monster this life (`m.dmgByPlayer`) and having dealt damage within 10 s, for the safe-ground pursuit rule — [CLAUDE.md, v2.3.3056 clause](../../CLAUDE.md) [source-read]

### Inferences
- **Tagging** → BroTown: allow a capture only to players (or their party) who damaged the monster in the last ~10 s, reusing the provoke definition. Otherwise "capture-stealing" will produce the same complaints as Ark tame-stealing and WoW camping.
- **Placed traps:**
  - a cap per player, and one trap per small radius;
  - in safe lands, other players can see your trap but cannot touch it;
  - in **No man's land**, your traps and their catches can be looted by whoever kills you, which matches the existing No man's land loss rules (the counterpart of OSRS's Wilderness rules).
- **Timeouts** → in safe areas an expired trap goes back to the bag or arrives by mail, never as loot on the ground. That removes OSRS's theft complaint outright.
- **Clutter and memory** → draw your own traps, plus others only within the interest radius (the worker already limits monsters to 2,400 px in the Wheel), all from one tiny shared sprite sheet. The server holds every trap; the client draws only what is near. This respects the per-PR memory budget — [CLAUDE.md](../../CLAUDE.md) [source-read]
- **Non-exclusive designs** → codex unlocks (GW2) and shared lures (Pokémon GO) are the conflict-free options for one busy shared room.

### Gaps
- OSRS's rule stopping you from checking another player's trap, and the minimum spacing between traps: cut by the search budget.
- Whether OSRS PKers actually target black chinchompa hunters, and how much: cut by the search budget.

---

## 9. Common complaints: tedium, bots, trap theft, overcrowded spots

### Takeaway
The complaints that keep coming back:
- **theft:** fallen traps in OSRS, and PvE griefing in Ark;
- **crowding and camping:** OSRS chinchompa spots, WoW spirit beasts;
- **automation:** UO taming macros; Black Desert's AFK training, which is tolerated there;
- **fiddly extra steps that interrupt combat:** Path of Exile's nets, which were removed.

Evidence for bot complaints specific to Hunter was thin among the pages I could reach.

### Cited Findings
- **Theft:** guides tell OSRS hunters to bring 10–15 spare box traps because others take fallen ones, especially in the Wilderness — [osrsbestinslot Hunter guide](https://www.osrsbestinslot.com/osrs-hunter-guide/) [search-summary]
- **Griefing:** on Ark PvE servers players steal eggs, raid structures they find a way into, and "treat other players as free labor" — [Red Bull: How to tame dinosaurs in ARK](https://www.redbull.com/us-en/how-to-tame-dinosaurs-ark) [search-summary]
- **Crowding:** players hop to quieter worlds to hunt chinchompas — [OSRS money making guide: red chinchompas](https://osrsmoneymaking.guide/news/best-place-to-catch-red-chinchompas-in-osrs-2/) [search-summary]
- **Camping:** Loque'nahak is "one of the most well known and sought after" spirit beasts with heavy competition, and it rarely lasts 2 minutes — [Huntsman's Lodge](https://huntsmanslodge.com/535/tips-and-advice-for-hunters-seeking-loquenahak/); [MMO-Champion: Camping Loque'nahak](https://www.mmo-champion.com/threads/760725-Camping-Loque-nahak) [search-summary]
- **Automation:** AFK taming macros are common in UO, and some shards restrict releasing tames at a new spot to curb them — [UO Outlands forum guide](https://forums.uooutlands.com/index.php?threads/guide-and-script-animal-taming-afk-skill-gain-in-classicuo.3453/); [UO Renaissance forum guide](https://uorforum.com/threads/the-mostly-afk-guide-to-training-animal-taming.38138/) [search-summary]
- **Tedium of extra steps:** Path of Exile's nets "weren't popular", and capture became automatic on a kill — [GameRant: PoE capture beasts](https://gamerant.com/path-of-exile-how-capture-beasts/) [search-summary]
- **Bots:** red chinchompas are valuable for training Ranged, which makes them a likely bot target. The search found no specific complaint threads, only general OSRS bot frustration — [GamingElephant: red chinchompas guide](https://www.gamingelephant.com/osrs-red-chinchompas-guide/); [Steam OSRS discussion](https://steamcommunity.com/app/1343370/discussions/0/3104640350811760346) (weak sourcing) [search-summary]
- **Bugs that look like theft:** in GW2, a pet that loads before its owner looks unowned and can be charmed by other rangers — [GW2 forum bug report](https://en-forum.guildwars2.com/topic/132909-rangers-pet-charm-does-not-work-for-juvenile-alpine-wolves-or-juvenile-blue-moas/) [search-summary]

### Inferences
- **Theft** → BroTown: avoid it by construction. Traps and catches belong to their owner and return by bag or mail, with one exception: No man's land, where risk is the point.
- **Crowding and camping** → spread trappable creatures over every stretch of each land (the Wheel already has 384 monsters across 8 lands × tiers), and use personal or announced rares instead of timed world rares in the one shared room. [source-read: CLAUDE.md]
- **Automation** → reward per real time, not per click, cap XP from repeated same-species captures, and keep the gesture check. BroTown's worker-side speed limits on gathering already do this for nodes.
- **Extra steps** → keep the capture moment to one tap with a clear chance shown, and put the skill in preparation (bait, trap tier, root timing). Don't add a timing chore inside combat.
- **Losing a trap on a failed roll** → this is BroTown's likeliest **own** complaint: today a 20 g trap is burned on every failed roll. Even at the best chance (95%), one throw in 20 burns a trap for nothing, and at the 10% floor nine in ten do. Making the trap a tool with uses and spending bait only on success removes this. [source-read; my arithmetic]

### Gaps
- Reddit (r/2007scape, r/ultimaonline, r/playark) and the official forums could not be fetched, and the search budget ran out, so player sentiment comes from guides and a few forum threads rather than broad community discussion.
- No figures on bot bans or bot prevalence for any Hunter activity were found.

---

## 10. Capture that does not run through combat damage: which mechanics still work for a player who can one-hit everything (owner update, 2026-10-06)

### Takeaway
Every mechanic in this catalogue that never reads the creature's HP survives a player who one-hits everything:
- placed traps that creatures walk into (OSRS, Don't Starve, Stardew);
- bait pads and creatures that appear only for bait (RS3 Big Game Hunter, Varlamore fox bait, bird houses);
- tracking (Herbiboar);
- sneaking (Animal Crossing, Valheim's "not alerted" rule, Big Game Hunter's detection circles);
- feeding and befriending (Valheim, Minecraft, Black Desert's sugar);
- skill-check taming (UO) and charming (GW2);
- Path of Exile's "kill it and it is captured".

Only the **HP-window** designs break: BroTown's 20% rule, Monster Hunter's 30% and Palworld's HP factor.

The best fit for BroTown is OSRS Hunter's pattern. It is a skill of its own where **trapping level alone** decides which creatures you may catch, how many traps you run and your catch chance. High-tier creatures sit behind **crafted bait and trap tiers** instead of behind an HP bar.

### Cited Findings
**Why today's rule breaks (BroTown code)**
- A capture needs a live, damageable monster. `_monsterDamageable` returns false when `!m.alive || m.hp <= 0` or while an invulnerability window is open, so a monster killed in one hit cannot be captured (error `no-monster`) — [server/src/combat.js L166-169](../../server/src/combat.js); [server/src/pets.js L144](../../server/src/pets.js) [source-read]
- A capture is also refused while the monster is above 20% of max HP (`too-healthy`). A blow that takes it from above 20% straight to 0 leaves no window at all — [server/src/pets.js L42, L145](../../server/src/pets.js) [source-read]
- The chance drops 5% for each level the monster is above the **player's combat level**, but rises only 0.5% per trapping level. So capture odds follow combat level more than the trapping skill — [server/src/pets.js L45-48, L157-161](../../server/src/pets.js) [source-read]
- **Precedent for creatures that can't be hit:** the capture handler already repeats the "damageable" phase gate so the snow pile can't be trapped while it is immune (v2.3.2221). The machinery for "can't be hit" exists — [server/src/pets.js L139-144](../../server/src/pets.js) [source-read]
- **Precedent for a non-combat, level-gated loop:**
  - `GATHER_REQ_LVL` gates each resource by type and tier in steps of 5 (copper and iron 1, black steel 5; minnow 1, clownfish 5, trout 10), and the worker refuses anything below it (`skill-too-low`).
  - A locked node can still be *tried*: zeros pop up along with "Requires Fishing Lv 5", and nothing is sent to the worker.
  - The worker has a speed floor for honest harvests (`HONEST_CYCLE`).
  - Sources: [CLAUDE.md, v2.3.3038 / v2.3.3059 / v2.3.3036 clauses](../../CLAUDE.md) [source-read]

**Placed traps that creatures walk into: how the catch is resolved, what the player does meanwhile, counts and timers**
- **OSRS trap types by creature:** ferret 27 (box), swamp lizard 29 (net), barb-tailed / prickly / sabre-toothed kebbits 33/37/51 (deadfall), grey / red / black chinchompas 53/63/73 (box), and birds (snare, 34 XP) — [OSRS Wiki: Hunter creatures](https://oldschool.runescape.wiki/w/Hunter_creatures); [Altar of Gaming OSRS Hunter guide](https://altarofgaming.com/osrs-hunter-guide/) [search-summary]
- **How it resolves:** a chinchompa that comes out either walks into a trap or dismantles at least one trap and hops away. Guides tell you to kill a dismantler with an arrow and re-lay at once, and players learn where chinchompas respawn by killing one and watching where it reappears. While waiting, the hunter **tends** 2–5 traps; it is active play, not idle — [OSRS Wiki (fandom mirror): Chinchompa (Hunter)](https://oldschoolrunescape.fandom.com/wiki/Chinchompa_(Hunter)); [OSRS money making guide: red chinchompas](https://osrsmoneymaking.guide/news/best-place-to-catch-red-chinchompas-in-osrs-2/) [search-summary]
- **The catch roll uses only the trapper's Hunter level,** for example red chinchompa P(L) = (⌊306×(L−1)/98⌋ − 78)/255. It has no term for combat level or for the creature's HP — [OSRS Wiki: Carnivorous chinchompa](https://oldschool.runescape.wiki/w/Carnivorous_chinchompa) [search-summary]
- **Traps at a time** depend on Hunter level: 2/3/4/5 at 1/40/60/80, plus 1 in the Wilderness — [OSRS Wiki: Hunter training](https://oldschool.runescape.wiki/w/Hunter_training) [search-summary]
- **Timeouts:** an unattended trap collapses after a while, and a fallen one becomes a ground item that others can take. Guides say to carry 10–15 spares — [OSRS Wiki: Box trap](https://oldschool.runescape.wiki/w/Box_trap); [osrsbestinslot Hunter guide](https://www.osrsbestinslot.com/osrs-hunter-guide/) [search-summary]
- **RuneLite's model of a trap:** it stays up 1 minute before collapsing and moves through OPEN → FULL or EMPTY → TRANSITION. That makes active trapping a loop of a minute or less per trap — [RuneLite source: HunterTrap.java](https://github.com/runelite/runelite/blob/master/runelite-client/src/main/java/net/runelite/client/plugins/hunter/HunterTrap.java) [source-read]
- **Bird houses have no creature AI at all.** You bait them with 10 seeds, they fill on a 50-minute server timer that runs while you are logged out, and you collect up to 10 birds' worth (280 XP for a full basic house, plus nests) — [OSRS Wiki: Bird house (item)](https://oldschool.runescape.wiki/w/Bird_house_(item)); [osrsguru birdhouse guide](https://osrsguru.com/guides/osrs-birdhouse-runs-guide-2026.html) [search-summary]
- **The bird-house cap:** RuneLite tracks exactly 4 fixed spaces, each on a 50-minute wall-clock timer — [RuneLite source: BirdHouseSpace.java](https://github.com/runelite/runelite/blob/master/runelite-client/src/main/java/net/runelite/client/plugins/timetracking/hunter/BirdHouseSpace.java); [RuneLite source: BirdHouseTracker.java](https://github.com/runelite/runelite/blob/master/runelite-client/src/main/java/net/runelite/client/plugins/timetracking/hunter/BirdHouseTracker.java) [source-read]
- **Don't Starve:** a trap springs when a creature of the right size moves nearby, and bait is used up only when something is caught. A bird trap is baited with seeds — [Don't Starve Wiki: Trap](https://dontstarve.wiki.gg/wiki/Trap); [Don't Starve Wiki: Bird Trap](https://dontstarve.wiki.gg/wiki/Bird_Trap) [search-summary]
- **Stardew crab pots:** daily passive income, baited (except with Luremaster), with 38% trash (30% with deluxe or wild bait, none with Mariner) — [Stardew Wiki: Crab Pot](https://stardewvalleywiki.com/Crab_Pot); [StardewHub crab pot guide](https://stardewhub.com/en/guides/stardew-valley-crab-pot-guide) [search-summary]

**Bait that decides which creature comes (high tiers behind bait, not HP)**
- **RS3 Big Game Hunter:**
  - Requirements are 75 Hunter (plus 55 Slayer) and it is "non-combat".
  - Each of the 9 dinosaurs has its own clearing and its **own bait**, which you place on a bait (pressure) pad to lure it.
  - After 5–6 hunts the species hides for an hour unless a dinosaur lure resets it.

  Source: [RuneScape Wiki: Anachronia Big Game Hunter](https://runescape.wiki/w/Anachronia_Big_Game_Hunter) [search-summary]
- **Varlamore:** jerboa tails (from box traps) are the bait for fennec foxes in deadfalls (57 Hunter), so one catch is the key to the next creature — [Jagex newspost: The Hunter Guild – Varlamore](https://secure.runescape.com/m=news/a=903/the-hunter-guild---varlamore?oldschool=1) [search-summary]
- **Stardew Targeted Bait:** refined from a chosen fish at the Bait Maker (Fishing 6), it makes that catch 2–4× as likely — [Stardew Wiki: Targeted Bait](https://stardewvalleywiki.com/Targeted_Bait); [Stardew Wiki: Bait Maker](https://wiki.stardewvalley.net/Bait_Maker) [search-summary]
- **Ark kibble:** the tier is set by egg size (6 tiers), and the biggest tames want Superior, made from large eggs. The bait for top creatures is made from other big creatures' eggs — [XGamingServer: ARK kibble guide](https://xgamingserver.com/blog/ark-survival-ascended-kibble-guide/); [Dododex: Kibble](https://www.dododex.com/kibble) [search-summary]
- **Pokémon GO:** a 30-minute lure raises spawns for every trainer nearby — [Niantic Help Center: Lure Modules](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1789-lure-modules/) [search-summary]

**Tracking and sneaking**
- **Herbiboar:** you follow a trail by inspecting objects until the tunnel with the herbiboar is revealed. It pays Hunter XP that grows with level, plus 1–3 herbs. It is gated by 80 Hunter and 31 Herblore, not combat — [OSRS Wiki: Herbiboar](https://oldschool.runescape.wiki/w/Herbiboar) [search-summary]
- **Big Game Hunter:** each dinosaur has a detection zone drawn as a coloured circle on the ground (the minimap copy is unreliable), which adds a stay-out-of-sight positioning element — [RuneScape Wiki: Anachronia Big Game Hunter](https://runescape.wiki/w/Anachronia_Big_Game_Hunter) [search-summary]
- **Animal Crossing:** holding A walks slowly whatever the stick tilt, and running near or missing scares bugs — [Game8: How to Catch Bugs](https://game8.co/games/Animal-Crossing-New-Horizons/archives/284779); [GameSpot bugs guide](https://www.gamespot.com/articles/animal-crossing-new-horizons-bugs-guide-how-to-cat/1100-6475001/) [search-summary]
- **Valheim:** taming only progresses while the animal is not alerted (as well as fed, with a player within about 64 m) — [PlayerEcho](https://playerecho.com/valheim/taming-guide) [search-summary]

**Feeding and befriending, where combat does not matter**
- **Valheim:** about 30 minutes and 3 food if uninterrupted. A hostile wolf is first got into a pen, then raw meat is left and the player backs off so it calms down — [PlayerEcho](https://playerecho.com/valheim/taming-guide); [Altar of Gaming Valheim](https://altarofgaming.com/valheim-animal-taming-breeding-capturing-guide/) [search-summary]
- **Minecraft:** a tame chance per item fed (bone 1/3, fish 1/3, seed 1/10) — [XGamingServer: Minecraft taming](https://xgamingserver.com/blog/minecraft-animal-taming-guide/) [search-summary]
- **Black Desert:** lasso, then raw sugar, with more lumps raising the chance (4–5 is the sweet spot) — [Altar of Gaming BDO horse guide](https://altarofgaming.com/black-desert-online-horse-taming-training-breeding-exchanging-guide/) [search-summary]
- **Ark** has a "passive" taming method separate from its knockout and trap methods. It is named in GuildOrder's guide, but I could not retrieve the details — [GuildOrder taming guide](https://guildorder.com/games/ark/wiki/taming-guide) [search-summary]
- **UO:** taming is gated by a skill requirement per creature (dragon 93.9 up to greater dragon 104.7). None of the UO sources I reached mention weakening the creature first — [UOGuide: Greater Dragon](https://www.uoguide.com/Greater_Dragon); [uo.com: Pet Ownership](https://uo.com/wiki/ultima-online-wiki/skills/animal-taming/pets-ownership/) [search-summary]
- **GW2:** walk up to a "Juvenile" and press F — [GW2 Wiki: Pet](https://wiki.guildwars2.com/wiki/Pet) [search-summary]

**Capture by killing (the opposite fix)**
- Path of Exile replaced "reduce the beast's life, then throw a net in time", which was unpopular, with "kill it". With Einhar present, beasts don't die; they are captured automatically — [GameRant: PoE capture beasts](https://gamerant.com/path-of-exile-how-capture-beasts/); [PoE Wiki: Net](https://pathofexile.fandom.com/wiki/Net) [search-summary]

**The HP-window designs (the ones that break)**
- **Monster Hunter:** capture needs 30% HP or less, plus a trap and tranquilisers — [Kiranico: Trapping and capturing](https://mhworld.kiranico.com/en/guide/trapping) [search-summary]
- **Palworld:** the catch chance depends on the Pal's remaining HP (plus level, capture power and a back throw) — [XGamingServer: Pal Spheres](https://xgamingserver.com/blog/palworld-pal-spheres-guide/) [search-summary]

**Keeping the skill independent of combat, and stopping high levels trivialising low-level trapping**
- **OSRS Hunter's gates are all Hunter level:** creature unlocks, traps at a time, catch chance, and rumour tiers (46/57/72/91, unboostable). Combat level appears in none of them — [OSRS Wiki: Hunter training](https://oldschool.runescape.wiki/w/Hunter_training); [OSRS Wiki: Hunters' Rumours](https://oldschool.runescape.wiki/w/Hunters%27_Rumours) [search-summary]
- **XP per catch is fixed by the creature** (a bird snare 34 XP, Herbiboar about 1,950+), so low creatures pay little to a high-level hunter — [OSRS Wiki: Hunter creatures](https://oldschool.runescape.wiki/w/Hunter_creatures); [OSRS Wiki: Herbiboar](https://oldschool.runescape.wiki/w/Herbiboar) [search-summary]
- **UO:** re-taming the same creature gives no skill, failures give none, and players aim at creatures they have about a 50% chance on — [UO Outlands forum guide](https://forums.uooutlands.com/index.php?threads/guide-and-script-animal-taming-afk-skill-gain-in-classicuo.3453/); [UO Renaissance forum guide](https://uorforum.com/threads/the-mostly-afk-guide-to-training-animal-taming.38138/) [search-summary]
- **GW2:** juveniles are not used up, so nobody is crowded out — [GW2 Wiki: Pet](https://wiki.guildwars2.com/wiki/Pet) [search-summary]
- **Rumour tiers** only hand out creatures within your tier, and a rumour takes about 8–10 minutes — [OSRS Wiki: Hunters' Rumours](https://oldschool.runescape.wiki/w/Hunters%27_Rumours); [Jagex newspost](https://secure.runescape.com/m=news/a=903/the-hunter-guild---varlamore?oldschool=1) [search-summary]

### Inferences
**Verdict table (my judgement from the cited mechanics).**

| Mechanic | What resolves the catch | Survives a one-hit player? | BroTown line |
|---|---|---|---|
| HP window (BroTown 20%, MH 30%, Palworld's HP factor) | Damage | **No.** One hit skips the window; MH escapes only because its monsters have huge HP pools | Retire it as the core. At most keep it as a beginner's extra |
| Kill-to-capture with something that enables it (PoE Einhar) | The kill itself | **Yes**, by design | A crafted "capture charm" (gated by trapping level per tier) that, while active, turns your next kill of a suitable monster into a capture. It is the smallest change to today's code, but the skill then lives in making the charm, not in the catch |
| Placed trap the creature walks into (OSRS box/net/deadfall/snare, Don't Starve) | The creature enters, then a roll on **trapping** level | **Yes.** There is no HP term | A trap the server owns at a baked "trap spot". A creature from that land wanders in, and the roll is trapping level against creature tier. Meanwhile the player fights or gathers nearby |
| Timer trap (bird houses, crab pots) | Server clock plus bait | **Yes** | The cheapest to run: the worker works out the result when you check, and nothing ticks. It suits 2 h/day players and phones |
| Bait pad, or creatures that come only for bait (BGH, Varlamore foxes, Targeted Bait, Ark kibble) | The bait recipe chooses the creature | **Yes** | High-tier creatures appear **only** to high-tier crafted bait. The catch spawns for the trap's owner, so nothing can be stolen |
| Tracking trail (Herbiboar) | Following clues | **Yes**, as long as killing the creature can't give the same reward | A trail of tracks to tap in each land, ending in a gesture. The reward comes from the trail, never from a kill |
| Sneaking (Animal Crossing; Valheim's alert state; BGH detection circles) | Movement control | **Yes** | A visible detection ring plus a half-tilt sneak. An alerted creature flees, and cannot be attacked |
| Feeding and befriending (Valheim, Minecraft, BDO sugar, Ark passive) | Food plus time or odds | **Yes**, though hostile creatures need a pen or a calm state first | Offer cooked land bait to a calmed creature, with Minecraft-style odds per feed that trapping level raises |
| Skill-check taming (UO), charming (GW2) | A skill roll, or just interacting | **Yes** | Trapping gates per tier like `GATHER_REQ_LVL`, and a GW2-style codex for collecting |

**BroTown design notes this implies:**
- **Make trap creatures something you cannot hit.** Make them a separate kind of "critter" entity, or monsters with a permanent `_invulnUntil`-style flag (the snow-pile precedent). Then a one-hit player can't wipe them out, by accident or on purpose. If they stay killable, a kill gives nothing and only sends them back to their spawn point (the OSRS chinchompa pattern).
- **Spawn each catch for its trap (the bird-house model)** rather than taking a monster from the shared pool. That ends three problems at once: "a capture removes it for everyone", stealing a capture, and crowding at spots. It also stops a high-level player from emptying a low-level land.
- **Server cost:** resolving a trap when it is checked costs nothing between visits. A creature walking into a trap needs a proximity check per monster per tick, so cap traps at 2–5 per player and use a spatial grid. Both are compatible with the worker's monster interest radius.
- **Put high tiers behind bait, not HP.** Bait for land tier T needs a cooking level plus ingredients from tier T (that tier's fish, crops or drops). A trap of tier T needs that tier's bars (smithing: copper, iron, black steel, titanium, obsidian). So the gate is life-skill progression across cooking, fishing, farming and smithing, never combat damage.
- **Stop high levels trivialising low-level trapping:**
  - fixed XP per creature tier, on the doubling life-skill XP curve;
  - XP that fades for creatures far below your trapping level (UO's ~50% rule as precedent);
  - trapping contracts offered only near your level (rumour tiers);
  - catches that spawn per trap, so a strong player can't crowd anyone out;
  - low-tier furs useful only in low-tier recipes, so farming them is not worth a high level's time;
  - remove the combat-level penalty and use trapping level against creature tier only.
- **Unblock the skill's progression from the 6-pet cap.** Most catches should be **materials** (fur, horn, tail, meat), with a pet as a rare outcome or a separate "tame" step. Otherwise trapping XP stalls once you hold 6 pets (§1 code note).
- **Reuse phone UX that already exists:**
  - traps as tappable world objects with the green harvest bar (`drawNodeHpBar`);
  - a "Requires Trapping Lv N" locked try;
  - trap icons on the Wheel minimap the way nodes are marked;
  - the existing gesture minigame when you check or reset a trap.

### Gaps
- **Not verified (from memory only; the search budget was spent and direct fetches to RuneHQ, the Don't Starve wiki and PlayerEcho were blocked when tried for this section):**
  - In OSRS, a creature that walks into a box trap leaves a "caught" trap that the player must click "Check" to collect, and a failed trap must be re-laid. RuneLite's trap states support the caught/empty part (FULL "a trap that caught something", EMPTY "a trap that is empty"); the "Check" step itself is unverified. [memory — unverified]
  - OSRS kebbit tracking uses a noose wand on burrow trails, and falconry uses a gyr falcon at Piscatoris. [memory — unverified]
  - Herbiboar's final step is to "attack" the tunnel to stun it. [memory — unverified]
  - Pitfalls use a teasing stick to make the creature jump. [memory — unverified]
  - Ark's passive taming means feeding the creature its food while it is hungry and not attacked. [memory — unverified]
  - Pokémon GO has typed lures (Glacial, Mossy, Magnetic, Rainy) that attract particular types. If confirmed, it is the cleanest example of a lure choosing **which** creature comes. [memory — unverified]
  - WoW's gathering and crafting skill-ups turn orange/yellow/green/grey as content falls below your skill, a classic way to stop high levels farming low content. [memory — unverified]
- **Not researched:** how the games that use trap AI keep the cost of checking creatures against traps down.
- A follow-up with a fresh search budget could confirm all of the above.
