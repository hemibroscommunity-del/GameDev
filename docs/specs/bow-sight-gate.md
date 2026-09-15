# The bow only shoots at something (v2.3.2473)

**Status:** shipped, client-only. Lane C of the 2026-09-14 backlog triage
(`docs/BACKLOG-TRIAGE-2026-09-14.md` §2.5).

> "Fire only when a ray from the grip along the aim angle hits the first
> monster's hit circle; when it does not, do not stamp `swingTimer`, so the
> next arrow fires the instant the line touches. A pressed special sets a flag
> consumed at that same site. Clip the sight stream at the first hit distance.
> Arrow speed ×3."
> — the plan, from the owner's ask

## What changed, in one sentence

A bow no longer looses arrows at empty ground: it waits, with its cooldown
still running, and shoots the instant its line of sight crosses something —
and the arrow that leaves is three times faster than it was.

## The three parts

### 1. The gate

`monsterCombat.js` resolves **one** answer per frame, before the cadence gate,
and publishes it as `S._bowSight`:

```
origin = the bow GRIP (S._bowGripX/Y, else the feet)
angle  = rangedAimAngle(S, origin)     -- combatHelpers, the one ladder
reach  = BOW_RANGE_PX * bowRangeMult(rpg)   -- the arrow's own plant cap
hit    = firstSightHit(...)            -- projectiles.js
```

`firstSightHit` is a ray-vs-circle test against **the same radii the hit test
uses** — `monsterProjRadius` (lifted out of the per-monster loop for exactly
this reason) plus the arrow's drawn half-thickness from `PROJ_BODY`. A gate
carrying its own copy of those numbers would be correct the day it shipped and
wrong the next time one of them moved, which is the failure the aim ladder was
extracted to prevent one layer up.

Its `dist` is where the ray **enters** the circle — the near edge — which is
also where the drawn line should stop.

### 2. Not stamping the swing clock is the whole mechanism

When the line is empty the fire site does not push an arrow **and does not
stamp `S.swingTimer`**. The cadence therefore runs from the last shot that
actually left, so a player sweeping the aim across a monster fires the instant
the line touches him — there is no extra beat to wait out and no rhythm to
learn. Stamping it would have turned every off-target frame into a spent
cadence and made the bow fire on a metronome whether or not it could hit.

### 3. A pressed special is queued, not wasted

`playerActions.specialAttack` returns early for a bow whose line is empty,
setting `S._bowSpecialQueued`. It spends **no mana**, starts **no cooldown**
and stamps **no swing clock** doing so — a queued special has not happened
yet. The fire site consumes it on the first lined-up frame by calling
`specialAttack` again, which then charges for a special that is genuinely
leaving. It fires *instead of* the ordinary arrow that beat, because
`specialAttack` spends the swing clock itself (v2.3.2464) and letting both go
on one frame is the bundled-shot bug that fix was written for.

The queue expires after `BOW_SPECIAL_QUEUE_MS` (2500, `combatHelpers.js`):
longer than a sweep of the thumb, shorter than a change of mind. A request made
while pointing at nothing must not fire half a minute later at whatever
wandered past.

A "Lining up..." popup floats on the queued press, the same courtesy the
no-weapon and no-mana refusals already get — a control that silently does
nothing is indistinguishable from a broken one.

## The sight stream stops at what it is pointed at

`effectsRenderer` reads `S._bowSight.d` rather than computing its own ray. The
line and the gate therefore cannot disagree about where the shot lands, which
is the one property a sight line exists for. With nothing on the line it draws
its full `BOW_RANGE_PX × bowRangeMult` as before — there it is doing its other
job, showing the player where they are pointing so they can bring it onto
something.

Probe: `window.__btSightBeam().clipped / .sightD / .fullLen`.

## Three times the speed

`ARROW_SPEED_PX` 8 → 24 (`projectiles.js`): 480 px/s → 1440 px/s at 60fps, so
the bow's 675px reach is crossed in under half a second instead of 1.4.

Three guards are measured against that number and all three still hold:

| guard | was | now |
|---|---|---|
| `_segGap`'s sweep cap (a step this long is not flight) | 200px, against a legitimate max of 8 × 2.0 × 3 = 48 | unchanged at 200, legitimate max now 144 — still an **exact** bound, because both the Longshot cap and `_dtScale` are clamped |
| the trail's teleport check (`_updateProjectileTrail`) | 80px | **260px** — at 80 an ordinary Longshot arrow on a stuttering frame read as a teleport and had its streak cleared |
| `mp-arrowdt` (px per wall-clock second at two frame rates) | measured 490 px/s | measures ~1450; its fixture now launches at the west edge of the view, because at three times the speed a 400ms sample ran into the screen-edge plant cap and would have measured the viewport instead of the integrator |

**The server needs nothing.** It never simulates a projectile and has no
travel-time check — `server/src/combat.js` gates zone, a 210ms per-(player,
monster) cadence, the special's 3-per-1200ms and the damage cap, and PvP range
is measured at impact-report time. So speed is client-only with no anticheat
coupling and no caps flag.

## Consequences worth knowing

- **You cannot fire a bow at empty ground any more.** That is the ask, and it
  is the biggest change in feel here. Practice shots, shots to bait, and
  shooting at a wall are all gone for the bow. The staff is untouched.
- **A duel still works.** `firstSightHit` includes the one legitimate PvP
  target — the duel opponent, or a player you tap-locked outside a safe zone —
  by the same rule the impact test uses, so the gate can never open on someone
  the impact would refuse. Without this a bow would have been unable to fire a
  single arrow in an arena.
- **Nothing about range changed.** The 675px plant cap still governs reach.

## Harnesses

`mp-arrowdt` (speed, fixture repositioned), `mp-aimpath` (the aim ladder —
every block that measures a shot now stands a target on the line it is aiming
down, which does not weaken the claim: the monster is not a lock, so the angle
still comes from `_aimAngle` / `_facingAngle` exactly as before),
`mp-jetstream` (the stream's length, now asserted twice — clipped at a target,
and full reach with the line clear), `mp-arrowshot`.
