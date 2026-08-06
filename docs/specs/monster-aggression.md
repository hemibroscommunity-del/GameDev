# Monster aggression — knockback debt + per-archetype aggro

**v2.3.1639.** Owner report (2026-08-06): *"at least the snow men monsters
are way too passive and barely try to do me any damage. Might be good to
make a snowball projectile or more aggressive."*

Server-side only (`server/src/index.js`, `server/src/combat.js`). No wire
change, no new event, no storage key, no caps flag. Pinned by
`server/test/combat-lifecycle.test.mjs` §8.

---

## 1. The mechanism that made them passive

Not damage, and not the attack ring — both of those had already been
tuned for this complaint and it kept coming back.

`_handleMonsterDamage` shoves a monster **30 px** directly away on every
non-`noKb` hit (45 on a crit, 60 on a special). A snowman's chase speed is
`0.5 × ARCHETYPES.snowman.spdMult (0.8) = 0.4 px/tick`, and the server ticks
at `TICK_RATE = 22 ms`. The player's `SWING_COOLDOWN` is 600 ms — 27.3 ticks
— so between two swings the monster walks back:

```
0.4 px/tick × 27.3 ticks = 10.9 px      recovered
                            30.0 px      lost to the shove
                          ─────────
                           −19.1 px      net, every swing, monotonic
```

The monster is therefore pushed further out of its own attack ring than it
can possibly recover, for the entire fight. A player who simply keeps
swinging is **never hit back**. That is the whole report.

This is not snowman-specific — it applies to every slow archetype
(`brute` 0.35, `mummy` 0.4). Snowmen show it worst because `hpMult 1.3`
makes theirs the longest fight in the `[1,2]` band, so they absorb the most
shoves per kill.

### Why it survived a previous fix

`server/src/combat.js` already carries this diagnosis, from v2.3.222:

> No AI freeze: the 200 ms `_kbUntil` lockout used to prevent the monster
> from chasing back, but combined with monster speed (~22 px/sec) and the
> player swing cooldown (600 ms), the shove pushed monsters out of the
> 45 px attack range and they never landed hits between swings —
> `dmgFromMonster` stayed at 0 and lifesteal silently broke.

That fix removed the **freeze** and left the **shove**. Removing the freeze
let the monster start walking back immediately, but at 10.9 px per swing
against a 30 px shove, "immediately" was never fast enough. Half the bug was
fixed; the arithmetic half was not.

## 2. Knockback debt

The shove is kept at full strength — it is the hit-impact feedback, and
shrinking it would flatten every weapon's feel. Instead it is recorded as a
**debt** the monster repays while chasing.

| | |
|---|---|
| `m._kbDebt` | px still owed; `min(existing + kbForce, 60)` on each shove |
| `KB_RECOVER_PX_PER_TICK` | `1.1` — repaid on top of the normal chase step |
| Repaid when | chasing only, and only along the vector toward the target |
| Cleared when | the monster drops its target (aggro loss / wander) |

The rate is derived, not tuned by feel:

```
1.1 px/tick × (600 ms SWING_COOLDOWN / 22 ms TICK_RATE)
  = 1.1 × 27.3
  = 30 px   ==  exactly one normal hit's shove, undone per player swing
```

So a player still gets a full swing's worth of space from every hit; the
monster is no longer permanently exiled by the act of being hit in the face.
The 60 px cap means a special (60) followed by a crit (45) cannot bank
105 px of free catch-up.

`ccMoveMult` gates the repay exactly as it gates the normal step, so a
frozen or rooted monster does not repay debt while crowd-controlled.

## 3. Per-archetype aggro range

`MONSTER_AGGRO_RANGE` stays **120**. A new `MONSTER_AGGRO_BY_ARCH` map
overrides it per archetype; an archetype that is absent falls back to 120,
so nothing but the listed archetype changes behaviour.

| archetype | range | note |
|---|---|---|
| `snowman` | 300 | this change |
| *(everything else)* | 120 | unchanged default |

At 120 px an unprovoked monster does not react until the player is roughly
one body-length away, which reads as "it ignores me". 300 px is still well
inside a phone screen, and still leaves the player free to disengage — a
snowman closes at 18 px/s against a 150 px/s walk, so this changes **when it
engages**, never **whether the player can leave**.

