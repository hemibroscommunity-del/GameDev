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

## How this sitting ran

Each session merged `main` abff2ef and sent its heads through the
planning session. Card T's #1863 leads: from it on, a PR adding a PAGE
switch row must write the reader's forms (switches check 13), so P's two
page-row PRs carry #1863's head 403ea57 (a cross-card carry the planning
session allowed: #1863 leads and is reviewed; held with it if it is
held), verified necessary (P's #1868 on 403ea57 fails check 13,
"stale"). Within a card each PR carries the one before (L's #1866 on
#1864; P's #1868 on #1853, which collide in P's status file). Every
listed head holds `main` abff2ef or, for K's, 6f1e6e2 (the `main` before
sitting 17's own PR): one merge base each, step by step. The red team's
#1871 and #1872 came at the planning session's word (drafts, marked
ready by it before they merge; neither deploys). R's #1873 (a weapon's
own id, a stored record's shape) is not for this sitting, by the
planning session's word: it waits for card OPS's Test panel row and
#1872, so the owner can set `newersave` without a terminal.

## Decided for the owner while away

Each with its switch, for the planning session to read to the owner:

- **#1847** (card R, from its words): what the export gives, one by one
  (`EXPORT.ALLOW`: a character's own records a copy needs, and every
  record holding the world's value), what it keeps out and why
  (`EXPORT.KEPT_OUT`), its spec its own file, a page 50 records by
  default (1 to 200). Switch `roomexport: false`. That it is ON is the
  owner's own yes ("Just go recommended").
- Not under the heading, the nearest: L's #1864 and #1866 say nothing a
  player sees changes (`posedoor`, `racedoor`, ON; `false` turns each
  off); T's #1863 changes no switch's meaning (no switch); P's #1868 is
  the owner's own answer (option B), `?beltstandin=0`; P's #1853 is a
  memory saver ON by default (the memory law), `?elemicons=0`; the red
  team's #1871 is a guard that reads `server/wrangler.toml` and never
  writes it, #1872 words in OPERATIONS.md.
- K's #1848 (`sprintmark`) lands OFF by the owner's choice (not decided
  while away); `sprintmark: true` turns it on, the owner's to give.
- For the owner, costs (never decided this way): none on this list adds
  a write, a message or a pace. #1847 reads records only when the owner
  runs it (its body: a whole copy of 100 characters about 5,000 reads,
  0.1% of a free day), the owner's yes.

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

## Card K: #1848 (tag 5541): reviewed, mended, listed

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
  **Mended during the sitting** at 621cf17 (head c87ec1b, `main`
  abff2ef in), read by the gatekeeper: that cure, inside the
  `_sprintMarkOn()` branch only (OFF untouched); sprint.test §11 plays it
  (on: 543 px/s and it pays). Break proof (the gatekeeper's): the cure
  taken out fails §11 ("643 px a second for 0 stamina"); with it, every
  sprint check passes. The ON section renumbered §11 (the nit), its
  switch row's `thrownFails` with it. The first step's glide left
  (cosmetic).
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

## Card P: #1868 (tag 5560, the owner's gear item): reviewed, @@P1868

**The chain belt's stand-in (`?beltstandin=0`; option B, the owner's own
answer): lows and nits only.** Read at 2b920a7 (`main` abff2ef in).

- What a player sees, VERIFIED by node probes: only a figure in BOTH
  armour pieces stands, and only while it runs and its belt's jog sheet
  packs (a matched copper, iron or steel pair facing north-east or
  north-west; a mixed pair in all eight); yours and other players'
  (townsfolk wear none); never the hit, dodge, ride or jump poses, nor
  your own climb. Its facing and mirror are the body's. Never invisible
  (the stand frame is preloaded; one not yet baked draws the plain
  standing body). It cannot stick: the belt's key does not hang on the
  look, belt sheets are never let go, a silent worker is let go at 20 s
  and the page packs. After the sheet: the plain jog's flash until each
  frame bakes (27 on this box), as its body says.
- `?beltstandin=0`: the test answers false before it loads or counts
  anything: both pose lines are `main`'s; `_fullsetCoversBake` moved byte
  for byte. No new texture, canvas or read back ("no MB" holds).
- Low, VERIFIED: a belt file that keeps failing makes the figure stand
  again on each retry round (gearSheets.js ~990 puts the sheet back to
  loading): stand 0 to 8 s, jog to 13, stand to 21, jog to 31, stand to
  39, up to ten rounds; against beltHold.js ~32-34 and its body ("a sheet
  given up on is never waited for").
- Low, VERIFIED: `beltHoldsJog` (beltHold.js ~72-74) makes about 500
  bytes of garbage and 0.4 to 1.1 µs a call, every frame, for every
  running figure in both pieces (the full-set test builds an array,
  objects and strings before the cheap sheet test), against v2.3.4878's
  "an armoured crowd makes no garbage". The cure: a per-facing "belt in"
  latch first.
- Low, VERIFIED: the chest and legs ids are not held to the art that
  ships: a peer sending unknown ids stands in all eight facings and
  starts belt loads `main` never makes for them (bounded).
- Nits: mp-beltstandin's "no plain jog frame" reads `__btLocalMisses`,
  which only the old masked path records (on the look-armour path it
  cannot fail; on this box it measured 11 all the same), and a wall can
  make its "stood" count; a line in run.mjs ~307, which a scenario needs
  none of (CLAUDE.md §6); your own jump or climb jogs plain (no
  stand-in; entityRenderer.js ~14772) where a peer's climb stands.
- Its blocks (tag-blocks.json): P's second block 5560 to 5579; at the
  planning session's word its new head writes RT 5580 to 5599 (the red
  team's 5586 to 5592), OPS 5600 to 5619, MOD 5620 to 5639, `nextBlock`
  5640.
- Guards: switches 20, switches-thrown, four-lines, state-ledger,
  pixel-readers, scenario-lanes, systems, tests-by-system, hold-names,
  budgets, asset-door, draw-lanes; 41 server suites that read its files.
  The phone test passes `world: 'wheel'`, lane `full`, and reads probes
  that exist. Its phone run is P's (not run by the finder).

## Card P: #1853 (tag 5258, the element marks): @@P1853

Sitting 17 read it clean (its lows stand: the pixel readers' guard reads
only a file's own text, so the marks' paths from elemHits.js are
invisible to it; `buffers` at home 23.6 to 23.8 against its line 24.2,
measured alone; `src/state/art.js` gains an unrelated ledger row) and
held it for `main`. Its head e960377 took `main` abff2ef: its code is
byte for byte what sitting 17 read; `artCache` measured again with the
slimes in, 25.5 at the fight, its line 90.6 -> 88.6 (both savings, as
sitting 17 asked); its `?elemicons` row carries `on: '2026-11-15'`.

## The red team: #1871 (tag 5587): step 3, listed; #1872 (tag 5588): held

At the planning session's word (the red team opens no PRs to the
gatekeeper's card; these two come through the planning session).
Drafts: the planning session marks each ready before it merges.

- **#1871**: one file, `tools/guards/do-migrations.test.mjs`: it READS
  `server/wrangler.toml` (never writes it) and fails unless its
  `[[migrations]]` are exactly the known list (one block, `v1`, the five
  classes) and no `deleted_classes`, `renamed_classes` or
  `transferred_classes` stands anywhere outside a comment. Green on
  `main`; it runs in server's `npm test` (server/test/run.mjs runs
  tools/guards/*.test.mjs), so a bad line fails the deploy's own `test`;
  a guard, not a suite under `server/`: it deploys nothing. A new Durable
  Object class is a block added to KNOWN in the same PR as its block in
  wrangler.toml (the owner's word, CLAUDE.md §4). Its four break proofs
  are in its header.
- **#1872**: words in `docs/OPERATIONS.md`, rolling back a bad server
  update and what to do when GitHub cannot deploy. Rehearsed green at
  65c5a8b; then card OPS pushed 051dbbd on it (a fast-forward, words
  only: the rollback's step 2 by the Test panel's new "Set a switch"
  row, OPS's #1891, not on `main`). **Held for sitting 19**, beside
  #1891: its new line writes "(v2.3.5602)" in full, and 5602 is #1891's
  own tag; precheck's version-tag counts every tag written in full in
  `main`'s files as used (precheck.mjs ~353-362), so with #1872 landed
  first #1891's diff adds only a "used" tag and its precheck fails (the
  plan README's Tags, v2.3.5055). The cure: #1872 after #1891 (its words
  then name a row that exists), or the tag written bare.
- Their tags (5587, 5588) and the red team's others (5586, 5592) are in
  no block on `main` yet: P's #1868 writes RT 5580 to 5599, at the
  planning session's word. Precheck asks only that a tag be unused on
  `main`.

## Not listed

- R's #1873 (5282, a weapon's own id: schema 21 -> 22, a stored record's
  shape; its own line, merged by itself when it comes): the planning
  session's word: after card OPS's Test panel "set a switch" row and
  #1872 are on `main`, so the owner can set `newersave` without a
  terminal if a rollback is ever needed.
- For sitting 19, at the planning session's word: R's #1877 (5284), L's
  #1876 (5218, carries #1864 and #1866), the red team's #1878 (5593,
  with its 5594).
- Card O's PR 14a and J2's next: not opened this sitting.
- Drafts left alone: the red team's #1867, #1869, #1870 (findings
  documents); #1415 and #1211 (storage, never to merge).

## Stalled

None: only P's status says `working`, on branches pushed within the hour.

## Found (no card's, or another card's)

- L's #1864's finder: spar.js ~374 writes `.po` on a spar clone (`po` not
  in `SPAR_NOT_COPIED`): a fighting clone drawn sitting (the Test panel's
  lever only). Card L's (the pose door's one writer).
- L's #1866's finder: `dailychest.test` red once in a full run that
  crossed UTC midnight (streak 2), green alone twice: a suite that reads
  the day mid-run. Card J2's (8.1).
- The box: precheck's server suites (a five-minute limit) timed out once
  with three finders' suites running beside it (load 12 on four
  processors); green when run alone. A sample, the box's.
- Card OPS's branch claude/plan-ops-1-card (83c0f42, no PR) writes
  tools/dev/tag-blocks.json's OPS block and `nextBlock` 5620 on the
  lines P's #1868 writes (RT, OPS, MOD, `nextBlock` 5640): whichever
  lands second conflicts; OPS's should drop its edit (the planning
  session's word: OPS and MOD write no blocks).
- P's #1868's finder: its blocks' `nextBlock` 5580 (its first head)
  would have handed the next card the red team's 5580 to 5599: mended
  by its new head, at the planning session's word.

## The lines

On `main` abff2ef the phase table's `todo` is 24 at its line 27: this
PR lowers `TODO_LINE` 27 -> 24 (break proof: 23 fails check 7). L's
#1864 and #1866 bring it to 22 on the list's tip; the next sitting may
lower it again. The four lines' guard on `main` printed the room K's
#1861 earned: monsterCombat.js 1785 (its line 1792) and its
`updateMonsterCombat` 1724 (1732): this PR lowers both (break proof:
`updateMonsterCombat` 1723 fails check 2). @@LINES

## The list

@@LIST

## The whole

@@WHOLE
