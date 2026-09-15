# Damage-scale design note — "make the smallest hit a 1"

**v2.3.2484. DESIGN NOTE ONLY — no code changes ship with it.** Written for
the owner to make decision **D1** (and **D2**) in
`docs/BACKLOG-TRIAGE-2026-09-14.md` §0.4. Everything below is measured
against `main` at v2.3.2470 using the game's own shipped formulas, not
re-typed copies of them.

Tools used, and how to re-run them:

```
node tools/balance-sim.mjs --level 1          # DPS / TTK from the live client formulas
python3 tools/audit-validator.py --scale 5    # its own ÷k rescale check
node server/test/prog3.test.mjs               # the pins this would move
```

Two of the numbers this note needed are not in either tool, so they were
computed by driving the **real server roll** (`GameRoom._computeAttackDamage`)
and the **real monster-HP curve** (`MONSTER_HP_CURVE` + `ARCHETYPES.hpMult`)
directly. Those scripts are reproduced in Appendix A so the owner (or the next
session) can re-run them without trusting this note's arithmetic.

---

## 0. The short version

- **The ask is achievable and it is cheaper than the triage feared.** A plain
  "divide every absolute damage and HP number by 5, round each roll to an
  integer with a floor of 1" preserves hits-to-kill to within **−5.3% at
  worst** and **−1.5% on average** across every weapon, every archetype and
  every level from 1 to 100. It does *not* need a hand-authored integer HP
  table per archetype. (§2)
- **What you actually pay is GRANULARITY, not balance.** At level 1 a sword
  hit becomes a number between **1 and 4** where it is 6–20 today. At level
  100 it is 24–78. The staff keeps the widest spread at every level, which is
  its identity. (§3)
- **The dangerous part is not the damage constants — it is the five things
  that are priced off them** and that do not move on their own: XP per damage
  point, weapon sell value, the anticheat floor, the banked `ps.t2Flat`
  numbers already inside players' saves, and the leaderboard's lifetime
  damage totals. Each needs an explicit decision. (§5)
- **Recommendation: take D1 as true integer combat at k = 5, and D2 yes**
  (rescale the survival axis with it) — but ship it as **one lockstep PR with
  a shrink migration**, after this note is approved, and expect it to be the
  largest single-commit diff in the repo's history: ~85 constants in 14 files
  plus their client mirrors.

---

## 1. Where the numbers are today

`k` is the divisor. Every constant below is an **absolute** damage or HP
quantity — multipliers, percentages and millisecond timings do **not** move,
and neither do pixel radii.

### 1.1 The weapon bases (the thing the ask is really about)

`server/src/gear.js` (authoritative) and its client mirror
`src/data/gameSystems.js` `WEAPON_TYPES`:

| Weapon | Base | Variance band | Lowest level-1 roll |
|---|---|---|---|
| greatsword | 10.00 | 0.75 – 1.25 | 7.50 |
| sword | 6.67 | 0.75 – 1.25 | **5.00** |
| bow | 12.80 | 0.60 – 0.80 | 7.68 |
| staff | 13.44 | 0.50 – 1.65 | 6.72 |
| fists | 6.25 | 0.75 – 1.25 | 4.69 |

**The triage's "probably the bow" is wrong by the code.** The lowest roll
belongs to the **sword** at 5.0 (bow and staff were re-based in v2.3.2259;
`docs/BALANCE-PLAN.md` §1 still prints the old 7.29 / 8.54 and is stale).
`6.67 × 0.75 = 5.0`, so **k = 5** is the divisor that makes the smallest
weapon roll in the game land on exactly 1.

Bare fists roll below that (4.69 → 0.94 → floors to 1), which is fine: the
floor is already `Math.max(1, …)` and punching should be the one thing that
always reads as the minimum.

### 1.2 The inventory — ~85 absolute constants in 14 files

Grouped by what they are, because the groups take different decisions. Full
line-level citations are in
`docs/triage-2026-09-14/combat-numbers.md` §Q1.

