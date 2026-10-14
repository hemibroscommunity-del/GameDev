# Each tier pays twice the XP, and XP fades 5 levels below you (v2.3.3251)

Owner, 2026-10-14, answering "XP per harvest doesn't double ... Do you want XP
to grow with the time?": *"Yes adjust the xp. Also make xp decay if you're
trying to harvest lower level things. This also applies to combat. Xp should
begin decaying starting at 5 levels below your current level. It should always
be most efficient to harvest or fight things within your current level."*

## 1. A harvest's XP doubles a tier

Each tier now takes twice as long as the one before at the level it opens
(`docs/specs/resource-hp.md`), so it pays twice the XP too. A harvest's base XP,
before the gesture's grade (OK x1, Good x1.5, Perfect x2):

| Tier | Mining | Woodcutting | Fishing | Base XP | Was |
|---|---|---|---|---|---|
| 1 | Copper (Lv 1) | Pine (Lv 1) | Minnow (Lv 1) | 163 | 163 |
| 2 | Iron (Lv 1) | Softwood (Lv 5) | Clownfish (Lv 5) | **326** | 350 |
| 3 | Black steel (Lv 5) | Hardwood (Lv 10) | Trout (Lv 10) | **652** | 538 |
| 4 | Titanium (Lv 10) | Cedar (Lv 15) | Salmon (Lv 15) | **1,304** | 725 |
| 5 | Obsidian (Lv 15) | Maple (Lv 20) | Pike (Lv 20) | **2,608** | 913 |

At the level each one opens, every tier now pays about the same XP a second
(22–30 a second with the gesture). Before, obsidian at Mining 15 paid about 9 a
second against copper's 20.

`GATHER_TIER_XP` / `harvestBaseXp` in `server/src/gathering.js`. A tier not in
the table keeps the old `(tier x 1.5 + 5) x 25`. The world grows no such tier.

## 2. XP fades for what is 5+ levels below you

`gap` = your level − its level.

| Gap | 0–4 (or above you) | 5 | 6 | 7 | 8 | 9 | 10 | 15 | 20 |
|---|---|---|---|---|---|---|---|---|---|
| XP paid | 100% | **33%** | 28% | 24% | 21% | 17% | 15% | 6.6% | 2.9% |

Up to 4 levels below you is full XP. At 5 below it drops to a third, and each
level past that is 15% less again. In code: `xpDecayMult` in
`server/src/xpdecay.js`. The game's copy is `src/data/xpDecay.js`.

**Whose level against what:**

- **A harvest:** your Mining, Woodcutting or Fishing level, against the level
  the resource asks (`GATHER_REQ_LVL`). Copper and iron are level 1, black steel
  5, titanium 10, obsidian 15. Pine and minnow are 1, then 5, 10, 15, 20.
- **A fight:** the trained skill the XP goes **into** — Melee, Bow or Magic,
  the weapon that dealt the damage — against the monster's level. This is the
  same level the name plate's colour and your stat points' edge already measure
  a monster against.

  It is **never** the "Lv" on the top bar. That number is the character level,
  the sum of all three skills. A player with all three at 10 shows "Lv 30", and
  every monster below 26 would have paid them a third.

Every damage source that pays trained XP fades by each monster's own level: a
swing or shot, the lunge, the dash, the bash and the whirlwind, the staff's
splash, the Element Burst and the arrow blast. A burst that catches a Lv 12 and a Lv 7 pays the Lv 12's
damage in full and the Lv 7's at a third.

## 3. Why a third, and why 15%

The hit ladder makes a resource much quicker in the five levels after it opens.
The next tier then opens five levels later. So when a new tier opens, the one
before it has become fast. At full XP, black steel at Mining 10 would pay 2.5x
the XP a second of the titanium that just opened.

The two numbers are the gentlest that keep the owner's rule:

- **A third at 5 below** puts titanium ahead at Mining 10, by 20%.
- **15% less a level** keeps the newest resource ahead even where nothing is
  within your level. At Mining 20, obsidian is 5 below and titanium 10 below.
  Any gentler and titanium would win there.

