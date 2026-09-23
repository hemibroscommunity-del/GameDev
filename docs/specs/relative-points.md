# Relative point value — every point felt early (v2.3.2680, shipped)

**Status: SHIPPED in v2.3.2680.** Server authority `server/src/prog3.js`
(the `BODY`/`ATK` rows, `prog3Curve`, `prog3Edge`, `prog3StatValue`) and
`server/src/combat.js` (`_computeAttackDamage`, `_applyDamage`); client mirror
`src/data/prog3.js`; referee `tools/relative-points-sim.mjs`.

> Owner, 2026-09-22: *"I want each point to matter during the early level up
> phases of the game. If a character is putting his first 5 points into dodge
> I want them to experience a high rate of dodging RELATIVE to the same or
> lesser monster level they're playing. It can decay quickly for higher level
> monsters for balance reasons. I also want armor, weapon, etc tier to really
> matter … Apart from that I'll let you handle all the balance decisions."*

Earlier the same day: *"points carry a lot of weight at or under the current
level monster with a pretty steep decay as the combat levels go up"*, *"I don't
really like the idea of capping"*, *"Yes do combined floor and keep per level
limit on those 3"*, and *"there will be two categories of damage. Base damage
and elemental damage … only applies to base damage"*. Gear tier and quality are
their own change (a separate PR).

---

## 1. The rule, in one line per idea

- **A curve, not a rate.** A stat's value is `max × q / (q + k)`. The first
  point is the biggest, every later one a little smaller, and the value heads
  for `max` without reaching it, so no stat needs a cap. Before, a stat was
  `points × per` with a hard cap. At early levels that made a point invisible:
  5 Dodge points were 2 %.
- **The edge.** For the seven stats that change a hit, `q` is your points ×
  the edge. That is 100 % against a monster at or below your level, −20 % per
  level above, and 0 at +5 (`prog3Edge`). "Your level" is the trained skill
  of the lane a stat belongs to (Melee, Bow or Magic). Shared stats use your
  highest trained skill. It is never the character level: that is a sum of
  three skills, so two cheap off-lane skills would raise it.
- **Two damage categories.** Dodge and Defense stop *base* damage, and
  together they never let less than **10 %** of a base hit through (the
  combined floor, `PROG3.FLOOR`). Resist stops *elemental* damage, and it is
  the only stat an elemental hit meets: no dodge roll, no Defense cut. Its own
  curve heads for 90 % and so always lets 10 % through without a floor.
- **The per-level bound is the only limit.** No stat holds more points than
  your character level. The four damage stats (Power, Luck, Special,
  Element) may hold 2 × (`lvlBound: 2`).
- **No migration.** A point is still a point. Every existing holding reads
  higher on the curve than it did on the line (100 Defense: 40 % → 84 %), so
  nobody's build weakens.

## 2. The stats

`max` and `k` are the `PROG3` row values. Cells are the value at edge 1,
i.e. against a monster at or below your level (sim §1).

| stat | reads as | max | k | 1 pt | 3 | 5 | 10 | 20 | 50 | edge? |
|---|---|---|---|---|---|---|---|---|---|---|
| Dodge | chance a base hit misses | 90 % | 7 | 11 % | 27 % | **38 %** | 53 % | 67 % | 79 % | yes |
| Defense | cut on a base hit | 90 % | 7 | 11 % | 27 % | 38 % | 53 % | 67 % | 79 % | yes |
| Resist | cut on an elemental hit | 90 % | 7 | 11 % | 27 % | 38 % | 53 % | 67 % | 79 % | yes |
| Power | × (weapon base + skill), pre-tier | +100 % | 7 | +13 % | +30 % | +42 % | +59 % | +74 % | +88 % | yes |
| Luck | crit chance (1 % base) | +60 % | 7 | 9 % | 19 % | 26 % | 36 % | 45 % | 54 % | yes |
| Luck | crit multiplier | 1.5 + 2.0 × curve | 7 | ×1.75 | ×2.1 | ×2.33 | ×2.68 | ×2.98 | ×3.25 | yes |
| Special | special-attack damage | +150 % | 7 | +19 % | +45 % | +63 % | +88 % | +111 % | +132 % | yes |
| Element | elemental power (burn 5 + 0.3 × power) | 120 | 10 | 11 | 28 | 40 | 60 | 80 | 100 | yes |
| Move Speed | walk speed | +35 % | 10 | +3 % | +8 % | +12 % | +18 % | +23 % | +29 % | no |
| Speed | swing period cut | −39 % | 10 | −4 % | −9 % | −13 % | −20 % | −26 % | −33 % | no |
| Range | reach | +55 % | 10 | +5 % | +13 % | +18 % | +28 % | +37 % | +46 % | no |
| HP / Stamina / Mana | pools | +8 / +3 / +2.5 per point, caps 100 | — | | | | | | | no (unchanged) |

