# The gatekeeper's review, sitting 21 (card Z; tag 5379)

Taken 2026-11-16 on `main` b2d763a (sittings 19, 19b and 20 merged). The
owner's lean restart: a short sitting, the PRs ready in hand reviewed and
listed now; K's line of five came in during the sitting and is on it;
J2 comes to a later sitting. Tags here
are written bare.

## O #1929 (14c, tag 5237): the self-test at the door, the fill and the glint

Head 22331d1229b1bb61e983d92e7f6ff45e1e1d3346, base `main`, one merge base
(b2d763a). Files are card O's PR 14 list (`selfTest.js`, each program's own
file, `mp-selftest`, the switch row, the spec); tag 5237 its card's.

- `fillBatch.js`: built, the fill draws the 16 x 16 picture as a monster in
  the whirlwind's amber (`_btFill`), read once at the top of a frame
  (`selfQueue`), its texture destroyed; not built, `selfSkip` names why
  (`?fill=0`, not installed). One test a page: `_built` gates a second warm.
- `glint.js`: two draws (the shine alone; a rare piece's grade), each held
  to `glintCpu` within 4 a channel (half precision); once a renderer
  (`WeakSet`); each filter destroyed, the shared program kept.
- `selfTest.js`: `sheenLiftCpu` is now `glintCpu` with no grade (the 14b
  answer unchanged: the shared `liftPixel` is the old loop's body);
  `selfFillWant` the fill's grey-then-tint. `selfQueue` takes one want or
  one a texture (the glint's two, the fallback's one): read and matched.
- **Neither has a way back** (the card: "drawn as today", named in `self`
  and under Found). O asks the owner under Needs whether a failed fill or
  glint should switch itself off on that chip: an owner question (what a
  player sees), not a hold.
- Nothing found. `test` green on the head.

## L #1930 (tag 5522): the arena door

Head 607baa2a69b1267bb32af3af4965958ecca1bb3c, base `main`, one merge base
(b2d763a). Files: `gladiator.js`, its suite, the phase table and its guard,
the duel suite's one line, the switch row, the spec: card L PR 5's.

- `_arenaTo` is the one writer of `this._arena` (open, start, crown, empty,
  cancel, clear); each old write replaced in place, after the same checks
  the callers made, so nothing a player sees changes. `arenadoor: false`
  lifts the door's rules. No other writer of `this._arena` in
  `server/src` (grep). `ps._arenaMatch` held by the suite to its two
  writers. The guard's duel line now names `_arenaTo` as the one place a
  ` t.status = ` is allowed.
- `_arenaStart` turns the phase before it rewrites the queue: a refusal
  would leave the rewrite done, but its caller only reaches it while
  gathering (low, no action).
- The switch row says `on: '2026-11-15'`: card T sets each row to its merge
  day (sitting 19b's Found, same kind).
- The PR is a **draft**: the owner presses "Ready for review" before its
  merge (or its session does).
- The phase table: 15 `todo` with it, under the line this sitting lowers
  to 16.

## K #1900, #1931, #1932, #1933, #1934 (7.2 to 7.6, tags 5188 to 5192): the page's sends through the action door

Heads 68d8fcc172c871f9a282d710f4813fa03438dcaf, 8198a8bf43fbe8bb65f8a3249c57a99db05eb5ba,
adc96c0a2ea77796a9fdceb04d102dcf51482da8, 266f633d4c932798054ac2d8570414d395bda26f,
e21909cbf438ace53d992b9df23e911eef57c9f3: each on the last, every base
`main`, one merge base at each step after L and O. 93 files; the census
105 -> 88 -> 44 -> 22 -> 4 sends, fetches 0 (the 4 left wait for card T's
#1863).

- `act()`'s route: a GET plain (no header, no body: no preflight), a POST
  with its JSON, the session's token only on a row marked `auth` (the
  guard's 3b holds it to the wire table's `trust`); the two DELETEs (the
  market's and the store's cancel) keep their fields in the query, as the
  page sent them (read against `main`'s ExchangePanel.jsx and
  storeApi.js). With no transport a route answers a rejected promise, its
  caller's catch as before; the transport lives as long as the game's
  connection effect, the only place these panels open.
- The miss class K found itself in 7.5 (a name passed to a helper the
  guard's literal scan never sees: the friends' answers): the gatekeeper
  listed every helper in the diff that forwards a name to `act()` (17:
  the daily rewards, pet book, kept quests, shard crack, weapon slot, the
  friends, party, shop, trade, smithy, woodwork, town board, store chat,
  the ride key) and checked each literal its callers pass against
  `ACTIONS`: none without a row.
- Nothing found. `test` green on each head.
