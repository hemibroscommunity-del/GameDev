# Known debts (v2.3.6272, v2.3.6273, v2.3.6274, v2.3.6275; the owner's line of 2026-11-24)

The owner, 2026-11-24, asked "May I draw the line there?": *"Yes."* The
finish is a fixed list (`docs/plan/finish.md` part 2). A reviewer's finding
after that line comes HERE, one line a debt, not to a new card or session.
A bug in how the game behaves is not a debt: it is still fixed (and held,
`finish.md` part 8).

Each line: the card, the file, and the plant or finding that shows it.
"Green" means the plant stays green in the named guard. Written from the
gatekeeper's reviews of sittings 58 to 62 (`docs/plan/census/review-z58.md`,
`review-z59.md`, `review-z60.md`, `review-z61.md`, `review-z62.md`) and the orchestrator's own list, for
every finding that no PR on sitting 60's list mends. A finding on a HELD PR
stays with that PR until it lands, and is marked (held).

## WHO

- `server/src/sitting.js` `open()` ~179: `m.has(rec)` for `m.get(rec) ===
  s` green in `sitting` (60; 61: still green, no reachable difference
  today: nothing replaces a mapped record's `_econ.s` without a join).
- The trace's shadow disagrees with the real check in three places that
  change only a recording's would-refuse counts: `cooking.js:1076`,
  `cooking.js:1044`, `movement.js:711` with `playtrace.js:217` (the
  orchestrator).
- `server/test/sitting.test.mjs` 7c: its second `POST false` ("off while
  off") masks `liveops.js` `sitFlagSet(this)` moved above `flags[name] =
  value` (reads the old flag; red, g = 604801, with that line out) (61).
- `server/src/movement.js:819` `sitMove(this, ps, _now, over > 0)` (a
  gust-paid move counted over budget) green in `sitting` (61).
- `tools/guards/wire-hostile.test.mjs`: the tree does not follow the copy
  made in `playtrace.js` `note` ~158: `if (m.gm === 1) ...` and
  `room._botSeen(session, m)` after the copy green in `wire-hostile` and
  `playtrace` (61).
- `server/src/report.js`: the `sitReport` call, once PH's #2279 is in (the
  orchestrator).
- `server/test/shapes-once.test.mjs` §4 guards the actor's kind by a text
  pattern, against rule 2 (58; WHO or DG).

## WL

- `server/src/party.js` `_partySend`: `const _k = ['status'][0];
  payload[_k] = 'resolved';`, `Object.assign(payload,
  Object.fromEntries([['status', 'resolved']]))`, a helper `_fin(o, k =
  'status')` green in `phase-table` (60; inside its declared fence).
- `tools/guards/phase-table.test.mjs`: the fence's three unguarded counts
  (2,111 `x[k] = v`; 776 spreads; 434 `Object.assign`) are words, not
  falling lines (60).
- The phases' wall: `phase-table` is a fence on literal keys; 17 worker
  doors; a shadow compared in the running room (the orchestrator).
- `tools/guards/_tree.mjs` `objectKeys` ~44: a `SpreadElement` skipped
  silently; the scoreboard prints a wrong number, not "not measured" (58).

## PH

- The governor at a mild heat (main's own, the PH stack improves it):
  the suite's model at 60 Hz, heat 1.4 (tau 180 s), seeds 11-16, makes
  75-88 rate changes in the second half hour on `main` 598cfd38, 47-64 on
  PH's head 0b5b72a4 (34 with no governor at all: the phone's own edge);
  the player sees 60/40/30 every 22-35 s. `frame-pacer` 24a says "every
  heat" but runs 1.6, 2.1 and 3.2: add `hot: 1.4` at 60 and 1.2 at 120
  (61). The owner's phone test (`finish.md` part 9 item 1, `?govern=0`)
  is the judge.
- `src/game/framePacer.js`: at 60 Hz with the chip x4 for good, each
  failed try on the capped wait dips 30 -> 24 for a 10 s window; no check
  holds the rate's dip on a failed try (61).
- `tools/qa/mp/memory-budget.mjs` `buffers`: reads 24.8 on its 24.8 line,
  the next to flap (61: read 24.9 once, 24.8 on the re-run, on PH's head;
  the stack adds no buffer); its row carries a stray "40.0 -> 42.5, RAISED" comment
  copied from the heap's row (60; the orchestrator).
- `tools/qa/mp/held-budget.mjs` `'server-message'` raised 17 -> 40 is green
  in `gate-steps` and `held-sweep`; nothing in node guards a silent raise
  of the art, gpu, canvases, sound or workers lines (59).
- `memory-budget.mjs`: artCache's `measured` 16.2 against its line 79.3;
  heap and buffers' `measured` stale (58).
- `server/test/frame-pacer.test.mjs:943` (23g, card O's) guards the
  governor's gate by a regular expression, against rule 2 (59).

## CT

- `src/ui/BroTown.jsx` ~5365 (#2293): a later write to `dx`/`dy` (`var _h =
  heldDirection(S)`, a `K['w']` line, `S._stickVec`), `_playerDead =
  false;` before the stick, the clock through a field
  (`stickZones.js:214` `S._frameNow`): green in `stick-zones` (59).
- `src/ui/BroTown.jsx:10518` `S['_latch' + 'Phase'] =
  'idle'` green in `latch` 4 and `state-ledger`; `:11702` `Sb.autoAttack =
  !!_lp` green; the mode-5 wiring has no node guard, only the phone
  scenario (60).
- `tools/qa/mp/mp-twobuttons.mjs:343` (61: 2c at :477): its SKIP asks neither
  the lock on the target, the phase active nor a small gap (60).
- `tools/qa/mp/mp-twobuttons.mjs` step "3. upright: a shield in hand
  (guard)": once in three runs (CT's on 67ba711e) the shield never came,
  so 3b-3d saw no Block (74 of 78); the rerun 78 of 78 (62).
- `tools/guards/four-lines.test.mjs`: BroTown has 62 lines of room (8308
  against 8370), so new logic in `gameLoop` is not seen (60).
- A 280 ms hitch inside a swing misses its hit test (the orchestrator).
- The one gate (`latch.js` `twoButtonsLive()`, #2308): `targeting.js:670`
  `const live = twoButtonsOn; live()`, `mc['twoButtons' + 'On']()`,
  `twoButtonsOn.call(null)`, a re-export `export { twoButtonsOn as
  stickTwo }` used elsewhere: green in `latch` (61).
- `src/ui/BroTown.jsx:11702` `manualMode() === 5` in place of the gate;
  `:5364` `S.autoAttack = true` for `_lw`; `:10518` `S.autoAttack =
  false`: green (61).
- `src/game/targeting.js:515`: the keep through a helper `_keep(lt, id)`
  that skips `lockRefPresent` green in `latch` (61).
- `src/game/latch.js` `latchHolds` and `BroTown.jsx:10518` do not ask the
  gate: a pointer that turns to a mouse mid-latch keeps the phase active
  (not an iPhone path) (61).
- #2330's wiring (`ControlsTutorial.jsx:123` `const two = true`,
  `QuestCoach.jsx:562` the old words always, `DevPanel.jsx:985` the row)
  is held only by the phone scenario (61).
- `src/game/controlVisibility.js`'s header names
  `server/test/control-visibility-ct.test.mjs`, which does not exist
  (`sight` 8 is its test) (61).
- `src/ui/BroTown.jsx:11828`/`:11831`: both `twoButtonRelease` calls taken
  out of `bE` green; no node guard reads Attack's lift (63).
- `src/ui/BroTown.jsx:11710`: the slide measured from `bSwipe.lx/ly` green;
  `mp-twobuttons` never moves Attack's finger (63).
- `src/ui/BroTown.jsx:5364`: `if (_lw) S.autoAttack = _lw` (the kill's
  `false` never written) green (63; the kind of 61's `:5364` line).
- `src/game/targeting.js:516`: `latchPhase(S) === 'active'` in place of
  `latchLocked(S)` green (no node suite loads the file; harmless at the
  head, which reads `latchLocked`, active or auto) (63).
- `src/game/latch.js` `latchTo`/`latchHolds`: a second field carrying auto
  (`S._latchAuto`) green in `state-ledger` 4 and `phase-table` 2 (the
  card's "Never a second boolean", line 135, is kept at the head: one
  writer, `latchTo`) (63).
- `src/game/latch.js:194` `latchFill`: a frame at least `autohold` ms after
  the press that runs before a queued lift makes a tap auto (a page held
  600 ms; simulated) (63).
- `tools/qa/mp/mp-twobuttons.mjs:540` `HOLD(150,100)`: three page reads with
  the finger down can pass 600 ms of wall clock on the test box, and the
  fill is wall clock: time the tap by the page's clock, or raise
  `?autohold` for the tap steps (63; the likelier cause of the run that
  dc615d6f mended).
- `src/game/freeAttack.js:93`: throws on a null `S` (not reachable in
  play) (63).

## DG

- `server/test/testroom` `GUARDED`: a row dropped is unseen (57, 58).
- testroom §7's four fields unguarded (57, 58).
- `server/src/relay.js` `_relayBytesDrop` counts characters, not bytes (the
  orchestrator).
- 13 fields handlers read have no wire row: ride data, `player_attack`'s
  element, `dungeon_start`'s 11 (the orchestrator).
- `WIRE_HOSTILE_DOOR=off` fails `wire-hostile` check 2 (the orchestrator).
- #2310's forms are on 7 rows; every other request number still takes
  `"5"`, `-5`, `{}` (59).

## D, BK, the orchestrator

- `tools/dev/state-census.mjs` `--json` carries no const-key, `Reflect.set`
  or `defineProperty` write to S, so OWNED cannot refuse them (58; card D).
- `tools/guards/road-levers.test.mjs` ~391-399: a `require`
  made by `createRequire(import.meta.url)('./playerroads.js')` is not a
  start of the scan; `eval('_Q')[r].fee` is not marked lost (61); still
  green at 62 on #2335, with `require` of an outside file and a computed
  `require` beside it (62).
- `tools/guards/road-levers.test.mjs` `placeImport` (~175): a symlink in
  the repository is "reached" without its real path checked: a link in
  `src/game` to the table, one in `server/src` to `playerroads.js`, or a
  linked folder to `server/src` reads `.fee` green (#2326 was red on the
  second) (62).
- `tools/guards/road-levers.test.mjs`: a copy of `playerroads.js` at
  `src/game/zRoadsMirror.js`, its `.fee` read in `server/src`, is green;
  a reached file's bare `@/game/...` import counts as a package (62).
- `tools/guards/road-levers.test.mjs`: two mutants of #2335's lines live
  (the `'..'` test dropped; `scanTree`'s `seen` set dropped: no tree plant
  has a cycle); check 3's label says "no file of server/src" for an
  outside file (62).
- `chaos-restart` §7 does not drive the Auction House GEAR and PET listings
  (`store.js` ~846) (58; card BK).
- `finish.md` part 9: the reach "about 1.55"; its worst over six seeds is
  1.92 (58).

## LF

- `server/test/thaw-carried.test.mjs` §10 (~596) plays only the
  `?thawjudge=0` at-once path: on the judged (default) path a bare
  `fx.resume(d.gap, d.carried)` (`thawCarried.js:123`) and a throw that
  skips noting the same beat's gap (:121/124) are green (61).

## Found (no card's debt)

- The Deploy worker on c2da80bf failed 14:57 on `login-keys` 12g ("...that
  join is put out and handed nothing": the join got its whole state);
  green in Server CI on the same commit and 60 of 60 under load on the
  orchestrator's box: the test's `tick()` gates or the worker's join
  against a Forget, not told apart (the orchestrator, 61).
