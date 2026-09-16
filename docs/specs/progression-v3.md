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

## The attribute restructure (v2.3.2512)

Three owner asks from the 2026-09-14 backlog triage (§2.1c, decision D12),
shipped as one system because they share the allocation grid and one
migration. Caps flag **`prog3elem`** (display-only; nothing new is sent).

### ELEM PWR: one global stat → one per combat type

`elem` moves from `PROG3.BODY` to `PROG3.ATK`, **cap and per-point value
unchanged** (75 / +1 effective "power"). The owner's own split says attack
power belongs to the type that produces it — a staff build's burn has as
little to do with a bow as its crit does — and it is what lets the Points
screen put ELEM PWR inside MELEE / BOW / STAFF beside DAMAGE and CRIT.

Every reader goes through `elemAttackStat(ps, legacyName, cat)`, which now
takes the category; the four call sites pass the slot **the server
resolved**, never the client's claim:

| Site | Category |
|---|---|
| `combat.js` `_applyWeaponElementStatus` | `cat` param, defaults `'sword'` (its one caller, the lunge, is melee-only by construction) |
| `combat.js` `_handleMonsterDamage` (status + collision) | `_prog3CatFor(_effSlot)` |
| `burst.js` | the burst's own `slot` |
| `elemental.js` `resolveElementCollision` | `cat` param, passed from the hit site |

An unrecognised or missing category falls back to `'sword'`: a reader that
forgot to say loses the bonus rather than reading someone else's lane.

