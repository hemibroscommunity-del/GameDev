# T1 / T2 Stat Redesign — Server-Side

**For:** the Cloudflare Worker at `wss://brotown-server.hemibroscommunity.workers.dev`
**Companion client commits:** GameDev `session-2` v2.3.227–v2.3.235 (Phase 1–5).
**Status today:** every mechanic below ships *client-only*. The worker still runs the old `maxHp = 100 + level*12 + vit*10` formula, applies no passive dodge, scales specials off Power, etc. — so server-resolved hits don't honor the new stats. This spec brings the worker in line.

---

## Why

Five client-side changes that the worker needs to mirror so MP combat reflects the new identity each T1 stat carries:

1. **Armor → flat HP** (no damage reduction).
2. **Endurance** lengthens dodge i-frame window + speeds stamina regen + grants full block invuln.
3. **Power** drives crit chance + crit damage. Ferocity (T2) amps additively.
4. **Agility** rolls a passive dodge chance on incoming hits.
5. **Mind** scales every special attack + multiplies mana regen.

Tier 2 also gains an allocation pool the client now spends through a new UI; the worker already grants `+5 unspentT2` per level (per the build-points-gate work), so the pool side is fine — the worker just needs to *trust* the spec values it receives and clamp them at the 99 cap.

---

## What to change in the worker

### 1. `maxHp` formula — fold in armor HP

Old:
```js
maxHp = BASE_HP(100) + (level - 1) * 12 + vitality * 10;
```

New:
```js
const ARMOR_HP_BASE = 20;
function getArmorHp(armor, vitality) {
  if (!armor) return 0;
  const tm = (typeof armor.tierMult === 'number') ? armor.tierMult : 1.0;
  return Math.floor(ARMOR_HP_BASE * tm * (1 + (vitality || 0) * 0.01));
}

maxHp = 100 + (level - 1) * 12 + vitality * 10 + getArmorHp(player.armor, vitality);
```

The client mirrors `getArmorHp` verbatim in `src/data/gameSystems.js:4482`. Source of truth lives there.

Equip / unequip flow: the client already sends `armor` on `stats_update` (and the worker accepts armor swaps via `equip_request`). Make sure the worker validates the `armor.gearBase` against `BLACKSMITH_TIERS` / `WOODWORKING_TIERS` so a cheater can't write `tierMult: 999`. Refer to the equip-stat gate the worker already enforces for weapons / shields.

### 2. `def` is retired

The client used to send `def = endurance * 0.5 + armorTier * 3`. As of v2.3.227 it sends `def: 0` for backward compatibility. The worker can:

- **Drop the field** from its incoming-damage formula (preferred), OR
- **Keep reading it** — it'll just always be 0, no-op.

Either way, monster damage applied to the player should no longer be reduced by `def`. Phase 1 intentionally removes damage reduction in favor of HP scaling.

### 3. Endurance derivatives

#### 3a. Dodge i-frame window

Old: fixed (~200 ms) on dodge roll.
New: scales with Endurance:
```js
dodgeIframesMs = 250 + Math.min(player.endurance || 0, 250);
```
Range: 0.25 s → 0.50 s.

If the worker validates dodge-time on the wire (e.g., to reject "I dodged that attack" claims), accept the same window. The client computes it from `S.rpg.endurance` at the dodge site (`BroTown.jsx:~5333`).

#### 3b. Stamina regen multiplier

```js
staminaRegen *= (1 + endurance * 0.002);
```
Stacks with Restoration's `1 + restoration * 0.001` and the existing amulet `staminaRegen` bonus. Applied multiplicatively in both OOC and combat regen paths.

#### 3c. Full block invuln

While the player's shield is up (`player.shieldEnd > now` and stamina > 0), all incoming player-take-damage events resolve to 0 — no partial reduction. `calcBlockReduction(fortification, shield)` no longer figures into the player's block math.

If the worker tracks block events for analytics, fine — just always treat the dmg as 0 when the shield arc catches the attack. Fortification still serves the partial-block-floor + Thorns + Counter Resonance derivatives on display, but those don't gate "did this hit reduce HP".

### 4. Power-based crit (was Ferocity)

Replace `calcCritChance(fer)` / `calcCritMult(fer)` with two-arg versions:

