# The gatekeeper's review, sitting 59 (card Z; tag 6271)

Taken 2026-11-24 07:25 to about 09:00 UTC on `main` 43541e5f (sitting 58's
list merged: #2305, #2307, #2299, #2283, #2311, and its notes #2315). The
queue: 23 PRs from the orchestrator at 07:25 (part 7; the list goes to part
8). Every head was the one the orchestrator read, but #2312's
(ba398efa -> 35821ce0 while the DG lane worked). Ten lanes: one on the
cheapest read the PRs, their checks, words and status files; nine on the top
model read each card's purpose and diff and planted faults in scratch
worktrees (step 4b): first sitting 58's lines (every one of them now RED: 47
lines), then the card's dodges and their own. The lanes' notes stayed in the
session's scratchpad; what matters is here.

## What was open and ready

| card | PR | tag | head | the purpose review | list |
|---|---|---|---|---|---|
| BK | #2301 the roads' levers | 6463 | 40023f9f | pass (58's 6 red; 10 of the lane's red) | 1 |
| BK | #2309 the weapon listing, pieces by id | 6465 | 6d7bed17 | pass (both done-whens red) | 2 |
| LF | #2273 the rejoin loop | 6309 | 72c08a15 | HOLD | - |
| WHO | #2285 the actor, made once | 6480 | 93a97348 | HOLD | - |
| WHO | #2316 the sitting | 6481 | 60897804 | HOLD (and a bug) | - |
| WHO | #2317 the play trace | 6482 | 01b456b5 | HOLD | - |
| WL | #2286 four small mends | 6520 | 775ba186 | HOLD | - |
| WL | #2287 a leaf stays a leaf | 6521 | 2bc5f1d1 | HOLD | - |
| WL | #2290 owned state | 6522 | 246acab9 | own part pass; holds #2286, #2287 | - |
| WL | #2298 the open hand | 6523 | 68ca8e56 | HOLD | - |
| WL | #2302 the scoreboard | 6524 | f58ffc3f | own part pass; holds #2298 | - |
| WL | #2303 paper marked as paper | 6525 | 1ef20899 | own part pass; holds #2302 | - |
| PH | #2279 the report sees heat | 6500 | ec18eb47 | HOLD | - |
| PH | #2291 the memory alarm | 6501 | 8d54cc3e | own part pass (58's hold mended); holds #2279 | - |
| PH | #2297 the memory check gates | 6502 | d1aec77b | pass; holds #2291 | - |
| PH | #2306 the heap's trend | 6504 | 8fbf40a7 | HOLD | - |
| PH | #2314 the debt gate (a DRAFT) | 6505 | db7d9300 | HOLD | - |
| CT | #2293 the left stick | 6541 | bfd443e9 | HOLD | - |
| DG | #2295 the scans read the tree | 6441 | a0a50d94 | HOLD | - |
| DG | #2300 each road booked what it moved | 6442 | b3f185ae | own part pass; holds #2295 | - |
| DG | #2310 the wire door holds a field's form | 6443 | ce93513c | HOLD | - |
| DG | #2312 the reach | 6444 | 35821ce0 | HOLD | - |
| DG | #2313 the gaps (a DRAFT) | 6445 | bcd8eba8 | HOLD; on #2312's old head | - |

## The holds: each the planted line that stays green in the PR's own guard

58's lines are red in every one; what is below is new.

- **#2273** (`thaw-carried`, 55 green): no scenario plays an UNCARRIED gap
  between 5 and 12 s, so a floor under 12 s is unseen. Green:
  `if (arguments[2] === false && _awayMs < 10000) return;` before
  `thawResume` (wsClient.js 5383); `if (c || g >= 10000) _resumeRecover(...)`
  (5197); `thawCarried.js:137` `if (carried === false && awayMs < 10000)
  return null;` before `rejoin()`; the same floor at 98 and 119. A freeze of
  5 to 10 s with its pings missing is never rejoined. The mend: one uncarried
  gap just past 5 s in §8 and §9.