Client mirror: `prog3ElemPower(rpg, cat)` in `src/data/prog3.js` is the ONE
reader (three inline copies of the arithmetic were how the old one drifted).
Statuses carry a `cat` stamp (`applyStatus`'s optional 5th argument); one
without falls back to the lane the player is holding.

### ELEM RESIST: the defensive half the elemental system never had

New global `BODY.eres`, **−0.4 %/pt, −30 % at the 75-pt cap** — the same
shape `dodge` uses, because it is the same kind of promise and a player
should not have to learn two scales.

**What it resists is a closed list** (a stat with nothing to resist is dead
content), and the list is exactly the damage the server itself mints through
an elemental source:

| Source | File |
|---|---|
| The fire goblin's burning trail | `firetrail.js` `_fireTrailHitPlayer` |
| The blue slime's death burst | `telegraph.js`, `kit.kind === 'burst'` |

Nothing else is typed today: an ordinary monster swing, a brute's slam, a
fodder's lunge, a snowball and every dungeon hit are untyped and are **not**
resisted. The mechanism is `_applyDamage(ps, raw, isBlock, { elemental: true })`
— declared by the CALLER, because "is this hit elemental" is knowledge the
damage site has and `_applyDamage` does not. The day a new typed source
lands, it passes the flag and joins the list with no change to the stat.

Applied multiplicatively with `def`, immediately after it, with the floor-1
clamp preserved: two 30 % cuts that add reach 60 %, two that multiply reach
51 %, and only the second shape is safe against a future third layer.

### MAX MANA: a stat, added to the derivation rather than replacing it

New global `BODY.mana`, **+2.5/pt (= `MANA_PER_MAGIC_LEVEL`), cap 100 →
+250**. `maxMana` becomes:

```
floor(100 + magicLvl × MANA_PER_MAGIC_LEVEL + manaPts × BODY.mana.per)
```

Added, not replaced, so **at zero points every existing player's pool is
byte-identical** — nobody loses a pool they already had. One point buys what
one Magic level buys, so there is one number to reason about.

**The block ladder moves with it**: `manaBlocks = blocksAt(magicLvl + manaPts)`.
A special costs `maxMana / manaBlocks`, so growing the pool without growing
the count would make each cast *more* expensive and buy exactly zero extra
casts — the v2.3.1734 trap ("mana could not progress, by construction")
re-entered through a different door. Mana now counts its investment on the
same ladder stamina already counts its own allocated points on.

### Migration v15 — `prog3-elem-per-weapon`

`RPG_SCHEMA_VERSION` 14 → 15. `prog3MoveElemToAtk(p3)` deletes
`prog3.alloc.elem` and **refunds** its points to `pool`.

Refund, not copy and not a guess — the **v11 precedent**
(`prog3-per-type-offense`) for identical reasons: copying into all three
types would triple the investment for free, and picking one type would be
guessing on the player's behalf. Refunding hands the choice back, which is
the change.

Idempotent (it returns false the moment `alloc.elem` is absent) and
fail-open covered: `_sanitizeProg3` runs the same fold at the join boundary,
because migrations fail open and the alloc loop walks OUR key list — without
the heal a blob that missed v15 would have the points dropped with no refund.
`prog3SplitAtk`'s hardcoded body-key list was rebuilt off `prog3FreshAlloc()`
in the same version, for the same class of bug.

The two arriving BODY channels need no migration work: they start at zero,
`prog3FreshAlloc` carries them, `_sanitizeProg3` fills any blob that lacks
them, and max mana is additive.

### Pins

`mirror-audit` §12 gained a **key-set** comparison for `PROG3.BODY` and
`PROG3.ATK` in both directions. The existing scalar check compares only keys
present on BOTH sides, which is forgiving by design — and had a hole with
teeth: a stat that MOVES tables stops appearing in the shared set and the
drift passes silently. This version was exactly that case.

`prog3.test.mjs` pins the grid, the refund, the boundary heal, the mana
arithmetic (unchanged at zero points, and that investing buys CASTS not just
a longer bar) and the elemental cut. `mp-prog3` and `mp-statgrid` cover the
Points screen.

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

## The four-column points redesign (v2.3.2592)

Owner, 2026-09-16: *"Right now spending and applying and using combat
points is not a fun experience. I'm proposing a layout shift and a
redesign to the combat points themselves."* Three moves, shipped as one
system because they share the allocation grid and one migration. Caps
flag **`prog3shared`** (display-only; nothing new is sent).

### The grid

Six stats per combat type, in the owner's order, and seven shared ones.
Storage keys stay where a stat already existed (renaming a persisted
field breaks saves, rule 1); the label carries the new name.

| Column | key | label | per point | cap | at cap | consumed by |
|---|---|---|---|---|---|---|
| lane | `range` | Range | +0.5 % reach | 100 | +50 % | client — bow plant cap, staff orb life, melee swing envelope + reach ring |
| lane | `dmg` | Power | +0.5 damage pre-tier | 75 | +37.5 | server roll (unchanged) |
| lane | `aspd` | Speed | −0.35 % swing period | 100 | −35 % | client cadence (unchanged) |
| lane | `luck` | Luck | +0.3 % crit chance **and** +1 % crit damage (`per` / `dmgPer`), 1 % base | 100 | 31 % / ×2.5 | server roll + ceiling |
| lane | `special` | Special | +1 % special-attack damage | 75 | +75 % | server roll + ceiling; client `specialAtkMultFor(type, rpg)` |
| lane | `elem` | Elemental | +1 elemental power | 75 | 75 | unchanged |
| shared | `hp` `def` `mana` `stam` `dodge` `eres` | | unchanged | | | |
| shared | `move` | Move Speed | +0.4 % walk speed | 75 | +30 % | client — `BroTown.jsx` × `prog3MoveMult`; server widens the anti-teleport bound by the same multiplier from its own copy (`movement.js`) |

`crit` + `critDmg` **fold into `luck`**, landing on the same two
endpoints the pair had (31 % chance at cap, ×2.5 crit damage at cap) so
a point buys a little of both and a crit-damage-only build that never
crits is no longer possible. `range` replaces the legacy per-weapon
Longshot channel prog3 characters never had; its semantics are the
same (the arrow flies farther *and* faster — `projectiles.js` reads
`_rangeMult` for both) and the 675 × 2.0 envelope that path was tested
to is wider than the stat reaches.

**Server bounds, checked rather than assumed.** The PvE melee proximity
gate is 400 px against a maxed outer reach of 72 × 1.5 + body; the staff
and bow have no PvE proximity gate at all; PvP `RANGE_CAP` clamps the
client's claim (675 × 1.5 = 1012 > 950 clamps, not rejects). The move
bound is `500 × spdCap × moveMult × dt + 80`, with `moveMult` read from
the server's allocation, so a maxed stat keeps the headroom the 500 was
sized with (the fastest legitimate stack ≈ 358 px/s against 650, or 975
under a Swift Draught). `prog3.test.mjs` pins the arithmetic against the
CLIENT's constants and drives `_handleMove` with and without the stat.

**Anticheat lockstep.** `_maxDmgForAttacker` takes `critMult = 1.5 +
max-lane luck × dmgPer` and `specialMult = 3.0 × (1 + max-lane special ×
per)`; `_computeAttackDamage` applies `_prog3SpecialMult` before the crit
branch so a special crit anchors off the scaled value. Roll, ceiling and
client display move in the same commit (the v2.3.1451 rule); the 2 400-
roll sample in `prog3.test.mjs` §6 runs with luck, special, range and
dmg all at cap.

### The second pool

*"For every point earned through one of the 3 combat channels, you earn
one 'shared' point too. You get both points but only the point earned in
the combat channel can be spent there (the point for shared can be
allocated to any in that shared pool)."*

- `PROG3.SHARED_POINTS_PER_LEVEL = 3` — one per lane point, minted by
  `_prog3AwardXp` into `prog3.shared` beside the `poolBy` stamp.
- **A lane point can no longer buy a shared stat.** This retires the
  v2.3.2176 rule; `_handleProg3Allocate` ignores the `cat` an old
  client still sends on a body spend and takes the point off `shared`.
  A shared point cannot buy offense. The unchannelled remainder
  (`pool − Σ poolBy`, points that predate v2.3.2176) stays spendable
  anywhere, and the milestone bonus points keep minting into it.
- `prog3.spl` stamps the rate the blob was granted at (the `ppl`
  pattern) so the retro grant is idempotent; the sanitizer preserves
  it, bounds `shared` at 999 (legitimate max 891), and runs the grant as
  a boundary heal.
- Supply vs sinks: 891 shared points against 625 shared sinks, so every
  shared stat *can* be maxed by roughly character level 220; the lane
  pools stay sharp (297 points against 525 sinks per lane). If live play
  wants shared choices sharper, `SHARED_POINTS_PER_LEVEL` is the dial.

### Migration v17 — `prog3-luck-and-shared-points`

`RPG_SCHEMA_VERSION` 16 → 17. Two folds, both idempotent, both re-run
at the join boundary (`_sanitizeProg3`) because migrations fail open:

- `prog3FoldLuck` — placed `crit` and `critDmg` points are **refunded
  into the lane that held them** (`pool` *and* `poolBy[cat]`, so the
  parts-≤-whole invariant holds by construction), bounded per stat by
  the caps the retired pair had (75 / 100) so a hand-edited blob cannot
  mint points on its way out. Refund, never copy, never guess — the
  v11/v15 precedent, and stricter: these points were already per-lane.
  `prog3SplitAtk` (v11) walks the two retired keys too, so a v10-shaped
  fail-open blob healed today does not lose them.
- `prog3GrantSharedPoints` — every character receives
  `SHARED_POINTS_PER_LEVEL × (level − 1)` per skill, exactly what a fresh
  character reaching the same levels mints. Body points already placed
  with lane points **stay placed**: nothing recorded which lane paid, and
  taking them back would read as theft. A veteran therefore comes out
  slightly ahead of a fresh character, by the body points they bought
  under the old rule — the v10 defense-carry posture, chosen over any
  option that strands or claws back earned points.

### Wire

- caps: `prog3shared: true` (join.js). Display-only.
- `prog3_allocate { stat, cat }` — unchanged shape; `luck` / `range` /
  `special` / `move` flow through the same `prog3StatDef` whitelist, and
  `crit` / `critDmg` are refused by it.
- `prog3_level { …, shared }` and `prog3_allocated { …, shared }` — the
  shared pool rides both (extra fields on PRIVILEGED events; an old
  client ignores them).
- `player_state.prog3` carries `{ sk, alloc, atk, pool, poolBy, shared,
  ms, ppl, spl }`.
- `player_projectile` (client relay) gains an additive `life` so a peer
  mirrors the caster's longer flight; absent → the type's own life.

### The client

`src/data/prog3.js` mirrors the tables and keeps the retired pair in
`PROG3_LEGACY_ATK` for old-worker prediction only (the `prog3CritFlat`
posture): against a worker without the cap the crit readouts and DPS
math predict that worker's `crit` / `critDmg` roll, the reach / special
/ move multipliers read 1, the retired rows draw and the new ones hide,
and the Shared column spends the lane total that worker still lets a
body spend draw on (`prog3PoolShared`). `unspentPointsTotal` is
`pool + shared`.

**The Points screen** (`HeroExpanded.jsx`, portrait): four columns —
MELEE | MAGIC | BOW | SHARED — under a sticky header row. Each header is
`role=button` `[data-prog3-lane]` with the `, level N` aria-label, the
points badge absolutely placed left of a centred icon (hidden at 0,
never absent) and the label under it; the Shared header wears the
character's portrait (`portraitStore`). Cells are the unchanged
v2.3.2441 quarter-width recipe (`N of M` aria-label, `[data-stat-info]`,
`[data-pt-orb]`), each bound to its column's lane; POWER prints that
lane's own weapon range. Landscape keeps the stacked accordion with
SHARED as a fourth lane.

### The columns are a horizontal accordion (v2.3.2593)

Owner: *"I do want the columns to close accordion style (opening and
closing horizontally) ... the default view should also to have them all
closed."*

