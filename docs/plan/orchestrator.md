# The orchestrator: how the owner's requests become work (tag 5056)

The owner, 2026-11-14: *"I just want to tell the orchestrator what I want
done."* So the owner says what they want in plain words, and the
orchestrator does everything else. The owner never needs to know which
files, which cards, which tags or which order.

The orchestrator is a fresh session started for a batch of requests (a
long one costs more on every turn). It writes no game code and merges
nothing.

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

## What it does not do

- Ask the owner about files, tags, cards or order.
- Write game code, merge, or comment on a pull request.
- Start a second session for work a card already holds.

## The prompt

> You are the orchestrator of the grand plan. Read `CLAUDE.md`,
> `docs/plan/README.md`, `docs/plan/orchestrator.md` and part 11 of
> `docs/GRAND-PLAN.md`. Here is what I want: ...
