# Fights between players that last long enough to matter (v2.3.3260)

The owner, after asking whether fights between players are reasonable for
characters with no points spent: *"This might take a while to plan out"*;
then, on leaving mid-fight: *"The idea is that fishing becomes a valuable
skill because they can use it during "no man's land" combat (where all the
higher level resources are) creating a need for higher and higher levels"*;
and finally: *"I want you to plan and implement fixes for all of these
including how much HP each fish should heal. You're the expert on this not
me."*

Then, on this change's first cut: *"Is there a way you can adjust like
starting hp, damage, special attack damage, etc so that there's no special
"PvP" versus "PVE" formulas? I just want one formula that works the same
across everything"*.  The first cut's numbers for player fights only (a 0.4
scale, weapon weights, special shares, a distance falloff, a quarter-size
bite) are gone; **one formula for every fight** replaces them
(`docs/specs/one-formula.md`).

This change does six things:

1. The worker rolls every hit between players itself, the same roll a
   monster takes, and **one formula** makes a fight last seconds, not a
   blink: players have the health for it, and monsters hit harder by as much
   (`docs/specs/one-formula.md`).
2. A sword hits once per swing (it hit twice), and a special counts only
   after the worker has charged for it.
3. Each fish heals more than the one below it (a real ladder).
4. A **quick-eat button** eats the right fish in one tap.
5. Closing the game in the middle of a fight is no escape: your body stays
   in the world for 20 seconds.
6. A shield raised against a player with no lock faces the player who just
   hit you.

Everything was measured on a fight simulator that runs the worker's own
combat code (`tools/pvp-sim/`, see "How it was measured" at the end).

All HP and damage numbers below are the worker's. The game shows them
divided by 5 (`DISPLAY_SCALE_K`): a level 12 character's 700 HP shows as 140
(it was 172, 34, before the one formula).

## What was wrong

Two equal players with no points spent, level 12, iron-tier weapons, average
skill. "Median" is the time from the first hit to the kill.

| Fight | Median, no armour | Median, copper set | Biggest single hit (share of the bar) |
| --- | --- | --- | --- |
| sword v sword | 1.5 s | 2.7 s | 38% |
| bow v bow | 1.9 s | 4.5 s | 18% |
| staff v staff | **0 s** (one hit) | 2.1 s | **191%** |
| sword v bow | 1.8 s (sword wins 11%) | 3.8 s (35%) | |
| sword v staff | 0.8 s (sword wins 4%) | 1.7 s (8%) | |
| bow v staff | 1.7 s | 3.2 s (bow wins 26%) | |

Why:

- **Every hit was a number the phone claimed.** The worker clamped it only at
  7.5x the weapon's base hit, so a modified game could one-shot anyone in No
  man's land, where the bag is the killer's prize.
- **Specials were 70-94% of all damage.** Five on a full mana bar, one every
  1.5 s, and the staff's big bolt rolled 0.3 to 2.5x of an already 8x hit: it
  killed from full health more than half the time.
- **A sword hit twice per swing.** Its claim went out on every frame of the
  400 ms swing (about 24 messages a swing), and the worker's 300 ms lane let
  two of them through.
- **Crits never happened.** The sword sent its crit chance as a fraction
  (0.01) and the worker read it as a percentage; bows and staffs sent 0.
- **A special was a special because the phone said so.** Nothing checked that
  a swipe had been paid for.

And from the other two questions:

