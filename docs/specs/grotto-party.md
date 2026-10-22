# The Goo Grotto, a dungeon built for a party (v2.3.3573)

The owner, 2026-10-22: "I want the goo grotto dungeon to be very difficult
without a party of 2-3 people. I'm assuming most people will be around lvl 10
and have iron equipment or maple equipment with all stat points allocated
before they attempt it."

## What changed

| | Before | Now |
|---|---|---|
| The Grotto's level | the place's (levels 1–5), never above yours | **16, whoever comes in** |
| Its boss's health | four wave slimes' worth, × how many are inside (1.0 / 1.6 / 2.2 / 3.0) | four wave slimes' worth, × **at least the three-player 2.2** (four inside: 3.0) |
| The world map | "dungeon · Lv 1–5" | "**Lv 16 · 2–3 players**" |
| The Enter button | "⚔️ Enter the Goo Grotto" | the same, with "**Lv 16 · for 2–3 players**" under it |
| A monster shoved in a dungeon | could leave the arena, into its walls | stays on the arena's floor |

The three other dungeons (the Great Cave, the Foundry Dome, the Buried City)
are unchanged: the place's top level, never above yours, the boss sized by who
is inside.

## Why level 16, not level 10

A level-10 player in iron with every point spent is very hard to hurt at their
own level:
- iron armour takes 53% off a monster's blow;
- 10 Defense points take another 53%;
- 7 Dodge points dodge about 45%.

Together that is about 88% of a same-level monster's blow gone. A level-10
slime (202 HP) dies in two to three swings, and every melee kill gives back 90%
of what that slime dealt (combat.js `_applyMeleeLifesteal`). A bow or staff
walks away from slimes at three times their pace. Only a slime's death burst
gets through: armour cuts it, Defense and Dodge do not.

So in the simulator (below), a level-10 Grotto was easy alone however it was
sized:

| A level-10 Grotto, level-10 players (average) | Alone | Two | Three |
|---|---|---|---|
| as it is (six slimes a wave, the boss for who is inside) | 83–100% | 100% | 100% |
| the boss sized for three, twice the slimes | 67–83% | 100% | 100% |
| ...three times the slimes | 83–100% | 100% | 100% |
| ...twice the slimes, each twice the health and the hit, the boss's hit twice | 60–80% | 100% | 100% |
| ...each three or four times the health, three times the hits | 33–100% | 83–100% | 100% |

(5–6 runs each, so roughly ±15%.)