- **#2285** (`actor`, 44 green): test mode taken once, not at its write:
  `actor.js:155` `(ps._actT ??= actorTest(room, ps))` (green in `test-mode`
  too) and `daybook.js:341` the same (green in `daybook`); 58's class on the
  row side: `xfer.js:218` `room._actorOffC` cached once (§7 writes one row,
  after the flip only).
- **#2316** (`sitting`, 58 green). A BUG: `sitting.js` `open()` (~152)
  takes any `e.s`: joined with `sitting: false` on a record holding an older
  open card, then thrown back on, moves count into the week-old card (probe:
  g = 604801, nothing closed), against the header's "closed at the next
  join"; §7 plays off only. Green: `sitOpen` `t - cur[C.t] < SIT.GAP_MS`
  (the gap from the start: every sitting past 5 min splits at a reconnect);
  join.js's kept-body `_sitStint = _sitJoin(...)` deleted (green in `actor`
  too); combat.js `_hpTally('far'|'rate'|'shot'|'swing')` with
  `attackerPs` dropped; gold.js `sitGold(...)` moved below the mint/burn
  return; `touch(..., true)` on a leave.
- **#2317** (`playtrace`, 36 green): gathering.js:1551 `if (false)
  traceStartless(...)`, cooking.js:963 and 1044 off, a `hit_rate`,
  `hit_shot` or `hit_swing` line of `traceHitShadow` deleted (5 of
  TRACE.WOULD's 11 played; its break proof claims the gathering and
  cooking ones fail 4/4b); `note()`'s `if (!TYPES.has(msg.type)) return;`
  deleted.
- **#2286**: `switch-reader` check 3 green with `new URL(window.location.href)
  .search.includes('farmfast')` (and `.href`, `'' + new URL(...)`, a
  `window[_k]` with `_k = 'location'`) in farmWalk.js:106 (`onlyRewrites`
  passes a URL's text); `phase-table` 2 and 2c green with
  `Object.freeze({ status: 'resolved' })` spread, a conditional `_p`, a
  `_up(patch)` helper, `..._ps[0]` (party.js:122).
- **#2287** (`leaves` rule 2): `for (const m of [...S.monsters]) m.seen = 1;`,
  `_H.mark(m)` of an object's method, `const _w = { s: S }; _w.s._zz = 1;`
  (entity-combat.js:102).
- **#2298** (`open-hand`): `debugBus.getState().rpg` from a new file (an
  existing object holding the getter); a destructure with a default
  (`{ getState = () => null } = await import(...)`); `const loading =
  import(...)` then `.then(C => C.getState())`; and a real ORDER bug:
  openHand.mjs `importsOf` (~576) reads only a written path, so a file
  sorted before the getter's file (`src/game/aaHand.js` with `import(DIR +
  'common.js')`) is never looked at again (`src/a/` green, `src/z/` red).
  Its census words (225 -> 227 lines, 84 -> 85 files) are TRUE: the two
  are debugBus.js:207 and lazyPanel.js:93.
- **#2279** (`report`, 148 green; 15.10 rides the whole time, draws no
  frames, never hides): report.js ~468 `isRiding(_S) || true`; ~476
  `addFrames(...)` without `riding`; ~554 late and judged swapped; ~557
  `r.ramps` removed; ~341 `_upBank +=` removed in `_onVisibility`; ~452 the
  thaw line removed; server report.js ~493 `RIDE_LONG_BIN - 1`, ~478 hidden
  seconds as seen, ~483 a ride longer than the seen time kept.
- **#2306** (`heap-trend`, 17 clean): gatekeeper.mjs:171 the rise measured
  from `.slice(-1)`; :168 `Math.min(...reads)`; :175 the `T.say` line
  deleted (check 9 looks for two strings); a `trim` row (baseline.md:92)
  never checked to fall; mp-membudget.mjs:428 the heap line raised in the
  judge.
- **#2314** (a draft; `gate-steps`): gatekeeper.mjs:121 `.filter((s) => s.id
  !== 'heldsample')`; :277 its red not counted; mp-heldsweep.mjs:566 the
  sample's verdict dropped; :511 the rider aliased back to the phone's
  browser. For the orchestrator: `server-message` 12 -> 17 as an `ours` row
  (step 3.1's count 0 -> 1), on its call.
- **#2293** (`stick-zones`, 90 green; §8 is now a tree reading, 58's ten
  red): the guard follows `_in` but not a later write to `dx`/`dy`, and
  plays `stickFrame` alone, never the loop. Green: BroTown.jsx:5365 `+ if
  (!dx && !dy) { var _h = heldDirection(S); dx = _h.dx; dy = _h.dy; }`; `+
  if (!dy && (K['w'] || K['ArrowUp'])) dy = -1;`; `S._stickVec` written at
  10244 and read at 5365; `_playerDead = false;` before 5364; the clock
  through a field (stickZones.js:214 `S._frameNow || Date.now()` with
  BroTown.jsx:4916 setting it to `_perfNow`).
- **#2295**: action-door green with `const k = 'channel'; S[k].send(...)`
  (BroTown.jsx:8198); stash-door green with `tuneFirst(ps.weaponStash)` from
  gearstash.js (`list[0].lvl = 99`); session-door green with `s.id = null`
  where `s = this.sessions.get(ws)` (admin.js:355; its id scan keeps
  receivers named `session|sess`, a text pattern).
- **#2310**: 58's count-mode line red in wire-form 4b. Green:
  door.js:307 `form.some((x) => x == v)` (lets `kind: ['gold']` in);
  liveops.js:323 `f.wireform ? 'count' : 'off'` (the documented refusing
  state only counts); `roots.slice(0, 1)` at door.js:355. Its head now holds
  #2295's and #2300's heads.
- **#2312** (now 35821ce0, clean with `main`): wire-hostile green with an
  unnamed read behind a gate no case passes (dice.js:80 `if (msg.lucky)`), a
  handler that returns right after its destructure (quests.js:364), and
  `msg.length` (`NOT_A_FIELD` names never held).
- **#2313** (a draft; reviewed at bcd8eba8, on #2312's OLD head; DG's final
  head e2de46fd came at 08:14, its `test` running and plants6 not run: it
  is sitting 60's, read fresh then):
  wire-gaps green with a regex or `endsWith` relay (relay.js:185), a spread
  `{ ...msg }` broadcast (index.js:4881), `pathname.slice(1)` and
  `searchParams.has('tip')` routes; send-door green with a wrapper `tell()`
  in origin.js, and a count of `s.length` in send.js:99.

## The passes, in short

- **#2301**: 58's six red (check 1 or 3); its mark plant red (check 2); ten
  of the lane's red (`Object.assign`, a spread copy, `bind`, a mixin, a
  default parameter, `reduce`, a for-of destructure, a summed key in the
  table's file, `?.`, a helper elsewhere). Four stayed green and are counted
  as contrived, not held: `PLAYER_ROADS[r].valueOf().fee`; a forEach's third
  argument `all[i].fee`; an import of `'./playerroads.js?x'`; a tagged
  template. The guard's header says "an unknown spelling is red, never
  green": BK's next PR should make it so (`methodCall`, `bindParam`,
  `fromTable`, `flow` on `TemplateLiteral`). Its three files outside the
  card are named in its words as the orchestrator's (part 6, 05:52Z).
- **#2309**: since 670ec724 only #2301 merged in. store.js:815 `await
  this._saveRpg(...)` red in chaos-restart §7; gear.js:819 `gid: undefined`
  red in world-sum §1; a changed gid red in both.
- **#2291** (its own part): `?memalarm=0` is read by the page (framePacer.js
  201 -> `memAlarmOld` -> `sw('memalarm')`) and by a node suite
  (frame-pacer 23j, with and without it); 58's two and five more red. Two
  weak greens noted, not held: a computer with no chip count falls back to
  the old lines (framePacer.js ~382); a spread that voids the `?govern=0`
  gate (23g is card O's text pattern). Its body names the orchestrator's
  approval for switches, page-thread rows and `mp-memalarm.mjs`, but not
  `renderRes.js` nor a second suite.
- **#2297**: its files unchanged since 7eb5542f; the new lines are honest
  (CI's 12 of 12, artCache 11.2 under 12.2; the 16.2 was main's stale
  `measured`).
- **#2290, #2302, #2303, #2300**: their own parts pass; each waits under a
  held PR. Notes, not holds: `Reflect.set(S, '_deathCard', null)` green in
  state-ledger (WL.md names it card D's); a DRIVERS key added after the
  literal prints 13 of 14; budgets check 4 takes `line: undefined`; gold.js
  `econNum(e.g.b) > 100` green (§10's books are small).

## Decided for the owner while away (the PRs' words)

- #2273: `?thawjudge=0` (read by the code; held in thaw-carried and
  switches). Held.
- #2291: the memory alarm at 120 MB on the game's own total; `?memalarm=0`
  the old lines. Its own part passes; held under #2279.
- #2293: now under that heading: dead zone 12%, turn border 30%
  (`?turnzone=`), the walk's start, the turn's easing, all behind
  `?manual=5`, off by default. Held.
- #2310: refusing by default; `wireform: 'count'` or `false`. Held.

## The flaky suite (#2316's one red)

`switches-thrown` "bowpath thrown | elemental2.test.mjs: restore clamps at
maxMana 99" is random, not the PR nor bowpath: `--only bowpath` 5 of 5 green
on #2316 and 3 of 3 on `main`; elemental2 alone 0 of 400 red on each. The
line: elemental2.test.mjs:187 `mTarget.x = ps.x + 10`, never put back, with
the real `Math.random` until 224: two crits (1% a hit) shove the monster 160
px, past the sword's 150, so the fifth hit is dropped (combat.js:1322) and
mana stays 99. About one run in 1,700. Forcing crits on `main` gives that
FAIL. No card holds elemental2: the owner's question (a session to seed it).

## Step 5: the rehearsal

`gatekeeper.mjs`, the list's two in order, on a quiet box once the lanes
were done (it could not fetch; both heads and `main` had been fetched
minutes before and were the same): tree 26e6a925
(26e6a925447c6b34e6fe4071e243d7c9d3f9aeb3, 8 files from `main`): precheck
0 FAIL, 1 WARN (179 s); every switch thrown once (89 switches, 2420 suite
runs, 853 s); `claims-gain --whole` (card BK's six seeds, 621 s); build
(17 s); questline 187 passed (509 s). All green. The same tree made by
`git merge-tree` and `commit-tree`, step by step as `--no-ff` merges.

## Step 5b: what GitHub will merge

Both bases `main`. After #2301 lands as a `--no-ff` merge on 43541e5f,
`git merge-base --all HEAD 6d7bed17` prints one line (40023f9f): #2309
merges after it, clean (4 files).

## Found (no card's hold)

- Every hold of 57 and 58 is mended, and each mend shows new greens of the
  same family (a guard that follows a name but not what it is handed on).
  Sittings 57 to 59 listed 7, 5 and 2 PRs.
- The box: `/home/user/GameDev` had no `node_modules` at the sitting's start
  (lanes borrowed a scratch @babel; the rehearsal's `npm ci` mended it).
- frame-pacer.test:943 (23g, card O's) guards the governor's gate by a
  regular expression, against rule 2.
- `held-budget.mjs` `'server-message'` raised from 17 to 40 is green in
  `gate-steps` and `held-sweep`: a listed line can rise silently. Nothing in
  node guards a silent raise of the art, gpu, canvases, sound or workers
  lines (`memory-budget.mjs`).
- `window.debug.getState()` (debugBus.js) is a second open hand the census
  does not count (card WL).
- #2310 puts forms on 7 rows; every other request number still takes `"5"`,
  `-5`, `{}` (its words say so).
