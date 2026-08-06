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

## 5. The snowball (v2.3.1640)

The owner's alternative suggestion, and the design answer to the problem
§1 describes. Knockback debt fixes the fight you *chose*; it does nothing
about the fact that a snowman **cannot close at all**. At 18 px/s against a
150 px/s walk its threat is entirely opt-in — you are never in danger unless
you volunteer. Giving the slow, tanky archetype a ranged attack turns that
slowness from a defect into its identity: you can always walk away from a
snowman, but not for free.

### Behaviour

| | |
|---|---|
| band | `minRange 100` .. `range 300` |
| travel | `travelMs 900` — a slow, readable lob you can step out of |
| cooldown | `cd 2600` vs the 1500 ms melee cooldown |
| damage | the same `m.dmg` a swing does — **unchanged** |
| in flight | one ball at a time per monster (`m._projImpactAt`) |
| dodge | miss if the player drifts > `SNOWBALL_HIT_RADIUS` (40 px) from the aim point |

The band sits strictly *between* the snowman's 70 px swing ring and its
300 px aggro radius, so closing to melee switches it back to swinging (the
two branches can never contend for a tick) and it never throws at a player
it has not noticed. Range is the reward; it deliberately does **not** also
out-DPS a swing.

### Server authority

Two events, and only one of them carries damage:

- `monster_projectile` — **display only**. `{monsterId, kind, zone, x, y,
  tx, ty, travelMs}`. No damage field, and the client applies none.
  Registered in `PRIVILEGED_EVENTS`: a forged one would let a client paint
  fake incoming balls on every screen in the zone.
- `monster_attack` — the authoritative hit, emitted on the impact tick
  through the shared `_monsterStrikePlayer`.

Impact is scheduled at throw time (`m._projImpactAt`) and resolved from the
tick loop — tick-driven, never an alarm (rule 12). It is deliberately
resolved **outside and ahead of the aggro branch**: a thrown ball is already
in the air, so it must land even if the target walked out of aggro range or
the monster lost interest. Gating it on aggro would mean walking backwards
deletes incoming damage — precisely the "monsters can't touch me" problem
this whole change exists to fix.

**The ball lands where it was aimed, not on the player.** `m._projTx/_projTy`
are stored at throw time and the impact misses outright if the player has
drifted more than 40 px from that point during the 900 ms flight. Without
that the throw would be an undodgeable homing hit and the readable arc would
be decoration. 40 px against a base 150 px/s walk clears in 270 ms — a third
of the flight — so simply walking is a real dodge, while standing still never
loses a hit to client/server position drift.

**Blocking is evaluated at impact, not at throw**, so raising the shield
while the ball is in the air works. A blocked ball emits a
`blocked: true` `monster_attack` (same feedback a blocked swing gives) and
no damage. No stamina drain: that cost is tied to the melee cadence, and
adding a second drain source would be a balance change smuggled in with a
feature.

### The load-bearing wire detail

`src/networking/gameEvents.js` **drops any `monster_attack` whose attacker
is more than 160 px from the player** — a deliberate guard against "mystery
damage with no visible attacker". A 300 px snowball reported from the
*thrower* would trip that guard, and the player would silently lose HP with
no popup, no hit flash and no defense XP, on every client already deployed.

So `_monsterStrikePlayer` takes the attacker coordinates as parameters and
the ranged path passes the **impact point**. That is legitimate rather than
a dodge: after the gate, those coordinates are read nowhere except a debug
object — every visible effect the client draws (popup, hit flash,
particles, shake, defense XP) is anchored on the *player*. Reporting the
impact point is both truthful (it is where the hit happened) and renders
correctly with **no client change and no caps flag**.

`_monsterStrikePlayer` is shared by the melee swing and the ranged impact
rather than copied. A second copy of the thorn / hexer / lifesteal / death
sequence would drift, and this repo has been bitten by exactly that before.

### Deploy-order safety (rule 19/20)

Safe in both directions with no caps flag:

- **Old client, new worker** — ignores the unknown `monster_projectile`
  type (its message switch has no default side effects) and receives the
  damage as an ordinary `monster_attack`, exactly as it always did. Worst
  case: the ball is invisible, the hit still reads correctly.
- **New client, old worker** — never receives one, because an old worker
  never throws.

### No new art

The ball rides the existing `S.slimeProjectiles` pipeline — already
simulated in `src/game/projectiles.js` and drawn by `effectsRenderer` — so
it needs no renderer and no asset, and therefore raises no
animation-preload obligation (CLAUDE.md). The `displayOnly` flag is what
keeps it honest: that simulator normally rolls its own client-side damage,
block and hit-react on contact, which for a server monster would double-hit
the player and hand damage authority back to the client (rule zero). A
`displayOnly` entry despawns on contact and lets the server's own event
draw the feedback.

### Still open: the PLAYER-thrown snowball

Unrelated to the above, and **an owner decision, not a code one**. A
complete player-thrown snowball already exists and is switched off:
`SNOWBALL_DMG_BASE/STUN_MS/CD/RANGE/SPEED` (`src/data/items.js`),
`S._snowballs` (`BroTown.jsx`), a full simulation in
`src/game/zoneMechanics.js`, and three throw buttons behind `false &&`
gates — one commented *"UI disabled per user request … Flip the false back
to enable."* It applies damage **client-side** and has **no renderer at
all** (`grep _snowballs src/rendering/` → 0 hits), so it cannot simply be
re-enabled; it would need the same server-authority port. `REBUILD-PLAN.md`
records it as an open revive-or-remove call.

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

§9 pins the snowball:

- only the snowman has a ranged profile; the map is not prototype-reachable
- the throw band starts outside the 70 px melee ring and never exceeds the
  300 px aggro radius
- the ranged cooldown is slower than melee (range is the reward, not DPS)
- travel is slow enough to read and dodge (≥ 500 ms)
- **impact reports the IMPACT point, inside the client's 160 px gate** —
  plus the inverse assertion that the thrower really was outside it, so the
  test cannot pass vacuously
- the hit radius is generous enough to survive position drift, small enough
  that walking away dodges, and a base-speed walk clears it inside the
  flight time
- melee still reports the monster's own position (the shared helper did not
  silently change the melee wire)

Mutation-tested: reporting the thrower instead of the impact point fails
the gate assertion with `dist: 280`, and deleting the snowman's ranged
profile fails the profile assertion.
