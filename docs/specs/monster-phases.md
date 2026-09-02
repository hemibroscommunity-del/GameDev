# Monster combat phases (v2.3.2229)

Three phases; the first two are built on the `_monsterDamageable` foundation from v2.3.2221. Both
are owner-designed; this records the rules and the reasoning that is not
obvious from the code.  The mummy's is older than both and was undocumented
until v2.3.2229 changed its trigger.

## The snow pile is INTANGIBLE, not merely invulnerable

Owner: attacking the burrow phase should "not send any combat messages" and
projectiles should "travel right through it".

So the pile is not a target that refuses damage — it is not a target.
`isIntangible(m)` (`src/data/monsterVariants.js`) sits beside `!m.alive` in
both the melee sweep and the projectile pass, because it means the same thing
to each: there is nothing here to collide with.

- The swing is **not consumed** — the blade carries on to whoever is behind him.
- The arrow is **not added to `hitIds`** — a pierce shot does not spend one of
  its targets on a mound of snow.
- The IMMUNE popup and its beep stay for **boss** phases, where the message
  *is* the mechanic ("wait for the opening"). On a pile they were a wall of
  grey text over a moment that already reads as untouchable.

One predicate, both call sites, pinned together: a sword that ignores the
mound while an arrow stops dead on it reads as a bug in whichever you notice
second.

## The blue slime answers death with an explosion

Owner: "Once it reaches 0 health it goes to 3x or 4x its size and explodes in
a blast radius. 60 damage if caught in the radius."

| | |
|---|---|
| swell | 800ms, ×3.5 |
| radius | 110px |
| damage | flat 60, capped by `MAX_HIT_PCT` |

**The swell IS the telegraph.** Nothing else warns you and nothing else needs
to — a slime tripling in size in front of you is not subtle. It draws the same
`_telegraphZones` ring the kits use, so "this circle is about to hurt" stays
one visual language.

**Damage is FLAT, not a multiplier.** The owner named a number, and a fodder
slime's own damage is small enough that a multiplier big enough to reach 60
would swing wildly with monster level. It still passes through
`TELEGRAPH.MAX_HIT_PCT`, so it cannot one-shot a fresh character — the same
no-one-shots rail every telegraphed hit rides.

**The kill is DEFERRED, not cancelled.** `_startSlimeBurst` is called from the
top of `_resolveMonsterKill`, which is the one place every way of killing a
monster funnels through — melee, a damage-over-time tick, an Element Burst, a
stamina ability. Intercepting there rather than at each damage site is what
stops it becoming "it only explodes when you kill it with a sword". The blast
then calls back into the same function with the same killer, so credit, loot
and XP are unchanged; `_burstDone` is what keeps that second call from
deferring forever.

Nothing can hurt it mid-swell — `_monsterDamageable` already denies `hp <= 0`
— so the window cannot be extended or cut short by more damage.

It hits **every** player in the radius, not just the killer. It is an
explosion.

**Rendering.** The swell multiplies `spriteBody.scale` after every sprite
branch has set its own, so it works for whichever branch drew the monster
rather than being pasted into three of them — and it is multiplied into the
sprite rather than set on the container, because scaling the container would
blow up the shadow and the health bar with it. Eased quadratically so it
lurches at the end: the last moment is the one you have to react to.

The fuse rides the tick delta as `w.bu`, following `w.st`/`w.ph`. Joining next
to a slime standing at 0 hp with no warning would make the first thing you
learn about the mechanic 60 damage.

**Still missing art:** the detonation itself is a ground decal, screen shake
and a low tone. A goo-burst strip (8 frames, the `DEBRIS_BURSTS` shape) would
be the upgrade.


## The mummy unwraps on the FIRST hit

Owner (v2.3.2229): "Make the skeleton scale larger for its size. It looks
really thin. Increase speed in skeleton phase 25% and change it so first hit
makes the mummy to skeleton transformation."

Sky remaps every archetype to `mummy`, and a mummy has a second life: it
sheds its bandages and comes back as a `skeleton` — faster, tougher, with its
own death sheet. The phase itself predates this doc; what changed is when it
starts, how fast the second form moves, and how big it draws.

| | before | after |
|---|---|---|
| trigger | `hp / maxHp <= 0.5` | any damage at all (`hp < maxHp`) |
| skeleton speed | 1.4 | 1.75 |
| skeleton `liveScalePx` | 96 | 120 |

### Why the trigger is a flag and not a number

The obvious edit is `transformAt: 1`, and it is wrong. The test is `<=`
against a fraction, and a full-health monster satisfies `hp / maxHp <= 1` —
so the mummy would transform on spawn, before anything touched it. "Has taken
damage" is `hp < maxHp`, which is a different question from "is below a
fraction", so it gets its own flag: `onFirstDamage: true`.

Both halves are pinned. `server/test/tick.test.mjs` asserts that an untouched
mummy does **not** transform *and* that exactly one point of damage does;
`tools/qa/mp/mp-skeleton.mjs` asserts the same pair on the client mirror. A
test that only checked the second half would pass against `at: 1`.

The mummy's `incomingDmgScalar: 0.5` was tuned so the old threshold took
about two hits. It is left alone — the mummy phase is now one hit long
either way — but its comment no longer describes a live constraint.

### The scale change carries the hitboxes with it

The skeleton is **not** drawn small. Measured on the sheets, its painted
figure fills its 256 cell almost exactly as the mummy's does (max painted
107×219 against the mummy's 114×210) and both sat at `liveScalePx: 96`. It is
drawn **narrow** — bones where a mummy is bandaged bulk — and no scale fix
addresses a silhouette. So the 1.25× is the owner's design call taken at face
value, not a bug fix.

What makes it more than a one-line change is that the figure's drawn height
and its hit geometry are separate hand-tuned constants in four files, all
written as `mummy || skeleton`:

| file | constant | mummy | skeleton |
|---|---|---|---|
| `src/data/gameSystems.js` | `monsterBodyOffsetY` | 48 | 60 |
| `src/data/gameSystems.js` | `monsterMeleeHitRadius` | 40 | 50 |
| `src/game/projectiles.js` | `_hitR` (bow / staff) | 40 / 50 | 50 / 63 |
| `src/ui/BroTown.jsx` | `_monBody` offset | 48 | 60 |

Scaling the sprite and leaving these behind does not produce a
wrong-looking monster; it produces arrows that pass through a body they
visibly hit. v2.3.1111 names mummy/skeleton as exactly the case where a
mis-aimed shot missed outright, so this was the tightest fit in the game
before it got bigger. `mp-skeleton` asserts the invariant rather than the
number: the body offset is half the drawn figure, for both forms.

### Mirrors

Speed and the transform rule exist on both sides and are CI-pinned:

| | server (authority) | client (mirror) |
|---|---|---|
| speed | `_variantSpeed` (`server/src/index.js`) | `MONSTER_VARIANTS.skeleton.spd` |
| trigger | `_variantTransform` + `_tickMonsters` | `maybeTransformMonster` (dungeon / client-rolled only) |

`server/test/mirror-audit.test.mjs` fails the build if the two speeds drift.
The client path is gated on `!S._serverMonsters`; in every live zone the
worker decides and broadcasts `monster_transform`.
