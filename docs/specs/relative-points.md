# Relative point value — "your points are your edge" (design note)

**v2.3.2647. DESIGN NOTE ONLY — no combat code ships with it.** Written for
the owner to approve (or re-dial) before the implementation PR. Every number
below is measured by driving the game's own shipped formulas — the real server
damage roll and the real damage sink — never a re-typed copy. The sim asserts
its own "today" column against the live `PROG3` tables and throws if either
has drifted, so these numbers cannot quietly go stale as `main` moves:

```
node tools/relative-points-sim.mjs          # every table in this note
node tools/relative-points-sim.mjs --quick  # same tables, fewer samples
```

Owner, 2026-09-22: *"I want the leveling to be balanced but have an extreme
curve relative to current level monsters. So whenever you allocate points,
those points carry a lot of weight at or under the current level monster with
a pretty steep decay as the combat levels go up (with benefit nearly gone
after 5 combat levels). So I want to trade slow but universal point value for
relative point value. Basically I want the user to experience the immediate
difference after applying points in their combat experience provided they're
fighting a monster close in level to them."*

---

## 0. The short version

- **One rule, called the EDGE.** A placed point works at **100 % against any
  monster at or below your level, loses 20 % for every level the monster is
  above you, and is worth nothing at 5 levels above.** Your trained skill
  levels and your gear are untouched by it — they are the universal half.
  Your points are the relative half. (§2)
- **"Your level" is the LANE's trained skill**, not the character level — the
  sim overturned this note's first draft. Character level is a sum, so raising
  two untrained skills buys 18 character levels for the XP that buys 3 Melee
  levels, and under a character-level yardstick that is a 170×-cheaper way to
  make your points count. The lane's own level is ungameable and is the number
  that already gates your weapon. (§2, §4.6b)
- **Seven stats become relative; six stay universal.** Relative: Power, Luck,
  Special, Element (the four lane stats that change a hit) and Defense,
  Dodge, Resist (the three shared stats that change a hit taken). Universal:
  HP, Mana, Stamina, Move Speed, Speed and Range — pools and reach, which are
  not evaluated against any particular monster. (§3)
- **Every relative point gets 2.5–3× heavier, and NOTHING IS CAPPED.** The
  four percentage stats change shape to a front-loaded curve `p/(p+K)` that
  approaches but never reaches 100 %; Power, Special, Element and crit damage
  stay linear. `K` is picked so the curve passes exactly through what a cap
  would have given (40 Defense points is −40 % either way), so every number
  in §4 holds and uncapping only adds a tail. A point is never refused and
  never worthless, the first point is worth 7× the hundredth, and the
  anticheat ceiling holds at 33 % of its limit with everything at 297 points.
  (§3.1, sim §8)
- **What it feels like, measured.** One level-up's points into Power at
  character level 3 takes a brute from 10.8 swings to 7.9 (−27 %; today −11
  %). Five level-ups' points into Defense at level 20 buys +19 % survival
  (today +6 %). A fully-invested level-20 character kills a level-20 brute in
  1.8 swings and survives 13 of its hits — and against a level-25 brute those
  numbers are 3.7 and 6.7 — the no-points kill count exactly (survival keeps
  only the universal HP points). Today
  that same character reads 2.7 / 9.9 at level 20 and 2.8 / 8.0 at level 25:
  monster level barely matters. (§4)
- **Pure builds come out ahead.** A one-lane specialist keeps a 2.3× kill
  advantage over a three-lane spread at the same character level, widening to
  3.5× five levels up where nobody's points count — and that advantage now
  rests on the universal half, which is skill damage and the weapon tier the
  lane unlocks. Uncapped, a single-stat build also never dead-ends and there is
  no level-40 cliff where the relative game finishes; both of those were
  artefacts of capping, and §4.6c–d record them as the cost of choosing 5-A
  instead. (§4.6)
