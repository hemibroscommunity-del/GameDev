# Stamina abilities + the milestone unlock ladder (v2.3.1733)

PR 5 of `docs/COMBAT-OVERHAUL-PLAN.md`. Two server-refereed abilities that
spend stamina, and the character-level ladder that unlocks them.

Owner, after the judging session: combat is "hold the auto attack, spam swipe
until mana runs out"; and a level should buy "chunky stats **and** milestone
unlocks". Stamina became the defensive resource at v2.3.1731 (blocking spends
it, parrying refunds it) — these two abilities put an offensive claim on the
same bar, so every fight is a budget rather than a rotation.

## The abilities

| Ability | `kind` | Unlock | Cost | Cooldown | Damage | Radius | Extra |
|---|---|---|---|---|---|---|---|
| Shield Bash | `bash` | char 4 | 30% max stamina | 4 s | 0.75× a melee roll | 70 px, nearest 1 | 0.8 s stun + 90 px knockback |
| Whirlwind | `whirl` | char 8 | 40% max stamina | 6 s | 1.0× a melee roll | 60 px, up to 8 | 40 px knockback |

Bash additionally requires a shield equipped, Whirlwind a melee weapon —
server-checked, the v2.3.1682 "the first swing is free" lesson.

The numbers live ONCE per side: `STAM_ABILITIES` in `server/src/abilities.js`
(authoritative) and `src/data/abilities.js` (mirror, for the button).
`server/test/abilities.test.mjs` imports both and fails on any drift.

## The ladder

| Char level | Unlock |
|---|---|
| 3 (floor) | the existing kit — dodge / lunge / retreat / swipe. **Not gated** (owner decision: taking abilities away from current players is a regression) |
| 4 | Shield Bash |
| 5 | +1 bonus allocation point |
| 6 | *(reserved for Element Burst — PR 6, a different session)* |
| 8 | Whirlwind |
| 10 | Second Wind: +25% max stamina |

`MILESTONES` (abilities.js) is the table, mirrored client-side. Character
level is `_prog3CharLevel` = Σ trained levels, so a fresh character is 3.

Non-ability rungs are settled by `_prog3GrantMilestones`, called on every
trained level-up (prog3.js) and once at join adoption (join.js). It is
idempotent through `prog3.ms` — the highest level already paid — which lives
inside the prog3 blob (persisted wholesale; no new rpg field, no new storage
key) and survives `_sanitizeProg3`. Join-time settlement is what pays
existing high-level characters their level-5 point retroactively, once.

The +25% stamina multiplies the WHOLE pool (after allocated `stam` points),
in `_prog3Recompute` and its client twin `recalcDerived`.

## Wire surface

| Direction | Type | Payload | Notes |
|---|---|---|---|
| client → server | `ability` | `{ kind }` | Three legs: the `case` in `webSocketMessage`, `_handleAbility`, and the `channelShim.send` passthrough (TRAPS #18) |
| server → client | `ability_rejected` | `{ kind, reason, need/have/cost/ms }` | Already in `PRIVILEGED_EVENTS`; **got its first client handler here** (`wsClient.js` → floating popup). Reasons: `locked`, `cooldown`, `stamina`, `no-shield`, `no-weapon`, `whiff` |
| server → client | `monster_hit` | `+ ability: kind` | Existing event, new field. The client shows its OWN popup for these — an ability has no local damage prediction |
| server → client | `prog3_level` | `+ milestone, bonusPoints, abilities` | Existing event, new optional fields; old clients ignore them |
| server → client | `state_sync.caps` | `+ abil: true` | Deploy-order gate: no flag, no buttons and no sends |

No new server-emitted TYPE, deliberately — the peer-visible swing rides the
existing `player_swing` broadcast, which keeps this PR's footprint in the two
shared files (`PRIVILEGED_EVENTS`, the shim allowlist) to a single added line.

## Authority

Everything is decided server-side: character level (from the server-owned
prog3 blob), stamina (server-owned pool), a server-stamped cooldown
(`ps._abilCd`, in-memory — a deploy re-arms it, rule 11), target selection,
the damage roll, the stun and the knockback. The client's copy of the table
only greys out a button and predicts the bar.

**Anticheat lockstep**: the roll is `_computeAttackDamage`'s ordinary melee
roll scaled by `dmgMult` (≤ 1.0) and clamped by `_maxDmgForAttacker`. A
scaled-DOWN roll cannot breach a ceiling that already covers the un-scaled
one, so no new headroom was needed — the ceiling's `comboBoost` term covers
it by construction. An ability that ever multiplies above 1.0 must move that
ceiling in the same commit (the v2.3.1451 rule).

**No double damage**: the ability borrows the swing ANIMATION, so the local
swing sweep (`monsterCombat.js`) is suppressed for its window via
`S._abilitySwingUntil`. Without that the same button press would also send an
ordinary `monster_damage` — two individually-legal hits, which no anticheat
would flag.

## Input

- **Touch (primary):** two buttons above the combat joystick
  (`src/ui/panels/AbilityButtons.jsx`), each visible only at its milestone
  level, with a cooldown sweep. Plus the planned gesture for bash: **tap the
  combat joystick while the shield is up**.
- **Desktop:** **E while blocking** = Shield Bash (E's interact chain is
  otherwise untouched); **R** = Whirlwind. Both listed on the keyboard-hints
  strip.
- **Deviation from the plan:** Whirlwind's "long-press attack" was NOT
  shipped as specified. Holding the combat joystick IS the auto-attack input,
  so a long-press trigger would fire Whirlwind every few seconds during
  ordinary attacking and drain 40% of the stamina bar the player needs for
  blocking. The button replaces it.

## Tests

- `server/test/abilities.test.mjs` — mirror conformance, milestone gating,
  stamina/cooldown/equipment refusals, the stun (proved against the real
  `_tickMonsters`, with an un-stunned control), telegraph interrupt, the AoE,
  the anticheat ceiling, and the ladder's one-off grants. Every assertion was
  verified to FAIL with its change reverted.
- `tools/qa/mp/mp-ability.mjs` — the join between the halves against a real
  worker: caps advertised, buttons hidden at level 3, the `ability` message
  actually leaving the browser and being answered, the new
  `ability_rejected` popup, and a forged client-side level buying nothing.