```js
function calcCritChance(power, ferocity) {
  const pow = power || 0, fer = ferocity || 0;
  const pCrit = 40 * pow / (pow + 200) / 100;     // P100 -> 13.3%
  const fCrit = 30 * fer / (fer + 250) / 100;     // F100 -> 8.6%
  return Math.max(0, Math.min(1, pCrit + fCrit));
}
function calcCritMult(power, ferocity) {
  return 1.5 + (power || 0) * 0.001 + (ferocity || 0) * 0.0008;
}
```

The 8% baseline-floor the client applies before staff scaling (`critChance = Math.max(critChance, 0.08)`) lives client-side in the swing loop; the worker doesn't need to mirror it for outgoing-monster crits unless monsters themselves crit (which they don't, currently).

### 5. Agility passive dodge

On every incoming-damage event resolved server-side, roll a per-hit passive dodge:

```js
function rollPassiveDodge(agility) {
  const pct = Math.min((agility || 0) * 0.0008, 0.30);
  return Math.random() < pct;
}
```

On a successful roll, set `dmg = 0` and emit a hit-event with `kind: 'dodged'` so the client can show the "Dodge!" popup at the player's position. (The client currently rolls its own dodge on client-resolved hits; the server-resolved path needs its own roll otherwise high-Agility builds are still tanking hits in MP.)

Cap is 30% so even pure-Agility builds still eat ~70% of hits.

### 6. Mind specials + mana regen

#### 6a. Special-attack damage source

All `swipe`-type special attacks (any weapon type) should scale on Mind, not the weapon's normal stat:

```js
function calcSpecialDmg(weaponType, rpg, tierMult) {
  const w = WEAPON_TYPES[weaponType];
  if (!w) return 0;
  const mind = (rpg && rpg.mind) || 0;
  const base = (w.base + mind * 0.8) * (tierMult || 1);
  if (weaponType === 'staff') return base * (0.5 + Math.random() * 1.0);
  if (weaponType === 'bow')   return base * (0.6 + Math.random() * 0.2);
  return base * (0.75 + Math.random() * 0.5);
}
```

Multiply by `SPECIAL_ATK_MULT = 2.0` at the application site (same multiplier as normal-swing → special-swing on the client).

Existing `ability_use` handler for `swipe`: replace the current `calcWeaponDmg(weaponType, player, tierMult)` call with `calcSpecialDmg(weaponType, player, tierMult)`. The mana cost (`Math.floor(maxMana / 5)`) is unchanged — already canonical from the v2.3.172 MP-bar work.

#### 6b. Mana regen multiplier

```js
manaRegen *= (1 + mind * 0.001);
```

Stacks multiplicatively with Restoration. Apply to both OOC and combat mana regen paths.

### 7. Tier 2 cap clamp

The client now exposes a per-spec `+` button to spend `unspentT2`. Each click increments `R[spec]` by 1 and decrements the pool. The client caps each spec at 99.

Worker side: when receiving `stats_update`, clamp each T2 spec at 99 server-side (same way you already clamp T1 stats at level × 10 + 20). A cheater could otherwise push `ferocity = 99999` and get insane crit — the clamp is the defense.

```js
const T2_CAP = 99;
player.ferocity         = Math.min(player.ferocity         || 0, T2_CAP);
player.elementalMastery = Math.min(player.elementalMastery || 0, T2_CAP);
player.fortification    = Math.min(player.fortification    || 0, T2_CAP);
player.restoration      = Math.min(player.restoration      || 0, T2_CAP);
player.influence        = Math.min(player.influence        || 0, T2_CAP);
```

The `+5 unspentT2` per level-up is already wired in the worker per the build-points-gate-server spec. Just make sure `unspentT2` also accepts negative deltas (the client decrements it when spending).

---

## Wire-format notes

The client already sends every input the worker needs:

- `armor` (object with `tierMult`, `gearBase`, etc.) — sent in `stats_update` and `player_state` echo.
- `power`, `vitality`, `endurance`, `agility`, `mind` — sent in `stats_update` (raw T1 values).
- `ferocity`, `elementalMastery`, `fortification`, `restoration`, `influence` — sent in `stats_update`.
- `unspentT2` — sent in `stats_update`; the worker should mirror its own canonical value in `player_state`.

No new message types needed for Phase 1–5. If you want a stricter armor-equip flow (no client-trusted `armor` field on `stats_update`), introduce an `equip_armor` request that mirrors the existing `equip_request` shape for weapons.

