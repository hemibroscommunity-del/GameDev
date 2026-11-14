# Card A: the report (steps 1.0, 1.1, 1.2, 1.6)

**Starts:** after W and S are merged (both are). PR 7 waits for card H.
**Read:** `CLAUDE.md` (§5 the wire's rules, §7 the page's thread and
memory); the ten rules at the top of part 5 of `docs/GRAND-PLAN.md`; pillar
1 and step 2.1; `docs/SHAPES.md` parts 4, 6 and 7 (the hold names, the
room's row, the day's book); `docs/BUDGETS.md` parts 1, 2 and 6;
`docs/ARCHITECTURE-HANDOFF.md`; `docs/specs/device-profile.md`,
`held-sweep.md`; `tools/qa/mp/held-budget.mjs` (read only).
**Tags:** 5120 to 5139, one a PR, in the order below.
**Browser:** light (`questline`, and the scenario that proves each phone PR).
**Effort:** extra.

## PRs, in order

1. **(tag 5120) One list of hold names** (step 1.0, its first half).
   - Files: new `src/debug/holdNames.js` (no imports), `src/debug/madeLog.js`,
     new `tools/guards/hold-names.test.mjs`.
   - The list: every name a hold may have. It holds every name in the debt
     list (`KNOWN` in `held-budget.mjs`), and keeps a name when card H
     takes its family off the debt list (it can come back).
   - `noteMade` keeps only a name of the list: it maps each caller's
     string (`'strip made'`, `body ${pose}-${dir}`, `'page bases'`...) to
     its name by a table in `holdNames.js`, and drops what maps to none.
     **The callers are not changed** (they are in card H's files).
   - The guard fails a `KNOWN` name missing from the list, and a
     `noteMade` call whose string the table maps to nothing.
2. **(tag 5121) The device class** (SHAPES part 6).
   - Files: `src/game/deviceProfile.js`, `server/test/device-profile.test.mjs`,
     `docs/specs/device-profile.md`.
   - `devClass`: SHAPES part 6's twelve fields and its key, facts only,
     asked in `deviceProfile.js` and nowhere else. `fill` is `none`:
     nothing is timed at the start. No name of a system, browser, chip or
     model, ever.
   - **Reading chosen:** SHAPES gives the class to card O (step 2.1), but
     the report cannot wait for O, and O waits for the reports. So you
     build the class, facts only; card O builds `drawLane` from it later.
   - It touches `server/test/`: its merge deploys the worker.
3. **(tag 5122) The report: the phone's side** (step 1.1).
   - Files: new `src/debug/report.js`; `src/networking/wsClient.js` (the
     one line that lets `report` out); `src/game/renderFrame.js` (its
     `others` count, which reads a map's `.length` and is always 0: the
     report's `near` needs it); `src/ui/mobile/dash/AboutPanel.jsx` (the
     row).
   - SHAPES part 4's fields, exactly: numbers and closed lists only.
     `drawLane` is `full` until card O; `sw` from `CLIENT_SAVERS`; `late`
     only where the pacer gives a verdict (absent otherwise); `died` once,
     after a join. Built off the frame, a few ms at most, at a quiet
     moment: it never measures the page (CLAUDE.md §7).
   - Sent only when `state_sync.caps` has its cap: until PR 4 is on the
     worker, it sends nothing.
   - The About row says, in a player's words: a smoothness report goes to
     the game with no name on it; what it holds; kept 60 days; the switch.
4. **(tag 5123) The report: the worker's side** (step 1.1).
   - Files: `server/src/index.js` (one `case 'report'`), new
     `server/src/report.js`, `server/src/join.js` (its cap, on a NEW line
     of its own, TRAPS §316), `CAP_GATES`, `server/src/liveops.js` (a
     lower-case kill switch), a new suite `server/test/report.test.mjs`.
   - Every field checked: a value off its range or list is dropped. A
     pace: how often one phone may send (your number, in the suite).
   - Two sinks (SHAPES part 4): **smoothness**, the day's book's `dev`
     part through card E's door, by cell (`devClass` key, `drawLane`,
     `sw`, `build`), with no `pid`, no sitting, no address; and the
     **sitting's card**, which card Q builds: until then those facts are
     dropped on the worker.
   - `delay` and `waver` are the worker's own (`waver` is new, in
     `case 'pong'`), and `moves` its own count: never asked of the phone.
   - **Waits for card E's PR 1** (the day's book's frame) on `main`.
5. **(tag 5124) The room's own row** (step 1.6).
   - Files: new `server/src/roomrow.js`; the few lines where each count is
     taken (`tick.js`, `join.js`, `persistence.js`, the room's start in
     `index.js`); its suite.
   - The tick's 95th, rows written (the room counts its own puts), saves
     refused, joins by protocol version, restarts; into the book's `room`
     part. Card E's PR 9 reads your "saves refused": one counter, yours.
   - Also waits for card E's PR 1.
6. **(tag 5125) The Speed test sends its card** (step 1.2).
   - Files: `src/game/speedTest.js`, `src/debug/report.js`, a Test panel
     file of your own mounted from `src/ui/panels/DevPanel.jsx` by one
     line (card E adds one line there too), `server/src/devtools.js`.
   - The card rides the report's `speed` field into the book's `speed`
     part. The model: a place in a list the player picks from (write the
     list: a page cannot read a model).
   - "Copy table" in the Test panel: the day's `dev` and `speed` parts as
     text the owner pastes. **The book is read by ONE admin route**, built
     here; card E's owner's card reads the same one.
7. **(tag 5126) The sweep fails a known hold that left no note** (step
   1.0, its second half). Files: `tools/qa/mp/mp-heldsweep.mjs`.
   **Waits until cards H and J say `done`** in their status files: the
   sweep is theirs while they run. Until then it is under Needs.

## Readings chosen for you

- **The laws that apply:** either side ships first (the cap, gated); a new
  server behaviour has a lower-case kill switch; deny by default (the new
  case is handled on purpose; the worker sends nothing new, so no
  `PRIVILEGED_EVENTS` line); messages and writes cost money (the pace, and
  the book's one put a pace); the page's thread is budgeted. Same-change
  rows: a server behaviour; a screen or window (if the copy table is a
  new window: `states.mjs`, `UI-DESIGN-NOTES.md`, `data-esc`).
- **No free text** from a phone reaches the book (part 8 of the plan).
- **The report is on for every player, with its switch** (the owner's call
  1: yes). "Kept 60 days" is the book's, set by card E's PR 1 (SHAPES had
  left the number to you; it was chosen with the book).
- **Card N's wire table**: once its guard is on `main`, a new case or
  route with no row fails it. Add `report`'s row, and the admin route's,
  in the PR that adds them.
- **The holds' names are H's to change**: when H takes a family off the
  debt list, the name stays on your list.
- Not yours, even where it would help: the pacer (`framePacer.js`), the
  resolution (`renderRes.js`, card G), the callers of `noteMade`, the
  sweep (until PR 7).

## Not yours

`held-budget.mjs` (H); the day's book's file and its `econ` part (E); the
lanes and `drawLane` (O); the reader and the device table (1.3, the
owner's call 6); the sitting's card (Q).
