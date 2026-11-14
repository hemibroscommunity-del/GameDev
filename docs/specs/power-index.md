# The power index (v2.3.5480, card PW)

> The owner, 2026-11-14: *"I think "total power" shouldn't just be a summary
> of the 3 combat skills but more of a "power index" score based on
> equipment, stat allocations, and primary combat skills that best predict
> generalized PVP success against a control character."*

Code: `server/src/power.js` (`POWER`, `powerOf`). Suite:
`server/test/power.test.mjs`, with its duel simulator
`server/test/power-sim.mjs`. Card: `docs/plan/cards/PW.md`.

PR 1 (this) is the model and its proof: nothing a player sees changes. PR 2
puts it on the boards (the row, `getTop('power')`, the live flag `power`,
`caps.power`); card LB draws it.

## In plain words

Imagine one fixed opponent, the **control**: a level-20 character. Your
Power is how your best fight against it would go.

For each of your three styles (melee, bow, magic) the worker plays that
fight **on averages**: how hard each of you hits the other on average, after
the other's Dodge, Defense and armour; how often each of you attacks; the
specials your mana bar holds; and how much health each of you has. That
gives the time each of you needs to beat the other.

    your odds against the control = (the control's time to beat you / your time to beat it) ^ 2
    a style's score = 3,000 + 400 x log10(your odds against the control)

**A rating, like chess's** (the owner's choice, 2026-11-14: "Go recommended",
shown this beside the odds themselves and a narrower power of them). The
control rates exactly 3,000 in every style. **Every 400 points ahead is ten
times likelier to win**: 3,400 beats the control ten fights in eleven, and
between any two characters the odds are 10^(difference / 400). Your
**Power** is your best style's rating; the three are kept too (`melee`,
`bow`, `magic`). A rating is a whole number, at least 1 for a style you can
fight in; 0 means no weapon in that hand.

The exponent 2 was fitted so that the odds name who wins (below, "The
fit").

## The control (`POWER.CONTROL`, version `POWER.V` 2)

An honest mid-game character of today's game, never fitted to anyone's own
character:

| | |
| --- | --- |
| Skills | Melee 20, Bow 20, Magic 20 (so each style meets its own mirror) |
| Shared points (57, all its levels give) | Max HP 15, Defense 12, Dodge 12, Stamina 6, Mana 6, Elemental resist 3, Move 3 |
| Each style's points (57 each) | Power 18, Luck 15, Speed 12, Special 9, Range 3 |
| Gear | what the level 11-20 lands give: a Black Steel Great Sword, a Hardwood Bow and Staff, a Black Steel Torso and Greaves, the Pine Shield; all normal grade, unhardened, no amulet |

The suite holds it honest: the points within what its levels deal
(`prog3RespecPoints`), every piece through the worker's own equip gate
(`_prog3EquipOk`). It never changes quietly: a change to the control, the
exponent or the rating bumps `POWER.V`, every score is recomputed, and a row
carrying another `v` reads as not yet ranked (PR 2). Version 1 (the odds as
a number, the control at 1,000) never reached a board; version 2 is the
rating.

## Where every number comes from

All from the worker's own code, called, never copied (the suite's §5 bends
each in place and needs the score to move):

