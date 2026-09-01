# Every basic attack has a wind-up (v2.3.2215)

Owner: combat feels **"floaty."** The v2.3.2200 feel pack fixed the half on
the player's side — their own hits landed before the blade reached the
target. This is the half on the monster's side.

## What was wrong

`_tickMonsters` resolved the ordinary swing — the one every monster throws
every 1.5s — inside the same 22ms tick that decided it. Decision, block
test, damage, wire event: all one tick. Damage arriving with nothing in
front of it cannot be read, blocked on reaction, or learned from.

Two systems already told the player something was coming, and neither
covered the common case: the telegraph kits (v2.3.1730) fire on a 5-9s
cooldown for three archetypes, and the boss abilities only exist in
dungeons. The attack a player actually eats, over and over, had no
anticipation at all.

Compounding it: **no monster in a live zone had ever played an attack
animation.** `_shootAnimStart` has been read by the renderer for many
versions but was only ever written by the client-local AI, which does not
run for server-driven monsters. The art existed; nothing triggered it.

## What it does now

Stamp-then-resolve, the same shape the kits use — deliberately one state
machine, so there is one set of fairness properties and one place a future
ability hooks in.

1. A monster in range stamps `_bwUntil` and emits `monster_ability`
   `{ability: 'swing'|'throw', phase: 'windup', ms}`. **No damage.**
2. `_resolveBasicWindup` runs before target acquisition (the same placement
   and the same reason as the kits: a player who walks away must not strand
   a pending swing that fires stale at whoever wanders past next).
3. At expiry it re-measures against where the player is **now**, through a
   ring `WHIFF_GRACE` (1.3x) wider than contact range, then lands the blow.

### Durations

Per archetype (`BASIC_WINDUP.MS`), inside a band with two hard edges:
**above** `PARRY_WINDOW_MS` (250) or reacting could not work, and **below**
the kits' 700-1200ms or a jab reads like a slam. Ordered by fantasy inside
it: swarm 350 … brute 600, default 450. Ranged gets a shorter
`THROW_MS` (350) cue before release; the ball's travel time is the rest of
the tell.

### Three properties that are easy to get backwards

- **The cycle does not grow.** `atkCd` is stamped when the wind-up STARTS,
  so it is spent inside the existing 1500ms cadence rather than added to it.
  Stamping at impact instead would nerf every monster in the game by a third
  while looking like a pure presentation change.
- **Block and parry moved to impact time.** The whole resolution moved
  verbatim into `_resolveBasicSwingHit`, which the resolve calls — so the
  shield arc, the parry window, the stamina cost and the thorns reflect are
  read when the blow lands. That is what lets a player raise a shield
  *during* the tell and have it count, and it matches how the kits and the
  snowball impact already resolved.
- **The grace ring is the honest half of the trade.** At 1.0 every
  micro-step out of a 45px ring would whiff and monsters would look broken;
  unbounded, walking away would never work and the tell would be decoration.

### Cancellation

Shield Bash's stun and a parry both clear `_bwUntil` alongside `_tgPhase`.
A stun that stopped the animation but let the pending blow land would be
worse than no stun. Death/respawn clears it too — a respawned monster must
not resolve a swing it started in a previous life.

## Client

The `monster_ability` handler gains a `windup` branch **above** the kit
whitelist, with its own `_bwKinds` table (mirror-audit pins it, for the
reason below). It deliberately renders **no popup, no shake, no beep** — a
label on every jab is noise, and noise is what made the shipped kit
telegraphs unreadable. It drives the monster's body instead: the existing
`_windupFx` throb, plus `_shootAnim*`, which is what finally lights up
attack sheets in live zones.

`snowmanSprites.js` gains the five directional attack strips
(`snowman-attack-{s,e,sw,n,ne}.png`, mirrored to all 8 facings like the idle
set) and the snowman render branch plays them during the wind-up, below the
hit reaction — being struck interrupts the throw, which is what the recoil
is for. **Every future per-monster attack strip lights up with no further
wiring**: add the art, register it, and the cue already fires.

### Why the whitelist is pinned