- **Fish barely mattered.** The ladder was 100, 140, 180, 220, 260 (the
  owner's "closer to 100" minnow, then +40 a tier), flattening just as each
  tier came to take twice the fishing. Eating took 4-6 seconds of taps in the
  bag, longer than most fights lasted.
- **Closing the game was a free escape.** The body left the world the moment
  the socket closed, with HP and skulls saved, and a fresh launch put you in
  BroTown.

## What it does now

### 1. The worker rolls the hit (`server/src/pvpbalance.js`)

- A hit between players is rolled by the worker, with the **very roll it
  makes against a monster** (`_rollHit`: the weapon, the trained level, the
  points, the grade, the brew, the crit, the ceiling, and the level edge by
  the target's level as an opponent). The phone's number is ignored, so a
  forged claim buys nothing and the crit chance is the real one.
- And nothing else. The first cut multiplied it by numbers for player fights
  only (a 0.4 scale, a sword weight of 1.3, special shares of 0.5/0.45/0.3, a
  bow's and staff's falloff with distance, a 30% cap on hits between
  players); the owner asked for one formula, and then for "Everything is 1
  version", so they are all gone, the cap too. The fight lasts because
  players have more health, and the same swing reads the same number on a
  monster and on a player of that level, drawn the same way
  (`docs/specs/one-formula.md`, "One version").

### 2. One sword hit a swing, and a special only after paying for it

- **Paid specials.** A `swipe` the worker charged mana for opens a 3.5 s
  window worth one special: the sword's special swing, the big staff bolt, or
  the bow volley's three arrows. A claim marked special outside that window is
  an ordinary hit.
- **One sword hit a swing.** The game now sends a swing's hit at most three
  times (0, 90 and 180 ms into the swing), only while the player it is locked
  on is in reach on its own screen, and every claim names its swing (`sw`).
  The worker lands the first that reaches and refuses the rest. An older game
  that sends no `sw` gets one hit per 450 ms, longer than its swing.
- The specials say what they are, as they always did to monsters: the big
  bolt's `orbs` and a volley arrow's `part`. (A retreat shot is a whole
  plain hit against a player, as the worker has always rolled it against a
  monster.)
- The sword's crit chance is sent as a percentage (it was a fraction).

### 3. The fish ladder (`server/src/data.js FISH_HEAL`)

| Fish | Where (Fishing level) | Heals | On screen | Was |
| --- | --- | --- | --- | --- |
| Minnow | the commons (1) | 100 | 20 | 100 |
| Clownfish | levels 1-10 (5) | 150 | 30 | 140 |
| Trout | levels 11-20 (10) | 225 | 45 | 180 |
| Salmon | levels 21-30 (15) | 325 | 65 | 220 |
| Pike | levels 31-40 (20) | 475 | 95 | 260 |

Each tier heals about 1.5x the one below, as each tier takes twice the
fishing and the monsters where it is caught hit about twice as hard. Under
the one formula's bigger bars a fish heals about a fifth to two fifths of
the bar where it is caught (`docs/specs/one-formula.md` "Food"), so every
tier is worth catching where you fight, and the next tier is worth the trip.

The minnow keeps the owner's 100.

### 4. One bite every 15 s in any fight (`PVP_HEAL`)

- A heal eaten at once (a cooked fish, the Garden Stew, the old minnow
  bottle) is one bite per 15 s while you are in a fight: a duel, a hit
  between you and another player in the last 10 s, or (one formula) a blow
  you dealt or took from anything in the last 10 s.
- It heals the same in any fight. (The first cut healed a quarter of a bite
  in a fight with a player; with the one formula's bigger bars a fish is that
  size anyway.)
- With food, equal fish make a fight longer, and the better fish wins most
  of the time (`docs/specs/one-formula.md` "Fights between players").

### 5. The quick-eat button

- One tap eats the right food: of the heals eaten at once in your bag, **the
  smallest that fills what you are missing, else the biggest** (a scratch
  never costs your pike).
- It sits over the movement stick, up and to the right of the Element Burst
  button (the left cluster's second place, `LCTL_SLOT.eat`), for the left
  thumb while the right one keeps attacking.
- It shows the food's own bag picture and how many you carry. While the
  one-bite rule holds the next bite back, a ring runs round it until you may
  eat again, and it flashes once when you may.
- It shows only while you carry such a heal and are missing HP.
- On a keyboard, **V** eats (listed on the keys strip).
- It goes through the bag's own Eat, so the worker decides everything as
  before. Nothing new is sent.

### 6. Leaving in the middle of a fight (`server/src/linger.js`)

- If you leave within 10 s of a hit between you and another player, in the
  Wheel, **your body stays where it was for 20 seconds**. It stands still
  with its guard down, can be hit, and can be killed under No man's land's
  rules (the killer takes the bag). Monsters can hit it too.
- Coming back **from where it stands** (the app brought back from the
  background, a reconnect after a network blip) takes it back at once, with
  its HP as it is.
- Coming back **any other way** (a fresh launch starts in town) waits until
  the body has gone. The game shows "Your bro is still in that fight" with a
  countdown (`src/ui/LingerScreen.js`), then comes in.
- Not for duels (they have their own 15 s grace, then forfeit), nobody in a
  fight, or the last player in the room.
- Kill switch: `linger: false`.

### 7. The shield against a player

- With no lock, a shield raised in a fight with a player pointed at the
  nearest monster (or a stale direction), and the worker judges a block by
  the way the shield faces at impact. Now the player who hit you in the last
  3 s is who a guard raised with no lock faces (`src/game/shieldToggle.js`).
- The button itself already appears for every weapon: a lock, a blow taken
  in the last 5 s, or a monster in reach.

## After: the same fights

The tables are in `docs/specs/one-formula.md` ("Fights between players").
At level 12 with the copper set and no food: sword v sword 9.9 s, bow v bow
12.2 s, staff v staff 12.4 s (they were 2.7, 4.5 and 2.1 s); no blow on an
armoured player over about half a bar; the better player wins 93-100% of
same-weapon fights. An unarmoured player can lose most of a bar to one big
staff bolt.

## Honest limits

- **A sword against a kiting bow or staff.** Everyone runs at the same speed.
  With one formula there is no weight for the sword in player fights any
  more, so it wins fewer of them than the first cut's numbers gave it; at the
  simulator's top skill it never catches them. The fix is a mechanic: let the
  sword's opening lunge work on players (`docs/specs/one-formula.md`).
- **Iron armour against a staff makes long fights**, up to the simulator's
  2-minute limit in a share of sword-against-staff fights.

## Switches and numbers

| Switch (live flag) | Turns off |
| --- | --- |
| `oneformula: false` | the one formula (health, monsters' hits, the two specials, the bite rule in any fight, the level edge in player fights) and with it the worker's roll in player fights: the old claim x 0.5 path (also un-advertises `caps.oneformula`) |
| `pvpbalance: false` | the worker's roll in player fights: the old claim x 0.5 path, exactly (also un-advertises `caps.pvpbalance`) |
| `fishheal: false` | the fish ladder: the old 92 + 8 x level, with the old Recovery bonus on top (also un-advertises `caps.fishheal`) |
| `linger: false` | the body staying: every leaver leaves at once again |

## Deploy order

- An **older game** against this worker: its sword claims every frame (one
  hit per 450 ms gets through, about one a swing), its claims' numbers are
  ignored for the worker's roll, its specials still count only after a paid
  swipe, and a refused join just retries until the body has gone.
- A **new game** against an older worker: it sends `sw`, `orbs`, `part` and
  `rs`, which that worker ignores, claims every frame as before
  (`caps.pvpbalance` absent), and predicts the old fish ladder, the old bar
  and the old specials (`caps.fishheal`, `caps.oneformula` absent).

## How it was measured

`tools/pvp-sim/` runs two players in No man's land at 60 frames a second on a
real `GameRoom`: every hit goes through the worker's `_resolvePvPAttack`,
every bite through its cooking code, every special through its
`_handleAbilityUse`. What the game and the player do (claims, aiming,
kiting, rolling, the shield, eating) is modelled from the game's code and
three skill levels. It is deterministic (seeded).

```
node tools/pvp-sim/matrix.mjs '{}' 300 10 none,both,iron   # time to kill, every pairing
node tools/pvp-sim/food-one.mjs 300                         # one side eats
node tools/pvp-sim/food-both.mjs 300                        # both eat
FLAGS='{"oneformula":false}' node tools/pvp-sim/food-both.mjs # the world before
```

Tests: `pvp-balance` (the worker's roll whole, the paid special, one hit a
swing, no cap of a player's own, the shapes, the kill switches, the page's
half, and §11: the same number on a monster and a player),
`one-formula` (`docs/specs/one-formula.md`), `linger` (41 checks),
`fightfood` §4-4c and §7 (the bite rule in any fight, the same heal, the
quick-eat choice), `mirror-audit` (the fish ladder and the one formula on
both sides), `anticheat`, `duel`; phone tests `mp-quickeat`, `mp-fightfood`,
`mp-linger`, `mp-pvpshield`, `mp-pvpnumbers`.
