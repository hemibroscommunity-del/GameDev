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
| Damage channel | `× (1 + points × 0.005)` (edge/drawPower/spellPower), cap 99 — repriced v2.3.1153 (was `+1/pt` pre-tier) | WEAPON_CHANNELS / DAMAGE_CHANNEL_PCT |
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
damage         = (effective_base + stat × 0.1667)
                 × (1 + damage_channel_pts × 0.005)
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
| Damage channel | ×1.495 (full investment, v2.3.1153) | ×1.495 |
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

> **FIXED v2.3.1140** via candidate (a), with one correction: ~1.055 was
> not enough (L35 brute lands at 108 HP vs a 3-hit budget of ~103 — still
> 4 hits). The shipped ramp is **1.052**; all four INV-03 gates pass with
> margin, INV-06 passes at L15/35/65/100 (spread 1.67→2.73). The curve now
> lives in one exported `MONSTER_HP_CURVE` object (src/data/gameSystems.js,
> mirrored in server/src/data.js) and the sim IMPORTS it — the sim
> previously hardcoded a copy, violating its own "never copied" rule.
> Zone bands unpinned in the same PR; ±5 valid-threat gate on trainDefense
> re-enabled (§7's unpinning condition met).

## 4. The 6×5 grid — completion budget

**Status (v2.3.1133–1138): every BUILT channel is live.**  All 15 weapon
channels and all 5 defense channels are wired client+server and priced in
the sim's channel-pricing section (CH-01..04, DF-01..02 gates).  Only the
HP/Endurance grids remain (spec Phases 2/4 — the skills themselves have
no category grid yet).  Budget rule: **99 points invested in any
category should buy comparable marginal value** (measured as %DPS for
offense, %EHP for defense, with utility channels priced at ~70% of a DPS
point since they also carry convenience).

Shipped per-point values (sim-validated; deltas from the proposal noted):

| Category | Channel | Per point | Status (v2.3.1138) |
|---|---|---|---|
| Melee | Executioner (crit dmg) | +0.8% crit damage | **LIVE 1133** — client+server via calcCritMult 2nd arg |
| Melee | Tempo (atk speed) | -0.25% swing cooldown, cap -20% | **LIVE 1134** — no cadence check existed; the worker gained a per-(player,monster) 335ms floor sized to the Tempo CAP |
| Melee | Cleave (arc) | +0.6° arc, cap +45° | **LIVE 1134** — hit test + aim preview in lockstep |
| Bow | Headshot (crit dmg) | +0.8% crit damage | **LIVE 1133** |
| Bow | Piercing | +1 target / 25 pts, cap 3 | **LIVE 1135** — count-based, not %/pt (readable breakpoints) |
| Bow | Longshot | +0.5%/pt speed+flight | **LIVE 1135** — PvP clamped to the 250px cap both sides |
| Staff | Arcane Focus (crit dmg) | +0.8% crit damage | **LIVE 1133** — `focus` role converted variance→critDmg per the spec grid |
| Staff | Detonation (AoE) | +0.7%/pt bolt radius | **LIVE 1136** — see INV-16 note below |
| Staff | Attunement (status) | +0.5%/pt status duration | **LIVE 1136** — client hook + server applyElementStatus durMult (≤1.495 clamped) |
| Defense | Thorns | reflect 1%/pt of blocked attack, cap 50% | **LIVE 1137** — server block branch; kills via shared pipeline, lifesteal denied (DF-01 gate) |
| Defense | Second Wind | heal 1% maxHp/pt after surviving, cap 50%, 10s cd | **LIVE 1137** — REPRICED from 0.5%/pt: DF-02 gate showed +12% EHP vs Iron Skin's +33%; 1%/pt lands +27% |
| Defense | Poise | -1%/pt stun duration, cap -50% | **LIVE 1137** — client-only (stuns gate local input only) |
| HP | Vigor / Second Wind* / Recovery / Lifeblood / Resilience | see spec Phases 2-3 | grid not built (\*the shipped Second Wind lives under Defense per DEFENSE_CHANNELS) |
| Endurance | Stamina/Conditioning/Swiftness/Evasion/Reflexes | spec Phase 4 | grid not built — Evasion must SHARE the 30% dodge cap |

Sim findings worth knowing (channel-pricing section, L35/mythril cell):
- **FIXED v2.3.1153:** the legacy damage channel (+1 flat/pt, pre-tier-mult)
  priced at **+725% DPS** at full investment — an order of magnitude above
  every percentage channel. Repriced to a tier-independent multiplier
  `×(1 + pts × 0.005)` (DAMAGE_CHANNEL_PCT, mirrored client/server and
  CI-audited): edge 99 now buys **+49.5%**, just above the crit pair's
  +44%, so the damage channel stays the category ceiling without being a
  monoculture. CH-01 became a two-sided parity band (edge within
  0.9×–1.5× of the crit pair). Spent points were REFUNDED to
  weaponUnspent by the `refund-damage-channels` migration (owner decision
  2026-07-03: refund, not silent reprice).
- INV-16's 3.2× burst cap is per-collision; Detonation multiplies target
  COUNT, so per-cast total burst grows linearly with radius. If total
  burst per cast is ever adopted as the cap's meaning, drop Detonation's
  per-point value.

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

## 6. Elemental — server-authoritative core (done, v2.3.1114)

Shipped: `server/src/elemental.js` (tables extracted programmatically from
the client module) + GameRoom wiring. Statuses apply from the `element`
already on the wire (arrows now populate theirs); burn/root DoT ticks in
`_tickMonsters` with kill credit through the shared `_resolveMonsterKill`
pipeline (extracted verbatim; DoT kills deny melee lifesteal via slot
'dot'); collisions detonate on the oldest different-element status with
resonance × volatile × effectiveness, clamped to INV-16's 3.2× burst cap.
Client keeps duration/FX bookkeeping but no longer mutates server-monster
HP (the old cosmetic misprediction). Discovery before this slice:
**elemental damage did nothing at all against server monsters** — DoT and
collisions were pure client mispredictions.

Still client-side (candidates for later slices): resonance-streak mana
restore (self-buff), amulet elemDmg / hexer curse on the auto-attack roll,
CC movement effects on server AI (freeze/root/slow don't slow server
monsters yet), peer-visible status FX (each client only sees its own
applied statuses). ElementalMastery stays retired; Attunement/Detonation
channels (§4) are its successors. INV-02 mana sustainability remains a
sim TODO.

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
| INV-03 kill-time gates | §3 table | **PASS all bands** (BF-1 fixed v2.3.1140, ramp 1.052; zones unpinned) |
| INV-06 EHP spread 1.5-4.0× | build identity matters | exempt below L15 (stat pools too small); untested above |
| INV-14 lunge < auto | mobility isn't a DPS upgrade | PASS (×0.6 per hit; full cadence check when Tempo ships) |
| INV-26 stat budget | build-skill levels grant exactly their points | enforced by server stat clamp (level×10+20) |
| INV-27 Hardness-5 rate | ≤10 per 90 days | n/a until hardening ships (add counter to ledger) |
| INV-02/05/13/16 | elemental/CC/mana ceilings | blocked on server elemental model |

## 10. Phase sequence (each its own PR, sim-verified before merge)

1. ~~**Defense loop revival** (§7)~~ — DONE v2.3.1113.
2. ~~**Server elemental model** (§6)~~ — DONE v2.3.1114.
3. ~~**Quality grades**~~ — DONE v2.3.1131 (#193; server-rolled at mint,
   mystery-reveal UI deferred).
4. ~~**Hardening v1**~~ — DONE v2.3.1131 (#193; forge ladder + temper +
   ledger).
5. ~~**Grid channels**~~ — DONE v2.3.1133–1137 (all built channels live,
   §4 table; Defense also counts toward combat level as of v2.3.1138).
   Remaining grid work is the HP/Endurance categories (spec Phases 2/4).
6. ~~**Mid-band curve fix (BF-1)** then **zone-level unpinning**~~ —
   DONE v2.3.1140 (§3 FIXED note; ramp 1.052 via `MONSTER_HP_CURVE`,
   zone bands raised). Bands are static per-zone content — never scaled
   to the character (owner directive, 2026-07-02). Remaining follow-up
   lives in handoff item K: zone ENTRY gating (a fresh L1 player can
   still walk into a L55-80 zone).
7. **T2 retirement cleanup** (§8) — anytime, orthogonal.

Every phase lands with a sim run in the PR description showing the gates
before/after. The sim is the referee; the GDD is the intent; the code is
the truth.
