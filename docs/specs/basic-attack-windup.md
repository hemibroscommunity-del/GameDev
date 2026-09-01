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
