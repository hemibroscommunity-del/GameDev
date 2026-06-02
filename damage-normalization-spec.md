# Spec: Baseline-10 Damage / HP Normalization (server-side)

**For the `brotown-server` session.** This is a coordinated change with the client
repo (`GameDev`); the client mirror is described at the bottom and is being done in
lockstep. Both must deploy together or the UI desyncs from authoritative damage.

## Objective

Re-express the combat **offense axis** so the **starting greatsword deals ~10 per
hit** at level 1, instead of ~48. Every other weapon and all monster HP scale down
by the **same factor** so the game plays **byte-for-byte identically** (same
hits-to-kill, same TTK). This is a *units change for readability*, not a balance
change — it gives players a clean mental anchor ("I started doing 10, now I do N").

**Greatsword is the anchor and stays the hardest-hitting weapon.** The other types
keep their relative spread.

## The one rule

> Divide every **absolute player-damage value** and every **monster HP value** by
> **`k = 4.8`** (= 48 / 10). Leave **all multipliers, all percentages, monster
> attack damage, XP, gold, and player HP untouched.**

Because player damage and monster HP both divide by the same `k`, the ratio
(= hits-to-kill) is unchanged. Verified: continuous hits-to-kill are identical; the
only side effect is up to ~2.6% drift from integer `ceil()` once HP gets small.

## Exact constant changes

These are the values confirmed in the client mirror; the server should hold the
analogous constants. Apply `÷4.8`:

| Constant | Current | New (`÷4.8`) | Notes |
|---|---|---|---|
| Weapon base — **greatsword** | 48 | **10.0** | the anchor |
| Weapon base — **staff** | 41 | **8.54** | keep 2dp to preserve order |
| Weapon base — **bow** | 35 | **7.29** | |
| Weapon base — **sword** | 32 | **6.67** | |
| Stat→damage coefficient (in the weapon-damage formula `(base + stat × COEFF) × tierMult`) | 0.8 | **0.1667** | **critical** — if you skip this, Power dominates and the "10" anchor only holds at L1 |
| Special-attack stat coefficient (the Mind `× 0.8` in the special-damage formula) | 0.8 | **0.1667** | same formula, second copy |
| Monster HP base (`monsterStat(60, …)` for HP) | 60 | **12.5** | HP only — NOT the damage line |
| Hardness flat bonus, **if present** (`HARDNESS_BASE_BONUS`) | 5 | **1.0417** | flat add to weapon base; rescale so hardness stays proportional |

Order is preserved: greatsword 10 > staff 8.54 > bow 7.29 > sword 6.67. (Whole
numbers are fine if you prefer, e.g. 10 / 8 / 7 / 6 — but that shifts ratios a hair
and slightly compresses the spread; 2dp keeps the no-op exact.)

## Also divide by 4.8 — any OTHER absolute player→monster damage

Search the server for absolute damage numbers on the **player-dealing-damage** path
and divide each by 4.8. Likely suspects (rescale if they are absolute/flat; leave if
they are a multiplier of weapon damage):

- Collision / elemental-collision damage that is a flat base (not `× weaponDmg`)
- Gem / status DoT tick damage, if expressed as flat numbers
- Player thorns damage dealt to monsters, if flat
- Any hardcoded fallback damage on the player attack path (e.g. `dmg || 10`
  defaults used when computing a player hit)

## Do NOT touch (leave exactly as-is)

- **Monster attack damage** — `monsterStat(12, …)` and the archetype `dmgMult`. (Per
  design: the survival axis stays in current units.)
- **Player max HP** (base 100 + level/vit coeffs) — pairs with monster damage, untouched.
- **Material tier multiplier table** (T1 1.0 → T20 ~7.84) — it's a multiplier.
- **Quality / rarity multipliers** (Common 1.0 / Elemental 1.5 / Fusion 2.25 / Shift 3.0).
- **Crit chance & crit multiplier, block, dodge, move speed** — all formulas unchanged.
- **Per-weapon variance rolls** (staff 0.5–1.5, bow 0.6–0.8, melee 0.75–1.25) — multipliers.
- **Volatile weapon bonus** (`dmg × 1.30`) — a multiplier, unchanged.
- **XP base (10) and Gold base (5)** scaling.

## Coupling watch-list (the easy-to-miss ones)

1. **Volatile monster death explosion** ("30% of monster maxHP" dealt to the player).
   This crosses axes: monster maxHP just shrank 4.8×, so this would deal 4.8× *less*
   to the player — which we do NOT want (monster→player damage must stay constant).
   **Fix:** multiply that percentage by 4.8 (30% → 144% of the new maxHP), or
   re-express it against the un-rescaled HP, so the absolute damage to the player is
   unchanged. Same treatment for **any** "% of monster maxHP → player" effect.
2. **Any "% of monster maxHP" that heals/feeds the player** — re-check; if it should
   stay constant in absolute terms, multiply its coefficient by 4.8.
3. **Execute / low-HP-threshold effects** ("kill if monster < X% HP") — percentage
   based, so they're fine; just confirm they're `%`, not a flat HP cutoff.

## Verification (do before shipping)

For 3–4 sample levels (e.g. 15 / 35 / 65 / 100) and a couple of archetypes
(Fodder, Brute), compute **player hits-to-kill before vs after**. They must match
within ~3% (the ceil-rounding tolerance). If any row moves more than that, an
absolute constant was missed or a multiplier was rescaled by mistake.

The client repo has `tools/audit-validator.py` which proves the core
weapon-vs-HP no-op (`python tools/audit-validator.py --weapon-base 48 --scale 4.8`
→ "continuous hits-to-kill identical: YES"). Mirror that check on the server's real
numbers.

## Client-mirror coordination (handled in the `GameDev` repo)

The client mirrors these for prediction + the UI damage readout and will be changed
to the **same** values in lockstep:

- `src/data/gameSystems.js` → `WEAPON_TYPES` base values (48/32/35/41 → 10/8.54/7.29/6.67)
- `src/data/gameSystems.js` → the two `× 0.8` in `calcWeaponDmg` and `calcSpecialDmg` → `× 0.1667`
- `src/data/gameSystems.js` → `createMonster`'s `monsterStat(60, …)` HP line → `monsterStat(12.5, …)`
- any client-authoritative monster variants that hardcode HP

**Deploy both repos together.** If only one side ships, the displayed DMG and the
authoritative DMG disagree (tooltip says 10, server resolves 48, or vice versa).

## Note on existing drift (FYI, not part of this change)

The live monster HP base is **60** in code, while the GDD §6.1 says **40**, and the
§6.5 audit gates were written against a "reference" weapon base of **35** (real
greatsword is **48**). So the documented audit gates already don't match the live
numbers. Not touching the GDD per current direction — just flagging that the
authoritative numbers are the code's, not the doc's.
