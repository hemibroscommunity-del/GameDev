# Monster combat phases (v2.3.2224)

Two phases built on the `_monsterDamageable` foundation from v2.3.2221. Both
are owner-designed; this records the rules and the reasoning that is not
obvious from the code.

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
