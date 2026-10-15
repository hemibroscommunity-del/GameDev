# One formula for every fight (v2.3.3260)

The owner, on the first cut of this version (which tuned fights between
players with numbers of their own): *"I understand you're tuning this for good
TTK times. Is there a way you can adjust like starting hp, damage, special
attack damage, etc so that there's no special "PvP" versus "PVE" formulas? I
just want one formula that works the same across everything"*.

And then, on the second cut: *"Ok is there a way to keep the same relative
balance of power here but change it so that the numbers for damage between
PVP and PVE can be exactly the same for each combat skill type (melee, bow,
staff)? Also for fish healing too. I don't want 2 versions I want just 1. A
fish heals the same fixed amount always. Same with damage dealt it stays
consistent. Everything is 1 version"*.

There is. A hit is now the same hit whoever takes it, a monster or a player,
and it is drawn the same way on every screen. A fight between players lasts
long enough because **players have more health**, not because their hits on
each other are cut. To keep fighting monsters the way it was, **monsters hit
harder by exactly as much**.

Code: `server/src/oneformula.js` (the worker), `src/data/oneFormula.js` (the
game's copy, held to the worker's by `mirror-audit`), the one roll
`_rollHit` in `server/src/combat.js`.

All HP and damage numbers here are the worker's. The game shows them divided
by 5 (`DISPLAY_SCALE_K`).

## What changed

