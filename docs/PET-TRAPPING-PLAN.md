# Pet trapping: two ways to catch a pet, and neither looks at health (v2.3.3105)

> Owner, 2026-10-06: *"Research pet trapping mechanics for my game and make a
> master plan."* And then: *"I don't know if what's already in the game is the
> best mechanic I made that as an early demo. It also becomes infeasible if
> you're powerful enough to 1 hit monsters so I need something else."*

This plan comes from a study of the game's code and of how other games let
players catch creatures. It follows the research report
`docs/research/pet-trapping/other_games_report.md`. The notes behind both, with
every source, are in that folder; start with its README. Nothing here is built
yet. It needs your choices, listed near the end.

## The short answer

**Take capture off the health bar.** Every capture rule that fails a player who
kills in one hit waits on how much health the creature has left:

- yours (20%);
- Monster Hunter's;
- World of Warcraft's battle pets (35%);
- Path of Exile's old nets.

Every rule that never asks about health survives.

So catch pets in two ways, and neither cares how hard you hit:

1. **In a fight: arm a trap, then kill it.**
   - Target any monster, at any health, and tap TRAP. It's marked for about 12
     seconds.
   - If it dies while marked, whoever lands the blow, you get your own roll to
     keep it. So does every other player who armed it and did at least 5% of its
     damage.
   - The kill still pays XP, gold, loot and quest credit to everyone, as now.
     The pet is extra.
   - The trap is used up only when you catch something. Every miss makes your
     next try at that kind easier.
2. **At a den: set a trap and step back.**
   - Every land gets dens, marked on the minimap like the resource spots.
   - Set a box trap, step back, and a young one creeps out to the bait.
   - Your Trapping level, your trap and your bait set the odds. This is where
     Trapping becomes a full life skill, like Mining and Fishing.

Both end the same way:

- The server rolls, and the game shows the true odds before you tap.
- The trap shakes once, twice, three times, then snaps shut or breaks.
- What you catch becomes a pet, drawn small, that follows you and picks up loot,
  as pets do today.
- Later it shields you from its own land's element, grows as you play together,
  and fills a journal of every land's creatures.

Why two ways, and why these two:

- **Fighters and trappers both get pets**, and neither has to do the other's
  thing.
- **The fight lane is Path of Exile's fix for exactly your problem.** Its beast
  catching first had players lower a beast's health and throw a net within 3
  seconds. Players didn't like it. When the feature joined the main game in patch
  3.5.0, it became capture on the kill. On a phone that's one tap. On the server
  it's one branch in a kill path that already knows who did the damage.
- **The den lane is RuneScape's Hunter skill**, the best-known trapping skill.
  Your Hunter level alone decides what you can catch, how many traps you run and
  your odds, and no fight is involved.
- **Both are fair in a shared world.**
  - In a fight, every player who armed the monster and helped gets their own
    roll. A strong passer-by who finishes your monster adds a helper instead of
    erasing your chance.
  - At a den, each young one is drawn only for its trapper.
- **Both are built from parts the game already has:**
  - the kill path's damage shares, the same 5% rule that decides who gets gold;
  - the resource spots' bake, labels, minimap marks and level steps of 5;
  - the attack button, which already turns into HARVEST next to a resource and
    can turn into TRAP next to a den;
  - monsters already ignore a player who's harvesting, so they can ignore one
    setting a trap;
  - the Trapping skill's card, icon, guild (the Beastmaster's Lodge) and
    leaderboard tab, which only lack a way to earn XP.
- **Both are light on the phone.** Pets are drawn from one small sprite sheet
  made from the monsters' own art, a few MB. A full monster's art costs 13 to 36
  MB, and a pet goes everywhere you go.

### The other ways, and why not

