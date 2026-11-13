card: F
branch: claude/plan-f-weight (PR 1); claude/plan-f-uploads on top of it (PR 2)
prs: v2.3.5027 from claude/plan-f-weight (ready; its number is in the status file on claude/plan-f-uploads); v2.3.5028 not started
state: ready

## Done

- PR 1 (v2.3.5027), the weight: `tools/assets/weights.mjs` and
  `tools/assets/sources.json` (357 rows, one a file under `assets/`).

## Next

- PR 2 (v2.3.5028), the uploads' papers.

## Found

- Git tracks 7,418 files, 944,796,136 bytes (901.0 MB). `assets/` is 43%
  of it (390.2 MB), `docs/` 24% (216.4 MB), `public/` 17% (151.3 MB),
  `tools/` 10% (89.3 MB).
- "Sessions check out without `assets/`" is dropped (the card's reading):
  server suites read `assets/`, so a checkout without it fails precheck.

## Needs

- From card B: a guard under `tools/guards/` that holds
  `tools/assets/sources.json` to `assets/` (`weights.mjs --sources` only
  reports a file with no row, changed bytes, or a row with no file).
