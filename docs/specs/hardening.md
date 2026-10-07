# Quality Grades + Hardening v1 — v2.3.1131

BALANCE-PLAN §4.6b/§4.6c (the formally adopted specs — the canonical
numbers), shipped server-side. Two loot layers in their §4.4 positions:

```
effective_base = (weapon_base + hardness × 1.0417) × quality_mult
damage         = (effective_base + stat × 0.1667 + channel) × tierMult × …
```

At Hardness 0 / Normal quality this reduces **exactly** to the prior
live formula — `tools/balance-sim.mjs` asserts the equivalence at
startup, and the server/client implementations mirror the sim's
structure (quality/hardness on the RAW weapon base, pre-tierMult).

Server code: `server/src/hardening.js`; `QUALITY_GRADES` in
`server/src/data.js`. Tests: `server/test/hardening.test.mjs`.

## ⚠ Name collision (load-bearing)

The client has a PRE-EXISTING "Harden" — the reforge-affix doubler
that writes `weapon.hardenBonus` (ForgePanel/WoodworkPanel, pure
client stat affixes). **That is a different system.** This one uses
distinct fields (`weapon.hardness` int 0–5, `weapon.temper` int) and
the wire verb `harden_weapon`. Never merge or rename them into each
other.

## Quality (§4.6b)

| Grade | Mult | Rate |
|---|---|---|
| Normal | ×1.00 | 90.1% |
| Rare | ×1.30 | 9% |
| Elite | ×1.75 | 0.9% |
| Godly | ×5.00 | 1 in 2,000,000 |