| Group | Where | Count | Moves? |
|---|---|---|---|
| Weapon bases + fists fallback | `gear.js`, `combat.js` (a duplicate), `gameSystems.js` | 6 | **yes** |
| Per-level damage | `PROG3.DMG_PER_LEVEL` 1.5/1.5/1.8 (both sides) | 6 | **yes** |
| Allocated flat damage | `PROG3.ATK.dmg.per` 0.5 (both sides) | 2 | **yes** |
| Player HP | maxHp base 100, `HP_PER_LEVEL` 6, `BODY.hp.per` 8, legacy `calcMaxHp` 2.5/10 (both sides) | 8 | **only under D2** |
| Monster HP curve | `MONSTER_HP_CURVE {base 12.5, flat 100, flatLow 50}` (both sides) | 6 | **yes** |
| Monster attack curve | `monsterStat(12, …)` at three call sites | 3 | **only under D2** |
| Elemental DoT | burn `5 + P×0.3`, root `3 + P×0.15`, thorn `4 + P×0.25` (both sides) | 6 | **yes** |
| Collision table bases | `COLLISION_TABLE` 20…120 (both sides) | ~45 | **yes** |
| Slime burst / fire trail | `SLIME_BURST.DMG 60`, `FIRE_TRAIL.DMG 6` | 2 | **yes** |
| Hardening | `HARDEN.BASE_BONUS 1.0417` (a flat ADD to base, despite the name) | 2 | **yes** |
| PvP | `dmgBase` default 10 | 1 | **yes** |
| Anticheat | `_maxDmgForAttacker` floor **21**, fists 6.25 in `_maxWeaponDmg` | 2 | **yes — see §5.3** |
| Heals | cooking `92 + tier×8`, `cookedMinnow` 23 | 2 | **only under D2** |
| Legacy T2 | `T2_UNITS` flats + **banked `ps.t2Flat` inside saved blobs** | ~8 + data | **yes — needs a migration** |

Everything else that *looks* like a damage number is a multiplier or a
percentage and is invariant under the rescale: `ARCHETYPES` hp/dmg mults,
`T2_BENCH` (a percentage of a benchmark), telegraph `dmgMult`,
`MAX_HIT_PCT 0.5`, burst ×1.5, ability mults, `COLLISION_BURST_CAP 3.2`,
fracture +6 %/stack, every regen percentage, and all block/stamina costs
(stamina is its own axis and is untouched by a damage rescale).

---

## 2. Does hits-to-kill survive? — measured

The triage's §2.1b says parity "cannot be preserved by division" and needs a
hand-authored integer table. **Measured, that is too pessimistic**, and the
reason is the monster HP curve's big `flat` term (+100, or +50 below level 3):
monster HP is never small enough for integer rounding to bite hard.

Method: 8,000 simulated kills per cell. "now" swings the real server roll at
the real HP. "k=5" divides the HP by 5 (rounded, floor 1) and rounds **each
roll** to an integer with a floor of 1 — i.e. the honest version, not a
divided average.

| Lvl | Weapon | Monster | HP now | hits now | HP k5 | hits k5 | drift |
|---|---|---|---|---|---|---|---|
| 1 | sword | fodder | 58 | 7.47 | 12 | 7.36 | −1.4 % |
| 1 | sword | brute | 70 | 8.92 | 14 | 8.55 | −4.1 % |
| 1 | bow | brute | 70 | 7.32 | 14 | 6.94 | **−5.3 %** |
| 1 | staff | fodder | 58 | 4.00 | 12 | 3.97 | −0.9 % |
| 3 | sword | fodder | 109 | 10.09 | 22 | 9.88 | −2.1 % |
| 10 | greatsword | fodder | 112 | 4.93 | 22 | 4.80 | −2.7 % |
| 20 | staff | brute | 150 | 3.33 | 30 | 3.29 | −1.1 % |
| 50 | sword | fodder | 166 | 2.54 | 33 | 2.45 | −3.4 % |
| 100 | bow | brute | 756 | 6.98 | 151 | 6.96 | −0.2 % |
| 100 | staff | fodder | 363 | 2.29 | 73 | 2.28 | −0.4 % |

Across all 48 cells measured (6 levels × 4 weapons × 2 archetypes): **worst
drift −5.3 %, mean −1.5 %, and every cell is FASTER, never slower.** The bias
is one-directional because `Math.max(1, round(…))` can only ever round a
sub-1 roll *up*.