| What | The worker's function |
| --- | --- |
| A hit (weapon, tier, grade, trained level, Power, Luck's crit, the special and its shape, the level edge, the ceiling) | `combat.js _rollHit`, the very roll a hit between players makes; its two dice walked on a fixed grid of 16 points (`withDice`) |
| What lands: Dodge, Defense under the combined floor, armour | `prog3.js _prog3DodgePct`, `_prog3DefMult`, `PROG3.FLOOR`; `combat.js _armorDrMult` (in `_applyDamage`'s order: §2 holds the composition to 40,000 real blows through the door, within 2 %) |
| How often | `freeswing.js _fsCycleMs` (the sword), `_pfBowCycleMs` / `BOW_FASTER` (the held bow), `drawgather.js _dgStaffCycleMs` (the staff) |
| Specials | the bar's blocks at `_abilityCost(ps, 'swipe')`, one every 1.5 s (the phone's own gap, `playerActions.js`), each in a swing's place |
| Health | `prog3.js _prog3Recompute` (the one formula's bar) |
| A level as an opponent | `prog3.js _prog3OpponentLevel` |

Nothing heals in a fight: the worker's regen waits for five seconds without
a hit.

The special each style throws is what reaches the worker: the sword's special
swing, the bow's volley (three arrows, `part: 3`), the staff's big bolt (three
orbs).

A score reads only the build (skills, points, worn gear) off a copy: no buff,
brew, curse, health or position, and nothing of the player is written. One
score costs the room about 2 ms; PR 2 computes it only when a board report
goes.

## What it leaves out

Both sides stand and trade blows. So, first of all, **a bow or staff kiting a
sword out of its reach** (in No man's land the sword's lunge closes that;
`docs/specs/pvp-fights.md` has the fights with positions), then: a roll's
i-frames, the shield's block and parry, projectiles that miss or are steered,
the sword's lunge, food, mana regained during the fight, a weapon gem's ticks
and statuses, brews. The simulator leaves out the same (except the mana: it
runs the worker's regen tick).

## How well it predicts (`power.test.mjs` §4)

The simulator (`power-sim.mjs`) makes random honest characters of levels
1-40: a main skill at the level, the other two at 1 or anywhere below, every
point the levels deal spent the way a player who likes some stats more than
others spends them (some keep part unspent), weapons and armour from the
lands they have reached (sometimes a rung or two behind), some rare or elite,
some hardened, a few amulets, every piece through the worker's equip gate.
Each pair fights five duels with real dice through the worker's own PvP roll
(`_pvpRollFor`), its door (`_applyDamage`) and its regen tick, each with the
weapon of the skill it trained most.

Two samples: **within five levels** (the pairs No man's land lets fight:
`nomansland.js _nmlAllowed`) and **any two**. The exponent was fitted on half
the within-five pairs; the table is the other half and the any-two sample.
"Names the winner" is the share of pairs whose five duels it calls (a pair
that split evenly is left out).

| Names the winner | Power index | Today's "Total Power" (the 3 levels summed) | The level (highest skill) | Pairs |
| --- | --- | --- | --- | --- |
| **Within five levels** | **84.2%** | 63.8% | 81.9% | 600 |
| **Any two, levels 1-40** | **95.3%** | 84.9% | 96.2% | 600 |
| ...the same level | 76.8% | 48.0% | 50.0% | 99 |
| ...one to three levels apart | 85.2% | 61.0% | 81.8% | 445 |
| ...four to eight apart | 88.9% | 75.0% | 99.7% | 288 |
| ...nine or more apart | 99.5% | 97.1% | 100% | 368 |

**The index beats the sum by 20 points where players can meet, and by 10 over
any two.** The suite fails if either margin falls under 8.

**The plain level is as good overall, for a reason worth knowing.** The level
edge (`prog3.js prog3Edge`, both ways between players since v2.3.3263) takes
ALL of a weaker player's points away five levels down: against someone five
levels above you, your Power, Luck, Special, Dodge and Defense count for
nothing. So four or more levels apart the level alone decides almost every
fight (99.7%), and one fixed control cannot see that edge between two players
who are both far from level 20. Where the levels are close, the index sees
what the level cannot: the same level, 77% against a coin's 50%.

### The fit

Bradley-Terry: P(A beats B) = OA / (OA + OB), O each one's odds against the
control (the rating is 400 log10 of that, the Elo form), on the five duels'
share. Fitted on
half the within-five pairs: 1.84 to 2.10 over five seeds of 1,200 pairs (the
suite's seed 1.84; others 1.94, 2.00, 2.09, 2.10, where the index named the
winner 83-86% of the time, the sum 64-67%, the level 81-84%). Fitted
across any two levels instead, the exponent wanders (1.7 to 2.8): most such
pairs are one-sided and say little about it. `POWER.ALPHA` is 2. On the
other half its log-loss (0.39) beats the plain time ratio's (0.44). Fitting
two exponents (one on each side's time) gained nothing. §4c fails if a
refit drifts more than a third from 2: then refit, and bump `POWER.V`.

### The scale

The median Power (the rating) of random characters by level (§4 prints it):

| Level | 1 | 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Median Power | 203 | 579 | 988 | 1,230 | 2,164 | 3,987 | 4,207 | 4,464 | 4,694 |

The biggest step is between 15 and 25: the control sits at 20, and the level
edge makes a character five levels under it all but hopeless against it and
one five levels over it all but unbeatable. A random level-20 character
rates about 2,200 against the control's 3,000: the control's points go where
they count.

**The floor.** The owner was shown "nobody gets stuck at zero", and almost
nobody comes near it: but a level-1 staff barely scratches the control's
armour (about 1 a hit), and a few level-1 characters fall a little under ten
million to one, under 0 unfloored (the lowest of 1,500 random characters of
levels 1-5: -116 for a style, -10 for a best style). So a style you can
fight in reads at least 1, never 0 (§4e: no level-1 character leaves the
Power board; 23 of 900 level-1 styles read 1). A control at 3,200 instead
would keep everyone clear of the floor; that is the owner's to choose.

## The break proofs (§5, the plan's rule 8)

Each bends the WORKER's code in the test's process and needs the index to
move with it; the comment on each check names the one-line change in
`power.js` that turns it red.

- 5a: the sword's damage a level (`PROG3.DMG_PER_LEVEL`) doubled: a level-30
  sword's melee score moves, and only it (red if power.js rolled its own hit);
- 5b: armour taken away in `combat.js _armorDrMult`: the scores move (red if
  the armour arithmetic were copied);
- 5c: one player's every hit doubled in `_rollHit`: every score of theirs goes
  up;
- 5d: a door a tenth off fails §2's 2 % (the composition check has teeth);
- 5e: a roll that draws its dice a third time is seen (§2z);
- 5f: the control, the exponent and the rating are version 2's (red if any
  changes without `POWER.V` and that line).
