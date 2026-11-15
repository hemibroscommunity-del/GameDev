# The gatekeeper's review, sitting 18 (card Z; tag 5375)

Taken 2026-11-14 to 15 on `main` at abff2ef (tree bd9e0ddc: sitting 17's
twelve PRs merged). Tags in this file are written bare. Each PR that
changes `server/` or `src/` had a finder read the code around its diff
(the angles of `/repo-review` that apply), re-try its break proofs and try
to disprove what it found; the mends of sitting 17's holds were read by
the gatekeeper. Documents, tools and tests got step 3.

VERIFIED: the story runs, on the code path named (a finder's node probe
in a throwaway copy, or a reading end to end). PLAUSIBLE: the code does
it, what sets it off is unproven. The probes are not in the repository.

@@HOW

## Card T: #1863 (PR 6, tag 5306): mended, listed first

**The page's one switch reader (`src/game/switches.js`), sitting 17's
MEDIUM mended at 8197acc (read by the gatekeeper).** The reader now reads
`location.search` at each ask and parses again only when it changed (a
string compare an ask): `create`, `login` and `noresume` dropped by
`history.replaceState`, and a test flipping a switch mid-page, are
answered for the address as it is. switch-reader check 4 holds it (the
reader made to keep its first address fails it). The seven moved reads
keep their old timing: `nmlask` and `nomapdetail` are still read once at
the module's load, `tapthrough` at the first tap, as on `main`; the
others at each ask.

- The two lows mended: guide-arrow.test ~85 and desk-teach.test ~61 look
  for `sw('guidearrow')` in the code, not the old read left in a comment.
  These two edits make it DEPLOY (`server/test/`).
- Sitting 17's other lows stand, as its words say: the four pattern reads
  differ from `URLSearchParams` on odd addresses (the name twice, `%30`,
  a `?` in a value), held equal only on the guard's fixed addresses.
- Nit: its body and commit call the medium "sitting 18's"; it was sitting
  17's.
- With `main` abff2ef in (403ea57): `harvestdoor`, `dungeondoor` and
  `?ladderpass` dated 2026-11-14, the day they merged (UTC, in git):
  sitting 17's "the next sitting sets each to its merge day", done.
- **The order:** from it on, a PR adding a PAGE switch row runs
  `switches.test.mjs --write` (check 13: the reader's forms between its
  markers). It leads this list.

## Card R: #1847 (PR 7, tag 5286): mended, listed

**The paged export (`roomexport`, ON by the owner's yes), sitting 17's
MEDIUM mended at f72a19a (read by the gatekeeper).** `EXPORT_MASKS`
(admin.js) masks a login-wheel pot's opId `loginspin:d:<device>:<day>` in
an `inbox:` row on the page's copy (`loginspin:d:masked:<day>`); the
stored opId is never changed (a pot retried after a deploy finds its
stamp by that exact id). room-export §6b holds it.

- Read for a second road out: the opId's stamp is `oplog:<opId>`, a mark
  off the allow list; nothing else stores `.opId` in an allowed record
  (bank.js, dailyrewards.js, valuepause.js keep their own ids); a device
  id holds no `:` (`cleanDevice`: `[a-z0-9_-]`), so the mask's
  `[^:]*` takes all of it. A character's `p:` pot is keyed by the
  character's own id, not secret.
- Sitting 16's two lows stand (a character's page reads about 29 keys
  whatever its limit; no byte cap); sitting 17's low (a new value-holding
  `between` or `room` mark left off the list silently, failing safe).

## Card L: #1864 (PR 5's seventh, tag 5216): reviewed, listed

**The pose door (`_poseTo`, `POSE_WAYS`, `posedoor` ON): lows and nits
only.** Read at 7171908; its head d37e37a (`main` abff2ef in) changes the
same twelve files, byte for byte the same code.

