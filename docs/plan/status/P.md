card: P
branch: claude/plan-p-1-families (one branch a PR, each begun from the one before)
prs: PR 1 (tag 5241, ready; its number goes here with PR 2's first commit)
state: ready

## Done

- PR 1 (tag 5241), the family table and the record of what ships:
  `tools/assets/families.mjs` (200 families), `shipped.mjs`,
  `shipped.json` (3,225 rows: supplied 797, made 2,077, data 351,
  unsorted 0), spec `docs/specs/asset-door.md` part 1, SHAPES part 7 and 8.

## Next

- PR 2 (tag 5242), the measure: MB held at the memory check's fight, by
  family (`QA_MB_ROWS=1`), and the census `docs/plan/census/assets.md`.

## Found

- `public/sprites/tiles/*.tsx` are Tiled tile sets (XML), not code; the
  card puts `.tsx` out of reach, so they are not in the table.
- 545 files in reach are loaded by nothing on any device by default
  (draw `none`); the census lists them (removal is the owner's yes).

## Needs

- A reading to confirm (spec part 1, "Readings taken"): a file a repo tool
  cut from inputs the repository does not keep is `supplied` (the card's
  example, the bro's sheets); `made` needs kept sources or tool `unknown`.
- PR 4 waits for card B's #1698 (`tools/guards/asset-sources.test.mjs`)
  and `tools/guards/lib/` on `main`.
- The backlog's `pack-page` waits for card H's `done`.
