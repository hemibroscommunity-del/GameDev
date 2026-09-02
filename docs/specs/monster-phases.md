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

## v2.3.2226

**The phantom-loot bug.** Owner: "it shows dozens of slimes in my bag then
fixes the amounts."

The swell leaves the slime **alive with 0 hp** for the length of its fuse —
a state nothing on the client had ever seen. The melee sweep saw a live
monster, registered a hit, and fell straight into the local kill block
(`if (m.curHp <= 0)`), which pushes ground loot. Every swing during the fuse
spawned another pile. The server ignored the damage entirely and granted loot
exactly once, so the bag filled with phantom drops until the next
authoritative inventory sync corrected them — hence "then fixes the amounts".

Fixed at the cause, not the symptom: `isIntangible` now covers `_burstUntil`
as well as the snow pile. The server already denies all damage during the
swell, so the client agreeing there is nothing to hit is what the two should
have matched on from the start. A monster mid-death-throes is not a target.

Pinned, because it comes back as an **economy** bug rather than a visual one.

**Fuse doubled**, 800 → 1600ms.

**The code-drawn impact areas are gone.** The green ring and the ground splat
both went: the ring was live `Graphics`, the splat a minted radial blob sized
to the blast — a code-drawn impact area by another name. What is left is what
does not look drawn: the swell, the camera kick and the sound.

That makes the **swell the only telegraph**, which is why the fuse doubled in
the same change — a slime tripling in size has to carry the whole warning now,
and it needs the extra second to be a fair one. A real goo-burst strip is the
upgrade.

## v2.3.2227 — the explosion plays at the size it grew to

Owner: "play the slime explosion animation at the peak swell size."

The slime already **had** an explosion: `slime-death-v10` is a 15-frame death
burst, drawn for `SLIME_DEATH_MS`. It was playing at 1x because detonation
cleared the swell first, snapping the sprite back before the burst started —
so the thing you watched blow up was not the thing that had just filled the
screen.

Detonation now hands the peak scale to the death burst (`m._burstPeakFrom`),
and the renderer holds it **only while that burst is the frame being drawn**.
Two events arrive separately here (the `execute` cue and the kill), so a fixed
hold would either cut the explosion short or outlive it onto the remnants
splat, which should stay normal size.

## v2.3.2228 — "I never see the death animation play, it swells then freezes"

The version above was wrong twice, and both mistakes are worth keeping written
down because neither was visible in a screenshot or a build.

**Where the hold lived.** The swell multiplier is applied once, after every
sprite branch has set its own scale — the right place for a live monster, and
the reason the swell works for whichever branch drew it. But the dead-monster
branch `continue`s a thousand lines earlier. A corpse never reaches that line,
so v2.3.2227's peak hold was **unreachable code**, and the sprite simply kept
whatever scale the last live frame left on it. That is the freeze. The hold
now lives inside the death branches themselves, where the explosion is drawn,
bounded by the death window it sits in and cleared on the respawn edge.

**What made it a freeze rather than a wrong size.** The same change read
`display._deathDrewAt` one line *above* its own `const display` — a temporal
dead zone `ReferenceError`, thrown on the first frame a fodder slime died.
`pixiRenderer.js` wraps each system's update in a try/catch that logs once and
carries on, deliberately, so one bad frame cannot take the game down. The cost
is that a per-frame throw in the render loop is invisible: no crash, no
`pageerror`, no failing screenshot. The monster loop just aborted at the
corpse every frame — the corpse never reached its own draw, and **every
monster iterated after it was skipped entirely**, left holding its last good
frame. Lint cannot help here either: `no-undef` does not see a same-scope TDZ,
and `no-use-before-define` reports 138 harmless closure references across
`src/`, so it is not adoptable without churn in unrelated files.

The guard is therefore behavioural, and it is repo-wide: the QA harness now
collects `[pixi-render] … threw` from every scenario's console and fails
whichever suite was on screen (`takeRenderThrows`, asserted per scenario in
`run.mjs`). `tools/qa/mp/mp-slimeburst.mjs` covers this mechanic specifically,
on both a raw fodder slime and a blue slime — a blue slime takes one branch
more, because `MONSTER_VARIANTS` has an entry for it but `VARIANT_SPRITES`
does not, so it is consulted by the variant death branch and then falls
through to the slime splat.