**v2.3.2664 (owner: "especially differences between normal, rare, elite, and
godly (literally one in millions so make it basically game breaking good)"):**
the grade now multiplies a weapon's **whole hit**, after the tier factor,
instead of only its 10-point base — on the base it faded to +12.5 % for a
godly blade by skill 100 (`data.js weaponQualityMult`, applied by
`_computeAttackDamage` and `_maxWeaponDmg`). `_weaponEffBase` carries hardness
alone. The weapon's tier enters the roll as `tierMult^1.5`
(`weaponTierFactor`, each forge tier ~+18 % instead of ~+11 %). Armour, on its
own whole-step scale (copper 1.0, iron 2.0 — `monster-drops.md` "Two ladders,
one metal"): +7.5 % chest / +5 % legs per tier, a five-tier ladder whose sets
read 44 / 53.1 / 61.5 / 69.1 / 75 %; the grade still multiplies the tier, and
each piece's grade also raises the 75 % ceiling (`QUALITY_GRADES.armorLift`:
rare +2.5, elite +5, godly +10 points — a full set's ceiling is 75 / 80 / 85 /
95 %), so the grades stay apart at the top of the ladder. A godly iron set is
92 %, and the godly grade counts only on a server-minted armour piece (an
unproven godly claim on the legacy lane counts as elite — `monster-drops.md`).
Armour tiers above iron need 5 Defense each (`monster-drops.md`, "The Defense
requirement"). The client mirrors all of it behind `caps.gearq`, predicting the
old math against an older worker. Measured at Melee 8 with an iron greatsword against an
at-level brute: normal 4.6 hits, rare 3.7, elite 2.9, godly 1.15.

Rolled ONCE at server mint, immutable. **v1 rolls at the forge only**
(the sole server-side weapon mint). Monster weapon drops are still
client-minted (`monsterCombat.js:2275` etc.) and are **stripped** of
quality/hardness/temper on join ingest — a forged godly would raise
its owner's own anti-cheat damage ceiling. Drop-time quality ships
with the server-side weapon-drop migration (successor item below).

## Hardening (§4.6c)

| From → To | Success | Cost (v2.3.3139) | Cost before |
|---|---|---|---|
| H0→1 | 80% | 500g + 1 bar | 500g |
| H1→2 | 20% | 1,000g + 2 bars | 2,000g |
| H2→3 | 5% | 2,000g + 3 bars | 8,000g |
| H3→4 | 1% | 4,000g + 4 bars | 32,000g |
| H4→5 | 0.5% | 8,000g + 5 bars | 128,000g |

Every attempt pays, won or lost. Which bars, and the switch back to the old
column: "v2.3.3139: bars, and gold that doubles" below.

- +1.0417 effective base per level (GDD's +5 ÷ 4.8 code scale).
- **Failure resets hardness by the Temper pity band** (evaluated on
  the temper BEFORE this failure): 0–19 → reset to 0 · 20–49 → −2 ·
  50–99 → −1 · 100+ → no reset. Temper +1 per fail, 0 on success.
- **Blacksmith skill gates ACCESS, never odds**: max hardenable
  material tier index = `floor(blacksmithing / 5)` (tier index =
  position in the BLACKSMITH/WOODWORKING tier tables; legacy weapons
  without a `gearBase` rank by tierMult).
- Gold is a pure sink, single mutation on live ps (gamble pattern).
  The guard gear lock (threats.md) blocks hardening — it mutates the
  equipped weapon.

## v2.3.3139: bars, and gold that doubles

The owner: "I think hardening should cost 1 bar per level (hardening lvl 1
cost 1 bar, hardening lvl 2 costs 2 bars, and a doubling gold cost per
level) ... up until lvl 5 (which is almost impossibly hard)", then "I meant
1000 for lvl 2, 2000 for lvl 3, etc".

- **Gold** doubles a level instead of quadrupling: `500 × 2^H` for the
  attempt from H (`HARDEN.COST_FACTOR` 2; the old 4 kept as
  `OLD_COST_FACTOR`). The last attempt is 8,000g, not 128,000g.
- **Bars**: the attempt at H(n) takes n bars (`HARDEN.BARS_PER_LEVEL` 1,
  `hardenBarsFor`), every attempt, won or lost, like the gold. The odds are
  untouched, so H5 stays the 1-in-2.5-million climb.
- **Which bars** (`HARDEN_BAR_BY_TIER`, `hardenBarFor`): by the weapon's
  material tier, the same index the Smithing gate reads
  (`_weaponTierIndex`) -- tiers 1-2 copper, tier 3 iron, tier 4 and up black
  steel. So a copper blade takes copper bars, an iron blade iron and a black
  steel blade black steel; the wood tier takes copper, titanium and beyond
  black steel until their own bars exist; bows and staffs go by their wood's
  tier (pine and softwood copper, hardwood iron, cedar and beyond black
  steel). One rule for everything the ladder hardens, at the Blacksmith or
  the Woodworker. Another metal's bars never count.
- **Order of the checks**: the Smithing gate, then the gold (`no-gold`),
  then the bars (`no-bars`, "Need 3 Iron Bars"), then gold and bars come off
  together and the roll happens -- the single-mutation settle as before. A
  refusal takes nothing.
- **The screens** read the same table (`src/data/hardenCosts.js`, held to the
  worker's by mirror-audit): the Blacksmith's Upgrade tab shows the bar's
  picture with "have / need" beside the gold, and its Harden button is off
  until both are there; the Woodworker's Harden button says "Attempt H2
  (1000G + 2 Copper Bars · 20%)" or what is missing. A failed attempt's
  words over the player say the bars too: "Hardening failed! (-1000G, -2
  Copper Bars) → H0".
- **Kill switch**: `hardenbars: false` in liveflags puts the old ladder back
  (500 × 4^H gold, no bars) and stops advertising `caps.hardenbars`, so the
  screens show that ladder again. Against an older worker (no cap) the
  screens show the old ladder too, which is what it charges.
- Tests: `hardening` suite §8b (the ladder, the bar by tier, refusals before
  the roll, exactly n bars and the gold spent, the ledger, a forged
  `stats_update` cannot pay, the kill switch); mirror-audit "hardening";
  `mp-hardenbars` on a phone.

## Wire surface

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→s | `harden_weapon` | `{slot: weapon\|rangedWeapon\|staffWeapon}` | Explicit case. |
| s→c | `harden_result` | `{success, slot, cost, bar?, bars?, hardness, temper, odds}` or `{success:false, error, message}` | Private. Errors: `not-now`, `bad-slot`, `no-weapon`, `maxed`, `skill-gate`, `no-gold`, `no-bars` (v2.3.3139). `bar`/`bars` (v2.3.3139): the bars the attempt took, absent on the old ladder. Weapon state, gold and the bag ride the authoritative player_state echo. |

`harden_result` is in `PRIVILEGED_EVENTS`. Capability:
`state_sync.caps.harden` gates the new panel sections;
`state_sync.caps.hardenbars` (v2.3.3139) says the worker charges bars and
the doubling ladder.

## Storage / ledgers

| Key | Value |
|---|---|
| `harden_ledger:<pid>` | last 50 attempts `{ts, slot, type, from, to, success, cost, bar?, bars?, temper}` (§17.5; `bar`/`bars` since v2.3.3139) |
| `harden_h5_log` | global H5-mint timestamps, pruned to a 90-day window — **INV-27 monitoring only** (≤10 per 90 days is the health check, never enforcement) |

## Sanitizer contract

`_sanitizeWeapon(w, strict)`:
- default (stored blob, server-held stash, market escrow): CLAMPS —
  quality to the enum (else dropped), hardness to [0,5], temper to
  [0,9999]. The server wrote these; keep them.
- `strict=true` (client-supplied join bootstrap ONLY): STRIPS all
  three fields.

## Client

- `weaponEffBase(rawBase, wpn)` + `QUALITY_MULTS` in gameSystems.js;
  `calcWeaponDmg`/`calcSpecialDmg` accept an optional trailing weapon
  param (identity when absent — untouched call sites are unaffected);
  weapon-passing call sites: projectiles/playerActions/dodge/
  monsterCombat/BroTown/InventoryPanel + the BottomDashboard inline
  duplicate.
- ForgePanel + WoodworkPanel: caps-gated "⚒️ Hardening" sections
  (H level, odds, cost, temper hint) sending `harden_weapon`.
- InventoryPanel active-weapon row shows a text quality badge
  (ELITE ⭐ / GODLY ✨) + `H<n>`.

## Successor notes

- **Drop-time quality — SHIPPED v2.3.1141.** Monster weapon drops are
  server-minted (`_rollWeaponDropForKill`, index.js) riding the loot
  pile with their own claim flag; `_rollWeaponQuality` applies at the
  drop mint; strict-strip for join blobs unchanged. The client mint
  paths remain only as the legacy-worker fallback, gated on
  `!caps.weaponDrops`.
- **Mystery reveals (§4.6b.ii) — SHIPPED v2.3.1141.** The pile
  broadcast (`_serializePile`) carries `hasWeapon`/tier/type/name but
  NEVER quality; the picker's private `loot_credit` carries the full
  blob — that private delivery IS the reveal. Client renders the pile
  label as "name ?" until claimed. Fancier reveal art is a cosmetic
  follow-up.
- **Sell value deliberately unchanged**: `_weaponSellValue` ignores
  quality/hardness (no forge-lottery → vendor arbitrage). Revisit
  with marketplace pricing if elite listings need price floors.
- Stash-row quality badges + quality border art (Gold/Notched,
  Prismatic/Radiant per GDD §4.6b) are cosmetic follow-ups.
