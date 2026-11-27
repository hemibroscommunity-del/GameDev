# Finishing the grand plan: the direction of 2026-11-23 (v2.3.6400)

The owner, 2026-11-23: *"I'm in middle of implementing the 'grand plan' ...
using [the top model] to ensure work is directed appropriately and
efficiently to finish up"*; *"review the work in accordance with the plan to
make sure it's the correct shape because I've been using less intelligent
models to do the work"*; *"I want an orchestrator session ... and have it
manage different sessions to complete as much parallel work as possible but
efficiently."*

This file is that direction. One session on the top model read the plan, had
six reviewers try to break the finished work, measured what the work cost,
and wrote the cards below. **The orchestrator reads this file first and
works from it until part 2's line is reached.** The findings are in
`docs/plan/census/shape-review.md`; each card's detail is in its card.

## 1. The short of it

- The plan's boxes: 41 of 57 before-players steps are ticked on `main` (42
  with 3.1, whose tick waits in sitting 54's notes), 43 of 76 in all. Seven
  of the open ones cannot finish without players or the owner's own words;
  nineteen are LATER by design (part 7 of the plan).
- **The server is in the state the plan wanted, and its guards are not.**
  No way to cheat was found. But 44 of 47 realistic faults planted on the
  doors passed the door's own test, and six ticks say more than the code
  does (`shape-review.md` part 3).
- **The page got instruments and fences, not walls.** `BroTown.jsx` is the
  size it was; the frame's "steps" are timing marks.
- **No smoothness claim was checked on a real phone.**
- **The work cost more than it had to.** Every session ran on one model at
  one effort, the test runners too; three long sessions alone cost $174
  because a session's whole memory is read again at every step (one reached
  650,000 tokens); every push paid about 22 minutes of GitHub's time, 91%
  of it one guard.
- **The gate checked the letter.** So this phase's cards each say their
  PURPOSE and the faults their guard must catch, and the gate plants them.

## 2. What "finished" means for this phase

The plan is finished for now when all of these are true on `main`:

1. The paused work has landed (card LF).
2. The review's mends have landed (cards CK, DG, BK, WHO, PH, WL), and the
   plan's boxes say what the code does (`shape-review.md` part 4, Z's).
3. The scoreboard measures every row a ledger already holds a number for
   (card WL).
4. The owner's phone has said how the game runs on it (card PH), and the
   two-button controls are on that phone to try (card CT).

**The owner's line of 2026-11-24** (v2.3.6272; asked "May I draw the line
there?", the owner: *"Yes."*, for the week's usage and because *"It's hard
for me to understand a sense of progression because new elements get
added"*): the finish is a FIXED list, what was written by sitting 60, #2326,
#2325, card CT's PR 4, PR 5 and item 6, and the grit diagnosis; later
reviewer findings go to `docs/plan/debts.md`, not to new cards or
sessions, except a bug in how the game behaves, which is still fixed.

After that the plan rests. What is left waits by design: for players or
data (1.3's table, 2.5, 10.7's last rung, 10.9, 10.10), for the owner's own
words (`.github/`, Cloudflare: 1.3's road, 4.7's lab try, 8.8's practice
copy), or for a number (every LATER step). New features then go through the
orchestrator as cards, each under part 5's rule 5.

## 3. The cards, and who runs beside whom

All eight start on day one. Their files do not meet, except where the last
column says.

