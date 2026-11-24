# Card Z: the gatekeeper (one fresh session each sitting)

**Starts:** once a day, when the owner sits down to merge. A new session
every time: its memory is the status files and the last list, not itself.
**Read:** `CLAUDE.md`; part 11 of `docs/GRAND-PLAN.md`;
`docs/plan/README.md`; every `docs/plan/status/*.md` it can find; the last
`docs/plan/status/Z.md` on `main`.
**Tags:** 5032 to 5034 for the first three sittings, then from
`tools/dev/tag-blocks.json`. One a sitting, for its own PR.
**It writes no game code.** A sitting takes about two hours.

## A sitting, in order

1. **Find the sessions.** The start-up brief lists the `claude/*` branches
   pushed in the last 72 hours. On each, read `docs/plan/status/*.md`.
2. **Find what is ready.** A PR is ready when its status file says
   `ready`, it is open and not a draft, and its `test` check is green.
   Leave every other open PR alone.
3. **Check each ready PR against its card**: its files are the card's, its
   tag is the card's, its "done when" is met, its status file is true.
4. **Review** with `/repo-review`, in full, each ready PR that changes
   `server/` or `src/`. A PR of documents or tools gets step 3 only.
4b. **The purpose review** (v2.3.6400; `docs/plan/finish.md` part 8: in 50
   sittings the rehearsal found no failing test, while a review on the top
   model found 44 of 47 planted faults passing the doors' own tests). For
   each ready PR that adds or changes a guard, or changes `server/src`, the
   wire, money, logins or combat: a lane on the top model (the Agent tool
   with its `model` set to the top one; if this session cannot start one, ask the
   orchestrator to run it) reads the card's PURPOSE and the diff, then in a
   scratch worktree plants the card's dodges and two of its own (the fault
   written as a tired programmer would: an alias, `Object.assign`, a
   computed key, a `bind`) and runs the PR's own guard by name.
   `tools/dev/plants/` has the review's plants and how to run them.
   **What holds** (v2.3.6272; the owner, 2026-11-24: *"Yes to both. I want
   as much work done as you can so this plan can get done. I have other
   things I want to add to the game but am waiting for this to be
   finished"*): a red rehearsal or a red `test`; a bug in behaviour (the
   game, the worker, the wire, money, a login, a save doing the wrong
   thing); one of the CARD's own dodges still green; a plant an EARLIER
   sitting's review named, still green on the head listed as its mend. A
   reviewer's NEW hole in a guard (a plant neither the card nor an earlier
   review named) is NOT a hold: it goes in the notes as that card's NEXT
   JOB, one line with the file and the plant, and the PR lands.
5. **Rehearse.** `node tools/dev/gatekeeper.mjs <branches in order>` (until
   card W's PR 4 is merged, the same by hand): a scratch worktree from
   `origin/main`, each ready branch merged, then
   `node tools/dev/precheck.mjs`, `npm run build`,
   `node tools/qa/mp/run.mjs questline`. The order: tools and tables;
   server changes together; client changes; a guard that closes a list
   last. On a red, drop one branch and run that command again.
5b. **Check what GitHub will merge** (sitting 11, tag 5368: three of its
   PRs were opened against another card's branch, and five were refused
   halfway down the list):
   - each listed PR's BASE is `main` (the PR's `base.ref`); a PR based on
     another branch merges into that branch, not `main`: its session
     retargets it to `main` before it is listed;
   - count merge bases STEP BY STEP down the list: each branch against
     `main` with every PR above it merged in (`git merge-base --all`
     prints one line), not only against the starting `main`. A stacked
     branch that merged `main` AND the PR before it gets two bases once
     that PR lands as a merge commit, and GitHub refuses it ("merge
     conflicts"). Its session merges the new `main` in after the PR
     before it lands; the list says so on its line.
6. **Write the list** for the owner, in chat and in
   `docs/plan/status/Z.md`: what to merge and in what order; what is held,
   each with the command that fails or the review's finding in one line;
   which session is stalled (a status file saying `working` on a branch
   with no commit for three hours); and what was found that no card owns.
7. **Tick the plan** for every step whose PRs are MERGED on `main`, never
   for one that is only on the list. Lower a size line the merged work
   earned (pillar 5). Make a census strict when part 5's rule 3 allows.
   These go in your own PR, which is the last line of your list.
   - **A tick means the purpose is met** (v2.3.6400): a step whose "done
     when" was a table that only describes is ticked as a table, in those
     words.
   - **A sitting's notes go in `docs/plan/log.md`**, one line a step a
     sitting (the newest first), not in `docs/GRAND-PLAN.md`: the plan grew
     16% in 42 hours from them, and every session that opens it pays. The
     plan keeps the box and, where it helps, one line saying "its record:
     `docs/plan/log.md`".

## Readings chosen for you

- **You merge nothing, approve nothing, and comment on no PR.** The list is
  for the owner; a comment would speak for them.
- **A hold** expires at the next sitting unless that sitting states it
  again. What holds and what is a card's next job: step 4b (v2.3.6272).
- **A red on `main` that no open PR caused**: name it, and the card whose
  files it is in. If no card owns it, ask the owner to start a session for
  it. You do not fix it.
- **A PR that changes a stored record's shape** goes on the list as its
  own line, merged by itself (a rolled-back worker refuses newer saves).
- **A PR that adds a cap or a live flag** is listed after any other that
  does: they meet on one line, and the second merges `main` first.
- **Baseline numbers** are the test box's own. Never the Cloudflare lab.
- **The first sitting** may find nothing merged and nothing to tick. That
  is right.
- Your own PR is documents only and is not rehearsed; its `test` check is
  its gate.
- **At most two sittings a day** (v2.3.6400): a sitting starts when four PRs
  are ready or one is urgent. Wait on a long command once (in the
  background, its end wakes you): never look at a running rehearsal again
  and again, each look reads your whole memory (`docs/plan/finish.md` part
  6).
- **The rehearsal's extras, as their cards land**: every switch thrown once
  (card CK), `claims-gain`'s six seeds (card BK), the held-page sample and
  `main`'s heap into `docs/plan/baseline.md` (card PH).
- **The first sitting after 2026-11-23**: sitting 54's notes
  (`claude/plan-z-sitting-54`: 3.1's tick, its review), card DIR's PR, and
  the boxes of `docs/plan/census/shape-review.md` part 4.
