# A waiting crowd knocks more slowly (v2.3.5604, card OPS PR 5)

Red team RT-2, F2 (`docs/security/rt2-findings.md` on #1867).

## Why

A full room answers each waiting phone `room_full` with `retryMs`, and the
phone tries again after it (`wsClient.js` `_rfDelay`: clamped 2-30 s,
+-20% jitter). The worker always asked for 5 s, so 2,000 phones waiting were
~400 requests a second into the room's one thread, beside the 120 playing.

## What

`server/src/rfspread.js`. The room counts its refusals over the last 10 s
(in memory, nothing written) and asks for

    retryMs = 5000 x max(1, refusals a second / 40), at most 30,000

- Up to 40 knocks a second (about 200 waiting) nothing changes.
- A crowd of W settles at about sqrt(8W) knocks a second: 800 waiting knock
  ~80 (not 160), 2,000 ~126 (not 400), 5,000 ~200 (not 1,000); past ~7,200
  the phone's 30 s ceiling holds them at W / 30.
- Who gets in when a seat frees is as fair as before: every waiter is asked
  the same at the same moment, and the jitter spreads them.
- Counted (mended for sitting 19b, its gatekeeper's review): only the
  refusals the game's phones obey, `?rf=1` (the full room's and the address
  limit's, `reason: 'ip'`), and an address at most once a second. It counted
  an old client's 503 too, before the address limit: one client sending 240
  upgrade requests a second (no socket needed) set every waiter's wait to
  30 s. An old client's 503 is answered as before and counted nowhere. No
  client change: the phone has obeyed `retryMs` since v2.3.1982.

## Measured (local runtime, cap 1, 800 phones obeying `retryMs`)

| | knocks a second | asked | busiest runtime thread |
|---|---|---|---|
| main | 159 | 5 s | 38% |
| this | 81 | ~10.6 s | 21% |

## The switch

`rf_spread: false` in the live flags: 5 s always, as before (the count is
still kept).

## Tests

`server/test/rf-spread.test.mjs` (the arithmetic, the window, the room's
answer, the switch, and a simulated crowd settling at sqrt(8W)).