What the game DOES make dangerous is a monster above your level. The
"relative point value" rule (prog3.js `prog3Edge`, the owner's v2.3.2680)
takes a fifth of your points' worth a level above you and all of it at five.
That covers Power, Luck, Special, Element, Defense, Dodge and Resist. A
level-15 Grotto was the first to bite:
- alone 47–50% cleared, two 84–97%, three 100%;
- the reason it is not lower: a level-10 player killing level-15 slimes levels
  up DURING the run, and at 11 a fifth of their points comes back;
- at level 16 one level gained gives nothing back.

A bigger boss barely mattered at level 15:
- at six slimes' worth, or sized for four: alone still 34–53%;
- hitting half as hard again: the sword alone fell to 16%, but the bow and
  staff kite it (41–47%).

The level is the lever.

## What it measured

`tools/dungeon-sim/` runs the real worker in-process with players that join,
form a party, walk in and fight through the same messages a phone sends. The
worker's own code decides every hit, burst, boss move and split.

The players are the study's model (SKILL in sim.mjs):
- **average**: steps out of a swelling slime 70% of the time, after about half
  a second; eats a fish under 35% of their bar; throws a special when their
  mana allows; a bow or staff keeps its distance.
- **careful**: 95% of the time, after a quarter of a second, eats under 50%.
- **careless**: never steps out, throws no specials.

Every player is level 10, in iron with an iron weapon (a bow or staff as strong
as iron: hardwood), every point spent ("balanced": Power 15, Speed 6, Luck 6;
HP 10, Defense 10, Dodge 7), with 5 cooked clownfish. 32 runs a party, the
same 32 every time (`node tools/dungeon-sim/grotto.mjs`).

| Player | Party | Cleared | Deaths a run | Clear time |
|---|---|---|---|---|
| average | sword alone | **0%** | 1.00 | – |
| average | bow alone | **25%** | 0.75 | 158 s |
| average | staff alone | **19%** | 0.81 | 161 s |
| average | sword + bow | **91%** | 0.72 | 105 s |
| average | sword + staff | **84%** | 0.78 | 112 s |
| average | bow + staff | **75%** | 0.78 | 111 s |
| average | sword + bow + staff | **100%** | 0.66 | 87 s |
| careful | alone | 0% / 28% / 28% | 0.72–1.00 | 165 s |
| careful | two | 75–100% | 0.38–0.84 | 110–120 s |
| careful | three | 97% | 0.50 | 91 s |
| careless | alone | 0% | 1.00 | – |
| careless | two | 0–16% | 1.72–2.00 | 122 s |
| careless | three | 69% | 1.75 | 104 s |

The same Grotto before this change (`--flags=partydungeon:false`): level-10
players met its level 5 and cleared it alone 91–100% of the time, in about a
minute.

### How much each thing matters (24 runs a party, average players)

| What changes | Alone | Two | Three |
|---|---|---|---|
| (the table above) | 0–25% | 75–91% | 100% |
| level 9 players | 0–29% | 79–96% | 100% |
| **level 12 players** | **50–96%** (sword 96%) | 88–100% | 100% |
| copper gear | 0–8% | 42–83% | 96% |
| black steel gear | 4–54% (staff 54%) | 88–100% | 100% |
| points on offense | 0–33% | 67–79% | 96% |
| points on defense | 0–13% | 63–79% | 100% |
| no fish | 0–17% | 71–79% | 100% |

So it is a level-10 party's dungeon, and by level 12 a sword can do it alone.
That is the ordinary way a place is outgrown.

### What the model leaves out

- **The shield and the dodge roll.** A skilled player raises the shield
  against a burst or a slam, or rolls through one; the model only steps away.
  A real expert will do better than "careful".
- **Missed shots and real aiming.** The model's every shot lands.
- **Coming back.** A death is out of the run: only the leader's start brings
  anyone in, so a fallen member cannot rejoin the party's run.

## Found on the way: a shove put a slime in the wall

A dungeon's arena is not a zone in the ZONES table, so `_getZoneConfig` knows
none of them. Every clamp on a moved monster asked it:
- a hit's knockback (combat.js);
- the bash's shove and the whirlwind's pull (abilities.js);
- a snowman's burrow (telegraph.js).

So in a dungeon nothing kept a shoved monster in. In the first simulated party
run, a sword's hits knocked a slime out through the Goo Grotto's west wall.
There no melee player could reach it, and the wave, which waits for every
monster, never ended.

Now one box decides (dungeon.js `_monsterBox` / `_keepMonsterIn`):
- **an ordinary zone**: its map less a tile, as before;
- **a world dungeon**: its arena's floor, from 2 tiles in at the sides and
  `TOP_ROW` at the top (where a wave stands from) to 4 tiles from the bottom
  (above the bottom wall's three rows), as the phone draws its walls
  (wheelArenaMap);
- **the farm's Workshop**: its map less two tiles.

The boss's charge, which kept itself a tile off the arena's edge (inside the
walls drawn round it), and the giant slime's split slimes, which landed down to
two tiles from the bottom (in the bottom wall), use the same box. TRAPS §249.

## For the phone

Against `caps.partydungeon` (game/wheelDungeons.js `wheelDungeonParty`):
- the world map's label for the Grotto is "the Goo Grotto / Lv 16 · 2–3
  players".
  "dungeon · Lv 16 · 2–3 players" was twice the old line's width, and a label
  is drawn only where it clears the ones before it: at the zoom you reach it
  at, the stage's name won.
- The Enter button at its mouth has "Lv 16 · for 2–3 players" under its name.
- Inside, the top bar says "the Goo Grotto (Lv 16)" (cfg.levels [16, 16]), and
  every monster's plate says Lv 16 in the colour a monster six levels above
  you wears.

## Wire, storage, switch

| | |
|---|---|
| New messages | none: `dungeon_started`'s cfg carries `partySize` (3) and the levels it always carried |
| Caps | `caps.partydungeon` |
| Kill switch | `partydungeon: false` in the live flags: the Grotto of v2.3.3540 (its levels 1–5, never above yours, the boss sized by who is inside), and the phone shows its levels again |
| Storage | none |

## Still the owner's

- **Pointing reviewers at it.** At level 3–5, alone, in copper, a reviewer
  cannot clear a level-16 dungeon. A line from the Mayor at the slimes'
  hand-in could name it as the challenge to come back to with friends.
- **The Mayor's "Clear any dungeon" (mayor_3)** leads to the Grotto, the only
  dungeon a player can reach early, so it is a party quest now.

## Tests

- **`server/test/grotto-party.test.mjs`** (28 checks):
  - level 16 for a level-1, a level-10 and a level-40 player, every wave
    monster and the boss;
  - the boss sized for three with one, two or three inside, for four with four;
  - the Great Cave unchanged;
  - the switch;
  - the wall: the box for a world dungeon, an ordinary zone and the Wheel, a
    real sword hit at the west and north edges, every shove's call, and a split
    by the bottom wall;
  - the phone's words.

  Seven deliberate breakages are all caught.
- **`wheeldungeon` suite's starter checks** run under `partydungeon: false`: the
  rule every other dungeon keeps.
- **`mirror-audit`** holds `WHEEL_DUNGEON_PARTY` to `WHEEL_DUNGEON.PARTY`.
- **`mp-googrotto`** (a phone, in the world):
  - the map's line and the line under the Enter button;
  - every monster at 16, the boss at 16;
  - the clear, and back out at the mouth.

  `mp-dungeonfix` reads the Grotto's level from the worker's table.
