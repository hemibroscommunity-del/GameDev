# A bow's claim is an arrow the worker saw leave (v2.3.5550)

Grand plan step 4.2, "a sword's claim labelled a bow's" (TRAPS §329); card K
PR 14. A switch, `bowshot`, that landed **OFF** (the owner's choice); **ON
since v2.3.5727** (card K2 PR 8), decided for the owner while away by the
planning session on the owner's words of 2026-11-17: *"For all decisions
waiting on me just go recommended."* `bowshot: false` turns it off.

## Why

The claims bench (`claims-gain.test`, row `bowlabel`) measured a cheat at
3.3 times the best honest archer's kills an hour. With a bow worn, the worker
believed five `ranged` claims a second (`hitproof.js` `_hitRateTake`) on
anything in the bow's reach, whether an arrow was ever loosed or not: a
sword's blow with a bow's label.

## What it does, with `bowshot: true`

`server/src/bowshot.js`, from `index.js` (the arrow's relay) and `combat.js`
`_handleMonsterDamage` (the claim):

1. **The arrow.** Every arrow a page looses is relayed first
   (`player_projectile`). The worker counts it at the bow's own rate: one a
   cycle (`freeswing.js` `_pfBowCycleMs`, the quickest a page looses, the
   flicked bow's), from an allowance of two.
2. **The claim.** An ordinary `ranged` claim on a monster lands on one of the
   last 8 arrows counted: the one it names (`sw`, a drawn arrow's), or else
   the oldest with a target left. Each monster once an arrow, and an arrow's
   1 + Piercing targets at most. With none, the claim draws an arrow from the
   same allowance, as its relay would have: a relay lost to a dropped line or
   to the relay's own bucket costs an honest arrow nothing. With the allowance
   spent, the claim is dropped quietly and counted as `shot`.

So the bound is **arrows at the bow's own rate, each with its targets**. A
paid retreat's arrow is one more, free: while the retreat the worker charged
is on, its arrow (relayed or not) costs the allowance nothing.

Left as they are: a paid special's claims and everything inside its window
(the volley's stuck arrows' chips, its burning patch), a staff's bolts, a
test-mode character, and an arrow at a player. Nothing is stored: `_bs` lives
on the player's state in memory.

## The numbers (claims-gain.test 2f)

| | Off (today) | On |
|---|---|---|
| The honest archers (the plain, the stepping, the flicking) | as before | the same, no refusal on any disturbance |
| The bow's cheat, its gain | 3.3 | **1.60** |

The bar is 1.5. What is left is the bow's **reach**: 1,490 px (`hitproof.js`
`_hitReach`: 675 x Range, 150 of slack, and a second of running at the flat
500 px a second), so the cheat stands back and never walks. That is the next
judge. With `movetop` on, the run's speed could follow the player's own top.

**Phone tests with it on** (a local run): `bowfeel` 21/21, `questline`
187/187, `bowprops` 23/24 (its Town Hall check, red on main too: card L's
Found). The suites that claim arrows with no relay faster than their
character's bow (`hit-proof` 4b) fail with the switch thrown, by design; its
row lists them.

The bench gained an honest way in this PR: **the flicking archer**, a shot
every 371 ms (the free-swing trial's flicked bow). With it, the bow's gain
with the switch off reads 3.3 (it read 3.76 against the 495 ms archer).

## Switch

On unless `bowshot: false` in the live flags (v2.3.5727); thrown, the bow is
judged as before it. With it on (the default), the bench's bow gain is 1.60
(claims-gain 3, `bowlabel`'s line 3.3 -> 1.6); off, 3.34 (claims-gain 2f,
its off side explicit).

## The reach and the path (card K4, v2.3.5901 and v2.3.5904-5905)

- **`bowreach`** (ON; `bowreach: false` turns it off, and it turns off with
  `bowshot`): a claim on an arrow seen lands only with the monster within the
  arrow's own flight of where the archer stood at its relay (hitproof.js
  `_hitArrowReach`: 675 px x Range + 400 px of slack), not the hit test's
  reach from where the archer stands now. A claim with no arrow seen gets 3,
  then one every 3 s. claims-gain 2g.
- **`bowpath`** (an opt-in, OFF as merged; the owner's): a claim on an arrow
  seen lands only for a monster near that arrow's line (200 px beside it,
  measured to the monster's body: its feet up 130 px, a boss's 260; plus the
  landing's 8 degree turn) and no sooner than the arrow could have flown
  there (1,440 px a second x Range, less 300 ms). While it is on the worker
  advertises `caps.bowPath`, and a phone told it sends a bow arrow's relay at
  RELEASE with the line the arrow flies (projectiles.js `relayShot`): the
  line was set at release, a frame or more after the fire the relay used to
  leave at, and a held aim moves on in between (the gatekeeper's sitting 45).
  Turning it on therefore also moves every bow relay ~110 ms later (the
  bow's nock) for phones on the new page, and watchers draw the arrow on the
  line it flies. claims-gain 2j: the path's liar 1.20; every honest archer,
  its arrows at the real 1,440 px a second, unrefused on every disturbance.
