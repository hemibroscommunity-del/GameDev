# The dungeon fixes (v2.3.3556)

The owner, 2026-10-21: "I have no clue what the state of dungeons are right now
in the game. I have never played dungeons yet. This will probably need work to
get right."

A phone walked into all four dungeons in the world first, at the level each is
for. What a player met is written up in [dungeons-today.md](dungeons-today.md).
It listed four fixes that needed no decision. The owner was told they would be
made unless they said otherwise. These are those four, and a fifth the owner
then decided: offered "your pile waits outside at the mouth, or you keep your
bag in a dungeon", they answered "Keep your bag in dungeons" (section 5). The
rest of that list is still the owner's call (see "Still the owner's call" at
the end).

## 1. A real boss

**Before.** The boss had about a wave monster's health, and less in two of the
four:

| Dungeon | Wave monster | Boss |
| --- | --- | --- |
| Foundry Dome | 1,344 | 1,204 |
| Goo Grotto | 128 | 120 |

It looked exactly like the monsters before it: the same picture, size and name.

Two causes:

- **The multiplier missed most of the health.** v2.3.1346 multiplied only the
  part of a monster's health that is not its flat bonus ("all monsters get
  +100", not +100 × 8). Since v2.3.3055 that flat bonus grows with the level:
  100 at Lv 3, 1,311 at Lv 30. It is now most of a monster's health, so the ×4
  hardly touched the boss.
- **The waves rolled higher than the boss.** They rolled +0 to +2 levels, while
  the boss stood at the dungeon's own level (v2.3.3540).

**Now (server):**

- **One level.** Every monster in a world dungeon is at the dungeon's level: no
  +0–2 (`wheeldungeon.js` `_wheelDungeonWave`). The dungeon is one level and
  says so. The Workshop keeps its roll.
- **Its whole health × the multiplier**, × the party's share as before
  (`dungeon.js` `_dungeonSpawnBoss`).
  - A world dungeon's boss is four wave monsters of health.
  - The Great Cave at Lv 28 goes from 1,384 to 4,636 (a wave monster has 1,159).
  - The Goo Grotto at Lv 3 goes from 120 to 420 (a wave monster has 105).
  - The Workshop's "HP ×N" now means what it says. The phone's old boss
    (`dungeonWaves.js`) also multiplied the whole health.
- **What a run pays stays about the same.** The kill's XP is the damage dealt,
  so a longer fight pays at the same rate per second. The waves no longer roll
  higher, so a whole run holds 4–12% more health than before, all of it in the
  boss, now about a fifth of the run:

  | Dungeon (at) | A run's health before | Now |
  | --- | --- | --- |
  | the Goo Grotto (Lv 3) | 2,214 | 2,310 |
  | the Great Cave (Lv 28) | 24,322 | 25,498 |
  | the Foundry Dome (Lv 28) | 23,296 | 24,508 |
  | the Buried City (Lv 43) | 47,087 | 52,514 |

  "Before" is the expected total with the +0–2 roll (three waves of six, then
  the boss).
- **The wire says which one is the boss.** `boss: 1` goes on the boss alone in
  all three places a whole monster is sent:
  - `_dungeonPushZoneState`;
  - `spawnscale.js` `monsterSnapWire`;
  - `join.js` `state_sync`.

  Every other monster's wire is byte for byte what it was. An older phone
  ignores the field.

**Now (phone, `entityRenderer.js`):**

