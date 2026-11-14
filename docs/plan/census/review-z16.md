# The gatekeeper's review, sitting 16 (card Z; tag 5373)

Taken 2026-11-14 on `main` at 64bb498 (tree c54128aa, sitting 15's list
merged, exactly its rehearsed tree). Tags in this file are written bare.
Each PR that changes `server/` or `src/` had a finder read the code around
its diff (the angles of `/repo-review` that apply), re-try its break proofs
and try to disprove what it found; #1838 was re-read from sitting 15's
review on (its mend and its merge of `main`). Documents and tools got
step 3.

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or a reading end to end). PLAUSIBLE: the code does it, what
sets it off is unproven (it says what would settle it). The probes are not
in the repository.

## The planning session's choice: (B), #1837 held

T's #1837 (the end date: `on` on every switch row) rewrites every row of
`tools/guards/lib/switches.mjs` and `docs/SWITCHES.md`, so with it first,
every other PR here that adds a switch row conflicts with it (ten of
eleven; only J2's #1845 merged clean after it). Asked (A) #1837 first and
the rest held, or (B) the game PRs that compose without it and #1837 held,
the planning session chose (B): right after this list lands, T merges the
new `main`, adds `on` to the new rows, and a one-PR sitting lands it alone,
so later PRs merge it once and the rows stop colliding.

## Decided for the owner while away

Each with its switch, for the planning session to read to the owner:

- **#1838** (card K) the wire door ON: it refuses only what no page sends
  (two honest-play runs refused nothing). Switch `wiredoor: false`.
- **#1842** (card K) the archer's lane ON: an archer stops losing arrows
  that land close together. Switch `arrowlane: false`. The trade-off, in
  its words: a cheat that sends faster than the rule allows now gets the
  rule's full pace (the bot lab's bow aimbot +12%); the most one monster
  can take is unchanged (a finder's probe: +1 hit once, never more).
- **#1844** (card R) the lab's own files changed, not only added (a Vault
  class in `tools/lab/src/index.js`, its binding and migration in the
  lab's own `tools/lab/wrangler.toml`; no switch needed: nothing runs
  unless the owner runs the lab's restore try); the lever's numbers (a
  plan good for 10 minutes, at most 30 days back, close code 1012).
  Switch `roomrewind`, OFF.
- Not under the heading, the nearest: L's #1839 says nothing a player
  sees changes (`exdoor`, ON, `exdoor: false`); P's #1840 is a memory
  saver ON by default (the memory law), `?framepack=0`; O's #1841 gives
  every device today's answer (no new switch: `?onebatch` and
  `?lookpalette` keep theirs); J2's #1845 is a test.
- Held, not landing: K's #1848 (`sprintmark`, now OFF until the owner's
  yes: read the finding below before that yes), R's #1847 (`roomexport`,
  OFF; its cost question is under its Needs), P's #1846 (the owner's "Go
  recommended"; two findings below).
- For the owner, costs (never decided this way): none on this list adds a
  write, a message or a pace. #1838 ships the table's `in` and `http` rows
  (+138 KB to the worker's bundle, said by #1831 and paid once, at
  sitting 15). The lab's restore try is about 65 Actions minutes and
  needs `lab.yml` (the owner's words).
- The owner's own yes, given during the sitting (by the planning
  session's word), so listed: card SK's #1782 (+8 to +10 move messages a
  ride; `?ridecoast=0`) and card E's #1852 (`arenasettleplan` and
  `econresetput` ON: two rows an arena match, one put a restart in an
  empty room; `false` turns each off).

## What GitHub shows, step by step (card Z's step 5b)

Every listed PR's base is `main` (`base.ref`). Merged down the list in its
order in a scratch copy (each a merge commit), every head had ONE merge
base with the `main` above it (`git merge-base --all`), this branch last
included. Mended during the sitting, each at the planning session's word:
O's #1841 merged `main` (its status file's conflict with `main` itself,
2f138f2); J2's #1845 its red `test` (below, d674adb); R's #1844 its MEDIUM
(below, b81a4b6).

## Card K: #1838 (PR 4, tag 5184): re-read, listed FIRST

