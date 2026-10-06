# Pet trapping: arm a trap, then kill it (v2.3.3105)

> Owner, 2026-10-06: *"Research pet trapping mechanics for my game and make a
> master plan."* Then: *"I don't know if what's already in the game is the best
> mechanic I made that as an early demo. It also becomes infeasible if you're
> powerful enough to 1 hit monsters so I need something else."* And, having read
> the first plan: *"I like the direction of just 1. I also want something like
> this: your trapping level governs what level monster you can capture. Catching
> a pet is a rare activity with very little success rate. The best success rate
> for the lowest tier monster should be about 1%. And each trap should cost at
> least 1 wood to make. Pets should be tradable. Your monster can level up but
> not exceed your trapping level."*

This plan comes from a study of the game's code and of how other games let
players catch creatures. The research report behind it is
`docs/research/pet-trapping/other_games_report.md`. The notes behind both, with
every source, are in that folder; start with its README. Nothing here is built
yet. Every choice is now made; the full list is near the end.

## What you decided (2026-10-06)

- **One way to catch a pet: arm a trap, then kill the monster.** The dens from
  the first plan are not being built.
- **Your Trapping level decides the highest-level monster you can catch.**
- **Catching is rare.** At best about 1%, on the lowest stretch's monsters, and
  less on deeper ones.
- **A trap costs at least one log to make.**
- **Pets can be traded.**
- **A pet levels up, but never past your Trapping level.**

And after reading the second plan: *"Do all the recommended courses of action
except the mercy rule for people with bad luck. Just leave the odds exactly the
same for everyone. And yes let people name their pets (as shown in the
recommended)"*.

- **Every recommendation is taken, except the bad-luck rule.**
- **The odds never change with luck.** Two players at the same Trapping level,
  trying the same kind of monster, always have the same chance, however their
  tries have gone.
- **The kinds keep the names in the table below** (Snowling, Gobling and the
  rest), and **each player names their own pet**.

## The short answer

1. **Make box traps** at the Woodworker: one log each.
2. **Target a monster** and tap **TRAP**. The button shows your true odds, a
   fraction of a percent to 1%. It's greyed out, saying what level you need,
   when the monster is above your Trapping level.
3. **Kill it.** One hit or ten, yours or anyone's. If it dies within about 15
   seconds, the trap springs: it shakes 0 to 3 times, then nearly always breaks.
   About once in a hundred tries at best, it snaps shut, and the monster is yours
   as a pet.
4. **The kill pays everyone as normal.** XP, gold, loot and quest credit are
   untouched. Every try pays some Trapping XP, so no try is wasted.
5. **Your pet** follows you, picks up loot, and levels up as you fight, up to
   your Trapping level. You can trade it with other players.

Why this works for your problem:

- **How hard you hit never matters.** The kill is the trigger, so one-hit
  players are fine. Path of Exile made the same fix: its first beast catching
  had players weaken a beast and throw a net within 3 seconds. Players didn't
  like it, and when the feature joined the main game in patch 3.5.0 it became
  capture on the kill.
- **Nobody can steal your try.** Every player who armed the monster and did at
  least 5% of its damage gets their own roll. A strong passer-by who finishes
  your monster helps instead of erasing your chance, and a capture never takes
  anyone's kill rewards.
- **It's small to build.** On the server it's one branch in the kill path,
  which already knows who did the damage. On the phone it's one pop-up button and
  a little animation drawn in code.
- **It ties Trapping to the rest of the game.** Woodcutting supplies the logs and
  the Woodworker makes the traps. Combat brings the monsters, and the market
  carries the pets.

## Why the 20% capture has to go

The audit measured it with the server's own damage roll and monster health
(`server/src/combat.js` `_computeAttackDamage`, `server/src/data.js`
`MONSTER_HP_CURVE`). It assumed damage points in Power and the gear a player
usually has at each level.

**Strong players one-hit what they'd want to catch.** A basic hit kills a
monster outright at least half the time from about these weapon-skill levels:

| Monster level | Great sword | Bow | Staff |
|---|---|---|---|
| 1–2 (the first stretch) | 10 | 14 | 8 |
| 8 | 25 | 30 | 20 |
| 15 | 35 | 52 | 30 |
| 20 | 43 | over 60 | 45 |

- **Specials one-shot even at your own level.** The staff's big bolt does it
  77–94% of the time, and the bow's volley nearly every time up to skill 25.
- **Even at your own level, a basic hit stops inside the 0–20% window only about
  half to nine times in ten**, depending on the weapon and build. Ten levels
  above the monster, a great sword manages it 2–36% of the time.