Why these numbers:

- **Dodge, Defense and Resist: max 90 %, k 7.** 90 % is the owner's own
  "something ridiculous like 90 % for dodge". k 7 makes the owner's example,
  5 points, a 37.5 % dodge. One point is already 11 %.
- **Power became a multiplier.** A flat +0.5 per point was invisible early
  (+2.5 on a 15-damage hit) and a rounding error late. As a multiplier on
  (weapon base + skill term), still applied before the tier multiplier so
  gear scales it, 5 points is +42 % and it keeps its worth as the skill term
  grows.
- **Luck, Special and Element** are set so a point at levels 3–10 moves a
  number the player sees. Past the old cap's point count they read higher
  than they did (100 Luck: 57 % / ×3.37, against 31 % / ×2.5), so no veteran
  loses.
- **Move, Speed and Range** take the curve with no edge, because they are not
  evaluated against a monster. Their bounds hold at the asymptotes. The move
  bound widens by the same multiplier (`movement.js`). Speed's −39 % keeps the
  swing above the 210 ms cadence floor (600 × 0.61 × 0.7 = 256 ms). Range
  +55 % is still clamped by PvP's 950 and far inside melee's 400 px gate.
- **The pools stayed linear.** One HP point is already +8 % of a level-5 bar.

## 3. What it feels like: today vs shipped, measured

Every number comes from the real `_computeAttackDamage` / `_applyDamage`
through `tools/relative-points-sim.mjs`. "Today" is the same script run with
`--root` pointed at `main` before this change. A melee character, greatsword
at the tier its Melee level unlocks, no armour unless stated. *At-level*
means a monster at the character's Melee level (the level the edge measures
against). "Shows" is the number the damage popup prints.

**The owner's case: 5 Dodge points at character 5 (Melee 3)**

| | today | shipped |
|---|---|---|
| dodge vs a level-3 brute (at level) | 2 % | **38 %** |
| dodge vs a level-2 brute (below) | 2 % | 36 % |
| dodge vs a level-5 brute (+2) | 2 % | 28 % |
| dodge vs a level-8 brute (+5) | 2 % | 0 % |
| brute swings to kill you (at level) | 7.0 | 10.9 |

**One level-up's 3 points, characters 4–10 (at-level brute)**

| char | +3 Power: shows | hits to kill | +3 Defense: its hit | +3 Luck: hits to kill |
|---|---|---|---|---|
| 4 | 2–7 → 2–7 **/ 3–8** | 5.9 → 5.3 **/ 4.7** | 17 → 17 **/ 12** | 5.9 → 5.8 **/ 4.8** |
| 5 | 2–7 → 2–8 **/ 3–9** | 8.7 → 7.9 **/ 6.8** | 19 → 19 **/ 14** | 8.7 → 8.6 **/ 7.1** |
| 6 | 2–8 → 3–9 **/ 3–10** | 8.1 → 7.4 **/ 6.3** | 19 → 19 **/ 14** | 8.1 → 8.0 **/ 6.6** |
| 8 | 3–11 → 3–11 **/ 4–14** | 6.3 → 5.9 **/ 5.0** | 20 → 20 **/ 15** | 6.3 → 6.2 **/ 5.2** |
| 10 | 4–12 → 4–13 **/ 5–16** | 5.6 → 5.2 **/ 4.4** | 23 → 23 **/ 17** | 5.6 → 5.5 **/ 4.6** |

