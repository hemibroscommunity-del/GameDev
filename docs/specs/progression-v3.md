# Progression v3 — the trained-skill combat rebuild (server core)

**Version:** v2.3.1659 &nbsp;·&nbsp; **Status:** server core SHIPPED (flag
advertised, client slice pending) &nbsp;·&nbsp; **Design:**
`docs/PROGRESSION-REDESIGN.md` (owner-approved 2026-08-13, "Go
recommended") &nbsp;·&nbsp; **Code:** `server/src/prog3.js`,
migration v10 in `server/src/migrations.js`, branches in
`server/src/combat.js` / `grids.js` / `index.js` / `join.js` /
`persistence.js` &nbsp;·&nbsp; **Suite:** `server/test/prog3.test.mjs`

## What shipped

The OSRS-inspired progression the design paper locked:

- **Three trained skills** — storage keys `sword` / `bow` / `staff`,
  displayed **Melee / Bow / Magic**. Level 1–100, trained BY USE:
  the server awards damage-proportional XP (×1.0 per credited damage
  point) at hit time inside `_handleMonsterDamage`. Melee swings train
  sword, bow hits train bow, staff hits train staff; **specials always
  credit Magic** (they scale on the Magic level too). XP is computed
  from the overkill-clamped credit, so corpse-grinding can't inflate it.
- **Character level = Σ trained levels**, cap 300. A fresh character is
  level 3 (three level-1 skills). Every trained level-up is
  immediately +1 character level **and +`POINTS_PER_LEVEL` allocation
  points** (v2.3.2199: **3**, was 1 — owner: "each level up gives the
  character 3 points to spend instead of 1"; migration v14 back-paid
  existing characters, see §economy below), with a
  full hp/stamina/mana restore and a private `prog3_level` event.
- **Nine allocated stats** (`prog3_allocate { stat }`, server-validated;
  ack `prog3_allocated` + `player_state` echo).  v2.3.2199 added `dmg`
  and `elem` and repriced `critDmg` flat→percent:

  | stat | scope | per point | hard cap | at cap |
  |---|---|---|---|---|
  | `def` | BODY | −0.4% damage taken | 100 | −40% |
  | `hp` | BODY | +8 max HP | 100 | +800 |
  | `dodge` | BODY | +0.4% dodge | 75 | 30% |
  | `stam` | BODY | +3 max stamina | 100 | +300 |
  | `elem` | BODY | +1 elemental power (DoT + collisions) | 75 | 75 |
  | `dmg` | ATK/type | +0.5 damage, pre-tierMult | 75 | +37.5 |
  | `crit` | ATK/type | +0.4% crit chance | 75 | 30% |
  | `critDmg` | ATK/type | +1% crit damage (was +2 flat) | 100 | crits ×2.5 |
  | `aspd` | ATK/type | −0.35% swing period | 100 | −35% |

  Each stat is additionally capped at **min(100, character level)**
  (decision 12-C — replaces `_statCap` for prog3 players). `aspd` is
  stored/validated but consumed client-side (next slice); the 210 ms
  server cadence floor already covers −35% (600 × 0.65 × 0.7 = 273 ms),
  so no floor move was needed — revisit if the per-point value grows.

## New formulas (prog3 players only)

- damage: `(effBase + trainedLevel × K) × tierMult` — K = 0.18
  melee/bow, 0.22 staff (§7-A first guess, balance-sim retune pending);
  specials use the SAME term as a normal hit with that weapon
  (v2.3.1710 — superseding "specials use Magic level × 0.22"; owner:
  "I want magic to keep its cross weapon purpose but also have specials
  belong to their weapon.  Within the magic stat allocation is the only
  way to grow your mana that's required for special attacks", so Magic's
  cross-weapon value is the MANA POOL every special spends, not the
  special's damage). Variance / special mults / volatile
  / buffs / amulet / curse unchanged.
- crit: plain roll `crit × 0.4%`; on crit `× (1.5 + critDmg × 1%)`
  (power's rational curve, the lucky-hit accumulator, and the banked
  crit flats all retire).  *(v2.3.2199: was `× 1.5 + critDmg × 2` —
  the flat was dominant early and rounding error late; the percent is
  the owner-approved reversal of the §7 anti-compounding pick, bounded
  by the ×2.5 ceiling.  Invested points kept their count, no refund.)*
- damage stat: `dmg × 0.5` joins the trained-level term INSIDE the
  pre-tierMult sum (v2.3.2199) — it scales with gear like skill damage
  and never goes dead, while its relative worth self-decays as the
  skill term grows (see §economy).
- elemental (v2.3.2199): `elemAttackStat` (elemental.js) substitutes
  the allocated `elem` stat for WHATEVER legacy T1 stat an elemental
  formula asks for — burn `5 + P×0.3`, root `3 + P×0.15`, thorn
  `4 + P×0.25`, collision `base + P×coeff` — for prog3 players; legacy
  players keep the old read byte-for-byte.  **Announced regression:**
  migrated veterans' fossil T1 stats stop feeding elemental damage the
  moment this ships; the retro grant hands them the points to re-invest.
- incoming damage: after the resist buff, `× (1 − def × 0.4%)`,
  floor 1 — applies in `_applyDamage`, so monsters AND PvP.
- dodge: `dodge × 0.4%` replaces agility's roll + the evasion
  accumulator.
- pools: `maxHp = 100 + level×2 + hp×8`; `maxStamina = 100 + stam×3`;
  `maxMana = 100 + magicLevel×1.2`.
  *(v2.3.1697: the `+ armorHp` term — `20 × min(8, tierMult)` — is GONE,
  here and in the legacy `_recomputeMaxes`, on the owner's directive.
  Armor pays out as per-hit damage reduction (`_armorDrMult`, v2.3.1679)
  and must not ALSO be a bigger health bar. Both maxHp formulas had to
  lose it: this one serves every respecced player, so dropping it only
  from the legacy path would have changed nothing live.)*
- XP curve: `prog3XpRequired(L) = ceil(280 × 1.16^(L−1))` — the legacy
  weapon curve verbatim, shifted one because prog3 levels are 1-based.

**Anticheat lockstep:** `_maxWeaponDmg` / `_maxDmgForAttacker` carry the
same branch — trained-level + `dmg` term per candidate weapon, crit
mult `1.5 + max-lane critDmg × 1%`, crit flat 0 (v2.3.2199). The suite
samples 2 400 rolls against the ceiling with every offense stat maxed.
`ps.prog3` is server-owned end to end (never read from join
payloads or `stats_update`), so tracking the exact terms is safe.
DoT/collision damage needs no ceiling work: it is minted server-side
from the spend-gated `elem` stat and `COLLISION_BURST_CAP` still binds.

## The respec (migration v10 + join boundary heal)

`prog3FromLegacy(blob)` — shared by migration v10 (stored blobs) and
the join path (first connects / fail-open blobs):

- trained level = legacy `weaponSkills[cat].level + 1` (cap 100),
  leftover xp carried (identical curve ⇒ same earned level);
- pool = Σ legacy weapon levels **+ legacy defense-skill level** (§3's
  bonus-points carry); alloc zeroed — the full respec;
- absent-only (the v4/v9 pattern): a blob already carrying prog3 is
  never re-derived.

A **freshly derived** respec (not adopted from storage) tops off
hp/stamina/mana to the new maxes at join — the announced respec moment,
and the pool formulas just changed under the player.

## Legacy coexistence (dual path until cleanup)

Everything branches on `ps.prog3`; a player without it (fail-open v10)
gets the old math untouched. For prog3 players the 30-channel economy
is **inert, not deleted**:

- `_t2Flat` (grids.js) returns 0 — the single choke point that retires
  every banked flat (ironskin, secondwind, thorns, vigor, stamina,
  recovery, lifeblood, weapon damage/crit flats). This is the design
  doc's "t2Flat ratchet zeroed" invariant, enforced at the read site
  instead of by zeroing storage **on purpose**: a rollback recovers the
  real accumulator instead of a replay estimate.
- point-count reads gated: `_wpnCritPts`, `_attuneMult`,
  `_blockStaminaMult`, `_conditioningFlat`, `_evasionDodge`, the
  laststand/secondwind triggers, the thorns block reflect.
- the T1 ingest loop in `_handleStatsUpdate` is **frozen** for prog3
  players — prog3 shrinks `ps.level` to 3..300, so the old
  `_statCap(level)` clamp would corrupt stored T1 stats that are being
  kept for rollback.
- legacy fields (`weaponSkills`, `weaponSpecs`, `defenseSkill/Spec`,
  `hpSpec`, `enduranceSpec`, `t2Flat`, the five T1 stats) stay stored
  and keep accepting client reports (store-and-echo) — rollback keeps
  working AND legacy training keeps accruing underneath. Retirement is
  the cleanup PR after soak (§10 PR-6).

## Wire

- caps: `prog3: true` (join.js). The client slice gates its Build UI,
  `prog3_allocate` sends, trained readouts, and its local XP-accrual
  retirement on it. (Listed in caps-audit's allowlist until that slice
  lands — delete the entry in that PR.)
- client → server: `prog3_allocate { stat, cat }` — **unchanged by
  v2.3.2199**: the new stat names (`dmg`, `elem`) flow through the same
  `prog3StatDef` whitelist; no new message types.
- server → client (both in `PRIVILEGED_EVENTS`):
  `prog3_level { skill, level, pool, charLevel }`,
  `prog3_allocated { stat, pts, pool, poolBy }`.
- `player_state` / `_saveRpg` carry `prog3`
  (`{ sk, alloc, atk, pool, poolBy, ms, ppl }`);
  `RPG_SCHEMA_VERSION` = 14.
- caps: `prog3x: true` (v2.3.2199) gates DISPLAY only — the two new
  stat rows, the percent critDmg readouts/DPS math, and the "+3
  points" banner.  Nothing is sent on it; an old worker silently
  refuses unknown stat allocations, which is the same posture as a
  hidden row.

## The 3-points economy (v2.3.2199)

- Mint: `PROG3.POINTS_PER_LEVEL = 3` per trained level-up, stamped to
  the earning lane (`poolBy`).  The char-5 milestone bonus point is
  unchanged.
- **Retro grant** (migration v14 / `prog3GrantRetroPoints`): every
  stored character receives `+2 × (level − 1)` per skill, stamped per
  lane, so a veteran holds exactly what a fresh character reaching the
  same levels would.  The v10 defense-skill carry was a one-time bonus
  and is NOT tripled.  Idempotent via the blob's `ppl` rate stamp;
  `prog3FromLegacy` mints at the new rate itself (join-boundary heals
  never see v14 because `_saveRpg` stamps `_v` with the constant), and
  `_sanitizeProg3` runs the same grant as a boundary heal for fail-open
  blobs.  Max legitimate unspent pool ≈ 992 — the sanitizer's 999 clamp
  is load-bearing headroom now.
- Supply vs sinks: lifetime supply ≈ 892–992 (3×297 + defense carry
  ≤100 + milestone) against 1 500 points of sinks (450 BODY + 3×350
  ATK) — full-maxing stays impossible, choices stay sharp.

### Why no stat dominates (the point-buy rationale)

Marginal value of the next point, in a common currency (%DPS for
offense, %EHP for defense), melee reference builds; tierMult cancels
out of every relative offense number because `dmg` sits pre-tier:

| stat | identity | early (~15) | mid (~50) | endgame (300) | shape |
|---|---|---|---|---|---|
| `dmg` | reliable, every swing; multiplied by crit AND aspd; newbie-legible | **+1.8%** | +0.6% | +0.25% | front-loaded, self-decaying |
| `crit` | back-loaded multiplier; pays double once critDmg is bought | +0.2% | +0.3% | **+0.4%** | grows with critDmg |
| `critDmg` | combo stat — worthless at 0 crit, best closer for a crit build | +0.05% | +0.1% | +0.2% | strictly back-loaded |
| `aspd` | throughput; multiplies everything; costs the stamina/mana budget; the 210 ms floor never binds (273 ms min) | +0.35% | +0.4% | **+0.5%** | hyperbolic |
| `elem` | the enchant/detonation game; needs an element1 weapon; the one offense any lane's points can buy | ~+1.9% if enchanted | +0.3% | +0.04% | early-mid identity |
| `hp` | buffer vs everything incl. DoT | **+4.2%** | +2.0% | +0.3% | front-loaded |
| `def` | multiplies with armor DR; anti-chip | +0.4% | +0.4% | +0.7% | back-loaded |
| `dodge` | binary avoidance; beats big hits | +0.4% | +0.4% | +0.6% | back-loaded |
| `stam` | the block/bash/whirl action budget | utility | utility | utility | flat |

Three bounds keep an early `dmg` rush honest: the §6-C double cap
(min(75, charLevel) — at char 15 you can hold ≤15 while earning ~37,
spread is forced), the 75 cap vs critDmg/aspd's 100, and monotonic
relative decay — `dmg` is the strong, legible early buy and the WEAK
offense buy at endgame, where crit/aspd take over.  Flats (hp, dmg)
front-load and fade; multipliers (def, dodge, crit, aspd) compound;
critDmg/elem pay only in combination.  Equalizing every stat's %/point
at one snapshot is impossible at every other snapshot (flat vs
multiplier shapes) and undesirable anyway — the differing SHAPES are
the strategy.  **The one dial** if live play shows a dmg rush:
`ATK.dmg.per` 0.5 → 0.35 (one mirrored constant).  `elem`'s endgame
fade is structural (no tierMult in the DoT/collision formulas); the
follow-up dial is tier-coupling, a lockstep-sensitive change for its
own PR.

## Points remember their channel (v2.3.2176)

Owner, correcting a plan that had treated the pool as one undifferentiated
number: *"There are 3 primary combat skills. You earn stat points that one
of those primary combat skills channels. You can only apply offensive
weapon damage to the combat skills you leveled up in. However you can apply
that stat point to any defensive attribute (max hp, defense, dodge,
stamina) regardless of what channel you earned the point through."*

- `prog3.poolBy = { sword, bow, staff }` records WHICH skill's level-up
  minted each unspent point. `_prog3AwardXp` stamps it on level-up;
  the sanitizer clamps Σ poolBy ≤ pool so a forged blob cannot mint
  points by claiming channels.
- **Offense** (`crit`, `critDmg`, `aspd` — per weapon) is spendable only
  from that weapon's own channel. A Bow point cannot buy Melee crit.
- **Defense** (`def`, `hp`, `dodge`, `stam` — global) is spendable from
  any channel; the client names the lane it is standing in via `cat`, and
  an old client with no `cat` falls back to the largest channel.
- `pool − Σ poolBy` is the LEGACY remainder: points earned before this
  shipped have no channel and stay spendable anywhere. Nobody's existing
  points are taken away or retroactively assigned.
- Deploy-order (rule 19): the worker advertises `caps.prog3Chan`. Without
  it the client shows the single shared pool on every lane, which is
  exactly what an old worker will honour.

## Tier / equip gates (v2.3.1661, §6 — SHIPPED)

- Requirement = **tierIndex × 5** (20-tier tables → 0..95): weapons on
  the matching trained skill (greatsword AND sword → Melee — the
  standing `GEAR_STAT_REQ.sword='agility'` vs `EQUIP_STAT_MAP.sword=
  'power'` mismatch dies here), armor + shield on allocated **defense
  points**, amulets on Magic. Items without a known `gearBase` estimate
  their tier from `tierMult` (the legacy ×6 curve, capped at index 19
  so the top tier stays reachable on a 100-cap skill).
- **The server equip gate exists now** (it was client-only):
  `_prog3EquipOk` (gear.js) gates `equip_request`, the forge stat gate
  branches to trained levels, and the `stats_update` armor ingest
  (grids.js) rejects over-tier swaps — reject keeps the old armor and
  the echo snaps the client back (the threat-lock pattern).
- **Grandfather rule:** gates apply at equip/forge time only —
  already-worn gear survives the respec (everyone's defense points
  start at 0; stripping worn armor would read as theft). Unequip
  always passes.
- Client mirrors: `prog3GearReq` / `getGearStatReq(…, rpg)` /
  `canEquipItem` / `meetsStatReq` / `getEquipReqLabel(…, rpg)` in
  gameSystems.js; Forge/Woodwork/Inventory panels print the same
  Melee/Bow/Magic/Defense requirements the gate enforces.
- Shield forging/equipping remains client-local (as in legacy) — its
  server gate lands if shields ever route through a server flow.

## Known deviations / follow-ups

- PvP: the legacy equipment-`def` mitigation (`100/(100+def)`) still
  applies on top of the new defense reduction for prog3 targets —
  bounded (DEF_CAP 150) and deliberately untouched; the PvP re-base is
  §11 sim work.
- K values and the §11 balance-sim gates are first-guess; the sim
  retune runs before the flag is considered settled.
- Suites that pin the legacy path (anticheat, grids, tick,
  combat-lifecycle, protocol-v2, threat, lifeskills-economy, part of
  persistence) opt their fixtures out of prog3 with a tagged comment —
  that coverage guards the fail-open path until the cleanup PR deletes
  it.
