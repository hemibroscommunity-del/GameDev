# Tougher monsters from level 6: combos, charges, slams and enrage (v2.3.3946)

The owner, 2026-11-02:

> Make next tier monsters noticeably harder. Develop combo / specific ability
> system to make them harder to beat.

And from the list of 2026-10-26 (item 18): measure it with the fight simulator,
and don't make the judges' first slimes a wall.

## What a player meets

Every Wheel monster stands in a **tier**: five levels of its land's spoke
(levels 1-5 the first, 6-10 the second, ... 36-40 the eighth;
`server/src/wheelzone.js` stamps `m.tier` on every stretch past the first). Each
family of monster now has a short list of moves, and a tier unlocks them:

| Tier | Levels | What is new |
|---|---|---|
| 1 | 1-5 | Nothing. A new player's first fights are exactly as they were. |
| 2 | 6-10 | A signature move: a two-strike **combo** (the slimes' is a **Double Lunge**). |
| 3-4 | 11-20 | A second move: the snowman's **Snow Volley**, a **charge** along a lane, or a **two-step slam**. |
| 5-6 | 21-30 | An **area slam**: a ring round the monster. |
| 7-8 | 31-40 | **Enrage** below 30% HP (faster swings, shorter cooldowns, the body pulses red), and every cooldown 20% shorter. |

Each family's moves (`FAMILY_MOVES` in `server/src/monstermoves.js`):

| Family (the Wheel's kinds) | Tier 2 | Tiers 3-4 | Tiers 5-6 | Tiers 7-8 |
|---|---|---|---|---|
| Slimes (storm slimes, mire wisps, the Verdant Wilds' blue slimes) | Double Lunge | Goo Volley | Belly Flop | Enrage |
| Fire goblins | Claw Combo | Flame Charge | Eruption | Enrage |
| Snowmen | Double Poke | Snow Volley | Avalanche | Enrage |
| Mummies (every archetype of the Wind Dunes) | Bandage Lash | Sand Rush (a charge) | Sandstorm Slam | Enrage |
| Rock monsters | One-Two Punch | Two-Step Slam | Quake | Enrage |
| Fishmen | Fin Combo | Tidal Rush (a charge) | Wave Slam | Enrage |
| Bog lurkers | Bog Combo | Two-Step Slam | Mire Quake | Enrage |

The kits every monster already had stay as they were: a brute's slam, a
slime's lunge, a mummy's roar, the snowman's burrow, the blue slime's burst. The
moves come on top, from tier 2.

### The moves

| Move | The warning (on the ground) | Wind-up | What lands | Cooldown |
|---|---|---|---|---|
| Combo | a ring round the monster, 100 px; it follows the monster | 700 ms, then 400 ms to the second strike (the whole combo drawn from the start: 1,100 ms) | two strikes, each a normal hit, on everyone in the ring | 4.5 s |
| Double Lunge (the slimes' combo) | the same | 800 ms + 450 ms | two strikes, each 0.9 of a hit | 4.5 s |
| Charge | a lane from the monster through you and 70 px on (160-340 px long), 34 px each side, with an arrowhead | 800 ms | a dash at 650 px/s down the lane; 1.5 hits on each player it passes, once | 9 s |
| Volley | a fan: a line to each of three landing spots and a ring (44 px) where each lands | 800 ms, then 650 ms in the air | 0.9 of a hit on anyone by a ball where it lands (0.8 for goo) | 8 s |
| Two-Step Slam | two rings round the monster: 90 px, then 150 px | 800 ms, then 450 ms to the big ring | a hit for each ring you are in when it lands | 9 s |
| Area slam (Quake and the others) | a ring round the monster, 150 px (130 the slimes') | 1,000 ms | 1.6 hits on everyone in it | 11 s |
| Enrage (tiers 7-8) | the body pulses red; a growl | none | swings and throws 30% faster (1,500 → 1,050 ms); cooldowns another 30% shorter | while under 30% HP |

After any special (a move or a kit) a monster with moves waits 1.8 s before the
next, so two warnings never come back to back. The first move can come on first
contact.

### What makes each one fair

The four rules of the kits (`server/src/telegraph.js`), kept:

1. **A warning you can see, long enough to act**: every warning is at least
   600 ms, the big hits (the slams, the charge, anything 1.5 hits or more) at
   least 800. The monster stands still for it. The combo's second strike is on
   the ground from the start.
2. **What is drawn is what is tested**: every hit is measured when it lands,
   against the shape the warning drew, where the player is then. A ring that
   follows the monster is tested where the monster is.
3. **The one door** (`server/src/hits.js` `_monsterHit`), each move its own row
   (`combo`, `charge`, `volley`, `quake`):
   - a shield facing the monster blocks it (10 stamina; a volley's ball is free,
     as a snowball is), and a parry in time breaks the move: a combo loses its
     second strike, a charge stops dead on the shield;
   - a roll slips it, a rock in the way stops it;
   - the safe ground and the harvest shield as ever; a charge never runs onto
     the safe ground.
4. **No one-shots**: no single strike takes more than half a bar.

A stun (Shield Bash, a snow pile's bonk) breaks a move in flight. While it winds
up a move, or between a combo's strikes, a monster is **braced**: a player's blow
does not shove it back (`combat.js`, `_moveBraced`). See "Measured" for why.

## The stat step

Moves alone did not make tier 2 noticeably harder (see "Measured"): a fight with
a monster of your own level is over in 3 to 5 seconds, room for one or two moves.
So, as the brief allowed, every tier past the first also adds **+10% HP and +8%
damage** to a monster, at spawn (`MONSTER_MOVES.STEP`, `_moveTierStep`):

| Tier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| HP | x1 | x1.1 | x1.2 | x1.3 | x1.4 | x1.5 | x1.6 | x1.7 |
| Damage | x1 | x1.08 | x1.16 | x1.24 | x1.32 | x1.4 | x1.48 | x1.56 |

The two numbers are `STEP.HP_K` and `STEP.DMG_K`; a kill pays XP by the damage
dealt, so a bigger monster pays more as before.

## Measured: `tools/dungeon-sim/open-world.mjs`

The fight simulator (`tools/dungeon-sim/sim.mjs`) runs a real GameRoom in
process. Its new open-world mode (`runOpenWorld`) puts one sword player at each
tier's middle level (3, 8, 13 ... 38), in that level's usual gear (copper to
level 10, iron to 20, black steel past it), at one of the tier's own baked
places, against one or two monsters of each of the Wheel's nine kinds at the
same level. The player swings at the nearest and **never blocks or rolls**:

- **careless** never steps out of a warning;
- **average** steps out 70% of the time, about half a second late.

"Before" is `monstermoves: false` (the fights as they were); "after" is this
change. 6 fights a cell, 9 kinds: 54 fights a row. Taken is the share of the
player's bar lost; a fight a monster won counts as 100%.

```
node tools/dungeon-sim/open-world.mjs --runs=6 --points=none
node tools/dungeon-sim/open-world.mjs --runs=6 --points=offense
node tools/dungeon-sim/open-world.mjs --runs=6 --points=balanced
```

### No points spent (the hardest case)

| Tier | Level | 1v1 careless: kill s, taken, deaths/100 (before → after) | 1v2 careless | 1v1 average | 1v2 average |
|---|---|---|---|---|---|
| 1 | 3 | 4.6 s, 22%, 0 → **the same** | 10.0 s, 36%, 0 → **the same** | 5.0 s, 13%, 0 → **the same** | 10.2 s, 20%, 0 → **the same** |
| 2 | 8 | 4.8 s, 24%, 0 → 5.3 s, 31%, 0 (**+30%**) | 10.5 s, 42%, 0 → 11.2 s, 59%, 0 (**+42%**) | 5.3 s, 17% → 5.8 s, 23% (+37%) | 10.2 s, 24% → 11.6 s, 35% (+47%) |
| 3 | 13 | 5.0 s, 23% → 6.0 s, 36% | 10.5 s, 40% → 12.2 s, 66% | 5.3 s, 17% → 6.6 s, 27% | 10.3 s, 22% → 12.1 s, 35% |
| 4 | 18 | 6.1 s, 32% → 7.7 s, 54% | 12.7 s, 54%, 0 → 15.3 s, 86%, 13 | 6.4 s, 27% → 8.6 s, 36% | 12.5 s, 33% → 14.9 s, 51% |
| 5 | 23 | 6.7 s, 34% → 9.0 s, 65% | 13.8 s, 51%, 0 → 18.1 s, 94%, 15 | 7.0 s, 28% → 10.0 s, 57% | 14.3 s, 30%, 0 → 18.4 s, 77%, 2 |
| 6 | 28 | 8.7 s, 50%, 0 → 12.4 s, 94%, 63 | 18.8 s, 79%, 0 → 26.3 s, 100%, 63 | 9.0 s, 48%, 0 → 14.0 s, 84%, 43 | 18.5 s, 61%, 0 → 26.0 s, 96%, 48 |
| 7 | 33 | 11.2 s, 70%, 7 → all lost | 23.5 s, 86%, 13 → all lost | 11.7 s, 66%, 4 → 18.6 s, 99%, 93 | 23.8 s, 65%, 6 → all lost |
| 8 | 38 | 11.7 s, 78%, 31 → all lost | 24.9 s, 93%, 24 → all lost | 12.4 s, 74%, 15 → all lost | 25.5 s, 85%, 7 → all lost |

### The study's "offense" points (Power and Luck; HP, mana, stamina)

| Tier | 1v1 careless (taken, before → after) | 1v2 careless | 1v1 average | 1v2 average | deaths/100 |
|---|---|---|---|---|---|
| 1 | 11% → 11% | 17% → 17% | 8% → 8% | 12% → 12% | 0 |
| 2 | 9% → 10% (+13%) | 15% → 20% (+27%) | 5% → 7% (+30%) | 10% → 13% (+34%) | 0 |
| 3 | 6% → 8% | 13% → 17% | 4% → 6% | 6% → 8% | 0 |
| 4 | 8% → 10% | 14% → 21% | 5% → 6% | 8% → 10% | 0 |
| 5 | 8% → 14% | 14% → 22% | 5% → 13% | 10% → 20% | 0 |
| 6 | 8% → 17% | 18% → 38% | 7% → 15% | 11% → 35% | 0 |
| 7 | 13% → 33% | 20% → 51% | 10% → 28% | 12% → 38% | 0 |
| 8 | 10% → 33% | 24% → 72% | 9% → 25% | 17% → 63% | 0 (2 in 1v2 average) |

Kill times grow with the step: tier 2 2.6 → 2.9 s (1v1), tier 8 3.6 → 5.5 s.

### The study's "balanced" points (Defense and Dodge too)

A balanced character barely gets touched at its own level before or after: 1-3%
of its bar at tiers 2-8 (1v1), up to 6% (1v2, tier 8). The moves raise that by
+3% to +440% of almost nothing.

### What the numbers say

- **Tier 1 is unchanged**, to the number, for every build (the moves, the
  braced rule, the step and the gap all start at tier 2).
- **Tier 2 is noticeably harder, never a wall**: an unbuilt or lightly built
  player takes 30-47% more damage, fights take 10% longer, nobody dies. It is
  short of "a real chance to lose to two at once" in this model: the step that
  would give that is a wall for the player one tier later. The owner's call
  (below).
- **The elder tiers are much harder**: a player with no points spent loses to
  one monster at tiers 7-8 almost every time (before: 70-78% of the bar and
  7-31 deaths a hundred). A built player takes a third to two thirds of its bar.
- **How the first cut failed**, for the record: with the combo's ring left at
  its target's feet and no step, tier 2 took *less* damage than before (-45%).
  The player's own blows shove a monster 30-60 px a hit, so the combo started at
  the player's feet and the player, following the monster in, walked out of its
  ring; the plain swings it replaced never land against a sword spammer at all
  (the shove "treadmill" of v2.3.1639). Hence the ring that follows the monster
  and the braced rule.

### The owner's choices

- **The stat step's size** (`STEP.HP_K` 0.10, `STEP.DMG_K` 0.08): lower them to
  soften the elder tiers, or stop the step at a tier.
- **Tier 2's edge**: shorter combo cooldown (`MOVE_DEFS.combo.cooldownMs` 4,500)
  makes tier 2 harder without touching the rest.

## Wire, caps and switches

- **No new message type.** New `ability` kinds on the existing display-only
  `monster_ability` (already in `PRIVILEGED_EVENTS`): `combo`, `charge`,
  `volley`, `stomp`, `quake`, `enrage`. Each move sends one `telegraph` (with
  its shape: `follow`, `line` with `bx`/`by`/`w`, `fan` with
  `ang`/`span`/`len`/`n`/`br`, `rings` with `r0`, `ring`) and one `execute` a
  strike (a combo's and a two-step slam's two; a volley's `release` with its
  three spots `pts`); a hit on a player is the door's own `monster_attack`.
- **`caps.monstermoves`** (`join.js`; registered in the Test panel's
  `CAP_GATES`): the phone draws the shapes and the enrage pulse only against a
  worker that says this.
- **Kill switches** (live flags, lower case; they ride the caps too):
  - `monstermoves: false`: every tier fights as tier 1 (no moves, no enrage, no
    elder cooldowns, no brace), and the stat step comes off every live monster
    at once, each as hurt as it was (`_monsterMovesFlagChanged`, called by
    liveops.js like the one formula's switch); setting it back puts it on;
  - `monstercombo`, `monstercharge`, `monstervolley`, `monsterenrage`: one kind
    each; `monsterslam`: the two-step slam and the area slam.

## Writes and messages

A move stores nothing: its state is on the monster in memory, gone with a deploy
like every wind-up (handoff rule 11). A whiffed move writes no row; a landed one
is a hit like any other (the door's coalesced vitals save). `cost-guard` holds.
Messages: one small event per warning and per strike, as a kit's.

## On the phone

- `src/game/monsterMoves.js` (no imports): the caps, the shapes from the event
  (every number clamped), a volley's balls, and the enrage worked out from what
  the phone already has: tier = ceil(level / 5) on the Wheel, tier 7+ under 30%
  of its bar -- the worker's own rule (`monster-moves.test` §8 holds them
  together at every tier and bar). No field on the tick: a phone that walks up
  to an enraged elder later sees it too.
- `src/networking/monsterMoveEvents.js`: the enrage's growl (`bossEnrage`, an
  existing sound) and small shake; a volley's release flies three balls on the
  snowball's display-only path; a move's warning is in its monster's element
  colour (`ELEMENTS`).
- `src/rendering/systems/telegraphShapes.js`: the lane (with an arrowhead), the
  fan, the two rings, the ring and the following ring, each edge drawn over a
  dark band (the Stone Hollows' brown on its own stones read as nothing on the
  first phone picture). Hooked into `effectsRenderer.js`'s warning loop (one
  line).
- `gameEvents.js`: the new kinds in `_maLabels`/`_maColors`/`_maShake` (a `!`
  for a label: no words; the slams' wind-up and landing sounds are the slam's).
- The enrage's red pulse is the body's tint (`wheelStageLooks.js`
  `wheelStageTint`, which all three monster draw paths read): a tint only, so no
  draw list is rebuilt (TRAPS §218), and no memory.
- The bestiary: each kind in `CODEX_SPECIAL_LABEL` (`src/data/codexStage.js`).

No new art, sound or texture: **no memory line moves**.

## Tests

- `server/test/monster-moves.test.mjs` (81 checks): unlock by tier for every
  family and every Wheel monster; the warnings' lengths; the combo's state
  machine (its strikes, its gap and cooldown, a parry, a stun, the switch thrown
  mid-move, a fresh life); every hit through the door's row and the rail; the
  charge's lane, dash, once a player, the safe ground, a parry; the volley's fan
  and landing, the free block; the two-step's rings; the quake; enrage and its
  phone mirror; the stat step; every switch and the cap; tier 1 unchanged; no
  row written.
- `hit-door.test`: the four new rows measured like every other (§1-§10).
- `mirror-audit`: the new kinds in the phone's tables, `MOVE_KINDS` and the
  enrage rule both sides, a bestiary label for each.
- `liveops.test` §8m: the six switches.
- `wheelzone.test`: a deeper monster's stats are its level's and its tier's step.
- Phone: `node tools/qa/mp/run.mjs monstermoves` (`world: 'wheel'`): a real
  tier-2 rock monster's combo drawn round it, its strikes landing or missing,
  and the other shapes.