**One weapon at a time, plus Shared** (v2.3.2594). Owner: *"You can only
have one combat skill open at a time but you can have one combat skill
and the shared column open at the same time."* The three weapons are a
radio group; Shared is an independent toggle. That is the pairing the
screen is for — the question in hand is "this weapon, or my character?",
and those are the two things that need to be side by side to answer it.
Two weapons at once is a comparison nobody makes with a point to spend,
and it costs both of them the width that makes their stats readable.

`openCols` is a LIST of open keys rather than `openWeapon` + `sharedOpen`,
because every reader asks the same question of every column — "are you
open" — and splitting it would make Shared answer differently from the
other three at every one of those sites. The rule itself is
`openColsWith`, a pure function outside the component, because two entry
points obey it (a header tap and a deep link from the dashboard's combat
pills) and a rule with two implementations holds on one of them. It
starts empty; `laneClosed` (the landscape accordion) starts `true` for
the same instruction.

Width comes from one helper both rows read, or the headers and the cells
would stop lining up the moment either was retuned. Three shapes only:

| State | Closed | Open (390px body) |
|---|---|---|
| all shut | 4 × 92 (equal share) | — |
| 1 open | 3 × 58 | 192 |
| weapon + Shared | 2 × 58 | 125 each |

**58px is the floor the owner's own header layout sets**: badge 19 + gap
2 + icon 22, plus padding. Anything narrower and the points stop sitting
to the LEFT of the icon, which is the one thing he specified about it.
An open column never goes below 90px (the pair at 320), and the cells
have been measured down to 74, so a cell never renders narrower than it
has been checked at. The change animates over 140ms,
the system's `fast` step, because the width IS the gesture.

