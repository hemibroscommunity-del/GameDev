# Master Balance Plan (v2.3.1108, 2026-07-01)

The blueprint for balancing combat progression: the 6 combat skills and
their 5-category grids, material tiers, hardening, quality grades, and
elemental damage. Written against **code as source of truth**; GDD sections
are cited as design intent and adopted explicitly where noted.

Owner decisions this plan encodes (2026-07-01):
- **Fast-action pacing** — fodder dies in ~2-5s, brutes in single-digit
  seconds for an appropriately-geared player.
- **The old 5 generic T2 stats are formally retired** (ferocity,
  elementalMastery, fortification, restoration, influence). The 6×5 grid
  (docs/specs/build-skill-progression.md) is the only T2 system.
- **Hardening is a rare-chase layer** — core balance is tuned assuming
  Hardness 0-1; Hardness 3-5 is server mythology allowed to break the curve.

Companion tool: `tools/balance-sim.mjs` — computes every table in this doc
from the REAL formulas (imported from `src/data/gameSystems.js`, never
copied) and audits the invariant gates. Run `node tools/balance-sim.mjs`.

---

## 1. Ground truth — the live combat math

Everything that actually affects damage/survival in the shipped game:

| Layer | Formula (code scale) | Source |
|---|---|---|
| Weapon base | greatsword 10 · sword 6.67 · bow 7.29 · staff 8.54 | gameSystems.js WEAPON_TYPES |
| Governing stat | `+ stat × 0.1667` (melee=power, bow=agility, staff=mind) | calcWeaponDmg |
| Damage channel | `+ 1.0 × points` (edge/drawPower/spellPower), cap 99 | WEAPON_CHANNELS |
| Material tier | `× tierMult` — 1.00 → 7.84 over 20 tiers (geometric ×1.115) | BLACKSMITH_TIERS |
| Variance | melee ×0.75-1.25 · bow ×0.6-0.8 · staff ×0.5-1.5 | calcWeaponDmg |
| Special | ×2.0, scales on Mind, no channel bonus | calcSpecialDmg |
| Crit chance | `40·P/(P+200)%` + crit channel `+0.5%/pt` (cap +30%) | calcCritChance |
| Crit mult | `1.5 + power × 0.001` | calcCritMult |
| Max HP | `100 + (level-1)×2.5 + vitality×10` | calcMaxHp |
| Dodge | `min(agility × 0.0008, 30%)` | passive dodge |
| Block | base 25% + Bulwark +1%/pt (cap 75%) — **currently unreachable, see §7** | calcBlockReduction |
| Monster HP | `ceil(monsterStat(12.5, lvl) × archetype.hpMult)` | createMonster (client+server) |
| Combat level | sum of the five T1 stats, cap 500 | recalcDerived |

**Scale map:** the code is the GDD §4.4 formula rescaled ÷4.8 (GDD
`Power×0.8` ↔ code `×0.1667`; greatsword 48 ↔ 10). Any GDD damage number
imports onto the code scale by dividing by 4.8. Two deliberate divergences:
the material curve (GDD linear→6.2×; code geometric→7.84× — **keep the
code curve**, it shipped) and monster HP (retuned independently, base 12.5).

## 2. The damage composition (adopted)

GDD §4.4 composition, on the code scale, with the two unbuilt loot layers
in their canonical positions:

```
effective_base = (weapon_base + hardness × 1.0417) × quality_mult
damage         = (effective_base + stat × 0.1667 + damage_channel)
                 × tierMult × variance [× 2.0 special] [× crit_mult]
```

- Hardness bonus = GDD's +5/level ÷ 4.8. Applied BEFORE quality, so quality
  multiplies a hardened base (the §4.6c/§4.6b interaction is intentional).
- At Hardness 0 / Normal quality this reduces exactly to today's live
  formula — `balance-sim.mjs` asserts that equivalence at startup.
- Elemental effectiveness is NOT in this formula (GDD v12.6 deleted the
  element-tier multiplier). Elements act only through the collision/status
  pipeline (§6).

**Layer ceilings** (what each layer can multiply, worst case):

| Layer | Realistic ceiling | Absolute ceiling |
|---|---|---|
| Material tier | ×7.84 (worldbreaker) | ×7.84 |
| Quality grade | ×1.50 (elite, ~1/111 drops) | ×3.00 (godly, 1/400k) |
| Hardness | ×~1.16 on base (H1, 80%) | ×1.78 on base (H5, 1/2.5M) |
| Damage channel | +99 flat (full investment) | +99 |
| Crit expectation | ~×1.1-1.3 | ×1.4 |

