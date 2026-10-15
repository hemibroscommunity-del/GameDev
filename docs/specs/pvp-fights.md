# Fights between players that last long enough to matter (v2.3.3258)

The owner, after asking whether fights between players are reasonable for
characters with no points spent: *"This might take a while to plan out"*;
then, on leaving mid-fight: *"The idea is that fishing becomes a valuable
skill because they can use it during "no man's land" combat (where all the
higher level resources are) creating a need for higher and higher levels"*;
and finally: *"I want you to plan and implement fixes for all of these
including how much HP each fish should heal. You're the expert on this not
me."*

This change does five things:

1. The worker rolls every hit between players itself, and the numbers are
   tuned so a fight lasts seconds, not a blink.
2. A sword hits once per swing (it hit twice), and a special counts only
   after the worker has charged for it.
3. Each fish heals more than the one below it (a real ladder), and in a fight
   with another player a bite heals a quarter of itself.
4. A **quick-eat button** eats the right fish in one tap.
5. Closing the game in the middle of a fight is no escape: your body stays
   in the world for 20 seconds.

Everything was measured on a fight simulator that runs the worker's own
combat code (`tools/pvp-sim/`, see "How it was measured" at the end).

All HP and damage numbers below are the worker's. The game shows them
divided by 5 (`DISPLAY_SCALE_K`): a level 12 character's 172 HP shows as 34.

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

- A hit between players is rolled by the worker, with the **same roll it
  makes against a monster** (`_computeAttackDamage`: the weapon, the trained
  level, the points, the grade, the brew, the crit). The phone's number is
  ignored, so a forged claim buys nothing and the crit chance is the real one.
- Then the PvP numbers, each a live flag:

| Number | Value | Flag | What it does |
| --- | --- | --- | --- |
| `SCALE` | 0.4 | `pvp_scale` | the whole hit (was 0.5 of a claim) |
| `KIND` | sword 1.3, bow 1, staff 1 | `pvp_melee`, `pvp_ranged`, `pvp_staff` | the sword weighs more: it has to cross the ground the others hit it over |
| `SPECIAL` | sword 0.5, bow 0.45, staff 0.3 | `pvp_sp_melee`, `pvp_sp_ranged`, `pvp_sp_staff` | a special's share against a player: the staff's big bolt is 8.4x its base where a sword special is 3x and the bow's volley 4.2x |
| `FALLOFF` | whole to 150 px, 0.6 at 450 px and past | `pvp_near`, `pvp_far`, `pvp_min_ranged`, `pvp_min_staff` | a bow's or staff's hit loses force with distance: closing in is how a sword wins |
| `CAP` | 0.3 | `pvp_cap` | no hit takes more than 30% of the target's max HP (after armour): nothing kills from full health |

- The flags are clamped when read, so a typo cannot break the game.
- A special still feels like one: it is the biggest hit in the fight, just not
  the whole fight.

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
  bolt's `orbs`, a volley arrow's `part`, the retreat shot's `rs`.
- The sword's crit chance is sent as a percentage (it was a fraction).

### 3. The fish ladder (`server/src/data.js FISH_HEAL`)

| Fish | Where (Fishing level) | Heals | On screen | Was |
| --- | --- | --- | --- | --- |
| Minnow | the commons (1) | 100 | 20 | 100 |
| Clownfish | levels 1-10 (5) | 150 | 30 | 140 |
| Trout | levels 11-20 (10) | 225 | 45 | 180 |
| Salmon | levels 21-30 (15) | 325 | 65 | 220 |
| Pike | levels 31-40 (20) | 475 | 95 | 260 |

Why these numbers: a character's max HP is 100 + 6 per level + 8 per point in
health. A player who puts a third of their shared points into health has
about 92 + 14 x level HP, and **each fish heals about three quarters of that
player's bar in the middle of the zone it comes from** (the minnow 75% at
level 3, the trout 75% at level 15, the pike 82% at level 35). So every tier
is worth catching where you fight, and the next tier is worth the trip.

The minnow keeps the owner's 100.

### 4. A quarter of a heal in a fight with a player (`PVP_HEAL.SHARE`)

- In a fight with another player (a duel, or within 10 s of a hit between
  you and another player), a heal eaten at once (a cooked fish, the Garden
  Stew, the old minnow bottle) heals **a quarter of itself**, rounded up.
- On screen: a minnow +5, clownfish +8, trout +11, salmon +16, pike +24.
- The old rule stays: one bite per 15 s in such a fight.
- The fish's card says both: "+45 HP when eaten · +11 in a fight with a
  player".

