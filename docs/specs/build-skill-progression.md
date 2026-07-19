# Build-Skill Progression (combat level = T2 points placed)

**Status:** Phase 1 shipped (v2.3.910).  The wired-channel slice shipped
v2.3.1133–1138: ALL built grid channels are live (weapon 15/15, defense
5/5 — see docs/BALANCE-PLAN.md §4 for shipped per-point values), and
**Defense now counts toward combat level** (client `recalcDerived` +
server `_recomputeMaxes`).  Still pending: dedicated HP/Endurance skills
with their own 5-category grids (Phases 2/4 below).  Prototype — no live
players, so there is no save migration or backwards-compat layer.

## v2.3.1342 — LEVEL IS BUILD (supersedes the level formula below)

Owner directive 2026-07-16 ("I want each level up to feel powerful…
each time you earn a tier 2 level it should raise your combat level",
max level 1000):

- **Combat level = min(1000, 1 + total T2 points PLACED across all six
  grids)** — `LEVEL_CAP` 500 → 1000 ≈ `COMBAT_BUILD_CEILING`, so max
  level IS a finished build and **every point spent is exactly +1
  combat level**.  The `1 +`: fresh characters are level 1 (RPG
  floor), and the FIRST spend must level like every other — plain
  `max(1, total)` made point #1 a 1 → 1 dud (caught by the QA rig);
  the cap instead lands on point #1000, when the level is already
  maxed.  One summation both sides: `combatBuildTotal` (client,
  gameSystems.js) / `computeBuildTotal` (server, migrations.js —
  shared by `_recomputeMaxes` and migration v8 `level-is-build`).
  Skill LEVELS still gate earning (2 pts/level, 200/skill) but no
  longer feed the level number.
- **Deploy-order gate `caps.t2simple`:** the client keeps the legacy
  stat-sum formula until the worker advertises the flag — the worker's
  `player_state.level` echo is verbatim-authoritative, and two live
  formulas would flicker.  Same pattern as `hpEndGrids`
  (`setT2SimpleEnabled` / `isT2SimpleEnabled`).
- **Spend = level-up moment.** The celebration body is extracted to
  `src/game/levelCelebration.js` (`celebrateLevelUps(S, R, opts)`),
  called from the three kill paths (full burst) AND
  `SpendPointConfirm.onConfirm` (`opts.light`: banner + chime, no
  shake/particles under the sheet).  Banner overlay z-index 22 → 70
  (above the dash sheet, pointer-events none); `_lastShownLevel` is
  clamped DOWNWARD at boot and in the helper because level-is-build can
  lower an old save's level.
- **trainDefense ±5 valid-threat gate removed** (client gameSystems) —
  with level racing to 1000, the gate would permanently freeze defense
  training after the first few dozen points.
- **Canonical-pool fix:** `computeCanonicalPools` was missing
  `laststand` in the HP spent-key list since the channel shipped —
  Last Stand spends were refunded as free points.  Fixed and pinned by
  a migrations.test regression.
- Tests: protocol-v2 (derivation + 1000 cap + skill-level inertness),
  grids (spend = +1 level + refill; stat bump = flat), migrations (v8),
  anticheat (bootstrap cap 1000), persistence (reconnect re-derive).

## The model
The six combat identities are **build skills**, each leveled by *use*, each
level granting **+1 combat level** and (for the weapon/defense skills) **1
Tier-2 category point**. The old generic Tier-2 techniques (Ferocity, …) are
retired; advantages are chosen per category, not granted automatically.

| Build skill | Internal key | Levels by |
|---|---|---|
| ⚔️ Melee | `power` | dealing melee damage |
| 🏹 Bow | `agility` | dealing bow damage |
| ✨ Magic | `mind` | dealing magic damage |
| ❤️ HP | `vitality` | taking unblocked hits |
| 🌀 Endurance | `endurance` | spending stamina |
| 🛡️ Defense | `defenseSkill` | blocking / mitigating |