- **The catch you need to know before saying go.** Every world zone is
  pinned to level 1–2 monsters by your own directive (v2.3.1160, "I have not
  made more depth zones yet since the game is still a demo"). So today the
  WEIGHT half is felt everywhere the moment it ships, and the FADE half is
  felt only in dungeons (waves spawn at up to your level +2). The full curve
  arrives when the depth zones do — the per-zone bands are already written
  next to each zone as comments. This design is built for that world and is
  harmless in this one. (§7)
- **Recommendation: approve the checklist in §10 as marked** and the
  implementation ships as two PRs (server + client mirrors, then the
  migration), each with its suite. Nothing here needs a new storage key, a
  new message type, or a client deploy before the worker.

---

## 1. Where the numbers are today, and why they feel slow

`server/src/prog3.js` `PROG3.ATK` / `PROG3.BODY` (the client mirrors them in
`src/data/prog3.js`; `mirror-audit` pins the two together):

| stat | per point | cap | at cap | one level-up's points (3) buy |
|---|---|---|---|---|
| Power (`dmg`) | +0.5 damage, pre-tier | 75 | +37.5 | +1.5 damage on a level-3 base of ~11.5 |
| Luck (`luck`) | +0.3 % crit, +1 % crit dmg | 100 | 31 % / ×2.5 | +0.9 % crit chance |
| Special | +1 % special damage | 75 | +75 % | +3 % on specials only |
| Element (`elem`) | +1 elemental power | 75 | 75 | burn 5 + 0.3 P → +0.9 per tick |
| Defense (`def`) | −0.4 % damage taken | 100 | −40 % | −1.2 % damage taken |
| Dodge | +0.4 % dodge | 75 | 30 % | +1.2 % dodge |
| Resist (`eres`) | −0.4 % elemental taken | 75 | −30 % | −1.2 % |
| HP | +8 max HP | 100 | +800 | +24 HP (+20 % at level 3) |
| Mana / Stamina / Move / Speed / Range | (unchanged by this note) | | | |

Every one of these is universal: a Defense point bought at level 5 cuts a
level-90 monster's hit by the same 0.4 %. That is why the values had to be
small — they were priced so that 100 of them do not break the top end — and
why, per level, most of them are invisible. The measured "today" columns in
§4 say it plainly: three points into Defense at any level buys 0 % extra
survival to one decimal, and three into Luck buys 1 %. Power and HP are the
only two a new player can feel, which is why every build starts the same.

The ask is the same one you made of the old T2 grids on 2026-07-24
(BALANCE-PLAN §4d, v2.3.1451: *"Make the strength of that skill relative to
current level monsters (and lower) with decaying power carried to the next
level up"*). That version locked a point's value at spend time and let
monsters outgrow it. This one evaluates the point against the monster you are
actually fighting, every hit — which is what "relative" has to mean now that
a character fights across a 100-level world with one set of points.

---

## 2. The rule: EDGE

```
gap  = monsterLevel − yourLevel          (only counts when positive)
edge = max(0, 1 − 0.20 × gap)            (100 % at or below you, 0 % at +5)
```

| monster is… | 5 below | 1 below | your level | +1 | +2 | +3 | +4 | +5 | +6 |
|---|---|---|---|---|---|---|---|---|---|
| **edge** | 100 % | 100 % | 100 % | 80 % | 60 % | 40 % | 20 % | 0 % | 0 % |
| nameplate band (already on screen) | low | near | near | high | high | danger | danger | danger | danger |

A relative stat's contribution is simply `points × per-point × edge`, computed
per hit: for a hit you deal, against that monster's level; for a hit you take,
against the attacker's level. Nothing else in the damage pipeline moves.

**Why linear, 20 % a level.** It is one sentence a seven-year-old can hold:
*"Each level a monster is above you takes a fifth off your points. Five above
you, your points don't count."* It lands at zero at exactly the "nearly gone
after 5" you named, and it lines up with the four difficulty bands the
nameplate already draws (`plateBandFor`, entityRenderer.js, from the
2026-09-14 nameplate mock): **near = full points, high = 60–80 %, danger =
40 % and falling.** A front-loaded curve (100 / 70 / 45 / 25 / 10 / 0) is one
constant away if live play wants +1 to sting harder — `EDGE.CURVE` in the
decision table.

**Why "your level" is the LANE's own trained skill** — Melee's points measure
against your Melee level, Bow's against your Bow level, and the shared stats
against your highest trained skill. Not the character level, and this note's
first draft had it the other way round. **The sim overturned it** (§4.6b),
because character level is a SUM and the exponential XP curve makes the
cheapest levels the ones you have not trained:

| from Melee 40 / 1 / 1 | XP | character levels bought |
|---|---|---|
| deepen Melee 40 → 43 | 320,467 | +3 |
| raise Bow and Magic 1 → 10 each | 9,818 | **+18** |

Against a level-50 brute, a Melee 40 character with no off-skills reads
character level 42 and gets **0 %** of their points; the same Melee 40, same
abyssal greatsword, same skill damage, with Bow and Magic at 10 reads level 60
and gets **100 %**. Measured, that is 5.1 monster swings survived against 23.3
— for 9,818 XP. A yardstick you can lift 170× more cheaply by NOT training the
skill you fight with is not a difficulty measure, it is an exploit, and it
punishes exactly the specialist the trained-skill system was built for.

The lane's own level cannot be gamed: it is the number that already gates your
weapon tier (`tierIndex × 5`) and already sets your damage term (`skill × 1.5`),
so your points, your gear and your damage finally agree about which monsters
you belong in front of. It is also on screen already — the Points screen's
column headers carry each lane's level, and the dashboard's three combat cards
read `<skill> level N`. Shared stats take your **highest** skill so a defensive
point cannot be priced off a lane you never trained, and so switching weapons
never changes how tough you are.

**What this costs, and it is a real cost:** the nameplate's difficulty border
compares the monster to your CHARACTER level (`plateBandFor`), so under this
yardstick the colour on the plate no longer predicts your point strength.
Decision 11 in §10 is whether the plate follows the same yardstick (a
client-only change, and arguably a better plate — "how does this monster
compare to the weapon in my hands") or stays as the owner's 2026-09-14 mock
specified it. Character level keeps every other job it has: the plate, the
dungeon monster cap, HP per level, and the §6-C double cap.

**Below your level: no bonus.** Edge is 100 %, never more. Lower monsters
already die faster; making points worth MORE than their face value there
would just be a second number to explain. `EDGE.BELOW_BONUS` exists as a dial
and is recommended at 0.

**Not touched by the edge, on purpose:** the trained-level damage term
(`skill × 1.5`), weapon tier, the crit ANCHOR (a crit still floors at 2× the
top of your range at any gap — the 1 % base crit is universal, the Luck
points are relative), armour's damage reduction, HP, mana, stamina, and every
ability's own multiplier. Those are the universal half, and the whole design
is the contrast between the two halves.

---

## 3. What each stat does now

> **Read §3.1 first.** The table below is the CAPPED version (decision 5-A),
> and it is no longer the recommendation. The owner, 2026-09-22: *"I don't
> really like the idea of capping. What happens if you let it go uncapped?"*
> Measured, uncapping is the better shape and costs nothing in this table —
> §3.1's curve passes exactly through every endpoint below and keeps going.
> The table stays because it is the reference every number in §4 was measured
> at, and because those numbers are unchanged by §3.1.

The rule for the reprice: **keep every stat's effect at its cap, reach the
cap in fewer points, make each point that much heavier.** A bigger cap
effect would break the top end at your own level (−100 % damage taken is
immunity, edge or no edge); a smaller one would make the endgame weaker than
today's. So the endpoints stay and the points-to-cap shrink.

| stat | scope | today per / cap | **proposed per / cap** | at cap | × per point | kid sentence |
|---|---|---|---|---|---|---|
| Power `dmg` | lane, **relative** | +0.5 / 75 | **+1.5 / 25** | +37.5 (same) | 3× | "+1.5 damage on every hit" |
| Luck `luck` | lane, **relative** | +0.3 % & +1 % / 100 | **+1 % & +3 % / 30** | 31 % crit / ×2.4 (was ×2.5) | 3.3× / 3× | "+1 % crit chance, +3 % crit damage" |
| Special | lane, **relative** | +1 % / 75 | **+3 % / 25** | +75 % (same) | 3× | "+3 % special damage" |
| Element `elem` | lane, **relative** | +1 / 75 | **+3 / 25** | 75 (same) | 3× | "+3 elemental power" |
| Defense `def` | shared, **relative** | −0.4 % / 100 | **−1 % / 40** | −40 % (same) | 2.5× | "−1 % damage taken" |
| Dodge | shared, **relative** | +0.4 % / 75 | **+1 % / 30** | 30 % (same) | 2.5× | "+1 % dodge" |
| Resist `eres` | shared, **relative** | −0.4 % / 75 | **−1 % / 30** | −30 % (same) | 2.5× | "−1 % elemental damage taken" |
| HP, Mana, Stamina | shared, universal | unchanged | unchanged | | | |
| Move Speed | shared, universal | unchanged | unchanged | | | |
| Speed `aspd`, Range | lane, universal | unchanged | unchanged | | | |

### 3.1 Uncapped — the recommended shape (sim §8)

A cap does two jobs, and only one of them is a design choice:

- **Safety.** A percentage stat at −1 %/pt reaches −100 % at 100 points.
  That is immunity, and it is arithmetic rather than taste. Measured: a
  Melee 100 character has earned 297 shared points, and split across a
  linear Defense and Dodge that is **100 % reduction and 100 % dodge —
  unplayable**, at a point total the game hands out for free.
- **Scarcity.** Running you out of room to force a build choice. This is the
  design-y job, and it is the one the owner is rejecting. **The edge already
  does it better:** pouring everything into Power still leaves you defenceless
  and helpless against +5 content, which is opportunity cost without a wall.

So: **no stat has a cap, and the four percentage stats change shape.** Linear
where linear is safe, a front-loaded curve where it is not.

| stat | shape | at 10 | at 25 | at 40 | at 100 | at 297 | at 891 |
|---|---|---|---|---|---|---|---|
| Defense | `p/(p+60)` | −14 % | −29 % | **−40 %** | −63 % | −83 % | −94 % |
| Dodge | `p/(p+70)` | 13 % | 26 % | 36 % | 59 % | 81 % | 93 % |
| Resist | `p/(p+70)` | −13 % | −26 % | −36 % | −59 % | −81 % | −93 % |
| Luck, crit chance | `1 % + p/(p+70)` | 14 % | 27 % | 37 % | 60 % | 82 % | 94 % |
| Luck, crit damage | linear `+3 %` | ×1.8 | ×2.3 | ×2.7 | ×4.5 | ×10.4 | ×28.2 |
| Power | linear `+1.5` | +15 | **+38** | +60 | +150 | +446 | +1337 |
| Special | linear `+3 %` | +30 % | **+75 %** | +120 % | +300 % | +891 % | +2673 % |
| Element | linear `+3` | +30 | **+75** | +120 | +300 | +891 | +2673 |

Four things this buys, each measured:

**1. Every number already in this note survives.** `K` is chosen so the curve
passes through the capped endpoint: 40 Defense points is −40 % on the curve
and −40 % capped, 30 Dodge is 30 % either way. So §4's whole table holds and
uncapping only adds a tail.

**2. It serves the owner's ask BETTER than the linear cap did.** The curve is
front-loaded, so the immediate difference the ask is about is larger:

| the next Defense point is worth | 1st | 40th | 100th | 297th |
|---|---|---|---|---|
| | **1.67 %** | 0.60 % | 0.23 % | 0.05 % |

A point is never refused and never worthless. That is the whole of the
objection to capping, answered without giving anything up.

**3. Uncapping the DAMAGE stats changes nothing at the top, because the cap
was never what held them.** Melee 100, worldbreaker greatsword, against the
biggest monster in the game (a level-100 brute, 756 HP):

| Power | mean swing | hits to kill |
|---|---|---|
| no points at all | 1,271 | 1.00 |
| capped at 25 | 1,571 | 1.00 |
| uncapped at 297 | 4,834 | 1.00 |

The skill term alone is 150 against a weapon base of 10, so a finished
character one-shots everything with zero points spent. Power, Special,
Element and crit damage can be plainly linear and uncapped.

**4. Anticheat holds, by construction.** 2,400 rolls with Power, Luck and
Special at 297 each, on the worst legitimate kit under a Fury Tonic, peak at
**33 % of the ceiling** — because `_maxWeaponDmg` and `_maxDmgForAttacker`
read the same constants the roll does, so removing a cap raises both together
(the v2.3.1451 rule). This is the gate that decides shippability and it is
green.

**What uncapping genuinely costs, and it is one thing.** A build that spends
*every* shared point it will ever earn on avoidance:

| build | shared points | Defense | Dodge | damage through |
|---|---|---|---|---|
| char 40 (Melee 38) | 111 | 48 % | 44 % | 29.0 % |
| char 102 (Melee 100) | 297 | 71 % | 68 % | 9.2 % |
| char 300 (100/100/100) | 891 | 88 % | 86 % | 1.6 % |

The floor-1 clamp in `_applyDamage` means damage through never actually
reaches zero, but 1.6 % against a 1,900 HP health bar is unkillable by
at-level monsters — and the edge does not save it, because monsters cap at
level 100 and so does a trained skill, so a finished character never faces
anything above itself. **This is a taste call and there is precedent for
accepting it:** BALANCE-PLAN §4c already records "near-unkillable max tank
builds" as an owner-accepted extreme of the kid-simple reprice, on the
grounds that the game is PvE-focused and imbalance is policy. Decision 12
in §10 is whether to accept it again, raise the `K`s, or floor the combined
damage-through (a cap on the product, which still never refuses a point).

**The one implementation note.** Element is the only uncapped linear stat
whose consumer has no ceiling of its own: burn/root/thorn ticks read the
power snapshot and `_applyMonsterDot` has no attacker cap (only collisions
carry `COLLISION_BURST_CAP`). Not a cheat surface — the stat is server-owned
and spend-gated — but at 891 elemental power a burn tick is 272, so the DoT
formulas want a look in the same PR.

**The one endpoint that moves:** Luck's crit-damage half lands at ×2.40
instead of ×2.50, the price of "+3 %" being a round number (×2.5 needs
3.33 %). Measured cost at a maxed level-100 build: −2 % mean swing (§4.4).
If the exact ×2.5 matters more than the round number, `dmgPer` 0.0333 keeps
it; the note recommends the round number.

**Why these six stay universal.** HP, Mana and Stamina are pools: a bar
cannot be a different length depending on which monster is looking at you,
and a bar that shrank as you walked toward a stronger monster would be the
worst possible reading of this design. Move Speed and Range are reach, and
Speed (attack cadence) is applied by the client before it knows what the
swing will hit; all three are utility, not weight, and none of them is
evaluated per hit anywhere in the pipeline. They keep their values, their
caps and their "slow" feel — which also keeps the endgame's lane and shared
sinks large enough that the point supply still has somewhere to go (§7).
Speed is the one a player might expect in the relative column; if live play
wants it, it can move to a lower cap as a fast-universal stat, at the cost of
some universal DPS creep by mid-game (`aspd` row in §10).

**Nothing changes in what a point is or where it comes from.** 3 lane points
+ 3 shared points per level-up, lane points buy lane stats, shared points buy
shared stats, the unchannelled remainder buys anything, the char-5 bonus
point is untouched, and the §6-C double cap (`min(cap, character level)`)
still binds first — at character level 20 no stat can hold more than 20
points whatever its cap says. Below roughly character level 25–40 that level
cap is the binding one, not the new stat caps, so the early game changes ONLY
by the per-point weight.

---

## 4. What the player feels — measured

Fixture: a melee specialist (Melee = character level − 2), a greatsword at
the highest tier the prog3 gate allows, no armour, no buffs; monsters from the
live spawn curves (`MONSTER_HP_CURVE` + archetype multipliers + the flat HP
term). "Hits" is the mean number of swings to kill through the real roll
(variance, crits, the anchor, overkill). "Survive" is how many of the
monster's swings it takes to kill you through the real sink (dodge roll,
defense cut, floor 1).

**These were measured at the §3 point counts, and they hold under §3.1's
uncapped curve too** — that is what picking `K` to pass through the capped
endpoint buys. Where a cell says 40 Defense points, both shapes read −40 %.
What uncapping adds is everything past those counts, which §3.1 tabulates.

### 4.1 One level-up's points (3) into one stat, against an at-level brute

| char | Power today → proposed | Luck | Defense (survive) | Dodge (survive) |
|---|---|---|---|---|
| 3 | 10.8→9.7 (−11 %) → **10.8→7.9 (−27 %)** | −1 % → −4 % | 0 % → **+6 %** | +1 % → +3 % |
| 6 | −8 % → **−20 %** | −1 % → −3 % | 0 % → +5 % | +1 % → +3 % |
| 10 | −6 % → **−15 %** | −1 % → −3 % | 0 % → +4 % | +1 % → +3 % |
| 20 | −4 % → **−9 %** | −1 % → −3 % | 0 % → +3 % | +1 % → +3 % |
| 30 | −4 % → **−11 %** | 0 % → −3 % | +2 % → +4 % | +1 % → +3 % |
| 50 | −3 % → −5 % | 0 % → −2 % | +1 % → +3 % | +1 % → +3 % |

Power is the stat a single level-up makes visible, at every level, and it is
now 2–3× as visible. The percentage stats need a few levels' worth before
they read — which is the next table — but each of them is now doing the work
that took ten levels before.

### 4.2 Five level-ups' points (15) into one stat, against an at-level brute

| char | Power | Luck | Defense (survive) | Dodge (survive) |
|---|---|---|---|---|
| 15 | −17 % → **−35 %** | −4 % → −12 % | +7 % → **+15 %** | +6 % → **+19 %** |
| 20 | −10 % → **−35 %** | −5 % → −12 % | +6 % → **+19 %** | +6 % → +18 % |
| 30 | −15 % → −21 % | −4 % → −13 % | +5 % → +18 % | +6 % → +18 % |
| 50 | −11 % → −27 % | −2 % → −6 % | +7 % → +17 % | +6 % → +17 % |

### 4.3 The wall — a fully-invested level-20 character against brutes above and below

51 lane points (Power to cap, then Luck, then Special) and 51 shared points
(Defense to cap, then Dodge, then HP), which is every point a Melee-18
specialist has earned (17 level-ups × 3).

| brute level | edge | hits to kill: today → proposed | survive its swings: today → proposed |
|---|---|---|---|
| 15 (−5) | 100 % | 2.5 → **1.8** | 11.9 → **16.1** |
| 18 (−2) | 100 % | 2.6 → 1.8 | 10.8 → 14.3 |
| **20 (0)** | 100 % | 2.7 → **1.8** | 9.9 → **13.0** |
| 21 (+1) | 80 % | 2.7 → 1.9 | 9.6 → 11.3 |
| 22 (+2) | 60 % | 2.8 → 2.3 | 8.8 → 9.7 |
| 23 (+3) | 40 % | 2.8 → 2.7 | 8.6 → 8.6 |
| 24 (+4) | 20 % | 2.8 → 3.0 | 8.2 → 7.5 |
| **25 (+5)** | 0 % | 2.8 → **3.7** | 8.0 → **6.7** |
| 27 (+7) | 0 % | 2.9 → 3.8 | 7.3 → 6.2 |
| *(same character, no points at all)* | | Lv 20: 3.3 · Lv 25: 3.7 | Lv 20: 5.9 · Lv 25: 4.8 |

Read the two "today" columns top to bottom: from five levels below you to
seven above, the kill goes 2.5 → 2.9 swings and survival 11.9 → 7.3. Monster
level is close to irrelevant to an invested character today — the monster
curves grow ~5 % a level and the +100 flat HP term flattens even that. The
"proposed" columns are the curve you asked for: at your level your points
nearly double your output over the no-points baseline (1.8 vs 3.3 swings;
13.0 vs 5.9 survived), and by +5 you are exactly the no-points character
(3.7 / 6.7 vs 3.7 / 4.8 — the survive figure is higher only because your
universal HP points still count).

**What this does to where people fight.** At-level and below becomes
dominant; +2 to +3 is where the fight is (2.3–2.7 swings, 9–10 survived);
+5 is a wall you walk away from. Since monster XP and gold grow with level,
the rewarding place to stand moves to a couple of levels above you, and every
level-up visibly pulls that window up with it. Kill XP per monster is
invariant to your damage per hit (prog3.js: "killing a monster with H hp
always pays H × XP_PER_DMG"), so this changes kills per minute, not XP per
kill; the pacing dials stay `XP_PER_DMG` and the quest table, as they are
today.

### 4.4 The top end is unchanged

Melee 100, every relative stat at cap, against a level-100 brute (a tierMult
2.0 sword so the hits are countable):

| | today (250 lane + 175 shared points) | proposed (80 lane + 70 shared) |
|---|---|---|
| mean swing | 597.5 | 585.5 (−2 %, Luck's ×2.4) |
| hits to kill | 1.87 | 1.86 |
| taken per monster swing | 108.0 | 106.5 (noise) |
| survive its swings | 6.6 | 6.6 |

A finished character is exactly as strong at its own level as it is today,
and gets there with a third of the points. At level 100 nothing is above you,
so the edge never fades for a maxed character — which is the right reading of
"balanced": the ceiling is where it was.

### 4.5 Two things the tables show that are not this design's doing

- **Levels 3–10 read spongy** (a level-3 brute takes 10.8 swings from a fresh
  character). That is the `+100` flat HP term switching on at monster level
  3 (`flatLow` 50 covers only levels 1–2) — the cliff `damage-scale-design.md`
  §2.1 flagged. In the shipped world your first monsters are level 1–2 (58–70
  HP, five swings), so a new player never meets it today; the day the depth
  zones spawn level 3–10 monsters, `flatLow` / `flatLowMaxLvl` is the dial,
  not this note.
- **Damage numbers are shown ÷5** (`DISPLAY_SCALE_K`, the owner's D1
  display-only decision). A level-3 swing prints as "2", and three Power
  points add "+1" to it. What a player FEELS at that level is the swing count
  (10.8 → 7.9), not the printed digit; by level 10 the printed number moves
  too.

### 4.6 What it does to PURE builds

Three different things are called a pure build, and the design treats them
differently. Every table below is the sim's §7 (`7a`–`7d`).

#### 4.6a One lane deep beats three lanes shallow, and by slightly less

A Melee 40 / Bow 1 / Magic 1 specialist and a 14 / 14 / 14 spread both read
character level 42 and have both earned the same 117 shared points. The
specialist has 117 points in the Melee lane; the spread has 39 (a lane point
can only buy its own lane's stats). Both fully invested, against a brute:

| build | today, Lv 42 | today, Lv 47 | proposed, Lv 42 | proposed, Lv 47 |
|---|---|---|---|---|
| specialist 40/1/1 (abyssal, ×2.40) | 1.5 hits / 6.5 survived | 1.7 / 5.7 | **1.2 / 15.1** | 2.0 / 5.5 |
| spread 14/14/14 (iron, ×1.25) | 4.0 / 6.5 | 4.4 / 5.8 | **2.8 / 14.9** | 6.9 / 5.5 |
| specialist's kill advantage | 2.7× | 2.6× | **2.3×** | 3.5× |

The specialist stays far ahead, and the reason matters: **their advantage moves
almost entirely onto the universal half.** Both builds cap Power at 25 now, so
the point-derived damage converges; what is left between them is the skill
damage term (60 against 21) and the weapon tier their lane unlocks (abyssal
×2.40 against iron ×1.25 — the forge gate reads the LANE, not the character
level). That is the design working as stated: points are your edge at your own
level, and depth is what makes you strong in absolute terms.

Note the last column. Against a monster 5 above them, the specialist's
advantage *widens* to 3.5× — with nobody's points counting, only trained depth
and gear are left, and that is all the specialist's.

#### 4.6b Purity in the LANE sense is what decision 2 is about

The table in §2: with a character-level yardstick, a Melee 40 specialist gets
0 % of their points against a level-50 brute while an otherwise identical
Melee 40 with Bow and Magic at 10 gets 100 %, for 9,818 XP against the 320,467
a comparable Melee gain costs. Measured against that brute:

| build (all Melee 40, same greatsword) | char | today | yardstick = char level | yardstick = the lane |
|---|---|---|---|---|
| pure 40/1/1 | 42 | 1.8 / 5.4 | 0 % · 2.0 / 5.1 | 0 % · 2.0 / 5.1 |
| cross 40/10/10 | 60 | 1.6 / 8.4 | 100 % · **1.4 / 23.3** | 0 % · 2.0 / 9.9 |
| cross 40/20/20 | 80 | 1.5 / 12.8 | 100 % · **1.4 / 30.7** | 0 % · 2.0 / 12.8 |

Under the lane yardstick the kill count is identical down the column, which is
the correct answer: the same weapon in the same hands against the same monster
should hit the same, whatever else you have dabbled in. The survival gain that
remains (5.1 → 9.9 → 12.8) is the universal half — HP per character level and
more shared points — and it is the same size as today's (5.4 → 8.4 → 12.8). So
decision 2-B leaves cross-training exactly as attractive as it is now, and no
more. **That is why the recommendation flipped.**

#### 4.6c A single-stat build, under the two shapes

**Uncapped (§3.1, the recommendation), a single-stat build never dead-ends** —
it just pays less per point as it deepens: −40 % at 40 Defense points, −63 % at
100, −83 % at 297. Nothing forces you out of a stat, and the opportunity cost
of staying in it is the diminishing return rather than a wall.

The table below is what the CAPPED version did instead, kept because it is
what decision 5-A still means if the owner prefers the wall after all. A
melee specialist's shared points against a 40-point Defense cap:

| char level | shared points earned | today: Defense | proposed: Defense | forced elsewhere |
|---|---|---|---|---|
| 14 | 33 | 14 pts → −5.6 % | 14 pts → **−14 %** | 19 |
| 22 | 57 | 22 → −8.8 % | 22 → **−22 %** | 35 |
| 40 | 111 | 40 → −16 % | **40 → −40 % (capped)** | 71 |
| 52 | 147 | 52 → −20.8 % | 40 → −40 % | 107 |
| 82 | 237 | 82 → −32.8 % | 40 → −40 % | 197 |

Below character level ~40 the §6-C double cap is what binds, exactly as it does
today, so the early game changes only by the weight of a point. Past 40 the
stat cap binds and the surplus must go to Dodge, then Resist, then the pools.
Under that version a pure one-stat build is **self-terminating**: a real choice
for the first forty levels, and then the game hands you breadth whether you
wanted it or not. That is precisely what the owner objected to, and §3.1 is the
answer — uncapped, purity stays available at every level and keeps paying, just
less steeply.

#### 4.6d The consequence to weigh: the relative game ends around level 40

| | today | capped (5-A) | uncapped (§3.1) |
|---|---|---|---|
| relative LANE stats all at cap | **never** (325 points of sinks against the 297 a Melee 100 earns) | character level 38 | no cap to reach |
| relative SHARED stats all at cap | character level 100 | character level 40 | no cap to reach |

**Uncapping removes this phase boundary**, which is the second reason to prefer
it: every point from level 3 to 300 goes on buying relative power, so the
"level 40 and the relative game is over" cliff below simply does not happen.
What follows describes the capped version, and is the cost of choosing 5-A.

So the design splits a character into two phases. **Level 3 to ~40 is the
relative game** — every point is loud, the order you buy them in is the build,
and a level-up is felt immediately, which is the ask. **Level 40 to 300 is the
universal game** — the relative stats are done, and every further point buys
HP, Mana, Stamina, Move Speed, Speed or Range, which is the slow, universal
feel this design was meant to trade away.

Stated plainly because it is the biggest thing the owner is buying: the ask is
fully delivered for the first forty levels and structurally cannot be delivered
past them, because a relative stat that keeps growing forever is a relative
stat with no cap. What carries a character from 40 to 300 is the universal
half, which keeps compounding: skill damage (+1.5 per level, to +150), the
weapon tier ladder (to ×7.84), the pools, and the milestone ladder. If the
relative arc should run longer, the dial is MORE relative stats or higher caps
with the per-point value held (which re-slows the points, undoing the ask) —
not a change to the edge.

---

## 5. Where it plugs into the code

Everything server-side is one new function and one new optional argument,
threaded to the sites that already know the monster. No new message type, no
new storage key, no new client→server event.

### 5.1 Server

| where | change |
|---|---|
| `prog3.js` `PROG3` | new per-point values, and **`cap` becomes `bound`** on the seven stats — no longer a design limit, just the storage clamp every read already applies (999, the sanitizer's existing number; points are server-minted so the real limit is the point supply). Each stat gains `relative: true` and, for the four percentage ones, `curveK`, so the client's row metadata and the readers work off the table rather than a list. Plus `PROG3.EDGE = { FADE_PER_LEVEL: 0.20, BELOW_BONUS: 0 }`, `prog3Edge(yardstick, monsterLevel)`, and the two readers that supply the yardstick: `_prog3LaneYardstick(ps, cat)` (that lane's trained level) and `_prog3BodyYardstick(ps)` (the highest trained level). Two named functions rather than a raw level at each call site, because "which level does this compare against" is the decision the whole design turns on and it must have one home |
| `prog3.js` `prog3Curve(pts, K)` | `pts / (pts + K)`, the ONE definition of the diminishing shape, mirrored client-side. The four percentage readers below call it; nothing else states the arithmetic. The §6-C double cap `min(bound, characterLevel)` stays exactly as it is — it is a pacing rule, not a ceiling, and it is the only thing that still stops an early rush |
| `prog3.js` readers | `_prog3CritChance / _prog3CritMult / _prog3SpecialMult / _prog3DefMult / _prog3DodgePct / _prog3ElemResistMult` take an optional `edge` (default 1) and apply it to the POINT COUNT, which is where the design puts it: `prog3Curve(pts × edge, K)` for the four percentage stats, `pts × edge × per` for the linear ones. The 1 % crit base stays outside the product, so an unallocated character rolls exactly what it rolls today at every gap. Edge on the count rather than on the result matters for a curve: `curve(p × 0.5)` is the value of half the investment, while `curve(p) × 0.5` would be half a value the curve never promised |
| `combat.js` `_computeAttackDamage(ps, slot, isSpecial, opts)` | `opts.edge` (default 1); the Power term becomes `dmgPts × per × edge`, and the crit / special readers receive it |
| `combat.js` `_handleMonsterDamage` | `edge = prog3Edge(this._prog3LaneYardstick(attackerPs, this._prog3CatFor(_effSlot)), m.level)` — the lane the SERVER resolved, never the client's claim; passed to the roll, to `elemAttackStat` for the status snapshot and to `resolveElementCollision` |
| `combat.js` `_staffSplash` | inherits the primary hit's number (it is defined as "half the number beside it", v2.3.2481); neighbours are not re-priced by their own level — accepted, documented |
| `combat.js` `_applyDamage(ps, raw, isBlock, opts)` | `opts.attackerLevel`; `edge = prog3Edge(this._prog3BodyYardstick(ps), attackerLevel)` scales the def / dodge / eres point counts — the highest trained skill, so how tough you are never changes with the weapon in your hands. Absent `attackerLevel` → 1, so every caller that does not say keeps today's behaviour byte-for-byte |
| `index.js` `_monsterStrikePlayer` | passes `{ attackerLevel: m.level }` — the melee swing and the snowball impact |
| `telegraph.js` `_telegraphHitPlayer`, `dungeon.js` `_dungeonBossHitPlayer`, `firetrail.js` `_fireTrailHitPlayer` | pass the attacking monster's level; the fire patch stamps its goblin's `level` at creation (today it carries only `mid`, and the goblin may be dead when the patch burns) |
| `elemental.js` `elemAttackStat(ps, legacy, cat, edge)` | multiplies the `elem` point count; the power SNAPSHOT taken at status-apply time therefore already carries the edge of the monster it is on, so burn / root / thorn ticks and the thorn recoil need no further change |
| `abilities.js` `_abilityStrikeMonster`, `burst.js`, `arrowblast.js` | each loop already has the target `m` in hand: compute the edge per target and pass it to the roll (a Whirlwind through a mixed pack prices each monster by its own level) |
| `_maxWeaponDmg` / `_maxDmgForAttacker` | **no change in shape.** They read the same constants (lockstep by construction) and assume the maximum edge of 1, which is an upper bound on every legitimate roll. The sim's anticheat sample: 2 400 proposed rolls at every cap on the worst legitimate kit peak at **32 % of the ceiling** |
| `join.js` caps | `prog3rel: true` — display-only (nothing new is sent) |
| PvP `_resolvePvPAttack` | **unchanged (edge 1 both ways).** The attacker's PvP number is client-rolled and capped; wiring both players' levels through it is its own PR |

### 5.2 Client (mirrors and copy only)

| where | change |
|---|---|
| `src/data/prog3.js` | the seven constants and `EDGE` mirrored (mirror-audit §12 already compares `PROG3.ATK` / `PROG3.BODY` scalars AND key sets, so a one-sided edit fails CI); `prog3Edge()` mirrored for the readouts |
| readouts (`prog3DmgTerm`, `calcDisplayDps`, `calcDisplayDmgRange`, `statPreview`) | predict at edge 1 — the number you will see against a monster at or below your level — and say so once, in the Points screen's one-line legend |
| Points screen (`HeroExpanded.jsx`) | relative rows carry a small edge glyph beside the count; the ℹ️ window's second line reads *"Full strength vs Lv ≤ N (your level). Fades to nothing at Lv N+5."* with N live; row copy from the kid sentences in §3 |
| nameplate legend | the four bands gain their point strength: **near = full, high = 60–80 %, danger = 40 % → 0**. No change to the plate itself — its border already tells the player which band a monster is in |
| against an old worker (`caps.prog3rel` absent) | rows print that worker's per-point values and caps (the `PROG3_LEGACY_ATK` posture, rule 19), the glyph and the legend line hide |

Own-hit damage popups in server zones are painted from `monster_hit` (server
truth, v2.3.2220), so the edge cannot desync a popup; the only predictions
that exist are the readouts above, and they are labelled.

---

## 6. Migration v18 — `prog3-relative-points`

Placed points in the seven relative stats convert **by value**, rounded UP,
and the surplus is **refunded to the pool that paid** — lane points back to
their lane (`pool` and `poolBy[cat]` together, the parts-≤-whole invariant by
construction), shared points back to `shared`. The v6 `uniform-t2-caps`
precedent ("halved per-point with points doubled — power-neutral") rather
than the v11/v15/v17 full refunds, because a full refund would hand every
veteran a character with no defense the moment the worker deploys. Nobody's
effect shrinks; everybody gets points back.

Under **5-B** the conversion inverts the curve instead of dividing a rate:
a stat holding `n` points at the old linear value `r = n × per` keeps
`ceil(K × r / (1 − r))` points, which is the point count that reads the same
percentage on the new curve. Linear stats (Power, Special, Element, crit
damage) divide by the weight ratio as below. Worked, for Defense (`K` 60,
old −0.4 %/pt):

| placed today | old value | → kept | new value | refunded |
|---|---|---|---|---|
| 100 | −40 % | 40 | −40 % | 60 |
| 60 | −24 % | 19 | −24 % | 41 |
| 25 | −10 % | 7 | −10 % | 18 |
| 7 | −2.8 % | 2 | −3.2 % | 5 |

The table below is the same exercise under **5-A**, kept for that option.

| placed today | effect | → kept | effect | refunded |
|---|---|---|---|---|
| Defense 100 | −40 % | 40 | −40 % | 60 |
| Defense 60 | −24 % | 24 | −24 % | 36 |
| Defense 7 | −2.8 % | 3 | −3 % | 4 |
| Dodge 75 | 30 % | 30 | 30 % | 45 |
| Power 75 | +37.5 | 25 | +37.5 | 50 |
| Power 20 | +10 | 7 | +10.5 | 13 |
| Luck 100 | 30 % / ×2.5 | 30 | 30 % / ×2.4 | 70 |
| Luck 33 | 9.9 % / ×1.83 | 10 | 10 % / ×1.80 | 23 |
| Special 10 | +10 % | 4 | +12 % | 6 |

- `RPG_SCHEMA_VERSION` 17 → 18. Idempotent via a rate stamp in the blob's
  prog3 block (`rpv`, the `ppl` / `spl` pattern), and re-run at the join
  boundary in `_sanitizeProg3` because migrations fail open — a blob that
  missed v18 would otherwise have its counts clamped to the new caps by the
  sanitizer's own cap loop, silently, with no refund. The sanitizer's cap
  clamps must read the NEW caps only after the fold has run.
- The §6-C double cap can bind on a refunded point that is re-spent (a
  level-30 character cannot re-place 40 Defense points); that is the
  existing spend rule, not a migration concern.
- Player-facing line for the level-up banner / patch note (draft):
  > **Your points are your edge.** Every point you spend now works at full
  > strength on monsters up to your level, fades on monsters above you, and
  > does nothing five levels up — so we made each point 2–3× bigger. Your
  > builds are unchanged: points you already spent were converted at equal
  > value, and the leftovers are back in your pool to spend.

---

## 7. Couplings and traps — what to watch

- **The world is pinned at level 1–2** (data.js `ZONES`, v2.3.1160, owner
  directive; the intended bands sit beside each zone as comments: meadow
  1–10, frost/tidal 8–25, verdant/mist 22–40, hollows/sky 38–58, ember/thunder
  55–80). Until those bands are restored the fade is reachable only in
  dungeons (`monsterLevel ≤ ps.level`, +0..2 jitter per wave). Unpinning is a
  content decision and its own PR; two things it must carry: the client's
  `applyZoneVariant` clamps server-sent levels to the CLIENT zone table
  (`zones.test.mjs` pins the two tables together), and the entrance-ramp
  spawn logic (v2.3.1147) is what made high bands walkable from the entry
  edge.
- **Anticheat lockstep is by construction, not by a matching edit** — but
  ONLY because the ceiling reads the constants and assumes edge 1. If a
  future change ever lets the edge exceed 1 (`BELOW_BONUS`), the ceiling must
  assume that maximum instead. Pin it in `prog3.test.mjs` §6 with the sample
  at `BELOW_BONUS`'s maximum, not at 1.
- **Six copies of the variance band still move together** (combat.js, the
  client's two rolls and displayed range, balance-sim, `BAND_TOP` in the
  prog3 suite). This note does not touch them; listed because the reprice PR
  will be in that file.
- **Supply vs sinks stops being a question under 5-B**, which is most of the
  reason to prefer it: with no cap there is nothing to fill, so a point always
  has somewhere to go and "I finished my column" never happens. Scarcity comes
  from the diminishing return and from the edge instead of from a wall. The
  mid-game pacing guard is unchanged and is now the only limit: the §6-C double
  cap still holds every stat at `min(bound, character level)`, so a character
  30 cannot hold more than 30 points in anything however many it has banked.
  (Under 5-A the sink totals were lane 305 against the 297 a Melee 100 earns,
  and shared 475 against 891 — i.e. both columns finishable, which is the
  phase boundary §4.6d describes.)
- **`_prog3AtkPts` / `_prog3Pts` clamp to the cap at every read.** The
  migration must run before those clamps see a blob, or a 60-point Defense
  reads as 40 with nothing refunded (§6).
- **The sanitizer's 999 pool clamp** gains headroom, not pressure: a refund
  moves points from placed to unspent and never exceeds what was placed, so
  `pool + refund` stays under the lifetime supply (≤ 992 lane, ≤ 891 shared),
  which the clamp was sized for.
- **`trainDefense`'s dormant `attackerLevel`** (gameSystems.js, voided since
  the fun-first reprice) and the ±5 "valid-threat" convention it came from
  are the same idea as this note's window; nothing to port, but do not
  re-enable the old gate on top of the edge.

---

## 8. Tests the code PR ships with

`server/test/prog3.test.mjs`:

- the edge table above, exactly, including `BELOW_BONUS` 0 and the +6 floor;
- **the yardstick, which is the pin that matters most** (§4.6b is the bug it
  prevents): `_prog3LaneYardstick` returns that lane's trained level and
  `_prog3BodyYardstick` the highest, so raising a character's OFF-skills
  changes neither a lane's edge nor its roll — assert the same damage from
  Melee 40/1/1 and Melee 40/20/20 against the same monster, and assert a body
  spend's edge is unchanged by which weapon is equipped;
- `_computeAttackDamage` with edge 0 / 0.5 / 1 on a Power + Luck + Special
  build: the Power term scales linearly, the crit chance scales but the 1 %
  base does not, the special multiplier scales, and edge 0 equals the
  zero-points roll to the unit;
- `_applyDamage` with `attackerLevel` at gap 0 / +3 / +5 on a Defense +
  Dodge build: the cut and the dodge rate scale, absent `attackerLevel` is
  byte-identical to today;
- `_handleMonsterDamage` against a monster 5 levels above a maxed attacker
  lands the no-points number; the same monster at the attacker's level lands
  the invested one;
- **the curve, and the two things about it that can silently break** (5-B):
  `prog3Curve(pts, K)` matches the §3.1 table at 10 / 25 / 40 / 100 / 297 /
  891 points; it passes through the 5-A endpoint exactly (40 Defense points is
  −40 % on both shapes, which is what makes §4's numbers survive); it is
  strictly increasing and strictly below 1 at every point count the storage
  bound allows, so no investment can reach immunity; and the edge is applied to
  the COUNT, asserted by `curve(2p, K)` at edge 0.5 equalling `curve(p, K)`;
- the combined avoidance product at the three §3.1 investments, pinned as a
  number rather than an inequality, so decision 12's answer cannot drift
  silently later;
- the anticheat sample re-run with Power, Luck and Special at the storage
  bound (lockstep), and once more with `BELOW_BONUS` at its maximum if it is
  ever non-zero;
- the Element DoT at the storage bound: a burn tick priced off 999 elemental
  power stays inside whatever ceiling the same PR gives `_applyMonsterDot`;
- migration v18: the conversion table in §6 row by row (the curve inversion
  under 5-B), idempotence via the stamp, the join-boundary heal on a blob that
  skipped it, parts ≤ whole after a lane refund, that no conversion ever
  LOWERS a stat's value, and that an already-converted blob is untouched.

`server/test/mirror-audit.test.mjs` needs no edit: it compares every scalar
and both key sets between `server/src/prog3.js` and `src/data/prog3.js`, so
`EDGE` and the seven repriced rows are pinned the moment they exist on both
sides (and fail if they exist on one).

`tools/qa/mp/mp-statgrid` / `mp-prog3` (browser, real worker): the ℹ️
window's second line prints the live level, the edge glyph appears on the
seven rows and on no other, and the row copy matches §3.

`tools/relative-points-sim.mjs`: after the code lands, replace the sim's
point-scaling with the real `edge` argument; the tables in §4 must not move.
That is the check that the implementation matches this note.

---

## 9. Rollout

1. **This note** — the owner marks §10.
2. **Server + client mirrors + suite** (one PR, one version tag): constants,
   `prog3Edge`, the threaded argument at every site in §5.1, the client
   mirrors and copy in §5.2, caps flag `prog3rel`. Deploy-order safe in
   either order: an old client against the new worker just sees bigger
   numbers on the rows it already draws (its readouts predict the old
   per-point values until it updates — display only); a new client against
   an old worker draws that worker's values.
3. **Migration v18** — could ride PR 2, but separated so the reprice can soak
   a day on live characters at their OLD point counts (which the new caps
   clamp at read, i.e. nobody is stronger than intended in between) before
   the refund lands. If you would rather have one button, fold it in.
4. **Depth zones** — the content PR that makes the fade visible in the open
   world (§7, first bullet). Not this design's, but this design's payoff.

---

## 10. Decision checklist

Recommended default in bold; the rest of the note explains each row.

| # | decision | options | rec | owner pick |
|---|---|---|---|---|
| 1 | The curve | **A: linear −20 % per level, 0 at +5** · B: front-loaded 100/70/45/25/10/0 · C: −25 %/level, 0 at +4 | **A** | |
| 2 | "Your level" | A: character level (the plate's number) · **B: the lane's own skill for lane stats, highest skill for shared** · C: highest trained skill for everything | **B** (the sim overturned A — §2, §4.6b) | |
| 3 | Below your level | **A: full strength, no bonus** · B: +10 %/level below, capped at 150 % | **A** | |
| 4 | Which stats are relative | **A: the seven in §3** · B: the seven + Speed (`aspd`, as a fast-universal stat at cap 35) · C: lane stats only (Defense/Dodge/Resist stay universal) | **A** | |
| 5 | Weight and shape | A: ×2.5–3 heavier with hard caps (§3) · **B: UNCAPPED — same weight, the four percentage stats on `p/(p+K)` through the same endpoints (§3.1)** · C: ×2 everywhere with caps | **B** (the owner dislikes caps, and the sim says uncapped is the better shape anyway) | |
| 6 | Luck's crit-damage endpoint | **A: +3 %/pt (moot under 5-B — uncapped, so there is no endpoint to land on; it reads ×2.4 at the 30 points 5-A would have capped at)** · B: +3.33 %/pt, if 5-A is chosen after all | **A** | |
| 7 | Migration | **A: convert by value, refund surplus (v6 precedent)** · B: full refund of the seven stats (v17 precedent) | **A** | |
| 8 | PvP | **A: unchanged (edge 1), own PR later** · B: both players' character levels wired through now | **A** | |
| 9 | Rollout | **A: server+mirrors PR, then the migration PR** · B: one PR | **A** | |
| 10 | Depth zones | **A: restore the commented bands as the next content PR** · B: keep the world at 1–2 (the fade is dungeon-only) | **A** | |
| 12 | The endgame avoidance extreme, given 5-B | **A: accept it (the BALANCE-PLAN §4c precedent: "near-unkillable max tank builds", PvE-focused)** · B: raise the `K`s so a maxed avoidance build lands nearer 20 % damage through · C: floor the combined damage-through (a cap on the product, never on a stat) | **A** | |
| 11 | The nameplate border, given decision 2-B | **A: the plate follows the same yardstick (the active lane's level) so its colour predicts your point strength** · B: the plate keeps the character level from the 2026-09-14 mock and the colour means difficulty only | **A** (client-only) | |

---

## Appendix — how the tables were made

`tools/relative-points-sim.mjs` builds a real `GameRoom`, joins a real
player through `webSocketMessage`, and drives `_computeAttackDamage` and
`_applyDamage` — the roll and the sink the worker uses. The proposed
constants are applied by editing `PROG3`'s tables in-process; the edge is
applied by scaling the placed point count by the edge fraction before the
roll, which is exactly what the shipped readers will compute because every
reader of a relative stat is linear in its point count (Luck's 1 % base sits
outside the product). Monster stats come from the live spawn curves, not the
pinned zone bands — the sim asks what a level-N monster IS, which is what
the depth zones and dungeon waves spawn. 2 000 simulated kills and 6 000
simulated incoming hits per cell (`--quick`: 400 / 1 000). Table 4.4 is the
one place the two builds' point counts differ on purpose (250 + 175 today
against 80 + 70 proposed), because "same effect at cap, fewer points" is the
claim being checked.

The §7 build tables (§4.6 here) construct a whole character rather than a
fixture: given three skill levels they derive the character level, the lane
budget (`3 × (lane level − 1)`, which is what `poolBy` holds) and the shared
budget (`3 ×` every level-up), spend them down a striker/tank order against
both the stat cap and the §6-C double cap, and equip the weapon tier that
lane's level actually unlocks (`tierIndex × 5`, the shipped forge gate). The
two yardsticks in 7b are the only difference between decision 2's options, so
that table is the whole of the evidence for it. The XP figures come from
`prog3XpRequired`, the shipped curve.