Why a quarter, measured (both players average skill, copper set, both
eating with the quick-eat button, five fish each):

| Share | Lv 12 bows, same fish | Lv 12 staffs, same fish | Lv 7 staffs, same fish |
| --- | --- | --- | --- |
| a half | 39 s | 81 s | 115 s (most never finish) |
| a third | 24 s | 35 s | 84 s |
| **a quarter** | **21 s** | **26 s** | 55 s |
| no food | 15 s | 17 s | 33 s |

At a half, two players carrying fish could not finish each other. At a
quarter, equal food makes a fight about 1.5x longer, and the fish still
decides it:

| Lv 12, B's win rate | same fish | B a tier better | B two tiers better | A has none |
| --- | --- | --- | --- | --- |
| swords | 43% | 79% | 93% | 97% |
| bows | 53% | 78% | 97% | 99% |
| staffs | 48% | 70% | 95% | 90% |

That is the owner's "need for higher and higher levels": the fish caught
where you fight beats the tier below most of the time, and carrying fish
beats carrying none nearly every time.

The live flag `pvp_heal_share` retunes it without a deploy.

### 5. The quick-eat button

- One tap eats the right food: of the heals eaten at once in your bag, **the
  smallest that fills what you are missing, else the biggest** (a scratch
  never costs your pike). In a fight with a player it picks by the quarter
  heal.
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

## After: the same fights

Level 12, iron-tier weapons, average skill, no food:

| Fight | Median, no armour | Median, copper set | Biggest single hit |
| --- | --- | --- | --- |
| sword v sword | 3.8 s | 7.4 s | 30% |
| bow v bow | 6.9 s | 14.8 s | 12% |
| staff v staff | 8.1 s | 16.6 s | 30% |
| sword v bow | 4.8 s (sword wins 44%) | 9.3 s (78%) | |
| sword v staff | 4.4 s (30%) | 7.9 s (44%) | |
| bow v staff | 6.9 s (52%) | 14.2 s (42%) | |

- Specials are now about 40% of the damage (they were 70-94%).
- The better player still wins 94-100% of same-weapon fights.

## Honest limits

- **A very good bow or staff player can kite a sword forever.** Everyone
  runs at the same speed, and the ranged weapons fire specials while backing
  off. At the simulator's top skill a sword never catches them. Fixing it
  would mean slowing ranged weapons while they shoot, or a gap-closer for the
  sword; that is a design choice for the owner, not a number.
- **Fights get shorter as levels rise if nobody spends points on health.**
  Damage grows faster with level than the base HP does. With no points spent,
  a level 22 sword fight is about 5 s with the copper set. The game expects
  points in health and armour.
- **Iron armour against a staff makes long fights.** About a third to a half
  of sword-against-staff fights in iron armour hit the simulator's 2-minute
  limit.

## Switches and numbers

| Switch (live flag) | Turns off |
| --- | --- |
| `pvpbalance: false` | the worker's roll and the PvP numbers: the old claim x 0.5 path, exactly (also un-advertises `caps.pvpbalance`) |
| `fishheal: false` | the fish ladder and the quarter bite: the old 92 + 8 x level, every bite whole (also un-advertises `caps.fishheal`) |
| `linger: false` | the body staying: every leaver leaves at once again |

Every PvP number above is a live flag too (`pvp_scale`, `pvp_cap`, ...,
`pvp_heal_share`), clamped when read.

## Deploy order

- An **older game** against this worker: its sword claims every frame (one
  hit per 450 ms gets through, about one a swing), its claims' numbers are
  ignored for the worker's roll, its specials still count only after a paid
  swipe, and a refused join just retries until the body has gone.
- A **new game** against an older worker: it sends `sw`, `orbs`, `part` and
  `rs`, which that worker ignores, claims every frame as before
  (`caps.pvpbalance` absent), and predicts the old fish ladder
  (`caps.fishheal` absent).

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
FLAGS='{"pvp_heal_share":0.5}' node tools/pvp-sim/food-both.mjs
```

Tests: `pvp-balance` (the worker's roll, the paid special, one hit a swing,
the numbers, the cap, the shapes, the flags, the kill switch, the page's
half), `linger` (41 checks), `fightfood` §4c and §7 (the quarter bite, the
quick-eat choice), `mirror-audit` (the fish ladder and the share on both
sides), `anticheat`, `duel`.
