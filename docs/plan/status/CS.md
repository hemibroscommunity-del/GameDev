card: CS
branch: claude/plan-cs-1-switches-on
prs: PR 1 (6000) ready
state: ready

## Done

- PR 1 (6000): the six cost switches ON by default (`reqstamp`,
  `fullsnap`, `xferescrow`, `resetbook`, `seathold`, `freezedevice`), each
  off by its live flag set to false; rows, tests, cost-guard lines (§8 the
  roster's 2 and §17 the losing stake's ledger row, counted apart).

## Next

- PR 2 (6001): the usage meter (devtools.js /dev/ read, the Test panel).

## Found

- docs/specs/req-once.md, seat-hold.md and the other switches' specs still
  say "off by default" (outside the card's files: left for their owners).
- Comments in duel.js, gladiator.js, market.js, store.js, storeoffer.js and
  playerroads.js say `xferescrow` is "OFF by default" (not this card's
  files; RV holds market/store/storeoffer): stale since 6000.
- precheck's server-tests step (a 5-minute cap, tools/dev/precheck.mjs)
  times out on this 4-core box: `npm test` alone takes ~8 minutes, 7 of them
  guards/switches-thrown.  The suite passes when run by itself.
- #2139 holds K2's #2136 (merged in, the gatekeeper's sitting 45): it
  lands after #2136; `seathold`'s thrownFails is listed on it.
- ownerSwitches.js's Set-a-switch chips do not list the six; typing the
  name works (src/game/, not this card's files).

## Needs

- PR 1: the gatekeeper's list, after K2's #2136.  It changes K2's
  flood-guestshare.test (§3, §4: `seathold: false`, told to K2).
- PR 2: its files outside the card answered by the planning session.
