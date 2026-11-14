card: P
branch: claude/plan-p-3-finish (one branch a PR, each begun from the one before)
prs: #1713 (tag 5241, ready), #1715 (tag 5242, ready), PR 3 (tag 5243, ready; its number goes here with PR 4's first commit)
state: ready

## Done

- #1713 (tag 5241): `tools/assets/families.mjs` (200 families),
  `shipped.mjs`, `shipped.json` (3,225 rows: supplied 797, made 2,077,
  data 351, unsorted 0), spec `docs/specs/asset-door.md` part 1, SHAPES.
- #1715 (tag 5242): `QA_MB_ROWS=1` rows at the fights, `fightmb.mjs`, the
  census `docs/plan/census/assets.md` (three runs, 11/11 each; a plain run
  within every line). 36 families hold 1 MB or more at the fight.
- PR 3 (tag 5243): `tools/assets/finish.mjs`; strip256, reduce256 and
  npc256 call it (each compared: the same bytes as before).

## Next

- PR 4 (tag 5244), the gate, once card B's #1698 (stacked on #1685 to
  #1696) and `tools/guards/lib/` are on `main`. Preparing it meanwhile.

## Found

- `public/sprites/tiles/*.tsx` are Tiled tile sets (XML), not code; the
  card puts `.tsx` out of reach, so they are not in the table.
- 545 files in reach are loaded by nothing on any device by default
  (draw `none`); the census lists them (removal is the owner's yes).
- At the fight 22.2 MB of textures have no label (canvases 16.6 on the
  chip): the renderers' bakes, not a family; naming them is not card P's.

## Needs

- Asked once (2026-11-14): (1) may PR 5 (the 19 `.m4a`) open before PR 4,
  begun from PR 3's branch, while PR 4 waits on card B? Until told, no.
  (2) Hold 7 needs a sheet's spec, built only inside `lookPalette.js`: may
  PR 4 export a pure `lookSheetSpec` there, or build it in the guard?
- A reading to confirm (spec part 1, "Readings taken"): a file a repo tool
  cut from inputs the repository does not keep is `supplied` (the card's
  example, the bro's sheets); `made` needs kept sources or tool `unknown`.
- The backlog's `pack-page` waits for card H's `done`.