The client renders only ability strings it has a table entry for and
silently drops the rest. That is how the kit telegraphs shipped
authoritative and *invisible* for versions. `mirror-audit` now pins the
basic-windup pair too, and additionally checks every duration key is a real
archetype — a typo would silently fall back to DEFAULT and one monster
would quietly lose its tuned tell.

## Deploy order

No caps flag needed, and none added. `monster_ability` is already in
`PRIVILEGED_EVENTS` and already display-only by contract (damage rides
`monster_attack`). An **old client** hits its whitelist `break`, renders
nothing, and takes the damage ~windupMs later — indistinguishable from lag.
A **new client against an old worker** simply never receives a windup event.

## Difficulty

This makes monsters strictly easier: every basic attack is now dodgeable and
blockable on reaction. Accepted deliberately — the owner rates the early
game easy already, and a readable fight is the point. If it overshoots, the
dials in order are `WHIFF_GRACE` toward 1.15, then shaving the fast
archetypes. Do **not** raise damage or shorten cooldowns to compensate; that
trades a readability win for a numbers loss.

## Tests

`combat-lifecycle` gains a wind-up block pinning: the cue precedes the blow;
nothing lands while the tell is running (asserted with a second pass *during*
the tell — "no damage in the tick that stamped it" would pass even for a
zero-length wind-up); the duration band; walking out whiffs; a shield raised
during the tell still blocks; the cooldown is stamped at the start; a
cancelled wind-up lands nothing. Each was verified to FAIL against a
deliberately broken build (zero-length wind-up, whiff check removed,
cooldown moved to impact).

`tools/qa/mp/mp-basicwindup.mjs` drives a real worker in a real spoke zone
and asserts the tell reaches the browser before the damage. Two traps it
documents for the next author: `window.__btDispatch` is a test-injection
helper that real inbound messages bypass (wrapping it observes nothing), and
the player must WALK — a teleport is rejected by the anti-cheat speed cap,
leaving client and server disagreeing about where the player stands.

## Attack-strip timing: split at the release frame (v2.3.2216)

An attack sheet is **not** uniform anticipation, and timing it as though it
were is a bug that looks like lag. The snowman's 8-frame throw strips run
0-4 wind-up (ball picked up, raised, body coiled), **5 release** (the ball is
drawn detached and airborne), 6-7 follow-through with empty hands.

v2.3.2215 spread all 8 evenly across the server's wind-up, which put the
drawn release at 62.5% of a 350ms tell. The snowman threw at ~219ms, his
drawn ball then vanished for the two empty frames, and the *real* projectile
did not exist until 350ms — a ~130ms hole where he had visibly thrown
nothing. Reported by the owner on 2026-09-01 as "an awkward disconnect
between the snowball thrown from his hand and when the projectile appears."

The rule: **anticipation frames fill the wind-up; the release frame starts
at the instant the server creates the projectile; follow-through plays
after.** Concretely `perFrame = windupMs / releaseIdx` (not
`/(releaseIdx + 1)` — the release frame must *start* at the end, not end
there), and the render window extends past `_shootAnimEnd` by
`perFrame * (frameCount - releaseIdx)`. For the snowman that is 5 x 70ms of
wind-up then 3 x 70ms of follow-through, which fits inside the server's
`ms + 300` post-throw freeze, so he holds still through it.

Latency does not reopen the gap: the wind-up event and the projectile both
cross the wire, so both client timestamps shift by the same half-RTT.

**Every new attack strip must declare its own release index**
(`ATTACK_RELEASE_FRAME` in `snowmanSprites.js` is the pattern). A sheet whose
projectile leaves mid-strip and is timed uniformly reproduces this exactly.

## One strip per attack KIND (v2.3.2216)

The wire carries `ability: 'swing' | 'throw'`, and the client stamps
`_shootAnimKind` from it. This is load-bearing, not bookkeeping: the
snowman's ranged band is `minRange: 100`, so inside 100px — which is exactly
where you stand to fight him — he **melee-pokes**. v2.3.2215 stamped the
animation fields for both kinds, so every melee poke played the snowball
throw: a ball appeared in his hand and no projectile ever followed it.

