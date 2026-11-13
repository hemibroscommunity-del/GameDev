# The review of the grand plan (v2.3.5020)

The owner, 2026-11-13, on version 1 of `docs/GRAND-PLAN.md`: *"before you
execute the plan, I want an adversarial review of the plan you just wrote. I
want the plan to be carefully future proofed ... use a mixture of experts
approach where each system gets reviewed by an expert in that domain"*. And
then: *"use an 'inter-system' expert(s) to evaluate interactions between
systems that might arise although the systems themselves might perform
without issue when viewed standalone."*

This page records what the review found and what was done with each
finding. The plan itself carries no history.

## How it was run

- **Round 1, nine experts, each alone, read-only.** Each was told to prove
  the plan wrong in one field, to check claims against the code, and to mark
  every finding as read in the code, as judgement, or as a belief about the
  outside world.
  1. Field telemetry and privacy.
  2. Graphics per device and browser.
  3. Game servers on Cloudflare Durable Objects.
  4. Anti-cheat and bot detection.
  5. AI agents, identity and payments.
  6. Client architecture.
  7. The asset pipeline and delivery.
  8. Delivery with parallel AI sessions.
  9. The virtual economy and trust.
- **Round 2, three reviewers of the seams**, each given the plan and all
  nine reports: the running game (control loops, shared budgets); shared
  shapes and conflicts between experts; order and half-finished states.
- **Then the planning session checked the biggest claims in the code**
  before changing the plan (below).

## Checked in the code by the planning session

Each of these was a claim a finding rested on. All held.

- The crash road takes a POST from anyone; its limit keys on an id the
  sender invents (`server/src/feedback.js`).
- No workflow runs precheck; Server CI `test` is the one required check and
  runs on every PR; the worker deploys on `server/**` only.
- `server/test/chaos-restart.test.mjs` exists and lists
  `arena-stake-settle-loss` in `KNOWN`.
- `PVE_MELEE_RANGE` is 400; `MOVE_BUDGET.SPEED_PX` is 500.
- The gold log keeps 32 moves a purse, in memory, with no other party.
- The look palette's program asks `LINK_STATUS` at once
  (`src/rendering/lookPalette.js`).
- A look sheet is numbers in red and green (`src/rendering/lookUnpack.js`).
- About 100 suites under `server/test/` name the big client files;
  `frame-pacer.test.mjs` pins the game loop's first line.
- The page always joins with protocol version 2; the server defaults to 1.
- `docs/` is 217 MB with its pictures; its written documents are 3.4 MB.
- The daily spin averages 464 gold; a trade's limit is 999,999.
- `window._gameState` is set on every page.
- The server's "near" list is 2,400 px.
- The busy beat does not count a task under about 6 ms and runs only with
  `?perf=1`.
- `server/test/run.mjs` reads its own folder only; `tradeonewrite` is a live
  switch; a test-mode character is never judged (`botsig.js`).
- v2.3.5019 went to #1659 while version 1 was open, so the plan is
  v2.3.5020.

Not checked by the planning session, taken on the reviewer's own reading:
the honest sword swing (72 px) and walking speeds; the counts of state
fields and writers; the 132 send sites; the 98 server switches; the bake
worker never restarting; the C2PA records on the uploaded pictures.

## What changed in the plan, and who found it

| Change | Found by |
|---|---|
| The report rides the game's socket, not the crash road; numbers and closed lists only; two sinks | 1, 4, 5, the shapes reviewer |
| Sessions cannot read the report without a reader: call 6 is needed, not optional | 1, 8 |
| Hold names made one list before the report (1.0) | 1 |
| "Page busy under 4 ms" and "12 to 8" deleted: under the instrument's floor | 1, 2, the order reviewer |
| The device class is facts only; no timed bake or program build (the Windows freeze) | 2 |
| The governor and the pacer are one state machine; pixels move only behind a veil | 2, the running-game reviewer |
| A self-test of each drawing program at the door (1.7) | 2 |
| The debt list's rows marked ours, the box's, the browser's | 2, 8 |
| The whole world's sum replaces "a purse equals its roads" (4.4) | 3, 9 |
| The restart test exists already and lists a known loss: the finish line is `KNOWN` empty (4.5) | 3 |
| The way back: a restore made from the registry (4.7) | 3, 9 |
| The wire census takes the HTTP routes and the columns in SHAPES.md | 3, 4, 5, 6, the shapes reviewer |
| Claims are bounded and each carries what a liar gains (4.2) | 4, the order reviewer |
| Pillar 10: records the server makes itself; "flag, never act" kept | 4, 9, 1, the shapes reviewer |
| Pillar 11: who may start a thing, the actor, ids, the words rule; no helper feature built | 5, 3, 6 |
| A gate is a test GitHub runs (rule 1); guards under `tools/guards/` | 6, 8, the shapes and order reviewers |
| Tests find code by system before any file moves (5.2b) | 6 |
| Four lines in place of raw line counts (5.1) | 6, 8 |
| The state ledger is made by machine, a file a system; the phase table (5.3b) | 6, the owner |
| The action door, and closing `window._gameState` | 6 |
| Switches: risk, needs, fallback; two configurations (rule 4) | 6, the order and running-game reviewers |
| The asset door: supplied, made or data; papers first; hashes, never re-making | 7 |
| Wave 0, the gatekeeper, status files, one sitting a day (part 11) | 8, the order reviewer |
| A table lands as a census (rule 3) | 6, 8, the order reviewer |
| One shape per thing (rule 2, `docs/SHAPES.md`) | the shapes reviewer |
| What the sums read is written with what it counts; a sitting, not a socket (rule 5) | the running-game and order reviewers |
| One controller a signal; a budget table (rule 6) | the running-game reviewer |
| Each signal lists what an honest player's trouble does to it (10.6) | the running-game reviewer |
| A table-hash mismatch never reloads by itself (6.2) | the running-game reviewer |
| The three tiers NOW, NEXT, LATER, and twelve open boxes | the order reviewer |

