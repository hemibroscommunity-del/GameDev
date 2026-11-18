card: CS
branch: claude/plan-cs-2-usage-meter (PR 2, stacked on #2139)
prs: #2139 (6000), #2152 (6001): both merged
state: done

## Done

- #2139 (6000): the six cost switches ON by default, each off by its live
  flag set to false; rows, tests, cost-guard lines (§8 the roster's 2, §17
  the losing stake's ledger row, counted apart); OPERATIONS says so.
- PR 2 (6001): the usage meter, in memory only (server/src/usagemeter.js,
  GET /dev/usage), the Test panel's Usage box, OPERATIONS "Watching the
  cost".  Files outside the card, as the planning session allowed
  (2026-11-18): index.js (the mixin), roomrow.js and send.js (one count
  each; K2 told), DevPanel.jsx (one line), src/ui/panels/UsageMeter.jsx,
  and one `in` row in K2's server/src/wire/http.js (/dev/usage).

## Next

- Nothing: the card is done (both merged at sitting 46; marked done by
  the gatekeeper, sitting 47).

## Found

- The switches' specs (req-once.md, seat-hold.md ...) and comments in
  duel.js, gladiator.js, market.js, store.js, storeoffer.js, playerroads.js
  still say "OFF by default" (not this card's files): stale since 6000.
- precheck's server-tests step (5-minute cap) times out on this 4-core box:
  `npm test` alone takes ~12 minutes, mostly guards/switches-thrown.
- #2139 holds K2's #2136 (merged in, the gatekeeper's sitting 45): it
  lands after #2136; `seathold`'s thrownFails is listed on it.
- ownerSwitches.js's Set-a-switch chips do not list the six; typing the
  name works (src/game/, not this card's files).

## Needs

- Nothing.