The renderer gates the throw strip on `_shootAnimKind !== 'swing'` (compared
against `'swing'` rather than equality with `'throw'` so the client-local AI's
unstamped shoot path still animates as it always did). `mirror-audit` pins
both halves — the stamp and the gate — because either alone is useless.

A melee attack strip for the snowman is **still missing art**; until it
exists his melee poke shows the body throb only.

## The ball leaves his hand, on the ball's own tick (v2.3.2217)

Two follow-ups to the same playtest, after v2.3.2216 aligned *when* the
release happens.

**Where.** The server can only create the snowball at the monster's logical
point, which for the snowman is his FEET — his sprite is anchored
bottom-centre at `y = +13` and stands 64px tall, so the logical point sits
near the bottom of the art. His hand is 17-45px above it and off to one
side, so the ball popped into existence at his base rather than out of his
claw.

`snowmanSprites.throwMuzzle(facing)` now returns that offset, measured off
frame 4 of each strip (the last frame the ball is still held) and stored as
**source pixels**, so the anchor/scale maths lives in one place. The
renderer publishes it for the facing it is actually drawing
(`_muzzleX/_muzzleY`) because facing is renderer-derived from movement
history — it is not on the wire. Mirrored facings negate x, exactly as the
strip is flipped.

The offsets are not interchangeable: he holds the ball overhead facing
south, east and north (`dy` about -40 to -45) but low and to the side facing
southwest (`dy` -17). One flat offset would be visibly wrong for at least
one facing, which is why this is a table. Re-measure the same way if the art
is redrawn: render frame 4 at 3-5x with a 16px grid and read the centre.

Moving the launch point is safe because `monster_projectile` is display-only
— the server scheduled the impact, aimed at a frozen point, and delivers the
damage itself. Travel time is unchanged: `life` is in frames and `speed` is
re-derived from the new distance, so the visual still lands exactly when the
authoritative hit does.

**When, exactly.** Timing the release to the wind-up's own end is right in
theory but races it in practice: the server resolves on a tick boundary and
the event crosses the wire, so the ball arrived a beat after the arm had
thrown — a small residual lag. The release is now driven by
`monster_projectile` itself, which cannot drift because it *is* the ball
appearing. The anticipation frames hold on the cocked pose until it lands
(normally a frame or two; it reads as weight), with
`THROW_RELEASE_GRACE_MS` as the escape hatch — a throw wind-up **can**
resolve into no ball at all (target gone, or an earlier ball still in the
air), and without it he would hold the cocked pose forever.

**The release frame is deliberately skipped.** Frame 5's entire content is a
drawn ball in mid-air, and the engine now draws the real one at his hand on
that same tick. Playing it would put two snowballs on screen a few px apart.
The strip therefore runs 0-4, then 6-7.

## The thrown ball is his own ball (v2.3.2217)

The projectile was three stacked `Graphics` circles — a white orb with a
cold rim — because when it was written there was no snowball sprite in the
repo. Next to the detailed, shaded ball in his claw it read as "a plain
white circle" (owner, 2026-09-01).

There is one now, and it is the same drawing:
`public/sprites/monsters/snowman/snowball.png` is **cut from frame 5 of the
south throw strip**. That is the frame the wind-up deliberately skips — and
it turns out to be the only place the artist drew the ball *in flight*:
standalone, larger (it is coming toward the viewer), and free of the brown
claw that wraps it in every held frame. Every frame-4 crop carries claw
fragments; that one is clean. So the frame is not wasted after all — it
became the projectile.

Cut with a circular mask at r=16 centred on (32, 78) in the source cell,
with a 1.5px soft edge. Wider radii pull in a dark arc from behind the
ball; re-cut the same way if the art is redrawn.

Drawn at the strips' own 0.5 scale, which is what makes the ball in the air
and the ball in the hand read as one object. It does not rotate — the
highlight is lit from one side, so spinning it would look wrong.

It loads inside `loadSnowmanSprites`, so it rides the frost zone's
`preloadZoneAssets` await and needs no separate registration (the preload
law's zone-asset exception). **The procedural orb is kept as the fallback,
not deleted:** the art is a per-zone asset, and a ball you cannot see is a
ball you cannot dodge.
