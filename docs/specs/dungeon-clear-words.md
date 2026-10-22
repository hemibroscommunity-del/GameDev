# A dungeon clear says only what it pays (v2.3.3543)

An OPTIONAL change, from the outside reviews of the game as built
(docs/GDD-AS-BUILT.md): a number the game shows should be a number the player
gets. The owner, 2026-10-21: *"I value SIMPLICITY and INTELLIGIBILITY"*.

## What it did

- Clearing a dungeon (its last wave, or the boss) shows two lines over your
  bro: "DUNGEON CLEARED!" and "+96G +255XP".
- The gold is real. The worker adds it to your purse (`dungeon.js`
  `_dungeonComplete`).
- **The XP is not.** The worker adds it with `_addCombatXp`, which under the
  three-weapon system (prog3) is the old single-level counter: it moves no
  skill, no XP bar and no level. A player who went to the Skills page to find
  the 255 found nothing.
- The kill's own "+N XP" had the same problem, and was hidden under prog3 in
  v2.3.1727 (gameEvents.js `monster_kill`): *"DON'T POP A NUMBER THAT MEANS
  NOTHING"*. The clear was missed.

## What it does now

- Under prog3 the clear's second line is the gold alone: "+96G".
- A pre-prog3 character, for whom the number is real, still sees the XP.
- Nothing else changes: the worker, the payout, the message on the wire.

## The other way to fix it (the owner's call)

The clear could PAY its XP into a real skill instead of saying less. The
simplest rule: **into the weapon in your hand** at the clear ("+255 Melee
XP"). That makes a clear worth more (at level 3 the Goo Grotto's ~255 XP is
most of a level). It is a balance change, not a fix, so it was not made here.
It is a few lines in `_dungeonComplete` if wanted.

**Done in v2.3.3563** ([boss-chest.md](boss-chest.md)), the owner's "Yes":
a world dungeon's clear pays its XP into the weapons you fought with in that
run, by their shares (the weapon in your hand if you earned none there), and
the clear's card says "+255 Sword XP" under the boss's chest.

## Deploy order

The page alone. Any worker sends the same `dungeon_complete {gold, xp}`.

## Tests

- **`mp-wheeldungeon`** step 4: the words over you as the Great Cave is
  cleared include "DUNGEON CLEARED!" and "+<gold>G", and no "XP".