Scoped rather than global for a concrete reason: `effAggroRange` is read
inside `_tickMonsters`, which loops `_activeZones()`, and **dungeon
instances ride ordinary zone ids through that same loop**. Bumping
`MONSTER_AGGRO_RANGE` itself would re-pull every archetype in every
open-world zone *and* inside every dungeon. The scoping mirrors the shape
already used a few lines below for `_atkRange`
(`m.arch === 'snowman' ? 70 : ATTACK_RANGE`, v2.3.1409).

The lookup uses `Object.prototype.hasOwnProperty.call` rather than a bare
index. `m.arch` is a server-authored spawn field today, but a map indexed by
a monster-supplied string is exactly the shape that no-opped on `'__proto__'`
three times on 2026-07-07 (TRAPS #6), so the guard is structural.

## 4. What was deliberately NOT changed

- **Damage.** `dmgMult` and the `[1,2]` level bands are untouched. The bands
  are an owner directive (2026-07-04, "entry-depth zones stay L1-2 while the
  game is a demo") pinned by `server/test/zones.test.mjs`. The complaint was
  about *aggression*, and aggression is what moved.
- **`spdMult`.** Changing it would need a mirrored client edit —
  `server/test/mirror-audit.test.mjs` §1 pins `hpMult`/`dmgMult`/`spdMult`
  between `src/data/gameSystems.js` and `server/src/data.js` — and "slow" is
  the snowman's archetype identity. Knockback debt addresses the same
  symptom without redefining what a snowman is.
- **A snowball projectile.** See §5.

## 5. Open: the snowball

The owner's alternative suggestion. Deliberately not built here, because it
is a genuinely new subsystem rather than a tuning change, and the aggression
fix should be evaluated on its own first.

What the investigation found, for whoever picks it up:

- **No server-owned projectile exists.** Every boss ability in `dungeon.js`
  (slam / sweep / charge / summon) is an instantaneous radius test with no
  travel time. A snowball would be the first traveling entity the server owns.
- **A client-side snowball already exists and is switched off** —
  `SNOWBALL_DMG_BASE/STUN_MS/CD/RANGE/SPEED` in `src/data/items.js`,
  `S._snowballs` in `BroTown.jsx`, and a full simulation in
  `src/game/zoneMechanics.js`, behind three `false &&` gates with the comment
  *"UI disabled per user request … Flip the false back to enable."* It is
  **player-thrown**, applies damage **client-side**, and has **no renderer**
  (`grep _snowballs src/rendering/` → 0 hits). It cannot simply be
  re-enabled: client-applied damage violates rule zero.
  `docs/REBUILD-PLAN.md` records it as an open owner revive-or-remove call.
- **The render pipeline is reusable.** `S.slimeProjectiles` +
  `effectsRenderer.js` already draws monster orbs; a server-driven snowball
  could feed it as **display-only** (no client damage), which also means no
  new art is required.
- **Damage attribution is cheaper than it looks.** `monster_attack` already
  carries server-authored `attackerX/attackerY`, and after the client's
  160 px sanity gate those coordinates are used nowhere except a debug
  object — every visible effect (popup, hit flash, particles, shake, defense
  XP) anchors on the *player*. Reporting the impact point therefore lets a
  ranged hit render correctly on already-deployed clients.
- Would still need: a travel/impact scheduler in `_tickMonsters` (tick-driven
  — rule 12 forbids alarms), a display-only `monster_projectile` event
  **registered in `PRIVILEGED_EVENTS`**, a client handler, and suite coverage.

## 6. Test coverage

`server/test/combat-lifecycle.test.mjs` §8 pins:

- snowman override is 300; unlisted archetypes fall back to 120
- the override map is not reachable through `Object.prototype`
- **the binding arithmetic**: one swing of repay undoes one normal shove
  (fails if the shove or the repay rate is retuned in isolation — the exact
  way this regressed the first time)
- bare chase speed alone still loses ground (the bug, asserted as such)
- chase + repay lets a snowman hold its ground
- accumulated debt is capped at 60

All six were mutation-tested: reverting `KB_RECOVER_PX_PER_TICK` to 0 fails
two of them, and emptying `MONSTER_AGGRO_BY_ARCH` fails a third.