- **Huge.** The first cut drew the boss half again as big. The owner: "Make
  boss slime huge". Every boss is now drawn about twice your height, whatever
  it is (`src/data/gameSystems.js` `bossSizeK`):
  - you stand 105.7 world px from crown to boots, and a boss stands
    `BOSS_STAND_H` 211;
  - a boss's height is twice its body centre's lift (`monsterBodyOffsetY`,
    half the drawn height), or the diameter of a shape drawn as a circle;
  - so a slime is drawn 4.6 times its size (a wave slime's scale 1.5, the
    boss's 6.9), a golem or a mummy 2.2 times; it is held between 1.5 and 5
    (`BOSS_SIZE_MIN`, `BOSS_SIZE_MAX`: a snowman, 38 px tall, stops at 5);
  - its HP bar grows with it. Its plate stays the plates' size on the screen.
- **Hit where it is drawn.** Everything that measures a monster's body measures
  the boss at its size:
  - the swing and the lunge (`monsterCombat.js`);
  - arrows, bolts and the bow's sight line (`projectiles.js`, and
    `combatHelpers.js` `monsterDrawScale`);
  - the lock's aim point, and a tap (`monsterBodyY`, the taps' radius in
    `BroTown.jsx`);
  - the reach rings and the carets (`effectsRenderer.js`).

  Without this, a swing at the side of a slime four times its size missed: its
  hit circle was still a wave slime's. The server's melee reach (400 px) already
  covers it.
- **See-through while it covers you.** With you behind it, inside its outline,
  it is drawn at 0.45 (`BOSS_SEE_THROUGH`), so it never hides you. In front of
  it, it is solid.
- **Its own blows are as before.** How far it reaches and how hard it hits are
  the server's, and they did not change. It still comes to its old reach of
  you to hit you.