## 3. TTK audit — current status (sim findings)

Fast-action gates adopted from GDD §6.5 (median-Power player, band-matched
tier, vs brute): L15 → 1-3 hits · L35 → 2-3 · L65 → 3-4 · L100 → 3-5.

`node tools/balance-sim.mjs` results (2026-07-01):

| Gate | Result | Status |
|---|---|---|
| L15 / iron | 3 hits | **PASS** |
| L35 / mythril | **5 hits** (E[dmg] 34, brute 140 HP) | **FAIL** |
| L65 / runestone | **5 hits** (E[dmg] 87, brute 392 HP) | **FAIL** |
| L100 / worldbreaker | within 3-5 | **PASS** |
| Prototype band (L1, all zones today) | fodder 1-2 hits, brute 2-4 | **PASS** — fast action confirmed |

**Finding BF-1 (the mid-band sag):** monster HP compounds at 1.065^level
through L30 while player damage grows linearly (stat) times ×1.115/tier —
HP outruns damage from ~L25 to ~L80, then the HP curve's plateau ramps
(1.035/1.025) let damage re-converge. Today this is dormant (every zone is
`level:[1,1]`), but **zone-level unpinning is blocked on fixing it**.
Candidate fixes, in preference order: (a) flatten monsterStat's ramp from
1.065 to ~1.055; (b) raise the per-tier mult step for tiers 7-13; (c) grant
weapon-channel points faster in the mid band. The sim previews any of these
in seconds — tune there first.

## 4. The 6×5 grid — completion budget

Live today: 2 of 5 channels per weapon category (damage +1/pt, crit
+0.5%/pt), Bulwark (+1% block/pt). The other 15 channels are visible as
"Soon" and allocatable-but-inert. Budget rule: **99 points invested in any
category should buy comparable marginal value** (measured as %DPS for
offense, %EHP for defense, with utility channels priced at ~70% of a DPS
point since they also carry convenience).

Proposed per-point values (validate each in the sim before shipping):

| Category | Channel | Per point (cap 99) | Note |
|---|---|---|---|
| Melee | Executioner (crit dmg) | +0.8% crit damage | multiplies with Precision — price both together |
| Melee | Tempo (atk speed) | -0.25% swing cooldown, cap -20% | touches the 600ms cadence: server must mirror |
| Melee | Cleave (arc) | +0.6° arc, cap +45° | utility-priced |
| Bow | Headshot / Piercing / Longshot | mirror melee trio (crit dmg / multi-hit / +range) | Longshot interacts with PvP 250px cap — clamp |
| Staff | Detonation (AoE) | +0.7% collision radius | keyed to elemental pipeline (§6) |
| Staff | Attunement (status) | +0.5% status duration | replaces retired Influence |
| HP | Vigor | +2 maxHp | vs vitality's +10: channel is the cheaper secondary |
| HP | Second Wind / Recovery / Lifeblood / Resilience | see spec Phases 2-3 | Resilience = -0.2% crit taken/pt |
| Endurance | Stamina/Conditioning/Swiftness/Evasion/Reflexes | spec Phase 4 | Evasion stacks with agility dodge — SHARED 30% cap |
| Defense | Iron Skin | -0.5%/pt damage taken, cap -25% | function exists, never invoked — activate |
| Defense | Thorns / Toughness / Poise | spec + INV-09/INV-17 ceilings | thorns DPS ≤ best active ×1.25 |

Hard rule carried from the inventory: **shared caps for stacking sources**
(dodge: agility + Evasion share the 30% cap; block: base + Bulwark share
75%) so channel completion can't compound past the invariants.

## 5. Hardening v1 (rare chase) — adopted spec

GDD §4.6c verbatim, flagged for a future server-side PR:

- Hardness 0→5 ladder: **80% / 20% / 5% / 1% / 0.5%**, +5 GDD base damage
  per level (= +1.0417 code scale), applied before quality.
- Gold cost `500 × 4^level` (× tier scaling); failure resets Hardness per
  Temper band: Temper 0-19 → reset to 0 · 20-49 → -2 · 50-99 → -1 ·
  100+ → no reset. Temper +1 per fail, resets on success. Server-tracked.
