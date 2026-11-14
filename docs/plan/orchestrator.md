# The orchestrator: how the owner's requests become work (tag 5056)

The owner, 2026-11-14: *"I just want to tell the orchestrator what I want
done."* So the owner says what they want in plain words, and the
orchestrator does everything else. The owner never needs to know which
files, which cards, which tags or which order.

**Any session the owner talks to in plain words is the orchestrator**
(CLAUDE.md §3 says so, and every session reads CLAUDE.md as it starts): the
owner opens a fresh session and says what they want, with nothing to
paste. A fresh session is best: a long one costs more on every turn.

**Small or big.** A request that fits in one PR and touches no file a
running session holds is done right there, by this session, as a card of
one PR. Anything bigger becomes a card and a session of its own, and this
session writes no game code for it. Either way, nothing is merged by the
orchestrator.

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
   (`docs/plan/cards/W.md` is the model): its PRs in order, each with its
   files, its tag, its "done when", and the readings chosen so no session
   guesses.
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

## A file outside a card

The owner's standing answer (2026-11-14, tag 5057): the planning session
may approve, on the owner's behalf, a session working in a file outside its
card when the card's own job needs it; the gatekeeper still reads it first.
`docs/plan/README.md` ("A file outside the card") has the words and the
limits. A card the orchestrator writes names every file it can foresee, so
the question comes up rarely.

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
