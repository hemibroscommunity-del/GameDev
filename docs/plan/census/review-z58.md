# The gatekeeper's review, sitting 58 (card Z; tag 6270)

Taken 2026-11-24 04:33 to about 06:00 UTC on `main` b966af81 (sitting 57's
list merged: #2288, #2294, #2296, #2281, #2289, #2282, #2304). The queue:
21 PRs from the orchestrator at 04:33, then #2300 (DG) at 04:38, taken in
after #2295. #2312 (DG, ready at 04:42) goes to sitting 59: it is stacked
on #2310, and both clash with #2295 and #2300 in `docs/plan/status/DG.md`.
Every head was the one the orchestrator read; each was reviewed FRESH. Ten
lanes: nine on the top model (one a card's chain) read each card's purpose
and diff and planted faults in scratch worktrees (step 4b), one on the
cheapest read the check runs, the status files and the PRs' words. The
lanes' own notes stayed in the session's scratchpad; what matters is here.

## What was open and ready

| card | PR | tag | head | the purpose review | list |
|---|---|---|---|---|---|
| CK | #2305 precheck's rest cap 10 -> 20 min | 6425 | 69c7b1e8 | step 3 (tools): pass | 1 |
| CK | #2307 Server CI: cancel the older run, skip unread documents | 6424 | 4261a46b | step 3; `.github` read in full: exactly the owner's two changes | 2 |
| BK | #2299 the 1.5 bar, honestly | 6462 | 3c4322c8 | pass (57's hold mended) | 3 |
| DG | #2283 the running room refuses | 6440 | a98fff04 | pass (57's `heap-forget` hold mended) | 4 |
| LS | #2311 the free spin opens only from its button | 6560 | d0ba2e30 | pass (node); `mp-loginspin` run by Z | 5 |
| RR | #2273 the rejoin loop | 6309 | c896360d | HOLD | - |
| WHO | #2285 the actor, made once | 6480 | dcf8ca12 | HOLD | - |
| CT | #2293 the left stick | 6541 | 58521077 | HOLD | - |
| WL | #2286 four small mends | 6520 | 8290b17b | HOLD | - |
| WL | #2287 a leaf stays a leaf | 6521 | a91eb4e5 | HOLD | - |
| WL | #2290 owned state | 6522 | 0709ce99 | own part pass; holds #2286, #2287 | - |
| WL | #2298 the open hand | 6523 | 0a555d3c | HOLD | - |
| WL | #2302 the scoreboard | 6524 | faa51437 | pass; holds #2298 | - |
| WL | #2303 paper marked as paper | 6525 | 3df384e3 | pass; holds #2302 | - |
| PH | #2279 the report sees heat | 6500 | 3bb87458 | HOLD | - |
| PH | #2291 the memory alarm | 6501 | 8b4c404e | HOLD | - |
| PH | #2297 the memory check gates | 6502 | 7eb5542f | pass; holds #2291 | - |
| BK | #2301 the roads' levers | 6463 | f40b578f | HOLD | - |
| BK | #2309 the weapon listing, pieces by id | 6465 | 670ec724 | own part pass; holds #2301 | - |
| DG | #2295 the scans read the tree | 6441 | 00f3ee8f | HOLD | - |
| DG | #2300 each road booked what it moved | 6442 | 0fb31866 | own part pass; holds #2295 | - |
| DG | #2310 the wire door holds a field's form | 6443 | 02fff173 | HOLD (and its head is not on the mended stack) | - |

## The holds: each the planted line that stays green in the PR's own guard

- **#2273** (`thaw-carried.test`, 40 green): `if (tag === 'thaw') return;`
  on the line before `thawResume(_thaw, _awayMs, ...)` in `_resumeRecover`'s
  open-socket branch (`src/networking/wsClient.js:5383`): the stale world is
  never rejoined on a thaw (57's hold, one statement over). Same class,
  green: `_awayMs = Math.min(_awayMs, _frozenMs)` before the call;
  `Math.max(_hiddenMs, _frozenMs)` with `awayMs || 0` dropped (5367);
  `if (gap < 60000) gap = 0;` before `thawBeat` (5196); `visible: ... ||
  document.visibilityState === 'visible'` (5196). §6 checks names and node
  kinds at the call, not that the call is reached. 57's three plants now red.
- **#2285** (`actor.test`, 43 green): `join.js:943` as `if (!actorOff(this))
  actorSocket(...)`: whoever joined while `actor: false` writes `actor:
  null` rows once the switch is thrown back on, against `actor.js`'s header
  ("thrown back on needs no rejoin"); §7 plays the flag off only, never off
  then on. 57's three plants and 22 others red.
- **#2293** (`stick-zones` §8, 86 green): `BroTown.jsx:5365` `dy = _in.dy ||
  S.stickY` (also `dx = _in.dx || S.stickX`, or `S.stickX, S.stickY` read
  whole): a corpse or a stunned body walks; §8's "no second read" is a text
  pattern (`/\? 0 : S\.stickX/`). And `BroTown.jsx:5364` `stickFrame(...,
  _perfNow)` or `0` for `Date.now()`: a walking thumb is idled out (the 3034
  incident); §8 counts five arguments and never reads the fifth. 57's 16
  variants red; #2282's eight-ways `stickRead` red here.
- **#2286**: 57's two holds mended (its code lines are main's, 9450 and
  7984; the fold in monsterCombat.js red). Green: `switch-reader` check 3
  with `new URL(window.location).searchParams.get('farmfast')`, `const _loc
  = window.location; _loc.search.includes(...)`, a destructured `search`
  (in `farmWalk.js` `tickFarmWalk`); `phase-table` check 2 with `{ ...d,
  ..._p }` where `_p = { status: 'resolved' }` (in `party.js`
  `_partySend`). Its "cannot catch" names only the address handed on.
- **#2287** (`leaves.test` check 2): `const _mark = (m) => { m.seen = 1; };
  S.monsters.forEach(_mark);` in `leaves/entity-combat.js`: 57's plant with
  the callback named.
- **#2298** (`open-hand.test`): a new reader file through `await
  import(...)`, `const { getState } = C` of a namespace, `getState.bind`,
  `getState.call`, `{ getState }` in an object, or `useMemo(getState, [])`,
  each green and unsaid (`openHand.mjs` `importsOf` ~429, `nsKind` ~180).
  57's three plants red.
- **#2279** (`report.test`, 146 green): `src/debug/report.js` `r.up =
  upBucket((a.up0 + _upMs(tNow)) / 2 / 1000)` (seconds read as minutes:
  every report "over 30" after 30 s); `if (riding) a.rideMs += seenD;`
  dropped; `server/src/report.js` ~487 `&& rd[1] <= lateAll` (and `rd[2] <=
  judgedAll`) dropped. 57's three red.
- **#2291** (`frame-pacer.test`, 138 green): the page calls `memFull(ts)`
  with no address (`framePacer.js:201`), so `?memalarm=0` (the off-ramp of a
  level decided while away) is read in no suite: `memFull(ts, search = '')`
  is green in four suites, and `mp-memalarm` never loads `?memalarm=0`. 57's
  two red; the header now says "decided while away".
- **#2301** (`road-levers.test`): `const _k = 'fee'; export const _f = (r) =>
  PLAYER_ROADS[r][_k];` in xfer.js; also a `map` over the keys, `(await
  import(...)).PLAYER_ROADS`, a helper in playerroads.js (the scan skips the
  table's file), `export const ROADS = PLAYER_ROADS` read in duel.js,
  `Reflect.get`. None said.
- **#2295**: `const { channel } = S; channel.send(...)` (BroTown.jsx:8200;
  also `const { channel: ch } = S` in chat.js) green in action-door §7 ("by
  any spelling"); `const [first] = ps.weaponStash || []; first.lvl = 99`
  (quests.js:426) green in stash-door §2 (the card names a destructured
  alias). 57's six plants all red by the tree; gold-door 9.3 s (was 99 s).
- **#2310**: `server/src/wire/door.js:509` `if (mode === 'count') why = '';`
  moved out of the form branch (with `wireform: 'count'` every old refusal
  is let in: a `__proto__` key, an array payload, a non-finite number) green
  in wire-form, wire-door, wire-hostile, req-once-door. Its head holds the
  PRE-mend commits of #2283/#2295 (4b23905c), not their heads, and clashes
  with #2300 in DG.md: it needs a re-push on the mended stack. The card says
  "first as a count, only then refusing"; it merges refusing (the
  orchestrator's "(a)", in its words).

## The passes, in short

- **#2305**: `REST_CAP_S` 600 -> 1200 s, the gatekeeper's precheck step 25
  -> 35 min (57's note: a 10-minute cap timed out on a loaded box). Tag
  6425 from CK's block, not the card's line (the card cites 6424 only).
- **#2307**: concurrency (a PR's newer push cancels its older run; main's
  never) and a first step "Documents only?" that ends green when only
  `docs/` files no suite names changed; `test` still reports. Note: on main
  a WAITING run is replaced by a newer one, so in a batch of merges some
  merge commits show Server CI cancelled; the deploy runs its own suite
  (`deploy-worker.yml`), so nothing is undeployed.
- **#2299**: `--whole` unplanted green (251 s; worst reach 1.92 seed d =
  KNOWN, census, body). C1 and 57's plant red; reach x1.5 through an alias
  red by `--whole`. Note: `BURST_SWINGS: 2 -> 4` green even by `--whole`
  (1.77 under 1.92: KNOWN sits 0.5 above the default seed).
- **#2283**: `heap-forget` 1,692 / 1,673 / 1,675 B a guest (line 4,096), it
  now plays unguarded and a leaving record is let go. plants1 17 red, 6 green
  as its words say. Note: a record deleted from `playerState` and put back
  is never swept again (exotic); a suite in `UNGUARDED_SUITES` is unseen by
  testroom.
- **#2311**: the owner's own words (2026-11-24, "the daily spin popup
  wouldn't leave me alone ... just leave it as a button in the top right"),
  quoted in card, body, spec and notes. Its 7 rule plants red in
  `login-spin-offer`; the window's half (`LoginSpinWindow.jsx` ~176: the
  unconditional `open()` put back) is green in node and handed to
  `mp-loginspin` (lane `full`, not every PR): Z ran it (step 5 below). Card
  LS came in the PR's own commit: the orchestrator confirms it is theirs.
  Note: `states.mjs:1098`'s `about` still says the window opens by itself.
- **#2290, #2302, #2303, #2297, #2309, #2300**: their own parts pass (see
  the table); each waits for the held PR under it.

## Decided for the owner while away (the PRs' words)

- #2273: `?thawjudge=0` (a slow page keeps its socket when the worker's
  pings show the gap carried). Held.
- #2291: the memory alarm's level, 120 MB on the game's own total; switch
  `?memalarm=0`. Held.
- #2293: no such heading; "Trial numbers the owner can tune", all behind
  `?manual=5` (dead zone 12%, turn border 30% `?turnzone=`, walk floor 0,
  the turn's easing). Held; the heading is missing.
- #2310: refusing by default on merge; `wireform: 'count'` or `false`. Held.

## Card checks (not holds)

- #2293 carries an edit to its own card (`CT.md` +44: item 6, tag 6545,
  "the orchestrator's addition"), named only in a commit message; it touches
  `server/test/**` (deploys), unsaid.
- #2301 adds `tools/guards/road-levers.test.mjs` and edits
  `docs/specs/player-roads.md`, outside the card, with no approval named.
- #2291 names its files outside the card with no approval named.
- WHO.md and PH.md say `state: working` for the card while naming these PRs
  ready (counted ready). WL.md says OWNED 443; it is 441.
- #2306 (PH PR 5): its `playable` was stopped at the job's 15-minute
  `timeout-minutes`, not by a push: a re-run first; a second timeout is a
  hold. It holds #2291 and #2297 in any case.

## Step 5: the rehearsal

One rehearsal, the list's five in order (`gatekeeper.mjs --keep`, on a
quiet box once the lanes were done): tree fa2b5d51
(fa2b5d51422b758816fb137a666afe8b7ebbc04b, 31 files from `main`): precheck
0 FAIL, 1 WARN (the in-flight branches) (176 s); every switch thrown once
(89 switches, 2420 suite runs, 759 s); build (14 s); questline 187 passed
(444 s). All green. The same tree as `git merge-tree` made step by step.
Then, in the kept tree, `mp-loginspin` (#2311's phone test): 39 of 39
passed (423 s); with the window's unconditional `loginSpinBus.open()` put
back (`LoginSpinWindow.jsx` ~176) and rebuilt, 4 FAIL (the window opened
by itself; the bar's button gone), so its guard is the phone test, and it
holds. The file put back, the tree taken away.

## Step 5b: what GitHub will merge

Every base is `main`; one merge base each, step by step down the list.
Off the list but for the sessions: #2309 gets TWO merge bases once #2301
lands as a merge commit (it merged the new `main`, #2301 did not): when
#2301 is mended, list #2309 alone (it carries #2301 whole) or have BK merge
`main` after #2301 lands.

## Found (no card's hold)

- Card BK: the Auction House GEAR and PET listings are not driven in
  `chaos-restart` §7 (`gearRow = got.row; await this._saveRpg(...)`,
  store.js ~846, green).
- Card DG: 57's two stand (a row dropped from `GUARDED` unseen; testroom §7's
  four fields); #2310's row forms dropped (jackpot, gamble, ace,
  bank_withdraw) green in wire-form §5.
- Card WHO (or DG): `shapes-once` §4 guards the actor's kind by a text
  pattern, against rule 2.
- Card D (`tools/dev/state-census.mjs`): `--json` carries no const-key,
  `Reflect.set` or `defineProperty` write to S, so OWNED cannot refuse them.
- Card WL (`_tree.mjs` `objectKeys` ~44): a `SpreadElement` skipped
  silently; the scoreboard prints a wrong number, not "not measured".
- The memory lines' owner (`memory-budget.mjs`): artCache's `measured` 16.2
  against line 79.3 (lowered to 12.2 in held #2297); heap and buffers'
  `measured` stale.
- The orchestrator's `finish.md` part 9: the reach "about 1.55"; its worst
  over six seeds is 1.92.
