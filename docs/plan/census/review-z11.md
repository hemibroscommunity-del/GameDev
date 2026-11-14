# The gatekeeper's review, sitting 11 (card Z; tag 5367)

Taken 2026-11-14 on `main` at 90a91dbc (tree ec0fa5eb, sitting 10's
eighteen merged at 12:47 UTC). Tags in this file are written bare (the
planning session, sitting 11: a full tag in a review counts as taken on
`main`; `review-z9.md` cost card TF its 5461). Each PR that changes
`server/` or `src/` had a finder read the code around its diff (the angles
of `/repo-review` that apply) and try to disprove what it found; the
gatekeeper read the code itself for every candidate that decides a hold
(#1794's ladder, #1783's ribbon). Documents and tools got step 3: #1797,
and the test-only #1788, #1790, #1795 had their honesty checked (each
still fails when what it guards breaks).

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or a reading). PLAUSIBLE: the code does it, what sets it
off is unproven (it says what would settle it). The probes are not in the
repository.

## Decided for the owner while away

No open PR carries the heading. The nearest, each named with its switch:

- **#1794** (card O, held below): "the planning session's answer (a)":
  a fast screen (90 to 144) is never paced below about 40 a second,
  whatever the rung. Its switches: `?govern=0` (no governor),
  `?ladderrate=0` (the rate as before). It also reaches what the owner's
  calls 3 and 16 did not name: a cool COMPUTER on a 60 screen (the
  judges'). Neither is under the heading.
- **#1786** (card E): the pause's words and the 13 actions are the
  owner's "Go recommended" through the planning session (the owner's own
  answer, not one made for them). Its switch: the live flag
  `valuepause: false`.
- **#1782** (card SK, not listed): "letting go" read as the stick or the
  keys, not the board's button; `?ridecoast=0`. Its cost (below) waits
  for the owner's own yes, as the README requires of a new pace.
- Card E's `arenasettleplan` stays OFF (the owner's yes to two rows a
  match pending); card TF's PR 2 (its cook's bar of 23, `?folkskills=0`)
  has no PR open yet.

## What GitHub showed at the start, and the mends during the sitting

