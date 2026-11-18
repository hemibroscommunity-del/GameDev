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
- K2's PR 13 (5732) mends guestshare's refusal in seathold.js: once it
  lands, seat-hold.test thrown (`seathold: false`) runs on past §3, and
  `seathold`'s thrownFails (switches.mjs) is re-listed by whichever lands
  second; K2 also edits flood-guestshare.test §3 (both hold my lines).
- ownerSwitches.js's Set-a-switch chips do not list the six; typing the
  name works (src/game/, not this card's files).

## Needs

- PR 1: the gatekeeper's list.  It changes K2's flood-guestshare.test
  (§3, §4: `seathold: false`, told to K2).
- PR 2: answered by the planning session (2026-11-18): a new
  src/ui/panels/UsageMeter.jsx and one line in DevPanel.jsx; one counting
  call each in roomrow.js's wrapper and send.js's door (told to K2); the
  meter in a new server/src/usagemeter.js, read by GET /dev/usage.
