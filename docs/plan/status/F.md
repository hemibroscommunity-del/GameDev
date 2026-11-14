card: F
branch: claude/plan-f-weight (PR 1); claude/plan-f-uploads on top of it (PR 2)
prs: PR 1 (tag 5027) opening, ready; PR 2 (tag 5028) next
state: ready

## Done

- PR 1 (v2.3.5027), the weight: `tools/assets/weights.mjs` and
  `tools/assets/sources.json` (357 rows, one a file under `assets/`).

## Next

- PR 2 (v2.3.5028), the uploads' papers, on `claude/plan-f-uploads`.

## Found

- Git tracks 7,418 files, 944,796,136 bytes (901.0 MB): `assets/` 390.2 MB,
  `docs/` 216.4 MB, `public/` 151.3 MB, `tools/` 89.3 MB.
- "Sessions check out without `assets/`" is dropped (the card's reading):
  nine server suites read `assets/`; a checkout without it fails precheck.
- The tag check refused the card's tags while the cards wrote them in
  full; mended on main by v2.3.5055, merged in here.

## Needs

- From card B: a guard holding `sources.json` to `assets/`
  (`weights.mjs --sources` only reports).