- Blacksmith gate: max hardenable tier = `floor(skill / 5)`. Skill never
  changes odds — access, not advantage.
- INV-27: ≤10 new Hardness-5 weapons per 90-day window (monitoring stat,
  not enforcement).
- Implementation: hardness/temper live in the server rpg blob next to the
  weapon object; `_sanitizeWeapon` clamps hardness to [0,5]; the
  HardeningLedger is an append-only array in the same blob (§17.5).

## 6. Elemental — prerequisite and ceilings

All elemental damage is client-side today; the server deliberately computes
weapon-only damage (`_computeAttackDamage` comment). **Elemental balance is
meaningless in multiplayer until the server owns it** (roadmap P2 item 4).
When that slice lands:

- Effectiveness (×1.25 / ×0.75 circle) and collisions stay OUT of the
  auto-attack formula — collision pipeline only.
- Adopted ceilings: INV-13 resonance ≤2.8× base collision; INV-16 combo
  burst ≤3.2×; INV-02 mana sustainability (regen alone can't sustain
  swipe triggers — collisions are the caster mana loop).
- ElementalMastery (retired stat) does NOT return; Attunement/Detonation
  channels (§4) are its successors.

## 7. Defense loop revival (done, v2.3.1113)

Shipped: `trainDefense` now fires on every block (server-confirmed,
fallback, local-AI melee, projectile — ×1.0 of prevented damage) and on
every unblocked hit taken (×0.25), granting defenseUnspent points on
level-up. Iron Skin is live in both the server's `_applyDamage`
(authoritative MP damage, spec clamped [0,50] → cap −25%) and the
client's local-AI/projectile paths. The ±5 valid-threat gate is bypassed
(attackerLevel null) while all monsters are pinned to level 1 — re-enable
alongside BF-1 when zone levels unpin. Thorns/Second Wind/Poise remain
"Soon" channels budgeted in §4.

## 8. Formal retirement of the old T2 stats

ferocity / elementalMastery / fortification / restoration / influence are
pinned to 0, wiped by `migrateWeaponT2`, and consumed only as ×1.0 no-ops
(fortification: consumed nowhere). Cleanup checklist (one small PR):
- drop the five keys from the join bootstrap, stats_update clamps
  (`server/src/index.js`), player_state echo, and `_saveRpg` blob;
- drop from client wire serialization (`src/networking/index.js:65-67`);
- keep `_t2Retired` migration so legacy saves stay clean;
- remove the ×0 formula hooks (emMult, restMult, influence CC) or leave
  them reading the successor channels;
- GDD §2 marked superseded by the 6×5 grid (doc note only).

## 9. Adopted invariants and current status

| Invariant | Meaning | Status today |
|---|---|---|
| INV-03 kill-time gates | §3 table | **FAIL mid-band** (BF-1) — dormant until zones unpin |
| INV-06 EHP spread 1.5-4.0× | build identity matters | exempt below L15 (stat pools too small); untested above |
| INV-14 lunge < auto | mobility isn't a DPS upgrade | PASS (×0.6 per hit; full cadence check when Tempo ships) |
| INV-26 stat budget | build-skill levels grant exactly their points | enforced by server stat clamp (level×10+20) |
| INV-27 Hardness-5 rate | ≤10 per 90 days | n/a until hardening ships (add counter to ledger) |
| INV-02/05/13/16 | elemental/CC/mana ceilings | blocked on server elemental model |

## 10. Phase sequence (each its own PR, sim-verified before merge)

1. **Defense loop revival** (§7) — smallest, unblocks the 6th skill.
2. **Server elemental model** (§6 prerequisite; roadmap P2 item 4).
3. **Quality grades** (§4.6b: server-rolled at loot time; mystery-reveal
   UI deferred).
4. **Hardening v1** (§5) — forge UI + server ladder + ledger.
5. **Grid channels** — one category per PR, per-point values from §4,
   sim-audited against the shared caps.
6. **Mid-band curve fix (BF-1)** then **zone-level unpinning** — the
   finale that turns the level dial back on with gates that pass.
7. **T2 retirement cleanup** (§8) — anytime, orthogonal.

Every phase lands with a sim run in the PR description showing the gates
before/after. The sim is the referee; the GDD is the intent; the code is
the truth.