Against `main` 90a91dbc, eleven branches conflicted on the switch page's
count line that #1768 removed (`docs/SWITCHES.md`, most also
`tools/guards/lib/switches.mjs`): card L's five (#1767, #1775, #1779,
#1791, #1796), card J2's #1789, #1790, #1795, card O's three (#1787,
#1792, #1794). Every open branch had ONE merge base with `main`
(`git merge-base --all`), so none would meet GitHub's several-bases
refusal. Card E's #1785 and #1786 merged clean with `main` but conflicted
with each other (`tools/guards/lib/systems.mjs`, `docs/SYSTEMS.md`, E's
status: each adds a file to the economy's list). The gatekeeper sent
these to the planning session at 12:52 and 13:12.

MENDS (filled in at the list's writing).

## Card J2: #1788, #1789, #1790, #1795 (tags 5421 to 5424)

Read at 1d3a70c, dd8bf05, 1ba13b3, 7595194. The files are the card's
(the cape's: `eventcapes.js`, the switch's line in `liveops.js`, its
suite, the registry row, the spec; the tests' and `red.md`).

- **#1789, read clean.** A cape taken off rides its own record
  (`capegrant:<capeId>` gains `off`), written at the player's pace (30
  at once, then one each 10 s, `flood.js _paced`) before the state goes
  out; a leave flushes it. A player who never won is refused with
  nothing written; an admin reset clears `off` with `redeemed`. No cap
  (nothing new on the wire). Break proofs: 3 checks fail without the
  ledger's `off`, 4 without the paced write. It DEPLOYS.
  - VERIFIED (probe), low: the switch thrown and back leaves a stale
    `off` (a cape put on while `capeoffkept: false` comes off again when
    it is cleared; one click puts it back).
  - VERIFIED (probe), low: a rolled-back worker reads the record safely
    and drops `off` at its next write of it (a ticket's redeem or drop):
    every cape taken off is worn again, which is today's way. No shape
    number is needed (`off` absent reads worn); the spec does not say it.
- **#1788, MEDIUM-LOW, VERIFIED by reading: check 2 lost its absolute
  size.** Each townsperson is held to `mid`, the median of the cast's own
  heights over their sizes; nothing ties `mid` to a number (the PR's
  "the same bro's height (143.2 px here)" is printed, not checked). A
  change that drops or doubles `NPC_BRO_MULT` (entityRenderer ~464, 726)
  shrinks or grows every townsperson together and 2 and 2b stay green
  (mp-wheelfolk's `60 < h < 240` catches a doubling, not 20%). For card
  J2's next PR: hold `mid` to the player's own drawn height (the same
  multiplier). Check 3 keeps its 25 px bar on every try.
- **#1790, read clean.** `_handleMove` reads `Date.now()`, so the pinned
  clock reaches the budget; three breaks each caught (the clamp gone:
  x3000; the budget x3: five fail; the clock unpinned: 1510.5).
- **#1795, read clean.** The pace ratio still 0.45 to 0.65, now only
  while the chill runs; the Frozen chip while the freeze lasts; all six
  chips in one read. A broken slow or chip still fails; a slow page can
  only make it red.
- Suites at 7595194: eventcapes 20, potions, liveops, cost-guard,
  switches (252 rows); again green on a trial merge with `main`.

## Card E: #1785 (PR 12, tag 5093) and #1786 (PR 9, tag 5090)

**#1785, sitting 10's hold mended (fed858f).** Probes: A mints 1000 and
trades 100 to B; B restarted, then A the next day: unexplained 0 both
times, online and through the picker (offline, as `account.js` does).
M3: the route counts today's seconds of each joined socket once a player,
added to today's hours. The restart's road: the new await (a read of
`rpg:` or `bank:`) sits before the first delete, never between two (they
were each awaited before); no new key, row or write; `econ: false` books
nothing. `worldsum.js` and `liveops.js` import each other at the top but
use each other only inside functions (each loads alone in node; esbuild
bundles `index.js`).

**Mail and listings (sitting 10's question):** a restart deletes none of
`inbox:`, `mkt_order:`, `store_listing:`, `duelEscrow:`; all are counted
in both daily counts, so the booking must not count them (twice). Probe:
B mints 1000, 400 in a buy order, 250 minted mail and 120 of sale mail,
restarted offline: the booking -400, the card 0; next day the new B
takes the 370 and cancels the order (820 coins): 0. (For the owner,
today's way: a restarted character inherits the old life's mail, a buy
order's refund and a listing's proceeds.)

- **VERIFIED (probe), medium-low, for E's follow-up (5094): a picker
  restart in an EMPTY room books in memory only.** The `econ` part
  rides other parts' writes (`DAYBOOK.RIDES`); the last one out writes
  only after a join since the last write (`_roomRowLastOut`, `owed`);
  the picker's HTTP road makes no join. A room put away (idle, a deploy)
  before the next join loses the booking while the delete is durable:
  -100 with 0 restarts, M1's symptom on the owner's road. Mend: write
  the book at once when no one is in the room (one read and one write a
  restart).
- VERIFIED (probe), low: "new gold to the richest" drops a restarted
  character's minted-to-date (book `m` in `r` too).
- Low: a restart landing after a multi-slot walk read `rpg:<pid>` is
  added back twice (a walk of 200 records or more: M2's kind). Docs: the
  `metrics:` row does not name `world.gone`, nor `daybook:` and SHAPES
  `econ.r`.
- Suites at fed858f: econ-card 36, world-sum 34, storm 53, liveops 110,
  cost-guard 43, session-door 46, devtools 46, daybook 97, gold-door 201,
  mirror-audit 396; account, chaos-restart, persistence, roomrow green.

**#1786, the 13 refusals sound.** Each comes before any take (the
router's line before its switch; each HTTP line after the sign-in and
before the action); no payout, refund, cancel, unstage, mail or loot is
gated; the phone's guesses undo (a listing card unlocks, a refused bet
leaves, a duel waiting on Accept drops, the trade window is the
server's). No new message (`wire-audit`), no cap (the fight lock's way,
4510), no write; the clock in memory (a deploy loses nothing).

- **VERIFIED (probe), low-medium, MENDED (see the list): an Auction
  House listing refused in the pause read "That piece cannot be sold"**
  (`pauseHttpBody`'s `reason: 'paused'` read by `gearSellReasonText`,
  whose fallback is that sentence; ItemDetailPopup ~1616).
- PLAUSIBLE, low: `trade2_stage_weapon` is not paused (the completeness
  check covers gold and bag roads only); the header promises "into a
  held place".
- PLAUSIBLE (design), low: a refused save of ANY record (`botstat:`,
  `acc:`, a board, the book) pauses every player's 13 actions, and each
  refusal restarts the minute: a record that keeps failing pauses trading
  while it fails. No way found for a player to cause one; the switch is
  the way out.
- VERIFIED by reading, low: the duel and gift cards close on Accept, so
  "the same press works after the minute" holds for the trade window
  only.
- Suites: valuepause 26, trade, trade2, trade-onewrite, market,
  market-settle, store-* (7), storeoffer, arena, arena-settle, liveops,
  cost-guard, opid-audit; wire-audit, fight-lock; switches 338 rows.

## Card O: #1787, #1792 (tags 5221, 5222) listed; #1794 (tag 5224) HELD

Read at the -4- head ee7453d. Probe: the suite's own `model()`
(frame-pacer §13) with the rate knob live, as on merge.

- **#1787, read clean.** `caps.report` 3 gated by its count
  (`takesLanes >= 3`, TRAPS §9), `report:` on its own line in `join.js`
  (§316), `reportlanes` lower case, rowed, its own line in `liveops.js`'s
  header (thrown: back to 2). `rung` clamped, `self` a closed list of at
  most 10 in `Object.create(null)`; no key, no pace; mirror rows. It
  DEPLOYS.
- **#1792, nothing a player sees.** The governor walks the ladder, but
  no knob is read (PR 4 moves the first). Nothing measures the page; a
  verdict once in 80 frames, no allocation a frame. It DEPLOYS (its
  tests). Note for O: it saves its rung (`bt_rung`) already, so a phone
  may carry a deep rung into #1794's first sitting.
- **#1794 HELD. VERIFIED (probe), medium: a cool phone can sit at 30 for
  a whole sitting.** `next`/`vec` (framePacer.js ~409-420) count every
  knob in `KNOB_NAMES`, read or not, so the ladder steps through rungs
  nothing reads (crowd, shine, shadows, water, pixels), keeps them in
  `localStorage` (`bt_rung`), and climbs back one 20 s try a rung, the
  rate (chip rung 1) LAST; a pixel rung's try up waits for a veil and,
  while it waits, `pending` stops every other (~531). After a hot
  sitting the owner's cool 60 phone starts at 30: `[0,2]` 42 s, `[0,4]`
  85 s, `[0,6]` 7.4 minutes with a veil every 3 minutes, the whole
  sitting with none. Mend: count only knobs marked moved.
  - **The owner's call 3 ("never combat"):** nothing in the governor
    asks about a fight (it is held as "no knob is read in combat's
    files"); fights are the heaviest frames, so the step to 30 lands
    mid-fight in practice. The signals exist (`wheelBus.state.inCombat`,
    `_pvpInFight`) to put a step off as the pixels are. The mark on the
    strip exists only with `?perf=1` (perfHud's ladder lines).
  - **Who it reaches:** a 60 screen with over 25% of frames past 25 ms
    for two verdicts (about 48 a second, uneven) steps in 6 to 9 s: a
    cool but slow computer too, which calls 3 and 16 ("a hot or full
    phone") did not name; with no live flag the owner cannot turn it off
    for the judges without a deploy. Under "Decided for the owner while
    away", with `?govern=0` and `?ladderrate=0`, or the owner's yes.
- Low: until O's PR 3 (`?lane=` on test pages) merges, every phone test
  runs governed; `mp-governor` sets `BT_QA_CPU_THROTTLE` in the run's
  own process (it leaks to the scenarios after it, as `mp-loadinggate`
  does). PLAUSIBLE, low: a 60 screen whose frames all land at 33 ms reads
  as a 30 screen (`refreshOf`) and is named `thirty`.
- Suites at ee7453d: report 115, frame-pacer 102, mirror-audit 399,
  caps-audit 6, liveops 110, cost-guard 40; draw-lanes, switches green.

## Card L: #1767, #1775, #1779, #1791, #1796 (tags 5203 to 5207)

#1767 read clean at sitting 9 (skimmed again). #1775, #1779, #1791,
#1796 read in full. Every reset runs twice harmlessly; each system with a
reset has its `?<system>reset=0` row; `clearElemStatuses` was dead
(main's src, tests, tools, public, strings included); the owner's two
questions (`wheelMusic` `_m`, `deskTeach` `_armed`) untouched.

- VERIFIED by reading, low: `forgetRace` (#1775, race.js ~170) clears
  the race at every `state_sync` with no `REJOIN_SLOTS` row, and the
  phase table's page `race` row still says "not cleared at state_sync"
  (phases.js ~417-424); no guard sees it (`rejoin-resend` reads only
  wsClient's case; phase-table §6 checks a listed clear exists, not a
  missing one). Mend: the row (`resend: null`, race.js "memory only")
  and the phase row's rejoin edge. On the body-take path the worker
  keeps `ps._race` (a PvP hit within 10 s at Lil Bro): not reachable in
  play.
- VERIFIED by reading, low: `forgetRace` also closes a finished race's
  result card (`phase: 'done'`, the worker's real "Whoa, you won!", 6 s)
  on a reconnect inside its 6 s.
- PLAUSIBLE, low: `endRollAtDoor` (#1791) ends a roll's i-frames at a
  door (the worker's `_rollOn` stops up to ~700 ms early); no monster
  known hits in the first 0.7 s at an arrival.
- Suites at cf72255: state-resets 77, zone-leftovers 36; state-ledger
  (303 rows sitting, at its line), phase-table, switches 257 rows.

## Card LB: #1783 (PR 2, tag 5501)

Sitting 10's three holds, mended at db48e83: whole names in the table
(two lines, cut past the second); the podium's ribbon shows the board's
own value; a row shows one "Lv". The lows mended: `ui-leaderboard` is
`draw: 'dom'` (the old trophies their own family), the pieces' warm-up
moved to the lazy panel (the Test panel no longer fetches them), your
own row in 1-3 ringed, mp-boards 4g needs Ghost's row, `power` left to
PR 3's `CAP_GATES`. Fewer than 3 rows, an old worker's rows, the art
freed on close, `touch-action`: clean. `picture-door.test` ~386: the one
top-level `new Image()` loop moved file; it DEPLOYS.

- **VERIFIED by reading, low-medium: on a weapon or skill board the
  ribbon prints the board's value AS "Lv N"** (`podiumValue` returns
  `{ lv: v }`, LeaderboardPanel.jsx ~325-328, drawn by `LvPill`), while
  the same player's row prints the name plate's "Lv": on Woodcutting the
  #1 shield "Lv 3", his row "Lv 40 ... 3"; against the rule the PR's
  own notes restore ("never two numbers that both read Lv"). mp-boardslook
  2b cannot tell: every test player is level 1 with melee 1.
- Measured, low: podium names fall to 7 px on a 375 px phone (`fitName`'s
  floor), under the notes' 11 px text floor; a name of 14 letters or
  more on a side shield is cut even there (names go to 20).
- Low: the "about 105 px" for a name holds on the Total view only (the
  weapon boards' three columns leave ~71, ~52 on row 1 by the crown).
- Not new, medium: the records boards (Daily spin, Coin flip, Biggest
  fish) still draw today's `BoardRow`: ~25-30 px of name at 375.
- Low: sideways shows no row until a scroll (the chips and the sticky
  head fill the band); `states.mjs`' text still promises the stat boards.

## Card SK: #1782 (PR 1, tag 5440): NOT LISTED (the owner's yes to its cost)

Reviewed at 505ee79 so it is ready. Sitting 10's three holds mended: a
harvest mid-roll holds the board (`ride.js` ~370 `held || S._extraction`)
and reads "Off the board to chop/fish/mine/cook"; a slant into a wall
slides as the instant board does (stick 0 to 87 degrees: 300 to 16 px/s,
the same as `?ridecoast=0`; 88: 1 against 10); a rolling board's speed
rides the path.

- **The cost, VERIFIED (probe: the real `rideFeel` and move diet,
  BroTown's 22 ms cadence, wsClient's 33 ms batch, 11 timer phases):** a
  ride of a start, 4 s held and a stop sends 19 moves on `main` (=
  `?ridecoast=0`), 27-28 with the roll-off on keys, 28-30 on a phone
  stick: **+8 to +10 move messages a ride**, all in the ~1.9 s roll-off.
  A short ride costs relatively more (1 s held: 6 -> 14; one push 3 ->
  9). The PR's "about 10 more" is right.
- **VERIFIED (probe), low-medium, new: a held pose struck while the board
  rolls is ended by the roll** (interactions.js ~64/122 end it past
  `POSE_SHIFT_PX`, 4 px, each frame at BroTown ~5507; `rideFeel` holds
  for `_extraction`, not a pose): with a 120 ms round trip a pose 0.1 to
  1.2 s into the roll reads "Off the board to fight." (3875's line);
  `?ridecoast=0` reads "to strike a pose.". Mend: hold the board on
  whatever `rideActVerb` names.
- Lows: `tapOn`'s tries hide the button's dropped quick tap (main's
  way); check 12 sets `S.stickX` by hand. BroTown.jsx 8370 against 8371.
- Suites: ride 94, ridersort, move-diet, move-path, mirror-audit;
  switches 336, four-lines, state-ledger, tests-by-system.

## Card T: #1797 (PR 3, tag 5303): step 3

Its files are the card's (the drawing side's rows, the table and page,
card B's map reading a system's switches from the table, SHAPES' two
lines, the spec, T's status); `main` merged in; no `server/` file.
Unlisted 0: from its merge every new `?name=` needs its row, so it goes
after every other row-adding PR on the list (a guard that closes a list
last).

## The lines

`tools/guards/lib/fourLines.mjs`: every file at its line on `main`
(effectsRenderer 9870, entityRenderer 8961, BroTown 8371): nothing to
lower (no PR on the list moves them down).

## The whole

REHEARSALS (filled in at the list's writing).
