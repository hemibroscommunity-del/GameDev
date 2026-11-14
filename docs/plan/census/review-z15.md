# The gatekeeper's review, sitting 15 (card Z; tag 5372)

Taken 2026-11-14 on `main` at d6b8acd (tree 9bff337a, sitting 14's list
merged, exactly its rehearsed tree). Tags in this file are written bare.
Each new PR that changes `server/` or `src/` had a finder read the code
around its diff (the angles of `/repo-review` that apply), re-try its break
proofs and try to disprove what it found; the gatekeeper re-read every mend
pushed since sitting 14 itself. Documents and tools got step 3.

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or a reading). PLAUSIBLE: the code does it, what sets it
off is unproven (it says what would settle it). The probes are not in the
repository.

## Decided for the owner while away

Each with its switch, for the planning session to read to the owner:

- **None on this list.** The two under the heading are held, so they
  do not land this sitting: **#1836** (card O) the crowd rungs ON,
  switches `?laddercrowd=0` (one screen) and the Test panel's "Speed
  ladder" (`govern`, every phone, live); **#1838** (card K) the wire door
  ON, switch `wiredoor: false`.
- Not under the heading, the nearest: L's #1824 and #1835 say nothing a
  player sees changes (each door refuses nothing today), each behind a
  live flag, ON: `dueldoor: false`, `partydoor: false` turn them off.
  #1829, #1831 and #1833 change nothing a player sees; #1832 is tools
  (every test page names its lane, `lane=full`, today's drawing).
- For the owner, costs (never decided this way): #1831 makes the
  worker's bundle +137 KB (+19 KB gzipped), the table's rows shipped
  (#1838 ships the same files, so it is paid once). No game cost: no
  write, no message added.
- Still waiting for the owner's own word: card SK's #1782 (+8 to +10
  move messages a ride; `?ridecoast=0`), not listed; card R's PR 9 needs
  `lab.yml` changed (`.github/`: the owner's words only); card E's
  `arenasettleplan` and `econresetput` (both OFF).

## What GitHub shows, step by step (card Z's step 5b)

Every listed PR's base is `main` (`base.ref`). Merged down the list in
its order in a scratch copy (each a merge commit), every head had ONE
merge base with the `main` above it (`git merge-base --all`), this
branch last included: #1824 d6b8acd; #1835 9eb8065 (#1824's head: it
carries #1824, so it follows it, and is held if #1824 is); #1829 and
#1831 0da805c (sitting 14's `main` before its own PR); #1833 d6b8acd;
#1832 1cce0b2 (sitting 13's `main`). K's two each carry the same
`docs/plan/status/K.md`, so they merge clean in either order.

**Mended during the sitting**: J2's #1833 merged `main` (its status
file's conflict), 740d058. **Not mended, held**: O's #1836 and T's #1837
(each a conflict with `main` in the switch table), K's #1838 (conflicts
with #1829 and #1831 either way). A chain of carried heads (#1837
carrying #1835, #1836 carrying #1837) was offered; the planning session
chose to hold all three for the next sitting.

## Card L: #1824 (PR 5's second, tag 5211): re-read, listed FIRST

Reviewed clean at sitting 14 (80a7237). Since then: `main` d6b8acd merged
in (both `DOOR_SUITES` rows kept, card O's ladder and the duel), and
sitting 14's low mended: the gladiator.js exception is now ` t.status = `
(a space first) in both duel-door.test and the phase guard, so
`mt.status = ` no longer passes. The two writes it names are
gladiator.js 373 and 852. Nothing else in L's files changed (diffed file
by file against 80a7237's own diff).

## Card L: #1835 (PR 5's third, tag 5212): reviewed, listed right after #1824

**The party door (it DEPLOYS; a live flag), read at b54ff10 (its own diff
over #1824's head, which it carries): clean (lows).** A finder matched
all seven old writes of `_partyByPlayer` on `main` (party.js 239, 280,
497, 501, 543, 551; clanparty.js 161) to their `_partyIn` calls: each in
the same place against the members list, `_partyIndexPut` /
`_partyIndexDrop`, `_partyStore` and the broadcasts. At every write that
puts a player in, the player is already on `p.members` (the live case
checks `includes` first, the load walks `p.members`, a new party starts
`[inviter]`, the accepter is pushed before the write, the clan party is
`members: free`), so the door's check refuses nothing today (VERIFIED);
a refusal returns false, no throw. A character reset, a kick of an
offline member and the idle sweep all go through `_partyRemoveMember`
(`leave`). No await (rule 9); the field is a `Map`; `PARTY_WAYS` is
frozen and read by own property (`__proto__`, `constructor`,
`hasOwnProperty`, `valueOf`, `toString` refused; those as ids are Map
keys) (§4). `partydoor` reads as `dueldoor` and `tradedoor` do: on when
missing, an inherited flag ignored, and read only on the refusal path;
with it false, main's behaviour for every input that can arrive. The
guard's new Map branch adds no miss and no false alarm (9 doors green).

- Low, VERIFIED: the births are matched by text, `this._partyByPlayer =
  new Map()`, so an unconditional new map anywhere in party.js or
  clanparty.js (say in `_partyOnReset`) passes the guard (~261) and the
  suite's `BIRTHS` (§2), and would drop every online player's place
  while their parties still list them. The finder pinned the text to
  `if (!this._partyByPlayer) this._partyByPlayer = new Map()` in a
  throwaway copy: the head stays green and that break fails both. The
  same kind as sitting 14's gladiator low; for L's next door.
- Nit, VERIFIED: `this._partyByPlayer?.delete(id)` and a write through an
  alias (`const m = this._partyByPlayer; m.set(...)`) pass both checks
  (server/src has no `?.` on a Map today).
- Nit: the spec and `PARTY_WAYS`' comment give `leave` as a leave, a kick
  or a restart; the idle sweep's `offline` removal uses it too; "two
  births" where the code guards three.
- Same as `main`, not new: `_partyLoad`'s "a member already in another
  live party keeps it" can leave the map and a list apart, as before.
- Suites: party-door 28, duel-door 25, party 73, party-keep 63,
  party-chip 25, party-marks 19, party-same 9, clan-party 54, clans 82,
  alliance 96, grotto-party 31, liveops 110 (each the same count as
  `main`'s where it has one); guards phase-table (28 `todo`, the line
  30), switches (477 rows), switches-thrown, keep-switches green. Break
  proofs: the PR's two (the accept's `set` back; a `delete` in a new
  alliance.js function) FAIL both; a guarded new map in alliance.js, the
  clan line in its old form and `this['_partyByPlayer'].set` each FAIL
  one or both. CI `test` green at b54ff10.
- Its phone runs, in its words: `partykeep` 11 of 11, `clanparty` 21 of
  21, `questline` 187; `partychip` 14 of 15 (main 14 of 15, another
  check) and `alliance` 16, 14, 9 of 16 on `main` too (L's Found).

## Card K: #1829 (PR 5, tag 5185): re-read, listed

Reviewed clean at sitting 14 (c096522). Since then (c0042a9): `main`
0da805c merged in, and sitting 14's two lows mended:

- `item_drop` and `report` are `body: 'top'` rows; the guard's new 2b
  fails a direct send written with its fields at the top whose row is not
  `body: 'top'` (its break proof 5: `item_drop`'s taken off).
- The teardown calls `setActionTransport(null)`; `act()` with no
  transport returns false (nothing leaves).
- Nit, PLAUSIBLE, not live: the teardown clears the transport whoever set
  it; if a second set-up ever ran before the first's teardown, the new
  one's would go. Nothing calls `act()` until K's PR 7, where comparing
  before clearing settles it.

## Card K: #1831 (PR 2, tag 5182): reviewed, listed

**The worker's other lists made from the wire table (it DEPLOYS; no cap,
no flag), read at cfe57ce: clean (nits).** A finder loaded each list from
`main` 0da805c's modules and from the head's in node and compared them
exactly: `FIGHT_LOCK` 38 rows (each `sw`, `at`, `when`, `refuse`
identical), `FIGHT_GATED` 20, `FIGHT_OPEN` 134 (0 reasons differ),
`ROOM_PLACED` 10, `RELAY_PLACED` 8, `EVENT_PLACED_TYPES` 18,
`SOCIAL.TYPES` 2, `MUTABLE_RELAY_TYPES` 3, botsig's wrapped hooks 8;
`PRIVILEGED_EVENTS` 163, `RELAY.TYPES` 26, the echo list 9: identical
(VERIFIED). fightlock.js's `_fightLockSwitchOff`, `_fightLockHolds` and
`_fightLockGate` are the same code, so `LOCK_SWITCHES` reads the same
names with the same default. Every table row is unchanged but its six new
columns. Key order differs in four lists; every consumer reads by a Set
or an own-property check (DISPROVED as a risk). `__proto__`,
`constructor`, `toString`, `hasOwnProperty`, `prototype` through
`placeOf`, `FIGHT_GATED`, `_fightLockGate`, `SOCIAL.TYPES`,
`MUTABLE_RELAY_TYPES`: null or false (§4). Every list is built once at
load; the router still pays one Set lookup. Worker +137,549 bytes
(+19,742 gzipped; an esbuild bundle of both trees), as the PR says.

- Nit, VERIFIED: `server/src/wire/README.md` ~307 names a switch
  `fightlockgear` that does not exist (the six are `fightlock`, `fightlocktable`,
  `fightlockequip`, `fightlockarmor`, `fightlockdoor`, `fightlockreset`).
- Nit, PLAUSIBLE: the guard's §7 holds a hand copy of today's lists (the
  card takes it out in K's next list PR). Of eleven one-column breaks the
  guard fails all eleven with §7; without it, the guard catches 2 and the
  server suites 7 more, and nothing catches `dice_roll`'s `placed` losing
  `who` or an open reason renamed. A check per placed field (§8 or §9)
  before §7 goes would settle it.
- Suites: 33 that name these files, green (fight-lock 135, event-place
  37, botsig 66, chat-guard 151, chatmod 63, dice 70, emotes 124, relay
  53, wire-audit, wire-hostile, refusal-door, test-mode, hardening;
  guards wire-table 38, switches, switches-thrown). CI `test` green at
  cfe57ce.

## Card J2: #1833 (PR 7, tag 5426): listed

Step 3 (a test and its status; no deploy). `mp-townride`'s "as before"
page is now `?folkbake=0&bodyworker=0` (since 4930 a body sheet bakes on a
worker, so `?folkbake=0` alone held the page 0 to 2 ms: red on `main`),
and "as it ships" reads the object pages' ground lines from the game's
own probe `window.__btPageBases` (wheelObjects.js ~340, on `main`; since
4470 no "page bases" job holds the page): `way === true`, `pages > 0`,
none read on the page. J2's runs: 10 of 10, three times. Tag 5426 from
J2's block; the line is its status file's own (the card's first three
lines are its PRs 1 to 3, the rest routed by sittings). Mended during the
sitting: its status-file conflict with `main` (740d058, `main` d6b8acd
merged in, one base). CI `test` green at 740d058.

## Card O: #1832 (PR 3, tag 5223): listed LAST before this PR

Step 3 (tools, and one server test: it DEPLOYS). Its files are card O's
PR 3 line: `run.mjs` refuses a scenario with no `lane` or one not in
`LANE_NAMES` (read from drawLanes.js) before anything boots, and fails a
game page a scenario loaded with no `lane=`; the harness puts `lane=` (and
`govern=1` where asked) on every page `newPlayer` opens (a page with no
scenario plays `full`); 381 scenarios each `export const lane = 'full'`
(`tools/dev/name-lanes.mjs`, `--check` read-only); `tools/qa/lane.mjs` for
the other tools; the guard `scenario-lanes`; CLAUDE.md §6 and §8 ("its
`lane`", nothing else); DEV-TOOLS. One file beyond the line:
`server/test/old-map.test.mjs`, whose check reads run.mjs's
`H.setScenario(name)` and now allows its `{ lane, govern }`, so its merge
deploys the worker (TRAPS §277). `ui-review/capture.mjs` opens the game
through `H.newPlayer`, so it carries its lane; the load tools open no
page. `name-lanes.mjs --check` on the rehearsal's tip (with #1833's
change to `mp-townride`): every scenario names its lane. CI `test`
green at 665f30e.

## Card O: #1836 (PR 6, tag 5226): HELD (a conflict), reviewed

**The crowd cap as a knob (it DEPLOYS: `server/test/`), read at
32667ba: clean as code, one MEDIUM design question for the next
sitting.** Held by the planning session's word: it conflicts with `main`
at `tools/guards/lib/switches.mjs` (card T's rows now placed by name),
no GitHub check has run on it, and next sitting T's #1837 lands first
and #1836 merges its head.

A finder ran `crowdK()` in node: with no rung taken the cap is 50 (the
`full` and `thirty` lanes, and no address); `?crowd=12` gives 12 and
`?crowd=all` no cap at any rung; `?laddercrowd=0` gives 50 at any rung
and takes the crowd off the live knobs (a phone's saved rung from `main`
still loads); `?nopeercull` still wins; the always-drawn set and the
choosing code are unchanged; `crowdPick` draws every always-drawn
player when the cap is full, and the minimap reads `S.others`
(wheelMinimap.js ~924), so the hidden stay on it (VERIFIED). Per frame,
after the first call: a cached read and three short loops, no address
parse, no allocation. The cap moves only at a governor rung (two late
verdicts down, 20 s clean before a try up, a failed try doubling to
320 s): one change of who is drawn a rung, no see-saw.

- **Medium, the mechanism VERIFIED (a design call: the planning
  session's, or the owner's):** the governor counts a rung as useful when
  its knob's value changes, not when the screen does
  (drawLanes.js ~96 `moved: true`; the work axis ~147-151;
  framePacer.js `next()`/`trim()`). With 30 or fewer players near, 50 ->
  30 -> 15 hides no one and saves nothing, yet each rung costs two late
  verdicts of 80 frames before the rate's. The governor in node at 60 Hz:
  `main` reaches the rate at verdict 2 (2.7 s), the PR at verdict 6
  (8.0 s): about 5 s more of late frames each hot spell, for the owner
  alone on his iPhone. Coming back, the rate returns first (good), the
  crowd 20 s and 40 s after. A cure the finder offers: pass a crowd rung
  whose cap is at or above the players near. LANES.md's order (crowd
  before rate) is the planning session's; this PR makes it act.
- Low, VERIFIED: crowd-cap §4 calls only `crowdK('<search>')`, never the
  renderer's `crowdK()` (the address read once, the knob each frame):
  the step frozen at the first frame, or 50 whatever the ladder, both
  pass 24 of 24. The code is right (50, 30, 15, 50 as the rung moves);
  a test that moves the rung between bare calls closes it.
- Low, PLAUSIBLE: until #1832 is on `main` the governor is on in phone
  tests; a slow box judged late would measure `mp-crowdbots` and
  `mp-crowdfight` at 30 or 15 (they report, assert nothing). #1832 is on
  this list, so #1836 lands after it.
- Not this PR: the old `?crowd` row (switches.mjs ~326) says it caps
  monsters; it caps players.
- Suites: crowd-cap 24, frame-pacer 124; guards draw-lanes, switches,
  state-ledger green; break proofs: `_knob()` replaced by `CROWD_K` (4a,
  4d red), the renderer reading once (4e red).
- Decided for the owner while away (in its body): ON, switches
  `?laddercrowd=0` (one screen) and the Test panel's "Speed ladder"
  (`govern`, every phone, live). Not on this list.

## Card K: #1838 (PR 4, tag 5184): HELD (conflicts), reviewed in full

**The wire door (it DEPLOYS; a live flag `wiredoor`, ON), read at
ddfb2fd: no honest message refused; one MEDIUM to mend before it is
listed.** Held by the planning session's word: it conflicts with #1829
(CLAUDE.md, `docs/SYSTEMS.md`, `tools/guards/lib/systems.mjs`, K's
status) and with #1831 (`server/src/wire/README.md`, `wire/lists.js`,
K's status), in either order; K merges the new `main` after this list.

- **Medium, VERIFIED: the refusal count grows without a bound.**
  door.js ~190-197 `_wireDoorCount` keeps one entry per message type
  (its first 64 characters) and reason, and the routes' door ~226 one
  per `'http:' + pathname` for a path with no row; both are the
  client's to choose, and nothing caps, clears or reads the store. A
  finder sent 432,000 refused frames of random types from one joined
  socket (the flood line's 120 a second, an hour) under `node
  --expose-gc`: 420,001 entries, +59.3 MB; the room's memory is 128 MB,
  so one script resets the room (every player thrown out) in about two
  hours; anonymous `GET /api/store/<random>?__proto__=1` does the same
  more slowly. Before this PR nothing in `server/src` kept a count keyed
  by a client's type. Mend: key by the row's name where there is one,
  else `'(no row)'` (about 275 rows times 5 reasons), or cap the
  entries; a suite line that sends many random types and reads the
  store's size holds it.
- Low (the same exposure as `/api/account/login` today): the routes'
  door reads the whole body of every non-GET `/api/` request (a clone, a
  JSON parse) before a route checks its key; admin and botstat answered
  401 or 404 unread before.
- Clean (VERIFIED): all 203 `channel.send` sites in `src/` and the direct
  sends (join, pong, track, report, move): every payload an object or
  null, 0 refused; every `words` input capped well under 2,000 (chat 200
  or 120, friend messages 280, names 16 to 20); no page sends a `reqId`;
  a page's JSON never writes Infinity; a real phone frame
  (`track-sample.json`) passes; every room route's body is a JSON
  object, a text or binary body passes; bundles are judged part by part
  (each through `_onMessage`); no await on the socket's path (rule 9),
  one on the routes' where they already awaited their body; 2.9 µs a
  move, 10 µs a track, a 1 MB body 11 ms and refused at the 50,000-node
  cap; the route reads its body intact after the door's clone (a real
  `Request`); `__proto__`, `constructor`, `prototype`, `toString` as a
  type read no row; `wiredoor` missing or the flags unread: ON; `false`:
  `main`'s path (the chatmod fix under it too); the owner's flag call
  passes the door. The five older suites keep every old check, the old
  defences played with the switch thrown.
- Suites: wire-door 44, relay 54, quiet-phone 64, cost-guard 44, chatmod
  65, anticheat 213, trade2 51, fresh-start 28, liveops 110, wire-audit;
  wire-hostile 1 (its line 1; 19 with `WIRE_HOSTILE_DOOR=off`); guards
  switches 476 rows, wire-table 439. Break proofs: the body read without
  a clone (market, liveops, login-keys and more FAIL); `constructor` off
  the bad keys (trade2, wire-door FAIL); bundle parts skipped (wire-door
  §2 FAIL; wire-hostile sends no bundle).
- Decided for the owner while away (its body): the door ON; switch
  `wiredoor: false`. Not on this list.

## Card T: #1837 (PR 5, tag 5305): HELD (a conflict)

Opened during the sitting (the end dates: `on` on every row, `--due`,
check 12). It conflicts with `main` itself (`docs/SWITCHES.md`,
`tools/guards/lib/switches.mjs`: `main`'s rows since 41b4804, R's
`storesize` among them), so no GitHub check has run, and it rewrites
every row, so it meets every PR adding one (`dueldoor`, `partydoor`,
`?laddercrowd`, `wiredoor`). The planning session's word: next sitting
FIRST, after T merges the new `main`; O's #1836 then merges its head.
Step 3 then.

## Not open

- Card P's fire goblin (A'): no branch, no PR. P's status `working`, its
  branch `plan-p-14-figure-hold` quiet since 17:44: past three hours at
  this list, so named stalled.
- Card R's PR 9 (`plan-r-9-rewind`, built): no PR; it opens after #1831
  (its route's row) and needs `lab.yml` (the owner's words).

## The lines

On `main` d6b8acd: the four lines' guard prints no room (every file and
function at its line; cycles 5, 29 files; the writes to `S` from
rendering 114), and the phase table's `todo` is 30 at its line 30.
Nothing to lower here. When #1824 and #1835 have landed, `todo` is 28:
the next sitting lowers `TODO_LINE` 30 -> 28; the hostile census's line
goes 19 -> 1 in #1838 itself.

## The list

1 #1824 (L) · 2 #1835 (L) · 3 #1829 (K) · 4 #1831 (K) · 5 #1833 (J2) ·
6 #1832 (O) · 7 this PR; each "Create a merge commit", in one sitting.
Five deploy the worker (#1824, #1835, #1829 and #1831 by `server/`,
#1832 by its old-map test): back to back. #1824 and #1835 each add a
live flag (`dueldoor`, `partydoor`, ON); #1835 carries #1824 and follows
it at once. No stored record changes its shape. #1832 goes last of the
game's: every scenario named its lane on the tip before it.

## The whole

Rehearsed with `tools/dev/gatekeeper.mjs` from `main` d6b8acd:

1. #1824, #1835, #1829, #1831, #1832 at their heads (tree 1ccac812):
   precheck 0 FAIL (3 WARN: the busy-branches count, and proto-safety
   on party.js 239 and 636, two lines moved unchanged whose `{}` are
   values of `p.meta`, a null-prototype map), build, questline 187 of
   187 (609 s).
2. **The list in its order**, #1833 at 740d058 before #1832 (tree
   db4ea362): precheck 0 FAIL (the same 3 WARN), build, questline 187
   of 187 (519 s); `name-lanes.mjs --check` on the tip: every scenario
   names its lane; ONE merge base each. And `mp-townride` (#1833's,
   with #1832's lanes) on that tip: 10 of 10 (341 s), its two pages
   each naming `lane=full`.
3. **The list with this branch last** (documents only): precheck on the
   whole, 0 FAIL. Its tree is in the list sent to the planning session
   (the file cannot carry its own tree).

Each listed head's `test` is green on GitHub (and `playable`,
`memory-budget`); each base is `main`.