| Way | Works when you can one-hit? | Fair with others nearby? | Fits a phone? | Building it | Verdict |
|---|---|---|---|---|---|
| **Arm a trap, then kill it** | Yes: the kill is the trigger | Yes: every armed helper rolls | Yes: one tap | Small: a mark on the monster and a branch on the kill path | **Lane 1** |
| **Dens: set a trap, step back** | Yes: nothing is fought | Yes: each young is its trapper's alone | Yes: tap TRAP, step back, watch | Medium: dens baked like resource spots, and a timeline per trap | **Lane 2** |
| **A harmless snare you hold for a few seconds** (WoW's 6-second Tame Beast, Black Desert's lasso) | Yes | No: a passer-by's swing can finish it mid-hold | OK | Medium: monsters can't be held in place today | No |
| **A capture bar that fills as you hit, while it can't die** (Cassette Beasts) | Yes, and power helps | Mixed: it's undying for everyone else meanwhile | OK | Large: every damage path needs an "only down to 1 HP" rule | Maybe later, for bosses |
| **Eggs that drop from kills** (like MapleStory's familiar cards) | Yes | Yes, if only the killer rolls | Very | Small | Later, as an extra for the farm. Pure-luck drops drew the loudest complaints in the research, and they reward kill-farming bots |
| **Today's: weaken it to 20%, then trap it** | No (next section) | No: anyone can trap what you wore down | Poor: nothing shows the 20% line | Built, but nobody can reach it | Retire |

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
  each level the monster is above you, +0.5 per Trapping level (`pets.js:157-161`).
- **A miss burns the 20-gold trap.** At the 10% floor a pet costs 10 traps, or
  200 gold.

## What exists today, and what to keep

Keep:

- **The server rolls the dice and spends the trap** (`pets.js`). That pattern
  carries straight over.
- **The loot vacuum.** An active pet picks up loot within 240 px instead of 160,
  checked by the server (v2.3.1200, `docs/specs/pets.md`).
- **Trapping as a skill:**
  - its Skills card and icon (`public/icons/ui/skill-trapping.webp`, "a simple
    box trap with its door propped on a stick");
  - the card already says "Set traps for small creatures and collect the catch"
    (`src/ui/mobile/sheet/skillsModel.js:55`), which is the den lane exactly;
  - the Beastmaster's Lodge, which pays 30 coins at Trapping 5, rising to 2,000
    at 150 (`server/src/data.js:821-834`);
  - the leaderboard's Trapping tab.
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

### In a fight: arm a trap, then kill it

1. Carry a **box trap**. The Feed & Seed sells them.
2. **Target a monster**, as you do to attack it. A small **TRAP** button pops up
   with your odds on it, "62%" say. It's a pop-up like the door's "Enter", not a
   new fixed button.
3. **Tap it.** A trap mark hangs over the monster for about 12 seconds.
4. **Kill it**: one hit or ten, yours or anyone's.
5. Where it falls, **the trap shakes** 1, 2 or 3 times. **Snap**: a card shows
   your new pet, with "New!" the first time. **Break**: your next try at that
   kind is easier.

The rules:

- **Who rolls.** Every player who armed the monster and did at least 5% of its
  damage gets their own roll. The 5% is the rule that already decides who gets a
  monster's gold (`server/src/combat.js:1598-1618`). If someone kills it before
  you've hit it at all, you miss that roll but keep your trap. Arm another.
- **The kill pays as now.** XP, gold, loot and quest credit go to everyone who
  helped. Today's capture cancels all of that (`pets.js:186-196`).
- **The trap is used up only on a catch**, the way Don't Starve uses bait only
  when something is caught. A miss costs only time.
- **One armed monster at a time**, within about 300 px, and only out in the
  lands. Not on the safe ground, and not in dungeons, which is where the boss
  hole was.
- **Trapping XP on every roll**, more for a catch. The amount is fixed per
  stretch, and less for stretches far below your level.

### At a den: set a trap and step back

1. Carry a **box trap**. Bait is optional at first, and raises the odds.
2. Open the minimap. **Dens show as paw prints.** Your quest's gold road can
   point at the nearest one you can use.
3. Walk up. The den's **label** shows a trap picture and its Trapping level,
   grey if yours is short, the way resource labels do.
4. With no monster close, the attack button reads **TRAP**. Tap it. Your bro
   kneels and sets the trap, and monsters ignore you while you do, as they do
   while you harvest.
5. A **ring** appears round the trap: **step back** past it. While you're inside
   it, the young won't come out. Step back in later and it ducks into the den
   again, with nothing lost.
6. After a few seconds **a young one creeps out**, sniffs the bait and steps in.
7. **The trap shakes**, then snaps or breaks, as in a fight.
8. As your level grows, **set traps at more than one den** and walk your own
   little trap line.

An attempt takes about 15–25 seconds. That's slower than a harvest, but you can
watch two or three traps at once.

**Dens:**

- **Two dens in every stretch of every land**, all eight stretches (levels
  1–40): 128 in all. They're baked with the monsters' places and the resource
  spots, by the same rules: never on a road, in water or on the safe ground, and
  at least 300 px from any monster's place
  (`tools/world/bake-wheel-spawns.mjs:391-482`).
- Each den is **home to one kind of young**, named on its label.
- **Deep dens sit among deep monsters.** Your fighting doesn't change the catch,
  but you still have to get there, and stand guard while you wait.
- **Below a stretch's Trapping level, a tap plays a locked try**, as a locked
  resource does (v2.3.3059). The trap goes down, the young sniffs and turns
  away, and the den says "Requires Trapping 10". Nothing is sent to the server.
- **Drawn in code** until you make pictures for them (a burrow ringed with the
  land's stones, snow, sand or moss), the way the dungeon mouths are
  (`src/rendering/wheelDoors.js`).

**Traps and bait:**

- **The box trap is reusable**, like the axe and the rod, and **kept when you
  die**, like them (`server/src/gathering.js:577-605`).
- **Traps out at a den at once:** 1 at Trapping 1, 2 at 10, 3 at 20, 4 at 30.
  RuneScape allows 2 at level 1, rising to 5 at level 80. Optionally, **one more
  inside No man's land**, as RuneScape gives one more in its PvP Wilderness.
- **Bait is used up only when a young takes it** (a catch or an escape), never
  when you set the trap. So lifting a trap, or a server restart, costs nothing.
  - **Plain bait** from the Feed & Seed, a coin or two.
  - **Land bait** (Phase 3), cooked at the Cookhouse from two raw fish or crops
    and one of the land's shards. It adds more to the odds, and the dens at
    levels 21–40 need it.
  - **Each kind of young has a favourite.** You find it by trying, and it's then
    written on that kind's journal page.

### Trapping levels

Each stretch asks for a Trapping level, in steps of 5 like the resources
(`server/src/gathering.js:150`). It applies to both lanes: to arm a trap on a
monster there, or to set one at a den there.

| Stretch | Monster levels | Trapping level |
|---|---|---|
| 1 | 1–5 | 1 |
| 2 | 6–10 | 5 |
| 3 | 11–15 | 10 |
| 4 | 16–20 | 15 |
| 5 | 21–25 | 20 |
| 6 | 26–30 | 25 |
| 7 | 31–35 | 30 |
| 8 | 36–40 | 35 |

### The odds, always shown

- **Your Trapping level against the stretch.** These starting numbers are meant
  to be tuned:
  - **At a den:** 45% at the stretch's own level. Each level above adds 1.5
    points, up to 90%. RuneScape's catches start at about 45–55% at their unlock
    level and near 90% some 35 levels later.
  - **On a kill:** 30% at the stretch's level, rising the same way, up to 60%.
    It's lower because kills come much faster than den visits.
- **Bonuses:**
  - **Arm a monster before it has noticed you:** +10 points. The server already
    knows who each monster is after. Pokémon Legends: Arceus pays ×1.75 for a
    "back strike" on a Pokémon that hasn't seen you.
  - **Bait, at a den:** land bait +10, the favourite +20.
  - **A better trap** (Phase 3): +5 or +10.
- **Pity.** Every miss in a row on a kind adds 10 points to your next try at that
  kind, up to 30, and a catch resets it. World of Warcraft's pet traps add 20–30%
  after each failure.
- **Never in the odds:** your combat level, your damage, or the creature's
  health.
- **The true number, before you tap.** Palworld's capture percentage turned out
  to be inflated: players' datamining found 49% shown was 18.25% real. Pokémon
  GO's hidden rates were called "shady". An honest near miss is information; a
  staged one is manipulation.

### The shakes

The server rolls once and tells your phone how many shakes to show: 3 and a snap
for a catch, and 0–2 and a break for a miss, with more shakes the closer it was.
Pokémon's own capture routine works this way: it passes the number of checks the
ball survived to the animation. The shakes, the snap and the break are drawn in
code, with no new pictures.

### What you catch

From a den you catch a young one, and from a fight the monster itself, tamed.
Either way it's drawn small and becomes the same pet:

| Land | Element | Its monsters | Pet (names for you to choose) | At levels 21–40 |
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
- **Later, a rare golden look of each**, also just a tint. Make it rare enough
  to chase, but not shiny-hunting rare: a player with two hours a day needs odds
  nearer 1 in 50 than 1 in 4,000.
- **Each pet has a size.** Big ones get a badge and a spot on the leaderboard.

### Your pets

- **One follows you**, as today. The rest wait in your collection.
- **Your collection holds 30 to start.** The Pet House holds more for gold, a gold
  sink, never real money.
- **Set active, rename and release** from a **Pets page** (More → Pets, with the
  paw-print icon). All of it is done by the server and kept.
- **Release a spare and it leaves treats** your other pets like (Phase 4), so
  catching the same kind again is never wasted.
- **Pets are never lost**: not when you die, and not in No man's land. Old School
  RuneScape now insures every pet, and its killers never get one.

### What pets do

- **Pick up loot** in a wider ring: today's vacuum, kept as it is, and never
  sold. Black Desert's looting pets became something grinders "need four or
  five" of, because loot left on the ground is wasted.
- **Ward** (Phase 4). An active pet from a land takes the edge off that land's
  monster hits on you. The eight lands and the eight element effects match one
  to one (`server/src/monsterstatus.js:82-92`):
  - Snowling: chill
  - Gobling: burn
  - Mumling: gust
  - Pebbling: daze
  - Sparklet: shock
  - Finling: soak
  - Wisplet and Lurkling: poison
  - Dewdrop: hold

  So you bring a Frost Ridge pet to Frost Ridge. It gives you a reason to
  collect every land, and it never makes anyone hit harder.
- **Grows up** (Phase 4). Its bond rises while it's out with you and when you
  give it treats, with a daily cap. As it does, it gets a little bigger and its
  ward a little stronger.
  - There's nothing to feed, nothing that starves and nothing that dies.
  - Other games removed those care chores (WoW's pet happiness, Ultima Online's
    pets going wild), and they stay out.
  - Nothing about a pet fades while you're away, which on a two-hour day is most
    of the time.
- **Pets don't fight.**
  - A fighting pet is a second monster for the server to run, and it makes pets a
    must-have in PvP. World of Warcraft's hunter pets pulled monsters off group
    tanks for about 14 years.
  - Today's fake bite goes.
  - If pets ever help in a fight, it should be as an extra on your own hit that
    the server works out (Phase 6, your call).

### Fair in a shared world

- **In a fight, every armed helper rolls for themselves.** Nobody can take
  another player's chance by throwing first or killing first, and nobody loses
  kill rewards to a capture. World of Warcraft (since 2016), Guild Wars 2 and
  Pokémon GO's raids all give everyone who helped their own reward.
- **At a den, your young is yours.** It's drawn only on your screen and only you
  can catch it. Two players at one den each run their own trap. Nobody can
  steal it, kill it or crowd you out, and this world is one room, with no other
  server to hop to when a spot is crowded.
- **Your trap is yours too.** Other players don't see your den trap at first.
  A later phase may show traps, but never the young.
- **No captures on the safe ground or in dungeons.** The dungeon-boss hole goes
  with the old capture.
- **No man's land.** Its rings start at the second stretch, so a trapper there
  can be attacked by players near their level, like anyone.
  - Bait in the bag drops as bag items do.
  - The box trap stays, because it's a tool.
  - Pets never go.

### What it costs and what it pays

- **Gold spent:** box traps (one used per catch in a fight), plain bait, Pet House
  space, better traps.
- **Materials used:**
  - fish, crops (#827), shards and burnt dust (which nothing uses today) go into
    bait;
  - wood and bars go into better traps.
- **Gold earned:** none directly. Pets aren't sold to Diego and aren't traded,
  at least for now.
- **XP:** a den catch is worth about two harvests from the same stretch, and a
  roll in a fight less, since kills come faster. Both get tuned in Phase 1 and 2
  against real gathering rates. The Beastmaster's Lodge starts paying the day
  Trapping XP exists.

### On the phone

- **In a fight:** the TRAP pop-up with its odds, the mark over the monster, and
  the shakes where it falls.
- **At a den:** dens on the minimap, their labels, the TRAP word on the attack
  button, the ring, the young, the shakes.
- **Everywhere:** the card, the Pets page in More, and the Feed & Seed's counter.
- **No new fixed button.** Fixed control slots are full. The fight's TRAP is a
  pop-up, and the den's TRAP lives on the attack button the way HARVEST does. A
  monster close by still wins the attack button (v2.3.2270).

### Art and memory

- **The pet sheet.** A tool makes small walking frames of each of the nine kinds
  from the monsters' existing art, and the second-stage and golden looks are
  tints. It's the only new art Phase 1 needs, and it replaces the emoji. Pets,
  and the young at a den, both draw from it.
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
  - a mummy's is 36 MB, with its skeleton.

  (`src/rendering/zoneTextures.js:24-26` and `:72-74`,
  `src/rendering/snowmanSprites.js:341-344`.)
- **Later, from you** (a new ART-WISHLIST section): a picture for each land's
  den, the box trap, bait icons, and proper pet art if you want chubbier
  proportions than a shrunk monster.

## Phases, smallest first

Each phase ships as its own pull request (or a short series), with its test
suite, a spec and an off switch. Each one makes sense to players even if the next
one never comes.

Phase 1 builds on two pull requests that are open now:

- **#830**: a new character no longer brings pets or skill levels from the
  browser.
- **#827**: the farm. It fixes a crash in paying life-skill XP, and it rebuilds
  the Feed & Seed's window, where traps and bait will be sold.

| Phase | What players get | Main work | Why in this order |
|---|---|---|---|
| **1. Arm a trap, then kill it** | The Feed & Seed sells a box trap. TRAP on a targeted monster, the mark, a roll at the kill for every armed helper, the shakes. A Pets page (set active, rename, release), which the farm's Pet House opens too. Pets drawn from the pet sheet, not an emoji. The old capture, the fake pet bites and the Pet House's Evolve and Enchant go. | Server: `trapping.js` (the arm, and the roll in the kill path), the `pets:<pid>` record with old pets moved in, `caps.trapping` and `trapping: false`, a test suite, `docs/specs/trapping.md`. Phone: the TRAP pop-up, the mark, the shakes, the Pets page, a Traps tab in the Feed & Seed window, and the tool that makes the pet sheet. QA `mp-trapping` on a phone. Two PRs: the server first, then the phone. | The smallest change that fixes the one-hit problem, and it makes pets reachable again. No new art from you. |
| **2. Dens** | Dens on the minimap, TRAP at a den, the young, the ring, more traps out as you level. | `WHEEL_DENS` baked, each player's den timeline on the server, den drawing, labels, minimap marks. | Makes Trapping a full life skill. |
| **3. Bait, traps and the Beastmaster** | Land bait from the Cookhouse, better traps from the Woodworker, favourite baits, a Journal of every kind, and a Beastmaster beside the Feed & Seed with a quest line the server checks. | Recipe tables shaped like smelting (`server/src/smelting.js`), a `catch` quest goal on the server, the NPC and his art, the journal. | Depth, once both lanes are proven. |
| **4. Pets that matter** | The land ward, bond and growing up, treats, golden and Big pets with a reveal, other players seeing your pet, and more Pet House space. | The ward in `monsterstatus.js`, bond counted by the server, the pet in each player's tick record, Pet House space bought with gold. | Makes the collection worth finishing. |
| **5. While you're away** | Overnight traps at dens: leave one with bait, come back hours later. Mostly common catches (treats, or materials for the forge and Cookhouse), sometimes a young one. Capped per day. Perhaps eggs hatching at the farm. | The farm branch's lazy clock (`readyAt`, checked when you look) and a `traps:<pid>` record. | Suits short sessions and the two-hour day. Pets stay rare while catches stay common, as in RuneScape. |
| **6. Later, your call** | Trading pets. A featured creature each month in one land. Sheriff's bounties. A pet's helping bite. A capture bar for bosses. Cosmetic pet extras on the supporter pass. | Each its own PR. | Only once the core is loved. |

## Decisions only you can make

| Decision | Choices | Recommendation |
|---|---|---|
| The lanes | both; the fight only; dens only; keep the 20% capture | **Both, the fight first** |
| Who rolls in a fight | armed and did 5% of the damage; armed is enough | **Armed and 5%.** It's the gold rule, and stops players arming what others kill |
| Mark length | about 12 s; longer; shorter | **About 12 s**, tuned in play |
| Kill odds against den odds | lower on kills (30–60%); the same (45–90%) | **Lower on kills**, since kills come faster |
| Pet names | the table above, or your own | Yours to name |
| Old pets | keep them, moved to the new record; start fresh | **Keep them** |
| Bait | optional at first, needed at levels 21–40; always needed | **Optional at first** |
| Den traps out at once | 1–4 by level, +1 in No man's land; no extra | **1–4, +1 in No man's land** |
| Collection size | 30 plus gold expansions; unlimited; 6 | **30 plus expansions** |
| What pets do | loot, land ward and growing up; also fight; cosmetic only | **Loot, ward, growing up. No fighting** |
| Can pets be lost | never; in No man's land | **Never** |
| Trading pets | not now; later, with a ledger and limits | **Not now** |
| Golden pets | yes, about 1 in 50; rarer; none | **Yes, about 1 in 50** |
| The $2 supporter pass | cosmetic only; also more collection space | **Cosmetic only.** Space at most, never traps, odds or eggs |
| Eggs from kills | later at the farm; never | **Later, if wanted** |
| Others see your den trap | later; never | **Later, and never the young** |

## For the builder

Everything below follows `docs/ARCHITECTURE-HANDOFF.md`. The audit's checklist,
with receipts, is §5 of
`docs/research/pet-trapping/codebase_skills_items_economy_conventions.md`.

### The pet record

```
pets:<pid> = {
  v: 1, nextId: 7, active: 3, cap: 30, moved: true,
  list: [ { id: 3, home: 'frost', look: 'snowman', stage: 1, gold: false,
            size: 1.04, name: 'Snowling', bond: 0,
            at: 1791273600000, by: 'kill' } ],
  journal: { 'frost.snowman.1': { n: 3, gold: 0, big: 1.12 } },
  pity: { 'frost.snowman': 1 }
}
```

- **Its own storage key**, registered in the handoff's table (rules 1 and 2;
  precheck check 5 enforces it).
  - One read at join, before anything reads pets.
  - Versioned: a worker refuses a newer `v` whole, so a rollback can't destroy
    it, as the farm branch does with `FARM.V`.
  - Deleted by `_resetCharacterData`.
  - Not in the daily `rpgsnap:`, which the operator should know.
- **Ids from the record's own counter**, so they stay put. Today's are made fresh
  at every join (`pets.js:90`), which rules out addressing a pet by id.
- **Moved in once** from `lifeSkills.pets` (stamp `moved`), the kind guessed from
  archetype and element, with `by: 'legacy'`. This assumes #830 has removed the
  browser's pet import at join. Today that import mints up to six pets on every
  join of a player who has none (`pets.js:110-128`).
- **Pity is per kind**, shared by both lanes.

### Lane 1: the arm and the roll at the kill

- **`trap_arm {monsterId}`.** Every gate is checked before anything is marked:
  - the cap and switch;
  - the monster is alive and can take damage (`_monsterDamageable`);
  - it's in `wheel`, not a dungeon zone, and not standing on the safe ground;
  - it's within ~300 px;
  - the player's Trapping level suits its stretch (`m.tier`, or level 1–5 for the
    first stretch);
  - a box trap in the bag;
  - no other live mark;
  - at most 20 arms a minute.

  Then `m._armedBy` (a `Map` of player id → `{until, unaware}`, `unaware` being
  `m.targetId !== pid` at the moment of arming) and a private `trap_armed
  {monsterId, until, chance}`.
- **The roll** sits in `_resolveMonsterKill` before `m.dmgByPlayer` is reset
  (`server/src/combat.js:1800`). For each armed player whose mark is live and
  whose share is ≥ 0.05 (the gold rule, `:1598-1618`):
  - roll, and work out the shakes;
  - **on a catch:** one write of `pets:` first, then the trap taken from the bag
    and `_saveRpg`, in one synchronous run;
  - **on a miss:** the pity is written.

  The kill's own payouts are untouched. The respawn path
  (`server/src/index.js:1880-1932`) must clear `_armedBy`, as it already clears
  `dmgByPlayer`.
- **Interplay to keep:** the blue slime's death is deferred by its burst, and
  replays with the same killer (`combat.js:1563`). The mark must outlive that
  delay, or be judged at the first, deferred call.

### Lane 2: dens

- **`WHEEL_DENS`** is baked into `server/src/wheelspawns.js` by
  `tools/world/bake-wheel-spawns.mjs`: a `bakeWheelDens` beside
  `bakeWheelNodes`, sharing its rules, giving `{id, home, tier, x, y, look}`. They're
  sent with the zone's state like the nodes (`server/src/join.js:1457-1462`), so the
  phone has no copy to drift.
- **Live den traps live in memory**: a `Map` per player, never `{}` (TRAPS §6),
  holding `{den, setAt, bait, phase, outAt, inAt}`.
  - There's no storage, because bait is used only at the outcome, so a deploy
    just folds traps up (handoff rule 11).
  - They're settled on the room tick and on the owner's next message (rule 12:
    no alarms).
- **The ring.** The young comes out once the owner has been outside the ring
  (~200 px) for 2 s.
  - `outAt` is that moment plus 3–9 s, and `inAt` is `outAt` plus 2.5 s.
  - If the owner is inside the ring at `inAt`, it ducks back, and tries again
    when they step out.
- **The roll at `inAt`.**
  - The chance comes from the table: mirrored on the phone for the label, and
    pinned by mirror-audit.
  - It adds pity and the bait still in the bag at that moment, and gives the
    shakes.
  - Then one write of `pets:` (the new pet, or the pity after a miss) and
    `_saveRpg` (bait, XP), in one synchronous run, pet record first.
- **Every refusal comes before anything is used:** no trap, no free trap slot,
  too far from the den (~140 px reach), level short, safe ground, swimming,
  airborne, offline, or dying.

### Both lanes

- **XP last, inside a try**, paid through `_addLifeSkillXp(ps, 'trapping', …)`.
  On main that throws on a skill stored in a broken shape. The farm branch fixes
  it, and the farm's "one seed, 270 herbs a minute" bug was exactly this.
- **Limits:** catches per hour are capped like the harvest cap
  (`server/src/botfp.js:148`).
- **Odds as a table**, never a formula spread through the code, so the label on
  the phone and the server's roll can't drift.

### Messages

| Direction | Type | Payload | Notes |
|---|---|---|---|
| phone → server | `trap_arm` | `{monsterId}` | explicit router case plus a shim passthrough line (TRAPS #18) |
| server → phone | `trap_armed` | `{monsterId, until, chance}` | private |
| phone → server | `trap_set` | `{den, bait?}` | Phase 2 |
| phone → server | `trap_lift` | `{den}` | takes a den trap back, nothing used |
| server → phone | `trap_state` | `{traps: [{den, phase, outAt, inAt}], now}` | private; `now` so the phone counts on the server's clock |
| server → phone | `trap_result` | `{monsterId or den, caught, shakes, pet?, xp, pity}` | private |
| phone → server | `pet_active`, `pet_name`, `pet_release` | `{id}`, `{id, name}`, `{id}` | |
| server → phone | `pets_state` | the record, without `pity` | private; at join and after each change |

Every server-sent type goes in `PRIVILEGED_EVENTS` (wire-audit checks it).
`pet_capture` refuses with `retired`, and `pet_capture_result` stays privileged.

### Caps and switches

- **`caps.trapping`** (both lanes) and **`caps.petbook`** (the record's actions),
  with **`dens`** added in Phase 2.
  - All lower case.
  - Each has a handler-side check that reads `_liveFlags`: `_trappingOff()`,
    `_petbookOff()`, `_densOff()`. That's the smelting shape
    (`server/src/smelting.js:59-62`; TRAPS §117).
  - Today's `caps.pets` has no switch that works: un-advertising it brings back
    the browser's own roll.
- **In `CAP_GATES`** (precheck check 12). **Never in `SERVER_READY_CAPS`** in the
  same PR (precheck check 13).

### Tests

- **`server/test/trapping.test.mjs`**, on a movable clock:
  - every refusal costs nothing;
  - the arm's gates, and the mark expiring;
  - a roll at a kill landed by someone else;
  - the 5% rule;
  - the kill's payouts unchanged;
  - the trap used only on a catch;
  - the unaware bonus;
  - the slime's deferred death;
  - no dungeon or safe-ground arming;
  - the odds table and pity, with `Math.random` stubbed;
  - the shakes;
  - caps and switches;
  - old pets moving in;
  - release, rename and set active;
  - `__proto__` as a monster id, a den or a pet id;
  - in Phase 2, the ring and the den timeline.
- **Mirror-audit:** the stretch levels, the odds table, and the bait recipes
  (Phase 3).
- **QA `mp-trapping` on a phone:** arm a trap, kill, see the shakes, open the Pets
  page, see the follower drawn from the pet sheet. In Phase 2, walk to a den,
  TRAP, step back, catch. Plus `mp-membudget` with an active pet out.

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
12. **Stale words.** "Need a trap! (Vendor sells them)"
    (`src/networking/gameEvents.js:4248`), and "No pets yet ... tap 🪤!", which
    points at the hidden button (`PetHousePanel.jsx:153`).
13. **The Beastmaster Kai quests are dormant**, and checked by the browser
    (`src/data/gameSystems.js:7088-7154`). Naming any new NPC "Beastmaster Kai"
    would switch them back on as they are (`src/data/gameDisplay.js:5549-5553`).
14. **A pet's pickup ring is a small edge on death piles**, including in No man's
    land: 240 px against 160 once the owner's window passes
    (`server/src/index.js:4247-4300`).
