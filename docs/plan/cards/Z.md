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
5. **Rehearse.** `node tools/dev/gatekeeper.mjs <branches in order>` (until
   card W's PR 4 is merged, the same by hand): a scratch worktree from
   `origin/main`, each ready branch merged, then
   `node tools/dev/precheck.mjs`, `npm run build`,
   `node tools/qa/mp/run.mjs questline`. The order: tools and tables;
   server changes together; client changes; a guard that closes a list
   last. On a red, drop one branch and run that command again.
6. **Write the list** for the owner, in chat and in
   `docs/plan/status/Z.md`: what to merge and in what order; what is held,
   each with the command that fails or the review's finding in one line;
   which session is stalled (a status file saying `working` on a branch
   with no commit for three hours); and what was found that no card owns.
7. **Tick the plan** for every step whose PRs are MERGED on `main`, never
   for one that is only on the list. Lower a size line the merged work
   earned (pillar 5). Make a census strict when part 5's rule 3 allows.
   These go in your own PR, which is the last line of your list.

## Readings chosen for you

- **You merge nothing, approve nothing, and comment on no PR.** The list is
  for the owner; a comment would speak for them.
- **A hold** expires at the next sitting unless that sitting states it
  again.
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