**Sitting 15's MEDIUM is mended (VERIFIED).** door.js ~195-232: a socket
refusal is counted under its row's name only when the type is a row of
`WIRE_DOOR_ROWS.SOCKET` (a `Map`: `__proto__`, `constructor`, `toString`
match no row), else `(no row)`; a route under `wireDoorRouteRow`'s exact
row, else `http:(no row)`; the reason is the first word of a closed set
(body, key, reqId, number, words); what the client sent goes only into the
first 20 log lines, cut to 64 characters. The ceiling: 166 socket rows and
109 route rows, at most 1,077 keys (about 100 KB). A finder's flood
through the real door under `node --expose-gc` (432,000 refused frames in
8 mixes, 48,182 refused requests, random types and paths, `__proto__`
keys, bad reqIds, every route with PUT/PATCH/DELETE): 194 keys, +0.1 MB
(last sitting: 420,001 entries, +59.3 MB). Wire-door 2b fails with the old
keying put back, whole or either half. The merge of `main` (f46a661)
keeps both sides (CLAUDE.md §5 and §8, SYSTEMS, systems.mjs, lists.js,
README, chatmod.js); K's diff against `main` only adds. Sitting 15's nit
mended: README ~313 names `fightlockequip`.

- Low, VERIFIED: 25743e2 took the guard's hand copy of PR 2's lists out
  (`wire-table.test` §7), and three one-column edits of the table now pass
  the guard and eleven suites: (a) `dice_roll`'s `placed` losing `who`
  (out.js ~186); (b) an `open:` reason renamed to another valid one
  (nothing reads it); (c) new: an `out` row marked `privileged: 'echo'`
  (`PRIVILEGED_EVENTS` 163 -> 162, nothing fails; a forged
  `jackpot_result` is still dropped by `RELAY.TYPES`, but relayed to the
  room with `relaylist: false` thrown). The old §7 failed all three. A
  cure: "every echo row is a relay row, but `clan_war_declare`" and a
  check per `placed` field. For K's next list PR.
- Nit: door.js ~37 and wire-door.test ~119 still say "by type".
- Suites: wire-door 45, wire-hostile 2 (19 with `WIRE_HOSTILE_DOOR=off`),
  relay 54, chatmod 65, anticheat 213, trade2 51, fresh-start 28, liveops
  110, wire-audit, cost-guard 44, fight-lock, event-place, botsig,
  chat-guard, dice, emotes, hardening, refusal-door, test-mode; guards
  wire-table, systems, switches (478 rows). CI `test`, `playable`,
  `memory-budget` green at 25743e2.

## Card K: #1842 (tag 5540): reviewed, listed

**The archer's lane (it DEPLOYS; `arrowlane`, ON), read at ef9dff4:
clean (lows).** For an arrow or a bolt the rule is now: in if `now >=
cad.n`, then `cad.n = max(cad.n + 210, now)`: one hit each 210 ms and one
early, the rule `_dgLaneTake` already keeps for a drawn arrow worth a full
hit; the plain path (a sword, or an arrow after a drawn one) is stricter
and writes `cad.n` as the new rule would, so any mix of sword, bow, staff,
drawn and plain hits is held to `floor(L/210) + 2` in any window L. A
finder's probe through the real `_handleMonsterDamage` and relay (220
random mixes at 15 gaps, hitproof on and off, a plain and an `fs: 2`
join): the most on one monster in 10 s 49 ON, 48 OFF; in any 210 ms
window 2 ON, 1 OFF; damage a minute 30,304 both ways (VERIFIED: the
ceiling holds, +1 once). A weapon switch, a monster switch, a party, a
respawn (same object, same lane) get no more. The only new state is
`cad.o` on the existing per-player map (32 entries at most, keyed by a
monster the server found). The new drop is silent, as the plain floor's;
TRAPS §236 is the phone's hit test, not a rate lane. The flag: missing
ON; `false`, 0, null, '' off (the house's way).

- Low, VERIFIED: the phone's default bow is the drawn bow (`dr` and
  `sw`), which already went through `_dgLaneTake`'s early hit (since
  4799): a stepping drawn archer lost 0 arrows either way. The fix reaches
  the hits with no draw: the flicked bow (`?bowfeel=0`, `?manual=`, a
  worker with `bowdraw: false`), older phones, staff bolts without a
  gather, stuck-arrow chips. combat.js's comment ("dropped an honest
  hit") is true of the flicked bow; the bench's `honestBow` sends no draw,
  so its 2b is right.
