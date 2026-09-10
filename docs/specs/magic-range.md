# A magic orb reaches as far as an arrow (v2.3.2387)

> Owner: "extend magic projectile range to what it was before (should be same
> as arrow). It just needs to travel further."

**Client only.** No worker change, no deploy — established, not assumed; see
*The server was never the limit* below.

## The two weapons were bounded by different mechanisms

That is the whole bug, and it is why nobody caught the drift.

| | speed | what stops it | distance |
| --- | --- | --- | --- |
| Arrow | 8 px/frame | `dist > 675` **or** the screen edge | 675 px cap |
| Staff orb | 5 px/frame | running out of `life` — nothing else | 68 × 5 = **340 px** |

`projectiles.js` guards the plant rule with `if (!a.isStaff && _released)`, so an
orb is *excluded* from both the distance cap and the edge rule. Its only limit
is `life`, set to 68 at v2.3.1335's "range −25%" pass. Nothing structural ties
the two weapons together, so only a number can keep them level.

### `staff.range` was already 200, and that is a different thing

`WEAPON_TYPES.staff.range` has read 200 — the bow's — since v2.3.2243, whose
commit says *"Magic attack radius will be nerfed to be same as bow"*. That field
is the **PvP reach claim**. It has nothing to do with projectile flight. An
earlier pass made the two weapons match on the field that sounds like range and
left the one that is.

## 340 px does not reach the screen

Measured on a 390×844 phone in a combat zone, from `worldViewport` at
WORLD_ZOOM 3 (scale 0.601, world view 649×1024):

| from the player to… | distance |
| --- | --- |
| the side edge | 301 px — *the arrow's real horizontal reach; the 675 cap never binds on a phone* |
| the top edge | 488 px |
| **the corner** | **573 px** |

An orb died **233 px short of the corner**. You could see a monster, fire, and
watch the orb expire in open ground.

**Horizontally, magic already out-ranged the bow** (340 vs 301). The shortfall
is vertical and diagonal — which is exactly what *"it just needs to travel
further"* feels like from the thumb, and why the fix is not "match the bow's
on-screen reach" but "match its cap".

## What changed

`STAFF_RANGE_PX = 675` — the arrow's own cap, so *same as arrow* is literal
rather than approximate, and it clears the 573 px corner on every phone.
`STAFF_LIFE` is derived (`675 / 5 = 135`), so the two can never disagree.

**Speed is deliberately untouched.** An orb still flies at 5 px/frame against
the arrow's 8: magic drifts, and the special's three orbs are fast/medium/slow
by the owner's own request (v2.3.2262). The ask was distance, so only distance
moved. The cost is flight **time** — 675 px is 135 frames, ~2.25 s at 60 fps,
against the arrow's ~1.4 s to the same distance. If that reads as floaty in the
hand, the lever is the `5`, not this.

## Four call sites, one constant

They live in four different modules, which is how a change like this
half-lands:

| site | what it serves |
| --- | --- |
| `src/game/monsterCombat.js` | the basic shot |
| `src/game/dodge.js` | the retreat shot |
| `src/game/playerActions.js` | the special (solves its own life per orb speed) |
| `src/networking/gameEvents.js` | **the peer mirror** |

The last one is the one to notice. It is what *you* see of someone *else's*
orb, so leaving it at 68 would have made a remote caster's orb die at 340 px on
your screen while it flew 675 on theirs — a desync nobody would trace back to a
range retune.

## The server was never the limit

Checked before touching the client, because a client-only range change that the
worker rejects would look like it did nothing:

- **PvE.** The proximity gate is melee-only — `if (_effSlot === 'melee' && …)`
  against `PVE_MELEE_RANGE` (400), `server/src/combat.js`. Its own comment:
  *"Ranged/staff therefore get no proximity gate at all."*
- **PvP.** `PVP_TUNING.RANGE_CAP` already allows `staff: 950`.

A longer orb reports hits the worker was always willing to settle.

## Coverage — `tools/qa/mp/mp-orbrange.mjs` (10 assertions)

`mp-orbline` measures the magic special end to end and was green throughout;
it never looks at how far anything gets. Nothing in the suite read a
projectile's reach at all, which is how the staff sat at half the bow's.

Sections: the arithmetic at source; **a real orb flying in a real client**
(measured 674 px against the intended 675); the special's three orbs all
solving to 675 while keeping three distinct speeds; the peer mirror; and a
source guard that the old `68` literal is gone from all four sites and all four
read the shared constant.

Mutation-tested: reverting `STAFF_RANGE_PX` to 340 turns **5** assertions red,
including the live flight and the screen-corner check.

Regression: `mp-orbline` 14/16 — the two failures are the pre-existing bow-DPS
and cadence guards (red since v2.3.2265, documented in PR #563). The volley
guard previously recorded as *unproven* now passes cleanly (3 orbs, 3 hits),
confirming it was a flaky fixture.