A closed column keeps its box and its `[data-prog3-col]` handle and
simply holds nothing — which is what makes the width animate instead of
cells jumping between columns.

**The header's tap is the toggle**, so the skill explainer moved to an
ℹ️ the header draws only while open (a 58px strip already carries a
badge, an icon and a name; a fourth thing in it would be the 13px glyph
the thumb-target floor forbids). It is absolutely positioned in the
corner so the middle of the header always toggles — the v2.3.2441
lesson, where an inline info button beside the centre silently ate the
tap. `aria-expanded` and `aria-controls` ride the header.

With everything shut the section shows one 11px line, *"Tap a column to
spend its points."*, in place of the scroll chevron: four strips and
nothing else would read as a broken screen, and there is nothing to
scroll.

**Harness:** `H.openPointCols(P, keys?)` (harness.mjs) opens columns
with a real CDP touch carrying 16px of drift — the header sits in the
sheet's scroller, which claims a touch that travels ~15px and fires
`pointercancel` instead of `pointerup`, so a dispatched PointerEvent
stayed green through two rounds of a collapse bug it claimed to pin
(v2.3.2326, TRAPS §67). It also resets the scroller to 0 first: the
header row is sticky, so `scrollIntoView` on it is a no-op and leaves the
caller's scroll position, and deep in a scrolled panel the stuck row can
sit under the section tabs where `elementFromPoint` answers something
else. Measured — `mp-statgrid`'s spend section asked for one column and
got a different one back, because the centre-of-cell sweep before it had
scrolled to the last cell. Six scenarios call it; it is idempotent,
logs a refused tap, and returns what actually ended up open, so a caller
guards on a real answer.

`mp-statgrid` owns the accordion itself: the resting state, open widens
while the others narrow, close again, a second weapon replacing the
first, Shared surviving a weapon switch underneath it, and 13 as the most
cells that can ever be on screen. `mp-statcols` measures the closed strip
at 390/375/320 — the narrowest thing on the screen, and the state a
player now lands on every time.

**Known, pre-existing, and NOT from this work:** `mp-freshpoints` and
`mp-infopop` cannot find the dashboard's three combat cards
(`[role="button"][aria-label*="level"]` filtered to `^(Melee|Bow|Magic)
level`) and fail 12 assertions between them. Verified identical on
`origin/main` in a clean worktree before this branch was written, so it
is a stale selector or a retired card, not a regression here. Left for
its own change rather than folded into this one.
The ℹ️ window prints two rows for Luck (crit chance, crit damage) and
says "reach, not damage" / "special attacks only" / "movement, not
damage" instead of "does not change damage" for the stats whose job is
not sustained DPS (`dpsNote` on the row metadata). `StatDemo` gains
`luck` and `special` scenes; `range` and `move` open with no scene.
