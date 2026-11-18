card: CS
branch: claude/plan-cs-2-usage-meter (PR 2, stacked on #2139)
prs: #2139 (6000) ready; PR 2 (6001) ready
state: ready

## Done

- #2139 (6000): the six cost switches ON by default, each off by its live
  flag set to false; rows, tests, cost-guard lines (§8 the roster's 2, §17
  the losing stake's ledger row, counted apart); OPERATIONS says so.
- PR 2 (6001): the usage meter, in memory only (server/src/usagemeter.js,
  GET /dev/usage), the Test panel's Usage box, OPERATIONS "Watching the
  cost".  Files outside the card, as the planning session allowed
  (2026-11-18): index.js (the mixin), roomrow.js and send.js (one count
  each; K2 told), DevPanel.jsx (one line), src/ui/panels/UsageMeter.jsx.

## Next

- The card is done once both merge.

## Found

- The switches' specs (req-once.md, seat-hold.md ...) and comments in
  duel.js, gladiator.js, market.js, store.js, storeoffer.js, playerroads.js
  still say "OFF by default" (not this card's files): stale since 6000.
- precheck's server-tests step (5-minute cap) times out on this 4-core box:
  `npm test` alone takes ~12 minutes, mostly guards/switches-thrown.
- K2's PR 13 (5732) mends guestshare in seathold.js: `seathold`'s
  thrownFails is re-listed by whichever of #2139 and it lands second.
- ownerSwitches.js's Set-a-switch chips do not list the six; typing the
  name works (src/game/, not this card's files).

## Needs

- The gatekeeper's list: #2139 first, then PR 2 (stacked on it).
