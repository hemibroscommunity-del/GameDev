# Card DIR: the direction of 2026-11-23 (one PR)

**The owner's words:** *"ensure work is directed appropriately and
efficiently to finish up"*; *"review the work in accordance with the plan
to make sure it's the correct shape"*; *"I want an orchestrator session (I
want you to determine model and effort level for that)"*.

**Tags:** 6400 to 6419. One PR, tag 6400.

## The PR (tag 6400): documents and tools only

- `docs/plan/finish.md`: what "finished" means for this phase, the cards,
  the five rules, the spending rules, the orchestrator's loop, the owner's
  calls.
- `docs/plan/census/shape-review.md` and `shape-doors.md`, `shape-books.md`,
  `shape-walls.md`, `shape-smooth.md`, `shape-cost.md`: the review and its
  evidence. `docs/plan/census/controls-map.md`: today's controls.
- `tools/dev/plants/`: the review's plants, to run again.
- `docs/plan/cards/`: LF, CK, DG, BK, WHO, PH, WL, CT; card Z's new steps.
- `docs/plan/orchestrator.md`, `docs/plan/README.md`: where the direction
  is, the status file riding its work, the log.
- `tools/dev/tag-blocks.json`: the eight blocks, 6400 to 6559.

Done when `node tools/dev/precheck.mjs` passes and the orchestrator is
started from `finish.md`.