| Card | What | Tags | Model, effort | Beside the others |
|---|---|---|---|---|
| LF | The leftovers: RR's rejoin fix and quiet-phone test, HB2's two branches, three status files | RR's and HB2's own | the middle model, high | free |
| CK | The checks' cost: a push costs minutes, no check dropped | 6420 on | the strong model, high | holds `gatekeeper.mjs`, `precheck.mjs`, `run.mjs` |
| DG | The doors' guards hold against any spelling; the wire door holds a form | 6440 on | the strong model, high | its own line in `join.js`'s caps |
| BK | The books reach every road: the sum, the restart, the 1.5 bar | 6460 on | the strong model, high | never in `gold-door.test`, `bag-door.test` (DG's) |
| WHO | Who acted, and the sitting's card (10.1 and 11.2 as code, 10.2, 10.8) | 6480 on | the strong model, high | its own line in `join.js`'s caps |
| PH | The phone's truth: the report, the memory lines, the governor | 6500 on | the strong model, high | its last PR after CK's first (`gatekeeper.mjs`) |
| WL | Walls that hold: the page's fences, the scoreboard's counters | 6520 on | the strong model, high | the scoreboard is WL's alone |
| CT | The two-button controls, a trial scheme (the owner's request) | 6540 on | the strong model, high | ALONE in `BroTown.jsx` and the two renderers |
| Z | The gatekeeper, as part 8 changes it | its block | the strong model, high | at most two sittings a day |

Helpers (a session that only runs phone tests and reports): the cheapest
model, low effort.

The four tiers are the models the app offers, from the most able down:
**the top model, the strong model, the middle model, the cheapest.** Last
week every session ran on the strong model at high effort, the helpers
too. The orchestrator's first message names each tier's model as it is
today; a tier's name outlives a model's.

**Never side by side** (part 11 of the plan still holds): anything else in
`BroTown.jsx` or the two renderers while CT is open; two sessions in
`GOLD_ROADS`; two new caps or live flags on one line.

**Every merge touching `server/**` deploys**, a test file too: DG, BK, WHO
and PH's first PR all do. The gatekeeper lists them together, once a
sitting; a PR that changes behaviour (DG's wire forms, WHO, PH's report)
each on a line of its own.

## 4. Not now, and why

- **More tables of what exists**: the words' next wave (2,710 lines in
  place), the 206 state rows decided by hand, the last 17 address reads,
  the 63 traps left as prose, the 222 suite pairs converted wholesale. Each
  is a fence around code that has not moved. A feature converts its own
  slice (part 5, rule 5).
- **`deskkeys` 8f and `desklunge`** (a computer's lock and lunge): they wait
  for the owner's verdict on the controls trial.
- **Closing `window._gameState` (5.7)**: 53 files read it; card WL counts
  them so the number only falls; the move comes with the slices.
- **Reaping old switches (7.3)**: 152 logic switches are past their four
  weeks. It is the step where code really leaves, and the first card after
  this phase, a system a PR, starting where the controls trial does not
  touch.
- **4.7's restore from the registry, 10.9's cases, a support screen**:
  before real players; there is one player.

## 5. The five rules of this phase

1. **A card says its purpose and its dodges.** For a guard: the faults it
   must catch, written the ways a tired programmer would write them. "Done
   when" is those plants going red, run again by the gatekeeper's lane.
2. **A guard reads the syntax tree or the running room**, never a pattern of
   text, when it guards value, a phase or the wire.
3. **A tick means the purpose is met.** A table that only describes is
   ticked as a table.
4. **A claim about a device says where it was measured.** "On the test box"
   until the owner's phone has said.
5. **A feature takes its slice out of the big files.** New rules land as
   modules under `src/game/` with suites that test what they do, not what
   they are spelled like; the big file gains calls, not logic; its lines
   fall.

## 6. Spending

Measured on last week's sessions (`get_session`'s `usage`): card RR $70.95
(287 million tokens of memory read again), the planning session $56.35 (its
memory at 652,000), card HB2 $46.46 (at 565,000), a gatekeeper's sitting
about $4, a test helper $1.32. A session's cost is its memory times its
steps. So:

1. **A session hands over at 250,000 tokens of memory** (its own
   `get_session`, `context_usage.used_tokens`): it finishes the PR in hand,
   makes its status file true, and tells the orchestrator, which starts a
   fresh session for the card's next line. The orchestrator too.
2. **One wait, never a poll.** A long command runs in the background, or
   with a long timeout, and its end wakes the session. No `sleep` loop, no
   reading a log again and again: each look reads the whole memory.
3. **Phone-test runs go to helpers** on the cheapest model: more than three
   scenario runs, or any repeat run, is a helper's. A helper changes no
   file and sends back the PASS and FAIL lines.
4. **A push is about 10 paid minutes** from the push to all checks done
   (10.2 at the median, 30.2 at worst: a lane over about 200 PR runs a
   check, 11-24 03:10 to 11-27 16:30; the old "22 to 43" was from before
   card CK; v2.3.5667). Push when a PR's line is done. The
   status file rides the work's commit: never a status-only push to an open
   PR. Merge `main` once, before the last push.
5. **Output to a file**; print its tail and its FAIL lines.
6. **Raw reading goes to a lane.** The orchestrator and the gatekeeper read
   statuses, diffs and logs through a lane on a cheap model that returns
   the few lines that matter.
7. **The tree is eight sessions deep.** The orchestrator sits at 1, a card
   at 2, a helper at 3. A new part of the orchestrator is best started by
   the owner (a fresh session on the top model at high effort, saying "Continue
   as the orchestrator"), which starts again at 0; if the owner is away the
   orchestrator starts its own successor, and says so.
   **The owner's standing leave** (19:54 UTC 2026-11-26, v2.3.5664): *"Next
   time it fills up you can just create new sessions as orchestrator
   yourself"*: a part that fills up starts its successor without asking and
   tells the owner the new session's title.
8. **Watch the week.** The owner's allowance is a week's, from Monday
   21:00 UTC; the last one was used to 99% between 2026-11-16 21:00 and
   11-19 17:00. The orchestrator's first lane sums `usage.cost_usd` over
   the sessions of those hours: that sum is about one week. At each sweep
   it sums this week's sessions and reads its own `rate_limit_info`. Past
   80% of a week, no new card starts and the owner is told.

9. **The lean order for small requests** (the owner, about 17:00 UTC
   2026-11-27, *"Yes make that the rule from now on"*; v2.3.5667): ONE PR
   with no server, money, logins or wire is built least-first (precheck
   green, one build, one run of its phone test, push and the draft PR
   inside about 40 minutes), its Pages preview address to the orchestrator
   at once for the owner, its dodges and neighbouring scenarios by helpers
   while the checks run (a second push only for a plant left green or a red
   of its own), one picture, no mutation run, then the fast lane (part 8).
   The question, the measurement and the steps:
   `docs/plan/orchestrator.md`, "The lean order for small requests".

The orchestrator itself: **the top model, high effort.** Its judgement (a
card's purpose, an answer to a session, the order) is what the review found
missing, and rules 1, 5 and 6 keep it cheap.

## 7. The orchestrator's loop

1. **Start.** Read this file, `shape-review.md` parts 1 and 4,
   `docs/plan/README.md`, `orchestrator.md`, part 11 of the plan. List the
   sessions by title. Last week's finished sessions stay as they are.
2. **Day one.** Start the eight cards (the card in the session's first
   message, part 11's prompt, the model and effort of part 3, the title
   "Grand plan · card <letter> · <what>"), and add: "Read
   `docs/plan/finish.md` parts 5 and 6: they bind you." The cards are on
   `main` once this direction's PR has merged; until then they are on its
   branch, and a session does not commit its card again.
3. **Ask the owner once, in plain words** (part 9), and go on without
   waiting where a card does not need the answer.
4. **Sweep** when a session says done, stalled or asks, and otherwise about
   every 90 minutes (`send_later`): a lane reads the status files and the
   PRs; answer questions (README, "Who answers"); start a helper or a fresh
   session where one handed over.
5. **Sittings.** Start Z when four PRs are ready or one is urgent, at most
   twice a day. Merge its list, in its order, as the planning session does
   (README), checking each tree against the rehearsal's; never a PR that is
   not on a list. Tell the sessions to merge `main`.
6. **Tell the owner** after each sitting, in plain words: what landed, what
   they will see on their phone, what waits for them.
7. **Hand over** (part 6, rules 1 and 7): keep `docs/plan/status/ORC.md` on
   the branch `claude/plan-orc` (at most 40 lines: each card's session and
   state, what waits for the owner, what was decided), pushed at each
   hand-over. A new part reads it there (`git show
   origin/claude/plan-orc:docs/plan/status/ORC.md`) and this file.

## 8. The gatekeeper, changed (card Z has the words)

- **The purpose review.** A PR that adds or changes a guard, or changes
  `server/src`, the wire, money, logins or combat, is read by a lane on the
  top model, which plants the card's dodges and two of its own in a scratch
  copy. A plant that stays green is a hold, of these kinds only
  (v2.3.6272, sitting 60).
- **What holds, and what is a card's next job** (the owner, 2026-11-24,
  asked by the orchestrator after sittings 57 to 59 landed 7, 5 and 2 PRs
  because each review found new holes of the same kind: "(1) May a change
  land once its check catches everything its card asked for and everything
  earlier reviews found? The reviewers' newest findings would become that
  card's next job instead of holding it back. A real bug in how the game
  behaves would still hold a change back. (2) May a third merge round run
  today?"; the owner: *"Yes to both. I want as much work done as you can
  so this plan can get done. I have other things I want to add to the
  game but am waiting for this to be finished"*):
  - STILL A HOLD: a red rehearsal or a red `test`; a bug in behaviour (the
    game, the worker, the wire, money, a login, a save doing the wrong
    thing); one of the card's own dodges still green; a plant an earlier
    sitting's review named, still green on the head listed as its mend.
  - NOT A HOLD: a reviewer's NEW hole in a guard (a plant neither the card
    nor an earlier review named). The gatekeeper writes it in its notes as
    that card's NEXT JOB, one line with the file and the plant, and the PR
    lands. The next review holds that card to it.
  - A third sitting ran on 2026-11-24 by the owner's leave for that day;
    the rule of two a day stands for other days. Another, 2026-11-27 (the
    orchestrator, "may a third merge round run today?"; the owner, about
    16:10 UTC: *"Yes it can"*): sitting 73.
- **The fast lane** (v2.3.5667; in use since 2026-11-27 04:49 UTC, written
  here at sitting 73). The orchestrator (part 34) asked: "may a small change
  that only touches what's on screen (no game server, no money, no logins)
  land as soon as its own tests pass, with the checker reading it
  afterwards? Server and money changes would keep the full check first."
  The owner, 04:49 UTC 2026-11-27: *"Yes they should"*. A PR lands without
  a list when ALL of these hold:
  1. its diff against `main` has no file under `server/`, `.github/` or
     `src/networking/`, and no gold, bag, login or wire code. The one file
     under `server/` it may carry is a suite under `server/test/` that
     imports nothing from `server/src/` (it tests the page's own rules, as
     `stick-zones.test.mjs` does, #2424): it is no game server and does not
     deploy (`deploy-worker.yml` skips `server/test/`, #2380). A suite that
     imports worker code, or holds a door (gold, bag, stash, hp, quest, xp,
     points, the wire), keeps the full check;
  2. `test`, `playable`, `memory-budget` and `lint-build` are green on its
     exact head;
  3. its base is `main` and it merges clean, alone, with the expected head;
  4. the next sitting READS it afterwards (its purpose and its card's
     dodges, as a ready PR's): a bug in behaviour found there is a mend owed
     on `main`, told to the owner at the top of the list; anything else is
     its card's next job in `docs/plan/debts.md`.
  Everything else keeps the full check first.
- **Notes go to `docs/plan/log.md`**, one line a step a sitting. The plan
  keeps its boxes.
- **At most two sittings a day**; the rehearsal throws every switch once
  (after card CK) and runs the held-page sample (after card PH).
- **First sitting**: land sitting 54's notes (3.1's tick), this direction's
  PR, and `shape-review.md` part 4.

## 9. The owner's calls, in plain words

The orchestrator asks these; each is short to answer.

1. **Five minutes on your phone** (card PH needs it). In the Test panel:
   run the Speed test and tap "Copy table", then paste it in the chat. Then,
   when the phone is warm, play five minutes at brotown.net and five at
   brotown.net/?govern=0 (the speed ladder off): which felt smoother? Then
   one lap on the skateboard at brotown.net and one at
   brotown.net/?groundsend=0: any difference?
2. **GitHub's checks.** May the check settings change so a newer push
   cancels the older run, and a change to documents only skips the long
   test? It saves most of the paid minutes. It is a change under
   `.github/`, so it needs your own words.
3. **The game's memory alarm.** It is set so high it can never go off. May
   it be set just above what the game really uses?
4. **Every phone test once** (388 of them, about an hour on thirty cheap
   helpers) to learn what is really red, or keep sampling?
5. **The sword's reach.** A cheating phone gains about 1.55 times an honest
   player's kills by lying about reach; the plan's line is 1.5. Tighten it
   (the sword would feel a little shorter), or keep it and say so?
6. **Cloudflare's spending cap**, carried from last week.
7. **After you have played the two-button controls**: keep, tune, or drop.
8. **Later**: a read-only key so sessions can read your phone's reports
   themselves (this environment already reaches the game's addresses);
   until then, "Copy table".