- Low, PLAUSIBLE: a fresh lane (a rejoin without `tb`, join.js ~917; the
  32-entry trim) now lets 2 hits in at once, not 1 (a rejoin already
  refilled the bow's 15-token burst); how fast a modified page can rejoin
  would settle it.
- Nits: GDD-AS-BUILT ~411 says "one accepted hit per monster per 210
  ms"; no spec names `arrowlane`; after an early arrow a sword hit waits
  up to ~420 ms (the same count of hits).
- Break proofs: `cad.n = nowTs` fails combat-lifecycle and draw-gather §9;
  a rate-doubling variant (`max(cad.n, now) + 105`, 64 in 10 s) fails only
  draw-gather §9: nothing tests "the most hits in 10 s" itself (for K's
  bow claim). The `cad.o` guard is load-bearing (§9 fails without it).
- Suites: combat-lifecycle 313, draw-gather 104, refusal-door 46,
  silent-refusals 31, liveops 110, hit-proof 66, bow-feel 45, arrowblast
  28, free-swing 66, anticheat 212, perfect-strike 59, test-mode 70,
  claims-gain 14 (2b: 7 arrows lost with the switch off; bowlabel 3.91
  against 3.76 + 0.23); guards switches, switches-thrown, keep-switches.
  It writes K's second block (5540 to 5559, `nextBlock` 5560), the
  planning session's. CI `test` green at ef9dff4.

## Card L: #1839 (PR 5's fourth, tag 5213): reviewed, listed

**The cook door (it DEPLOYS; `exdoor`, ON), read on its merge with `main`
(clean, tree aa002742; `main` has not touched its files since b54ff10):
clean (lows).** `_exTo` is the move handler's old lines with `next`
standing for `msg.ex || null`, in the same place behind the same
`msg.ex !== undefined`: a claim re-sent every 500 ms does not re-stamp;
cook to fire with no null between keeps the first stamp, as before; every
reader (`_extractionShielded`, `_cookShieldHolds`, the swing's fire check
abilities.js ~1175, the pose poses.js ~73, the ride ride.js ~105/~179,
admin, `playerWire`, `PEER_PUBLIC_KEYS`) reads the same values for every
code the game sends (the longest `farm:harvest:99`, 15). The linger and
take ways write `ex = null`, `_exAt = 0` as before. `ex` is in neither
cosmetic list; a spar clone skips it. Both tick builders go through
`playerWire`: a string or null with the switch on; any truthy value with
it off, as `main`. The flag: missing ON, read on the `move` way only.

- Low, VERIFIED: the suite's §2 regex misses `??=`, `||=`, `delete
  ps['ex']`, a shorthand or quoted `Object.assign` (the tree guard catches
  those); both miss ``ps[`ex`] =``, destructuring targets
  (`({ ex: ps.ex } = msg)`), `defineProperty`/`Reflect.set`, a body built
  as a literal (`{ ...ps, ex: msg.ex }`) and `ps[k]`. The same kind as
  sitting 15's party-door low: for L's next door (visit ObjectPattern and
  ArrayPattern targets and template keys in the tree guard).
- Low, VERIFIED: nothing fails a second writer of the stamps (`_exAt`,
  `_exX`, `_exY`): `gathering.js` ~994 changed to `ps._exAt = Date.now()`
  passes every suite. Not new (`_endExtraction` zeroes it, in the spec).
- Nits: the body says an empty string was kept before (`msg.ex || null`
  already made it null); `_exDoorOff` reads any falsy `exdoor` as off (the
  house's way).
- Suites: cook-door 30, move-claims 45, tick-share 23, party-door 28,
  duel-door 25, gather-hits, farmwalk 87, combat-lifecycle 312, liveops
  110, fight-dodges 35, session-door 46, spar 152, body-take 49, linger
  41, takeover-linger 40, takeover-save 11; guards phase-table (`todo` 27),
  switches. Its break proof fails cook-door §2-5 and the guard's 2. CI
  `test`, `playable`, `memory-budget` green at 73c56b0.

## Card R: #1844 (PR 9, tag 5288): reviewed, mended, listed

**The room's way back (it DEPLOYS; `roomrewind`, OFF), read at 3d925b8,
its mend at b81a4b6.** `tools/lab/wrangler.toml` (the planning session's
check, VERIFIED): the worker `brotown-lab`; Durable Objects `BURNER`,
`WORLD`, `DOOR` and the new `VAULT`, each a class of the lab's own
`src/index.js`; migrations v1 and v2 (`Vault`); no route, custom domain,
`script_name`, account or zone id, KV, D1, R2, service binding or `[vars]`;
no binding to `GAME_ROOM`, `MARKETPLACE`, `LEADERBOARD`, `ARENA`,
`FEEDBACK`; no name shared with `server/wrangler.toml`; the lab's bundle
(71.5 kB) names neither `brotown-server` nor `GAME_ROOM`. Neither
`.github/` nor `server/wrangler.toml` is touched. The lever: behind the
shared `_adminAuth` before any storage read or bookmark call; OFF unless
`=== true` (own property, cold cache fails closed); POST only, no socket,
timer or error path reaches it; a 128-bit token, in memory, one use, 10
minutes; a wrong hour keeps the plan; every player saved (the leave
door's `kick`), then the restore armed, then the abort; a refused restore
leaves the room as it is. No storage key.

- **Medium, VERIFIED, mended during the sitting (b81a4b6):** a rewind
  takes back everything in the room's storage, not only the players':
  the live flags, the freezes (`frozen:`), the login keys and devices
  admitted (`auth:`, `keyidx:`), the announcement; `roomrewind` itself,
  so the undo's plan answered "off". A finder's probe of the PR's own
  example (a kill switch thrown and a cheat frozen, then a rewind past
  them): `liveflags {}`, `frozen:bp_cheat` null, and nothing said so. The
  mend: `alsoBack` (one `get`, one `list` capped at 100, read only) puts
  the flags and freezes as they are now, and what to do after, in the
  plan's and the do's words; OPERATIONS and the spec say the same.
- Low, VERIFIED, mended in b81a4b6: the owner's log line was awaited
  after the restore was armed, with the abort 50 ms later; it now goes
  before the arming, so nothing is awaited between the arming and the
  answer that carries the only copy of `undo`.
- Nits: a pasted bookmark is checked for its shape only at the plan (a
  typo is found at the do, after the sockets close); a storage refusal
  answers 400; the token compare is a plain `!==` (behind the admin key).
- Suites: rewind 32 (more at b81a4b6), admin 34, wire-audit, liveops 110,
  wire-hostile, httpauth 23, keep-switches 14, session-door, quiet-phone;
  guards switches, wire-table, systems, switches-thrown, four-lines,
  storage-marks; `node tools/lab/selftest.mjs` (8 restore checks, no
  network). Two of its four break proofs fail as it says. The lab try is
  the owner's (Needs).

## Card E: #1852 (tag 5095): read, listed

Opened during the sitting, on the owner's yes ("Just go recommended",
21:46 UTC, by the planning session's word): `arenasettleplan` and
`econresetput` turn ON by default (it DEPLOYS). Read whole (56 lines):
`_arenaSettlePlanOn` (gladiator.js) and `resetPutOn` (econcard.js) now
read `!(own && !flag)`: missing or a cold cache ON, `false` (any falsy)
off, as every ON switch reads; the two rows now say what `false` puts
back; the suites follow the default (arena-settle, econ-card,
chaos-restart's case 6, cost-guard §17's words: 6 puts a 1 v 1 match with
the plan, the old order's 5 off). A plan already on file is finished
either way (`_arenaStakeSweep`, `_arenaSettleWait`): turning it off never
strands one. Its cost, the owner's: two rows an arena match, one put a
restart in an empty room. CI `test` green at 2475069.

## Card SK: #1782 (PR 1, tag 5440): re-read, listed

Held since sitting 10 for the owner's yes to its cost (+8 to +10 move
messages a ride, all in the ~1.9 s roll-off), now given ("Just go
recommended", by the planning session's word). Reviewed clean at sitting
12 (5f08c7b). Since then only `main` merged in (a39a152: `?ridecoast`'s
row beside `main`'s new rows, the switch page made again) and its status
(0581207): its diff against `main` is, line for line, the one reviewed
(`src/`, `server/`, `tools/`). It DEPLOYS (`server/test/ride.test.mjs`).
Switch `?ridecoast=0`. CI `test`, `memory-budget` green at 0581207.

## Card P: #1840 (tag 5257): reviewed, listed

**The fire goblin's numbers packed a frame at a time (it DEPLOYS: its
new `server/test/inflate-raw.test.mjs`, which its body does not say;
`?framepack=0`): clean (lows).** The inflater (`inflateRaw.js`) under a
finder's fuzz, two seeds of 20,000 calls (clean, damaged, cut, grown and
random streams, each watched for hangs): 0 throws, 0 hangs, the longest
18 ms, 0 wrong lengths, 0 disagreements with zlib; the output's size is
the caller's, never the stream's. Races (a strip destroyed mid-pack, or
during the rebuild's sliced unpack; a read during a pack): nothing comes
back, nothing throws, nothing is held. Every reader of a monster strip's
numbers goes through `readSourceRect`; `drawSourceRect`'s callers are
props, objects and shatter. Packing works in 2 ms slices; a pin waits for
the next task after 4 ms. `?framepack=0` is `main`'s path. `mp-framepack`
names its lane and plays the world.

- Low, PLAUSIBLE: paletteTex.js ~750 (the upload hook) unpacks a whole
  strip at once (40 ms for 7.7 MB in node; about 25 ms for the goblin
  here, 100 ms on a phone 4x slower). Strip sources never unload (Pixi's
  collector off for them), so only a lost context whose pack finishes
  between the rebuild and the first draw gets there. `mp-framepack` step 4
  with the context lost during a pack would settle it.
- Nit: `run.mjs` ~307 gains a line for `mp-framepack` (a scenario is found
  by its file; no guard fails it). The inflater's §3 checks only "null or
  the length asked": two of its own checks removed (inflateRaw.js ~164,
  ~187), all 47 still pass while the fuzz then finds wrong bytes (no
  player: the page inflates only what it packed and checked). A destroyed
  packed strip can still be read into the cache (bounded by its cap; `main`
  read destroyed strips too). A pack that fails once stays whole for the
  session. png8Worker.js ~51-52's comments swapped.
- Suites: inflate-raw 47, strip-door, picture-door, held-numbers,
  held-sweep, palette, look-palette-choice, monster-palettes,
  strip-slices, device-profile; guards pixel-readers, switches,
  scenario-lanes, state-ledger, asset-door, cache-bytes, budgets; its
  three break proofs fail as it says. No memory line moves (its body:
  `buffers` at the fight 21.2-21.4 -> 19.3-20.4 MB, its highest at home
  either way). CI `test`, `memory-budget` green at 6d61333.

## Card O: #1841 (PR 8, tag 5228): reviewed, listed

**One program or three, and how a look is made, as knobs (it DEPLOYS:
`server/test/`): clean (lows).** A finder ran `main`'s and the PR's choices
in one node process through the page's real call paths, 22 devices times
11 addresses: 242 cases, 0 differences in either answer or its `why`
(iPhone and Android: one program, the palette; Windows and a Mac: three,
baked; SwiftShader, llvmpipe and WARP: three, software). The suspected
high, an iPhone moved off three programs, is DISPROVED: `main` already
gives it the one (v2.3.5016, the owner's "make 1 program the default";
CLAUDE.md §7's line is older than that: Found, below). Load order: each
choice the same before the device class is known and after, at every
lane and rung. The governor's live knobs are `['rate','pixels']` on both,
so a phone's kept rung loads (`{full:[0,1,0,'rate,pixels']}` read back).
Nothing new reads the navigator or the chip's name outside
`deviceProfile.js`.

- Low, VERIFIED: drawLanes.js ~321 (no ask spent on a class not yet
  known) has no test; reverted, everything stays green. It picks the first
  real lane at the first `drawLane()` after the renderer, not 5 s on; the
  only lane it changes is `thirty`, whose row is `full`'s.
- Low, VERIFIED, for O's PR 12: an override row with no `when` (the old
  `{ knob, value, why }` shape, which pinned always) now never pins, and
  the guard's §8 accepts it (`{knob:'water', value:'still'}`: §8 ok,
  `laneKnob('water')` still 'moving').
- Nits: `__btLane().knobs.program` can disagree with what is drawn
  (SwiftShader before the renderer; it ignores `?onebatch` and a failed
  link; no scenario reads it); a `drawLane()` inside `askingAs` can tell
  subscribers another device's values (only `pixels` subscribes, no
  override); stale pointers: device-profile.md ~119 and ~137, SHAPES.md
  ~789, census/traps.md ~318 (§225's break proof names a `SOFTWARE_GL`
  that is gone).
- Suites: one-program 29 (also with no root `node_modules`, as Server CI),
  device-profile 37, look-palette-choice 33, frame-pacer 124, crowd-cap
  19, palette 15, render-res 40, report 115; guards draw-lanes, switches,
  state-ledger, systems, scenario-lanes and six more. Three of its break
  proofs fail as it says. Mended during the sitting: `main` merged in
  (2f138f2; only O.md conflicted).

## Card J2: #1845 (PR 8, tag 5428): listed

Step 3 (a test; no deploy). `mp-ghostaudit`'s cook sample: a campfire
burns 45 s and this box's photographs take 142 s, so a fire gone out is lit
again from the second log before the cook; a world tree is not a leftover
(its texture names it). Its `test` was RED at bf62d4b: guards
`traps-test-tools` §29, "label selectors in tools/qa/mp/ only fall, file by
file" (the relight's `hasText: 'Light fire'`, 2 > 1). Mended during the
sitting (d674adb): both lights share one helper, §29 back to 120 at its
line. J2's runs: 12 of 12, three times. The full audit is the owner's to
ask for (CLAUDE.md §6: about the sample now or the full run).

## Card T: #1837 (PR 5, tag 5305): HELD (the planning session's (B))

Step 3, done: its files are its card's PR 5 line (the spec, the table's
`on`, the guard's `--due` and fallback hold, its status); `on` on all 477
rows (0 switch rows without it); `--due` runs and changes nothing; check
12 green (5 fallbacks, the line 5); `?crowd`'s row now says it caps
players (sitting 15's low). CI `test` green at 036d9b4. Held only by the
order: it conflicts with every PR here that adds a switch row.

## Card O: #1836 (PR 6, tag 5226): HELD

It now carries #1837's head (0304d26, merged before the planning
session's change of plan reached O), so it follows #1837 in the short
sitting after this one. Sitting 15's MEDIUM (a crowd rung that hides no
one costs about 5 s of late frames) is to be checked as mended then.

## Card K: #1848 (tag 5541): HELD (K's second), reviewed

**The sprint mark, now OFF (`sprintmark: true` only), read at c2f974c:
with the flag missing it is `main`'s behaviour (VERIFIED: 640,000 random
steps through both, flags `{}`, null, false, 1, 'true', inherited true: 0
differences); two MEDIUMs on the ON path, before the owner's yes.**

- **Medium, VERIFIED:** the hole stays open to a variant: mark one move
  every 1.5 s or more, the rest unmarked; each unmarked move is inside
  the grace (sprint speed), each marked one just past it (billed 0;
  sprint.js ~180-181's `>= GRACE_MS` exemption). A node probe: 600 of 600
  moves at sprint speed, 0 stamina in 60 s; on the bench it gains 3.97
  with the flag ON, against the line 3.43. A cure the finder offers: bill
  a carried run only to the last carried move that moved, and drop the
  exemption.
- **Medium, VERIFIED (the worker by probe, the page by reading):** with it
  ON, standing still is billed for pauses under about a second with no
  re-press: the page marks a move only while moving (src/game/sprint.js
  ~75), a tapped sprint stays on through a thumb lift (`IDLE_STOP_MS`
  700), the stop packet moves a few px, the keepalive at ~1 s moves 0.
  Pauses of 300 / 600 / 690 / 900 ms billed 4 / 7 / 8 / 10 stamina (0 with
  it off); a dodge roll mid-sprint about 3-4. The page predicts no drain,
  so the bar drops by up to ~8 when the worker's value lands. The body's
  "standing still is never billed" and "the one honest cost" are so only
  with it off. No test plays the ON path (`sprint.test`'s `fresh()` clears
  the flags).
- Lows: the honest sprinter walks 1.5 s, not 0.8 (claimbots.mjs ~388-400)
  and is the baseline for 3.43; the census row's 3.43 is a setting not
  live. Nits: sprint.js ~25-34 and ~114-116 describe the off way only; a
  flag flipped ON then OFF mid-run bills one gap (at most 11) once.
- Suites green: sprint 59, potions 31, liveops 110, move-budget 62,
  move-diet 27, move-path 31, ride 50, safe-heal 36, claims-gain 14.

## Card R: #1847 (PR 7, tag 5286): HELD (R's second), reviewed

**The paged export (`roomexport`, OFF): no request returns a login key,
its fingerprint, the key index or the hidden settings today; one MEDIUM
to mend before it is listed.**

- **Medium, VERIFIED:** the deny list is written by hand (admin.js ~83-91,
  `EXPORT.NEVER = ['auth:','keyidx:','hidden_settings']`); the registry
  marks nothing secret. A finder added a mark `paytoken:` (whose `player`):
  `?prefix=paytoken:` and every character's pages gave its value, and the
  suite stayed 41 of 41. A cure: a `secret` field on every mark, read by
  `exportNever`, and a guard that every mark states it.
- Medium/low, VERIFIED (for the planning session): device ids come out by
  `?prefix=device:`, `?prefix=lspin:` and `botstat:`'s `deviceId` (in
  every character's pages); the PR refuses `auth:` for holding "the keys'
  and the devices'", and the device token is the device lock's second
  factor.
- Low, VERIFIED: a character's page reads up to about 33 keys whatever its
  limit (`read: 1` after 30 gets at `limit=1`); bounded, never the whole
  room. Low, PLAUSIBLE: a page has no cap in bytes (200 `rpg:` records at
  once). Nit: a walk is not one moment (awaits between pages).
- Tried and refused: `''`, `k`, `key`, `login`, `AUTH:`, `auth`, `auth: `,
  `auth:bp_a`, `hidden`, `__proto__`, `constructor`, an array; a cursor
  outside its prefix; `bp` as a character id. The admin key first; OFF
  answers 409 before a read; it writes nothing. Suites green: room-export
  41, liveops 110, hidden-settings 73, cost-guard 44, wire-audit,
  wire-hostile; guards storage-marks, switches, wire-table, action-door.

## Card P: #1846 (tag 5256): HELD, reviewed

**The slimes load as you walk (`?slimewalk=0`): two MEDIUMs on screen,
from one removed promise (the slime's strips were always loaded and two
readers still count on it).** `?slimewalk=0` restores both.

- **Medium, VERIFIED (the code path read end to end):** the stat window's
  demo (`HeroExpanded` -> `StatDemo`): effectsRenderer.js ~18394
  `_filmStuck` and ~18322 `_filmGunk` read `getSlimeFrame('hit', 0)`, null
  unless a slime look is loaded (near Verdant's slimes, or in the Goo
  Grotto). With a bow, no arrow sticks in the demo's slime (the owner's
  ask, v2.3.2991) and the burst is pixel pieces; `fighterCapture` keeps
  that film (`_films`), so it stays so after slimes load.
- **Medium, VERIFIED:** the farm's Dungeon Workshop (BroTown.jsx ~6052, 4
  fodder by default): `dungeon_started` there goes through `_enterArena()`
  with no homes and no preload, and `wheelArtOn` is false, so the look is
  never loaded (the walk from the Wheel to the farm freed it):
  entityRenderer.js ~10960 shows the plain circle (`display._body`) for the
  whole run, against the PR's "a slime whose strips are not in is not
  drawn" and the zone's art behind its overlay.
- Nits: slimeSprites.js ~108's comment (a failed read leaves the look
  ready with no frames: a circle, as for other looks on `main`); the row's
  thrown says `=0`, `off` and `false` work too. CLAUDE.md §8 asks
  `mp-heldsweep` for a load in play; the body names no run. Its memory
  line (artCache 95.1 -> 90.6) matches what it measured. After #1840 lands
  it merges `main` (docs, census, memory-budget.mjs's header, P.md; no
  code file conflicts).

## Not reviewed: opened during the sitting

L's #1851 (5214, the harvest door; it carries #1839), O's #1850 (5229, the
passes; it conflicts with `main` at O.md), J2's #1849 (5429): the next
sitting.

## Found (no card's, or another card's)

- CLAUDE.md §7, "three sprite programs on every chip; the one program
  (`ONE_BATCHER`) only with `?onebatch=1`", is older than `main`'s code:
  since v2.3.5016 (the owner's "make 1 program the default") a phone draws
  with the one, three only for a software renderer or a Windows or Mac
  computer (paletteTex.js ~466-471, TRAPS §260's note). CLAUDE.md is the
  owner's file: for the planning session.
- K: three table edits nothing catches since §7 left the wire guard
  (#1838 above).

## The lines

On `main` 64bb498 the phase table's `todo` is 28 at its line 30: this PR
lowers `TODO_LINE` 30 -> 28 (break proof: 27 fails check 7). #1839 brings
it to 27; the next sitting may lower it again. The hostile census's line
goes 19 -> 1 in #1838 itself. No memory line moves (#1840). The four
lines' guard: REHEARSAL_LINES

## The list

LIST_LINE

## The whole

WHOLE_LINES
