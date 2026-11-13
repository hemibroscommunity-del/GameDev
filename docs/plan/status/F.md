card: F
branch: claude/plan-f-weight (PR 1); claude/plan-f-uploads on top of it (PR 2)
prs: none open yet: both are built and wait on the first line of Needs
state: working

## Done

- PR 1 (v2.3.5027), the weight: `tools/assets/weights.mjs` and
  `tools/assets/sources.json` (357 rows, one a file under `assets/`).

## Next

- PR 2 (v2.3.5028), the uploads' papers, on `claude/plan-f-uploads`.

## Found

- Git tracks 7,418 files, 944,796,136 bytes (901.0 MB). `assets/` is 43%
  of it (390.2 MB), `docs/` 24% (216.4 MB), `public/` 17% (151.3 MB),
  `tools/` 10% (89.3 MB).
- "Sessions check out without `assets/`" is dropped (the card's reading):
  nine server suites read `assets/`, so a checkout without it fails
  precheck.
- `tools/dev/precheck.mjs` `version-tag` FAILS on a card's own tag: the
  cards on main write it in full (`docs/plan/cards/F.md` lines 11 and 17),
  and the check reads any full tag in main's tree as used. Every day-one
  card whose tag is written in full on its card meets this. It is the only
  FAIL here; both branches were pushed with it, with no pull request.

## Needs

- From the owner: precheck must pass before a push, and it cannot with the
  card's tag. Open the PRs with the card's tags and that one known FAIL, or
  wait for a fix to the check or the cards (not this card's files)?
- From card B: a guard under `tools/guards/` that holds
  `tools/assets/sources.json` to `assets/` (`weights.mjs --sources` only
  reports a file with no row, changed bytes, or a row with no file).
