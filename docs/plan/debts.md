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

- `mp-heldsweep` (stand, town, ride; v2.3.6277, sitting 65) red again on
  this box, on `main` 096d7000 alone (`other: R > J` 22.1 ms x2, ride) and
  on the rehearsal's tree 94b52d3c (`other: wrapped` 26.8 ms x3, town; `other:
  step2` 21.8 ms, ride; `R > J` 19.1 ms x3, town), none a name in a file the
  three PRs moved (`wrapped` is `src/debug/perfTracker.js`'s): main's own,
  as at 64 (65).
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
- `mp-heldsweep` (stand, town, ride) on the test box is red on `main`
  53a5257d itself and on #2345's 724cc6d8, a new over-the-line item each
  run, none in a file the PR moved: the rehearsal (tree 28dccc39) `wrapped >
  tick2` 22.2 ms and `loadLook > loadSnowmanSprites` 18.8 ms (town); main
  alone `(anonymous)` 20.3 ms x2 and `wrapped > rememberChar` 20 ms (ride)
  plus `server-message` 12.4 ms with no note (holdNames.js MADE_AS); the
  join again `R > J` 16.4 ms x2 and `_sprite > _source` 15.2 ms x3
  (`makePaletteSource`, town). At 63 it was 6 of 6 green on afc215c6: a
  sample that one box's noise turns red is not yet a gate (64).

## CT

- `src/game/bowSpecialNow.js` `bowSpecialMon`: its lock branch asks
  neither alive nor range, so a lock on a monster killed since the last
  `latchFrame` can loose one Special at the corpse for a frame, and a lock
  past the bow's range fires as Attack would (#2357, 66; no failing case
  found: CT's next job, a node case).
- `tools/qa/mp/mp-twobuttons.mjs` / `mp-contextbuttons.mjs`: card
  CT-part22 asks them mended "where the shape changed"; #2356 changed
  neither and its status does not say they were read (66: the rehearsal's
  run below).
- `tools/qa/mp/mp-twobuttons.mjs:921` 7d on #2357's head 545761ec (a
  helper, once): red both ways where `main` and the tree SKIP it. Upright
  (0 free, 1 loosed, idle, hit null): the test's, its hide lifts only on
  a FREE shot and a line shot was loosed. Sideways (0 free, 0 loosed, the
  latch ACTIVE, three presses) is not explained: a press with nothing in
  sight took a lock and loosed nothing. CT's next job: run 7d where it
  does not skip, say which half fails, `?nearpick=0` beside it (66).

- `tools/qa/mp/mp-contextbuttons.mjs:292-298` steps 4 and 5 (sitting 65's
  tail, the stack 3d0846c8 and the pill 2825d8e0 alike: red once in two
  runs, the press on the disc, HARVEST, `_btnHarvest` true, no chop): the
  TEST's. It presses Attack after a fixed 600 ms wall-clock wait from
  `byTree`'s hop (step 3, the same path, learned to wait 2000 ms on this
  box) and gives the chop 5000 ms of wall clock; the press's road
  (`BroTown.jsx` ~11664, `contextButton.js` `ctxTap`) is main's since
  v2.3.6550 and has no other gate. Wait for the hop to settle on the
  renderer's clock (TRAPS §200), and on no `S._extraction` say why (the
  extraction's refusal) before the red (65 tail; v2.3.6278).
- `tools/qa/mp/mp-twobuttons.mjs:836` step 7 (sitting 65, #2350 at
  0446337b): red at 68 degrees, its own bar 70 (`p7Away.off`): where the
  monsters stood, not the sight; the step asks the angle and the sight in
  one line, so a bad turn reads as a sight fault. Pick the turn by the
  angle, or say which half failed (65). 2b, 2c, 6a and 3h red on `main`
  096d7000 (104/13/2) and on the head (99/18/2) alike: the tap read as
  auto, as at 64 (65).
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
- `tools/qa/mp/mp-twobuttons.mjs:503` `PICK` (sideways pass, :320): the
  orchestrator's helper on 3c86a24e, 98 of 108 (upright all PASS); all 10
  FAILs one cascade from "2b. sideways: a TAP", the target wm-mist-1 dead
  at one tap (`taps: 1`, one attack asked; the kill lets go by the rule).
  The pass picks the same monster upright's 2b, 2c and 7d left hurt, with
  no full-health wait: pick a full-health monster (or another id) before
  each pass's 2a (63).
- v2.3.6276 (sitting 64, #2345 at 724cc6d8; the purpose lane's notes:
  `docs/plan/census/review-z64.md`). CT's next job, each green in the
  suites named there:
- `src/ui/BroTown.jsx:6163` `_lockHeld = engagedStance(S)`: a latched tap
  lock past 220 px is not "busy", so CHOP/TALK are offered in a latched
  fight (64).
- `src/game/controlVisibility.js:149` `chargeShown` never asks `fight`,
  though its header says so: in a duel with a monster in sight, Charge
  latches the monster and dashes at the PLAYER lock (`targeting.js:602`
  returns first) (64).
- `src/game/thumbSide.js:182`: with `?holdauto=0`, Charge's 'active' lock
  is let go by the next Attack press; on cooldown Charge still locks (64).
- `tools/qa/mp/mp-contextbuttons.mjs:216` step 2e counts the ask
  (`S._tapAttacks`), not a swing (64).
- `src/game/lockFace.js:27` `type !== 'npc'` (a player's lock faced) green
  in `lock-face`, against the status's "6 mutants, none left"; the three
  sites (`BroTown.jsx:5628` `engagedStance` on the next line,
  `monsterCombat.js:1430` the auto lock nulled first, `entityRenderer.js:12330`
  asking `engagedStance`) and `targeting.js:809` an early return: green (64).
- `src/game/contextButton.js:64` `return ctxButtonsOn();` (every mode),
  `manualMode()===5` for the gate, `BroTown.jsx:10642` TALK without `npc`,
  `:11665` modes 1-4 press always 'woodcutting', `ContextButton.jsx:122`
  firing at the lift, `:106` z 29 to 32, `:39` `live:true`,
  `BroTown.jsx:15880`: green (64; most of the wiring has no node suite).
- `src/game/thumbGlue.js:31` `S['_thumb'+'Phase'] =` and `Object.assign`
  through a variable: green in thumb-side, state-ledger, phase-table; the
  frame gate dropped, `thumbSpot.js:16` `arcOn(true, ...)`,
  `manualMode()===5`, `RideButton.jsx:71` gate dropped,
  `ChargeButton.jsx:46` lock dropped, `thumbGlue.js:36` engageGap dropped,
  the clock, `JumpButton.jsx:150` on Block's spot: green (64).
- Still green from 63, unclaimed by this head: `targeting.js:516`
  `=== 'active'`; `BroTown.jsx:5364` `if (_lw)` (64).
- The tap read as auto (`mp-twobuttons` 2b, 2c, 6a, upright and sideways):
  on `main`'s base 3c86a24e as well (CT 16's helper, 98/11/1) and on both
  heads, so it is tap-and-hold's (on `main` since 63), not #2342's or
  #2344's. The question for CT: the hold's fill reads the wall clock from
  the touchstart (`latch.js` `latchFill`), so a 600 ms page hitch fills
  the ring before a queued lift; should the fill read the release's own
  event time, or count frames (64).
  Measured at 64 on the page's own clock (a capture listener on window):
  the harness's 150 ms tap reached the page 774 to 1081 ms after its press,
  4 to 6 frames apart, the ring filled honestly: the TEST's on this box.
  `mp-twobuttons` should time its tap by the page's clock (64).
- `tools/qa/mp/mp-twobuttons.mjs:1146` 3h reads the gap to a monster that
  moves, after the dash has ended: sideways the body closed 404 -> 215 px at
  once and the monster came back to 253; upright the dash's `travelled`
  read 240 with the gap still about 400 (wm-thunder-7 kept its distance and
  still took the strike, 58 -> 48 hp). Read the body's own travel from the
  press (or `S._bashDash.travelled`), not the gap. And `BroTown.jsx` ~5340:
  a step refused by `isSolid` still counts toward `travelled` (mode 0's
  lunge too, not this PR's) (64).

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

## PAD (66: #2354 withdrawn by the owner at 21:5x, before the list)

- Whirlwind (`AbilityButtons`) and Shield Bash (`ShieldButton.jsx:648`)
  keep today's `rightCluster` places while Special moved to its socket:
  their boxes may meet by a few px, and `server/test/pad-skin.test.mjs` 3c
  checks only the socketed controls. Part 3's job: a case for the
  unsocketed ones (no failing case shown).
- mp-contextbuttons (named by the card) is not in PAD's status;
  mp-membudget was read on part 1's 96f0ebf3, not on 8f9e2d87.
- #2354 rewrites `tools/guards/lib/systems.mjs` and `docs/SYSTEMS.md`'s
  input row (+ padSkin) and the switch tables: after sitting 66's list
  lands, its stack merges `main` and writes them again
  (`node tools/guards/systems.test.mjs --write`, `switches.test.mjs
  --write`).

## PAD (67: #2363 held, landing #2354 with it)

- HOLD (a bug in behaviour, read on 1f862236): `src/ui/panels/RideButton.jsx`
  draws nothing in the controller while Charge shows
  (`padLive() && ctxFor(true, chargeShowing(S)) !== 'skate'`, :123), but its
  poll redraws only when `rideButtonView(S).key` (on|asking, :78) moves.
  Riding with a sword, a monster comes into sight and Charge appears: the
  Skate face stays drawn over Charge in the one mobility well (the rule
  mp-padskin 2c checks, on foot only); if a redraw comes while Charge shows,
  the dismount is gone after the sighting until the ride's on/asking moves.
  The mend: the poll's key carries the pick, e.g. at :95
  `var k = v ? v.key + '|' + (padLive() && chargeShowing(stateRef.current) ? 1 : 0) : '';`
  and an mp-padskin step that rides into a sighting with a sword (Skate gone,
  Charge alone) and out of it (Skate back).
- Next job (not a hold): `ShieldButton.jsx` stamps `_shieldTouchAt` at
  `touchstart` (:896) and drops a `mousedown` within 800 ms of it (:895); the
  browser's mouse press comes after `touchend`, so a press held past 800 ms
  (the uncancelable case the comment names) still toggles twice. Stamp it in
  `onTouchEnd` (:937) too. Chrome's case; not seen on Safari.
- After the mend #2363 merges `main` (sitting 67's lines landed): its one
  conflict is `tools/dev/tag-blocks.json`'s end, kept as `"QP"`, `"PAD":
  [[6640, 6659]]`, `"UI2": [[6680, 6699]]`, `"nextBlock": 6700`; then
  precheck, mp-padskin, mp-twobuttons; the next sitting rehearses it (its
  six behaviour changes of part 4 read and found right: the width, `padSpot`
  dy, no housing on a computer, the 800 ms rule, the ring, Attack's box).
- Still part 3's: Whirlwind and Shield Bash beside the Special socket (66).

## GR (67: #2361 waits on #2363)

- #2361 carries #2354 (base `claude/plan-pad-1-controller`), which never
  lands alone: it lands after #2363. Its own change (`src/game/cameraFollow.js`,
  BroTown's call, `?camfollow=0`) read and found right; mp-camfollow 11/11 on
  sitting 67's tree. Its mend then: retarget to `main`; merge `main`; keep
  the render row of `tools/guards/lib/systems.mjs` as
  `f('src/game', 'poseHides|cameraFollow') /* v2.3.6208: what a body's pose hides (card EN); v2.3.6660: the camera's follow (card GR) */`;
  `tools/dev/tag-blocks.json`'s end `"PAD"`, `"GR": [[6660, 6679]]`,
  `"UI2"`, the highest `nextBlock`; `node tools/guards/systems.test.mjs
  --write`, `switches.test.mjs --write`; precheck. Landing it deploys
  nothing (no file under `server/` beyond #2363's, already on `main`).

## UI2 (67)

- Line 2's mend keeps the kit's `docs/plan/status/UI2.md`: parts 1 to 5's
  Done, Found and Needs (14 found lines: `trade2.js`'s header, the craft's
  repeat, `LANTERN-SLATE-SPEC.md`'s old palette, Raleway, three loops without
  reduced motion, `prog3.js`:35...) are at
  `git show 46e88b30:docs/plan/status/UI2.md`: the next UI2 PR carries them
  back into its status.
- #2368 also changed `src/index.html` (Raleway's request swapped for
  Merriweather's, the kit's serif; no new request) and `CREDITS.md` (its
  row): outside its own list, harmless (read at 67).

## PAD (68)

- Next job (not a hold): mp-padskin 8c upright reads Attack before it is
  seated, a one-in-three flake (64/65, 65/65, 65/65 on e1467159): wait on
  Attack's socket before the read (part 22's runs).
- `mp-contextbuttons` 5 (mode 4: a press of Attack starts the chop) is red on
  `main` d42e48ac, on d8a10178, on e1467159 and on the final tree alike:
  main's own (Found (68)), not PAD's.

## UI2 (68)

- Next jobs (not holds; read by a lane at 68, unsure, none seen on a phone):
  `GearPanels.jsx` Summary (~:237) renders nothing, with no close, when a
  WORN pick's cell is emptied by the worker (the 'gone' effect covers bag
  picks only); `StatTree` is not given `who` (another player's tree would
  show your numbers once step 9 opens it); a '?' bag cell carries its real
  `data-grade` in the page (no style reads it); the first points' guide
  arrow stops at Bro's landing (`guideArrow.js`); `ItemPage` reads the `R`
  it opened with (a count changed while it is open is stale).
- Each UI2 line's merge of main kept the BRANCH's `docs/plan/status/UI2.md`
  whole (`git checkout --ours`): the earlier lines' Done and Found are in
  their heads' history; the next UI2 PR gathers them.

## BRO

- `mp-brocard` 55/59 red the same four on `main` 096d7000 and on #2349's
  b0b912ab (the open one lit, a gold border; a tablet's two columns at 480
  px; the row's words stacked beside their pictures; CLOSE first in its
  row, "OPEN"): the test plays `?bropages=0`, main's own path (65).
- `mp-deskkeys` 8f (a double click on a snowman lunges and ends locked on
  it) red on `main` and on the head alike: waits for the owner's verdict
  (65).

## KEEP (69)

- Next jobs (not holds; the purpose review of #2385/#2388/#2389 on
  87b08b1b, every card dodge for `/sfx` RED): `tools/guards/keep-sfx.test.mjs`
  scans only strings that start `/sfx/`, so a folder constant
  (`const VOICE='/sfx/voice/'; playFile(VOICE+n+'.mp3')`), a template on
  `SFX='/sfx'`, a `.join` of parts, or a `.replace` on a stamped address
  (it carries the OLD `?v=`) stays GREEN: make `loadSample`/`playFile`/`fetch`
  the only ways a sound is fetched and judge those calls' arguments.
- `tools/assets/keepVersions.mjs:51`: with `KEEP_STAMP=0` nothing is
  stamped but `public/_headers` still ships the one-year `/sfx/*` block:
  drop the kept blocks from `dist/_headers` when the stamp is off, or fail
  the build when `CF_PAGES` is set (nothing in the repository sets the
  variable today; the Pages build is a plain `vite build`).
- `public/tools/ground/app.js:838`: the Ground Studio fetches the bare
  footstep addresses of `clips.json`; under the year's block the owner's
  own browser keeps an old footstep there for a year (a studio, not the
  game: the card's scope to say).
- The card's own PR 4 plant "a `_headers` block for a folder whose count
  is not 0" is GREEN on this stack (no guard yet): PR 4 holds to it.

## PRT (69)

- Next jobs (not holds; #2384 f2e58e9c, the card's break proofs all RED):
  `tools/guards/here-cells.test.mjs` never plays `src/game/wheelTrial.js`
  `wheelHere`, so `wheelTrial` never calling `_hereKept.put`, or passing
  float keys (`x/cell`), stays GREEN; `tools/guards/draw-on-change.test.mjs`
  never plays `ElementBurstButton.jsx` `burstView`, so the element or the
  flash dropped from the burst key (a button frozen in its old colour after
  a weapon swap) stays GREEN: export `burstView` and play its key.

## LOAD (69)

- Next jobs (not holds; #2386 b29cda8a, no behaviour change found):
  `src/game/loadTimes.js` markLift reads `window.__btMaskedCoverage` for
  EVERY player at every lift (about 6 ms, the page's thread; not in
  `tools/qa/mp/held-budget.mjs`): read it only while the readout is open;
  that read's non-look path calls `getBodyFrame` (entityRenderer.js:3024),
  which can start `buildBodySheet` when the 20 s cap lifted before the
  preload's bake (the same sheets, sooner). `docs/plan/status/LOAD.md` on
  the head still says `working` and "open the draft PR": stale.

## TD (69)

- #2380 changes `.github/workflows/deploy-worker.yml`: it merges only
  with the owner's own Approve (CODEOWNERS); the stack #2381 to #2383 sits
  on it and waits with it. Once #2380 is on `main`, Found's first line
  (a `server/test/` merge deploys) is mended: strike it then (sitting 70).
- Reviewed #2382's deletions (16 files of `src/game`): none had an effect;
  the module load order is identical over 964 modules. `czMX` stays under
  its disable line (its read can throw): the owner's call in TD's Needs.

## KEEP (70: #2392 held)

- HELD: `tools/guards/keep-sfx.test.mjs` 3-4 is RED on `main` eb90c6fd
  with #2392 (fb1ccdd5) merged: `src/ui/kit/UiKitPage.jsx:131` builds
  `/icons/items/` and `src/ui/mobile/dash/GearPanels.jsx:159` hand-keys
  `/icons/bag/equip-` (`?v=2.3.4199`), both put on `main` by UI2's merges
  after the branch's base. Mend: merge `main`, put both through `assetUrl`;
  the head's own checks were green only because it was 45 behind.
- The purpose review on fb1ccdd5 (the top model): the card's dodges C1 to
  C4 RED; the `metalIconPath` mend correct (every metal and base names a
  file that exists); the build's 1,253 `/icons` addresses none stale. STILL
  GREEN, named at sitting 69 (KEEP (69)): a template on a folder with no
  trailing slash (`SFX='/sfx'` read by a template `${SFX}/voice/${n}.mp3`, the
  same for `/icons`) and a `.join` of parts. The next review holds the KEEP PR
  that mends them to them.
- Next jobs (new, `keep-sfx.test.mjs`): a hand key added to a call's result
  (`metalIconPath(...)` with `${ITEMS_V}` after it in a template,
  `gearIdIcon(id)+'?v=2.3.4222'`);
  `assetUrl('/icons/ui/') + name` and `'/icons/ui/'.concat(name)` (judge the
  whole address handed to the fetch); a `let`, object-held or
  `Object.assign` folder; the door trusted by its name (a local stub
  called `assetUrl` passes). The heap's rise 41.2 to 42.0-42.3 of 42.5 is
  reported in the body, not explained.

## UI2 (70: #2391 held)

- HELD (#2391, aaebaafd): the card's own dodge "Equip offered on another
  player's item" stays GREEN planted at the PR's own roads: `openItemPage`
  dropping `owner` (`dash/itemPageOpen.js`), and the showcase's tap building
  its own `{ R, cell }` with no owner (the guard's S2 at the call site);
  `tools/guards/gear-showcase.test.mjs` 2b to 2d read the wiring as text.
  Mend: read off the syntax tree that the showcase's tap and
  `openCardItem` hand `openItemPage` exactly `showcaseItemSource` /
  `profileItemSource`'s result and that `openItemPage` keeps `owner`. Also
  `tools/qa/mp/mp-ui2bro.mjs:215` step 2c ("Equipment opens Gear") is left
  red, against the card's "phone tests that open Gear keep working". The
  game is right today (an owner's source is read-only twice over).
- Its merge, rehearsed: with `main` merged in, two conflicts, both sides
  kept, `main`'s first (`InspectPlayerPanel.jsx`'s imports: #2392's
  `assetUrl` line, then its two; `docs/plan/status/UI2.md`: the head's two
  lines the branch's, then each section `main`'s then the branch's). The
  files outside its card are each a needed touch (one system).
- Next jobs (`gear-showcase.test.mjs`): Manage Gear drawn for another player
  (`sc.manage || who`); Gear's body shape changed by a spread at its use;
  the bag grid through `import * as Kit`; another player's owner `''`
  instead of `'?'`.
- #2390 (the grip), listed: next jobs in `tools/guards/band-grip.test.mjs`:
  check 2 reads the gate as text (`(bandGripOn() || true)` passes); check 6
  knows only "Tap the handle" ("Tap the grip" passes). A word for the
  owner: folded under the frame, the reward lesson rings Gear with "Open
  the dashboard to find it." (`QuestCoach.jsx:807`).

## PAD (70)

- #2393, listed: next job: `server/test/stick-zones.test.mjs` checks that
  `ControlsTutorial.jsx`'s move body asks `rimSprintLive()` (a hard-coded
  `'controlsTutorial.moveBody'` stays green in every node suite). For the
  owner: no "sprinting" glow on the usual stick (RimGlow is mode 5's).

## LOCK (70: card LOCK's facts)

- The owner, about 20:27 UTC 2026-11-26, asked by the orchestrator "should
  tapping a monster lock onto it?": *"No tapping in monsters"*. A tap on a
  monster never locks onto it (v2.3.5664).

## SHOP (71: #2400 held)

- HELD (#2400, c36704eb), a bug in money: the phone learns of the bought
  shield only from `shop_result.shield` (`src/networking/gameEvents.js`:523-529);
  `player_state` carries `shieldStash` but no client code adopts it
  (`wsClient.js`:3087-3110 adopts only the worn `shield`), a re-sent reqId is
  answered with `player_state` only, and a rejoin adopts nothing. So a lost
  `shop_result` (or a phone that lost its bag copy) leaves the player 100
  coins down, the piece unseen, and every buy refused "You already have
  one". Mend: the `have` refusal or quote carries the worker's held piece
  and the phone adopts it by gid (or adopts `player_state.shieldStash` by
  gid). All six card dodges RED; the review's notes: scratchpad rv-shop.
- Next job: `server/test/shop.test.mjs`: one shared piece object for every
  buyer (`shop.js`:839 `this._shopShield || (...)`) passes.

## LOAD (71: #2401 held)

- HELD (#2401, 27b95a09): the card's own proof ("derive the key from the
  job's inputs AS THE WORKER RECEIVES THEM ... change any input, the key
  changes") is GREEN at the worker's readers: `maskedBakeWorker.js`:613 the
  look reader with `NO_ROW`, :609 a cut input read as its size only, :630 the
  file reader answering the address / numbers by name / rod null, :579 the
  version without script or browser. `tools/guards/bake-keep.test.mjs` holds
  the worker and the store by text. Also green: `put` never evicting
  (`bakeKeep.js`:340), a version that does not empty the store (:294), a
  throwing store not switched off (:331). Mend: drive `keepStore` on a fake
  IndexedDB and the worker's readers in node.
- Next jobs: drop `_tables`/`_bms` when a sheet of numbers is replaced
  (`maskedBakeWorker.js`:406); `prewarmAltWornSets` waits on `_wornPass` with
  no limit (`entityRenderer.js`:3801). Its status file
  (`docs/plan/status/LOAD.md` on the branch) still says part 1 "working".

## UI2 (71)

- HELD (#2399 Quests, 79b820ea): the card's own dodge "a {steps.length}
  beside the title" is GREEN (`questViews.jsx`:161, a bare
  `{page.who.steps.length}`, "2/6", "4 steps": W2/J3 match only "N of M" and
  "%"); and a bug: with quest A's page open, a tap on quest B's pinned card
  still shows A (`QuestPage.jsx`:83 `useState(selOf)` reads once, `<Active />`
  at `BottomDashboard.jsx`:1822 has no key; the road stacks questDetail(A) >
  questDetail(-), so Back needs two presses). The mend's ui3-weights claim
  HOLDS (42 ok with the kit). Next jobs: `quests-ui2` over QuestsLanding's
  ctx (`dailyOn`, `known`) and QuestPage's `onRewards` (`replace`), a
  `where.map` undefined fixture, future labels in attributes;
  `journeyToNow` (`questPages.js`:314-317) with every step ticked.
- #2391 (Gear, acda23f2), listed: sitting 70's two roads RED in every
  spelling. Still GREEN, next jobs (`gear-showcase.test.mjs`): `(sc.manage ||
  who)` (`GearShowcase.jsx`:49); a spread at Gear's body's USE
  (`GearPanels.jsx`:201); `import * as Kit` + a computed name
  (`GearShowcase.jsx`:25); another player's owner `''` (`gearShowcase.js`:69);
  NEW: 2b passes a mutation of the maker's result at the tap (`delete
  src.owner`, `GearShowcase.jsx`:47; red only by W3's anchor); 2c passes
  `p.isSelf = true` in openCardItem (`InspectPlayerPanel.jsx`:255); 2b does
  not read `showcaseOf`'s argument (`GearShowcase.jsx`:43).

## UI3 (71)

- The owner, 23:13 UTC 2026-11-26, asked whether Combat one tap inside the
  Bro menu is enough or stat points should be spent on the Bro page itself:
  *"Keep it one tap in"* (card UI3's facts; v2.3.5665).
- HELD (#2406 UI3-hud, 8042b993): the card's own dodge "the HUD drawn under
  `?hud=0`" is GREEN in `char-hud` and `char-hud-mount` (`CharacterHud.jsx`:80
  `if (!on || !rpg)` -> `if (!rpg)`; replanted by the gatekeeper). Also green:
  "Lv 1" before the record at the component (`:109`, the span without
  `model.ready` and `model.level || 1`). Next jobs: computed keys, spreads,
  an array-alias mount and a dynamic import (eight plants, scratchpad
  rv-pad-hud); the other weapon's "+N" pop keeps its icon with no clock
  (`CharacterHud.jsx`:121).
- #2395 kit, listed. Next jobs (`ui3-weights.test.mjs`): a class through
  `'u2-' + 'raised'`, `.filter().join()`, a props spread, a member lookup, a
  tile under an alias, a named no-op handler (`UiKitPage.jsx`:206, :278);
  `className={className || cls}` (`Group.jsx`:40); `.u2-facts > *` and
  `.u2-fact-*` children; `-webkit-text-fill-color`. ItemPage.jsx:101's
  doors to `Ui2Tile size="compact"`: done by #2403 (its row fell).
- #2398 type, listed. Next jobs (`menu-font.test.mjs`): inline `fontFamily`
  in `src/ui/mobile/dash` and `sheet` JSX (`MenuGrid.jsx`:102); folders read
  recursively and non-`.css` sheets; `--ui2-font` held wherever written
  (`src/styles/game.css`, an inline `'--ui2-font'` key); computed keys and
  `.style.fontFamily =`; `ui2-tokens` 10 over every HTML under `src/`
  (`src/quest-harness.html`:10); `CREDITS.md`:27 still lists Merriweather.
- #2405 bro, listed. Next jobs (`bro-hub.test.mjs`): the handed reader's
  `name`/`combat` drawn (`BroLanding.jsx`:78); a face through
  `.u2-bro-strip > *` (`broStrip.css`).
- #2407 combat, listed. Next jobs (`combat-hub.test.mjs`): `flex-flow` and
  rem bases (`combatPage.css`); a branch on an alias of `cat`
  (`WeaponPage.jsx`:139); SharedPage only counted (`SharedPage.jsx`:143);
  `doors` rewritten by a map (`CombatHub.jsx`:66).
- #2403 menus, listed. Next jobs: `menu-tile` and `gear-geometry` read the
  modules only (`MenuGrid.jsx`:110, :127; `GearPanels.jsx`:351, :364);
  `gear-socket`: `kit` through an alias or spread (`GearTab.jsx`:658),
  `BagTile` forcing `kit={true}` (`InventoryPanel.jsx`:1366), a computed key
  or `Object.assign` in a tile's style (`:560`), a border in Gear's override
  (`GearPanels.jsx`:366); `mp-ui3menus`: the gold pill sideways with 1,000+
  gold (`GearPanels.jsx`:382).

## LOCK (71)

- #2397, listed: every card dodge RED in `lockPick` (the card's suite reads
  the pure pick). Next jobs: a node suite over `updateTargeting`'s glue (the
  clock in ms, the push's sign, `?locknear=0`, the held `inReach`;
  `targeting.js`:755, :766, :770, :773); a guard that a tap never writes a
  monster lock outside mode 0 (`BroTown.jsx`:13413: the owner's "No tapping
  in monsters"); scenes for a third candidate 30% out along the push and
  `near:false` with a rival 10% nearer (`lockPick.js`:157, :138).

## KEEP (71)

- #2392 and #2396, listed: sitting 70's two addresses RED unstamped. Still
  GREEN (69's, next jobs): a slash-less folder template and `.join`, now
  reaching `/world/objects` too. NEW: after the door
  (`assetUrl(x).split('?')[0]`, `url.replace('.json','.png')` at
  `wheelObjects.js`:413); a template opening on an expression
  (`${BASE}/icons/...`); `ground-worker.js` built `/world/objects` addresses
  (:1021) and `keptManifest` (:1011); `sheetPage.js` `loadSheetPage`.

## PAD (71)

- #2402, listed. Next jobs (`server/test/pad-skin.test.mjs`): 6b compares
  `padPictures()` by length, not as a set (`padSkin.js`:452); housing.png
  against padArt's `inside` and a rim-colour check (a gold piece under a
  steel name passes); `PAD_ART_VER` (`controlSkin.jsx`:157) still
  '2.3.6641' with all 18 files changed (harmless while `/ui/*` is not
  immutable).

## SHOP (72: #2400 listed at d782aed2, its mend)

- Sitting 71's hold RED in every path (a lost `shop_result`, a re-sent
  reqId, a rejoin): `shop.test` "A LOST ANSWER LOSES NOTHING" (v1 and v2);
  the six card dodges RED again. Next jobs: nothing tests that the phone
  calls the adoption on the quote and the refusal (`gameEvents.js`:460,
  :487: drop either call, green); `shieldAdopt.js`: a gid not added to the
  seen set, one old copy with no gid hiding every twin of its signature,
  the cap check dropped in `adoptStateShields`: green; a shield that comes
  in the mail (`gameEvents.js`:2120 `inbox_delivered`) is added without the
  gid check: send it through `adoptHeldShields`.

## LOAD (72: #2401 held at f56dfa3b, its mend: on main 380317e6 four-lines 1b red)

- HELD by the rehearsal on main 380317e6 (after #2421): merged with main,
  `four-lines` 1b is RED (`src/rendering/systems/entityRenderer.js` 7985
  code lines over its line 7984; it adds about 40): mend: move the worn
  pass's gate (`_wornPassBegin`, `_wornPass`) out of the big file (rule 5).
  Green on main 2bd82b3b. Its review LANDS:
- Sitting 71's plants RED (`maskedBakeWorker.js`:613, :609, :630, :579;
  `bakeKeep.js`:341, :295), `bake-keep.test` 6-7 on the real worker in
  node. Next jobs (`tools/guards/bake-keep.test.mjs`): 6b changes inputs
  only between logins (a memo by sheet+cell in `lookPixels`, or the
  `_numbers.delete` on `lookSheet` dropped: green; two jobs in one login
  would catch both); 6b changes one fixed pixel (every other pixel keyed:
  green); `keptBytes` (`bakeKeep.js`:245) leaving out `px` (green: 7 reads
  the disk through the index's own `b`); `runJob` keeping a frame whose
  belt is pending (green); `bakeWorkerRig.mjs` never detaches transferred
  buffers (`show` kept without `.slice()`: green); `keyFirst` answering an
  error for an unreadable kept value instead of baking again (green); the
  key cut to `KEEP_V` with the version compared by its prefix (green each;
  together an old tab across a deploy writes bakes the new tab is served);
  `?bakekeep=0` ignored in the worker is held only by `mp-bakekeep`:244.
  "Masks within 3 s" (95 s on the box) is LOAD part 3's (part 29).
  f56dfa3b is a status-only push (docs/plan/README.md forbids it).

## UI2 (72: #2408, #2413, #2412, #2415 held)

- #2399 Quests (7c3c6b4a), listed: sitting 71's dodge RED in every
  spelling (W2b); the pinned-card bug mended (dash-nav 3i). Next jobs:
  `quests-ui2` W2b draws only `short: false` (`{short ? ' ' +
  page.who.steps.length : ''}`, a count only when `tight`: green,
  `questViews.jsx`:160, :215); a count in a `title=` or `aria-label`
  (green); `quests-mount` to require QuestPage's `key={questPageAt()}`
  (`QuestDetailPanel.jsx`:113 key dropped: green in the node guards, held
  only by `mp-ui2quests` 5b). The owner's to judge: with A's Rewards open,
  B's pinned card stacks on top, so Back goes to A's Rewards, not World.
- HELD (#2408 Codex, 5acd2917): the card's dodges "at most one when each
  rolls alone" (`MonsterShowcase.jsx`:161 `lootRollWords(true)`) and "the
  same sword with different names" (:59 `nameOf: codexItemName` dropped)
  GREEN. Next job: `itemPageOpen.js` `CODEX_GEAR.iron_torso.kind` 'chest'
  -> 'torso' green (loot-rows L10 checks the sword's kind word only).
- HELD (#2413 Pets, 85710851): the card's dodges "Release with no
  confirmation" (`PetsPage.jsx`:~263 onPress sends `sendPetRelease`
  directly), "a second press of Take out sent while the first is out" (sent
  without `press()`) GREEN; also Sell's `check: () => null`, More room
  bought with no confirm: green. `petPages.js`'s `cost` is read by nothing
  that asks (Ui2Actions ignores `cell.confirm`). Part 31's "storeListPet
  posts /list with no action row" is NOT real (`storeApi.js`:121 through
  `act()`, `actions.js`:442); the note at `traps-economy-social.test.mjs`:728
  is stale.
- HELD (#2412 Ranks, e08554a2, its mend: the fish icon through KEEP's
  helper RED): the card's dodge "'nobody' shown while loading" GREEN
  (`RankStandings.jsx`:221 `loading={false}`), and LIVE: `useFlip`
  (:106) returns `loading: false` and `aceFlipBus.board` starts
  `{wins:[],losses:[]}` (`aceFlipBus.js`:47), so the Coin flip board says
  "Nobody has won a flip against Ace yet." before the answer comes.
- HELD (#2415 Life, 220e6140): the card's dodge "another player's XP shown"
  GREEN (`LifeSkillPage.jsx`:47 `lifeSkillProgress(R, skill, null)`: your
  XP on their page; the How it works door :87 and page :124 the same). Its
  merge with Ranks' mend: systems.mjs (Ranks' list, `lifeProfile` added),
  SYSTEMS.md made again, UI_ARCHITECTURE_V2.md both lines.
- The class, all four: the suites test the rule module, and nothing checks
  the page hands the rule's field to the kit (the roll words, `cost` -> the
  ask, `press()`, `loading`, `who`): one shared jsxMount check would close
  it.

## UI3 (72: #2406 on main 17124fc8 by the owner's 04:49 rule; #2414, #2411 held)

- #2406 HUD (5ecce925) merged ALONE at 04:51 UTC 11-27 by the owner's rule
  of 04:49 (a screen-only change lands on its own green, read after): no bug
  in behaviour found. Sitting 71's plants RED (char-hud 9h, 9i); its card's
  dodges GREEN in new spellings, now its NEXT JOBS: "Lv 1 before the record" as
  a waiting placeholder (`CharacterHud.jsx`:109 `: <span
  className="bt-charhud__lv">Lv 1</span>`, or through `say(..., {n:1})`, or
  a second span reading `rpg.level || 1`: 9i reads only `model.level` and
  the one marked span; mend: render the component with ready false and
  allow only the name); "a quest line that can wrap" (`QuestCard.jsx`:189
  `{ ...LINE_TEXT, whiteSpace: 'normal' }`, :191 a `<br />`: 9e reads only
  LINE_TEXT's declaration). Next jobs: 9c `(xpOn || xb)` in
  `ZoneHeader.jsx`:286's class (green); 9d `export * from
  '@/rendering/characterPortrait.js'` under src/ui/hud (green); 9a/9b
  `rpg['h'+'p']`, `{...{ onPointerUp: open }}` (green).
- HELD (#2414 HUD art, 91a7246c): the card's dodges GREEN at the drawing
  (`hud-art.test` reads `hudArtModel` only): the pill showing the combat
  level (`HudArt.jsx`:142 `art.level`), the badge reading the weapon's
  level (:135 `art.weaponLevel`), "1" in the badge before the record (:135
  `: 1`). Mend: read HudArt.jsx's tree (`[data-charhud-lv]` `art.ready ?
  art.level : ''`, `[data-hudart-pill]` `art.ready ? art.weaponLevel :
  ''`). Next job: `rpg["h"+"p"]` drawn (green).
- HELD (#2411 Own plate, 6b99b2df), by the rehearsal: merged with main,
  `four-lines` 1 and 1b are RED (`src/rendering/systems/entityRenderer.js`
  8025 statements over its line 8008, 7997 code lines over 7984): the PR
  adds 33 lines to the big file; mend: move them into `ownPlateFx.js`
  (rule 5). Its HUD art sibling #2414 merged with main turns `char-hud` 9i
  RED (the art form's Lv outside `model.ready`).
- #2410 Purse (59b965bd) LANDS by review; #2411 by review too, but for the
  red above. Next jobs: `top-gold.test` to read
  `topGold.js`'s tree so the number is only `S.rpg.coins` (:68 `S._purseGuess
  ?? c`: green; `topGoldOn` memo never re-read: green); `own-plate.test`:
  the factory builds the pill only under `_ownPlateOn`
  (`entityRenderer.js`:7071 unconditional: green), the Texts destroyed
  (`pill.removeChildren()` before destroy: green). #2411's diff against
  main has nothing under `.github/`.

## PAD (72: #2409 on main 5b30c929 at 56287163, by the owner's 04:49 rule)

- The card's dodges RED (`pad-steel.test` 1f, 1g, 2d, 2e, 3d, 4d). Next job:
  a spread override after the literal line (`AbilityButtons.jsx`:339
  `...(kind==='whirl'?{metal:undefined}:{})`) green: render Skin for an
  in-tier Whirlwind and Bash and read `data-metal`. `mp-padskin` 6d is the
  slow box by reading (wall-clock 600 ms waits, the held page delaying the
  press past pressGate's window: `ShieldButton.jsx`:890-897).

## The fast lane read at sitting 73 (v2.3.5667; finish.md part 8)

Each landed alone on its own green; read afterwards on the top model. Two
bugs in behaviour, mends owed on `main` (told to the owner at the top of the
list); the rest are each card's next jobs (plants green in its guard).

- **UI3-corner #2419, A BUG (behind `?ui2=0` / `?oneband=0` only)**:
  `src/ui/mobile/QuestCoach.jsx`:780, first step 5's fallback
  `[data-nav="hero"]` says "Your quests are in the Menu." but with the old
  frame (the HUD on, the line gone) that is the old rail's "Bro" button, the
  Quests button beside it; sideways under `?oneband=0` the rail is hidden at
  rest, so the step never measures and the Login Key waits until the band
  opens. Next jobs (hud-corner.test): `hudCorner.js`:93 `cornerQuest`
  untested (`hud || questLineNow()`, `&& false`), :59 `_want = true`;
  `QuestCard.jsx`:137, :181 both 'line' branches dead, :120 `data-questline`
  never written; `hudColumn.js`:17 a fixed +44; `BottomDashboard.jsx`:1190
  the Quests ready dot removed; `game.css`:2573 single quotes or `:root`
  keeping +44; `CharacterHud.jsx`:92 `data-charhud-box` renamed.
- **PAD part 13 #2425, A BUG**: `src/ui/BroTown.jsx`:11801-11803, `bE`
  returns at `if (!t) return;` before :11858's `handleRBtnRelease('b');
  discLift(...)`; v2.3.6548 moved the latch's release above that lookup ("a
  150 ms tap's lift missed it there"), the stick's lift was not moved: on
  that miss a held bow or staff keeps `S._aiming` and `autoAttack` (the bow
  keeps loosing through `stickLoose`) until the next press. Next jobs
  (ranged-stick.test): a computed-key second writer of `S._discKind`
  (`aimMarks.js` `S[_DK]`; a joined key in BroTown.jsx); after a live switch
  to a mouse a stale 'stick' kind skips the bow's sight gate until the next
  disc press. Card dodges (a) to (j): RED.
- UI2-equipgreen #2418 (equip-look.test): the 94% scoped to Gear's root
  (`gearPanels.css`:94); a pale title rule ungated or unscoped; `opacity:.25`
  on the head; `equipLook.js`:28 `_on = true`; the Bag tinted
  `--ui2-green-face-0`; `.u2-slot > img` 94% reaching every kit slot; a
  token alias on `.is-storage`; an ungated `.u2-pane.is-worn` background
  (green under `?equiplook=0`).
- UI3-tutor #2420 (tutor-clear.test reads the pure rule and a call in each
  style only): a new message at `bottom:160` / `top:520`; the toast's
  `tutorOver(...)*0+14`, InstallHint's `Math.min(12, ...)`; `tutorSpot.js`:26
  `padNow(false)`, :28 `hi:0` and the tier dropped, :69/:83 coachClear's
  answer dropped, :79/:81/:108 the ceilings dropped;
  `ControlsTutorial.jsx`:320 cardAt's top dropped; `guideArrow.js`:490, :497
  the lift never applied; `bottom: TIP_B` and `['bot'+'tom']`.
- EN-deathshadow #2421 (frame-foot.test): `entityRenderer.js`:8045 a number
  for one monster (`_variantKey`) and the mirrored case (`scale.x < 0`);
  `zoneTextures.js`:194 the last frame (`i === 0`), :159 the recoloured
  strip losing `feet`, :434 the packer's foot in crop coordinates;
  `casters.js`:190-192 the walk shadow moved.
- LOAD part 3b #2423 with #2401 (sparelater.test): the screen still waits
  (`pixiRenderer.js`:185 `upload` awaiting `whenSpareSetsBaked`); the spare
  sets never bake (`entityRenderer.js`:3803 `continue`; `spareTime.js`:22
  never resolving); laterJob's check `() => true` (:3868); `spareTime.js`:13
  `!sw('sparelater') || true`, :40 `laterBreath <= 40`; a destructure rename
  (`pixiRenderer.js`:176/220); the spare sets started before the world
  (:213). #2401's hold (four-lines 1b) is CURED on main (7992 of 8008); its
  readers' plants and the store's three: RED.
- PAD part 12 #2424 (stick-zones.test): under `?fullpush=0` the "Not enough
  energy!" words once, the reach setting the usual stick's top walk and the
  two-button walk (12i checks the sprint only); `stickLift` handing
  `rimSprint` 0.8 (10g/11c run under `?fullpush=0`; 12 never lifts). Its
  only file under `server/`, `stick-zones.test.mjs`, imports no worker code:
  no deploy.

## The PRs of sitting 73 (their next jobs; none holds)

- UI2-codex #2408 (loot-rows.test, L7 a text match): `MonsterShowcase.jsx`:51
  `shared: killRollLive(S) || true` / `Object.assign(.., {shared:true})`;
  `import * as LR` overriding `roll`; a local `codexItemName` in `lootOf`;
  the row drawing `{r.key}`; at the page (the rule suites read the rules
  only): loot for an unmet monster, met at 0 kills (`CodexPage` `countsOf`),
  a roll range or "common" or a Health fact in a row, the Loot door's count
  `rows.slice(1)` (:61), Found without shardcrack / `metOf: () => true`,
  "Wheel" in Habitat, doors for an unmet monster.
- UI2-pets #2413 (pet-pages.test sees direct calls by name only): Release
  sending through `const rel = sendPetRelease`, a `.bind`, an import
  rename, `PB.sendPetRelease`, `Object.assign(face.release, ..)`,
  `Reflect.apply`; a second send from `usePress`; Take out through a
  `setTimeout` or an aliased `go`; at the page: a rarity tag, Sell's reason
  `check: () => null`, More room at 120, the journal count from the list,
  the first pet as companion, `who` dropped, "No pets yet" while loading.
  Sitting 72's "bug" (Release unasked) was the suite's blindness: on
  85710851 the page already asked.
- UI3 own plate #2411 (own-plate.test): `ownPlateFx.js`:59 / :69 `on &&
  container._never` (ownPlateBuild untested); `entityRenderer.js`:11661
  `ownPlateSync(display, false, ..)` in the peer update; :14903 hiding
  `_hudHpBarFrame` beside the call (the guard reads its body only); the HP
  bar or skull hidden through a computed key or alias; `pill['visible'] =
  false; return;`; `nameDrawn` renamed or read as `OP['nameDrawn']` every
  frame, `.bind`; `Object.assign(pill, {visible:false})`, `const p = pill`.
  Found: `src/state/render.js` has no `_camFollow` row.
- UI3 HUD art #2414 (hud-art.test 6i reads HudArt.jsx only):
  `CharacterHud.jsx` `level: model.ready ? model.wLevel : null` puts a
  weapon's level in the badge (mend: an ALLOW row for `<HudArt>`'s `hud`
  prop, or hudArtModel ignoring `hud.level`); a CSS `:empty::after`; the
  titles say "Tap", not `deskWords()`; mp-ui3hudart lost the group against
  the line under `?questline=1`.
- SHOP part 2 #2426 (gear-adopt.test holds wsClient's call by its shape and
  never runs it): `!sw('gearadopt')`; `S.rpg` for `S`; `null` for
  `getEquip` (dodge (g) at the call); the call inside `if ('armor' in
  payload)` or before the worn slots; the push census reads literal forms
  only (`Object.assign` into `S.rpg.armorStash`, `.push.bind`,
  `Rr['armorStash'].push`) and inserts only (a splice in `gameEvents.js`);
  a worn armour piece with NO gid against an echo copy with one, untested.
  What a player meets: the mail's shield piece is refused when its gid is
  already held (stays on under `?gearadopt=0`).

## Found (no card's debt)

- ~~FOR THE OWNER (72): the phone's gear bag never reads the worker's echo~~:
  card SHOP's part 2 now (`claude/plan-shop-2-gearbag`, tag 6801; struck at 73).
- A bug on `main` (not reachable by the game's own phone): a join claiming
  one minted shield gid N times keeps one minted shield plus N-1 usable
  "legacy" copies (`gearstash.js` `mergeStashLists` merges claims by
  signature; the shield-claim check should drop repeated gids). Plant: a
  join claiming one minted gid twice (72).
- The 42 px sideways button (72): on the Quests page it was the page's own
  sheet (`questsUi2.css`:80, :82 `min-width:0`), not the kit (its tokens are
  unchanged; `.u2-act` keeps 44 px, `ui2.css`:506-507); main's narrower font
  (UI3-type) made "Map" 42 px; #2399 floors it (:100). Also under 44 px
  sideways on main, by estimate: Gear's summary "Eat" about 32 px
  (`gearPanels.css`:67 `min-width:0`, :70 `padding:0 6px`, :69 `flex:0 0
  auto`; `itemActions.js`:61): card UI2-gear's files.
- precheck's [version-tag] WARN "already carry v2.3.N" on a stacked branch
  (72): `tools/dev/precheck.mjs`:437's `git log main..ref` reads the commits
  the other branch shares with this one; :434 skips only an ancestor. Fix:
  `git log ref --not baseRef HEAD`. A tool's debt.

- precheck's [version-tag] reads every commit SUBJECT on main
  (`tools/dev/precheck.mjs` near :395), so a card that renumbers leaves its
  old number "used" for ever (#2380's mend at sitting 70 failed on one): a
  tool's debt (71).
- `mp-ui2frame` step 2 is red on `main` e4f08ed6 and on the final tree
  alike: the tap on `[data-dash-ctl="gear"]` times out in 6 s (the locator
  finds the `data-key="I"` button). The grip (#2390, sitting 70) moved the
  fold onto DashHeader's Gear tile: card UI2-grip's files (71).
- BUFFERS read 25.0 and 25.2 MB on sitting 71's final tree against its
  25.2 line (#2392's raise): no headroom left (71).

- ~~A merge that adds or changes a file in `server/test/` deploys the
  worker (66)~~: mended by #2380's filter (sitting 70; struck at 71).

- The Deploy worker on c2da80bf failed 14:57 on `login-keys` 12g ("...that
  join is put out and handed nothing": the join got its whole state);
  green in Server CI on the same commit and 60 of 60 under load on the
  orchestrator's box: the test's `tick()` gates or the worker's join
  against a Forget, not told apart (the orchestrator, 61).
- `node tools/dev/state-census.mjs --check` is red on `main` 096d7000
  (`docs/plan/census/state.md` not what the code says: 913 files then,
  1098 now); precheck does not run it (65).
- `mp-onboarding` is flaky on `main` d42e48ac: 5/5 then 2/5 (the intro
  clip's lift, the rail, the first tap), and 4/5 then 5/5 on #2377 (68).
- `mp-heldsweep`'s sample is red on `main` d42e48ac at the ride (`other:
  _sprite` 19.7 ms > 12) and on the final tree once (`screen-check` 16.8 ms
  left no note), then 6/6 on it: the ride station is noisy (68).
- `mp-contextbuttons` 5 ("mode 4: a press of Attack starts the chop, as
  before") is red on `main` d42e48ac (26/27): the press lands on Attack's
  disc and no chop starts in 5 s. Card CT's files (68).