`tools/audit-validator.py --scale 5` reaches the same conclusion from the
other direction — *"continuous hits-to-kill identical (rescale is a true
no-op): YES; max ceil()-rounding drift once HP is small: 1.6 %"* — though note
that tool works off the **GDD's** constants (greatsword 48, monster base HP
40), which `CLAUDE.md` marks STALE. Its verdict on the *shape* of the change
is sound; its absolute numbers are not the game's.

**Two tooling caveats worth fixing whenever the code PR happens:**

1. `tools/balance-sim.mjs` prints monster HP **without the curve's `flat`
   term** — it shows `fodder(8hp)` at level 1 where the worker spawns **58**.
   Every hits-to-kill figure it prints is therefore far too optimistic. That
   is a pre-existing bug in the sim, not in the game, and it is why this note
   computed its own table.
2. `tools/audit-validator.py` has had a `--scale` mode since before this ask
   and already warns about exactly the rounding cost measured here. It should
   be re-pointed at the live constants.

### 2.1 The proposed integer monster-HP table

Straight `round(HP / 5)`, floor 1, from the live curve. This is the table to
paste into `MONSTER_HP_CURVE` terms (`base 2.5, flat 20, flatLow 10`) rather
than hand-authoring per archetype — the archetype multipliers already produce
these numbers and they stay untouched.

| Lvl | swarm | fodder | stalker | volatile | hexer | sentinel | snowman | brute |
|---|---|---|---|---|---|---|---|---|
| 1 | 11 | 12 | 12 | 12 | 12 | 13 | 13 | 14 |
| 3 | 21 | 22 | 22 | 22 | 23 | 23 | 24 | 24 |
| 10 | 22 | 22 | 23 | 23 | 24 | 24 | 25 | 26 |
| 20 | 23 | 24 | 25 | 25 | 26 | 27 | 29 | 30 |
| 35 | 25 | 28 | 29 | 31 | 32 | 33 | 37 | 40 |
| 50 | 29 | 33 | 35 | 38 | 40 | 42 | 49 | 53 |
| 65 | 35 | 42 | 46 | 50 | 53 | 57 | 68 | 75 |
| 100 | 55 | 73 | 81 | 90 | 99 | 107 | 134 | 151 |

Two things the owner should look at in this table before approving:

- **Levels 3 → 10 are almost flat** (22 → 22 for a fodder). That is not a
  rescale artifact; it is the existing curve, where the `flat +100` dominates
  until the exponential catches up around level 20. It is much more visible
  at this scale, and the owner may want to fix it *while the file is open*.
- **Level 1–2 monsters sit at 11–14 HP.** A level-1 sword hitting for 1–4
  needs 8–9 swings for a brute. That is the current pace (8.9 swings), but it
  will *read* slower because the numbers are small. If that feels wrong, the
  dial is `flatLow` (currently 50 → 10), not `k`.

---

## 3. What the player actually sees

The per-hit number ranges after the rescale, from the same simulation
(min–max over 8,000 rolls, no crits, tier 1, no allocated points):

| Lvl | sword | greatsword | bow | staff |
|---|---|---|---|---|
| 1 | 1 – 4 | 2 – 6 | 2 – 5 | 2 – 10 |
| 3 | 2 – 6 | 2 – 7 | 2 – 6 | 2 – 12 |
| 10 | 3 – 11 | 4 – 13 | 3 – 9 | 3 – 21 |
| 20 | 6 – 18 | 6 – 20 | 5 – 14 | 5 – 33 |
| 50 | 12 – 41 | 13 – 43 | 11 – 28 | 10 – 68 |
| 100 | 24 – 78 | 24 – 80 | 20 – 52 | 19 – 128 |

This is the heart of D1, and it is a taste question, not an engineering one:

- **For it.** Every number on screen is small and legible on a phone. "8 HP
  left, I hit for 3" is arithmetic a player can do. The HP bar and the damage
  numbers finally *add up*, which is the thing the display-only alternative
  can never deliver.
- **Against it.** At level 1 the sword produces 1, 2, 3 or 4 and nothing else
  — four distinct outcomes, so a crit reads as "4" rather than as a spike, and
  the first ten levels lose most of their texture. The staff's 2–10 keeps its
  high-variance identity; the bow's 2–5 barely has one.
- **The mitigation, if the owner wants it:** `k = 4` instead of 5. The sword's
  floor becomes 1.25 (still prints 1), level-1 ranges widen ~25 %, and the
  monster-HP table gets 25 % more room to tune. Everything in §5 is unchanged.
  This note recommends 5 because it is the number that makes the *smallest
  roll in the game* exactly 1, which is the ask as stated.

