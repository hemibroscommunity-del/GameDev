# Combat Progression Redesign — Options & Decisions (v2.3.1658)

**Status: PROPOSAL — nothing in this document is implemented.**
This is the options paper the owner asked for ("still thinking through it,
help me plan some potential options here"). Each design axis below offers
2–3 concrete options with the math sketched out, and a recommendation.
Decisions already made by the owner are marked **LOCKED**. When phases
ship, each gets its own `docs/specs/` entry and BALANCE-PLAN gains a
pointer; this file is the pre-implementation record.

---

## §0 Decision checklist

Every choice this redesign needs, in one table. "Rec" is my recommended
default — mark your picks and the rest of the document explains each row.

| # | Decision | Options | Rec | Owner pick |
|---|----------|---------|-----|-----------|
| 1 | Scope of first release | design doc → phased PRs | LOCKED | ✅ doc first |
| 2 | Trained vs allocated | 3 trained + 7 allocated | LOCKED | ✅ |
| 3 | Character level formula | Σ trained levels (cap 300) | LOCKED | ✅ |
| 4 | Migration | full respec | LOCKED | ✅ |
| 5 | XP curve for melee/bow/magic | A: reuse today's weapon curve · B: OSRS curve · C: two-slope | **A** | |
| 6 | Does tanking train anything? | A: no · B: generic XP trickle | **A** | |
| 7 | Old defense-skill XP converts to | A: bonus points · B: head-start XP · C: dormant | **A** | |
| 8 | Per-point stat values | A: linear + hard caps · B: diminishing curves · C: soft-cap tiers | **A** | |
| 9 | What the defense stat DOES | A: flat HP · B: % damage reduction (cap ~40%) · C: hybrid | **B** | |
| 10 | The ~15 unmapped T2 channels | A: dropped (casualty list below) · B: perk layer later · C: fold into gear | **A** | |
| 11 | HP per character level | A: keep endpoint (~8.3/lvl) · B: shrink it, HP lives in the hp stat | **B** | |
| 12 | Armor tier gate | A: raw defense points · B: char level · C: defense points + per-stat level cap | **C** | |
| 13 | Damage per trained level | A: linear +K/level (sim-tuned) · B: %-multiplicative · C: OSRS max-hit | **A** | |
| 14 | Respec point count | A: convert old placed points · B: recompute from carried XP | **B** | |
| 15 | Trained XP authority | A: server-owned · B: client-report-clamped | **A** | |

---

## §1 Where we are today (code-verified, condensed)

Two parallel tracks that only meet at the character level:

- **T1 stats** (`power/agility/mind/vitality/endurance`) train by use via a
  client-only XP accumulator (`_buildProg`, localStorage — the server never
  sees it; clearing browser cache loses in-flight progress). The stat value
  itself feeds damage (`stat × 0.1667`), max HP/stamina/mana, dodge, crit,
  move speed, and **every material tier gate** (`statReq = tierIndex × 10`).
- **T2 grids**: `weaponSkills[sword/bow/staff]` level from damage dealt
  (`280 × 1.16^level` XP curve, cap 100, 2 points per level) and
  `defenseSkill` from damage blocked/taken. Points spend into **6 grids ×
  5 channels = 30 channels**. Spending is client-applied, server-clamped,
  and each point's value is **bench-priced at spend time** into a
  server-owned accumulator (`t2Flat`) that cannot be recomputed later.
- **Character level = 1 + total points placed** (cap 1000). Spending a
  point IS the level-up. The anticheat damage ceilings derive from the
  same accumulator, so pricing and ceilings must always move together.

Notable quirks the redesign fixes for free:
- Attack speed exists **only on the sword grid** (`tempo`); crit chance and
  crit damage exist as **three separate per-weapon channels each**.
- A sword's forge gate checks **Agility** while its equip gate and damage
  scaling check **Power** (`GEAR_STAT_REQ` vs `EQUIP_STAT_MAP` mismatch,
  documented follow-up).
- The server has **no equip stat gate** — only the client checks it.
- Armor gives flat HP; no damage-reduction stat exists anywhere.

## §2 Target shape (LOCKED)

- **Three trained skills**: Melee, Bow, Magic — trained by using that
  weapon class. Each level-up **immediately** grants +1 character level
  and +1 allocation point.
- **Seven allocated stats**: defense, hp, dodge, stamina, crit chance,
  crit damage, attack speed.
- **Character level = melee + bow + magic** (each capped 100 → level cap
  300; skills start at 1, so level 3 is the floor — display can show
  `level − 2` if starting at 1 reads better).
- **Weapon tiers** gate on the matching trained skill's level; **armor
  tiers** gate on the allocated defense stat (see §6 for the pacing
  guard).
- **Full respec** at migration: everyone re-allocates once.

---

## §3 Axis 1 — XP curves & what trains what

### Curve options

| | Formula | Time-to-100 feel | Notes |
|---|---|---|---|
| **A (rec)** | `280 × 1.16^level` (today's weapon curve) | known quantity — players are already on it | zero new balance surface; server already computes it; total XP to 100 ≈ 62M dmg dealt at 1 XP/dmg |
| B | OSRS: `Σ⌊L + 300·2^(L/7)⌋/4` | much steeper tail; 99 is a prestige event | doubles-plus time-to-cap; orphans all existing tuning |
| C | Two-slope: `1.12^L` to 50, `1.22^L` after | fast midgame, steep endgame | new curve to tune; midgame rush risks hitting tier gates too fast |

**Recommend A.** The demo's pacing complaints (if any) can retune later; a
known curve makes the migration math honest.

### What trains what

- Melee/Bow/Magic XP = **server-computed damage dealt** with that weapon
  class (the server already computes every hit — §9). Specials credit
  Magic (they scale on Mind today and are staff-flavored).
- **Tanking** (option 6): recommend **nothing trains from damage taken**.
  Defense is a pure allocation choice in the locked roster; adding a
  trained-by-tanking track quietly reintroduces a fourth skill. If you
  want the "getting hit matters" feel, option B (a small generic XP
  trickle split across all three skills when you block/take hits) is the
  contained version.
- **Cross-training dies with T1**: today bow/magic kills feed some
  vitality XP. Under the new model HP comes from allocation, so there is
  nothing to cross-train into. Stated so it's a decision, not an accident.

### Carried defense-skill XP (migration promise)

Players ground `defenseSkill` levels. Options: **(A, rec)** convert each
defense level to bonus allocation points at 1:1 (it respects the grind
without keeping a fourth track alive); (B) convert its XP to a head-start
split across the three trained skills (muddies "level = what you trained");
(C) store it dormant for a future defense rework (feels like theft).

---

## §4 Axis 2 — the seven-stat allocation menu

### Where each stat comes from (the 30-channel collapse)

| New stat | Replaces / absorbs | Notes |
|---|---|---|
| defense | `ironskin` (flat soak), `bulwark` (block stamina) | mechanic choice below is load-bearing |
| hp | `vigor` (flat maxHP) + vitality's ×10/pt | |
| dodge | `evasion` + agility's passive dodge | keep the 0.5 combined cap |
| stamina | `stamina` (flat max) + endurance's ×3/pt | |
| crit chance | `precision`/`marksmanship`/`overload` (3 per-weapon → 1 global) + power's rational curve | |
| crit damage | `executioner`/`headshot`/`focus` (3 → 1 global) + amulet dark-gem stays a separate layer | |
| attack speed | `tempo` (sword-only → global) | the −50% mult floor and the server's 210ms cadence floor **must move in lockstep** — change either alone and legit fast swings get rejected |

### Per-point value options

**(A, rec) Linear with hard caps** — the kid-simple ethos v2.3.1342 chose:

| Stat | Per point | Cap (points) | At cap |
|---|---|---|---|
| defense | −0.4% damage taken | 100 | −40% |
| hp | +8 max HP | 100 | +800 |
| dodge | +0.4% | 75 | +30% (agility's old 50% ceiling retired with agility) |
| stamina | +3 max | 100 | +300 |
| crit chance | +0.4% | 75 | +30% |
| crit damage | +2 flat (bench-style) or +1.5% mult | 100 | see §7 |
| attack speed | −0.35% swing period | 100 | −35% (inside the 210ms floor at 600ms base) |

(B) rational diminishing (`40P/(P+200)` idiom) for dodge/crit — smoother
but harder to read on a phone; (C) soft-cap tiers (full value to 50, half
after) — a compromise that costs a rules lesson.

With 300 points at cap and ~625 cap-slots across seven stats, **you can
max roughly half the menu** — that's the build identity. Archetypes:

- **Glass cannon**: crit 75 + critDmg 100 + atkspd 100 + dodge 25 → ~2.1×
  sustained DPS over baseline, but base 100+800×0 HP and no mitigation.
- **Tank**: defense 100 + hp 100 + stamina 100 → −40% incoming on ~900+
  more HP ≈ 2.8× effective HP; baseline damage only.
- **Balanced**: ~43 points everywhere → ~+17% each dial.

### The defense mechanic (decision 9 — load-bearing)

- (A) flat HP per point — status quo shape, but then armor tiers gate on
  a stat that only adds HP, and "defense" duplicates "hp".
- **(B, rec) % damage reduction, capped ~40%** — gives the game a real
  mitigation stat for the first time (armor is flat HP today; block is
  binary negation), makes armor-tier gating on defense feel right, and
  differentiates defense from hp cleanly. PvP note: reduction and dodge
  multiply, hence both caps.
- (C) hybrid (half HP, half reduction) — hedges, reads muddy.

### The unmapped ~15 channels (decision 10)

Dropped with the respec (**A, rec**) — the casualty list, so it's signed
off and not discovered: `cleave`, `piercing`, `longshot`, `detonation`,
`attunement`, `thorns`, `secondwind`, `poise`, `recovery`, `lifeblood`,
`resilience`, `laststand`, `conditioning`, `swiftness` (move speed),
`reflexes`. Most are flavor a demo doesn't need to carry through a
migration. (B) resurface the best as a perk chosen every 25 trained
levels — good v2 material; (C) fold into gear/amulets later. Note
`swiftness` is the only move-speed source besides agility, and agility
dies too — **move speed becomes flat** unless you want it in the menu
(an 8th stat is possible; not recommended for v1).

### Orphaned-formula audit

Every formula that loses its T1 input, and its proposed new input:

| Formula | Old input | New input |
|---|---|---|
| weapon damage | `stat × 0.1667` | trained level × K (§7) |
| max HP | `vitality × 10` + level × 2.5 | hp stat × 8 + level × K_hp (§5) |
| max stamina | `endurance × 3` | stamina stat × 3 |
| max mana | `mind × 3.5` | magic level × 1.2 (magic keeps its resource identity) |
| passive dodge | `agility × 0.0008` | dodge stat × 0.004 |
| crit chance | `40P/(P+200)` | crit stat × 0.004 |
| crit mult | `1.5 + power × 0.001` | 1.5 + critDmg stat (§7) |
| move speed | `agility × 0.0012` (+swiftness) | flat 5.0 (or an 8th stat) |
| armor flat HP | `× (1 + vitality × 0.01)` | drop the vitality term (tier mult stays) |
| specials | scale on Mind | scale on magic level |
| tier gates | `statReq = tierIndex × 10` | §6 |
| `_statCap(level)` | `level×10+20` | retired; per-stat point caps replace it |

---

## §5 Axis 3 — level & pools at cap 300

Today `maxHp = 100 + (level−1) × 2.5` reaches ~2600 at level 1000.
Options: (A) keep the endpoint — ~8.3 HP/level at cap 300 (level alone
makes you tanky; allocation matters less); **(B, rec) shrink the level
term to ~2 HP/level and let the hp stat carry the rest** — a maxed
character has 100 + 600 (level) + up to 800 (allocated) ≈ 1500 base,
plus armor. Lower ceiling than today's, which §11's sim gates will
re-base. Stamina/mana lose their level terms entirely (they never had
one; endurance/mind terms move into the stat/skill as tabled above).

## §6 Axis 4 — tier gating

**Weapons** (LOCKED concept): tier N of a weapon class requires the
matching trained skill at `tierIndex × 5` (20 tiers → requirements
0..95 against cap 100). A curved table (steeper at the top) is the
alternative if the last tiers should be prestige; linear is readable.

**Armor** on the allocated defense stat has a pacing wrinkle: points are
grantable at any level, so a fresh account that dumps every point into
defense can wear endgame armor at character level 20. Options:
(A) accept it (owner's literal ask — it IS a build choice);
(B) gate on character level instead (but then defense allocation doesn't
gate armor, contradicting the ask);
**(C, rec) gate on defense points, but cap each stat's points at
`min(100, character level)`** — you can still go defense-first, but you
can't outrun your level. One rule, applies to all seven stats, replaces
`_statCap`.

**Both gates fix the standing bugs**: `GEAR_STAT_REQ.sword='agility'` vs
`EQUIP_STAT_MAP.sword='power'` both become `melee`, and the **server
equip gate that doesn't exist today gets added** (`_isValidEquipSlot`
currently checks slot names only) — cap-flagged so old clients don't
break. Tier tables become one generated literal mirrored client+server
with a conformance test, like the existing mirror-audit pattern.

## §7 Axis 5 — damage per trained level

Replacing `stat × 0.1667` (which dies with T1):

- **(A, rec) linear `+K` damage per trained level**, K per weapon class,
  tuned so a maxed character's sim DPS lands within ±10% of today's
  maxed build — `tools/balance-sim.mjs` is the referee, not taste. First
  guess: K ≈ 0.18 for melee/bow, 0.22 staff (staff pays for variance).
- (B) %-per-level multiplicative — compounds with tier mult and crit into
  a runaway top end (1.01^100 = 2.7× before anything else); rejected.
- (C) OSRS max-hit style (effective level × tier bonus) — elegant but
  forces a full anticheat-ceiling rewrite in the same PR; more risk than
  the demo needs.

Crit damage joins here: recommend the flat bench-style add (matches the
current `weaponCritFlatFor` shape) over a multiplier, for the same
compounding reason as (B).

## §8 Axis 6 — the respec migration (server migration v10)

**Point count** (decision 14): **(B, rec) recompute from carried XP** —
carry `weaponSkills[cat].xp` through the new curve (identical if §3-A),
set melee/bow/magic levels from it, and grant exactly
`(melee−1)+(bow−1)+(magic−1)` points plus the defense conversion (§3).
This makes "every trained level = 1 point" retroactively true, which is
the cleanest possible statement of the new system. Some players will
receive fewer points than they had placed under the old 2-per-level
economy — that is the respec, and §12's announcement says so plainly.
Option A (convert placed points 1:1) preserves totals but imports the old
economy's inflation into the new one forever.

**The `t2Flat` ratchet is zeroed**, and the anticheat damage ceilings are
re-derived from the new closed-form formula **in the same deploy** — this
is a stated invariant, not a hope: the ceilings currently derive from the
accumulator, so zeroing one without the other rejects every legitimate
hit. The level-up celebration moves to the server's trained-level event
(today it fires from the client's spend confirm, which stops being the
level-up moment).

Old fields (`weaponSpecs`, `defenseSpec`, `hpSpec`, `enduranceSpec`,
`t2Flat`, the five T1 stats, `_buildProg`) are migrated then dropped from
`_saveRpg` after soak, per the v2.3.1155 precedent.

## §9 Axis 7 — server-authoritative trained XP

**(A, rec) full server ownership.** The server already computes every
damage roll; awarding melee/bow/magic XP at hit time is a few lines in
`_computeAttackDamage`'s callers, streamed in `player_state` deltas. The
client-only `_buildProg` track — the thing that silently loses progress
on a cache clear today — dies. Allocation becomes a server endpoint
(validate: pool > 0, stat under its cap) instead of client-applied +
clamped. Option B (client reports, server clamps) is today's posture and
today's known looseness; rejected.

New rpg fields ship **cap-flagged** (`caps.prog3`): old workers' sanitizers
strip unknown keys (TRAPS #9), so the server deploys first and the client
gates on the flag.

## §10 Axis 8 — rollout

Six PRs, server-first, each its own version tag; the old system keeps
working until the flag flips, preserving deploy-in-either-order:

1. **This document** (owner marks the checklist).
2. Server: trained-XP accrual + new storage fields + suite (flag off, no
   visible change).
3. Server: allocation endpoint, derived-stat recompute, dual-path
   anticheat ceilings (old formula while flag off, new while on),
   balance-sim scenarios added.
4. Client: new Build UI + readouts behind `caps.prog3`; legacy T2 panels
   retained for old workers.
5. Migration v10 + flag on + tier/equip gates (client and server).
6. Cleanup after soak: retire grids, bench pricing, `t2Flat`, `_buildProg`,
   the six-parent COMBAT_SKILLS roster, T2Panel.

## §11 Axis 9 — invariants (balance-sim gates, re-based)

- Per-zone TTK bands hold for a level-appropriate character (re-based to
  the new damage curve).
- Duel TTK floor: no archetype one-shots another at equal level.
- Combined avoidance ceiling: dodge cap × block's binary negation × defense
  reduction must leave a worst-case ≥X% damage-through (pick X ≈ 30%).
- Attack-speed floor lockstep: allocation cap ↔ 210ms server cadence.
- Anticheat ceiling ≥ max legitimate hit under the new formula (sim-proved
  across archetypes, not hand-derived).
- New-player first hour unchanged (level 3, zero points ≈ today's fresh
  character).
- New scenarios: time-to-level-N curves; the three §4 archetypes in PvP
  cross-play at equal level.

## §12 Player-facing respec announcement (draft)

> **Combat is getting a rebuild!** Your combat skills are becoming three
> trained skills — Melee, Bow, and Magic — that level up as you fight,
> and every level gives you a point to spend on YOUR build: defense, HP,
> dodge, stamina, crit chance, crit damage, or attack speed. Everyone
> gets a **full respec**: your trained experience carries over, and all
> your points come back as a fresh pool to spend however you want. Your
> items, gold, and life skills are untouched. Point totals may differ
> from before — the new system grants exactly one point per level
> trained, for everyone equally.
