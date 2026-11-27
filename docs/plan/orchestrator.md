# The orchestrator: how the owner's requests become work (tag 5056)

The owner, 2026-11-14: *"I just want to tell the orchestrator what I want
done."* So the owner says what they want in plain words, and the
orchestrator does everything else. The owner never needs to know which
files, which cards, which tags or which order.

**Any session the owner talks to in plain words is the orchestrator**
(CLAUDE.md §3 says so, and every session reads CLAUDE.md as it starts): the
owner opens a fresh session and says what they want, with nothing to
paste. A fresh session is best: a long one costs more on every turn.

**Read `docs/plan/finish.md` first** (v2.3.6400, the direction of
2026-11-23): what is being finished, which cards run, which model each
kind of session runs on, the five rules a card keeps, the spending rules,
and the orchestrator's loop. An orchestrator that is not the first reads
where the last one stopped: `git show
origin/claude/plan-orc:docs/plan/status/ORC.md`.

**Small or big.** A request that fits in one PR and touches no file a
running session holds is done right there, by this session, as a card of
one PR. Anything bigger becomes a card and a session of its own, and this
session writes no game code for it. It merges only the gatekeeper's list,
in its order, as the planning session (`docs/plan/README.md`): never a PR
that is not on a list, its own included.

**The lean order for small requests** (v2.3.5667; the owner, about 17:00
UTC 2026-11-27, *"Yes make that the rule from now on"*). Asked after the
owner's *"Can you also just get all these changes done in like 20 minutes
or less instead of 3 hours that's excessive"* and *"Maybe the automatic
tests aren't a good way to keep going then. Have they turned up enough
errors that it's worth keeping them?"* A lane measured the checks (about
200 PR runs a check, 11-24 03:10 to 11-27 16:30): 10.2 minutes from a push
to all checks done at the median, 30.2 at worst; failed runs: `test` 4,
`memory-budget` 2, `playable` 0, `lint-build` 0, five of them real (the
guards hud-corner #2419, gear-showcase #2408 and #2391; memory over by 0.1
and 0.2 MB), one housekeeping, no flake. The tests stay; the time is the
work around a change. So a small request (ONE PR, no server, money, logins
or wire: the fast lane's kind, `finish.md` part 8) is built in this order:
1. the least that makes precheck green (the rule module, its wiring, its
   suite's plain cases, its phone test, the card and notes), ONE build, ONE
   run of its phone test, push, the draft PR: inside about 40 minutes;
2. at once ONE line to the orchestrator with the PR's Cloudflare Pages
   PREVIEW address, which goes to the owner to try;
3. while the checks run: the card's dodges planted, the neighbouring
   scenarios by helpers on the cheapest model; a second push only for a
   plant left green or a red of its own;
4. ONE picture; no mutation run; then the ready message and the fast lane.
A change with the server, money, logins or the wire keeps the full order
and the gatekeeper.

## A request, in order

1. **Understand it.** Ask the owner at most one question, in plain words,
   and only when the answer changes what gets built. Otherwise choose, and
   say what was chosen.
2. **Check what is already running.** The start-up brief lists the
   `claude/*` branches; read `docs/plan/status/*.md` on each, and part 11's
   "never side by side". If the request needs a file a running session is
   changing (the big ones: `src/ui/BroTown.jsx` and the two renderers in
   `src/rendering/systems/`), it waits for that session or follows it.
   Tell the owner in one line, with roughly how long.
3. **Is it already planned?** If a card or a step of `docs/GRAND-PLAN.md`
   covers it, say so and start that card instead of a new one.
4. **Write its card**, in the day-one cards' form
   (`docs/plan/cards/W.md` is the model; `CT.md` for a feature, `DG.md`
   for a guard): its PRs in order, each with its files, its tag, its "done
   when", and the readings chosen so no session guesses.
   - The card says its PURPOSE, and for a guard the faults it must catch
     (`finish.md` part 5); its model and effort (`finish.md` part 3 and 6).
   - A feature takes its slice out of the big files: its rules are modules
     under `src/game/` with suites that test what they do.
   - Tags come from `tools/dev/tag-blocks.json`, written bare (`tag 5060`).
   - The card names which of CLAUDE.md's laws apply (preloading, memory and
     256 colours for art, the doors for gold, bag and health, the phone
     tests on the world) and which rows of its same-change checklist.
   - New art goes through the asset door (pillar 9) once it exists.
   - A new state machine gets a row in the phase table (step 5.3b).
5. **Start the session** with part 11's prompt. The card goes in the
   session's first message, and the session commits it as
   `docs/plan/cards/<letter>.md` in its first PR, so nothing waits for a
   merge. A letter not yet used in part 11.
   - Effort: extra for money, logins, combat feel, or the big files;
     standard otherwise.
   - The model by the kind of work (`finish.md` part 3): a helper that
     only runs tests on the cheapest; tools, a test's own mend and
     documents on the middle one; the worker, the big files, combat and
     guards on the strong one; the top model for the orchestrator and the
     gatekeeper's purpose review.
6. **Tell the owner, in plain words**: what will be built, how many
   sessions, roughly when the pull requests will come, and what they will
   see on their phone when it lands.
7. Its pull requests go on the gatekeeper's list like any other.

## More hands at once

The owner, 2026-11-14: *"sometimes I want you to be able to have more
compute or another browser to test simultaneously."*

- **A lane shares; a session does not.** A lane (a helper inside a
  session) shares that session's four processors and one browser. A
  session is a machine of its own, with its own browser. So work that
  needs more speed or another browser at the same time goes to another
  SESSION, never to a lane. Lanes are for reading and node tests.
- **Helper sessions for tests.** A session with many phone tests to run
  may start helper sessions, each running its share on its own machine
  and sending its results back by message (the full run of card J, about
  six hours on one machine, is about one hour on six). A helper changes no
  file and opens no PR.
- **Files, not machines, are the limit.** Two sessions changing one file
  at once collide, so such work goes one after another (part 11's "never
  side by side").
- **More than one orchestrator** is fine (one for content, one for the
  plan). Every session an orchestrator starts is titled
  "Grand plan · card <letter> · <what>" or "Content · <what>"; before
  starting one, an orchestrator lists the running sessions by title and
  reads their status files, so two never take the same files or the same
  card letter.

## Questions the planning session answers

The owner's standing answers (2026-11-14, tag 5057): the planning session
may approve a session working in a file outside its card when the card's
own job needs it, and may answer the sessions' technical questions (how to
build what a card or the plan already holds). Never what a player sees,
money or costs, or the deploy settings: those stay the owner's, except
while the owner is away (tag 5058: decided by the planning session's
recommendation, behind a switch, listed for the owner; never a cost, the
deploy settings or anything that cannot be undone).
`docs/plan/README.md` ("Who answers a session's questions") has the words
and the limits. A card the orchestrator writes names every file it can
foresee and chooses its readings, so the questions come up rarely.

## When a part fills up

At 250,000 tokens (`finish.md` part 6 rule 1) a part starts its own
successor WITHOUT ASKING, and tells the owner the new session's title: the
owner's standing leave, 19:54 UTC 2026-11-26 (v2.3.5664): *"Next time it
fills up you can just create new sessions as orchestrator yourself"*.

## What it does not do

- Ask the owner about files, tags, cards or order.
- Write game code for a request bigger than one PR, merge, or comment on a
  pull request.
- Start a second session for work a card already holds.

## No prompt needed

The owner just says what they want. (Before CLAUDE.md carried the rule, the
prompt was: "You are the orchestrator of the grand plan. Read `CLAUDE.md`,
`docs/plan/README.md`, `docs/plan/orchestrator.md` and part 11 of
`docs/GRAND-PLAN.md`. Here is what I want: ...". It still works.)
