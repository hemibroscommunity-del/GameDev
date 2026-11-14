card: P
branch: claude/plan-p-5-m4a (one branch a PR, each begun from the one before)
prs: #1713 (5241, merged), #1715 (5242), #1716 (5243), #1718 (5244), PR 5 (5245): ready
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

- #1718 (tag 5244): `tools/guards/asset-door.test.mjs`, eight holds, each
  break proof tried; `lookSheetSpec` moved to `lookUnpack.js` (446 specs
  compared, the same). 381 suites green.

- PR 5 (tag 5245): the 19 `.m4a` under `public/sfx/` removed (0.19 MB;
  nothing named them; the MP3 beside each plays); 3,206 rows.

## Next

- The backlog (tag 5246 on), in the census's order, once PR 5 is merged.

## Found

- `public/sprites/tiles/*.tsx` are Tiled tile sets (XML), not code; the
  card puts `.tsx` out of reach, so they are not in the table.
- 545 files in reach are loaded by nothing on any device by default
  (draw `none`); the census lists them (removal is the owner's yes).
- At the fight 22.2 MB of textures have no label (canvases 16.6 on the
  chip): the renderers' bakes, not a family; naming them is not card P's.

- `families.mjs` keeps the `sfx-m4a` row, now matching no file, and the
  twins' note "beside (the .m4a)": the next PR touching the table drops them.

## Needs

- Answered (the planning session, 2026-11-14): the card's order; one
  `lookSheetSpec` the guard imports; the supplied/made reading stands.
- The backlog's `pack-page` waits for card H's `done`.