Checked at every level 1–100 of all three skills, over the hit ladder's exact
dice, with the shortest honest harvest (the gesture's floor):

- whatever is within your level pays the most XP a second, by at least 20%;
- the newest resource you can harvest pays the most of all.

XP a second, best first (Good grade cancels out of the order):

| Mining | |
|---|---|
| 1 | Iron 23.5 > Copper 22.1 |
| 6 | Black steel 29.6 > Iron 16.9 > Copper 14.2 |
| 10 | Titanium 24.5 > Black steel 20.4 > Iron 15.8 > Copper 11.9 |
| 15 | Obsidian 24.8 > Black steel 15.7 > Titanium 15.3 > Iron 10.5 > Copper 7.1 |
| 20 | Obsidian 12.1 > Titanium 9.8 > Black steel 9.4 > Iron 5.3 > Copper 3.7 |

| Woodcutting (Fishing is the same shape) | |
|---|---|
| 6 | Softwood 32.9 > Pine 15.8 |
| 10 | Hardwood 28.5 > Softwood 20.9 > Pine 12.6 |
| 15 | Cedar 29.3 > Hardwood 17.3 > Softwood 14.6 > Pine 7.3 |
| 20 | Maple 29.8 > Cedar 14.3 > Hardwood 10.8 > Softwood 8.1 > Pine 3.7 |

In a fight, the XP is the damage you deal, 0.2 a point (`PROG3.XP_PER_DMG`).
You deal the same damage a second whatever you hit, so a monster 5 below pays a
third of the rate.

## 4. What it means in play

- **The level-1 resources sit 4 levels below a level-5 one.** At Mining,
  Woodcutting or Fishing 5 exactly, copper, pine and minnow still pay in full
  and are a little quicker than the level-5 resource. From level 6 they fade.
  That is the rule as written (4 below is "within your level"), and it lasts
  one level.
- **Past the top resources, everything fades.** Obsidian opens at Mining 15 and
  maple and pike at 20. From Mining 20 and Woodcutting/Fishing 25 nothing is
  within your level, so every harvest pays less: Mining 30 earns about 4 XP a
  second on obsidian. New, higher resources will fix this when the world grows
  them.
- **The same goes for fights past the monsters.** The Wheel's monsters stop at
  Lv 40, so a weapon skill past 44 earns less from all of them.

## 5. What does not change

- **Cooking, smelting, forging, farming, trapping and gem cutting** pay as
  before, with no fade. Cooking keeps its own HP and XP.
- **A quest's XP** and the dev kit's never fade. The fade lives at the damage
  sources, never in `_prog3AwardXp` itself.
- **The kill's own XP counter** (`ps.xp`, which levels nothing) and a **pet's
  XP** (a tenth of the kill's XP) are as they were.
- **Monsters above you** pay full XP, as before. There is no bonus for them.

## 6. Deploy order and the kill switches

- **The worker pays the XP.** The game only predicts a harvest's "+N Mining XP"
  popup (`gameSystems.js` `harvestXpFor`) and the Skills page's lines, and only
  against a worker that says so:
  - `caps.tierxp`: the doubled table;
  - `caps.xpdecay`: the fade.

  Against an older worker the game predicts that worker's old XP, unfaded.
- **`xpdecay: false`** in liveflags (lower case, TRAPS §117) pays full XP
  everywhere again, harvests and fights, from the next one.
- **`tierxp: false`** puts every harvest back on the old XP.
- **`nodehp: false`** turns the doubled XP off too. Doubled XP for the old,
  quick HP would race players through the top tiers.

To turn any of them back on, delete the flag.

## 7. On screen

Skills → Mining, Woodcutting or Fishing has two new lines:

- **Full XP:** the resources that still pay in full at your level.
- **Less XP:** the nearest ones that pay less, with their share.

At Mining 11: "Full XP — Titanium Ore", "Less XP — Black Steel Ore 28% · Iron
Ore 15% …". A harvest's "+N Mining XP" shows the faded number.

### A grey name plate: this monster pays less (v2.3.3251)

Offered "a grey name plate for monsters that pay less XP", the owner: *"I like
the idea of gray nameplate for reduced xp add that."*

A monster's plate already wore one of four colours, its level against the
skill of the weapon in your hand: green Low (2 or more under), yellow Near,
orange High, red Danger. Now a fifth comes first: **grey** when the monster is
5 or more levels under that skill, the monsters that pay reduced XP. Its ring
and its level are grey; green Low is now 2 to 4 under.

| Monster's level against your weapon's skill | Plate |
|---|---|
| 5 or more under | **grey** (reduced XP) |
| 2–4 under | green (Low) |
| 1 under to even | yellow (Near) |
| 1–2 over | orange (High) |
| 3 or more over | red (Danger) |

- The grey is `#A7B0B5` (`PLATE_BAND.faded` in
  `src/rendering/systems/entityRenderer.js`). It reads at 8.3:1 against the
  level's outline. Over every ground it is at least 25 colour-difference
  units (ΔE00) from the other four colours; the floor is 12.
- `plateBandFor` asks the fade itself (`xpDecayMult` < 1), measured by the
  skill a hit's XP goes into. So the plate turns grey exactly where the XP
  drops.
- It only appears against a worker that fades XP (`caps.xpdecay`).
- With the kill switch thrown, the grey goes too, at each player's next join.

The weapon's XP bar also fills more slowly against these monsters.

## 8. Tests

- `server/test/xp-decay.test.mjs`, 32 checks:
  - the rule at every gap, and the owner's "starting at 5 levels below";
  - junk levels and the bound;
  - a swing through the real `monster_damage` handler against monsters at,
    above, 4, 5 and 10 below;
  - the lane, not the character level (Melee 12 with Bow and Magic at 40);
  - the lunge, the staff's splash, the Element Burst and the arrow blast, each
    monster by its own level;
  - a quest's flat XP whole;
  - the cap and the kill switch.
- `server/test/gather-hits.test.mjs` §13:
  - the XP table;
  - the rule held over the worker's own dice at every level 1–100 of all three
    skills (worst 1.20);
  - what a strike really pays (black steel at Mining 9: 978; at Mining 11:
    277; iron at Mining 11: 72);
  - the caps and both kill switches, `nodehp: false` included.
- `server/test/mirror-audit.test.mjs` "tier xp" / "xp fade": the game's tables,
  its fade bit for bit, and its whole "+N XP" prediction against the worker's
  pay, 16,200 cases under every switch.
- `tools/qa/mp/mp-monsterplate.mjs` (63 checks):
  - grey at 8 and at exactly 5 levels under the weapon's skill, and still green
    Low at 4 under;
  - the grey plate's ring and level painted in the grey;
  - all five colours legible on the outline and at least ΔE00 12 apart over
    every ground.

  Its band sweep now raises the weapon's skill the plate reads. It raised the
  character level, which the plate has not read since v2.3.2680, so three of
  its checks failed on main: the test, not the game. Picture:
  `tools/qa/mp/out/monsterplate-grey.png`.
- `tools/qa/mp/mp-xpfade.mjs` on a 390 px phone, 31 checks:
  - the caps;
  - the Skills page at Mining 5 and 11;
  - copper mined at Mining 1, then at Mining 11 (ten levels past it), gesture
    and all. Each time the popped "+N Mining XP" was the worker's own credit:
    163 x the grade at Mining 1, and ~15% of it at Mining 11.

## 9. Open for the owner

- **The two numbers:** a third at 5 below, then 15% less a level
  (`XP_DECAY.START` and `STEP`). A gentler fade would let the previous tier pay
  more than the new one; `gather-hits` §13 fails if it ever does.
- ~~**A grey name plate for monsters that pay less.**~~ Answered: "I like the
  idea of gray nameplate for reduced xp add that" (section 7).
- ~~**Past the top resources and monsters everything fades.**~~ Answered: "Yes
  everything should pay less I'll add more content" (section 4 stays as it is).
