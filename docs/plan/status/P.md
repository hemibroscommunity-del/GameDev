card: P
branch: claude/plan-p-2-fightmb (one branch a PR, each begun from the one before)
prs: #1713 (tag 5241, ready), PR 2 (tag 5242, ready; its number goes here with PR 3's first commit)
state: ready

## Done

- #1713 (tag 5241), the family table and the record of what ships:
  `tools/assets/families.mjs` (200 families), `shipped.mjs`,
  `shipped.json` (3,225 rows: supplied 797, made 2,077, data 351,
  unsorted 0), spec `docs/specs/asset-door.md` part 1, SHAPES part 7 and 8.

- PR 2 (tag 5242), the measure: `QA_MB_ROWS=1` rows at the fights,
  `tools/assets/fightmb.mjs`, the census `docs/plan/census/assets.md` from
  three runs (11/11 each); a plain run within every line. 36 families hold
  1 MB or more at the fight.

## Next

- PR 3 (tag 5243), one finishing tool, `tools/assets/finish.mjs`.

## Found

- `public/sprites/tiles/*.tsx` are Tiled tile sets (XML), not code; the
  card puts `.tsx` out of reach, so they are not in the table.
- 545 files in reach are loaded by nothing on any device by default
  (draw `none`); the census lists them (removal is the owner's yes).
- At the fight 22.2 MB of textures have no label (canvases 16.6 on the
  chip): the renderers' bakes, not a family; naming them is not card P's.

## Needs

- A reading to confirm (spec part 1, "Readings taken"): a file a repo tool
  cut from inputs the repository does not keep is `supplied` (the card's
  example, the bro's sheets); `made` needs kept sources or tool `unknown`.
- PR 4 waits for card B's #1698 (`tools/guards/asset-sources.test.mjs`)
  and `tools/guards/lib/` on `main`.
- The backlog's `pack-page` waits for card H's `done`.
