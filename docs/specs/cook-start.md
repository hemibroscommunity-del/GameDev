# A cook is a cook the worker started (v2.3.5553)

Grand plan step 4.2, the cook's result; card K PR 14. A switch, `cookstart`,
that landed **OFF** (the owner's choice); **ON since v2.3.5727** (card K2 PR
8), decided for the owner while away by the planning session on the owner's
words of 2026-11-17: *"Go recommended on all."* `cookstart: false` turns it
off.

## Why

The claims bench (`claims-gain.test`, row `cook`) measured a cheat at 1.59
times an honest cook's fish an hour. `cook_request` was believed on its own:
no start, no fire and no gesture were asked of it, only the 45 a minute and
the 900 ms between cooks.

## What it does (on: the default since v2.3.5727)

An honest page starts every cook (`extraction_start`, skill `cooking`):
`gathering.js` `_planCookHits` rolls its plan (`ps._cookHits`) and sends it
(`gather_hits`). The page plays the hits and the flip gesture, then sends its
result. With the switch on (`cooking.js` `_cookStartOk`, then
`_cookStartTake`):

- a result lands only on that plan: the same fish, and once;
- no sooner than its hits and the gesture could be played: each hit's 650 ms
  beat after the first, plus the honest cycle's floor (1,510 ms: the lead,
  the settle and the gesture's 1,200), times 0.7 for the network;
- a worker that restarted mid-cook has no plan (memory is wiped and the
  player joins again), so one result with no plan is taken a session.

A result without these is dropped without using the fish, and the player's
state is sent back, as the rate's drop.

The plan is SPENT only once the result has passed every check: v2.3.5727
(sitting 36's review, Found (c)) split the judge in two. `_cookStartOk` only
looks; `_cookStartTake` marks the plan used (or the session's one no-plan
result spent) after the 900 ms floor and the bag's fish check, so a result
those drop keeps its plan for the next (`cookstart-on.test` 3-5). A cooked
fish clears its plan (`ps._cookHits = null`), so the result after it has no
plan and can take only the session's one no-plan result. A test-mode character is left as it
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

On unless `cookstart: false` in the live flags (v2.3.5727); thrown, a cook
is judged as before it. With it on (the default), the bench's cook gain is 0
(claims-gain 3, `cook`'s line 1.59 -> 0); off, 1.59 (claims-gain 2h, its off
side explicit). `cookstart-on.test` holds the default and the spend.