### 3.1 The alternative: display-only rescaling

Keep the internal scale, divide only what is printed. Exact TTK, one small
client PR, zero migrations, zero anticheat work.

**Why this note does not recommend it:** the HP bar is drawn from a
percentage, not from a number, so "1 + 2 + 1" will not visibly account for the
chunk that disappeared — and the moment a number is shown that is not the
number the server used, every future bug report about damage becomes
untestable. It also does not survive the first player who screenshots two
numbers and adds them.

---

## 4. If D2 says yes — the survival axis

Same `k`, same PR, and it is the *simpler* half:

| What | Now | k = 5 |
|---|---|---|
| Player base max HP | 100 | 20 |
| `HP_PER_LEVEL` | 6 | 1.2 |
| `BODY.hp.per` (per point) | 8 | 1.6 |
| Monster attack curve base | 12 | 2.4 |
| Cooked-fish heal | `92 + tier×8` | `18.4 + tier×1.6` |
| `cookedMinnow` | 23 | 4.6 |
| Slime burst | 60 | 12 |
| Fire trail | 6 | 1.2 |

`HP_PER_LEVEL` at 1.2 means a level-up adds a **visible +1 every level or
two** instead of a +6 that is 6 % of the bar — arguably a better read than
today. But note the `Math.max(1, …)` floor on incoming damage now binds much
harder: a 20 HP player taking a floor-1 chip from a fully-mitigated hit loses
5 % of their bar per hit, where today it is 1 %. **Defense, dodge and the new
elemental resistance all become noticeably weaker in practice**, because the
floor eats the top of their value. If D2 is yes, the floor should move to 0
for mitigated hits (with a separate guard that a *blocked* hit stays 0) — that
is a real design change and belongs in the same PR, not after it.

---

## 5. The couplings — what breaks silently if it is not handled

These are the reason this is a design note and not a patch.

### 5.1 XP is paid per point of damage

`PROG3.XP_PER_DMG = 0.4`, and `prog3.js`'s own comment says it: *"XP is paid
per point of damage DEALT… the two dials are one system."* Killing a monster
with H HP always pays `H × 0.4`. Divide H by 5 and **every player's levelling
rate drops 5×** overnight.

**Fix:** `XP_PER_DMG 0.4 → 2.0`, same commit. Kill XP is then byte-identical.
Verify with `tools/verify-prog3-retune.mjs`, which prints the pacing
checkpoints the v2.3.1727 retune was tuned against.

### 5.2 Weapon sell value is derived from the weapon base

`gear.js` `_weaponSellValue` = `ceil(tierMult × base × 0.5)`, and its own
header says *"coins are NOT rescaled"*. Divide the bases and **every weapon in
the game sells for a fifth**, including ones already in players' stashes.

**Fix:** multiply the 0.5 coefficient by `k` (→ 2.5) in the same commit. Pinned
by `server/test/anticheat.test.mjs` (`coins === 27`) — that fixture must move
with it, and if it does *not* move, the rescale was wrong.

### 5.3 The anticheat floor is a flat 21

`_maxDmgForAttacker` returns `Math.max(21, ceil(…))`. At level 1 the live
ceiling is **62** for a normal hit and **184** for a special, so the floor is
not binding today — but after ÷5 the computed ceiling at level 1 is ~12 and
**the 21 floor would become the operative cap, five times looser than the
build it is supposed to bound**. Left alone it is a cheat window; set too low
it rejects legitimate hits.

**Fix:** `21 → 5` (`ceil(21/5) = 5`), same commit, and re-run
`anticheat.test.mjs` §damage which derives its expectations from the function
rather than from a literal. `_maxWeaponDmg`'s fists 6.25 moves with the gear
table by construction. **`_computeAttackDamage`, `_maxWeaponDmg` and
`_maxDmgForAttacker` plus their client mirrors must move in the same commit**
— the lockstep rule from v2.3.1451, enforced by `mirror-audit.test.mjs`.

### 5.4 Banked `ps.t2Flat` is already inside saved blobs

Since v2.3.1451 the legacy T2 channels bank an accumulated **flat** value into
the player's save. A veteran's stored `t2Flat.sword.edge` is on the old scale
and would simply keep paying five times its worth.

