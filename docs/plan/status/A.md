card: A
branch: claude/plan-a-7-heldsweep (PR 7, tag 5126, not begun: it waits on cards H and J)
prs: #1688, #1692, #1703, #1706, #1708, #1711 (merged); PR 7 (5126) not begun
state: stalled

## Done

- #1688 (5120): one list of hold names (`src/debug/holdNames.js`).
- #1692 (5121): the device class (`deviceProfile.js` `devClass`).
- #1703 (5122): the field report, the phone's side (`src/debug/report.js`).
- #1706 (5123; sitting 3's and 4's mends tagged 5127): the worker's side,
  into the day's book's `dev` part by cell; `caps.report`.
- #1708 (5124): the room's own row (`roomrow.js`) into the `room` part;
  the last one out writes the book, after a join or a save refused, at
  the book's pace (sittings 4 to 6).
- #1711 (5125): the Speed test's card into `speed` (`caps.report` 2,
  `reportspeed`); GET /dev/daybook (its wire row); "Copy table".

## Next

- PR 7 (5126): mp-heldsweep fails a known hold that left no note (step
  1.0, its second half; `tools/qa/mp/mp-heldsweep.mjs`), once H and J
  are done.

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

- Cards H and J to say `done` (the card's own wait for PR 7): H is
  `ready` (#1741, its PR 10); J's file on `main` says `ready`.
