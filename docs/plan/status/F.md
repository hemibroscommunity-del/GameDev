card: F
branch: claude/plan-f-weight (PR 1); claude/plan-f-uploads on top of it (PR 2)
prs: none open yet: both are built and wait on the first line of Needs
state: working

## Done

- PR 1 (v2.3.5027), the weight: `tools/assets/weights.mjs` and
  `tools/assets/sources.json` (357 rows, one a file under `assets/`).
- PR 2 (v2.3.5028), the uploads' papers: `tools/assets/uploads.mjs` and
  `tools/assets/uploads.json` (13 rows; the owner's columns empty).

## Next

- The owner's answers, then their columns in `uploads.json`.

## Found

- Git tracks 7,418 files, 944,796,136 bytes (901.0 MB): `assets/` 390.2 MB,
  `docs/` 216.4 MB, `public/` 151.3 MB, `tools/` 89.3 MB.
- "Sessions check out without `assets/`" is dropped (the card's reading):
  nine server suites read `assets/`; a checkout without it fails precheck.
- `tools/dev/precheck.mjs` `version-tag` FAILS on a card's own tag: the
  cards on main write it in full (`docs/plan/cards/F.md` lines 11 and 17)
  and the check reads any full tag in main's tree as used. Every day-one
  card written that way meets this. It is the only FAIL here; both
  branches were pushed with it, with no pull request.
- Five of the seven PNG uploads carry a signed record naming ChatGPT;
  `uploads.mjs` reads it and does not verify the signature.
  `2A98872A-...png` was uploaded twice (2026-08-12).

## Needs

- From the owner: precheck cannot pass with the card's tag. Open the PRs
  with the card's tags and that one known FAIL, or wait for a fix to the
  check or the cards (not this card's files)?
- From the owner, asked once (2026-11-13): for each of the 13 uploads,
  what it is for, what made it, still wanted; may the credits say
  "AI-made" (call 19).
- From card B: a guard holding `sources.json` to `assets/`.