- With it ON nothing changes (each caller traced): `_handlePose` still
  filters what is no pose, the dead, the dying and the `emotes` /
  `emotemoves` switches before it asks the door, so the door refuses
  nothing today; it writes, marks dirty and saves as `main` did;
  movement.js ~860 and bodytake.js ~94 write `null` as before. Nothing
  on the wire changes (v1 and v2). `posedoor: false` is `main`.
- Low, VERIFIED, on `main` already: spar.js ~374 (`ps[k] = v`, the Test
  panel's spar clone) is a second writer of `.po`: `po` is not in
  `SPAR_NOT_COPIED` (~219; `ex` is). A probe: the owner sits, a spar
  clone is born `po: 'sit'` and fights sitting (the tick sends it). The
  door, its suite and the guard miss it; the spec's "one writer" is so
  but for it. The cure, one word: `'po'` in `SPAR_NOT_COPIED`.
- Low, VERIFIED: a pose carried into a new body in an object literal
  (`...{po: old.po}` planted in join.js ~918's player) passes the suite
  (26), the guard and eight neighbours, and the probe shows the pose
  crossing a plain rejoin. pose-door ~178 proves nothing: ~172's
  takeover had already stood the body up; it should pose before the
  second join.
- Low/nit, VERIFIED, on `main`: "never by the dead or the dying" holds a
  new hold only: after `_handlePlayerDeath` (index.js ~3046) the body
  dies, and respawns, still `po: 'sit'`. The spec's "a death" under
  `move` is the phone's `msg.dead` alone.
- Nit: the body says the guard reads destructuring and reflective writes
  "on every door's line"; it reads them only where no literal value is
  asked (phase-table.test ~405, ~429): on the monsters' rows
  (`alive: true`) `[m.alive] = [true]` passes (its comment says so).
- The guard, planted (a finder's): caught `||=`, `??=`, `&&=`,
  `Object.assign(ps, {po})`, `{['po']: ...}`, destructuring, a for-of
  target, a template key, `Reflect.set`, `Object.defineProperty`, an
  alias of the object; missed (none claimed): a key in a variable, an
  object literal or spread, `Object.assign(ps, msg)`,
  `Object.defineProperties`, `Reflect.set.call`, an alias of `Reflect`.
- Break proofs 25 to 30 fail as claimed; the guard before the PR stays
  green on 26 to 30's forms. Suites: pose-door 26, emotes 124, ride 96,
  join-stands-up 30, linger 41, takeover-linger 40, move-claims 45,
  body-take 49, refusal-door 46, liveops 110, rejoin-resend 65,
  silent-refusals 31, tick-share 23, mirror-audit 399; the phase guard
  (14 doors, 23 `todo`); the switches guard (487 rows).

## Card L: #1866 (PR 5's eighth, tag 5217): reviewed, listed

**The race door (`_raceTo`, `RACE_WAYS`, `racedoor` ON), stacked on
#1864: lows and nits only.** Read at 6f3df84, its own change from
7171908; its head ffc9bd0 (`main` abff2ef in) holds the same code.

- VERIFIED by a probe in a real room: a start, the whole lap and a win
  with the flags `{}`, `racedoor: false` and `racedoor: true`, against
  this race.js and `main`'s: the records, `race_state`, the four
  `race_cp` and `race_end` the same. Every start writes a finite `t0`
  and `endBy` after it, so the door's rule always passes; the end writes
  `null` as before; a win credits the quest and saves in `main`'s order,
  no await added (a race pays no gold or bag). `racedoor: false` skips
  only the rule.
- Low, VERIFIED: the rule is checked only when the record is written; the
  record stays changeable (race.js ~203 and ~212 change `off` and `next`
  on purpose), so a planted `ps._race.endBy = Infinity` passes the suite
  and the guard.
- Low, VERIFIED: the guard reads `defineProperty`, not
  `defineProperties` (phase-table.test ~434): open on every door's line;
  and a new body built with the field (`{...ps, _race: null}`) passes.
- Low, PLAUSIBLE: `_handleRaceStart` ignores the door's answer (race.js
  ~179): were it ever to refuse, the start's stamp and `race_state` would
  still go and an old race stay on. No path reaches it today (sitting
  17's shape).
- Low, VERIFIED by tracing: "no join way: the join makes the body afresh"
  is false for a body kept by a takeover (join.js ~916, bodytake,
  v2.3.4455 keeps the live state, `_race` included). The claim was in
  `main`'s phases.js already; the spec repeats it.
- Nits: the switch's words ("the next move could then never end it")
  overstate (the finish or a leave still ends it); the `racedoor` row's
  system is `quests`, the `race` row's `social`; the door's suite plays
  no finish (tour.test does).
- Break proof 31 fails as claimed. Suites: race-door 25, move-claims 45,
  sound-cues 165, tour, ride, safe-heal, refusal-door, inbox, liveops; the
  phase guard; switches (488 rows). With `main` merged: the full
  `npm test` 430, one red, dailychest, its run crossing UTC midnight
  (green alone, twice): the box's.

## Card K: #1848 (tag 5541): @@K

**The sprint mark (`sprintmark`, OFF by the owner's choice), its ON
path re-read at 29a9ab5 (the mend 7481d01) as new code.**

- OFF is exactly `main`, VERIFIED: 640,000 seeded random steps through
  `main` 6f1e6e2's server/src and the PR's (flags `{}`, null, undefined,
  false, `'true'`, 1, `[true]`, inherited true, `movebudget: false`,
  `sprint: false`; gaps 0 to 3000 ms, speeds 0 to 2000 px/s, every `sp`,
  dodges, zone changes, blocks, rides; 207,059 paid sprint steps): 0
  differences in place, stamina, every sprint and budget field, the regen
  hold and every message sent. The same probe with it ON differs on
  4,990 of 5,000 steps (it sees).
- Sitting 16's two MEDIUMs are closed, VERIFIED: one mark every 14 to 16
  moves at 665 px/s runs at 531 px/s (the walk and its burst) and bills
  15 to 16 s a minute; pauses of 300, 600, 690 and 900 ms and a roll of
  250 to 700 ms bill the same on or off. No honest refusal in 28 honest
  traces (walks 150 to 499 px/s, frames 16 to 400 ms, stalls, bursts,
  rolls, keepalives).
- **Medium, VERIFIED (ON only; read by the gatekeeper too):** a marked
  move that goes nowhere (0 to 0.5 px) inside a run is still given the
  sprint's bound (`_sprintBilled`, sprint.js ~164-167; movement.js ~701),
  so the budget refills at sprint speed over the gap, while `_sprintPay`
  bills nothing under 0.5 px and ends the run (~200); the next marked
  move, 1 ms later, is a run's first (billed 0) and spends what was
  banked. A still marked move, 100 ms, a 66.5 px marked move: 658 px/s
  for 0 stamina over 60 s, about 2.37M px an hour against the PR's ON
  line 1,498,368. A cure tried in a scratch copy: judge such a move at
  the walk (`!(_d > 0.5)` at ~701): 528 px/s, the rest unchanged.
- Low, on `main`, not closed by it: a step is billed at most 1 s
  (`STEP_MAX_MS`) while the budget refills at sprint speed for the whole
  gap: one marked move every 3 s claiming 1,995 px runs at 665 px/s,
  stamina holding at 89, on or off (the PR's body names it). Lows
  carried: a flag flipped ON then OFF mid-run bills one gap once; the
  census `move` row (2.56) is measured ON while live is OFF.
- Nits: sprint.test ~418 numbers its new section "9." after "10."; a
  run's first step glides at the walk for one interval (movement.js
  ~917, cosmetic). Nothing on the wire changes OFF; ON adds no message;
  no write (the two new fields are memory only, never saved or sent).
- Suites: sprint 69, move-budget 62, move-diet 27, move-path 31, potions
  31, ride 96, safe-heal 36, liveops 110, claims-gain 15;
  traps-server-word; switches.

@@REST