## What was not taken, or was changed, and why

- **Traces of one in fifty other players for 90 days** (4). Deferred to part
  7: cost and privacy, and there are no other players. The owner's own play
  is kept instead, with their yes (10.8).
- **A ten-second event log** (3) and **a five-minute edge flush** (4).
  Replaced by one ledger row in the settlement's own write: a buffer dies at
  every deploy and would fail the restart test.
- **Splitting `mail_gold` into a road a source** (9). Not split: a road has
  one caller. Its class comes from the credit's source, a closed table.
- **A stamp of "ms since the last real touch" on every action** (6). Kept
  out for now: it is a claim the phone makes, and the shapes reviewer judged
  it over-asked. The action door (5.8) leaves room for it.
- **The report's table pushed to a data branch by a workflow that holds the
  admin key** (1). Left as the owner's call (6): "copy table" first.
- **"Phones target 60 even when offered 120"** (2). Put to the owner as
  call 16, not decided here.
- **The frame's steps, the renderers' split and types as "when players
  ask"** (the order reviewer). Marked LATER instead: the owner asked for
  restructuring, and it waits for the rails and for 5.2b, not for players.
- **Holds, fees and pacing on moving value** (9, 4). Built as a table with
  everything at zero (10.5). "No play caps" stands; turning one up is the
  owner's call 12.
- **Enforcement in waves, canaries, detectors** (4). Part 7. "Flag, never
  act" stands.
- **About 2,000 paid minutes for wave 1** (8) is an estimate. Its cures
  were taken: a PR opened only when done, guards outside the deploy path,
  one sitting a day.

## Beliefs about the outside world, still to verify

Each was marked by its reviewer as not checkable from the test box.

- Safari hides the chip's name, the model and the heap from a page.
- An iPhone in Low Power Mode gives a page about 30 frames a second.
- iOS freezes a hidden page's timers and workers.
- Many Android chips keep 16-bit numbers in a drawing program.
- Cloudflare's point-in-time restore for these storage classes.
- Cloudflare Pages keeps shipping the page while the server's suite is red.
- A model driving a real browser passes Turnstile.
- EU consent rules spare only anonymous statistics.
- Web uploads bypass git LFS; Safari evicts a service worker's idle storage.

## Round 3: the cold-start dry run

The owner, asked which one more audit was worth running, chose the one
recommended: *"Go recommended"*. The first two rounds tested whether the
plan was right. This one tested whether it could be FOLLOWED.

**How.** Nine fresh readers, one for each day-one card (W, S, C, D, I, H,
F, J and the gatekeeper Z). Each was given only the four-line prompt a real
session would get, was allowed to change nothing, and reported its first
ten actions, every file it expected to touch, every sentence it had to
guess at, what its card needed that did not exist, and where it would stop
and ask.

**Result.** All nine answered "yes, with guesses". None could start clean.

| What they met | How many | The cure |
|---|---|---|
| "Nothing else starts until it is merged" beside "Day one, beside wave 0" | 9 | W goes first; the day-one table may start beside it; nothing else until W and S merge |
| The start-up brief offers every session the same tag, and CLAUDE.md says to take it; four cards had no tag at all | 9 | every card carries its tags; the prompt says not to take the brief's |
| `docs/plan/status/` and the tag-blocks file did not exist; no format; no way for the gatekeeper to find a branch with no PR | 9 | `docs/plan/README.md`: the status file's four opening lines, and branches found through the brief's 72-hour list |
| A card was one row of a table: no files, no count of PRs, no "done when" | 9 | a card is a file of its own, its PRs numbered, each with files, tag and "done when" |
| Cards C and D each appeared twice | 2 | the session that reads is not the session that builds: N and U are new letters |
| A census of hundreds of rows "in the status file" the gatekeeper must read short | 4 | `docs/plan/census/`, a page a census |
| Files outside the card's "writes only" (a family's test, its spec, three families outside `src/rendering/`) | 3 | each card lists its files where they really are |
| Names already taken in the code: `acct` (the device), `sess` (a sparring bot), "inbox" (the mail); `playable` is a check's name, the scenario is `questline` | 4 | card S picks free names; "uploads"; `questline` |
| "A full run" of the phone tests is six hours or more, against the owner's sample rule | 2 | the sample is defined in card J, and the full run offered |
| Nobody owned a test red because the GAME is wrong | 2 | J writes it under Found; the gatekeeper routes it |
| The plan's counts could not be made again (610, 89, 850 against 657, 95, 793) | 2 | marked as a reviewer's counts; card D's script replaces them and says how |
| "A checkout without `assets/`": nine server suites read it | 1 | dropped |
| The gatekeeper: what "ready" and "silent" mean, when a box is ticked, how deep a review, how long a sitting | 1 | card Z, a sitting in seven steps, about two hours |
| A new cap or live flag still collides on one line (TRAPS §333) | 1 | not wave 0's to cure; such PRs are listed one after another |

Not taken: opening every PR as a draft at the first push so the gatekeeper
can find it (each push would then run the paid checks). The brief's list of
recent branches does the same for nothing.

## Stale lines the review met in other documents

For a docs session; not changed here.

- CLAUDE.md §7 says "three sprite programs on every chip"; one program is
  the default on phones and tablets since v2.3.5016.
- `docs/HIDDEN-SERVER-PLAN.md` says "Nothing here is built yet";
  `hidden.js` and `botsig.js` exist.
- `docs/GDD-AS-BUILT.md` describes v2.3.3547.
- `public/sfx` holds 19 `.m4a` files that nothing plays.
