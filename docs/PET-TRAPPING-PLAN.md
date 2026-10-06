# Pet trapping: catch each land's young at its dens (v2.3.3105)

> Owner, 2026-10-06: *"Research pet trapping mechanics for my game and make a
> master plan."* And then: *"I don't know if what's already in the game is the
> best mechanic I made that as an early demo. It also becomes infeasible if
> you're powerful enough to 1 hit monsters so I need something else."*

This plan comes from a study of the game's code and of how other games let
players catch creatures. The notes behind it, with every source, are in
`docs/research/pet-trapping/` (start with its README). Nothing here is built
yet. It needs your choices, listed near the end.

## The short answer

**Stop catching the monsters you fight. Catch their young, at dens, in traps
you set.**

- Every land gets **dens**: burrows, nests and holes out in its stretches,
  marked on the minimap like the resource spots.
- At a den you **set a box trap** (with bait, if you have some) and **step
  back**. A young one creeps out, sniffs the bait and steps in.
- The trap **shakes once, twice, three times**, then snaps shut or bursts open.
- **Nothing gets hurt, so how hard you hit never matters.** Your Trapping
  level, your trap and your bait set the odds, and the game shows you the real
  odds before you set the trap.
- **What you catch is yours alone.** Nobody else sees your young one, so nobody
  can steal it, kill it or crowd you out.
- It becomes a **pet** that follows you and picks up loot, as pets do today.
  Later it **shields you from its own land's element**, grows as you play
  together, and fills a journal of every land's young.

Why this fits the game:

- **It's where the games that hit your problem ended up.** Path of Exile first
  had players throw nets at weakened beasts. Players didn't like it, and when
  the feature joined the main game it became, in effect, "kill the beast and
  it's caught". RuneScape's Hunter skill, the best-known trapping skill, never
  involves a fight at all: your Hunter level alone decides what you can catch,
  how many traps you run and your odds.
