# Known debts (v2.3.6272; the owner's line of 2026-11-24)

The owner, 2026-11-24, asked "May I draw the line there?": *"Yes."* The
finish is a fixed list (`docs/plan/finish.md` part 2). A reviewer's finding
after that line comes HERE, one line a debt, not to a new card or session.
A bug in how the game behaves is not a debt: it is still fixed (and held,
`finish.md` part 8).

Each line: the card, the file, and the plant or finding that shows it.
"Green" means the plant stays green in the named guard. Written from the
gatekeeper's reviews of sittings 58 to 60 (`docs/plan/census/review-z58.md`,
`review-z59.md`, `review-z60.md`) and the orchestrator's own list, for
every finding that no PR on sitting 60's list mends. A finding on a HELD PR
stays with that PR until it lands, and is marked (held).

## WHO

- `server/src/actor.js` ~155 `(ps._actT ??= actorTest(room, ps))`: test
  mode taken once, not at its write; green in `actor` and `test-mode` (59).
- `server/src/daybook.js` ~341: the same cache; green in `daybook` (59).
- `server/src/xfer.js` ~218 `room._actorOffC` cached once; `actor` §7
  writes one row, after the flip only (59).
- `server/src/sitting.js` `sitOpen`: `t - cur[C.t] < SIT.GAP_MS` (the gap
  from the start) green in `sitting` (59).
- `server/src/join.js`: the kept-body `_sitStint = _sitJoin(...)` deleted,
  green in `sitting` and `actor` (59).
- `server/src/combat.js` `_hpTally('far'|'rate'|'shot'|'swing')` with
  `attackerPs` dropped, green in `sitting` (59).
- `server/src/gold.js` `sitGold(...)` moved below the mint/burn return,
  green (59); `touch(..., true)` on a leave, green (59).
- `server/src/sitting.js` `open()` ~179: `m.has(rec)` for `m.get(rec) ===
  s` green in `sitting` (60).
- `server/src/sitting.js`: the switch thrown off and on again on the same
  socket with no rejoin: the same card goes on and the off time is its
  longest gap (g = 604799); `sitting` §7b plays only off-at-the-join (60;
  sent to the orchestrator as BEHAVIOUR to judge: a record's number wrong).
- (held #2317) `server/src/gathering.js` ~1551 `if (false)
  traceStartless(...)`, `cooking.js` ~963 and ~1044 off, a `hit_rate` /
  `hit_shot` / `hit_swing` line of `traceHitShadow` deleted, `note()`'s
  type check deleted: green in `playtrace` (59). The shadow disagrees with
  the real check in three places that change only a recording's
  would-refuse counts: `cooking.js:1076`, `cooking.js:1044`,
  `movement.js:711` with `playtrace.js:217` (the orchestrator).
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

## PH (the whole stack held at sitting 60)

- (held #2279; #2323 leaves them) `server/src/report.js:493` `for (let i =
  RIDE_LONG_BIN - 1; ...)`, `:478` hidden seconds as seen, `:483`
  `int(msg.ride[0], 0, secs)`: green in `report` (59, 60).
- (held #2318) `src/game/framePacer.js:638` `if (done && workNow != null)
  hotWork = workNow;` green in `frame-pacer`; §24 has no run where the
  chip alone is the cost, or where a work rung lowers `workMs` (60).
- `tools/qa/mp/memory-budget.mjs` `buffers`: reads 24.8 on its 24.8 line,
  the next to flap; its row carries a stray "40.0 -> 42.5, RAISED" comment
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
- (held #2308) `src/game/targeting.js` `latchLock`: an early `return` when
  the id matches brings the old-object bug back; `latch` R is a text
  pattern and stays green (60).
- (held #2308) `src/ui/BroTown.jsx:10518` `S['_latch' + 'Phase'] =
  'idle'` green in `latch` 4 and `state-ledger`; `:11702` `Sb.autoAttack =
  !!_lp` green; the mode-5 wiring has no node guard, only the phone
  scenario (60).
- (held #2308) `tools/qa/mp/mp-twobuttons.mjs:343`: its SKIP asks neither
  the lock on the target, the phase active nor a small gap (60).
- `tools/guards/four-lines.test.mjs`: BroTown has 62 lines of room (8308
  against 8370), so new logic in `gameLoop` is not seen (60).
- A 280 ms hitch inside a swing misses its hit test (the orchestrator).

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
- `chaos-restart` §7 does not drive the Auction House GEAR and PET listings
  (`store.js` ~846) (58; card BK).
- `finish.md` part 9: the reach "about 1.55"; its worst over six seeds is
  1.92 (58).

## LF (held #2273, #2320)

- None from the review. Their hold is the rehearsal's: wsClient.js one
  statement over WL's new line (`review-z60.md`).