**Fix:** migration **v16** (v15 is the attribute restructure) that walks
`ps.t2Flat` and divides every banked flat by `k`. Idempotent via the `_v`
stamp, with the `_sanitizeProg3`-style boundary heal beside it, because
migrations fail open.

### 5.5 Leaderboard and lifetime damage totals

Any stored cumulative damage figure becomes mixed-scale: pre-rescale points
counted five times what post-rescale points do. The Leaderboard DO holds
these.

**Decision needed from the owner** (this note has no recommendation, because
it is about what the numbers *mean* to players): divide the stored totals in
the same migration, or reset the damage leaderboard at the cut, or leave it
mixed and accept that old records are unbeatable.

### 5.6 The pins that will go red, by name

Expect all of these in the same commit; none of them is optional, and a red
one means the sweep missed a file:

`mirror-audit` (§1 ARCHETYPES, §2 `MONSTER_HP_CURVE` exact, `T2_UNITS`,
§12 the PROG3 scalar flatten) · `prog3` (`maxHp = 100 + 3×HP_PER_LEVEL`,
`+8/pt`, the `BAND_TOP` variance copy) · `anticheat` (`coins === 27`, the
damage ceiling) · `display-dps` (a hand-computed fixture) ·
`combat-lifecycle`, `tick`, `dungeon`, `burst`, `potions`, `blockcost`,
`burrow` (all reference HP or heal constants) · `tools/balance-sim.mjs`
(its own copy of the variance bands and `monsterStat(12,…)`) ·
`tools/verify-prog3-retune.mjs` · `mp-orbline` (pins the staff:melee DPS
ratio at 0.74–0.86) · `mp-prog3`, `mp-burst`, `mp-townlock`.

The variance bands are the trap the code itself warns about: **six copies move
together** (`combat.js`, two client rolls, the client's displayed range,
`balance-sim`, and `BAND_TOP` in `prog3.test.mjs`).

---

## 6. Recommended plan

1. **Owner approves D1 (k = 5) and D2 (yes) off this note**, or asks for
   `k = 4`, or picks display-only — §3 is the page to read for that choice.
2. **Fix the two tools first**, in their own small PR: `balance-sim` must add
   the curve's `flat` term, and `audit-validator` must read the live
   constants. Nothing else can be trusted until they agree with the worker.
3. **One lockstep PR** for the rescale: all ~85 constants, both sides, in a
   single commit, with the five couplings in §5 handled in that same commit
   and migration v16 for the banked flats. Its body must show the
   hits-to-kill table before and after, re-measured, for the owner to sign off.
4. **No new feature rides along.** This PR changes only numbers and the
   arithmetic around them. Anything else in the diff is a second PR.

---

## Appendix A — the two scripts this note's tables come from

Both run with plain `node` against the real server modules, no dependencies.
Save under `tools/` if they are wanted permanently; they are reproduced here
so the tables above can be audited rather than believed.

```js
/* A1 — the integer monster-HP table, from the live curve. */
import { MONSTER_HP_CURVE as C, ARCHETYPES, monsterStat } from './server/src/data.js';
const hpAt = (lvl, a) =>
  Math.ceil(monsterStat(C.base, lvl, C.ramp, C.plateau, C.endgame)
    * ((ARCHETYPES[a] && ARCHETYPES[a].hpMult) || 1))
  + (lvl <= C.flatLowMaxLvl ? C.flatLow : C.flat);
for (const l of [1, 3, 10, 20, 35, 50, 65, 100])
  console.log(l, Object.keys(ARCHETYPES).map((a) => `${a}:${hpAt(l, a)} -> ${Math.max(1, Math.round(hpAt(l, a) / 5))}`).join(' '));
```

```js
/* A2 — hits-to-kill parity, per-roll rounding (the honest version). */
import { GameRoom } from './server/src/index.js';
const room = new GameRoom(
  { storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {} },
  { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });
/* ps = a fresh prog3 player with the weapon under test equipped;
   roll = room._computeAttackDamage(ps, slot, false).dmg
   now  : subtract `roll` from hpAt(lvl, arch) until <= 0, count swings
   k=5  : subtract Math.max(1, Math.round(roll / 5)) from Math.round(hp / 5) */
```
