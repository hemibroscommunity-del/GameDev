card: P
branch: claude/plan-p-4-gate (one branch a PR, each begun from the one before)
prs: #1713 (5241, merged), #1715 (5242, ready), #1716 (5243, ready), PR 4 (5244, ready; its number with PR 5's first commit)
state: ready

## Done

- #1713 (tag 5241, merged): `tools/assets/families.mjs` (200 families),
  `shipped.mjs`, `shipped.json` (3,225 rows: supplied 797, made 2,077,
  data 351, unsorted 0), spec `docs/specs/asset-door.md` part 1, SHAPES.
- #1715 (tag 5242): `QA_MB_ROWS=1` rows at the fights, `fightmb.mjs`, the
  census `docs/plan/census/assets.md` (three runs, 11/11 each; a plain run
  within every line). 36 families hold 1 MB or more at the fight.
- #1716 (tag 5243): `tools/assets/finish.mjs`; strip256, reduce256 and
  npc256 call it (each compared: the same bytes as before).

- PR 4 (tag 5244): `tools/guards/asset-door.test.mjs`, eight holds, each
  break proof tried; `lookSheetSpec` moved to `lookUnpack.js` (446 specs
  compared, the same). 381 suites green.

## Next

- PR 5 (tag 5245), the 19 `.m4a` under `public/sfx/`.

## Found

- `public/sprites/tiles/*.tsx` are Tiled tile sets (XML), not code; the
  card puts `.tsx` out of reach, so they are not in the table.
- 545 files in reach are loaded by nothing on any device by default
  (draw `none`); the census lists them (removal is the owner's yes).
- At the fight 22.2 MB of textures have no label (canvases 16.6 on the
  chip): the renderers' bakes, not a family; naming them is not card P's.

## Needs

- Answered (the planning session, 2026-11-14): the card's order; one
  `lookSheetSpec` the guard imports; the supplied/made reading stands.
- The backlog's `pack-page` waits for card H's `done`.
