# A cook is a cook the worker started (v2.3.5553)

Grand plan step 4.2, the cook's result; card K PR 14. An opt-in switch,
`cookstart`, landing **OFF**: turning it on is the owner's choice, because it
changes how a cook is judged.

## Why

The claims bench (`claims-gain.test`, row `cook`) measured a cheat at 1.59
times an honest cook's fish an hour. `cook_request` was believed on its own:
no start, no fire and no gesture were asked of it, only the 45 a minute and
the 900 ms between cooks.

## What it does, with `cookstart: true`

An honest page starts every cook (`extraction_start`, skill `cooking`):
`gathering.js` `_planCookHits` rolls its plan (`ps._cookHits`) and sends it
(`gather_hits`). The page plays the hits and the flip gesture, then sends its
result. With the switch on (`cooking.js` `_cookStartTake`):

- a result lands only on that plan: the same fish, and once;
- no sooner than its hits and the gesture could be played: each hit's 650 ms
  beat after the first, plus the honest cycle's floor (1,510 ms: the lead,
  the settle and the gesture's 1,200), times 0.7 for the network;
- a worker that restarted mid-cook has no plan (memory is wiped and the
  player joins again), so one result with no plan is taken a session.

A result without these is dropped without using the fish, and the player's
state is sent back, as the rate's drop. A test-mode character is left as it
is (`testmode.js`).

## The numbers (claims-gain.test 2h)

| | Off (today) | On |
|---|---|---|
| The honest cook, fish an hour | 1,508 | 1,508, no refusal on any disturbance |
| The cheat's bare `cook_request` | 1.59 | **0.00** |
| The cheat that starts each cook and sends the result at the plan's quickest | (n/a) | **0.99** |

**Phone tests with it on** (a local run): `hitladder` 50/50, `fishvariants`
19/19, `questline` 187/187.

## Switch

`cookstart: true` in the live flags turns it on; absent or `false`, a cook is
judged as before.