- **The 20% window can't see** a crit, a splash, a burn or poison tick, another
  player's hit, or the snowman burrowing out of reach at half health.

And the rest of today's capture (`server/src/pets.js`, v2.3.1130):

- **Nobody can use it.** Its only button is in the old bottom toolbar, hidden
  since v14.x (`src/ui/panels/MenuBar.jsx:62-67`). Nothing has sold a trap since
  v2.3.2069 (`server/src/data.js:468-488`).
- **It steals.** Anyone within 200 px can trap a monster that someone else wore
  down, and the trap wipes out everyone's XP and gold for it. The capture never
  reads who did the damage (`pets.js:132-200`).
- **It works from the safe ground**, and **trapping a dungeon boss finishes the
  dungeon** and pays its reward (`server/src/dungeon.js:823-840`).
- **It looks like a kill** on every screen: the death sound plays and a phantom
  remnant pile drops (`src/networking/wsClient.js:990-1017`).
- **Trapping dead-ends at 6 pets.** There's no way to release one, and a full
  list is refused before any XP (`pets.js:150`).
- **The odds follow your combat level, not your Trapping level:** −5 points for
  each level the monster is above you, and +0.5 per Trapping level
  (`pets.js:157-161`).

## What exists today, and what to keep

Keep:

- **The server rolls the dice and spends the trap** (`pets.js`). That pattern
  carries straight over.
- **The loot vacuum.** An active pet picks up loot within 240 px instead of 160,
  checked by the server (v2.3.1200, `docs/specs/pets.md`).