- **Its plate.** "Boss <name>" in bold, on its own deep red (`PLATE_BOSS_FILL`
  #7A1D1D at 0.94). The name reads at 9.14:1 against it.
  - The deep red is not the alarm's bright red, which means "hitting you right
    now" and still takes over while the boss hits you.
  - The ring keeps its difficulty band.
  - The plate is kept the plates' size on the screen.

## 2. Thirty seconds to pick up the loot

**Before.** "DUNGEON CLEARED!" and three seconds later you were outside. The
boss's drop was left on the floor.

**Now.** `src/game/dungeonClear.js` keeps a 30 s clock (`DUNGEON_LOOT_MS`). The
card `ui/mobile/DungeonClearHud.jsx` sits at the top, where the race clock goes:
"Dungeon cleared! Pick up your loot · out in 27 s", with a **Leave now** button.

- The way out at the bottom of the arena still works.
- The worker already keeps a cleared run while anyone is in it, up to five
  minutes. No server change was needed.
- **You are taken out only from that same dungeon.** The old 3 s timer asked
  only "am I in a dungeon?". Within 30 seconds you can now leave and go
  straight back in, and that old test would have taken you out of the new run.

## 3. Straight back in

**Before.** You left by the way out, or died inside. The run stayed open with
nobody in it, and the mouth said "You already have a dungeon running" for a
minute, until the empty sweep removed it.

**Now.** Starting a run while your last one is empty ends the old one and
starts a new one (`dungeon.js` `_handleDungeonStart`).

- Nothing in an empty run can be got back, because no way in leads to an old
  run. So ending it now loses nothing the sweep would not.
- With someone still inside, such as your party, the old run keeps going and
  the door still refuses.
- Another player's run is never yours to end.

## 4. "(Lv 28)", not "(Lv28-28)"

When a zone's level range is a single level, its title shows that one level
(`ui/mobile/zoneTitle.js`). A dungeon is one level, so its top bar says "the
Great Cave (Lv 28)".

## 5. A death in a dungeon keeps your bag

**Before.** A death in a dungeon left your bag's pile inside the run. You woke
in BroTown and couldn't get back into that run. The run was then deleted with
the pile in it, so the bag was simply lost.

**Now.** A death in any dungeon (a world dungeon or the Workshop's) keeps your
bag: no pile, nothing taken (`index.js` `_handlePlayerDeath`, asking
`dungeon.js` `_dungeonKeepsBag`).

- It is the duel kill's exemption. The server empties a dead player's bag
  twice, at the death and again at the respawn five seconds later, and a dungeon
  death now skips both (`ps._deathKeepsBag`, renamed from `_duelDeathKeepsBag`).
- The server says so on `player_died` (`keptBag: 1`). The phone then shows "Your
  bag is safe" under "YOU DIED". An older server never sends it, so the phone
  promises nothing it can't keep.
- **A red skull is the one exception.** The owner set No man's land's rule for
  an outlaw "killed by a monster": they keep what they wear and lose the rest.
  That rule still applies in a dungeon (`_nml`).
- Kill switch: `dungeonbag: false` in the live flags puts back the old pile and
  wipe.

## Tests

- **`wheeldungeon` suite.**
  - One level per run.
  - The boss: its whole HP × 4, four wave monsters' worth, and `boss: 1` on the
    re-push, the snapshot and the join.
  - Straight back in. With someone inside the run is refused, and another
    player's empty run is left alone.
  - A death inside keeps the bag (5 copper bars, 3 carrots and 2 ore), no pile,
    `keptBag`, still whole after the respawn. A death in the world still drops
    it. The kill switch puts the old way back, and a red skull still loses it.
- **`dungeon` suite.** The Workshop's boss is its whole HP × mult × 1.6 with two
  players, and its wire carries the boss flag. The second start is refused
  while you are inside, and an empty run is replaced.
- **`dungeon-clear` suite.** The phone's rules in node:
  - the clock: 30 s, out once, never out of a new run, Leave now;
  - the wiring;
  - the title;
  - the boss's size (about twice your height for every shape, held to 1.5-5,
    1 for any other monster), its plate, and the name's contrast;
  - every place that measures its body measures it at that size: the
    drawing, the swing, the lunge, arrows and bolts, the bow's line, the draw
    scale, the lock's aim and shot, both taps, the reach ring and the caret;
  - the see-through while it covers you;
  - "Your bag is safe", only on the server's `keptBag`.
- **Breaking each fix on purpose.** Eighteen mutations were applied one at a time:
  - the flat left out of the multiplier;
  - the +0–2 roll put back;
  - no straight back in;
  - straight back in that ignores who is inside;
  - each of the three wire flags removed;
  - the clear's timer taking you out of any run;
  - the old 3 s timer;
  - the title;
  - ending another player's empty run;
  - for the bag: no keeping, kept at the death but wiped at the respawn, the red
    skull ignored, the kill switch ignored, no `keptBag`, every zone keeping it,
    and no "Your bag is safe".

  Then ten for the huge boss: its size put back to the first cut's 1.5; its
  body centre, the drawing, the swing, the lunge, a shot's circle, the draw
  scale (with and without a zone) and the tap each left at a wave monster's
  size; and no see-through.

  Every suite above passes, and each mutation makes at least one of them fail.
- **`mp-dungeonfix`, a phone in the world** at the Goo Grotto. 13 checks:
  - the top bar's one level, and every monster at it;
  - out by the way out and straight back in;
  - the boss on the wire, about twice your height (its scale 6.88 against a
    wave slime's 1.5: x4.59), and "Boss Blue Slime" on the deep red;
  - see-through while you stand behind it (0.45), solid with you in front;
  - hit where it is drawn: a real tap 150 px up its body takes it as your
    target, and a swing from 140 px at its side lands (its HP 220 -> 196).
    With the boss's size taken out of the swing, the same swing did nothing;
  - the card counting down, still inside 6 s on, and Leave now;
  - the time running out by itself;
  - killed by a slime with 5 copper bars in the bag: "Your bag is safe", and
    back in BroTown the 5 bars are still there.

  Pictures: `tools/qa/mp/out/dungeonfix-{title,boss,behind,clear,back,died}.png`.
- **Unchanged and still passing:** `mp-wheeldungeon`, `mp-googrotto` (its
  levels check is now exact) and `mp-monsterplate`.

## Still the owner's call

These are from dungeons-today.md and are not done:

- **A reward worth the trip.** For example, a chest from the boss, and the
  clear's XP going into the weapon you used. The XP still goes to the old
  counter that no skill reads (v2.3.3543 only took it out of the words).
  Done in v2.3.3563, the owner's "Yes": the boss's chest and the clear's XP
  into the weapons used ([boss-chest.md](boss-chest.md)).
- **Getting there.** Travel from the Town Hall's map to dungeons you have found.
- **The farm's Dungeon Workshop.** Remove it, or rebuild it on the world's arena.
- **Something to look at inside.** The arenas are bare floors.
- **The boss's reach.** It is drawn huge but reaches you as a wave monster
  does. Say if it should reach further, as big as it looks.