| | Before | Now |
| --- | --- | --- |
| Max HP | 100 + 6 a level + 8 a Max HP point | **100 + 50 a level + 40 a Max HP point** |
| A monster's hit | its curve | its curve x **how much bigger a matching player's bar is** (`monsterHitK`) |
| A player's hit | rolled one way on a monster (with the level edge) and another on a player (without it) | **one roll, whoever takes it** (`_rollHit`) |
| The level edge (a stronger opponent blunts your points) | against monsters only | **against monsters and players alike** |
| Biggest single blow on a player | half the bar from a telegraph or a boss's ability; anything from a player | the same: **no cap of a player's own** (the first cut's 30% cap is gone) |
| The sword's special | 3x a plain hit | **4.5x** |
| The staff's big bolt | 3 orbs' worth (8.4x a plain bolt on average) | **0.6 of that** (about 5x) |
| A fish's heal | its number + the old HP grid's Recovery (0 for every current character) | **its number, always** |
| A heal in a fight | (first cut: a quarter of itself in a fight with a player) | **the same in any fight** |
| One healing bite every 15 s | in a fight with a player | **in any fight** (a monster's too) |
| A hit between players | (first cut: the roll x 0.4 x a weapon weight x a special share x a distance falloff) | **the roll, whole** |
| How a hit on a player is drawn | red with a '!', like a hit taken; onlookers saw nothing | **like a hit on a monster** (below) |

"Level" is the character level, the three weapon skills added up. A monster
of level M is matched to character level M + 2 (its skill at M, the other two
at 1).

## One version (v2.3.3261)

**The hit.** The monster path and the player path each rolled a hit their own
way. Now both call one function, `_rollHit` (`server/src/combat.js`): the
weapon, the trained level, the points, the grade, the brew, the crit, the big
bolt and the volley's shapes, the level edge, and the ceiling. So a swing, an
arrow or a bolt is **the same number on a monster as on a player of that
level**. `server/test/pvp-balance.test.mjs` §11 lands each one on both (a
plain sword, bow and staff hit, the sword's special, the big bolt, a volley
arrow, a crit, and a target three levels up) and reads the same number off
both.

**The level edge, both ways.** A target above your level blunts your Power,
Luck and Special, and an attacker above your level blunts your Dodge, Defense
and Resist. That is the same whether it is a monster or a player. A player's
level as an opponent is their highest trained skill (`_prog3OpponentLevel` in
`server/src/prog3.js`), and a monster's is its level. At equal levels nothing
changes. Before, a player always met a player at full strength (v2.3.2680 had
left it as "a PvP design call of its own").

**The guard.** What protects the one who is hit protects them from every
attacker the same way: Dodge, Defense, armour, the Root Stew and the shield.
Monsters wear none of it, so **on a player with nothing on, your hit shows the
very number it shows on a monster**. Armour on a player cuts it, and it cuts a
monster's hit on them by exactly as much. That is the one thing that can make
the same swing read smaller, and it is the same rule for every attacker.

**No cap of a player's own.** The first cut stopped every blow on a player at
30% of their bar, and a monster had no such cap. So the same big hit read 300
on a monster and 210 on a player. The cap is gone. Measured on the simulator
(`tools/pvp-sim/`), the rest of this page's tables are the result:

- **Armoured fights are unchanged.** With the copper set at level 12: 9.9,
  12.2 and 12.4 s (12.4 was 13.3).
- **The biggest blow on an armoured player is about half a bar.** The largest
  in 150 fights a pairing was 51%: a level-22 staff bolt on the copper set.
  99 hits in 100 took a third of a bar or less.
- **An unarmoured player can lose most of a bar to one big staff bolt**, up
  to 92%. A quarter of a staff's hits on someone unarmoured take more than 30%
  of the bar. That is the staff's high variance (the owner's own words for it).
  Unarmoured, the staff wins more of its fights than it did (below).
- The monsters' own rails are what they always were: half the bar for a
  telegraphed hit or a boss's ability, and the fire trail's.

**The heal.** A fish heals its own number, always: in town, against a monster
and against a player. That is minnow 100, clownfish 150, trout 225, salmon 325
and pike 475 (20 / 30 / 45 / 65 / 95 on screen), and the Garden Stew 150. The
old HP grid's Recovery bonus no longer adds to it. It was 0 for every current
character anyway. The one rule about eating is the same everywhere: in a fight
with anything, one healing bite every 15 s.

**How it is drawn** (`src/networking/gameEvents.js`, the `pvp_hit` case):

| Who is looking | A hit on a monster | A hit on a player, before | A hit on a player, now |
| --- | --- | --- | --- |
| The one who hit | amber number, the weapon's mark, the crit's colour and mark | red "-N!" | **amber number, the weapon's mark, the crit's colour and mark** |
| The one hit | (a monster's hit on you: red number with the heart) | red number, no mark | **red number with the heart** |
| Someone watching | (a monster's hit on a player: red number over them) | nothing | **red number over them** |
| A block | (a monster's on you: "Blocked!" and the ⚡ it cost) | grey "-0" and "BLOCKED" | **"Blocked!" and the ⚡ it cost** |

**One figure on every screen.** A hit on a player prints the same figure
the monster branch prints for a hit on a monster: the change in the bar
(`toDisplayHitDamage`), or the hit itself on a kill. It is the same on the
striker's, the target's and every onlooker's screen, and for a monster's hit
on a player too (`gameEvents.js` `takenFigure`). The first run of
`mp-pvpnumbers` caught one blow reading "-2" to the striker and "-3" to the
target and the onlooker: two rounding rules. To do it, the worker now sends
the HP a blow left (`hp`) on `monster_attack`, as `pvp_hit` always has. It
also names the weapon on `pvp_hit` (`slot`) and what a block cost
(`staminaDrain`), as it does on `monster_hit` and `monster_attack`. A blocked hit from a player counts
toward the "block 10 hits" quest, as a monster's does. Onlookers draw a fight
in their own zone within 2,800 px of them, the reach a monster's hit on that
player has. `pvp_hit` goes to every zone, so without the zone check (the
`_peerInZone` gate every relayed effect has) a duel in town bled and took
numbers over the ground of a watcher in Frost Ridge -- found by re-reading
this change, caught by the scenario's step 5 before the fix.
`mp-pvpnumbers` checks all of it on three phones.

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
- **Food is a fifth to two fifths of your bar** where each fish is caught (it
  was most or all of it), and one healing bite every 15 s while you are
  fighting anything. Out of a fight you can eat as fast as you like.
- **The two specials.** The sword's special swing hits 50% harder, on every
  monster in its ring. The staff's big bolt hits 40% less: it is still the
  hardest special of the three on average and keeps its whole spread, but it
  no longer kills a monster of your level outright. The staff out-farmed the
  sword and the bow by up to a third; now the three are close:

| Kills a minute (2 minutes of monsters of your level, copper set) | Sword | Bow | Staff |
| --- | --- | --- | --- |
| Level 7, before -> now | 16 -> 16.5 | 14 -> 14 | 16.5 -> 13.5 |
| Level 12 | 16 -> 17.5 | 16 -> 16 | 18.5 -> 18 |
| Level 22 | 13 -> 13.5 | 12.5 -> 12.5 | 16.5 -> 14 |

(Unchanged by the one-version pass: a monster had no cap and always had the
edge.)

- **Bigger numbers on screen**: your bar and the monsters' hits both read 2
  to 6 times higher.

### Food

The fish ladder: minnow 100, clownfish 150, trout 225, salmon 325, pike 475,
always. Against the bigger bars a fish heals:

| Fish | At the low end of where it is caught | At the high end |
| --- | --- | --- |
| Minnow (100) | 40% (level 3) | 22% (level 7) |
| Clownfish (150) | 33% (level 7) | 21% (level 12) |
| Trout (225) | 32% (level 12) | 19% (level 22) |
| Salmon (325) | 27% (level 22) | 19% (level 32) |
| Pike (475) | 28% (level 32) | 22% (level 42) |

The heal is the fish's number. The shares are only how big that number is
next to a bar of that level.

## Fights between players

Two equal players, no points spent, average skill, no food. Median seconds
from the first hit to the kill; "wins" is how often the first weapon wins.

| | Sword v sword | Bow v bow | Staff v staff | Sword v bow | Sword v staff | Bow v staff |
| --- | --- | --- | --- | --- | --- | --- |
| Level 7, copper set | 11.2 s | 17.5 s | 17.0 s | sword wins 85% | 39% | bow wins 57% |
| Level 12, no armour | 4.5 s | 5.1 s | 4.5 s | 12% | 13% | 55% |
| **Level 12, copper set** | **9.9 s** | **12.2 s** | **12.4 s** | **23%** | **25%** | **64%** |
| Level 12, iron set | 12.2 s | 16.3 s | 15.6 s | 39% | 26% | 67% |
| Level 22, copper set | 7.8 s | 11.6 s | 9.0 s | 51% | 9% | 36% |
| Level 22, iron set | 11.1 s | 14.3 s | 11.2 s | 35% | 6% | 38% |

Before this version, the level-12 copper-set fights were 2.7 s, 4.5 s and
2.1 s, and the staff killed from full health with one bolt more than half the
time. The first cut's 30% cap changed only the staff's rows: level 12 copper
13.3 s, unarmoured staff v staff 6.2 s, sword v staff 26%, bow v staff 77%.

- Specials are about half to four fifths of the damage: still the big moments, no longer
  the whole fight in one second.
- The better player wins 93-100% of same-weapon fights.

With food (both eating with the quick-eat button, five fish each, copper
set):

| | Same fish: fight length | One tier better wins | Fish against none wins |
| --- | --- | --- | --- |
| Level 7 | 18-37 s | 93-100% | 96-100% |
| Level 12 | 15-19 s | 78-92% | 85-100% |
| Level 22 | 12-16 s | 54-78% | 68-97% |

That is the owner's "fishing becomes a valuable skill ... in No man's land
combat": the fish caught where you fight beats the tier below most of the
time, and carrying fish beats carrying none nearly every time. The staff is
the low end of each range: its big bolts make a fight swingier than a meal
can fix.

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
- **An unarmoured player against a staff.** With no cap of a player's own, a
  big bolt can take most of an unarmoured bar (above). Armour is the answer,
  as it is against a monster that hits hard. If it is too swingy, the knob
  that stays one version is the bolt itself (`STAFF_BOLT_K`, or its band),
  and it would change the staff against monsters too.

## Players already in the game

A bar that changed size keeps how full it was (`_keepBarFullness`): a player
who logged out at full health logs in at full health, at half at half.

## Switch

`oneformula: false` (live flag) puts all of it back: the old health, monsters'
old hits, the old specials, the bite rule only in fights with a player, PvP at
edge 1, and the PvP resolver's old path. Throwing it re-sizes every connected
player's bar (keeping how full it is) and every live monster's hit at once
(`_oneFormulaFlagChanged`, called by the admin flags route). It also
un-advertises `caps.oneformula`. `fishheal: false` puts back the old fish
ladder, with the Recovery bonus on top. These are emergency switches for the
whole game at once, not a second version anyone plays.

## Deploy order

- A **new game against an older worker** predicts the old bar, the old
  monster hits, the old specials and the old heals (it reads
  `caps.oneformula` and `caps.fishheal` before using any of it), and sends its
  sword claims every frame as before. It draws an older worker's `pvp_hit`
  the new way too: a missing `slot` falls back to the weapon in its own hand,
  as on a monster, and a missing `staminaDrain` shows no ⚡.
- An **older game against this worker** sees its bar and every hit from the
  worker's messages, as always; only its own predictions between messages
  and its drawing of a hit on a player are the old ones.

## Tests

- `server/test/one-formula.test.mjs`: the health formula, a joined player's
  bar, every monster's hit and its share of a matching bar at levels 1-60,
  the game's copy of a monster, the fire trail, no cap of a player's own, the
  specials and the anti-cheat ceiling, a bar keeping its fullness at the join
  and when the switch is thrown, the caps.
- `pvp-balance` §11: the same swing, arrow, bolt, special, volley arrow and
  crit land the same number on a monster and on a player of that level; the
  edge both ways (a level-15 target blunts a level-12 player's Power and
  Special on a monster and on a player alike; a player's blow tells the
  target's guard its level as an opponent); the old path keeps edge 1.
- `grids` §6 (a fish heals its fixed number, Recovery only with the ladder
  switched off), `fightfood` (the bite rule in any fight, heals whole),
  `mirror-audit` (the two copies of the formula agree, on and off), `statsim`
  (the stat window's scene), `combat-lifecycle`, `dungeon`, `burrow`, `prog3`.
- Phone tests: `mp-pvpnumbers` (three phones: the striker's, the target's
  and an onlooker's view of one hit, a block, and nothing drawn for a fight in
  another zone), `mp-quickeat`,
  `mp-fightfood`, `mp-prog3`, `mp-linger`, `mp-questline`, `mp-statdemo`, and
  `mp-pvpshield` (the shield against a player, below).
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
