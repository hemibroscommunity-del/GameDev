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
  immediately +1 character level **and +1 allocation point**, with a
  full hp/stamina/mana restore and a private `prog3_level` event.
- **Seven allocated stats** (`prog3_allocate { stat }`, server-validated;
  ack `prog3_allocated` + `player_state` echo):

  | stat | per point | hard cap | at cap |
  |---|---|---|---|
  | `def` | −0.4% damage taken | 100 | −40% |
  | `hp` | +8 max HP | 100 | +800 |
  | `dodge` | +0.4% dodge | 75 | 30% |
  | `stam` | +3 max stamina | 100 | +300 |
  | `crit` | +0.4% crit chance | 75 | 30% |
  | `critDmg` | +2 flat on crits | 100 | +200 |
  | `aspd` | −0.35% swing period | 100 | −35% |

  Each stat is additionally capped at **min(100, character level)**
  (decision 12-C — replaces `_statCap` for prog3 players). `aspd` is
  stored/validated but consumed client-side (next slice); the 210 ms
  server cadence floor already covers −35% (600 × 0.65 × 0.7 = 273 ms),
  so no floor move was needed — revisit if the per-point value grows.

## New formulas (prog3 players only)

- damage: `(effBase + trainedLevel × K) × tierMult` — K = 0.18
  melee/bow, 0.22 staff (§7-A first guess, balance-sim retune pending);
  specials use Magic level × 0.22. Variance / special mults / volatile
  / buffs / amulet / curse unchanged.
- crit: plain roll `crit × 0.4%`; on crit `× 1.5 + critDmg × 2`
  (power's rational curve, the lucky-hit accumulator, and the banked
  crit flats all retire).
- incoming damage: after the resist buff, `× (1 − def × 0.4%)`,
  floor 1 — applies in `_applyDamage`, so monsters AND PvP.
- dodge: `dodge × 0.4%` replaces agility's roll + the evasion
  accumulator.
- pools: `maxHp = 100 + level×2 + hp×8 + armorHp` (armor = `20 ×
  min(8, tierMult)`, vitality term dropped); `maxStamina = 100 +
  stam×3`; `maxMana = 100 + magicLevel×1.2`.
- XP curve: `prog3XpRequired(L) = ceil(280 × 1.16^(L−1))` — the legacy
  weapon curve verbatim, shifted one because prog3 levels are 1-based.

**Anticheat lockstep:** `_maxWeaponDmg` / `_maxDmgForAttacker` carry the
same branch — trained-level term per candidate weapon, crit mult 1.5,
crit flat = `critDmg × 2`. The suite samples 2 400 rolls against the
ceiling. `ps.prog3` is server-owned end to end (never read from join
payloads or `stats_update`), so tracking the exact terms is safe.

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
- client → server: `prog3_allocate { stat }`.
- server → client (both in `PRIVILEGED_EVENTS`):
  `prog3_level { skill, level, pool, charLevel }`,
  `prog3_allocated { stat, pts, pool }`.
- `player_state` / `_saveRpg` carry `prog3` (`{ sk, alloc, pool }`);
  `RPG_SCHEMA_VERSION` = 10.

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
