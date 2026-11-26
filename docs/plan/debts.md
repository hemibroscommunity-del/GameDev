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

## BRO

- `mp-brocard` 55/59 red the same four on `main` 096d7000 and on #2349's
  b0b912ab (the open one lit, a gold border; a tablet's two columns at 480
  px; the row's words stacked beside their pictures; CLOSE first in its
  row, "OPEN"): the test plays `?bropages=0`, main's own path (65).
- `mp-deskkeys` 8f (a double click on a snowman lunges and ends locked on
  it) red on `main` and on the head alike: waits for the owner's verdict
  (65).

## Found (no card's debt)

- A merge that adds or changes a file in `server/test/` deploys the worker
  (TRAPS §277): #2355/#2357 and #2356 carry no worker code but each
  merge redeploys it (one brief disconnect each; the last deploy wins).
  The orchestrator's note "none deploys" read `server/src` only (66).

- The Deploy worker on c2da80bf failed 14:57 on `login-keys` 12g ("...that
  join is put out and handed nothing": the join got its whole state);
  green in Server CI on the same commit and 60 of 60 under load on the
  orchestrator's box: the test's `tick()` gates or the worker's join
  against a Forget, not told apart (the orchestrator, 61).
- `node tools/dev/state-census.mjs --check` is red on `main` 096d7000
  (`docs/plan/census/state.md` not what the code says: 913 files then,
  1098 now); precheck does not run it (65).