**Combat level = clamp(Σ of the build-skill levels, 1, 500).** Weapons are pure
offense; mobility (move speed, dodge) lives under Endurance; mana is a flat
per-combat-level resource (every weapon's specials cost mana).

## Phase 1 — structural core (DONE, v2.3.910)
Implemented now; later phases wire the categories and the two dedicated skills.

- **Combat level is derived** = `power+vitality+endurance+agility+mind`, clamped
  to `LEVEL_CAP = 500`. Computed in `recalcDerived` (client,
  `src/data/gameSystems.js`) and `_recomputeMaxes` (server, `server/src/index.js`).
  Defense's contribution joins once the server tracks `defenseSkill` (Phase 2).
- **5-build-point gate retired.** The three client on-kill loops
  (`groundLoot.js`, `projectiles.js`, `monsterCombat.js`) no longer increment
  level; they fire the celebratory level-up VFX/refill once per newly-reached
  level via `rpg._lastShownLevel`. The server's `_tryLevelUpFromBuildPoints`
  gate is no longer called (`_handleBuildPointEarned` just recomputes).
- **Training cost re-keyed** to the stat's *own* level
  (`combatHelpers.js addBuildProg`: `xpRequired(R[stat])`) so specializing costs
  progressively more than spreading, and so leveling doesn't stall now that
  combat level is large.
- **Flat HP retune:** per-combat-level HP `12 → 2.5` (`HP_PER_COMBAT_LEVEL`,
  mirrored in server `_calcMaxHp`) — keeps total HP in the pre-change ballpark
  since combat level now climbs ~5×.
- **1 point per build-skill level** (`WEAPON_PTS_PER_LEVEL 5 → 1`;
  `DEFENSE_PTS_PER_LEVEL` inherits it).
- **Relabel only** (no key rename): `STAT_LABELS` and `WEAPON_CATEGORY_META`
  show Melee/Bow/Magic/HP/Endurance/Defense.

## Known follow-ups (later phases)
- **Two dedicated skills** `hpSkill` / `enduranceSkill` with their own 5
  categories; move Vitality/Endurance/Agility-dodge/move-speed effects into them.
- ~~**Wire the "Soon" categories"**~~ — DONE v2.3.1133–1137 (crit-dmg,
  atk-speed, cleave, AoE, status, pierce, range, thorns, second-wind, poise).
- ~~**Defense → combat level**~~ — DONE v2.3.1138 (client + server sums
  include `defenseSkill.level`; clamped [0,99], known-loose trust class).
- **`GEAR_STAT_REQ` mismatch:** `sword` is keyed to `agility`, so after the
  relabel a sword's forge requirement reads "Bow". Pre-existing; align to the
  build-skill identity when categories are wired.
- `_statCap(level)=level*10+20` is now very loose at level 500 (safe, but a known
  client-trusted-stat hole); tighten when stats move fully into categories.

## The 6×5 category grid (target, for Phases 2–3)
Offense — all five raise/deal damage:
- **Melee:** Sharpened Edge (base) · Precision (crit) · Executioner (crit dmg) ·
  Tempo (atk speed) · Cleave.
- **Bow:** Draw Power · Marksmanship (crit) · Headshot (crit dmg) · Piercing ·
  Longshot.
- **Magic:** Spell Power · Overload (crit) · Arcane Focus (crit dmg) ·
  Detonation (AoE) · Attunement (status).

Survivability / utility:
- **HP:** Vigor (+max HP) · Second Wind (post-hit heal) · Recovery (regen) ·
  Lifeblood (on-kill heal) · Resilience (−crit/element taken).
- **Endurance:** Stamina · Conditioning (regen) · Swiftness (move speed) ·
  Evasion (dodge %) · Reflexes (dodge i-frames).
- **Defense:** Bulwark (block %) · Iron Skin (−dmg taken) · Thorns · Toughness
  (armor scaling) · Poise.
