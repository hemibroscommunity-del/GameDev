# One formula for every fight (v2.3.3260)

The owner, on the first cut of this version (which tuned fights between
players with numbers of their own): *"I understand you're tuning this for good
TTK times. Is there a way you can adjust like starting hp, damage, special
attack damage, etc so that there's no special "PvP" versus "PVE" formulas? I
just want one formula that works the same across everything"*.

There is. A hit is now the same hit whoever takes it, a monster or a player.
A fight between players lasts long enough because **players have more
health**, not because their hits on each other are cut. To keep fighting
monsters the way it was, **monsters hit harder by exactly as much**.

Code: `server/src/oneformula.js` (the worker), `src/data/oneFormula.js` (the
game's copy, held to the worker's by `mirror-audit`).

All HP and damage numbers here are the worker's. The game shows them divided
by 5 (`DISPLAY_SCALE_K`).

## What changed

| | Before | Now |
| --- | --- | --- |
| Max HP | 100 + 6 a level + 8 a Max HP point | **100 + 50 a level + 40 a Max HP point** |
| A monster's hit | its curve | its curve x **how much bigger a matching player's bar is** (`monsterHitK`) |
| Biggest single blow on a player | half the bar (telegraphs, boss abilities), anything (players) | **30% of the bar, whoever lands it** |
| The sword's special | 3x a plain hit | **4.5x** |
| The staff's big bolt | 3 orbs' worth (8.4x a plain bolt on average) | **0.6 of that** (about 5x) |
| A heal in a fight | a quarter of itself in a fight with a player (first cut) | **the same in any fight** |
| One bite every 15 s | in a fight with a player | **in any fight** (a monster's too) |
| A hit between players | the roll x 0.4 x a weapon weight x a special share x a distance falloff (first cut) | **the roll, whole** |

"Level" is the character level, the three weapon skills added up. A monster
of level M is matched to character level M + 2 (its skill at M, the other two
at 1).

### Health

| Character level | Before | Now | On screen |
| --- | --- | --- | --- |
| 3 (a new character) | 118 | 250 | 24 -> 50 |
| 7 | 142 | 450 | 28 -> 90 |
| 12 | 172 | 700 | 34 -> 140 |
| 22 | 232 | 1,200 | 46 -> 240 |
| 42 | 352 | 2,200 | 70 -> 440 |

Health now grows with level about as fast as damage does. Before, a level-30
fight between two players lasted a third as long as a level-5 one.

### Monsters

Every monster's hit is multiplied by its matching player's new bar over the
old one: 2.1x at level 1, 4.1x at level 10, 5.2x at level 20, 6.3x at level
40. So **a monster takes the same share of a matching player's bar as it
always did** (checked for every level 1-60 by `one-formula.test.mjs`). The
slime's burst and the fire trail, the two flat amounts, are scaled the same
way. Burns, poisons and storm arcs are shares of the hit, so they follow.

What does change against monsters:

- **A monster above your level hits a little harder against your bar, one
  below a little softer.** Ten levels above: about a third harder. Ten below:
  about a fifth softer. Levels mean a bit more.
- **No blow takes more than 30% of your bar.** A telegraphed slam or a boss's
  ability could take half before.
- **Food is a third or so of your bar** (it was most or all of it), and one
  healing bite every 15 s while you are fighting anything. Out of a fight you
  can eat as fast as you like.
- **The two specials.** The sword's special swing hits 50% harder, on every
  monster in its ring. The staff's big bolt hits 40% less: it is still the
  hardest special of the three on average and keeps its whole spread (the
  owner's "staff, but with high variance"), but it no longer kills a monster
  of your level outright. The staff out-farmed the sword and the bow by up to
  a third; now the three are close:

| Kills a minute (2 minutes of monsters of your level, copper set) | Sword | Bow | Staff |
| --- | --- | --- | --- |
| Level 7, before -> now | 16 -> 16.5 | 14 -> 14 | 16.5 -> 13.5 |
| Level 12 | 16 -> 17.5 | 16 -> 16 | 18.5 -> 18 |
| Level 22 | 13 -> 13.5 | 12.5 -> 12.5 | 16.5 -> 14 |

- **Bigger numbers on screen**: your bar and the monsters' hits both read 2
  to 6 times higher.

### Food

The fish ladder is unchanged (minnow 100, clownfish 150, trout 225, salmon
325, pike 475). Against the bigger bars a fish heals:

| Fish | At the low end of where it is caught | At the high end |
| --- | --- | --- |
| Minnow (100) | 40% (level 3) | 22% (level 7) |
| Clownfish (150) | 33% (level 7) | 21% (level 12) |
| Trout (225) | 32% (level 12) | 19% (level 22) |
| Salmon (325) | 27% (level 22) | 19% (level 32) |
| Pike (475) | 28% (level 32) | 22% (level 42) |

That is the size the first cut's "quarter of a heal in a fight with a player"
was aiming at, now the same everywhere.

## Fights between players

Two equal players, no points spent, average skill, no food. Median seconds
from the first hit to the kill; "wins" is how often the first weapon wins.

| | Sword v sword | Bow v bow | Staff v staff | Sword v bow | Sword v staff | Bow v staff |
| --- | --- | --- | --- | --- | --- | --- |
| Level 7, copper set | 11.2 s | 17.5 s | 16.8 s | sword wins 85% | 39% | bow wins 58% |
| Level 12, no armour | 4.5 s | 5.1 s | 6.2 s | 12% | 26% | 77% |
| **Level 12, copper set** | **9.9 s** | **12.2 s** | **13.3 s** | **23%** | **25%** | **65%** |
| Level 12, iron set | 12.2 s | 16.3 s | 15.6 s | 39% | 28% | 57% |
| Level 22, copper set | 7.8 s | 11.6 s | 9.1 s | 51% | 8% | 39% |
| Level 22, iron set | 11.1 s | 14.3 s | 11.5 s | 35% | 6% | 39% |

Before this version, the level-12 copper-set fights were 2.7 s, 4.5 s and
2.1 s, and the staff killed from full health with one bolt more than half the
time.

- No single blow takes more than 30% of a bar.
- Specials are about 50-75% of the damage: still the big moments, no longer
  the whole fight in one second.
- The better player wins 93-100% of same-weapon fights.

With food (both eating with the quick-eat button, five fish each, copper
set):

| | Same fish: fight length | One tier better wins | Fish against none wins |
| --- | --- | --- | --- |
| Level 7 | 18-37 s | 94-100% | 94-100% |
| Level 12 | 15-19 s | 75-91% | 83-100% |
| Level 22 | 12-16 s | 56-77% | 72-96% |

That is the owner's "fishing becomes a valuable skill ... in No man's land
combat": the fish caught where you fight beats the tier below most of the
time, and carrying fish beats carrying none nearly every time.

## What one formula cannot do

- **A sword against a bow or a staff in the open.** A monster walks up to
  you; a player runs. The first cut gave the sword a weight of its own in a
  fight with a player and took force off a bow's or staff's hit with
  distance. Both were numbers for player fights only, so both are gone, and
  the sword loses more of those fights than it did (above). At the
  simulator's top skill, a bow or staff player who backs off at full speed is
  never caught by a sword, with any numbers. **The fix is a mechanic, not a
  number**: let the sword's opening lunge (the dash that starts a fight with
  a monster, `sworddash`) work on players too. It would be the same move for
  every target, so it fits one formula. Not built here: it needs its own
  rules for what its stun does to a player.
- **A sword against a staff in iron armour** can hit the simulator's 2-minute
  limit (up to 45% of fights at level 7): the sword cannot catch the staff and
  the staff's bolts barely dent iron.
- **Defense and Dodge against a player always count in full.** Against a
  monster they fade when it is more than your level ("the edge"). This was
  already so before this version and is not a damage formula.

## Players already in the game

A bar that changed size keeps how full it was (`_keepBarFullness`): a player
who logged out at full health logs in at full health, at half at half.

## Switch

`oneformula: false` (live flag) puts all of it back: the old health, monsters'
old hits, no 30% cap, the old specials, the bite rule only in fights with a
player, and the PvP resolver's old path. Throwing it re-sizes every connected
player's bar (keeping how full it is) and every live monster's hit at once
(`_oneFormulaFlagChanged`, called by the admin flags route). It also
un-advertises `caps.oneformula`.

## Deploy order

- A **new game against an older worker** predicts the old bar, the old
  monster hits and the old specials (it reads `caps.oneformula` before using
  any of it), and sends its sword claims every frame as before.
- An **older game against this worker** sees its bar and every hit from the
  worker's messages, as always; only its own predictions between messages
  are the old ones.

## Tests

- `server/test/one-formula.test.mjs` (33 checks): the health formula, a
  joined player's bar, every monster's hit and its share of a matching bar
  at levels 1-60, the game's copy of a monster, the fire trail, the 30% cap
  for every kind of blow, the specials and the anti-cheat ceiling, a bar
  keeping its fullness at the join and when the switch is thrown, the caps.
- `pvp-balance` (the hit between players is the roll, whole), `fightfood`
  (the bite rule in any fight, heals whole), `mirror-audit` (the two copies
  of the formula agree, on and off), `statsim` (the stat window's scene),
  `combat-lifecycle`, `dungeon`, `burrow`, `prog3`.
- Phone tests: `mp-quickeat`, `mp-fightfood`, `mp-prog3`, `mp-linger`,
  `mp-questline`, `mp-statdemo`, and `mp-pvpshield` (the shield against a
  player, below).
- `tools/pvp-sim/` plays the fights on the worker's own code:
  `node tools/pvp-sim/matrix.mjs '{}' 300 5,10,20 none,both,iron`.

## The shield against a player

Asked whether the shield button appears "the moment you're in combat for any
weapon type", it does: a lock, a blow taken in the last 5 s, or a monster in
reach shows it, with a sword, a bow or a staff alike. But with no lock, a
raised guard pointed at the nearest *monster* (or a stale direction), and the
worker measures a block's arc at impact, so a player's arrow walked past the
shield it had just made appear. Now a blow from a player is remembered for
3 s, and a guard raised with no lock faces them (`src/game/shieldToggle.js`
`noteShieldThreat`, `shieldThreatPoint`). `mp-pvpshield` checks it on two
phones: the button for all three weapons, the guard facing the attacker with
a monster planted behind, and the next blow blocked by the worker.
