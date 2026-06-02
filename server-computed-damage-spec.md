# Spec: Server-Computed Combat Damage (+ baseline-10 rescale)

**For the `brotown-server` session.** Coordinated with the `GameDev` client repo
(client mirror at the bottom). This is the last open combat cheat vector AND it's
where the baseline-10 (greatsword = 10) rescale lands, done in one pass.

Supersedes the offense-axis half of `damage-normalization-spec.md` (that one was
written before I'd read the server; this is grounded in the real code).

---

## Current state (already server-authoritative — do NOT redo)

HP, stamina, mana, regen (`_tickPlayerRegen`), monster→player damage + mitigation
(`_applyDamage`), block stamina cost, consumables, monster HP/spawn/respawn, and
combat XP credit are **all already on the server**. Player stats (`ps.power`,
`ps.agility`, `ps.mind`, `ps.ferocity`) and equipped weapons (`ps.weapon`,
`ps.rangedWeapon`, `ps.staffWeapon`, each with `type` + `tierMult`) are
server-tracked.

## The one remaining hole

`_handleMonsterDamage(session, payload)` (≈ line 3031) **trusts the client's damage
number**:

```js
const { monsterId, zone, dmg, isCrit, element, slot } = payload;   // dmg from client
const dmgCap = this._maxDmgForAttacker(attackerPs, !!payload.special);
const rawDmg = Math.max(1, Math.min(dmgCap, Math.round(dmg)));      // client dmg, just capped
m.hp -= Math.min(rawDmg, Math.max(0, m.hp));
```

The server already computes a stat-derived **cap** (`_maxWeaponDmg` →
`_maxDmgForAttacker`) — it has every input it needs. The fix is to compute the
**actual** damage instead of trusting and capping.

---

## Goal

1. **Server computes player→monster damage** from server-tracked stats + weapon.
   Client sends an *intent* (which monster, which slot), not a number.
2. **Bake in baseline-10**: divide every absolute player-damage constant and
   monster HP by **`k = 4.8`** (greatsword 48 → 10, stays hardest). Pure units
   change — hits-to-kill unchanged (verified, continuous no-op).

---

## Server changes (`brotown-server/src/index.js`)

### 1. Rescale the constants (÷4.8)

```js
// _weaponBase (≈ line 1156): divide each by 4.8
_weaponBase(type) {
  const T = { greatsword: 10, sword: 6.67, bow: 7.29, staff: 8.54 };
  return T[type] || 6.25;          // fists fallback was 30
}
```
- `_monsterStat(60, lvl, …)` HP line (≈ line 359) → `_monsterStat(12.5, lvl, …)`.
  **HP only** — leave the `_monsterStat(12, …)` damage line and `(10, …)` XP /
  `(5, …)` gold lines exactly as they are.
- Every `* 0.8` stat coefficient in the damage path → `* 0.1667` (i.e. `0.8/4.8`).
  Currently in `_maxWeaponDmg` (`statBonus = (… ) * 0.8`) and in the new compute
  function below.
- `_maxDmgForAttacker` floor: `Math.max(100, …)` → `Math.max(21, …)` (100/4.8).
  Otherwise the 100 floor is ~10× a real hit and the cap stops doing anything.
  (The cap stays useful as a sanity bound even though damage is now server-rolled.)

### 2. Compute the actual damage server-side

Add a roll function (refactor of `_maxWeaponDmg` — pick the **slot's** weapon and
the **correct stat**, then roll variance + crit instead of taking the max):

```js
// Mirrors client calcWeaponDmg / calcSpecialDmg + calcCritChance/Mult.
_computeAttackDamage(ps, slot, isSpecial) {
  if (!ps) return { dmg: 1, isCrit: false };
  // slot -> weapon + governing stat (EQUIP_STAT_MAP: melee=power, bow=agility, staff=mind)
  const w = slot === 'bow'   ? ps.rangedWeapon
          : slot === 'staff' ? ps.staffWeapon
          :                    ps.weapon;
  const type = (w && w.type) || 'greatsword';
  const tierMult = (w && w.tierMult) || 1;
  const stat = isSpecial ? (ps.mind || 0)
             : type === 'bow'   ? (ps.agility || 0)
             : type === 'staff' ? (ps.mind || 0)
             :                    (ps.power || 0);
  let base = (this._weaponBase(type) + stat * 0.1667) * tierMult;   // 0.8/4.8

  // per-type variance (same rolls as the client)
  const v = type === 'staff' ? (0.5  + Math.random() * 1.0)
          : type === 'bow'   ? (0.6  + Math.random() * 0.2)
          :                    (0.75 + Math.random() * 0.5);
  base *= v;
  if (isSpecial) base *= 2.0;                                       // SPECIAL_ATK_MULT
  if (w && w.isVolatile) base *= 1.30;                             // volatile weapon bonus
  if (this._buffActive(ps, 'damage')) base *= 1.15;               // if a damage buff is active (match client mult)

  // crit (calcCritChance: Power 40P/(P+200) + Ferocity 30F/(F+250); calcCritMult 1.5 + .001P + .0008F)
  const P = ps.power || 0, F = ps.ferocity || 0;
  const critChance = (40 * P / (P + 200) + 30 * F / (F + 250)) / 100;
  const isCrit = Math.random() < critChance;
  if (isCrit) base *= (1.5 + P * 0.001 + F * 0.0008);

  return { dmg: Math.max(1, Math.round(base)), isCrit };
}
```

> Confirm the client's "damage buff" multiplier value before trusting the `1.15`
> above — grep the client for the active-weapon / buff damage multiplier and match it.

### 3. Use it in `_handleMonsterDamage`

```js
// was: const { monsterId, zone, dmg, isCrit, element, slot } = payload;
const { monsterId, zone, element, slot } = payload;              // ignore client dmg/isCrit
...
const isSpecial = !!payload.special;
const rolled = this._computeAttackDamage(attackerPs, slot, isSpecial);
// keep _maxDmgForAttacker as a cheap sanity clamp on the server's own roll:
const cap = this._maxDmgForAttacker(attackerPs, isSpecial);
const rawDmg = Math.max(1, Math.min(cap, rolled.dmg));
const actualDmg = Math.min(rawDmg, Math.max(0, m.hp));
m.hp -= actualDmg;
...
// broadcast the SERVER's numbers
this.eventBuffer.push({ type: 'monster_hit', payload: {
  monsterId: m.id, zone, dmg: actualDmg, isCrit: rolled.isCrit,
  attackerId: session.id, hpPct: Math.max(0, m.hp / m.maxHp),
}});
```

### 4. Other absolute combat damage on the server (÷4.8 if present)

Search for and rescale any flat player→monster damage outside the weapon path:
collision / elemental-collision base damage, status DoT (burn/poison) tick numbers,
thorns dealt to monsters. **Leave** anything that is a `× weaponDmg` multiplier.

### 5. Coupling — the one cross-axis catch

**Volatile monster death explosion** ("30% of monster maxHP" → player): monster
maxHP just shrank 4.8×, so this would hit the player 4.8× weaker, which we do NOT
want (monster→player damage stays in current units). **Multiply that % by 4.8**
(30% → 144% of the new maxHP) so the absolute damage to the player is unchanged.
Same for any other "% of monster maxHP → player" effect.

### Do NOT touch
Monster attack damage (`_monsterStat(12,…)` + archetype `dmgMult`), `_applyDamage`,
player HP / maxHp / stamina / mana, regen, material `tierMult`, rarity/quality
multipliers, block/dodge, XP (`10`) / gold (`5`) bases.

---

## Client mirror (`GameDev/src/data/gameSystems.js`, deploy in lockstep)

- `WEAPON_TYPES` base: `48/32/35/41` → **`10 / 6.67 / 7.29 / 8.54`** (greatsword/sword/bow/staff).
- `calcWeaponDmg` and `calcSpecialDmg`: the two `* 0.8` → **`* 0.1667`**.
- `createMonster`: `monsterStat(60, …)` HP line → `monsterStat(12.5, …)`.
- Any client-authoritative monster variant that hardcodes HP → ÷4.8.
- `player_attack` send: stop including `dmg` / `isCrit` (send intent only —
  `{ monsterId, zone, slot, special, element }`). The local damage popup stays
  (instant feedback) but is now **prediction only**; the server's `monster_hit`
  broadcast is authoritative for HP. Predicted and authoritative numbers now match
  because both sides use the same ÷4.8 constants.

I (the GameDev session) will make these client edits when you say the server half
is in, so both deploy together.

---

## Verification

- `python tools/audit-validator.py --weapon-base 48 --scale 4.8` →
  "continuous hits-to-kill identical: YES" (proves the rescale is a no-op).
- In-game: a level-1 greatsword should read ~10–11 per hit; a fodder should die in
  the same number of hits as before. Spot-check a brute at a few levels.
- Confirm the `_maxDmgForAttacker` floor (now 21) never clips a real hit.

## Deploy order
Worker first, then client (~60–90s later, per the established pattern). During that
window an old client still *sends* `dmg` (server ignores it — fine) but *displays*
its own old-scale predicted popup while the server resolves new-scale damage — so a
player's own damage numbers look ~5× too big for ~90s until the client builds. Monster
HP (server) stays correct throughout. Acceptable; just expect it.
