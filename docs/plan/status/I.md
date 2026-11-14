card: I
branch: claude/plan-i-traps
prs: PR 1, tag 5031, the traps census (ready; its number is in the PR list)
state: ready

## Done

- PR 1 (tag 5031): `docs/plan/census/traps.md`, one row for each of the
  339 headings of `docs/TRAPS.md`. Held today: 152 by a node test, 51 by a
  phone scenario only, 18 by precheck or a hand-run script only, 118
  prose. Of the 221 held, 77 hold the rule and 144 only the case the trap
  found. Every break is from reading; none was run.

## Next

- Nothing. The card says stop once PR 1 is ready.

## Found

- The census's own Found list: 93 traps name a test not in the repo (all
  but four went with the old map at tag 4674); 29 traps are untrue in
  whole or part.
- `docs/plan/cards/*.md` write each day-one tag in full, so precheck's
  `version-tag` check reads every one as used on `main`, and a session
  that writes its own card's tag in a file fails it
  (`tools/dev/tagRule.mjs`). This card's files write the tag as a bare
  number; the commit titles carry it in full.
- `tools/world/test-world-core.mjs` is run by no workflow, no precheck
  check and not by `npm test`; eight traps rest on it.
- `CLAUDE.md` §7 still says three sprite programs on every chip; since
  tag 5016 the one program is the default on phones and tablets.

## Needs

- Nothing.