Each cell reads *before → after today* **/ after shipped**. Today a Defense
level-up changed nothing you could see. Shipped, every level-up's points take
a fifth to a quarter off the next fight.

**The fade: a fully-spent character 10 (Melee 8) against brutes around its level**

| monster | today: hits / its swings to kill you | shipped |
|---|---|---|
| level 5 (−3) | 4.4 / 11.7 | **2.5 / 35.9** |
| level 8 (at level) | 4.5 / 10.1 | **2.6 / 29.7** |
| level 10 (+2) | 4.6 / 9.7 | 3.1 / 20.1 |
| level 12 (+4) | 4.7 / 8.9 | 4.2 / 11.7 |
| level 13 (+5) | 4.8 / 8.3 | 5.9 / 7.7 |
| level 15 (+7) | 4.9 / 7.7 | 6.0 / 7.2 |

Today monster level barely matters. Shipped, you dominate at and below your
level, and five levels up your points are gone. That is "decay quickly for
higher level monsters". What remains up there is your skill and your gear.

**The tank: every shared point into Defense then Dodge (at-level brute)**

| char | today: through · swings | + best armour | shipped: through · swings | + best armour |
|---|---|---|---|---|
| 20 | 84 % · 10.8 | 43 % · 21 | **10.8 % · 85** | 5.8 % · 154 |
| 40 | 72 % · 11.7 | 32 % · 26 | 9.6 % · 85 | 4.8 % · 191 |
| 90 | 45 % · 14.1 | 11 % · 56 | 9.1 % · 63 | 2.6 % · 241 |

The combined floor holds a stat-only tank at about 10 % from character 20
on, and armour, which sits outside the floor, takes it further. That is the
owner's intent: "the endgame will depend on synergies with the rarest armors
and weapons". It is also the number to revisit first if tanks feel too safe.
Two options, each one constant: a second floor over armour too, or a larger
`k` on Defense.

**Anticheat.** With Power, Luck and Special at 297 each under a Fury Tonic,
rolls against every target level peak at **32.5 %** of the ceiling (sim §5).

## 4. How it plugs in

**Server**

| where | what |
|---|---|
| `prog3.js` `PROG3.BODY`/`ATK` | curve rows `{ cap: 999, max, k, rel?, lvlBound? }`. `cap` is the storage bound. `rel` means the stat takes the edge; `lvlBound: 2` doubles the per-level bound. Pools keep `{ cap, per }` |
| `prog3.js` `EDGE_FADE`, `FLOOR` | 0.20 per level; the 10 % base-damage floor |
| `prog3.js` `prog3Curve`, `prog3Edge`, `prog3Yardstick`, `prog3StatValue` | the one definition of each, exported so `elemental.js` and the sim share it |
| `prog3.js` readers | `_prog3CritChance/_CritMult/_SpecialMult/_PowerMult(ps, cat, mlvl)`, `_prog3DodgePct/_DefMult/_ElemResistMult(ps, mlvl)`, `_prog3MoveMult(ps)`. Omitting `mlvl` gives edge 1 |
| `prog3.js` `_handleProg3Allocate` | bound = `min(cap, charLevel × lvlBound)` |
| `combat.js` `_computeAttackDamage(ps, slot, special, { targetLevel })` | Power multiplies (base + skill) before tierMult; special and crit take the edge |
| `combat.js` `_applyDamage(ps, raw, block, { attackerLevel, elemental })` | base: dodge roll, then `cut = max(defMult, FLOOR / (1 − dodge))`; elemental: Resist only |
| `combat.js` `_maxWeaponDmg` / `_maxDmgForAttacker` | the same readers at edge 1, the most any monster grants, so the ceiling covers every roll by construction |
| `elemental.js` `elemAttackStat(ps, legacy, cat, monsterLevel)` | elemental power on the curve + edge; the DoT snapshot carries it |
| call sites passing a monster's level | `_handleMonsterDamage`, `_abilityStrikeMonster`, `burst.js`, `arrowblast.js`, `_monsterStrikePlayer` (index.js), `telegraph.js`, `dungeon.js`, `firetrail.js` (the patch stamps its goblin's `lvl`), element collisions |
| PvP | deliberately **edge 1**. Pricing a defender by the attacker's level would strip a lower player's Dodge and Defense outright, and that is a PvP design decision of its own |
| `join.js` `caps.prog3rel` | the deploy-order flag |

