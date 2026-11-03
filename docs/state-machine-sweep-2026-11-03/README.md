# The implicit state machine sweep, 2026-11-03 (working files, v2.3.4153)

**For the owner, in plain words.** This folder stores the working files of a big code read-through.
**It does not change the game.**

- 42 agents read every game file and found 964 places where something moves through phases
  ("implicit state machines").
- A second round of agents checked the 149 that looked risky, grouped them into 25 clusters, and
  confirmed which problems are real.
- The readable version is your doc **"Implicit State Machines in BroTown"**:
  https://claude.ai/artifact/PrspeJRdJWG6ciAYtRspen

These files are kept on GitHub so a later Claude session can finish the work after your usage
resets. **Please don't merge this pull request as it is.** The raw notes would clutter `docs/` for
every future session that searches it. The plan is to replace them with one short curated page.

## For the next Claude session: how to resume

### The doc

Claude Docs project `b91fd0a8-77d6-4fdc-accd-15ef8172499b`, tab body node `3e889647-d6a7`.

- **Filled:**
  - "What counts as an implicit state machine";
  - "Needs further thought: 25 verified clusters" (a ranked table);
  - "Catalogue: all 964 machines".
- **Attached files (blobs):**
  - `blob/81da6c20-abd5`: verified-clusters.md
  - `blob/b515592e-6261`: all-964-machines.csv
  - `blob/9ea6d7ee-6ad4`: sweep-notes-all-slices.md
- **Still to do:** see "Status" at the end of this file.

### What is here

- `sweep/<ID>.md` and `sweep/<ID>.json`: round 1, one pair per slice. These are unverified claims
  with path:line evidence. Slices:
  - S1-S9: server
  - N1-N2: networking
  - G1-G5: `src/game`
  - U1-U3: `src/ui`
  - P1-P4: panels
  - M1-M4: mobile
  - R1-R11: rendering
  - D1-D2: data
  - T1-T2: studios
- `verified/<V>.md`: round 2, the 25 clusters. Each was checked by an agent told to refute every
  claim. Every concern is CONFIRMED, PLAUSIBLE or REFUTED, and each file has quick fixes, design
  questions and "making it explicit". Severity: **high** for V1, V6, V8a, V12 and V17b; medium for
  the rest.
- `all-964-machines.csv`: every machine, one row each.
- `plan-draft.md`: the fix plan as drafted.
- `reviews/R1-R3.md`: three adversarial reviews of that plan (regressions, root causes, the owner's
  reality).
- `PLAN.md`: the plan after review, once it is written.
- `tools/`:
  - the sweep brief (`BRIEF.md`) and the verifier brief (`ROUND2.md`);
  - the slicer (`mkslices.mjs`) and its manifests (`slices/`);
  - the collector (`collect.mjs`) and the watchdog (`watchdog.sh`);
  - the main session's working ledger (`main-session-ledger.md`).

  The scripts' paths point at the old session's scratchpad. Change `SP` / `OUT` at the top before
  re-running.

### Lessons for re-running

- **Concurrency:** at most 20 subagents at once.
- **Liveness:** a background agent's `tasks/<id>.output` is a symlink, so check it with
  `stat -L -c %Y`.
- **Verify before fixing:** of 487 claims checked in round 2, 67% held, 15% stayed unproven and 18%
  were wrong.
- **Cost:** about 490k tokens per sweep agent (8-10k lines at max effort), about 350k per verifier
  at max effort, and 120-200k per verifier on Sonnet. The whole run took about 35% of the owner's
  weekly usage, so re-run per folder, not the whole repo.
- **Still needs measuring:** memory sizes and Pixi-internal claims need `mp-membudget`,
  `mp-gpuaudit` or `mp-memledger`; reading code cannot settle them.

## Status

The sweep and verification are done. Still to do:

- the plan review;
- the doc's lead and "What to do next" section;
- two diagrams (the duel, a player's session).

This file is updated as each lands.