- **Trapping as a skill.**
  - Its Skills card and icon (`public/icons/ui/skill-trapping.webp`, "a simple
    box trap with its door propped on a stick").
  - The Beastmaster's Lodge, which pays 30 coins at Trapping 5, rising to 2,000
    at 150 (`server/src/data.js:821-834`).
  - The leaderboard's Trapping tab.
- **The paw-print pets icon** (`public/icons/ui/evt-pets.webp`) and the farm's
  **Pet House with its fenced pen** (`src/data/gameDisplay.js:851-865`).

Let go:

- **The 20% capture** (`pet_capture`) and its hidden button, along with the old
  browser-only roll behind it (`MenuBar.jsx:262-311`).
- **"Pet combat".** Every 1.5 s your pet takes a bite out of a nearby monster's
  health on your screen only, with damage numbers, and the server never hears of
  it (`src/ui/BroTown.jsx:6613-6662`). Players see fake hits.
- **Evolve and Enchant** in the Pet House. They change only the phone's copy,
  which the server undoes at the next update. Enchant's 50 coins come off only on
  screen (`src/ui/panels/PetHousePanel.jsx:365-397`, `:497-516`).
- **The emoji pet.** Today a pet is a 15 px emoji, about 9 px on a phone at the
  Wheel's zoom, and only you can see it
  (`src/rendering/systems/entityRenderer.js:14937-14993`).

Almost nobody has a pet now, since capture has been out of reach for hundreds of
versions. Anyone who does keeps them: they move into the new record (Phase 1).

## How it plays

### Making traps

- **The Woodworker makes box traps**, one log each, from any log you have:
  - pine (`wood_pine_log`);
  - softwood (`wood_softwood`);
  - hardwood (`wood_hardwood`);
  - cedar (`wood_cedar_wood`);
  - maple (`wood_maple_wood`).

  They're the logs the Wheel's trees drop (`server/src/gathering.js:347`). A new
  **Traps** tab at the Woodworker takes up to 50 at a time, and pays a little
  Woodworking XP.
- **A box trap is an ordinary bag item** (`trap_box`). You can trade it, sell it
  and mail it, and it drops when you die, like logs. The 20-gold `basic_trap`
  that a few old bags still hold counts as one.

### Arming, and the kill

1. **Target a monster**, as you do to attack it. A small **TRAP** button pops
   up with your odds on it, "0.6%" say, and how many traps you carry. It's a
   pop-up like the door's "Enter", not a new fixed button.
2. **Tap it.** A trap mark hangs over the monster for about 15 seconds.
3. **Kill it.**
4. Where it falls, **the trap springs.** It shakes 0, 1, 2 or 3 times, then
   snaps shut (a card shows your new pet) or breaks.

The rules:

- **Who rolls.** Every player who armed the monster and did at least 5% of its
  damage gets their own roll. The 5% is the rule that already decides who gets a
  monster's gold (`server/src/combat.js:1598-1618`). If someone kills it before
  you've hit it at all, you miss that roll and keep your trap. Arm another.
- **The kill pays as now.** XP, gold, loot and quest credit go to everyone who
  helped. Today's capture cancels all of that (`pets.js:186-196`).
- **A trap is used every time it springs**, caught or not. If the mark runs out
  before the monster dies, the trap stays in your bag. So, at 1% odds, a pet
  costs about a hundred logs on average.
- **One armed monster at a time**, within about 300 px (to be tuned for bows and
  staffs), and only out in the lands: not on the safe ground, and not in
  dungeons, which is where the boss hole was.

### Your Trapping level decides what you can catch

- **You can arm a trap only on a monster at or below your Trapping level.** A
  Trapping 12 player can try for anything up to level 12.
- Above it, the TRAP button is grey and says "Requires Trapping 18". Nothing is
  sent to the server, like a resource that's above your level (v2.3.3059).
- The first stretch's monsters are levels 1–2, so a new trapper can start at
  once. The next stretch opens at Trapping 6.
- Your combat level plays no part.

### The odds: rare, and always shown

The odds depend on two things only: **which stretch the monster belongs to**,
and **how far your Trapping level is above the monster's level**. When you first
reach the monster's level you get half the best chance. It rises evenly to the
best chance 20 levels above.

| Stretch | Monster levels | Best chance (Trapping 20+ above) | Tries on average | Chance when just unlocked | Tries on average |
|---|---|---|---|---|---|
| 1 | 1–5 | 1% | 100 | 0.5% | 200 |
| 2 | 6–10 | 0.8% | 125 | 0.4% | 250 |
| 3 | 11–15 | 0.64% | 156 | 0.32% | 312 |
| 4 | 16–20 | 0.51% | 195 | 0.26% | 391 |
| 5 | 21–25 | 0.41% | 244 | 0.2% | 488 |
| 6 | 26–30 | 0.33% | 305 | 0.16% | 610 |
| 7 | 31–35 | 0.26% | 381 | 0.13% | 763 |
| 8 | 36–40 | 0.21% | 477 | 0.1% | 954 |

- **Each stretch down is ×0.8 of the one before.** Pokémon Scarlet and Violet do
  the same: ×0.8 for each five-level band a wild Pokémon sits above what your
  badges allow. It never slams into a floor, so deep monsters are rarer without
  being impossible.
- **The game shows the true number before you tap.** Palworld's capture
  percentage turned out to be inflated (players' datamining found 49% shown was
  18.25% real), and Pokémon GO's hidden rates were called "shady".
- **Nothing else moves them:** not your combat level, your damage, the
  monster's health, or how your earlier tries went.

### No bad-luck rule

- **Every try has the same chance as the last one.** A run of misses changes
  nothing (decided 2026-10-06), and the server keeps no count that could tilt
  the roll.
- **What that means at 1%:**
  - half of players get their catch within 69 tries;
  - 1 in 8 needs more than 200;
  - 1 in 150 needs more than 500.

  Deeper monsters push those numbers further.
- **Your tries are counted for you to see, never to change the odds.** The
  journal (Phase 2) shows your tries and catches at each kind.

### The shakes

The server rolls once, as Pokémon does: four hidden checks, each passed with
the fourth root of your chance. Your phone shows how many passed before the trap
broke. At 1%:

- about 2 tries in 3 break at once;
- about 1 in 5 shakes once;
- about 1 in 15 shakes twice;
- about 1 in 46 shakes three times and still breaks;
- 1 in 100 snaps shut.

So a near miss happens often enough to feel exciting, and it's honest every
time. The shakes, the snap and the break are drawn in code, with no new
pictures.

### Trapping XP

- **Every roll pays Trapping XP**, caught or not, more for a deeper monster. A
  catch pays a large bonus.
- **Monsters far below your Trapping level pay less**, as in RuneScape, where a
  creature gives fixed XP that matters less as you outgrow it.
- **Aim:** an hour of trapping should level Trapping about as fast as an hour of
  woodcutting at the same stretch. This gets tuned in Phase 1 against real rates.
- Trapping XP is what opens deeper monsters, and the Beastmaster's Lodge starts
  paying the day it exists.

### What you catch

The monster itself, tamed and drawn small. Each kind goes by the name below
until its owner gives it one:

| Land | Element | Its monsters | Pet | At levels 21–40 |
|---|---|---|---|---|
| Frost Ridge | frost | Snowman | Snowling | Glacier Snowling |
| Flame Fields | flame | Fire Goblin | Gobling | Cinder Gobling |
| Wind Dunes | wind | Mummy | Mumling | Gilded Mumling |
| Stone Hollows | stone | Rock Monster | Pebbling | Amethyst Pebbling |
| Electric Foundry | storm | Slime | Sparklet | Storm Sparklet |
| Water Caves | water | Fishman | Finling | Coral Finling |
| Poison Forest | venom | Mire Wisp, Bog Lurker | Wisplet, Lurkling | Spectral Wisplet, Shade Lurkling |
| Verdant Wilds | flora | Blue Slime | Dewdrop | Jade Dewdrop |

- **Nine kinds, eighteen with the second stage's colours.** Those are the tints
  the Wheel already uses for monsters past level 20
  (`src/data/wheelStageLooks.js`), so they cost no memory.
- **Later, a golden look of each**, about 1 catch in 50, also just a tint.
- **Each pet has a size.** Big ones get a badge.

### Your pets, and their levels

- **A pet starts at the level of the monster you caught.** That's never above
  your Trapping level, because of the rule above.
- **It levels up while it's out with you**, from a share of the combat XP you
  earn, about a tenth.
- **It stops at your Trapping level.** It starts again when your Trapping level
  rises, so the way to grow your pets is to trap.
- **A traded pet above your Trapping level** works at your Trapping level until
  you catch up, and keeps its own level for when you do.
- **A pet's level shows on its card** and grows it a little on screen. Later it
  sets how strong its ward is (Phase 4).
- **One follows you**, as today. The rest wait in your collection, which holds
  30 to start. The Pet House holds more for gold.
- **Name, set active and release** from a **Pets page** (More → Pets, with the
  paw-print icon). All of it is done by the server and kept.
- **A name** is 2–16 letters, numbers, spaces, hyphens or apostrophes. The
  server trims and checks it, close to a clan name's 3–16 characters
  (`server/src/clans.js:129`).
  - **No emoji.** An emoji in the world's outlined text is a known iPhone Safari
    crash (`src/rendering/nodeLabels.js:28`), and pet names will float over pets.
  - A traded pet keeps its name until its new owner changes it.
- **Pets are never lost**, not when you die, and not in No man's land. Old School
  RuneScape insures every pet, and its killers never get one.

### What pets do

- **Pick up loot** in a wider ring: today's vacuum, kept as it is, and never
  sold. Black Desert's looting pets became something grinders "need four or
  five" of, because loot left on the ground is wasted.
- **Ward** (Phase 4). An active pet from a land takes the edge off that land's
  monster hits on you, more as it levels. The eight lands and the eight element
  effects match one to one (`server/src/monsterstatus.js:82-92`):
  - Snowling: chill
  - Gobling: burn
  - Mumling: gust
  - Pebbling: daze
  - Sparklet: shock
  - Finling: soak
  - Wisplet and Lurkling: poison
  - Dewdrop: hold

  It gives you a reason to collect every land, and it never makes anyone hit
  harder.
- **No chores.** There's nothing to feed, nothing that starves and nothing that
  dies. Other games removed those (WoW's pet happiness, Ultima Online's pets
  going wild).
- **Pets don't fight.**
  - A fighting pet is a second monster for the server to run, and it makes pets
    a must-have in PvP. World of Warcraft's hunter pets pulled monsters off group
    tanks for about 14 years.
  - Today's fake bite goes.
  - If pets ever help in a fight, it should be as an extra on your own hit that
    the server works out (Phase 5, your call).

### Trading

Phase 3. Pets move through the systems that already move valuable things:

- **The trade window**, with the pet held by the server until both sides accept,
  as weapons are today (`trade2wpn:` in `server/src/trade2.js`);
- **the auction house**, as a new kind of listing beside items, weapons and gear
  (`server/src/store.js`);
- **the mail**, for an auction's buyer, or when your collection is full.

What keeps it safe:

- **A pet is only ever made by the server.** It has an id that never changes and
  a short story: who caught it, where, when, and each owner since. Nothing a
  phone says about its pets is ever believed again. Today's join takes up to six
  pets from the phone (`pets.js:110-128`; #830 removes it).
- **It moves between two players in one step on the server**, never copied and
  then deleted. Every pet dupe the research found came through a gifting or bank
  path: Grow a Garden switched gifting off in June 2025, and Pet Simulator X
  deleted duped pets.
- **Armour and shields went this way first.** Gear became tradeable over about
  ten versions (v2.3.2523–v2.3.2551), with an ownership ledger. Pets get a phase
  of their own for the same reason.
- **Two safeguards:**
  - a new pet can't be traded for 24 hours after its catch;
  - the pet that's out with you can't be listed.

### Fair in a shared world

- **Every armed helper rolls for themselves.** Nobody can take another player's
  chance by throwing first or killing first, and nobody loses kill rewards to a
  capture. World of Warcraft (since 2016), Guild Wars 2 and Pokémon GO's raids
  all give everyone who helped their own reward.
- **No captures on the safe ground or in dungeons.**
- **No man's land.** Its rings start at the second stretch, so a trapper there
  can be attacked by players near their level, like anyone. Traps in the bag
  drop as bag items do. Pets never go.

### What it costs and what it pays

- **Logs:** one per try, so about a hundred for a first-stretch pet and several
  hundred for a deep one. That's steady demand for Woodcutting.
- **Gold:** none spent on the catch itself. Pets change hands for gold between
  players, which moves gold rather than making it. Pet House space is a gold
  sink.
- **XP:** Trapping XP on every try, and a little Woodworking XP for every trap
  made.
- **Time:** at 1%, with a strong player killing several first-stretch monsters a
  minute, about half an hour per pet on average. That's a rare activity, as you
  asked, and a pet is worth something because of it.

### On the phone

- **In a fight:** the TRAP pop-up with its odds, grey when the monster is too
  high, the mark over the monster, and the shakes where it falls.
- **At the Woodworker:** the Traps tab.
- **Everywhere:** the card for a new pet, the Pets page in More, and a count of
  your tries at each kind.
- **No new fixed button.** Fixed control slots are full, so TRAP is a pop-up.

### Art and memory

- **The pet sheet.** A tool makes small walking frames of each of the nine kinds
  from the monsters' existing art. The second-stage and golden looks are tints.
  It's the only new art Phase 1 needs, and it replaces the emoji.
- **How big.** The target is 1–3 MB on the phone for all nine, loaded as a plain
  picture rather than drawn onto a canvas. The memory budget has about 8.6 MB of
  room in the art cache and 9.6 MB on the graphics chip at its Flame Fields stop
  (`tools/qa/mp/memory-budget.mjs`), so it should fit. If it doesn't, each kind
  gets its own little sheet, loaded as you near its land, like the monsters'
  looks (CLAUDE.md, the looks-as-you-walk clause).
- **Why not the monsters' own art.** A pet goes wherever you go, so its full art
  would break the budget at the first stop:
  - a snowman's full look is 13–17.5 MB;
  - a fire goblin's is 30–35 MB;
  - a mummy's is 36 MB with its skeleton.

  (`src/rendering/zoneTextures.js:24-26` and `:72-74`,
  `src/rendering/snowmanSprites.js:341-344`.)
- **Later, from you** (a new ART-WISHLIST section): a box-trap icon, and proper
  pet art if you want chubbier proportions than a shrunk monster.

## Phases, smallest first

Each phase ships as its own pull request, or a short series, with its own test
suite, spec and off switch. Each makes sense to players even if the next one
never comes.

Phase 1 builds on two open pull requests:

- **#830** stops a new character bringing pets and skill levels from the
  browser. That matters more now: a forged Trapping 99 would skip the level rule,
  and forged pets would be tradeable.
- **#827** fixes a crash in paying life-skill XP.

| Phase | What players get | Main work | Why in this order |
|---|---|---|---|
| **1. Arm a trap, then kill it** | The Woodworker makes box traps. TRAP on a targeted monster, with true odds and the Trapping-level rule; the mark; a rare roll at the kill for every armed helper; the shakes; Trapping XP on every try. A Pets page (name, set active, release), which the farm's Pet House opens too. Pets drawn from the pet sheet. The old capture, the fake bites, and Evolve and Enchant go, and the Trapping card's words change. | Server: `trapping.js` (making traps, the arm, the roll in the kill path), the `pets:<pid>` record with lasting ids and levels and old pets moved in, `caps.trapping`, `caps.trapcraft` and `caps.petbook` with their off switches, a test suite, `docs/specs/trapping.md`. Phone: the TRAP pop-up, the mark, the shakes, the Traps tab, the Pets page, and the tool that makes the pet sheet. QA `mp-trapping` on a phone. Two PRs: the server first, then the phone. | The whole loop, with no new art from you. Gives Trapping its first real XP. |
| **2. Pets level up** | Pets earn XP while out with you, up to your Trapping level, and grow a little. A journal of every kind: your tries, your catches, your biggest. A Beastmaster beside the Woodworker with a short quest line the server checks: make traps, arm traps, reach Trapping 6. | Pet XP gathered in memory and saved with the character, never a write per kill. A `catch` quest goal. The NPC and his art. | Gives every pet a future, and teaches the loop. |
| **3. Trading** | Pets in the trade window, the auction house and the mail. | A pet lane in the trade window held like weapons; a `pet` listing kind; a `pet` mail kind with "collection full → stays in the mail"; `caps.pettrade` and its switch. | Pets have value once they level. Gear's path shows it needs a phase of its own. |
| **4. Pets that matter** | The land ward, stronger with level. Golden and Big pets with a reveal. Other players see your pet. More Pet House space. | The ward in `monsterstatus.js`, the pet in each player's tick record, Pet House space bought with gold. | Makes the collection worth finishing. |
| **5. Later, your call** | A monthly featured-monster day (better odds that day would bend the same-odds rule, so only with your yes). Sheriff's bounties. Eggs at the farm. A pet's helping bite. Cosmetic pet extras on the supporter pass. | Each its own PR. | Only once the core is loved. |

## Every choice, as decided (2026-10-06)

| Choice | Decided |
|---|---|
| How to catch | Arm a trap, then kill the monster. No dens |
| Which monsters | Only those at or below your Trapping level |
| Best odds | 1% on the first stretch, ×0.8 for each deeper stretch, down to 0.21% |
| How your Trapping level helps | Half the best chance when you reach the monster's level, rising to the best 20 levels above |
| Bad luck | **No rule.** The odds never change with luck, the same for everyone |
| When a trap is used | Every time it springs, caught or not. A mark that runs out keeps the trap |
| A trap | One log of any kind, made at the Woodworker |
| Who rolls in a fight | Players who armed it and did at least 5% of its damage |
| Mark length | About 15 seconds, tuned in play |
| Pet levels | Start at the monster's level, then gain a share of your combat XP while out (about a tenth). Never above your Trapping level |
| A traded pet above your Trapping level | Works at your level until you catch up |
| Trading | Yes: the trade window, the auction house and the mail, with a 24-hour hold after a catch |
| Losing pets | Never, not even in No man's land |
| Golden pets | About 1 catch in 50 |
| Collection | 30 to start, more for gold at the Pet House |
| Names | Each kind as in the table above; each player names their own pet (2–16 letters, numbers and spaces, no emoji) |
| The $2 supporter pass | Cosmetic only. Never traps, odds or pets |

## Where this goes against the research, and how the plan answers it

- **Rare, pure-luck catches drew the loudest complaints the research found.**
  Ni no Kuni players called its befriending "completely random", and MapleStory
  players reported 20–60 minutes per familiar card. You want catching rare and
  the same for everyone, so the plan keeps your 1% with no bad-luck rule. About
  1 player in 8 will need more than 200 tries for a first-stretch pet. The plan
  softens that in four ways:
  - the true odds on the button;
  - a count of your tries at each kind;
  - honest near misses in the shakes;
  - Trapping XP on every try, so no try is wasted.
- **The research suggested keeping wild-caught pets untradeable**, as World of
  Warcraft does, because markets are where dupes and real-money trading happen.
  You want them tradeable. The plan makes that safe the way armour and shields
  were made safe: server-made pets with lasting ids, moved in one step, in a
  phase of their own, with a 24-hour hold after a catch.
- **The research suggested using up a trap only on a catch.** Your "each trap
  costs a log" makes a trap a cost per try. That's a steady pull on Woodcutting,
  about a hundred logs for a first-stretch pet.

## For the builder

Everything below follows `docs/ARCHITECTURE-HANDOFF.md`. The audit's checklist,
with receipts, is §5 of
`docs/research/pet-trapping/codebase_skills_items_economy_conventions.md`.

### The pet record

```
pets:<pid> = {
  v: 1, cap: 30, active: 'p_7f3a9c', moved: true,
  list: [ { id: 'p_7f3a9c', home: 'ember', look: 'fireGoblin', stage: 1,
            gold: false, size: 1.04, name: 'Gobling', lv: 4, xp: 120,
            at: 1791273600000, caughtBy: '<pid>', owners: 1,
            tradeAfter: 1791360000000 } ],
  journal: { 'ember.fireGoblin.1': { tries: 87, n: 1, gold: 0, big: 1.04 } }
}
```

- **Its own storage key**, registered in the handoff's table (rules 1 and 2;
  precheck check 5 enforces it).
  - One read at join, before anything reads pets.
  - Versioned: a worker refuses a newer `v` whole, so a rollback can't destroy
    it, as the farm branch does with `FARM.V`.
  - Deleted by `_resetCharacterData`.
  - Not in the daily `rpgsnap:`, which the operator should know.
- **Ids are made by the server and never change.** They're unique across all
  players, so a pet can be followed from owner to owner. Today's ids are made
  fresh at every join (`pets.js:90`).
- **The record is the only proof of ownership.** Only the server writes it; no
  list from a phone is ever adopted. A trade moves the pet between two records in
  one synchronous run, with no await between the two writes.
- **Moved in once** from `lifeSkills.pets` (stamp `moved`), the kind guessed from
  archetype and element, with `lv` set to the stored level capped at the
  player's Trapping level. This assumes #830 has removed the browser's pet import
  at join.
- **`tries` is kept in memory and saved with the character**, not written on
  every miss. It never changes the odds, so a few lost counts after a crash are
  harmless. A catch writes at once.

### Making traps

- **`make_traps {log, count}`**, shaped like smelting (`server/src/smelting.js:45-105`):
  - the log looked up as the table's own key;
  - `count` clamped to 1–50, then to the logs on hand;
  - logs taken, `trap_box` given;
  - a little Woodworking XP;
  - `_saveRpg`;
  - a private `make_traps_result`.
- **A new item key, `trap_box`.** Its prefix keeps the bag from filing it under
  fish or bows (the bag sorts by name). Wire it into the bag's names and
  pictures.
- **One `basic_trap` becomes one `trap_box`** at join, once.

### The arm and the roll at the kill

- **`trap_arm {monsterId}`.** Every gate is checked before anything is marked:
  - the cap and switch;
  - the monster is alive and can take damage (`_monsterDamageable`);
  - it's in `wheel`, not a dungeon zone, and not standing on the safe ground;
  - it's within ~300 px;
  - **its level is at or below the player's Trapping level**;
  - a `trap_box` in the bag;
  - no other live mark;
  - at most 20 arms a minute.

  Then `m._armedBy` (a `Map` of player id → `until`) and a private `trap_armed
  {monsterId, until, chance}`.
- **The roll** sits in `_resolveMonsterKill`, before `m.dmgByPlayer` is reset
  (`server/src/combat.js:1800`). For each armed player whose mark is live, whose
  share is at least 0.05 (the gold rule, `:1598-1618`), and who still has a
  trap:
  - take one `trap_box`;
  - work out the chance from the odds table alone: no adjustment for luck
    (owner, 2026-10-06);
  - roll four checks at the chance's fourth root, which gives the shakes;
  - **on a catch:** write `pets:` first, then `_saveRpg`, in one synchronous run;
  - **on a miss:** count it in memory.

  Then pay Trapping XP, last, inside a try. The kill's own payouts are untouched.
- **Clearing the mark.** The respawn path (`server/src/index.js:1880-1932`) must
  clear `_armedBy`, as it already clears `dmgByPlayer`.
- **The blue slime's death** is deferred by its burst, and replays with the same
  killer (`combat.js:1563`). The mark must outlive that delay, or be judged at the
  first, deferred call.
- **`_addLifeSkillXp` throws on main** on a skill stored in a broken shape. The
  farm branch (#827) fixes it, and the farm's "one seed, 270 herbs a minute" bug
  was exactly this.
- **Catches per hour are capped** like the harvest cap (`server/src/botfp.js:148`).

### Pet XP

- **A share of the combat XP each kill pays** to a player with an active pet, in
  memory (`ps._petXpPending`). It's folded into `pets:` at the next character
  save, or on disconnect, never written per kill. The audit's warning: rows
  written per kill were the regen mistake (handoff rule 4).
- **The level is capped at the owner's Trapping level.** No XP builds up while
  the pet is at the cap.

### Trading (Phase 3)

- **The trade window:** a pet lane held in storage while the trade is open, like
  the weapon lane (`trade2wpn:<pid>:<seq>`, `server/src/trade2.js:380-487`).
- **The auction house:** a `pet` kind beside `item`, `weapon` and `gear`
  (`server/src/store.js`), with a sell check. The pet must be owned, not active,
  past `tradeAfter`, and not in another trade.
- **The mail:** a new `pet` arm in `_applyCreditToPs`, refusing when the
  collection is full so the pet stays queued. Today an unknown kind is silently
  destroyed (`server/src/inbox.js:287`).
- **Deterministic opIds** for every payout (opid-audit).

### Messages

| Direction | Type | Payload | Notes |
|---|---|---|---|
| phone → server | `make_traps` | `{log, count}` | explicit router case plus a shim passthrough line (TRAPS #18) |
| server → phone | `make_traps_result` | `{made, log, xp}` | private |
| phone → server | `trap_arm` | `{monsterId}` | explicit router case plus a shim passthrough line |
| server → phone | `trap_armed` | `{monsterId, until, chance}` | private |
| server → phone | `trap_result` | `{monsterId, caught, shakes, pet?, xp, tries}` | private |
| phone → server | `pet_active`, `pet_name`, `pet_release` | `{id}`, `{id, name}`, `{id}` | a name is 2–16 letters, numbers, spaces, `-` or `'`, trimmed by the server; no emoji (an iOS crash in outlined text) |
| server → phone | `pets_state` | the record | private; at join and after each change |

Every server-sent type goes in `PRIVILEGED_EVENTS` (wire-audit checks it).
`pet_capture` refuses with `retired`, and `pet_capture_result` stays privileged.

### Caps and switches

- **`caps.trapping`** (the arm and the roll), **`caps.trapcraft`** (making
  traps), **`caps.petbook`** (the record's actions), and in Phase 3
  **`caps.pettrade`**.
  - All lower case.
  - Each has a handler-side check reading `_liveFlags`, the smelting shape
    (`server/src/smelting.js:59-62`; TRAPS §117).
  - Today's `caps.pets` has no switch that works: un-advertising it brings back
    the browser's own roll.
- **In `CAP_GATES`** (precheck check 12). **Never in `SERVER_READY_CAPS`** in the
  same PR (precheck check 13).

### Tests

- **`server/test/trapping.test.mjs`**, on a movable clock:
  - every refusal costs nothing;
  - the Trapping-level rule at the boundary (equal allowed, one above refused);
  - making traps: the count clamp, a forged log key;
  - the mark expiring, with the trap kept;
  - a roll at a kill landed by someone else;
  - the 5% rule;
  - the kill's payouts unchanged;
  - one trap used per roll;
  - the slime's deferred death;
  - no dungeon or safe-ground arming;
  - the odds table at every stretch;
  - the odds unchanged after a long run of misses;
  - the shakes' split, with `Math.random` stubbed;
  - pet XP capped at Trapping level;
  - old pets moving in;
  - release, naming and set active;
  - a name with an emoji, too long, or empty, refused;
  - `__proto__` as a monster id, a log or a pet id;
  - in Phase 3: a trade that fails halfway, a full collection, and a pet listed
    twice.
- **Mirror-audit:** the odds table, the name rule and the trap recipe, between
  server and phone.
- **QA `mp-trapping` on a phone:**
  - make traps;
  - arm one and kill;
  - see the shakes, with a dev switch forcing a catch;
  - open the Pets page;
  - see the follower drawn from the pet sheet;
  - plus `mp-membudget` with an active pet out.

## Things found in the code along the way

These are real today, whatever is decided above. Each has its file and line in
the audit notes.

1. **Fake pet bites.** Your pet "hits" monsters on your screen only, with damage
   numbers, and can make a monster's bar read lower than the server's
   (`src/ui/BroTown.jsx:6613-6662`).
2. **Pets minted at join.** A player with no pets on the server can bring six of
   any kind at level 100, on every join (`pets.js:110-128`). PR #830 removes it.
3. **Life-skill levels taken from the browser** on a first join, with no cap
   (`server/src/join.js:853`). PR #830 fixes it.
4. **`_addLifeSkillXp` throws** on a skill stored as a number or string, after
   paying (`server/src/gathering.js:487-499`). The farm branch fixes it (#827).
5. **The 20% capture's holes**: kill-steal, safe ground, the dungeon boss
   (above). They're out of reach today, and they go with the capture.
6. **Verdant pets lose their element** at the next join: `'flora'` is missing
   from `PET_ELEMENTS` (`pets.js:69`).
7. **A pet forgets what it was.** The record keeps only the archetype, so a fire
   goblin, a storm slime, a blue slime and a mire wisp all become the same 🟢 pet,
   and a rock monster and a fishman the same 🪨 (`pets.js:170-181`).
8. **A capture looks like a kill**, with the death sound and a phantom remnant
   pile (`wsClient.js:990-1017`).
9. **After a teleport your pet walks back** from where it was, at 2 px a frame,
   which takes minutes across the Wheel (`BroTown.jsx:6466-6481`).
10. **No real off switch for pets.** `pets: false` brings back the browser's own
    roll, and `petLoot` is camelCase, so the admin route can't set it (TRAPS
    §117).
11. **Everyone without a pet shows a fake "Frost Fox"** on their profile card
    (`src/ui/panels/playerProfile.js:58`).
12. **Stale words:**
    - "Need a trap! (Vendor sells them)" (`src/networking/gameEvents.js:4248`);
    - "No pets yet ... tap 🪤!", which points at the hidden button
      (`PetHousePanel.jsx:153`);
    - the Trapping card's "Set traps for small creatures and collect the catch"
      (`src/ui/mobile/sheet/skillsModel.js:55`), which matches neither today's
      capture nor this plan.
13. **The Beastmaster Kai quests are dormant**, and checked by the browser
    (`src/data/gameSystems.js:7088-7154`). Naming any new NPC "Beastmaster Kai"
    would switch them back on as they are (`src/data/gameDisplay.js:5549-5553`).
14. **A pet's pickup ring is a small edge on death piles**, including in No man's
    land: 240 px against 160 once the owner's window passes
    (`server/src/index.js:4247-4300`).
