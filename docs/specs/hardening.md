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
| Rare | ×1.20 | 9% |
| Elite | ×1.50 | 0.9% |
| Godly | ×3.00 | 1 in 400,000 |

Rolled ONCE at server mint, immutable. **v1 rolls at the forge only**
(the sole server-side weapon mint). Monster weapon drops are still
client-minted (`monsterCombat.js:2275` etc.) and are **stripped** of
quality/hardness/temper on join ingest — a forged godly would raise
its owner's own anti-cheat damage ceiling. Drop-time quality ships
with the server-side weapon-drop migration (successor item below).

## Hardening (§4.6c)

| From → To | Success | Cost |
|---|---|---|
| H0→1 | 80% | 500g |
| H1→2 | 20% | 2,000g |
| H2→3 | 5% | 8,000g |
| H3→4 | 1% | 32,000g |
| H4→5 | 0.5% | 128,000g |

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

## Wire surface

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→s | `harden_weapon` | `{slot: weapon\|rangedWeapon\|staffWeapon}` | Explicit case. |
| s→c | `harden_result` | `{success, slot, cost, hardness, temper, odds}` or `{success:false, error, message}` | Private. Errors: `not-now`, `bad-slot`, `no-weapon`, `maxed`, `skill-gate`, `no-gold`. Weapon state rides the authoritative player_state echo. |

`harden_result` is in `PRIVILEGED_EVENTS`. Capability:
`state_sync.caps.harden` gates the new panel sections.

## Storage / ledgers

| Key | Value |
|---|---|
| `harden_ledger:<pid>` | last 50 attempts `{ts, slot, type, from, to, success, cost, temper}` (§17.5) |
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

- **Drop-time quality** requires moving monster weapon drops
  server-side (they're 100% client-minted today) — then
  `_rollWeaponQuality` applies at the drop mint and the strict-strip
  posture for join blobs stays unchanged.
- **Mystery reveals (§4.6b.ii)**: server pre-commits the grade at
  drop, client renders "?" until reveal — needs the drop migration
  first.
- **Sell value deliberately unchanged**: `_weaponSellValue` ignores
  quality/hardness (no forge-lottery → vendor arbitrage). Revisit
  with marketplace pricing if elite listings need price floors.
- Stash-row quality badges + quality border art (Gold/Notched,
  Prismatic/Radiant per GDD §4.6b) are cosmetic follow-ups.