---

## Verification

1. **Armor → HP.** Spawn into a zone with starter armor equipped. Client expects `maxHp = 120` (Vit 0, wood tier 1.0×). Unequip armor in the popup → server echo should report `maxHp = 100`. Re-equip → 120.
2. **Endurance dodge.** Train Endurance to ~200 by spending stamina. Dodge a fodder slime — invuln window should feel ~440 ms vs. baseline 250 ms.
3. **Block.** Hold block during a boss-charge attack. Damage popup shows `BLOCK`, HP unchanged.
4. **Power crit.** Fresh Power 5 character vs. trained Power 200 character: crit popups should appear ~5% vs. ~20% of swings.
5. **Agility dodge.** Train Agility to ~150. Stand inside a slime swarm. Some hits should show the cyan "Dodge!" popup with no HP loss.
6. **Mind specials.** Equip melee weapon with Mind 0 vs. Mind 200: special-attack damage popup should ~triple at Mind 200.
7. **T2 alloc.** Open More → Specs. Tap `+` on Ferocity 5 times. Refresh page. Worker echo should return `ferocity: 5`, `unspentT2: pool - 5`.

---

## Rollback

If any single sub-change goes sideways:

- **Phase 1 (armor):** set `getArmorHp` to return 0; armor effectively gives no HP. Client still shows the slot UI; tooltip says +0 HP.
- **Phase 2 (Endurance):** drop the multiplier (1.0), drop the dodge-window scaling (stay at 250 ms), drop full-block (return to partial-block via `calcBlockReduction`).
- **Phase 3 (Power crit):** flip `calcCritChance(power, fer)` back to single-arg `(fer)` and ignore Power.
- **Phase 4 (Agility dodge):** make `rollPassiveDodge` always return false.
- **Phase 4 (Mind specials):** swap `calcSpecialDmg` back to `calcWeaponDmg` at the ability-use site.
- **Phase 5 (T2 cap):** keep the clamp; it's free defense even if everything else reverts.

Each phase is independently reversible.

---

## Client-side cleanup once the worker ships

Once the worker mirrors the formulas, the following client shims become dead weight and should come out:

1. `BroTown.jsx:~2247` — the `+ _armorBonus` fold on `player_state` echo (`hp` and `maxHp` overrides).
2. Any future server-echo paths that double-apply armor HP (none today, but watch as new events get added).

The T1 / T2 derivative computations in `gameSystems.js` (`getArmorHp`, `calcCritChance`, `calcSpecialDmg`, `rollPassiveDodge`) should stay — they're shared between SP, single-player dungeons, and the display layer. Only the *MP-echo override* is the shim.

## v2.3.1314 — the HP/Stamina grids go fully live (owner: "remove the SOON designations")

Three previously-inert channels gained real effects (owner-approved designs):

- **Resilience** (HP grid): hits above 20% of max HP are reduced
  0.25%/pt, cap 25% — Iron Skin's scale but spike-selective, so the two
  channels stay distinct.  Server-authoritative in `_applyDamage`;
  `applyResilience` (gameSystems.js) mirrors it on the client-local
  legacy damage paths.
- **Last Stand** (HP grid, 5th category — owner-named via the T2 icon
  sheet): a killing blow leaves the player at exactly 1 HP instead,
  once per internal cooldown (120s base, −0.5s/pt, floor 70s).  Fires
  in `_applyDamage` before the hp write; stacks with Second Wind.  The
  cooldown stamp is in-memory (rule 11).  NEW server surface: the
  `laststand` key joined `HP_CHANNEL_KEYS` and the join caps advertise
  `laststand: true` — the client gates spending on that flag (an old
  worker would strip the key on echo; the caps.gems lesson).  The
  survival flag rides `monster_attack` and `pvp_hit` payloads for the
  client's LAST STAND! popup.
- **Reflexes** (Stamina grid): +1ms dodge-roll invulnerability per
  point, cap +100ms on the 250ms base window.  Purely client-mechanical
  (the roll window IS the i-frame — BroTown `_dodgeMs`); the server's
  PvP dodge check already honors the client-declared roll state.

Tests: combat-lifecycle suite +7 assertions (resilience big/small hit
math, last-stand save + cooldown + no-points cases, sanitize accepts
the new key).