- **It's built from parts the game already has.**
  - Dens can be baked and drawn like the resource spots (v2.3.3012).
  - The attack button already turns into HARVEST next to a resource. Next to
    a den it turns into TRAP.
  - Monsters already ignore you while you harvest, so they can ignore you while
    you set a trap.
  - The farm's server clock in #827 (not merged yet) handles "ready when you
    come back", which the later overnight traps can reuse.
  - The Trapping skill already has its card, its icon, its guild (the
    Beastmaster's Lodge) and its leaderboard tab. All it lacks is a way to earn
    XP that anyone can reach.
- **It's light on the phone.** The young are drawn from one small sprite sheet
  made from the monsters' own art, a few MB. A full monster's art costs 13 to 36
  MB, and a pet goes everywhere you go.
- **It makes Trapping a real life skill**, with its own gear (traps), its own
  supplies (bait made from fish, crops and shards) and its own level steps of 5,
  like Mining and Fishing.

### The other ways, and why not as the core

| Way | Works when you can one-hit? | Fair with others nearby? | Fits a phone? | Building it | Verdict |
|---|---|---|---|---|---|
| **Dens and traps, catching the young** | Yes: nothing is fought | Yes: each young is its owner's alone | Yes: tap TRAP, step back, watch | Medium: a server module, dens baked like resource spots, a pet record | **The core** |
| **Eggs from kills** (like MapleStory's familiar cards) | Yes: the kill is the trigger | Yes, if only the killer rolls | Very: you just fight | Small: a rare drop and a hatch timer | A slower second way for fighters, later |
| **Mark it, then kill it** (Path of Exile since 3.5 catches a beast when it's killed) | Yes | Mostly: the mark is yours | Yes | Small | Possible extra. It makes pets a side effect of combat, not a skill |
| **A harmless snare you hold for a few seconds** (WoW's 6-second Tame Beast) | Partly: your own auto-attack, a splash or another player can still kill it | No | OK | Medium | No |
| **A capture bar that fills as you hit** (Cassette Beasts) | Yes | No: whose hits count, and it can't die for anyone else meanwhile | OK | Large: every damage path needs an "only down to 1 HP" rule | No |
| **Today's: weaken it to 20%, then trap it** | No (next section) | No: anyone can trap what you wore down | Poor: nothing shows the 20% line | Built, but nobody can reach it | Retire |

## Why the 20% capture has to go

The audit measured it with the server's own damage roll and monster health
(`server/src/combat.js` `_computeAttackDamage`, `server/src/data.js`
`MONSTER_HP_CURVE`), assuming damage points in Power and the gear a player
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
- **Even at your own level, a basic hit stops inside the 0–20% window only
  about half to nine times in ten**, depending on the weapon and build. Ten
  levels above the monster, a great sword manages it 2–36% of the time.
- **The 20% window can't see** a crit, splash, a burn or poison tick, another
  player's hit, or the snowman burrowing out of reach at half health.

And the rest of today's capture (`server/src/pets.js`, v2.3.1130):

- **Nobody can use it.** Its only button is in the old bottom toolbar, hidden
  since v14.x (`src/ui/panels/MenuBar.jsx:62-67`). Nothing has sold a trap since
  v2.3.2069 (`server/src/data.js:468-488`).
- **It steals.** Anyone within 200 px can trap a monster that someone else wore
  down, and the trap wipes out everyone's XP and gold for it: the capture never
  reads who did the damage (`pets.js:132-200`).
- **It works from the safe ground**, and **trapping a dungeon boss finishes the
  dungeon** and pays its reward (`server/src/dungeon.js:823-840`).
- **It looks like a kill** on every screen: the death sound plays and a phantom
  remnant pile drops (`src/networking/wsClient.js:990-1017`).
- **Trapping dead-ends at 6 pets.** There's no way to release one, and a full
  list is refused before any XP (`pets.js:150`).
- **The odds follow your combat level, not your Trapping level:** −5 points for
  each level the monster is above you, +0.5 per Trapping level (`pets.js:157-161`).

## What exists today, and what to keep

Keep:

- **The server rolls the dice and spends the trap** (`pets.js`). That pattern
  carries straight over.
- **The loot vacuum.** An active pet picks up loot within 240 px instead of 160,
  checked by the server (v2.3.1200, `docs/specs/pets.md`).
- **Trapping as a skill.** Its Skills card and icon
  (`public/icons/ui/skill-trapping.webp`, "a simple box trap with its door
  propped on a stick"). Its card already says "Set traps for small creatures and
  collect the catch" (`src/ui/mobile/sheet/skillsModel.js:55`), which is exactly
  this plan. The Beastmaster's Lodge pays 30 coins at Trapping 5, rising to
  2,000 at 150 (`server/src/data.js:821-834`), and the leaderboard has a
  Trapping tab.
- **The paw-print pets icon** (`public/icons/ui/evt-pets.webp`) and the farm's
  **Pet House with its fenced pen** (`src/data/gameDisplay.js:851-865`).

Let go:

- **The 20% capture** (`pet_capture`) and its hidden button, along with the old
  browser-only roll behind it (`MenuBar.jsx:262-311`).
- **"Pet combat".** Every 1.5 s your pet takes a bite out of a nearby monster's
  health on your screen only, with damage numbers, and the server never hears of
  it (`src/ui/BroTown.jsx:6613-6662`). Players see fake hits.
- **Evolve and Enchant** in the Pet House. They change only the phone's copy,
  which the server undoes at the next update. Enchant's 50 coins come off only
  on screen (`src/ui/panels/PetHousePanel.jsx:365-397`, `:497-516`).
- **The emoji pet.** Today a pet is a 15 px emoji, about 9 px on a phone at the
  Wheel's zoom, and only you can see it (`src/rendering/systems/entityRenderer.js:14937-14993`).

Almost nobody has a pet now, since capture has been out of reach for hundreds of
versions. Anyone who does keeps them: they move into the new record (Phase 1).

## How it plays

### A trip to a den

1. Get a **box trap** at the Feed & Seed. Bait is optional at first; it raises
   the odds.
2. Open the minimap. **Dens show as paw prints.** Your quest's gold road can
   point at the nearest one you can use.
3. Walk up. The den's **label** shows a trap picture and its Trapping level,
   grey if yours is short, the way resource labels do.
4. With no monster close, the attack button reads **TRAP**. Tap it. Your bro
   kneels and sets the trap, and monsters ignore you while you do, as they do
   while you harvest.
5. A **ring** appears round the trap: **step back** past it. While you're inside
   it the young won't come out. Step back in later and it ducks into the den
   again, with nothing lost.
6. After a few seconds **a young one creeps out**, sniffs the bait and steps in.
7. **The trap shakes** 1, 2 or 3 times. **Snap**: a card shows what you caught,
   with "New!" the first time. **Burst**: it dashes back into the den, and your
   next try at that den is easier.
8. As your level grows, **set traps at more than one den** and walk your own
   little trap line.

An attempt takes about 15–25 seconds. That's slower than a harvest, but you can
watch two or three traps at once.

### Dens

- **Two dens in every stretch of every land**, all eight stretches (levels
  1–40): 128 in all. They're baked with the monsters' places and the resource
  spots, by the same rules: never on a road, in water or on the safe ground, and
  at least 300 px from any monster's place (`tools/world/bake-wheel-spawns.mjs:391-482`).
- Each den is **home to one kind of young**, named on its label.
- **Deep dens sit among deep monsters.** Your fighting doesn't change the catch,
  but you still have to get there, and stand guard while you wait.
- **Its Trapping level rises in steps of 5**, like the resources
  (`server/src/gathering.js:150`):

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

- **Below the level, a tap plays a locked try**, as a locked resource does
  (v2.3.3059): the trap goes down, the young sniffs, turns away, and the den says
  "Requires Trapping 10". Nothing is sent to the server.
- **Drawn in code** until you make pictures for them (a burrow ringed with the
  land's stones, snow, sand or moss), the way the dungeon mouths are
  (`src/rendering/wheelDoors.js`).

### Traps and bait

- **The box trap is reusable**, like the axe and the rod, and **kept when you
  die**, like them (`server/src/gathering.js:577-605`). You buy it at the Feed &
  Seed.
- **Traps out at once:** 1 at Trapping 1, 2 at 10, 3 at 20, 4 at 30. RuneScape
  allows 2 at level 1, rising to 5 at level 80. Optionally, **one more inside No
  man's land**, as RuneScape gives one more in its PvP Wilderness.
- **Bait is used up only when a young takes it** (a catch or an escape), never
  when you set the trap. So lifting a trap, or a server restart, costs nothing.
  - **Plain bait** from the Feed & Seed, a coin or two.
  - **Land bait** (Phase 2), cooked at the Cookhouse from two raw fish or crops
    and one of the land's shards. It adds more to the odds, and stretches 5–8
    (levels 21–40) need it.
  - **Each kind of young has a favourite.** You find it by trying, and it's then
    written on that young's journal page.
- **Better traps** (Phase 2), made at the Woodworker from wood and a bar, add a
  little to the odds each.

### The odds, always shown

- **At the den's own Trapping level: 45%.** Each level above it adds **1.5
  points**, up to **90%**. RuneScape's catches start at about 45–55% at their
  unlock level and near 90% some 35 levels later.
- **Land bait adds 10 points, the favourite 20, a better trap 5 or 10.**
- **Every escape in a row at a den adds 10 points** to your next try there, up to
  30, and a catch resets it. World of Warcraft's pet traps add 20–30% after each
  failure.
- **Your combat level, your damage and the young's health play no part.**
- **The game shows the true number before you set the trap.** Palworld's
  capture percentage turned out to be inflated (players' datamining found 49%
  shown was about 18% real), and Pokémon GO's hidden rates were called shady.
  Trust is the point.

### The catch

- **The server rolls when the young steps in.** It tells your phone the result
  and how many shakes to show: 3 and a snap for a catch, 0–2 and a burst for an
  escape, with more shakes the closer it was. That's Pokémon's shake check, and
  it makes a near miss feel near.
- **On a catch:** the reveal card (the same ceremony a rare item gets), Trapping
  XP, and the pet goes into your collection.
- **On an escape:** a little Trapping XP, the bonus for next time, and the bait
  is used.

### What you catch: the young of each land

| Land | Element | Its monsters | Young (names for you to choose) | At levels 21–40 |
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
  the Wheel already uses for monsters past level 20 (`src/data/wheelStageLooks.js`),
  so they cost no memory.
- **Later, a rare golden look of each** (about 1 catch in 200), also just a tint.
- **Each young has a size.** Big ones get a badge and a spot on the leaderboard.

### Your pets

- **One follows you**, as today. The rest wait in your collection.
- **Your collection holds 30 to start.** The Pet House holds more for gold, a gold
  sink and never real money.
- **Set active, rename and release** from a **Pets page** (More → Pets, with the
  paw-print icon). All of it is done by the server and kept.
- **Release a spare and it leaves treats** your other pets like (Phase 3), so
  catching the same kind again is never wasted.
- **Pets are never lost**: not when you die, and not in No man's land.

### What pets do

- **Pick up loot** in a wider ring: today's vacuum, kept as it is.
- **Ward** (Phase 3). An active pet from a land takes the edge off that land's
  monster hits on you. The eight lands and the eight element effects match one to
  one (`server/src/monsterstatus.js:82-92`):
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
- **Grows up** (Phase 3). Its bond rises while it's out with you and when you
  give it treats, and it gets a little bigger and its ward a little stronger.
  There's nothing to feed, nothing that starves and nothing that dies. Other
  games removed those care chores (WoW's pet happiness, Ultima Online's pets
  going wild), and they stay out.
- **Pets don't fight.** A fighting pet is a second monster for the server to
  run, and it makes pets a must-have in PvP. Today's fake bite goes. If pets ever
  help in a fight, it should be as an extra on your own hit that the server works
  out (Phase 5, your call).

### Fair in a shared world

- **Your young is yours.** It's drawn only on your screen and only you can catch
  it. Two players at one den each run their own trap. Nobody can steal it, kill
  it or crowd you out, which is the problem Pokémon GO solved by making each catch
  private.
- **Your trap is yours too.** Other players don't see it at first. Phase 3 may
  show traps, but never the young.
- **No dens on the safe ground or in dungeons.** The dungeon-boss hole goes
  with the old capture.
- **No man's land.** Dens from stretch 2 on lie inside it, so a trapper there
  can be attacked by players near their level, like anyone. Bait in the bag drops
  as bag items do. The box trap stays, because it's a tool. Pets never go.

### What it costs and what it pays

- **Gold spent:** the box trap (once), plain bait, Pet House space, better
  traps.
- **Materials used:** fish, crops (#827), shards and burnt dust (which nothing
  uses today) go into bait. Wood and bars go into traps.
- **Gold earned:** none directly. Pets aren't sold to Diego and aren't traded,
  at least for now.
- **XP:** a catch is worth about two harvests from the same stretch, and an
  escape a quarter of that. This gets tuned in Phase 1 against real gathering
  rates. The Beastmaster's Lodge starts paying the day Trapping XP exists.

### On the phone

- Dens on the minimap, their labels, the TRAP word, the ring, the young, the
  shakes and the card. The Pets page in More. The Feed & Seed's counter.
- **No new fixed button.** TRAP lives on the attack button the way HARVEST does,
  and a monster close by still wins the button (v2.3.2270).

### Art and memory

- **The pet sheet.** A tool makes small walking frames of each of the nine kinds
  from the monsters' existing art, and the second-stage and golden looks are
  tints. It's the only new art Phase 1 needs, and it replaces the emoji. The
  young at a den and the pet at your heel both draw from it.
- **How big.** The target is 1–3 MB on the phone for all nine, loaded as a plain
  picture rather than drawn onto a canvas. The memory budget has about 8.6 MB of
  room in the art cache and 9.6 MB on the graphics chip at its Flame Fields stop
  (`tools/qa/mp/memory-budget.mjs`), so it should fit. If it
  doesn't, each kind gets its own little sheet, loaded as you near its dens like
  the monsters' looks (CLAUDE.md, the looks-as-you-walk clause).
- **Why not the monsters' own art.** A snowman's full look is 13–17.5 MB, a fire
  goblin's 30–35 and a mummy's 36 with its skeleton
  (`src/rendering/zoneTextures.js:24-26` and `:72-74`,
  `src/rendering/snowmanSprites.js:341-344`). A pet goes
  wherever you go, so that would break the budget at the first stop.
- **Later, from you** (a new ART-WISHLIST section): a picture for each land's
  den, the box trap, bait icons, and proper "young" art if you want chubbier
  proportions than a shrunk monster.

## Phases, smallest first

Each phase ships as its own pull request (or a short series), with its test
suite, a spec and an off switch, and each makes sense to players even if the
next one never comes.

Phase 1 builds on two pull requests that are open now:

- **#830**: a new character no longer brings pets or skill levels from the
  browser.
- **#827**: the farm. It fixes a crash in paying life-skill XP, and it rebuilds
  the Feed & Seed's window, where traps and bait will be sold.

| Phase | What players get | Main work | Why in this order |
|---|---|---|---|
| **1. Dens and box traps** | Dens on the minimap. The Feed & Seed sells a box trap and plain bait. TRAP at a den, the young comes out, the trap shakes. A Pets page (set active, rename, release), which the farm's Pet House opens too. Pets drawn from the pet sheet, not an emoji. The old capture, the fake pet bites and the Pet House's Evolve and Enchant go. | Server: `trapping.js`, the dens baked, the `pets:<pid>` record with old pets moved in, `caps.trapping` and `trapping: false`, a test suite, `docs/specs/trapping.md`. Phone: drawing dens, labels, minimap marks, the TRAP word, the trap and the young, the Pets page, a Traps tab in the Feed & Seed window, and the tool that makes the pet sheet. QA `mp-trapping` on a phone. Two PRs: the server first, then the phone. | The whole loop, with no new art from you. It gives Trapping its first real XP. |
| **2. Bait, traps and the Beastmaster** | Land bait from the Cookhouse, better traps from the Woodworker, favourite baits, a Journal of every young, and a Beastmaster beside the Feed & Seed with a quest line the server checks. | Recipe tables shaped like smelting (`server/src/smelting.js`), a `catch` quest goal on the server, the NPC and his art, the journal. | Depth, once the loop is proven. |
| **3. Pets that matter** | The land ward, bond and growing up, treats, golden and Big young with a reveal, other players seeing your pet, more Pet House space. | The ward in `monsterstatus.js`, bond counted by the server, the pet in each player's tick record, Pet House space bought with gold. | Makes the collection worth finishing. |
| **4. While you're away** | Overnight traps: leave one out with bait and come back hours later. Capped per day. | The farm branch's lazy clock (`readyAt`, checked when you look) and a `traps:<pid>` record. | Suits short sessions and the 2-hour day. |
| **5. Later, your call** | Eggs from kills for fighters, hatched at the Pet House. Trading pets. Seasonal young. Sheriff's bounties. A pet's helping bite. Cosmetic pet extras on the supporter pass. | Each its own PR. | Only once the core is loved. |

## Decisions only you can make

| Decision | Choices | Recommendation |
|---|---|---|
| The core | dens and traps; mark it, then kill it; eggs only; keep the 20% capture | **Dens and traps** |
| What you catch | the young (small); the grown monsters, lured out | **The young.** Cheap to draw everywhere, and it explains why a pet is small |
| The young's names | the table above, or your own | Yours to name |
| Old pets | keep them, moved to the new record; start fresh | **Keep them** |
| Bait | optional at first and needed at levels 21–40; always needed | **Optional at first** |
| Traps out at once | 1–4 by level, +1 in No man's land; no extra | **1–4, +1 in No man's land** |
| Collection size | 30 plus gold expansions; unlimited; 6 | **30 plus expansions** |
| What pets do | loot, land ward and growing up; also fight; cosmetic only | **Loot, ward, growing up. No fighting** |
| Can pets be lost | never; in No man's land | **Never** |
| Trading pets | not now; later, with safeguards | **Not now** |
| Golden young | yes, about 1 catch in 200; no | **Yes** |
| The $2 supporter pass | cosmetic only; also more collection space | **Cosmetic only** |
| A way for fighters | eggs from kills (Phase 5); mark it, then kill it; none | **Eggs, later** |
| Others see your trap | later; never | **Later, and never the young** |

## For the builder

Everything below follows `docs/ARCHITECTURE-HANDOFF.md`. The audit's checklist
with receipts is `docs/research/pet-trapping/codebase_skills_items_economy_conventions.md` §5.

### The pet record

```
pets:<pid> = {
  v: 1, nextId: 7, active: 3, cap: 30, moved: true,
  list: [ { id: 3, home: 'frost', look: 'snowman', stage: 1, gold: false,
            size: 1.04, name: 'Snowling', bond: 0,
            at: 1791273600000, den: 'frost-2a', by: 'trap' } ],
  journal: { 'frost.snowman.1': { n: 3, gold: 0, big: 1.12 } },
  pity: { 'frost-2a': 1 }
}
```

- **Its own storage key**, registered in the handoff's table (rule 1 and 2;
  precheck check 5 enforces it). One read at join, before anything reads pets.
  Versioned: a worker refuses a newer `v` whole, so a rollback can't destroy it,
  as the farm branch does with `FARM.V`. Deleted by `_resetCharacterData`. Not in
  the daily `rpgsnap:`, which the operator should know.
- **Ids from the record's own counter**, so they stay put. Today's are made
  fresh at every join (`pets.js:90`), which rules out addressing a pet by id.
- **Moved in once** from `lifeSkills.pets` (stamp `moved`), the kind guessed
  from archetype and element, `by: 'legacy'`. This assumes #830 has removed the
  browser's pet import at join, which today mints up to six pets on every join
  of a player who has none (`pets.js:110-128`).

### Dens and traps

- **`WHEEL_DENS`** baked into `server/src/wheelspawns.js` by
  `tools/world/bake-wheel-spawns.mjs`: a `bakeWheelDens` beside `bakeWheelNodes`,
  sharing its rules, giving `{id, home, tier, x, y, look}`. They're sent with the
  zone's state like the nodes (`server/src/join.js:1457-1462`), so the phone has no
  copy to drift.
- **Live traps live in memory** (a `Map` per player, never `{}`: TRAPS §6):
  `{den, setAt, bait, phase, outAt, inAt}`. There's no storage, because bait is
  used only at the outcome, so a deploy just folds traps up (handoff rule 11).
  They're settled on the room tick and on the owner's next message (rule 12: no
  alarms).
- **The ring.** The young comes out once the owner has been outside the ring
  (~200 px) for 2 s: `outAt` is then plus 3–9 s, and `inAt` is `outAt` plus 2.5 s.
  If the owner is inside the ring at `inAt`, it ducks back and tries again when
  they step out.
- **The roll at `inAt`.** The chance comes from the table (mirrored on the phone
  for the label, pinned by mirror-audit), plus pity and the bait still in the bag
  at that moment, giving the shakes. Then one write of `pets:` (the new pet, or
  the pity after an escape) and `_saveRpg` (bait, XP) in one synchronous run, pet
  record first.
- **Every refusal comes before anything is used:** no trap, no free trap slot,
  too far from the den (~140 px reach), level short, safe ground, swimming,
  airborne, offline, dying.
- **XP last, inside a try.** It's paid through `_addLifeSkillXp(ps, 'trapping', …)`.
  On main that throws on a skill stored in a broken shape; the farm branch fixes
  it, and the farm's "one seed, 270 herbs a minute" bug was exactly this.
- **Limits:** `trap_set` at most 20 a minute, and catches per hour capped like
  the harvest cap (`server/src/botfp.js:148`).

### Messages

| Direction | Type | Payload | Notes |
|---|---|---|---|
| phone → server | `trap_set` | `{den, bait?}` | an explicit router case plus a shim passthrough line (TRAPS #18) |
| phone → server | `trap_lift` | `{den}` | takes the trap back, nothing used |
| server → phone | `trap_state` | `{traps: [{den, phase, outAt, inAt}], now}` | private; `now` so the phone counts on the server's clock |
| server → phone | `trap_result` | `{den, caught, shakes, pet?, xp, pity}` | private |
| phone → server | `pet_active`, `pet_name`, `pet_release` | `{id}`, `{id, name}`, `{id}` | |
| server → phone | `pets_state` | the record, without `pity` | private; at join and after each change |

Every server-sent type goes in `PRIVILEGED_EVENTS` (wire-audit checks it).
`pet_capture` refuses with `retired`, and `pet_capture_result` stays privileged.

### Caps and switches

- **`caps.trapping`** (traps) and **`caps.petbook`** (the record's actions). Both
  lower case, each with a handler-side `_trappingOff()` or `_petbookOff()` reading
  `_liveFlags`, the smelting shape (`server/src/smelting.js:59-62`; TRAPS §117).
  Today's `caps.pets` has no switch that works: un-advertising it brings back the
  browser's own roll.
- **In `CAP_GATES`** (precheck check 12). **Never in `SERVER_READY_CAPS`** in the
  same PR (precheck check 13).

### Tests

- **`server/test/trapping.test.mjs`**, on a movable clock:
  - every refusal costs nothing;
  - the ring and the timing;
  - the odds table and pity, with `Math.random` stubbed;
  - the shakes;
  - bait used only at the outcome;
  - caps and switches;
  - old pets moving in;
  - release, rename and set active;
  - `__proto__` as a den or an id.
- **Mirror-audit:** the den levels, the odds constants, and the bait recipes
  (Phase 2).
- **QA `mp-trapping` on a phone:** walk to a den, TRAP, step back, catch, open the
  Pets page, see the follower drawn from the pet sheet. Plus `mp-membudget` with
  an active pet out.

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
5. **The 20% capture's holes**: kill-steal, safe ground, the dungeon boss (above).
   They're out of reach today, and they go with the capture.
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
    roll, and `petLoot` is camelCase, so the admin route can't set it (TRAPS §117).
11. **Everyone without a pet shows a fake "Frost Fox"** on their profile card
    (`src/ui/panels/playerProfile.js:58`).
12. **Stale words.** "Need a trap! (Vendor sells them)" (`src/networking/gameEvents.js:4248`),
    and "No pets yet ... tap 🪤!" pointing at the hidden button
    (`PetHousePanel.jsx:153`).
13. **The Beastmaster Kai quests are dormant**, and checked by the browser
    (`src/data/gameSystems.js:7088-7154`). Naming any new NPC "Beastmaster Kai"
    would switch them back on as they are (`src/data/gameDisplay.js:5549-5553`).
14. **A pet's pickup ring is a small edge on death piles**, including in No man's
    land: 240 px against 160 once the owner's window passes (`server/src/index.js:4247-4300`).
