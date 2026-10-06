# Levels come half as fast, and monsters grow with their level (v2.3.3054, v2.3.3055, life skills v2.3.3090)

From the owner's notes of 2026-10-05:

> The leveling seems a bit off, like it's too quick to gain levels. Maybe slow
> it by about 50%.

> I'm easily crushing higher level monsters right now. Difficulty doesn't seem
> to be scaling at all (lvl 7 killing lvl 17 slimes easily).

Both are server balance numbers. Nothing on the wire changes, so client and
worker can deploy in either order.

## Combat levels come half as fast (v2.3.3054)

Combat levels (Melee, Bow, Magic) are bought with XP from two places, and
both halve. That is what v2.3.1727 did for the same complaint ("the pace is
also too quick").

| Source | Before | Now |
|---|---|---|
| Fighting: XP per point of damage dealt (`PROG3.XP_PER_DMG`, server/src/prog3.js) | 0.4 | **0.2** |
| Quests: each quest's `xp` (server/src/data.js `QUEST_REWARDS`, client `QUEST_CHAINS`) | as was | **half**, rounded up (tut_1 30 → 15, ash_4 350 → 175) |

- The level curve (`prog3XpRequired`) is untouched, so no saved level or XP
  bar moves.
- The quest windows show the new numbers, because both tables changed and
  mirror-audit §5 checks they agree.
- **Life skills were not changed here.** The owner raised harvest XP 25x on
  purpose ("Lifeskills xp is far too slow", twice: v2.3.1435, v2.3.1765).
  Asked afterwards, they chose to slow them too: see the next section.

## Life skills come half as fast too (v2.3.3090)

Asked *"Should life-skill XP slow down like combat XP?"*, the owner said
*"Yes"*.

**Every level of every life skill now costs twice the XP it did.** The level
curve's base goes from 500 to 1,000, and its 8% a level is unchanged:

| Level | XP to the next level, before | Now |
|---|---|---|
| 1 → 2 | 500 | **1,000** |
| 2 → 3 | 540 | **1,080** |
| 4 → 5 | 630 | **1,260** |
| 9 → 10 | 926 | **1,851** |
| 19 → 20 | 1,999 | **3,997** |

Reaching Mining 5 (black steel's level) took 2,254 XP and now takes 4,507.

**Why the price and not the pay.** Life skills earn XP in a dozen places on
each side:
- harvests, cooks, smelts and forges;
- the amulet bench, gem cutting, traps, furniture and the farm.

Each of those shows its own "+n XP". Combat could halve its pay, because it has
one source and one number (`PROG3.XP_PER_DMG`). Halving a dozen pays on both
sides would touch every one of those popups. Doubling what a level costs halves
the pace of all of them at once, and every number a player sees stays true.

**What a player sees.** No level is lost. The XP already earned toward the next
level is kept, and since that level now costs twice as much, the bar shows
half as far along.

**Where it lives:**
- The worker: `LIFE_SKILL_XP_BASE` in `server/src/gathering.js`, read by
  `_lifeSkillXpThreshold`.
- The game: `LIFE_SKILL_XP_BASE` in `src/data/items.js`, read by both client
  copies of the curve:
  - `skillXpRequired`, which draws the bars and predicts the level-up banner;
  - `LIFE_SKILL_XP` in `src/data/lifeSkills.js`.
- `mirror-audit` pins the two bases, every level from 1 to 100 on all three,
  and the owner's numbers (1,000 for level 2, 1,080 for 3).

Nothing on the wire changes, so the worker and the game can deploy in either
order. Until both are out, the game's bar can briefly disagree with the
worker's level. The worker's `player_state` echo wins, as always.

## Monsters grow with their level (v2.3.3055)

A monster's HP is a curve plus a flat amount. The flat was +100 at every level
from 3 up (v2.3.1346), and at these levels the curve under it is tiny: a
fodder's curve part is 18 HP at level 17. So a level 17 slime had 118 HP
against a level 3's 109, **+8% across fourteen levels**, and its damage grew
4.5% a level. Nothing was broken in how a level is chosen; the curve itself was
flat.

- **The flat grows** (`MONSTER_HP_CURVE.flatRamp` 1.10, `monsterHpFlat`):
  100 at level 3, then +10% a level through the usual phases.

  | Level | 1–2 | 3 | 5 | 7 | 10 | 17 | 20 | 30 |
  |---|---|---|---|---|---|---|---|---|
  | Flat HP | 50 (unchanged) | 100 | 122 | 147 | 195 | 380 | 506 | 1,311 |

- **Damage grows 6.5% a level** in its first phase, up from 4.5%
  (`MONSTER_DMG_CURVE`, one constant where three call sites had their own
  copy).
- **Levels 1–2 are exactly as before** (58 HP and 10 damage for a level 1
  slime, 59 and 11 for level 2), so the starter stretch plays the same.
- Mirrored on the client (`createMonster`, which the Points window's
  before/after scene fights). The retired T2 point table's reference monster
  keeps its old numbers (`t2BenchFlat`), so no legacy reading moves.

### Measured (server/src's own damage and spawn code)

A level 7 character (Melee 5, no points spent, no armour) against slimes:

| Slime | Before | Now |
|---|---|---|
| Level 7 | 5.3 swings, loses 19% HP | 7.5 swings, loses 32% |
| Level 12 | 5.4 swings, loses 24% | 11.9 swings, loses 67% |
| Level 17 (the owner's fight) | **5.6 swings, loses 32%** | **19 swings, would lose 144%: the slime wins** |

The same character with 12 Power, 6 Defense, 6 Dodge and copper armour loses
80% of its HP to a level 17 slime (was 17%).

At your own level a kill stays short: Melee 15 with its Power against a level
17 slime takes 5.7 swings and 31% HP (it was 1.7 swings).

`tools/relative-points-sim.mjs` "THE FADE" (a fully-spent character 10
against brutes):

| Brute | Before | Now |
|---|---|---|
| At its level | 2.5 hits | 3.4 hits |
| 5 levels above | 5.6 hits | 11.6 hits |
| 7 levels above | 5.8 hits, 7.2 of its swings to kill you | 13.8 hits, 5.7 swings |

### How the two changes interact

Kill XP is 0.2 x the monster's HP, so a level 17 kill now pays 80 XP (was 47
at 0.4). Each kill also takes about three times as long. XP per second of
fighting is `XP_PER_DMG x your DPS`, whatever the monster's HP, so fighting
pays half what it did, as asked.

## Tests

- Life skills (v2.3.3090):
  - `mirror-audit`, "life-skill curve" (3 checks);
  - `lifeskills-economy` and `smelting`, moved to the new prices (1,000 XP
    for a first level; 1,600 smelting XP is level 2 now, not 3);
  - `mp-smelt` reads the game's own curve.

- `zones.test`:
  - the flat at every pinned level;
  - a level 17 slime is three times a level 3's HP and twice its damage;
  - levels 1 and 2 are unchanged;
  - the curves' parity.
- `mirror-audit`:
  - `MONSTER_DMG_CURVE` and `monsterHpFlat` at every level 1–100;
  - §5's quest table, both directions.
- `dungeon.test`: the boss's flat is its level's.