**Client**

| where | what |
|---|---|
| `src/data/prog3.js` | the same rows, `EDGE_FADE`, `FLOOR`, and the four functions mirrored. Every reader predicts the curve when `caps.prog3rel` is set and the retired linear math (`PROG3_LINEAR`) against an older worker (rule 19). `prog3StatAmount` totals the Points screen's now → after pair |
| `gameSystems.js` | `calcWeaponDmg`, the display range and `calcSpecialDmg` multiply by `prog3PowerMult`; `swingCooldownMultFor` reads `prog3AspdCut` |
| Points screen (`HeroExpanded.jsx`, `statPreview.js`) | values through the readers; curve rows say "the first points count most" instead of a flat rate; the seven fading stats carry one line: *"Full strength against monsters at your level or below. Weaker against stronger ones, and gone 5 levels up."* |
| monster nameplate (`entityRenderer.js`) | the difficulty colour compares the monster with the trained skill of the weapon in your hand, the edge's own yardstick, so *near / high / danger* now says how much of your points still count |

**Tests.** `prog3.test.mjs` restates the combat math in literals and covers
the owner's case, the per-stat bound, the floor, the elemental rule, and the
edge on hits and on defence. `mirror-audit.test.mjs` pins every curve reader,
client against server, at edge 1 and against stronger monsters, plus the
linear fallback. `display-dps.test.mjs` has a linear-worker fixture and a
relative-worker one. The `mp-statpeek` QA scenario checks the tooltip's
promise against the character after a real spend.

## 5. Known consequences

- **The world is still pinned at level 1–2** (data.js `ZONES`, v2.3.1160,
  owner directive). So in the open world the edge never fades; everything is
  below you, and every point counts in full. The fade shows only in dungeons
  (waves up to +2) until the per-zone bands (commented beside each zone) come
  back. Restoring them is the one content change that would make monster
  level matter everywhere.
- **The early game gets easier.** The owner accepted this ("just a fun time
  getting a few levels in applying points"). A fully-spent character 10 needs
  30 at-level swings to die where it needed 10.
- **Elemental power is strong early.** 5 points is 40 power, a burn of 17 per
  tick against the base 5, and burns already outkill level 1–2 monsters. It
  needs an enchanted weapon, so it arrives later than the other stats.
- **An elemental hit can no longer be dodged or cut by Defense.** Only the
  fire goblin's trail and the blue slime's burst are elemental today.
- **The armour gate still reads Defense *points*** (5 per rung). On the curve
  90 points reads as 83.5 %, so a top-armour wearer is a heavy Defense
  investor by construction. The combined floor holds them at 10 % plus armour.

## 6. How we got here

The design note this file replaces argued the change in rounds, and the
referee overturned it twice: a character-level yardstick turned out to be
gameable, and a linear uncapped stat turned out to mean literal immunity. The
owner then picked no caps, a 90 % ceiling, the combined floor for base damage
only, and the per-level bound kept on Defense, Dodge and Resist, and
finally set the bar the curve is built to: *"each point to matter during the
early level up phases."* The full argument is in this file's git history
(v2.3.2642 → v2.3.2680).
