card: A
branch: claude/plan-a-6-speed-card (one branch a PR, each begun from the one before: -1- to -7-; merge them in order)
prs: #1688, #1692, #1703, #1706 (merged); #1708 (5124), #1711 (5125): mended for sitting 5, ready
state: ready

## Done

- #1688, #1692, #1703 (5120 to 5122): merged at sitting 3; #1706 (5123,
  with sitting 3's and 4's mends tagged 5127) at sitting 5.
- #1708 (5124): `roomrow.js` into the `room` part. Sitting 4's: in the
  map (`server-core`); the last one out (`leave.js`, one line) writes
  the book at once (roomrow.test 9). Sitting 5's: only after a join
  since its last write (a socket that never joins, a kick's second
  close: nothing); three turns in hand, one back each 5 minutes, every
  put of the book spending one (the door's too: the storage's wrapper),
  a turn beyond a put running; `roomrow: false` stops it; two last-outs
  in one put never side by side. roomrow.test 10, cost-guard 15c (an
  hour of storms: 14 rows, line 18), SHAPES's book row.
- #1711 (5125): the Speed card into `speed`; GET /dev/daybook; "Copy
  table". Sitting 4's (report.test 12): `caps.report` 2 takes the card
  (`reportspeed: false` 1); the table reads the smaller cell.

## Next

- Sitting 6's list.

## Found

- Card O: `split` goes only with `late`, where the pacer judges (over
  ~70 a second); when O's pacer judges at every rate, it follows.
- Card O: still asking the device outside `deviceProfile.js`:
  `paletteTex.js` (`SOFTWARE_GL`, held to `SOFT_GL`), `peerImpostor.js`,
  `crashTrap.js`, `bodyBake.js`.
- Card Q: a sitting card keeping `soft`, `seen`, `drawn` changes the About row's "no name on it".
- Card E: a part reckoned ~4 times its stored size (a closer one: more
  room); a `bookFlush` export would spare `roomrow.js` the door's memory.

## Needs

- PR 7 waits until cards H and J say `done`.
