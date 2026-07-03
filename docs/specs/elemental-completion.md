# Elemental Completion — v2.3.1139 (handoff item I)

The v2.3.1114 server elemental model (statuses/DoT/collisions,
`server/src/elemental.js`) deliberately deferred four pieces. All four
were phantom or display-only by architecture — the server owns monster
AI, mana, and the damage roll — and are now server-side. No client
changes: the client's existing local versions become correct
predictions. Tests: `server/test/elemental2.test.mjs`.

## What moved server-side

| Piece | Behavior (client constants, verbatim) | Where |
|---|---|---|
| CC on monster AI | freeze/root → moveMult 0 AND no attacks; slow → ×0.4 speed, attacks normal | `elementMoveMult` (elemental.js) consumed at the three `m.spd` steps + the attack gate in `_tickMonsters` |
| Resonance-streak mana restore | streak: +1 per resonating collision within a 10s window, cap 5, reset on non-resonating; restore `round(4% maxMana × (1 + restoration×0.0012) × (1 + min(count×0.10, 0.50)))`, throttled once/3s, clamped to max | `resolveElementCollision` gained a `resonating` flag; streak + restore in `_handleMonsterDamage`'s collision branch |
| Amulet elemDmg | flame-gem amulets: `dmg ×= 1 + (3 + 2.5×tierPower)/100` (5.5/6.75/8.5/10.5% by tier), only when the weapon has `element1` | `_computeAttackDamage` (post-crit); `AMULET_TIER_POWER` in data.js |
| Hexer curse | landed hexer hit → `ps._cursedUntil = now + 4000`; outgoing damage ×0.7 while active | stamp in the monster-attack path; multiplier in `_computeAttackDamage` |

`resonating` = the collision detonated inside the last 25% of the
setup status's duration (the same window that grants the damage
resonance bonus).

## Deliberately still client-side / omitted

- **elementalMastery** multipliers: retired stat, pinned 0 → ×1.0.
- **influence** CC-duration bonus: retired.
- All particles, popups, codex discovery, `reveal` visuals: cosmetic.
- **Amulets themselves are still a client-crafted blob** (`ps.amulet`
  ingested at join without a gem/tier whitelist). The elemDmg mirror
  validates gem === 'flame' and unknown tiers default to the SIMPLE
  power, so the forgery ceiling is the legitimate mythic +10.5% — but
  a server-side amulet-forge handler is the real fix (successor item,
  same pattern as forge_weapon).

## Notes for successors

- The client's `moveMult` block (monsterCombat.js:282-294) and gate
  (:336) are the source of truth mirrored here — keep the constants
  in sync if CC is retuned.
- `_maxDmgForAttacker`'s comboBoost=5 headroom covers the amulet
  multiplier; if more damage layers move server-side, re-check the
  cap margin before shipping.
- Shock/fracture/soak still have no mechanical effect on either side
  (visual only) — fracture's `maxStacks: 5` is reserved for a future
  armor-shred mechanic.
